import { describe, expect, it, vi } from "vitest";

import { AdapterRegistry } from "../src/adapters/registry";
import type { AdapterRequest, ReachAdapter } from "../src/adapters/types";
import type { ReachEnvelope } from "../src/contracts";
import { ReachError } from "../src/errors";

const fixtureRequest: AdapterRequest = {
  operation: "read",
  source: "web",
  url: new URL("https://example.com"),
  limit: 1,
  signal: new AbortController().signal,
};

function adapter(id: string, implementation: ReachAdapter["execute"]): ReachAdapter {
  return {
    id,
    source: "web",
    operations: ["read"],
    probe: vi.fn(async (): Promise<ReachEnvelope<unknown>> => ({
      status: "passed",
      source: "web",
      operation: "health",
      canonicalUrl: null,
      retrievedAt: new Date(0).toISOString(),
      backend: id,
      content: null,
      items: [],
      citations: [],
      warnings: [],
      reasonCode: null,
    })),
    execute: vi.fn(implementation),
  };
}

describe("AdapterRegistry", () => {
  it("falls back only after a retryable backend failure", async () => {
    const timeoutAdapter = adapter("timeout@1", async () => {
      throw new ReachError("BACKEND_TIMEOUT", "timeout", "unavailable");
    });
    const passingAdapter = adapter("passing@1", async () => ({
      status: "passed",
      source: "web",
      operation: "read",
      canonicalUrl: "https://example.com/",
      retrievedAt: new Date(0).toISOString(),
      backend: "passing@1",
      content: "ok",
      items: [],
      citations: [{ title: "Example", url: "https://example.com/" }],
      warnings: [],
      reasonCode: null,
    }));
    const registry = new AdapterRegistry([timeoutAdapter, passingAdapter]);

    const result = await registry.execute(fixtureRequest);

    expect(result.backend).toBe("passing@1");
  });

  it("does not fall back after a policy denial", async () => {
    const policyDeniedAdapter = adapter("denied@1", async () => {
      throw new ReachError("POLICY_DESTINATION_DENIED", "denied");
    });
    const passingAdapter = adapter("passing@1", vi.fn());
    const registry = new AdapterRegistry([policyDeniedAdapter, passingAdapter]);

    await expect(registry.execute(fixtureRequest)).rejects.toMatchObject({
      reasonCode: "POLICY_DESTINATION_DENIED",
    });
    expect(passingAdapter.execute).not.toHaveBeenCalled();
  });

  it("returns unavailable when no adapter declares the operation", async () => {
    const registry = new AdapterRegistry([]);

    const result = await registry.execute(fixtureRequest);

    expect(result).toMatchObject({
      status: "unavailable",
      reasonCode: "SOURCE_OPERATION_UNSUPPORTED",
    });
  });
});
