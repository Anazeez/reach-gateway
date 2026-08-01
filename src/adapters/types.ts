import type {
  ReachEnvelope,
  ReachOperation,
  ReachSource,
} from "../contracts";
import type { SafeFetchOptions, SafeFetchResult } from "../security/safe-fetch";

export interface AdapterRequest {
  operation: ReachOperation;
  source: ReachSource;
  url?: URL;
  limit: number;
  signal: AbortSignal;
}

export interface ReachAdapter {
  readonly id: string;
  readonly source: ReachSource;
  readonly operations: readonly ReachOperation[];
  probe(signal: AbortSignal): Promise<ReachEnvelope<unknown>>;
  execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>>;
}

export type SafeFetcher = (
  raw: string | URL,
  options?: SafeFetchOptions,
) => Promise<SafeFetchResult>;

export function healthEnvelope(
  source: ReachSource,
  backend: string,
): ReachEnvelope<unknown> {
  return {
    status: "passed",
    source,
    operation: "health",
    canonicalUrl: null,
    retrievedAt: new Date().toISOString(),
    backend,
    content: null,
    items: [],
    citations: [],
    warnings: [],
    reasonCode: null,
  };
}
