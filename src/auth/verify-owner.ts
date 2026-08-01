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
    new URL("cdn-cgi/access/certs", `${config.oauthIssuer}/`),
  );
  jwksByIssuer.set(config.oauthIssuer, keySet);
  return keySet;
}

function accessAssertion(request: Request, config: ReachConfig): string {
  const assertion = request.headers.get("cf-access-jwt-assertion")?.trim();
  if (!assertion) throw authError("AUTH_MISSING", config);
  return assertion;
}

function mapJoseError(error: unknown, config: ReachConfig): AuthError {
  if (error instanceof errors.JWTExpired) {
    return authError("AUTH_TOKEN_EXPIRED", config);
  }
  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === "iss") return authError("AUTH_ISSUER_INVALID", config);
    if (error.claim === "aud") return authError("AUTH_AUDIENCE_INVALID", config);
    if (error.claim === "email") return authError("AUTH_OWNER_DENIED", config);
  }
  return authError("AUTH_TOKEN_INVALID", config);
}

export async function verifyOwner(
  request: Request,
  config: ReachConfig,
  keySet: JWTVerifyGetKey = remoteKeySet(config),
): Promise<OwnerIdentity> {
  const token = accessAssertion(request, config);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySet, {
      algorithms: [...ALGORITHMS],
      issuer: config.oauthIssuer,
      audience: config.oauthAudience,
      requiredClaims: ["sub", "email", "exp", "iat", "nbf"],
    }));
  } catch (error) {
    throw mapJoseError(error, config);
  }

  if (payload.email !== config.ownerSub) {
    throw authError("AUTH_OWNER_DENIED", config);
  }

  return { sub: payload.sub, scopes: ["reach:read"] };
}
