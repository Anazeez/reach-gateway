import { describe, expect, it } from "vitest";

import worker from "../src/index";

const fixtureEnv = {
  REACH_OAUTH_ISSUER: "https://auth.example.com",
  REACH_OAUTH_AUDIENCE: "https://reach-gateway.example.com",
  REACH_OWNER_SUB: "owner-123",
  REACH_PUBLIC_ORIGIN: "https://reach-gateway.example.com",
  BRAVE_SEARCH_API_KEY: "test-key",
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
