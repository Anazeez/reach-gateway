import type { ReachEnvelope } from "../contracts";
import { ReachError } from "../errors";
import { safeFetch } from "../security/safe-fetch";
import { asUntrustedEvidence } from "../security/untrusted-content";
import type { AdapterRequest, ReachAdapter, SafeFetcher } from "./types";
import { healthEnvelope } from "./types";

export class XAdapter implements ReachAdapter {
  readonly id = "x-syndication@1";
  readonly source = "x" as const;
  readonly operations = ["read"] as const;

  constructor(private readonly fetcher: SafeFetcher = safeFetch) {}

  probe(_signal: AbortSignal) {
    return Promise.resolve(healthEnvelope(this.source, this.id));
  }

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    if (!request.url) throw new ReachError("INPUT_URL_REQUIRED", "X post URL is required");
    if (!new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]).has(request.url.hostname)) {
      throw new ReachError("INPUT_INVALID", "Unsupported X hostname");
    }
    const match = /^\/([^/]+)\/status\/(\d+)/u.exec(request.url.pathname);
    if (!match?.[2]) {
      throw new ReachError("SOURCE_AUTH_REQUIRED", "Only individual public X posts are supported", "unavailable");
    }

    const endpoint = new URL("https://cdn.syndication.twimg.com/tweet-result");
    endpoint.searchParams.set("id", match[2]);
    endpoint.searchParams.set("lang", "en");
    const response = await this.fetcher(endpoint, { signal: request.signal });
    if (response.status === 401 || response.status === 403) {
      throw new ReachError("SOURCE_AUTH_REQUIRED", "X post is not publicly available", "unavailable");
    }
    let body: { text?: string; user?: { name?: string; screen_name?: string } };
    try {
      body = JSON.parse(response.text) as typeof body;
    } catch {
      throw new ReachError("SOURCE_PARSE_FAILED", "X response could not be parsed", "unavailable");
    }
    if (!body.text) throw new ReachError("CONTENT_EMPTY", "X post has no public text", "unavailable");
    const title = body.user?.name ? `${body.user.name} on X` : "Public X post";

    return {
      status: "passed",
      source: this.source,
      operation: "read",
      canonicalUrl: request.url.href,
      retrievedAt: new Date().toISOString(),
      backend: this.id,
      content: asUntrustedEvidence(body.text),
      items: [{ text: body.text, author: body.user?.screen_name ?? null }],
      citations: [{ title, url: request.url.href }],
      warnings: [],
      reasonCode: null,
    };
  }
}
