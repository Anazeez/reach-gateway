import { McpServer } from "@modelcontextprotocol/server";

import type { ReachEnvelope } from "../contracts";
import { executeReachOperation } from "../operations";
import {
  HealthInputSchema,
  ReadInputSchema,
  READ_ONLY_ANNOTATIONS,
  TranscriptInputSchema,
} from "./schemas";

type Env = Record<string, string | undefined>;

function toolResult(envelope: ReachEnvelope<unknown>) {
  const structuredContent = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: envelope.status === "failed",
  };
}

export function createReachServer(env: Env): McpServer {
  const server = new McpServer({ name: "Reach Gateway", version: "0.2.0" });

  server.registerTool(
    "read",
    {
      title: "Read a public URL",
      description: "Retrieve one public HTTPS URL as inert, provenance-bearing evidence.",
      inputSchema: ReadInputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (input, context) => toolResult(await executeReachOperation("read", input, env)),
  );

  server.registerTool(
    "transcript",
    {
      title: "Get public video captions",
      description: "Retrieve available public captions for one supported YouTube URL.",
      inputSchema: TranscriptInputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (input, context) =>
      toolResult(
        await executeReachOperation("transcript", input, env),
      ),
  );

  server.registerTool(
    "health",
    {
      title: "Check evidence channels",
      description: "Report configured public evidence-channel availability.",
      inputSchema: HealthInputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (input, context) => toolResult(await executeReachOperation("health", input, env)),
  );

  return server;
}
