export const LIMITS = Object.freeze({
  maxRedirects: 3,
  maxResponseBytes: 2_000_000,
  maxContentChars: 120_000,
  requestTimeoutMs: 12_000,
  maxSearchItems: 20,
});

export interface ReachLimits {
  maxRedirects: number;
  maxResponseBytes: number;
  maxContentChars: number;
  requestTimeoutMs: number;
  maxSearchItems: number;
}

export interface ReachConfig {
  oauthIssuer: string;
  oauthAudience: string;
  ownerSub: string;
  braveSearchApiKey: string;
  publicOrigin: string;
  limits: Readonly<ReachLimits>;
}

type Env = Record<string, string | undefined>;

function required(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function httpsUrl(value: string, key: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${key} must use HTTPS`);
  return url.origin;
}

function positiveInteger(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

export function parseEnv(env: Env): ReachConfig {
  const oauthIssuer = httpsUrl(required(env, "REACH_OAUTH_ISSUER"), "REACH_OAUTH_ISSUER");
  const publicOrigin = httpsUrl(required(env, "REACH_PUBLIC_ORIGIN"), "REACH_PUBLIC_ORIGIN");

  return {
    oauthIssuer,
    oauthAudience: required(env, "REACH_OAUTH_AUDIENCE"),
    ownerSub: required(env, "REACH_OWNER_SUB"),
    braveSearchApiKey: env.BRAVE_SEARCH_API_KEY?.trim() ?? "",
    publicOrigin,
    limits: Object.freeze({
      maxRedirects: positiveInteger(env, "REACH_MAX_REDIRECTS", LIMITS.maxRedirects),
      maxResponseBytes: positiveInteger(env, "REACH_MAX_RESPONSE_BYTES", LIMITS.maxResponseBytes),
      maxContentChars: positiveInteger(env, "REACH_MAX_CONTENT_CHARS", LIMITS.maxContentChars),
      requestTimeoutMs: positiveInteger(env, "REACH_REQUEST_TIMEOUT_MS", LIMITS.requestTimeoutMs),
      maxSearchItems: positiveInteger(env, "REACH_MAX_SEARCH_ITEMS", LIMITS.maxSearchItems),
    }),
  };
}
