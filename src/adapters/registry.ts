import type { ReachEnvelope, ReachReasonCode } from "../contracts";
import { ReachError, failure } from "../errors";
import type { AdapterRequest, ReachAdapter } from "./types";

const RETRYABLE = new Set<ReachReasonCode>([
  "BACKEND_TIMEOUT",
  "BACKEND_UNAVAILABLE",
  "BACKEND_RATE_LIMITED",
  "BACKEND_RESPONSE_INVALID",
  "SOURCE_RATE_LIMITED",
]);

export class AdapterRegistry {
  constructor(private readonly adapters: readonly ReachAdapter[]) {}

  async execute(request: AdapterRequest): Promise<ReachEnvelope<unknown>> {
    const candidates = this.adapters.filter(
      (adapter) =>
        adapter.source === request.source && adapter.operations.includes(request.operation),
    );
    if (candidates.length === 0) {
      return failure({
        source: request.source,
        operation: request.operation,
        status: "unavailable",
        reasonCode: "SOURCE_OPERATION_UNSUPPORTED",
      });
    }

    let lastRetryable: ReachError | undefined;
    const attempted = new Set<string>();
    for (const adapter of candidates) {
      if (attempted.has(adapter.id)) continue;
      attempted.add(adapter.id);

      try {
        return await adapter.execute(request);
      } catch (error) {
        if (!(error instanceof ReachError) || !RETRYABLE.has(error.reasonCode)) throw error;
        lastRetryable = error;
      }
    }

    return failure({
      source: request.source,
      operation: request.operation,
      status: "unavailable",
      reasonCode: lastRetryable?.reasonCode ?? "BACKEND_UNAVAILABLE",
      warnings: ["All eligible public backends were unavailable"],
    });
  }

  async health(sources: readonly AdapterRequest["source"][], signal: AbortSignal) {
    const selected = this.adapters.filter((adapter) => sources.includes(adapter.source));
    return Promise.all(selected.map((adapter) => adapter.probe(signal)));
  }
}
