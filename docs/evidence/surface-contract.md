# Reach Gateway Surface Contract Evidence

Date: 2026-08-01
Gate status: `passed` for private ChatGPT web and Codex use
Remaining blocker: exact native ChatGPT-app and custom-GPT preview invocation

This record separates documented platform capability from behavior observed on the owner's actual account and device. Documentation does not substitute for exact install, authentication, discovery, and invocation evidence.

## Exact checks

| # | Required check | Status | Account or surface | Evidence |
|---|---|---|---|---|
| 1 | Personal custom-plugin creation permission | `passed` | ChatGPT Pro, personal web | Owner screenshots show Developer mode and the New Plugin form with Server URL, OAuth, advanced OAuth discovery, icon upload, and unverified-MCP consent. |
| 2 | Owner-private plugin creation and OAuth connection | `passed` | ChatGPT Pro, personal web | Reach the G is connected to `https://reach-gateway.izeesub.workers.dev/mcp` using OAuth. |
| 3 | Authenticated ChatGPT invocation | `passed` | ChatGPT Pro, personal web | `read` returned a normalized `passed` result for `https://example.com/`; `health` passed all five channels. |
| 4 | Exact zero-paid action inventory | `passed` | ChatGPT Pro, personal web | The connected app exposes only `health`, `read`, and `transcript`; `search` is absent. |
| 5 | Personal Codex packaging, discovery, and invocation | `passed` | Codex personal catalog | `reach-gateway@personal` version `0.1.0` is installed and enabled. A fresh ephemeral Codex process selected the global skill and invoked `codex_apps/reach_the_g.health` successfully. |
| 6 | Personal Codex uninstall and reinstall | `passed` | Codex personal catalog | Removal cleared installed state; reinstall restored enabled version `0.1.0`, and the immutable installed cache revalidated. |
| 7 | Production rollback and exact-version restore | `passed` | Cloudflare Workers through GitHub Actions | Run `30717335886` moved all traffic to the verified prior version, probed health and fail-closed MCP access, restored the exact current version, and was followed by an authenticated five-channel Codex health pass. |
| 8 | Native ChatGPT app inheritance and invocation | `skipped` | Signed-in native ChatGPT app | Account inheritance is expected, but no exact native-app invocation has yet been observed. |
| 9 | Same private app selectable and invocable in a custom GPT preview | `skipped` | ChatGPT Pro GPT builder | No exact GPT-preview invocation has yet been observed. |
| 10 | Public multi-user directory listing | `unavailable` | Universal public directory | Public review requires reusable reviewer access incompatible with exact-owner OTP/MFA. The approved release remains private. |

## Approved distribution boundary

The durable identity is the registered private app `asdk_app_6a6e0220efcc819199465b25290785bf`. ChatGPT web and Codex both use that same identity; no duplicate connector or second MCP authority is created.

The complete Codex package is installed from the personal marketplace and includes the app mapping, canonical skill, metadata, and assets. The canonical independently installed skill is `/home/ubuntu/.codex/skills/reach-gateway`.

Public submission is not a substitute for private completion. It would materially widen who can authenticate and would violate the owner-only security requirement.

## Remaining external checks

1. In the signed-in native ChatGPT app, invoke Reach the G with: `Check every Reach evidence channel.`
2. In a custom GPT preview with Reach the G selected, invoke: `Read https://example.com through Reach and report status, backend, and canonical URL.`

Record each result as `passed`, `failed`, or `unavailable`. These two checks are the only remaining cross-surface acceptance evidence.
