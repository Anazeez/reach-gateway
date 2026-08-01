import { RedditAdapter } from "./adapters/reddit";
import { AdapterRegistry } from "./adapters/registry";
import { RssAdapter } from "./adapters/rss";
import { WebAdapter } from "./adapters/web";
import { XAdapter } from "./adapters/x";
import { YouTubeAdapter } from "./adapters/youtube";
import { parseEnv } from "./config";
import type { ReachEnvelope, ReachSource } from "./contracts";
import { gatewayHealth } from "./health";
import { HealthInputSchema, ReadInputSchema, TranscriptInputSchema } from "./tools/schemas";

type Env = Record<string, string | undefined>;
export type ReachActionName = "health" | "read" | "transcript";

function registry(): AdapterRegistry {
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

export async function executeReachOperation(
  action: ReachActionName,
  input: unknown,
  env: Env,
): Promise<ReachEnvelope<unknown>> {
  const config = parseEnv(env);
  const adapters = registry();
  const signal = AbortSignal.timeout(config.limits.requestTimeoutMs);

  if (action === "read") {
    const { url } = ReadInputSchema.parse(input);
    const parsed = new URL(url);
    return adapters.execute({
      operation: "read",
      source: sourceForUrl(parsed),
      url: parsed,
      limit: 1,
      signal,
    });
  }

  if (action === "transcript") {
    const { url } = TranscriptInputSchema.parse(input);
    return adapters.execute({
      operation: "transcript",
      source: "youtube",
      url: new URL(url),
      limit: 1,
      signal,
    });
  }

  const { sources = ["web", "x", "youtube", "reddit", "rss"] } =
    HealthInputSchema.parse(input);
  return gatewayHealth(adapters, [...sources], signal);
}
