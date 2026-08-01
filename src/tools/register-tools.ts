import { McpServer } from "@modelcontextprotocol/server";

import { BraveSearchAdapter } from "../adapters/brave-search";
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
  SearchInputSchema,
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
    ...(["web", "x", "youtube", "reddit", "rss"] as const).map(
      (source) => new BraveSearchAdapter(config.braveSearchApiKey, undefined, source),
    ),
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

async function searchMany(
  registry: AdapterRegistry,
  query: string,
  sources: ReachSource[],
  limit: number,
  signal: AbortSignal,
): Promise<ReachEnvelope<unknown>> {
  const results = await Promise.all(
    sources.map((source) =>
      registry.execute({ operation: "search", source, query, limit, signal }),
    ),
  );
  const passed = results.filter((result) => result.status === "passed");
  return {
    status: passed.length > 0 ? "passed" : "unavailable",
    source: sources.length === 1 ? sources[0]! : "web",
    operation: "search",
    canonicalUrl: null,
    retrievedAt: new Date().toISOString(),
    backend: "reach-search@1",
    content: passed.map((result) => result.content).filter(Boolean).join("\n\n"),
    items: passed.flatMap((result) => result.items).slice(0, limit),
    citations: passed.flatMap((result) => result.citations).slice(0, limit),
    warnings: results.flatMap((result) => result.warnings),
    reasonCode: passed.length > 0 ? null : "BACKEND_UNAVAILABLE",
  };
}

export function createReachServer(env: Env): McpServer {
  const config = parseEnv(env);
  const registry = registryFor(config);
  const server = new McpServer({ name: "Reach Gateway", version: "0.1.0" });

  server.registerTool(
    "search",
    {
      title: "Search public evidence",
      description: "Search bounded public sources and return normalized provenance.",
      inputSchema: SearchInputSchema.shape,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, sources = ["web"], limit = 10 }, context) => {
      const result = await searchMany(
        registry,
        query,
        [...sources],
        limit,
        AbortSignal.timeout(config.limits.requestTimeoutMs),
      );
      return toolResult(result);
    },
  );

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
