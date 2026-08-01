import { XMLParser } from "fast-xml-parser";

import type { ReachEnvelope } from "../contracts";
import { ReachError } from "../errors";
import { safeFetch } from "../security/safe-fetch";
import { asUntrustedEvidence } from "../security/untrusted-content";
import type { AdapterRequest, ReachAdapter, SafeFetcher } from "./types";
import { healthEnvelope } from "./types";

interface FeedItem {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string };
  description?: string;
  summary?: string;
  pubDate?: string;
  updated?: string;
}

function array<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: FeedItem["title"]): string {
  return typeof value === "string" ? value : value?.["#text"] ?? "Untitled item";
}

export class RssAdapter implements ReachAdapter {
  readonly id = "rss-fast-xml@1";
  readonly source = "rss" as const;
  readonly operations = ["read"] as const;

  constructor(private readonly fetcher: SafeFetcher = safeFetch) {}

  probe(_signal: AbortSignal) {
    return Promise.resolve(healthEnvelope(this.source, this.id));
  }

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    if (!request.url) throw new ReachError("INPUT_URL_REQUIRED", "Feed URL is required");
    const response = await this.fetcher(request.url, { signal: request.signal });
    let parsed: Record<string, unknown>;
    try {
      parsed = new XMLParser({ ignoreAttributes: false }).parse(response.text) as Record<string, unknown>;
    } catch {
      throw new ReachError("SOURCE_PARSE_FAILED", "Feed XML could not be parsed", "unavailable");
    }

    const rss = parsed.rss as { channel?: { item?: FeedItem | FeedItem[]; title?: string } } | undefined;
    const feed = parsed.feed as { entry?: FeedItem | FeedItem[]; title?: string } | undefined;
    const rawItems = array(rss?.channel?.item ?? feed?.entry).slice(0, request.limit);
    const items = rawItems.map((item) => {
      const rawLink = typeof item.link === "string" ? item.link : item.link?.["@_href"];
      const url = rawLink ? new URL(rawLink, response.url).href : response.url;
      return {
        title: text(item.title),
        url,
        summary: item.description ?? item.summary ?? "",
        publishedAt: item.pubDate ?? item.updated ?? null,
      };
    });
    if (items.length === 0) throw new ReachError("CONTENT_EMPTY", "Feed contains no entries", "unavailable");

    return {
      status: "passed",
      source: this.source,
      operation: "read",
      canonicalUrl: response.url,
      retrievedAt: new Date().toISOString(),
      backend: this.id,
      content: asUntrustedEvidence(items.map((item) => `${item.title}\n${item.summary}`).join("\n\n")),
      items,
      citations: items.map(({ title, url }) => ({ title, url })),
      warnings: response.truncated ? ["Feed truncated at the configured limit"] : [],
      reasonCode: null,
    };
  }
}
