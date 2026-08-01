# Reach Gateway Release Verification

Date: 2026-08-01
Private deployment status: `passed`
Private ChatGPT web connection: `passed`
Personal Codex plugin installation: `passed`
Universal public directory publication: `unavailable` by approved owner-private design
Remaining acceptance blocker: exact native ChatGPT-app and custom-GPT invocation have not yet been observed

## Reviewed runtime and package

- Source repository: `https://github.com/Anazeez/reach-gateway`
- Deployed runtime commit: `643ad53fbfb977f0231aa0b9fa21d2dabd8dbc3c`
- Private plugin package commit: `77c0a53f50e8ca88b74548fa05bfeb1400c55362`
- Plugin version: `0.1.0`
- Registered app ID: `asdk_app_6a6e0220efcc819199465b25290785bf`
- Canonical global skill: `/home/ubuntu/.codex/skills/reach-gateway`
- Installed plugin cache: `/home/ubuntu/.codex/plugins/cache/personal/reach-gateway/0.1.0`
- `package-lock.json` SHA-256: `6a917802a8cd6d1a1093d1442101447dee9216eadf5f7f8427a456636217979b`

## Deterministic verification

- Build and lint: `passed`.
- Publication-gate tests: `passed`; 3 of 3.
- Unit and contract tests: `passed`; 45 passed and 5 credentialed live-source tests skipped.
- Secret scan: `passed`; 68 files inspected.
- Wrangler 4.118.0 production dry-run: `passed`.
- Canonical installed-skill validation: `passed`.
- Repository plugin validation: `passed`.
- Personal source-plugin validation: `passed`.
- Immutable installed-cache validation: `passed`.
- Personal plugin uninstall and clean reinstall: `passed`; version `0.1.0` returned enabled and the rebuilt installed cache revalidated.
- Package test catalog: `passed`; 8 positive and refusal cases parse as valid JSON.
- Fresh Codex skill discovery: `passed`; a clean ephemeral invocation selected `reach-gateway` by exact name.
- Fresh Codex app invocation: `passed`; `codex_apps/reach_the_g.health` returned overall `passed` and `passed` for Web, X, YouTube, Reddit, and RSS at 2026-08-01T20:27Z.
- Production rollback and exact-version restore: `passed` in `https://github.com/Anazeez/auralis/actions/runs/30717335886`. The drill verified the active and target IDs, moved 100% of traffic to `841c5e78-f355-4ded-bc6e-2f22ba63a38a`, probed public health and unauthenticated fail-closed behavior, and restored `b7e344d1-b0f2-44c2-99ea-58ba8c57d950` to 100%.
- Post-restore authenticated Codex health: `passed` at 2026-08-01T20:37Z for all five channels.

## Deployment and authentication

- Production MCP URL: `https://reach-gateway.izeesub.workers.dev/mcp`
- Public health URL: `https://reach-gateway.izeesub.workers.dev/healthz`
- Deployment workflow: `passed` at `https://github.com/Anazeez/auralis/actions/runs/30712497532`.
- Rollback workflow source: `Anazeez/auralis@647519f42d384e81e9bb0e63e13cf0ad884f2f5d`.
- Workflow source pin: `643ad53fbfb977f0231aa0b9fa21d2dabd8dbc3c`.
- Current Cloudflare Worker version ID after owner-secret injection: `b7e344d1-b0f2-44c2-99ea-58ba8c57d950`.
- OAuth issuer: `https://noisy-pond-95ae.cloudflareaccess.com`.
- OAuth discovery and protected-resource metadata: `passed`; both returned HTTP 200.
- Public `/healthz`: `passed`; HTTP 200.
- Unauthenticated `/mcp`, `/version`, `/privacy`, `/terms`, and `/support`: `passed` fail-closed behavior; HTTP 401.
- Owner identity is held only in encrypted deployment configuration and an exact-owner Cloudflare Access policy; its value is not recorded here.

## Product-surface verification

- ChatGPT web creation and OAuth connection: `passed` on the owner's personal Pro account.
- ChatGPT web authenticated `read`: `passed`; `https://example.com/` returned `status=passed`, `backend=web-readability@1`, no warnings, and no reason code.
- ChatGPT web authenticated `health`: `passed` for Web, X, YouTube, Reddit, and RSS.
- ChatGPT action inventory: `passed`; exactly `health`, `read`, and `transcript` are exposed. Paid search and the former `search` action are absent.
- Codex personal catalog installation and invocation: `passed`.
- Native ChatGPT app inheritance and invocation: `skipped`; no exact native-app invocation evidence has been supplied yet.
- Custom GPT selection and invocation: `skipped`; no exact GPT-preview invocation evidence has been supplied yet.
- Public multi-user directory submission: `unavailable` by approved design. The public review path requires reusable reviewer access that conflicts with exact-owner OTP/MFA protection, so it is not an accepted release route.

## Release boundary

Reach is owner-private, read-only, stateless retrieval. Native ChatGPT or Codex browsing performs discovery; Reach reads one public HTTPS URL, retrieves available public YouTube captions, or reports channel health. It accepts no cookies, account credentials, paid search keys, writes, or private-account authority.

The deployment, ChatGPT web connection, global skill, personal plugin, and Codex invocation are complete. Final cross-surface acceptance still requires one native ChatGPT-app invocation and one custom-GPT preview invocation on the owner's account.
