import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/config";

describe("parseEnv", () => {
  it("starts with search explicitly unavailable when no Brave key is configured", () => {
    const config = parseEnv({
      REACH_OAUTH_ISSUER: "https://team.cloudflareaccess.com",
      REACH_OAUTH_AUDIENCE: "reach-access-audience",
      REACH_OWNER_SUB: "owner@example.com",
      REACH_PUBLIC_ORIGIN: "https://reach-gateway.example.com",
    });

    expect(config.braveSearchApiKey).toBe("");
  });
});
