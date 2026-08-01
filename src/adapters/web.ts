import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import type { ReachEnvelope } from "../contracts";
import { ReachError } from "../errors";
import { safeFetch } from "../security/safe-fetch";
import { asUntrustedEvidence } from "../security/untrusted-content";
import type { AdapterRequest, ReachAdapter, SafeFetcher } from "./types";
import { healthEnvelope } from "./types";

export class WebAdapter implements ReachAdapter {
  readonly id = "web-readability@1";
  readonly source = "web" as const;
  readonly operations = ["read"] as const;

  constructor(private readonly fetcher: SafeFetcher = safeFetch) {}

  probe(_signal: AbortSignal) {
    return Promise.resolve(healthEnvelope(this.source, this.id));
  }

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    if (!request.url) throw new ReachError("INPUT_URL_REQUIRED", "URL is required");
    const response = await this.fetcher(request.url, { signal: request.signal });
    if (response.status === 401 || response.status === 403) {
      throw new ReachError("SOURCE_AUTH_REQUIRED", "Public source requires authentication", "unavailable");
    }

    const { document } = parseHTML(response.text);
    const article = new Readability(document as never).parse();
    const title = article?.title?.trim() || document.title?.trim() || request.url.hostname;
    const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    const canonicalUrl = canonicalHref
      ? new URL(canonicalHref, response.url).href
      : response.url;
    const visible = article?.textContent?.trim() || document.body?.textContent?.trim() || "";
    if (!visible) throw new ReachError("CONTENT_EMPTY", "No visible public content found", "unavailable");

    return {
      status: "passed",
      source: this.source,
      operation: "read",
      canonicalUrl,
      retrievedAt: new Date().toISOString(),
      backend: this.id,
      content: asUntrustedEvidence(visible),
      items: [],
      citations: [{ title, url: canonicalUrl }],
      warnings: response.truncated ? ["Content truncated at the configured limit"] : [],
      reasonCode: null,
    };
  }
}
