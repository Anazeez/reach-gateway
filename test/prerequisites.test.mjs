import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkPrerequisites } from "../scripts/check-prerequisites.mjs";

describe("publication gate", () => {
  it("fails closed when private cross-device publication is unverified", async () => {
    const report = await checkPrerequisites(
      {
        REACH_OWNER_SUB: "owner-123",
        REACH_OAUTH_ISSUER: "https://issuer.example",
      },
      {
        privateListing: async () => false,
        customGptApps: async () => true,
      },
    );

    assert.equal(report.status, "failed");
    assert.ok(report.blockers.includes("PRIVATE_LISTING_UNVERIFIED"));
  });

  it("reports every missing prerequisite in deterministic order", async () => {
    const report = await checkPrerequisites(
      {},
      {
        privateListing: async () => false,
        customGptApps: async () => false,
      },
    );

    assert.deepEqual(report, {
      status: "failed",
      blockers: [
        "MISSING_REACH_OWNER_SUB",
        "MISSING_REACH_OAUTH_ISSUER",
        "PRIVATE_LISTING_UNVERIFIED",
        "CUSTOM_GPT_APP_UNVERIFIED",
      ],
    });
  });

  it("passes only when identity, listing, and custom GPT support are verified", async () => {
    const report = await checkPrerequisites(
      {
        REACH_OWNER_SUB: "owner-123",
        REACH_OAUTH_ISSUER: "https://issuer.example",
      },
      {
        privateListing: async () => true,
        customGptApps: async () => true,
      },
    );

    assert.deepEqual(report, { status: "passed", blockers: [] });
  });
});
