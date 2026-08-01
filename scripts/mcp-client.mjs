import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

export async function callMcp(url, tool, input, token) {
  if (!url) throw new Error("REACH_MCP_URL is required");
  if (!token) throw new Error("REACH_TEST_TOKEN is required");

  const client = new Client({ name: "reach-production-smoke", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    authProvider: { token: async () => token },
  });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: tool, arguments: input });
    if (!result.structuredContent || typeof result.structuredContent !== "object") {
      throw new Error(`${tool}:missing_structured_content`);
    }
    return result.structuredContent;
  } finally {
    await client.close().catch(() => undefined);
  }
}
