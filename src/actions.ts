import { ZodError } from "zod";

import type { ReachEnvelope, ReachReasonCode } from "./contracts";
import {
  executeReachOperation,
  type ReachActionName,
} from "./operations";

type Env = Record<string, string | undefined>;
type Executor = (
  action: ReachActionName,
  input: unknown,
  env: Env,
) => Promise<ReachEnvelope<unknown>>;

const ORIGIN = "https://reach-gateway.izeesub.workers.dev";
const ISSUER = "https://noisy-pond-95ae.cloudflareaccess.com";
const OAUTH_RESOURCE = `resource=${encodeURIComponent(ORIGIN)}`;

const envelopeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["passed", "failed", "unavailable"] },
    source: { type: "string", enum: ["web", "x", "youtube", "reddit", "rss"] },
    operation: { type: "string", enum: ["read", "transcript", "health"] },
    canonicalUrl: { type: ["string", "null"], format: "uri" },
    retrievedAt: { type: "string", format: "date-time" },
    backend: { type: "string" },
    content: { type: ["string", "null"] },
    items: { type: "array", items: {} },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string", format: "uri" },
        },
        required: ["title", "url"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
    reasonCode: { type: ["string", "null"] },
  },
  required: [
    "status",
    "source",
    "operation",
    "canonicalUrl",
    "retrievedAt",
    "backend",
    "content",
    "items",
    "citations",
    "warnings",
    "reasonCode",
  ],
} as const;

const standardResponses = {
  200: { $ref: "#/components/responses/ReachResult" },
  400: { description: "Invalid request" },
  401: { description: "Authentication required" },
  404: { description: "Action unavailable" },
  500: { description: "Bounded internal failure" },
} as const;

const urlRequest = { $ref: "#/components/requestBodies/PublicUrl" } as const;

export const OPENAPI_DOCUMENT = Object.freeze({
  openapi: "3.1.0",
  info: {
    title: "Reach the G",
    version: "0.2.0",
    description: "Owner-private, read-only retrieval of normalized public evidence.",
  },
  servers: [{ url: ORIGIN }],
  security: [{ oauth: ["reach:read"] }],
  paths: {
    "/v1/reach/read": {
      post: {
        operationId: "readPublicUrl",
        summary: "Read one public HTTPS URL",
        description: "Retrieve inert public evidence with provenance.",
        security: [{ oauth: ["reach:read"] }],
        requestBody: urlRequest,
        responses: standardResponses,
        "x-openai-isConsequential": false,
      },
    },
    "/v1/reach/transcript": {
      post: {
        operationId: "getPublicTranscript",
        summary: "Get available public YouTube captions",
        description: "Retrieve captions for one supported public YouTube URL.",
        security: [{ oauth: ["reach:read"] }],
        requestBody: urlRequest,
        responses: standardResponses,
        "x-openai-isConsequential": false,
      },
    },
    "/v1/reach/health": {
      post: {
        operationId: "checkEvidenceChannels",
        summary: "Check Reach evidence channels",
        description: "Report bounded availability for public evidence channels.",
        security: [{ oauth: ["reach:read"] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  sources: {
                    type: "array",
                    maxItems: 5,
                    uniqueItems: true,
                    items: {
                      type: "string",
                      enum: ["web", "x", "youtube", "reddit", "rss"],
                    },
                  },
                },
              },
            },
          },
        },
        responses: standardResponses,
        "x-openai-isConsequential": false,
      },
    },
  },
  components: {
    schemas: {
      ReachEnvelope: envelopeSchema,
      PublicUrlInput: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string", format: "uri", pattern: "^https://" },
        },
        required: ["url"],
      },
    },
    requestBodies: {
      PublicUrl: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PublicUrlInput" },
          },
        },
      },
    },
    responses: {
      ReachResult: {
        description: "Normalized public evidence result",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ReachEnvelope" },
          },
        },
      },
    },
    securitySchemes: {
      oauth: {
        type: "oauth2",
        flows: {
          authorizationCode: {
            authorizationUrl: `${ISSUER}/cdn-cgi/access/oauth/authorization?${OAUTH_RESOURCE}`,
            tokenUrl: `${ISSUER}/cdn-cgi/access/oauth/token?${OAUTH_RESOURCE}`,
            scopes: {
              "reach:read": "Read public evidence through the owner-private Reach gateway",
            },
          },
        },
      },
    },
  },
});

const ACTION_ROUTES = Object.freeze({
  "POST /v1/reach/read": "read",
  "POST /v1/reach/transcript": "transcript",
  "POST /v1/reach/health": "health",
} satisfies Record<string, ReachActionName>);

export function openApiResponse(): Response {
  return Response.json(OPENAPI_DOCUMENT, {
    headers: { "cache-control": "public, max-age=300" },
  });
}

export async function handleActionRequest(
  request: Request,
  env: Env,
  dependencies: {
    execute?: Executor;
    requestId?: () => string;
  } = {},
): Promise<Response> {
  const route = `${request.method} ${new URL(request.url).pathname}`;
  const action = ACTION_ROUTES[route as keyof typeof ACTION_ROUTES];
  const requestId = (dependencies.requestId ?? crypto.randomUUID)();
  if (!action) return normalizedError("SOURCE_NOT_FOUND", 404, requestId);

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 262_144) {
      return normalizedError("POLICY_RESPONSE_TOO_LARGE", 413, requestId);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 262_144) {
      return normalizedError("POLICY_RESPONSE_TOO_LARGE", 413, requestId);
    }
    const input = raw.trim() ? JSON.parse(raw) : {};
    const result = await (dependencies.execute ?? executeReachOperation)(action, input, env);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return normalizedError("INPUT_INVALID", 400, requestId);
    }
    return normalizedError("INTERNAL_UNEXPECTED", 500, requestId);
  }
}

function normalizedError(
  code: ReachReasonCode,
  status: number,
  requestId: string,
): Response {
  return Response.json(
    {
      error: {
        code,
        message: "The Reach operation could not be completed",
        requestId,
      },
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}
