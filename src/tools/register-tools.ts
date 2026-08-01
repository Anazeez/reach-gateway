import { McpServer } from "@modelcontextprotocol/server";

import { RedditAdapter } from "../adapters/reddit";
import { AdapterRegistry } from "../adapters/registry";
import { RssAdapter } from "../adapters/rss";
import { WebAdapter } from "../adapters/web";
import { XAdapter } from "../adapters/x";
import { YouTubeAdapter } from "../adapters/youtube";
import { parseEnv, type ReachConfig } from "../config";
import type { ReachEnvelope, ReachSource } from "../contracts";
import { gatewayHealth } from "../health";
import {
  HealthInputSchema,
  ReadInputSchema,
  READ_ONLY_ANNOTATIONS,
  TranscriptInputSchema,
} from "./schemas";

type Env = Record<string, string | undefined>;

function registryFor(config: ReachConfig): AdapterRegistry {
  return new AdapterRegistry([
    new WebAdapter(),
    new XAdapter(),
    new RedditAdapter(),
    new RssAdapter(),
    new YouTubeAdapter(),
  ]);
}

function sourceForUrl(url: URL): ReachSource {
  if (/(^|\.)x\.com$/u.test(url.hostname) || /(^|\.)twitter\.com$/u.test(url.hostname)) return "x";
  if (/(^|\.)reddit\.com$/u.test(url.hostname)) return "reddit";
  if (/\.(?:rss|atom|xml)$/iu.test(url.pathname)) return "rss";
  return "web";
}

function toolResult(envelope: ReachEnvelope<unknown>) {
  const structuredContent = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: envelope.status === "failed",
  };
}

export function createReachServer(env: Env): McpServer {
  const config = parseEnv(env);
  const registry = registryFor(config);
  const server = new McpServer({ name: "Reach Gateway", version: "0.1.0" });

  server.registerTool(
    "read",
    {
      title: "Read a public URL",
      description: "Retrieve one public HTTPS URL as inert, provenance-bearing evidence.",
      inputSchema: ReadInputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ url }, context) => {
      const parsed = new URL(url);
      return toolResult(
        await registry.execute({
          operation: "read",
          source: sourceForUrl(parsed),
          url: parsed,
          limit: 1,
          signal: AbortSignal.timeout(config.limits.requestTimeoutMs),
        }),
      );
    },
  );

  server.registerTool(
    "transcript",
    {
      title: "Get public video captions",
      description: "Retrieve available public captions for one supported YouTube URL.",
      inputSchema: TranscriptInputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ url }, context) =>
      toolResult(
        await registry.execute({
          operation: "transcript",
          source: "youtube",
          url: new URL(url),
          limit: 1,
          signal: AbortSignal.timeout(config.limits.requestTimeoutMs),
        }),
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
    async ({ sources = ["web", "x", "youtube", "reddit", "rss"] }, context) =>
      toolResult(
        await gatewayHealth(
          registry,
          [...sources],
          AbortSignal.timeout(config.limits.requestTimeoutMs),
        ),
      ),
  );

  return server;
}
