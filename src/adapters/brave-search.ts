import type { ReachEnvelope, ReachSource } from "../contracts";
import { ReachError } from "../errors";
import { safeFetch } from "../security/safe-fetch";
import { asUntrustedEvidence } from "../security/untrusted-content";
import type { AdapterRequest, ReachAdapter, SafeFetcher } from "./types";
import { healthEnvelope } from "./types";

const SITE_FILTER: Partial<Record<ReachSource, string>> = {
  x: "site:x.com",
  youtube: "site:youtube.com",
  reddit: "site:reddit.com",
  rss: "filetype:rss OR filetype:xml",
};

interface BraveResult {
  title?: string;
  url?: string;
  description?: string;
}

export class BraveSearchAdapter implements ReachAdapter {
  readonly id = "brave-web-search@1";
  readonly source: ReachSource;
  readonly operations = ["search"] as const;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: SafeFetcher = safeFetch,
    source: ReachSource = "web",
  ) {
    this.source = source;
  }

  probe(_signal: AbortSignal) {
    if (!this.apiKey) {
      return Promise.resolve({
        ...healthEnvelope(this.source, this.id),
        status: "unavailable" as const,
        reasonCode: "BACKEND_CONFIGURATION_MISSING" as const,
      });
    }
    return Promise.resolve(healthEnvelope(this.source, this.id));
  }

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    if (!request.query?.trim()) throw new ReachError("INPUT_QUERY_REQUIRED", "Search query is required");
    if (!this.apiKey) {
      throw new ReachError("BACKEND_CONFIGURATION_MISSING", "Search backend is not configured", "unavailable");
    }
    const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
    const filter = SITE_FILTER[request.source];
    endpoint.searchParams.set("q", filter ? `${request.query} ${filter}` : request.query);
    endpoint.searchParams.set("count", String(Math.min(20, Math.max(1, request.limit))));
    const response = await this.fetcher(endpoint, {
      signal: request.signal,
      headers: { accept: "application/json" },
      trustedHeaders: { "x-subscription-token": this.apiKey },
    });
    if (response.status === 401 || response.status === 403) {
      throw new ReachError("BACKEND_AUTH_FAILED", "Search backend authentication failed", "unavailable");
    }
    if (response.status === 429) {
      throw new ReachError("BACKEND_RATE_LIMITED", "Search backend rate limited", "unavailable");
    }
    let body: { web?: { results?: BraveResult[] } };
    try {
      body = JSON.parse(response.text) as typeof body;
    } catch {
      throw new ReachError("BACKEND_RESPONSE_INVALID", "Search response could not be parsed", "unavailable");
    }
    const items = (body.web?.results ?? [])
      .filter((item): item is Required<Pick<BraveResult, "title" | "url">> & BraveResult => Boolean(item.title && item.url))
      .slice(0, request.limit)
      .map((item) => ({ title: item.title, url: item.url, description: item.description ?? "" }));

    return {
      status: "passed",
      source: request.source,
      operation: "search",
      canonicalUrl: null,
      retrievedAt: new Date().toISOString(),
      backend: this.id,
      content: asUntrustedEvidence(items.map((item) => `${item.title}\n${item.description}`).join("\n\n")),
      items,
      citations: items.map(({ title, url }) => ({ title, url })),
      warnings: items.length === 0 ? ["No public results found"] : [],
      reasonCode: null,
    };
  }
}
