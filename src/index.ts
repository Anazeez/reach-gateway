import { createMcpHandler } from "agents/mcp/server";

import { oauthChallenge, protectedResourceMetadata } from "./auth/metadata";
import { AuthError, verifyOwner } from "./auth/verify-owner";
import { parseEnv } from "./config";
import { healthzResponse, legalResponse, versionResponse } from "./legal";
import { createReachServer } from "./tools/register-tools";

interface Env extends Record<string, string | undefined> {
  REACH_OAUTH_ISSUER: string;
  REACH_OAUTH_AUDIENCE: string;
  REACH_OWNER_SUB: string;
  REACH_PUBLIC_ORIGIN: string;
  OPENAI_APPS_CHALLENGE?: string;
}

async function handle(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/healthz") return healthzResponse();
  if (url.pathname === "/version") return versionResponse();
  if (url.pathname === "/privacy") return legalResponse("privacy");
  if (url.pathname === "/terms") return legalResponse("terms");
  if (url.pathname === "/support") return legalResponse("support");
  if (url.pathname === "/.well-known/openai-apps-challenge") {
    return new Response(env.OPENAI_APPS_CHALLENGE ?? "", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const config = parseEnv(env);
  if (url.pathname === "/.well-known/oauth-protected-resource") {
    return Response.json(protectedResourceMetadata(config));
  }

  if (url.pathname !== "/mcp") return new Response("Not found\n", { status: 404 });

  try {
    await verifyOwner(request, config);
  } catch (error) {
    if (error instanceof AuthError) {
      console.warn({
        event: "reach_auth_rejected",
        reasonCode: error.reasonCode,
        rayId: request.headers.get("cf-ray"),
      });
      return Response.json(
        { error: "unauthorized" },
        { status: error.httpStatus, headers: error.headers },
      );
    }
    return Response.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: { "www-authenticate": oauthChallenge(config) },
      },
    );
  }

  const handler = createMcpHandler(() => createReachServer(env), {
    route: "/mcp",
    allowedOriginHostnames: ["chatgpt.com", new URL(config.publicOrigin).hostname],
    legacy: "stateless",
  });
  return handler(request, env, context);
}

export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;
