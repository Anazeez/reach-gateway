import { LIMITS, type ReachLimits } from "../config";
import { ReachError } from "../errors";
import { dohResolver, validatePublicUrl, type DnsResolver } from "./url-policy";

const ALLOWED_MIME = new Set([
  "application/atom+xml",
  "application/json",
  "application/rss+xml",
  "application/xml",
  "text/html",
  "text/plain",
  "text/xml",
]);

export interface SafeFetchOptions {
  fetcher?: typeof fetch;
  resolver?: DnsResolver;
  headers?: HeadersInit;
  trustedHeaders?: HeadersInit;
  signal?: AbortSignal;
  limits?: Partial<ReachLimits>;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  headers: Headers;
  text: string;
  truncated: boolean;
}

function cleanHeaders(input?: HeadersInit): Headers {
  const headers = new Headers(input);
  for (const name of [
    "authorization",
    "cookie",
    "proxy-authorization",
    "x-api-key",
    "x-auth-token",
  ]) {
    headers.delete(name);
  }
  headers.set("user-agent", "ReachGateway/0.1 (+public-read-only)");
  return headers;
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ReachError("POLICY_RESPONSE_TOO_LARGE", "Response exceeds byte limit");
  }

  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ReachError("POLICY_RESPONSE_TOO_LARGE", "Response exceeds byte limit");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function combinedSignal(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function safeFetch(raw: string | URL, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const fetcher = options.fetcher ?? fetch;
  const resolver = options.resolver ?? dohResolver;
  const limits = { ...LIMITS, ...options.limits };
  const headers = cleanHeaders(options.headers);
  for (const [name, value] of new Headers(options.trustedHeaders)) headers.set(name, value);
  let current = new URL(raw);

  for (let redirects = 0; redirects <= limits.maxRedirects; redirects += 1) {
    const validated = await validatePublicUrl(current, resolver);
    let response: Response;
    try {
      response = await fetcher(validated.url, {
        method: "GET",
        headers,
        redirect: "manual",
        signal: combinedSignal(limits.requestTimeoutMs, options.signal),
      });
    } catch (error) {
      if (error instanceof ReachError) throw error;
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new ReachError("BACKEND_TIMEOUT", "Upstream request timed out", "unavailable");
      }
      throw new ReachError("BACKEND_UNAVAILABLE", "Upstream request failed", "unavailable");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === limits.maxRedirects) {
        throw new ReachError("POLICY_REDIRECT_DENIED", "Redirect limit or target invalid");
      }
      current = new URL(location, validated.url);
      continue;
    }

    const mime = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (!mime || !ALLOWED_MIME.has(mime)) {
      throw new ReachError("POLICY_MIME_DENIED", "Response MIME type is not allowed");
    }

    const bytes = await readBounded(response, limits.maxResponseBytes);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const truncated = decoded.length > limits.maxContentChars;
    return {
      url: validated.url.href,
      status: response.status,
      headers: new Headers(response.headers),
      text: decoded.slice(0, limits.maxContentChars),
      truncated,
    };
  }

  throw new ReachError("POLICY_REDIRECT_DENIED", "Redirect limit exceeded");
}
