import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { BraveSearchAdapter } from "../src/adapters/brave-search";
import { RedditAdapter } from "../src/adapters/reddit";
import { RssAdapter } from "../src/adapters/rss";
import { WebAdapter } from "../src/adapters/web";
import { XAdapter } from "../src/adapters/x";
import { YouTubeAdapter } from "../src/adapters/youtube";
import type { AdapterRequest } from "../src/adapters/types";
import type { SafeFetchResult } from "../src/security/safe-fetch";

const fixtureDirectory = fileURLToPath(new URL("./fixtures/", import.meta.url));
const signal = new AbortController().signal;

async function fixture(name: string): Promise<string> {
  return readFile(`${fixtureDirectory}${name}`, "utf8");
}

function request(overrides: Partial<AdapterRequest>): AdapterRequest {
  return {
    operation: "read",
    source: "web",
    limit: 5,
    signal,
    ...overrides,
  };
}

function fetchFixture(text: string, url: string, contentType: string) {
  return vi.fn(async (_raw: string | URL, _options?: unknown): Promise<SafeFetchResult> => ({
    url,
    status: 200,
    headers: new Headers({ "content-type": contentType }),
    text,
    truncated: false,
  }));
}

describe("public adapters", () => {
  it("extracts readable web evidence", async () => {
    const fetcher = fetchFixture(
      await fixture("article.html"),
      "https://example.com/article",
      "text/html",
    );
    const result = await new WebAdapter(fetcher).execute(
      request({ url: new URL("https://example.com/article") }),
    );

    expect(result.status).toBe("passed");
    expect(result.content).toContain("UNTRUSTED PUBLIC EVIDENCE");
    expect(result.content).toContain("Reach Gateway article body");
    expect(result.citations[0]?.title).toBe("Fixture Article");
  });

  it("normalizes RSS and Atom entries", async () => {
    const fetcher = fetchFixture(
      await fixture("feed.xml"),
      "https://feeds.example/feed.xml",
      "application/rss+xml",
    );
    const result = await new RssAdapter(fetcher).execute(
      request({ source: "rss", url: new URL("https://feeds.example/feed.xml") }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      title: "First item",
      url: "https://example.com/first",
    });
  });

  it("reads a public X post through the syndication response", async () => {
    const fetcher = fetchFixture(
      await fixture("x.json"),
      "https://cdn.syndication.twimg.com/tweet-result?id=2083150563336728756&lang=en",
      "application/json",
    );
    const result = await new XAdapter(fetcher).execute(
      request({ source: "x", url: new URL("https://x.com/granite0x/status/2083150563336728756") }),
    );

    expect(result.content).toContain("public retrieval");
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("2083150563336728756");
  });

  it("normalizes public Reddit JSON", async () => {
    const fetcher = fetchFixture(
      await fixture("reddit.json"),
      "https://www.reddit.com/r/test/comments/abc/example.json",
      "application/json",
    );
    const result = await new RedditAdapter(fetcher).execute(
      request({ source: "reddit", url: new URL("https://www.reddit.com/r/test/comments/abc/example") }),
    );

    expect(result.content).toContain("Public Reddit body");
    expect(result.citations[0]?.url).toBe("https://www.reddit.com/r/test/comments/abc/example/");
  });

  it("returns public YouTube captions from the injected extractor", async () => {
    const transcript = vi.fn(async () => [
      { text: "First caption", duration: 1, offset: 0, lang: "en" },
      { text: "Second caption", duration: 1, offset: 1, lang: "en" },
    ]);
    const result = await new YouTubeAdapter(transcript).execute(
      request({
        operation: "transcript",
        source: "youtube",
        url: new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      }),
    );

    expect(result.content).toContain("First caption\nSecond caption");
    expect(transcript).toHaveBeenCalledWith("dQw4w9WgXcQ");
  });

  it("uses the fixed Brave endpoint and source filter", async () => {
    const fetcher = fetchFixture(
      JSON.stringify({ web: { results: [{ title: "Result", url: "https://x.com/post", description: "Description" }] } }),
      "https://api.search.brave.com/res/v1/web/search",
      "application/json",
    );
    const result = await new BraveSearchAdapter("test-key", fetcher).execute(
      request({ operation: "search", source: "x", query: "agent reach", limit: 3 }),
    );

    expect(result.items).toHaveLength(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("site%3Ax.com");
  });
});
