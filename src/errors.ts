import type {
  ReachEnvelope,
  ReachOperation,
  ReachReasonCode,
  ReachSource,
  ReachStatus,
} from "./contracts";

export class ReachError extends Error {
  constructor(
    readonly reasonCode: ReachReasonCode,
    message: string,
    readonly status: ReachStatus = "failed",
  ) {
    super(message);
    this.name = "ReachError";
  }
}

export function failure<T = never>(options: {
  source: ReachSource;
  operation: ReachOperation;
  reasonCode: ReachReasonCode;
  backend?: string;
  status?: Exclude<ReachStatus, "passed">;
  canonicalUrl?: string | null;
  warnings?: string[];
}): ReachEnvelope<T> {
  return {
    status: options.status ?? "failed",
    source: options.source,
    operation: options.operation,
    canonicalUrl: options.canonicalUrl ?? null,
    retrievedAt: new Date().toISOString(),
    backend: options.backend ?? "none",
    content: null,
    items: [],
    citations: [],
    warnings: options.warnings ?? [],
    reasonCode: options.reasonCode,
  };
}
