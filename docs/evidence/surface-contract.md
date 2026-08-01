# Reach Gateway Surface Contract Evidence

Date: 2026-08-01
Gate status: `passed` for deployment; post-connection acceptance remains pending
Blocking condition: owner web connection and Cloudflare Access sign-in

This record separates current platform documentation from checks performed on
the owner's actual account. Documentation can establish that a feature exists;
it cannot prove that the feature is enabled for this account, workspace, role,
or device.

## Exact checks

| # | Required check | Status | Account class | Evidence |
|---|---|---|---|---|
| 1 | Personal custom-plugin creation permission and publisher precedent | `passed` | ChatGPT Pro, personal | Owner screenshot at 2026-08-01 12:10 shows the New Plugin form with name, description, Server URL or Tunnel connection, OAuth selection, advanced OAuth discovery, icon upload, and explicit unverified-MCP consent. Developer mode was shown enabled at 12:09. The already installed Mnemosyne Shared Memory listing records `publisher_identity: individual-verified`, providing an account-level publication precedent without treating Reach as published. |
| 2 | Web-installed owner-private plugin is inherited by supported native apps on another signed-in device | `skipped` | ChatGPT Plus or Pro, personal | A live owner-gated MCP endpoint now exists. The owner must connect it through the web form before this account-level Plugin Directory inheritance check can run. |
| 3 | Same private app selectable and invocable in a custom GPT preview | `skipped` | ChatGPT Pro, personal | A live endpoint with OAuth discovery now exists. The private plugin must first be connected before this acceptance check can run. |
| 4 | Personal private creation without arbitrary-user installability | `passed` | ChatGPT Pro, personal | The owner reached New Plugin from the personal Plugins developer-mode surface, not a public directory submission flow. Public publication is not accepted as a substitute. Cross-device persistence and final visibility remain post-deployment checks. |
| 5 | OAuth client surface accepts the selected provider profile | `pending` | ChatGPT Pro, personal | Infrastructure verification `passed`: the deployed Cloudflare Access Managed OAuth profile exposes dynamic registration and PKCE S256, and unauthenticated MCP access fails closed with protected-resource metadata. ChatGPT client acceptance remains pending until the owner submits the production URL and completes sign-in. |

The observed creation surface is sufficient to start local implementation.
Checks 2, 3, and the client-acceptance portion of check 5 require the owner's
one-time web connection. They remain release acceptance gates, not deployment
gates.

## Current official platform findings

- The Plugin Directory is visible across ChatGPT plans. Plus and Pro personal
  accounts can use the web plugin flow subject to the capability, region, and
  surface restrictions documented for the underlying app or MCP connection.
- Business and Enterprise/Edu admins or owners can create, test, and publish
  custom MCP apps for their workspace. Enterprise/Edu can restrict access by
  user, group, or role.
- Plugins now span ChatGPT and Codex through the Plugin Directory, but actual
  installation and invocation depend on plan, workspace, role, region, and
  included app availability.
- Web is the creation and connection surface. Once installed and connected,
  the plugin belongs to the signed-in account's directory state and supported
  native ChatGPT and Codex surfaces may inherit it; a separate plugin build is
  not required for each device.
- A custom GPT can use Apps available to its user. A custom GPT can use Apps or
  Actions, not both simultaneously.
- Native and mobile apps are not excluded from this release in advance. Exact
  inherited availability remains a live post-install verification because
  plan, region, app capability, and surface support can differ.
- Reach now uses its own Cloudflare Access application, Managed OAuth profile,
  audience, exact-owner policy, deployment, and encrypted owner secret. It does
  not reuse Mnemosyne scopes, credentials, or authority.

Sources:

- [Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)
- [Plugins in ChatGPT and Codex](https://help.openai.com/en/articles/20001256-plugins-in-codex)
- [Apps in ChatGPT](https://help.openai.com/en/articles/11487775-apps-in-chatgpt)
- [Creating and editing GPTs](https://help.openai.com/en/articles/8554397-create-a-gpt)

## Machine gate

The dependency-free test suite proves that the gate fails closed, reports all
missing inputs deterministically, and passes only when both required surface
probes are explicitly verified. A synthetic all-green run validates script
behavior only; it is not platform evidence.

The original environment report before the owner supplied UI evidence was:

```json
{"status":"failed","blockers":["MISSING_REACH_OWNER_SUB","MISSING_REACH_OAUTH_ISSUER","PRIVATE_LISTING_UNVERIFIED","CUSTOM_GPT_APP_UNVERIFIED"]}
```

## Remaining external actions

Create and connect the plugin through the observed web form using
`https://reach-gateway.izeesub.workers.dev/mcp` with OAuth, then verify an
authenticated initialization and tool call. Afterward verify that the same
directory installation is inherited and invocable on each intended native
ChatGPT and Codex surface, and run the custom-GPT preview check before
publication is called complete.
