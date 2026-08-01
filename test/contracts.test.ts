import { describe, expect, it } from "vitest";

import { ReachEnvelopeSchema } from "../src/contracts";

describe("ReachEnvelopeSchema", () => {
  it("rejects success without retrieval provenance", () => {
    const value = { status: "passed", source: "web", operation: "read" };

    expect(ReachEnvelopeSchema.safeParse(value).success).toBe(false);
  });

  it("accepts an explicit unavailable result", () => {
    const value = {
      status: "unavailable",
      source: "x",
      operation: "search",
      canonicalUrl: null,
      retrievedAt: "2026-08-01T00:00:00.000Z",
      backend: "none",
      content: null,
      items: [],
      citations: [],
      warnings: [],
      reasonCode: "SOURCE_OPERATION_UNSUPPORTED",
    };

    expect(ReachEnvelopeSchema.parse(value).status).toBe("unavailable");
  });

  it("rejects unknown envelope keys", () => {
    const value = {
      status: "failed",
      source: "web",
      operation: "read",
      canonicalUrl: null,
      retrievedAt: "2026-08-01T00:00:00.000Z",
      backend: "none",
      content: null,
      items: [],
      citations: [],
      warnings: [],
      reasonCode: "INTERNAL_UNEXPECTED",
      leaked: true,
    };

    expect(ReachEnvelopeSchema.safeParse(value).success).toBe(false);
  });
});
