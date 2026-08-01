import { describe, expect, it, vi } from "vitest";

import worker from "../src/index";

const fixtureEnv = {
  REACH_OAUTH_ISSUER: "https://auth.example.com",
  REACH_OAUTH_AUDIENCE: "https://reach-gateway.example.com",
  REACH_OWNER_SUB: "owner-123",
  REACH_PUBLIC_ORIGIN: "https://reach-gateway.example.com",
  OPENAI_APPS_CHALLENGE: "challenge-value",
};

const context = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

describe("Worker HTTP surface", () => {
  it("serves protected-resource metadata without exposing owner identity", async () => {
    const response = await worker.fetch(
      new Request("https://reach-gateway.example.com/.well-known/oauth-protected-resource"),
      fixtureEnv,
      context,
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toEqual({
      resource: "https://reach-gateway.example.com",
      authorization_servers: ["https://auth.example.com"],
      scopes_supported: ["reach:read"],
      bearer_methods_supported: ["header"],
    });
    expect(text).not.toContain("owner-123");
    expect(text).not.toContain("test-key");
  });

  it("challenges unauthenticated MCP requests before parsing", async () => {
    const response = await worker.fetch(
      new Request("https://reach-gateway.example.com/mcp", {
        method: "POST",
        body: "not-json",
      }),
      fixtureEnv,
      context,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource",
    );
  });

  it("serves the public Action schema without exposing owner identity", async () => {
    const response = await worker.fetch(
      new Request("https://reach-gateway.example.com/openapi.json"),
      fixtureEnv,
      context,
    );
    const text = await response.text();
    const schema = JSON.parse(text);

    expect(response.status).toBe(200);
    expect(Object.keys(schema.paths).sort()).toEqual([
      "/v1/reach/health",
      "/v1/reach/read",
      "/v1/reach/transcript",
    ]);
    expect(text).not.toContain("owner-123");
  });

  it("challenges unauthenticated Action requests before parsing", async () => {
    const response = await worker.fetch(
      new Request("https://reach-gateway.example.com/v1/reach/read", {
        method: "POST",
        body: "not-json",
      }),
      fixtureEnv,
      context,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource",
    );
  });

  it("records a correlation-safe reason when Access authentication is rejected", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const response = await worker.fetch(
        new Request("https://reach-gateway.example.com/mcp", {
          method: "POST",
          headers: {
            "cf-access-jwt-assertion": "sensitive-token-material",
            "cf-ray": "diagnostic-ray",
          },
          body: "not-json",
        }),
        fixtureEnv,
        context,
      );

      expect(response.status).toBe(401);
      expect(warning).toHaveBeenCalledOnce();
      expect(warning).toHaveBeenCalledWith({
        event: "reach_auth_rejected",
        reasonCode: "AUTH_TOKEN_INVALID",
        rayId: "diagnostic-ray",
      });
      expect(JSON.stringify(warning.mock.calls)).not.toContain("sensitive-token-material");
      expect(JSON.stringify(warning.mock.calls)).not.toContain(fixtureEnv.REACH_OWNER_SUB);
    } finally {
      warning.mockRestore();
    }
  });

  it.each(["/healthz", "/version", "/privacy", "/terms", "/support"])(
    "serves public support route %s",
    async (pathname) => {
      const response = await worker.fetch(
        new Request(`https://reach-gateway.example.com${pathname}`),
        fixtureEnv,
        context,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).not.toContain("owner-123");
    },
  );

  it("serves the exact OpenAI app challenge", async () => {
    const response = await worker.fetch(
      new Request("https://reach-gateway.example.com/.well-known/openai-apps-challenge"),
      fixtureEnv,
      context,
    );

    expect(await response.text()).toBe("challenge-value");
  });
});
