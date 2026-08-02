import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { OPENAPI_DOCUMENT, handleActionRequest } from "../src/actions";
import type { ReachEnvelope } from "../src/contracts";

const passedEnvelope: ReachEnvelope<unknown> = {
  status: "passed",
  source: "web",
  operation: "read",
  canonicalUrl: "https://example.com/",
  retrievedAt: "2026-08-01T00:00:00.000Z",
  backend: "web-readability@1",
  content: "Example evidence",
  items: [],
  citations: [{ title: "Example", url: "https://example.com/" }],
  warnings: [],
  reasonCode: null,
};

describe("Custom GPT Actions facade", () => {
  it("ships the exact OpenAPI document used by the Worker", () => {
    const bundled = JSON.parse(readFileSync("actions/openapi.yaml", "utf8"));

    expect(bundled).toEqual(OPENAPI_DOCUMENT);
  });

  it("publishes only the three read-only Reach operations", () => {
    expect(OPENAPI_DOCUMENT.openapi).toBe("3.1.0");
    expect(OPENAPI_DOCUMENT.servers).toEqual([
      { url: "https://reach-gateway.izeesub.workers.dev" },
    ]);
    expect(Object.keys(OPENAPI_DOCUMENT.paths).sort()).toEqual([
      "/v1/reach/health",
      "/v1/reach/read",
      "/v1/reach/transcript",
    ]);
    expect(Object.keys(OPENAPI_DOCUMENT.paths).join(" ")).not.toMatch(
      /comment|cookie|private.?account|search/i,
    );
  });

  it("declares plain compatibility endpoints for the GPT OAuth client", () => {
    const flow =
      OPENAPI_DOCUMENT.components.securitySchemes.oauth.flows.authorizationCode;

    expect(flow.authorizationUrl).toBe(
      "https://reach-gateway.izeesub.workers.dev/oauth/authorize",
    );
    expect(flow.tokenUrl).toBe(
      "https://reach-gateway.izeesub.workers.dev/oauth/token",
    );
  });

  it("routes a JSON action request through the shared Reach executor", async () => {
    const execute = vi.fn().mockResolvedValue(passedEnvelope);
    const response = await handleActionRequest(
      new Request("https://reach-gateway.example.com/v1/reach/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }),
      {},
      { execute, requestId: () => "request-test" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(passedEnvelope);
    expect(execute).toHaveBeenCalledWith("read", { url: "https://example.com" }, {});
  });

  it("rejects malformed input with a bounded error that reflects no request data", async () => {
    const response = await handleActionRequest(
      new Request("https://reach-gateway.example.com/v1/reach/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "access_token=sensitive-value",
      }),
      {},
      { execute: vi.fn(), requestId: () => "request-test" },
    );

    expect(response.status).toBe(400);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      error: {
        code: "INPUT_INVALID",
        message: "The Reach operation could not be completed",
        requestId: "request-test",
      },
    });
    expect(body).not.toContain("sensitive-value");
  });
});
