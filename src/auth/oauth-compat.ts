import type { ReachConfig } from "../config";

const MAX_TOKEN_BODY_BYTES = 16_384;

export function authorizeCompatibilityRedirect(
  request: Request,
  config: ReachConfig,
): Response {
  if (request.method !== "GET") return new Response("Method not allowed\n", { status: 405 });

  const incoming = new URL(request.url);
  const target = new URL("cdn-cgi/access/oauth/authorization", `${config.oauthIssuer}/`);
  incoming.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  target.searchParams.set("resource", config.publicOrigin);

  return new Response(null, {
    status: 302,
    headers: { location: target.toString(), "cache-control": "no-store" },
  });
}

export async function proxyTokenExchange(
  request: Request,
  config: ReachConfig,
): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed\n", { status: 405 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return new Response("Unsupported media type\n", { status: 415 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_TOKEN_BODY_BYTES) return new Response("Payload too large\n", { status: 413 });

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_TOKEN_BODY_BYTES) {
    return new Response("Payload too large\n", { status: 413 });
  }
  const parameters = new URLSearchParams(body);
  parameters.set("resource", config.publicOrigin);

  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const upstream = await fetch(
    new URL("cdn-cgi/access/oauth/token", `${config.oauthIssuer}/`).toString(),
    { method: "POST", headers, body: parameters.toString(), redirect: "manual" },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
