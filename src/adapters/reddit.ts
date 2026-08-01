import type { ReachEnvelope } from "../contracts";
import { ReachError } from "../errors";
import { safeFetch } from "../security/safe-fetch";
import { asUntrustedEvidence } from "../security/untrusted-content";
import type { AdapterRequest, ReachAdapter, SafeFetcher } from "./types";
import { healthEnvelope } from "./types";

interface RedditChild {
  data?: {
    title?: string;
    selftext?: string;
    body?: string;
    permalink?: string;
    url?: string;
  };
}

function collectChildren(value: unknown, output: RedditChild[] = []): RedditChild[] {
  if (Array.isArray(value)) {
    for (const item of value) collectChildren(item, output);
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      const data = record.data as Record<string, unknown>;
      if (Array.isArray(data.children)) output.push(...(data.children as RedditChild[]));
    }
    for (const nested of Object.values(record)) collectChildren(nested, output);
  }
  return output;
}

export class RedditAdapter implements ReachAdapter {
  readonly id = "reddit-public-json@1";
  readonly source = "reddit" as const;
  readonly operations = ["read"] as const;

  constructor(private readonly fetcher: SafeFetcher = safeFetch) {}

  probe(_signal: AbortSignal) {
    return Promise.resolve(healthEnvelope(this.source, this.id));
  }

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    if (!request.url) throw new ReachError("INPUT_URL_REQUIRED", "Reddit URL is required");
    if (!/(^|\.)reddit\.com$/u.test(request.url.hostname)) {
      throw new ReachError("INPUT_INVALID", "Unsupported Reddit hostname");
    }
    const endpoint = new URL(request.url.href);
    if (!endpoint.pathname.endsWith(".json")) endpoint.pathname = `${endpoint.pathname.replace(/\/$/u, "")}.json`;
    const response = await this.fetcher(endpoint, {
      signal: request.signal,
      headers: { accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      throw new ReachError("SOURCE_AUTH_REQUIRED", "Reddit content is not public", "unavailable");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      throw new ReachError("SOURCE_PARSE_FAILED", "Reddit JSON could not be parsed", "unavailable");
    }

    const items = collectChildren(parsed)
      .map(({ data }) => {
        const path = data?.permalink;
        return {
          title: data?.title ?? "Reddit comment",
          content: data?.selftext || data?.body || "",
          url: path ? new URL(path, "https://www.reddit.com").href : data?.url ?? request.url!.href,
        };
      })
      .filter((item, index, values) => values.findIndex((other) => other.url === item.url) === index)
      .slice(0, request.limit);
    if (items.length === 0) throw new ReachError("CONTENT_EMPTY", "Reddit response was empty", "unavailable");
    const canonicalUrl = request.url.href.replace(/\/?$/u, "/");

    return {
      status: "passed",
      source: this.source,
      operation: "read",
      canonicalUrl,
      retrievedAt: new Date().toISOString(),
      backend: this.id,
      content: asUntrustedEvidence(items.map((item) => `${item.title}\n${item.content}`).join("\n\n")),
      items,
      citations: items.map((item) => ({ title: item.title, url: item.url })),
      warnings: [],
      reasonCode: null,
    };
  }
}
