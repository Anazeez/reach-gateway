import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";

import type { ReachConfig } from "../config";
import type { ReachReasonCode } from "../contracts";
import { ReachError } from "../errors";
import { oauthChallenge } from "./metadata";

const ALGORITHMS = ["RS256", "ES256", "EdDSA"] as const;
const jwksByIssuer = new Map<string, JWTVerifyGetKey>();

export interface OwnerIdentity {
  sub: string;
  scopes: readonly ["reach:read"];
}

export class AuthError extends ReachError {
  readonly httpStatus = 401;
  readonly headers: Headers;

  constructor(reasonCode: ReachReasonCode, config: ReachConfig) {
    super(reasonCode, "Authentication failed");
    this.name = "AuthError";
    this.headers = new Headers({ "www-authenticate": oauthChallenge(config) });
  }
}

function authError(reasonCode: ReachReasonCode, config: ReachConfig): AuthError {
  return new AuthError(reasonCode, config);
}

function remoteKeySet(config: ReachConfig): JWTVerifyGetKey {
  const cached = jwksByIssuer.get(config.oauthIssuer);
  if (cached) return cached;

  const keySet = createRemoteJWKSet(
    new URL(".well-known/jwks.json", `${config.oauthIssuer}/`),
  );
  jwksByIssuer.set(config.oauthIssuer, keySet);
  return keySet;
}

function bearerToken(request: Request, config: ReachConfig): string {
  const authorization = request.headers.get("authorization");
  if (!authorization) throw authError("AUTH_MISSING", config);

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match?.[1]) throw authError("AUTH_MALFORMED", config);
  return match[1];
}

function mapJoseError(error: unknown, config: ReachConfig): AuthError {
  if (error instanceof errors.JWTExpired) {
    return authError("AUTH_TOKEN_EXPIRED", config);
  }
  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === "iss") return authError("AUTH_ISSUER_INVALID", config);
    if (error.claim === "aud") return authError("AUTH_AUDIENCE_INVALID", config);
  }
  return authError("AUTH_TOKEN_INVALID", config);
}

export async function verifyOwner(
  request: Request,
  config: ReachConfig,
  keySet: JWTVerifyGetKey = remoteKeySet(config),
): Promise<OwnerIdentity> {
  const token = bearerToken(request, config);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySet, {
      algorithms: [...ALGORITHMS],
      issuer: config.oauthIssuer,
      audience: config.oauthAudience,
      requiredClaims: ["sub", "exp", "iat", "nbf"],
    }));
  } catch (error) {
    throw mapJoseError(error, config);
  }

  if (payload.sub !== config.ownerSub) {
    throw authError("AUTH_OWNER_DENIED", config);
  }

  const scopes = String(payload.scope ?? "").split(/\s+/u).filter(Boolean);
  if (!scopes.includes("reach:read")) {
    throw authError("AUTH_SCOPE_MISSING", config);
  }

  return { sub: payload.sub, scopes: ["reach:read"] };
}
