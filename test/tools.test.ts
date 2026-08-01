import { McpServer } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { createReachServer } from "../src/tools/register-tools";
import { TOOL_DEFINITIONS } from "../src/tools/schemas";

const fixtureEnv = {
  REACH_OAUTH_ISSUER: "https://auth.example.com",
  REACH_OAUTH_AUDIENCE: "https://reach-gateway.example.com",
  REACH_OWNER_SUB: "owner-123",
  REACH_PUBLIC_ORIGIN: "https://reach-gateway.example.com",
};

describe("MCP tool contract", () => {
  it("publishes only the three zero-paid retrieval tools", () => {
    expect(TOOL_DEFINITIONS.map((tool) => tool.name).sort()).toEqual([
      "health",
      "read",
      "transcript",
    ]);
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      });
    }
  });

  it("creates an isolated SDK v2 MCP server", () => {
    expect(createReachServer(fixtureEnv)).toBeInstanceOf(McpServer);
    expect(createReachServer(fixtureEnv)).not.toBe(createReachServer(fixtureEnv));
  });
});
