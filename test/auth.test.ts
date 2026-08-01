import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { oauthChallenge, protectedResourceMetadata } from "../src/auth/metadata";
import { verifyOwner } from "../src/auth/verify-owner";
import type { ReachConfig } from "../src/config";

const fixtureConfig: ReachConfig = {
  oauthIssuer: "https://auth.example.com",
  oauthAudience: "https://reach-gateway.example.com",
  ownerSub: "owner-123",
  braveSearchApiKey: "unused-test-key",
  publicOrigin: "https://reach-gateway.example.com",
  limits: {
    maxRedirects: 3,
    maxResponseBytes: 2_000_000,
    maxContentChars: 120_000,
    requestTimeoutMs: 12_000,
    maxSearchItems: 20,
  },
};

let privateKey: CryptoKey;
let keySet: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const publicJwk = await exportJWK(pair.publicKey);
  keySet = createLocalJWKSet({ keys: [{ ...publicJwk, alg: "RS256", kid: "test-key" }] });
});

function accessRequest(token?: string): Request {
  return new Request("https://reach-gateway.example.com/mcp", {
    headers: token ? { "cf-access-jwt-assertion": token } : {},
  });
}

async function fixtureToken(overrides: Record<string, unknown> = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: "cf-access-user-123",
    email: fixtureConfig.ownerSub,
    iss: fixtureConfig.oauthIssuer,
    aud: fixtureConfig.oauthAudience,
    iat: now,
    nbf: now - 1,
    exp: now + 300,
    ...overrides,
  };

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key", typ: "JWT" })
    .sign(privateKey);
}

describe("OAuth protected-resource metadata", () => {
  it("advertises the exact protected resource", () => {
    expect(protectedResourceMetadata(fixtureConfig)).toEqual({
      resource: "https://reach-gateway.example.com",
      authorization_servers: ["https://auth.example.com"],
      scopes_supported: ["reach:read"],
      bearer_methods_supported: ["header"],
    });
  });

  it("points the challenge at protected-resource metadata", () => {
    expect(oauthChallenge(fixtureConfig)).toBe(
      'Bearer resource_metadata="https://reach-gateway.example.com/.well-known/oauth-protected-resource", scope="reach:read"',
    );
  });
});

describe("verifyOwner", () => {
  it("accepts the exact owner identity asserted by Cloudflare Access", async () => {
    const identity = await verifyOwner(accessRequest(await fixtureToken()), fixtureConfig, keySet);

    expect(identity).toEqual({ sub: "cf-access-user-123", scopes: ["reach:read"] });
  });

  it("accepts any identity admitted by the dedicated owner-only Access application", async () => {
    const token = await fixtureToken({ email: "other@example.com" });

    await expect(verifyOwner(accessRequest(token), fixtureConfig, keySet)).resolves.toEqual({
      sub: "cf-access-user-123",
      scopes: ["reach:read"],
    });
  });

  it("rejects missing, malformed, and email-less Access assertions", async () => {
    await expect(verifyOwner(accessRequest(), fixtureConfig, keySet)).rejects.toMatchObject({
      reasonCode: "AUTH_MISSING",
      httpStatus: 401,
    });
    await expect(verifyOwner(accessRequest("not-a-jwt"), fixtureConfig, keySet)).rejects.toMatchObject({
      reasonCode: "AUTH_TOKEN_INVALID",
      httpStatus: 401,
    });
    await expect(
      verifyOwner(accessRequest(await fixtureToken({ email: undefined })), fixtureConfig, keySet),
    ).rejects.toMatchObject({ reasonCode: "AUTH_OWNER_DENIED", httpStatus: 401 });
  });

  it.each([
    ["wrong issuer", { iss: "https://other.example.com" }, "AUTH_ISSUER_INVALID"],
    ["wrong audience", { aud: "https://other.example.com" }, "AUTH_AUDIENCE_INVALID"],
    ["expired", { exp: 1 }, "AUTH_TOKEN_EXPIRED"],
  ])("rejects %s tokens", async (_label, overrides, reasonCode) => {
    await expect(
      verifyOwner(accessRequest(await fixtureToken(overrides)), fixtureConfig, keySet),
    ).rejects.toMatchObject({ reasonCode, httpStatus: 401 });
  });

  it("never exposes the allowlisted subject in authentication errors", async () => {
    const token = await fixtureToken({ aud: "https://other.example.com" });

    try {
      await verifyOwner(accessRequest(token), fixtureConfig, keySet);
      throw new Error("expected authorization to fail");
    } catch (error) {
      expect(String(error)).not.toContain(fixtureConfig.ownerSub);
      expect((error as { headers: Headers }).headers.get("www-authenticate")).toBe(
        oauthChallenge(fixtureConfig),
      );
    }
  });
});
