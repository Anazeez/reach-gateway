# Reach Gateway

Reach Gateway is an owner-authenticated, read-only service for normalized public evidence. It runs on Cloudflare Workers, uses Cloudflare Access OAuth, and exposes the registered private app **Reach the G** to ChatGPT and Codex through MCP and a Custom GPT Action facade.

Discovery stays with the host assistant. Reach uses no paid search API and provides no private-account or write access.

## Actions

| Action | Purpose |
|---|---|
| `health` | Check Web, X, YouTube, Reddit, and RSS evidence channels. |
| `read` | Retrieve one public HTTPS URL as inert, provenance-bearing evidence. |
| `transcript` | Retrieve available public captions for a supported YouTube URL. |

Production MCP endpoint: `https://reach-gateway.izeesub.workers.dev/mcp`

Custom GPT schema: `https://reach-gateway.izeesub.workers.dev/openapi.json`

The Action bundle and exact GPT Builder instructions are under [`actions`](actions). Its operation IDs are `checkEvidenceChannels`, `readPublicUrl`, and `getPublicTranscript`; all three call the same retrieval core as MCP.

## Local verification

Requires Node.js 24 or newer.

```bash
npm ci
npm run check
node scripts/verify-no-secrets.mjs
npx wrangler deploy --dry-run
```

Credentialed source tests are separate and do not certify a release when skipped:

```bash
REACH_LIVE_TESTS=1 npm run test:live
```

## Security boundary

- Exact-owner OAuth is enforced by Cloudflare Access and Worker-side identity verification.
- Retrieval accepts only public HTTPS destinations and passes through SSRF-safe URL policy.
- Retrieved content is labeled and treated as untrusted evidence.
- Cookies, bearer tokens, private-account credentials, writes, and paid search keys are outside the product contract.
- The service is stateless and does not create a research-memory authority.

## Private distribution

The Codex bundle is under [`plugin/reach-gateway`](plugin/reach-gateway) and maps to the existing registered app instead of creating a duplicate MCP identity. The release is distributed through the owner's personal plugin catalog. Public multi-user directory submission is intentionally unavailable because reusable reviewer access would conflict with owner-only OTP/MFA.

See [`docs/evidence/release-verification.md`](docs/evidence/release-verification.md) for exact verification state and remaining device checks.

## Rollback

Use one explicit, previously verified Cloudflare deployment ID:

```bash
./scripts/rollback.sh <deployment-id>
```

Rollback is a production mutation and must remain human-authorized.
