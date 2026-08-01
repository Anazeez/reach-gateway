# Reach Gateway Release Verification

Date: 2026-08-01
Deployment status: `passed`
Connection status: `unavailable`
Current blocker: the owner must connect the deployed MCP once through the
ChatGPT web New Plugin form and complete Cloudflare Access sign-in

## Local candidate

- Source repository: `https://github.com/Anazeez/reach-gateway`
- Reviewed source commit: `010835e49fbc79a92e2bf06006e7a6286dd9e903`
- `package-lock.json` SHA-256:
  `6a917802a8cd6d1a1093d1442101447dee9216eadf5f7f8427a456636217979b`
- Build, lint, unit, contract, and policy tests: `passed`; 44 tests passed and
  five credentialed live-source tests were skipped by design
- Secret scan: `passed`; 59 files inspected
- Production bundle: `passed` with Wrangler 4.118.0 dry-run
- Deployment: `passed` at 2026-08-01T11:29:27Z
- Production MCP URL: `https://reach-gateway.izeesub.workers.dev/mcp`
- Public health URL: `https://reach-gateway.izeesub.workers.dev/healthz`
- Cloudflare Worker version: `bfb5af04-2a9d-4dd9-ae26-b67779565396`
- Pre-secret transition version: `b2380611-d393-4849-b1a1-c9c0ff978557`
- Deployment workflow: `passed` in
  `https://github.com/Anazeez/auralis/actions/runs/30697755950`
- OAuth issuer: `https://noisy-pond-95ae.cloudflareaccess.com`
- OAuth profile: Cloudflare Access Managed OAuth with dynamic client
  registration and PKCE S256; the audience is bound to the Access application
  and was injected without logging its value
- Owner identity: stored as an encrypted Worker secret and enforced by an
  exact-email Cloudflare Access policy; its value is not recorded here
- Live health and OAuth boundary: `passed`; `/healthz` returned the expected
  service status, OAuth discovery exposed the issuer, registration endpoint,
  and S256, and unauthenticated `/mcp` returned `401` with protected-resource
  metadata
- Authenticated MCP invocation: `unavailable` until the owner completes the
  web OAuth connection
- Brave search: `unavailable`; no Brave API key is configured. The read, X,
  Reddit, RSS, YouTube transcript, and health capabilities remain deployable
  independently.
- Plugin publication/connection: `unavailable`; the production URL is ready,
  but the owner-only listing has not yet been created and connected
- Cross-device inheritance: `skipped`; it requires web installation and
  connection first, followed by discovery, invocation, and OAuth checks on each
  intended native ChatGPT and Codex surface
- Custom GPT selection and invocation: `skipped` until connection

## Required deployment evidence

The remaining acceptance evidence is an authenticated MCP initialization and
tool call, followed by directory inheritance and invocation on each intended
native ChatGPT and Codex surface and in a custom GPT preview.
