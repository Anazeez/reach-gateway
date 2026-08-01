import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/config";

describe("parseEnv", () => {
  it("does not accept paid-search configuration", () => {
    const config = parseEnv({
      REACH_OAUTH_ISSUER: "https://team.cloudflareaccess.com",
      REACH_OAUTH_AUDIENCE: "reach-access-audience",
      REACH_OWNER_SUB: "owner@example.com",
      REACH_PUBLIC_ORIGIN: "https://reach-gateway.example.com",
      BRAVE_SEARCH_API_KEY: "must-not-enter-runtime-config",
    });

    expect(config).not.toHaveProperty("braveSearchApiKey");
  });
});
