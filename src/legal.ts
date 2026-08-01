const TEXT = {
  privacy:
    "Reach Gateway retrieves public sources on demand. It does not store conversations, retrieved content, browser cookies, source-account sessions, or private-source credentials.",
  terms:
    "Reach Gateway is an owner-private, read-only public-evidence service. Source availability and terms remain controlled by each source provider.",
  support:
    "Reach Gateway support: disable the personal plugin first, then contact the owner through the private project channel.",
} as const;

export function legalResponse(kind: keyof typeof TEXT): Response {
  return new Response(`${TEXT[kind]}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function versionResponse(): Response {
  return Response.json({ name: "reach-gateway", version: "0.1.0" });
}

export function healthzResponse(): Response {
  return Response.json({ status: "passed", service: "reach-gateway" });
}
