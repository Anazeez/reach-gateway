# Reach Gateway Surface Contract Evidence

Date: 2026-08-01
Gate status: `failed`
Blocking condition: `OWNER_PRIVATE_CROSS_SURFACE_ACCOUNT_VERIFICATION_UNAVAILABLE`

This record separates current platform documentation from checks performed on
the owner's actual account. Documentation can establish that a feature exists;
it cannot prove that the feature is enabled for this account, workspace, role,
or device.

## Exact checks

| # | Required check | Status | Account class | Evidence |
|---|---|---|---|---|
| 1 | Apps Management write access and verified publisher identity | `unavailable` | unknown | This runtime has no authenticated Apps Management or publisher-identity inspection surface. No claim was inferred from general documentation. |
| 2 | Owner-private development MCP appears on another signed-in device | `unavailable` | unknown | No live MCP endpoint exists yet and this runtime cannot operate a second authenticated ChatGPT device session. OpenAI documents custom-app creation and private workspace testing, but that is not an account/device result. |
| 3 | Same private app selectable and invocable in a custom GPT preview | `unavailable` | unknown | OpenAI documents Apps as a custom-GPT capability, but the owner's editor and preview were not available for a live selection and invocation test. |
| 4 | Owner-private publication without arbitrary-user installability | `unavailable` | unknown | OpenAI documents private custom apps and Enterprise/Edu user/group/role access. It does not prove which private publication controls this account has. A public directory submission is not accepted as a substitute. |
| 5 | Selected OAuth provider satisfies the MCP authentication profile | `unavailable` | n/a | No identity provider, issuer, owner subject, or tenant has been selected and authenticated in this workspace. |

Checks 2, 3, and 4 are mandatory pass conditions. Product implementation must
therefore stop after the prerequisite gate.

## Current official platform findings

- The Apps SDK and custom MCP path exists for Pro, Business, Enterprise, and
  Edu with plan-specific limits. Pro supports read/fetch custom MCP apps in
  developer mode; full MCP is limited to managed workspace plans.
- Business and Enterprise/Edu admins or owners can create, test, and publish
  custom MCP apps for their workspace. Enterprise/Edu can restrict access by
  user, group, or role.
- Plugins now span ChatGPT and Codex through the Plugin Directory, but actual
  installation and invocation depend on plan, workspace, role, region, and
  included app availability.
- A custom GPT can use Apps available to its user. A custom GPT can use Apps or
  Actions, not both simultaneously.
- Custom MCP apps are documented as web-only. Mobile is not currently a
  supported cross-device target for this release.

Sources:

- [Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)
- [Plugins in ChatGPT and Codex](https://help.openai.com/en/articles/20001256-plugins-in-codex)
- [Creating and editing GPTs](https://help.openai.com/en/articles/8554397-create-a-gpt)

## Machine gate

The dependency-free test suite proves that the gate fails closed, reports all
missing inputs deterministically, and passes only when both required surface
probes are explicitly verified. A synthetic all-green run validates script
behavior only; it is not platform evidence.

The real environment report on 2026-08-01 is:

```json
{"status":"failed","blockers":["MISSING_REACH_OWNER_SUB","MISSING_REACH_OAUTH_ISSUER","PRIVATE_LISTING_UNVERIFIED","CUSTOM_GPT_APP_UNVERIFIED"]}
```

## Smallest unblock action

From the owner's signed-in ChatGPT web account, establish the plan/workspace
class and complete checks 1 through 4 with the intended second web or desktop
device. Select the OAuth provider and provide its issuer plus the owner's stable
subject identifier for check 5. These checks must be recorded as `passed`
before Task 2 begins.
