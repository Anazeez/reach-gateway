import { fetchTranscript, type TranscriptResponse } from "youtube-transcript";

import type { ReachEnvelope } from "../contracts";
import { ReachError } from "../errors";
import { asUntrustedEvidence } from "../security/untrusted-content";
import type { AdapterRequest, ReachAdapter } from "./types";
import { healthEnvelope } from "./types";

type TranscriptFetcher = (videoId: string) => Promise<TranscriptResponse[]>;

function videoId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/", 1)[0] ?? null;
  if (new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]).has(url.hostname)) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const match = /^\/(?:shorts|embed)\/([^/]+)/u.exec(url.pathname);
    return match?.[1] ?? null;
  }
  return null;
}

export class YouTubeAdapter implements ReachAdapter {
  readonly id = "youtube-transcript@1";
  readonly source = "youtube" as const;
  readonly operations = ["transcript"] as const;

  constructor(private readonly transcriptFetcher: TranscriptFetcher = fetchTranscript) {}

  probe(_signal: AbortSignal) {
    return Promise.resolve(healthEnvelope(this.source, this.id));
  }

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    if (!request.url) throw new ReachError("INPUT_URL_REQUIRED", "YouTube URL is required");
    const id = videoId(request.url);
    if (!id || !/^[A-Za-z0-9_-]{11}$/u.test(id)) {
      throw new ReachError("INPUT_INVALID", "Unsupported YouTube video URL");
    }

    let rows: TranscriptResponse[];
    try {
      rows = await this.transcriptFetcher(id);
    } catch {
      throw new ReachError("CONTENT_TRANSCRIPT_MISSING", "Public captions are unavailable", "unavailable");
    }
    if (rows.length === 0) {
      throw new ReachError("CONTENT_TRANSCRIPT_MISSING", "Public captions are unavailable", "unavailable");
    }
    const transcript = rows.map((row) => row.text).join("\n");
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;

    return {
      status: "passed",
      source: this.source,
      operation: "transcript",
      canonicalUrl,
      retrievedAt: new Date().toISOString(),
      backend: this.id,
      content: asUntrustedEvidence(transcript),
      items: rows,
      citations: [{ title: `YouTube video ${id}`, url: canonicalUrl }],
      warnings: [],
      reasonCode: null,
    };
  }
}
