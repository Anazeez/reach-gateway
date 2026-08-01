import { describe, expect, it } from "vitest";

import { callMcp } from "../scripts/mcp-client.mjs";

const enabled = process.env.REACH_LIVE_TESTS === "1";
const live = enabled ? describe : describe.skip;

live("production public-source acceptance", () => {
  const endpoint = process.env.REACH_MCP_URL;
  const token = process.env.REACH_TEST_TOKEN;

  it.each([
    ["read", { url: "https://example.com" }],
    ["read", { url: "https://x.com/granite0x/status/2083150563336728756" }],
    ["transcript", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
    ["read", { url: "https://www.reddit.com/r/redditdev/search.json?q=oauth&restrict_sr=1&limit=1" }],
    ["read", { url: "https://hnrss.org/frontpage" }],
  ])("%s returns an explicit status", async (tool, input) => {
    const result = await callMcp(endpoint, tool, input, token);

    expect(result.status).toBe("passed");
  });
});
