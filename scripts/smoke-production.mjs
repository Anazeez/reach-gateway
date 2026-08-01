import { callMcp } from "./mcp-client.mjs";

const cases = [
  ["health", {}],
  ["read", { url: "https://example.com" }],
  ["read", { url: "https://x.com/granite0x/status/2083150563336728756" }],
  ["transcript", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
];

for (const [tool, input] of cases) {
  const result = await callMcp(
    process.env.REACH_MCP_URL,
    tool,
    input,
    process.env.REACH_TEST_TOKEN,
  );
  if (result.status !== "passed") {
    throw new Error(`${tool}:${result.reasonCode ?? "unknown_failure"}`);
  }
  process.stdout.write(`${tool}:passed\n`);
}
