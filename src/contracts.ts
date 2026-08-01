import { z } from "zod";

export const ReachStatusSchema = z.enum(["passed", "failed", "unavailable"]);
export const ReachSourceSchema = z.enum(["web", "x", "youtube", "reddit", "rss"]);
export const ReachOperationSchema = z.enum(["search", "read", "transcript", "health"]);

export const ReachReasonCodeSchema = z.enum([
  "AUTH_MISSING",
  "AUTH_MALFORMED",
  "AUTH_TOKEN_INVALID",
  "AUTH_TOKEN_EXPIRED",
  "AUTH_ISSUER_INVALID",
  "AUTH_AUDIENCE_INVALID",
  "AUTH_SCOPE_MISSING",
  "AUTH_OWNER_DENIED",
  "INPUT_INVALID",
  "INPUT_URL_REQUIRED",
  "INPUT_QUERY_REQUIRED",
  "INPUT_SOURCE_INVALID",
  "INPUT_LIMIT_INVALID",
  "POLICY_DESTINATION_DENIED",
  "POLICY_PROTOCOL_DENIED",
  "POLICY_REDIRECT_DENIED",
  "POLICY_DNS_REBIND",
  "POLICY_RESPONSE_TOO_LARGE",
  "POLICY_MIME_DENIED",
  "SOURCE_OPERATION_UNSUPPORTED",
  "SOURCE_NOT_FOUND",
  "SOURCE_BLOCKED",
  "SOURCE_RATE_LIMITED",
  "SOURCE_PARSE_FAILED",
  "SOURCE_CAPTIONS_UNAVAILABLE",
  "BACKEND_UNAVAILABLE",
  "BACKEND_TIMEOUT",
  "BACKEND_RATE_LIMITED",
  "BACKEND_AUTH_FAILED",
  "BACKEND_RESPONSE_INVALID",
  "CONTENT_EMPTY",
  "CONTENT_TRUNCATED",
  "CONTENT_UNTRUSTED",
  "INTERNAL_UNEXPECTED",
  "INTERNAL_CONFIGURATION",
]);

export const CitationSchema = z
  .object({
    title: z.string().min(1),
    url: z.url(),
  })
  .strict();

export const ReachEnvelopeSchema = z
  .object({
    status: ReachStatusSchema,
    source: ReachSourceSchema,
    operation: ReachOperationSchema,
    canonicalUrl: z.url().nullable(),
    retrievedAt: z.iso.datetime(),
    backend: z.string().min(1),
    content: z.string().nullable(),
    items: z.array(z.unknown()),
    citations: z.array(CitationSchema),
    warnings: z.array(z.string()),
    reasonCode: ReachReasonCodeSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "passed" && value.reasonCode !== null) {
      context.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "passed results cannot carry a failure reason",
      });
    }
    if (value.status !== "passed" && value.reasonCode === null) {
      context.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "failed and unavailable results require a reason",
      });
    }
  });

export type ReachStatus = z.infer<typeof ReachStatusSchema>;
export type ReachSource = z.infer<typeof ReachSourceSchema>;
export type ReachOperation = z.infer<typeof ReachOperationSchema>;
export type ReachReasonCode = z.infer<typeof ReachReasonCodeSchema>;
export type Citation = z.infer<typeof CitationSchema>;

export interface ReachEnvelope<T> {
  status: ReachStatus;
  source: ReachSource;
  operation: ReachOperation;
  canonicalUrl: string | null;
  retrievedAt: string;
  backend: string;
  content: string | null;
  items: T[];
  citations: Citation[];
  warnings: string[];
  reasonCode: ReachReasonCode | null;
}
