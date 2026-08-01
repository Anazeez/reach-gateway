# Reach Gateway Design

Date: 2026-08-01
Status: Approved and implemented; final native-app and custom-GPT checks pending
Owner: User
Working product name: Reach Gateway

## 1. Purpose

Reach Gateway gives the owner's Codex, ChatGPT, and custom GPTs a dependable,
shared way to retrieve public internet evidence when native tools are absent or
unreliable. It is a private, owner-authenticated, read-only remote MCP service.

The product does not replace OpenAI web search, the GitHub connector, or other
strong native integrations. It fills the verified gaps: deterministic URL
reading, X post retrieval, video transcripts, RSS/Atom parsing, public Reddit
retrieval, ordered fallback routing, and channel health diagnosis. Source
discovery remains native to ChatGPT or Codex.

Success means the same bounded tools can be invoked from every supported target
surface, return normalized provenance, fail visibly, and never gain authority
over private accounts or external writes.

## 2. Approved Boundary

Version 1 is:

- a new independent capability, integrated with the existing canonical
  workflow;
- remote and available across the owner's devices;
- owner-authenticated and unavailable to other users;
- stateless with respect to conversations, retrieved content, cookies, and
  source accounts;
- public-source only;
- read-only;
- exposed through MCP;
- packaged as a cross-surface plugin with a reusable skill;
- installed globally for Codex only after installed-copy validation and a
  fresh-session discovery test.

Version 1 explicitly excludes:

- browser-cookie ingestion or storage;
- private feeds, groups, messages, repositories, or paywalled accounts;
- posting, commenting, reacting, following, uploading, or other writes;
- general browser automation;
- persistent research memory or content indexing;
- background monitoring and scheduled research;
- general or source-directed search and paid search APIs;
- a public multi-user service;
- claims of universal website coverage.

Authenticated social access, browser-local assistance, write actions,
persistent indexing, and public distribution are separate future decisions.

## 3. Alternatives Considered

### 3.1 Install Agent Reach wholesale

Rejected. Agent Reach is useful scaffolding, but it modifies the host, installs
multiple upstream tools, registers skills, and supports cookie-backed routes.
That is broader than the approved authority and does not create a consistent
remote contract for ChatGPT and custom GPTs.

### 3.2 Pure local skill and CLI bundle

Rejected as the primary architecture. It could improve Codex on one machine,
but ChatGPT and custom GPTs cannot depend on the owner's local shell, filesystem,
or browser session.

### 3.3 Private remote MCP plus cross-surface plugin

Selected. It provides one cross-device contract, preserves strict read-only
authority, centralizes routing and security, and allows the backend selection to
change without editing every assistant.

## 4. System Architecture

```text
Codex / ChatGPT / custom GPT
             |
       Reach Gateway plugin
       - routing skill
       - registered private app mapping
             |
      owner authentication
      - delegated identity provider
      - owner allowlist
      - short-lived signed identity
             |
       stateless MCP gateway
       - input validation
       - policy enforcement
       - source classification
       - ordered backend routing
       - normalization
       - safety filtering
             |
     public read-only adapters
       web  X  video  Reddit  RSS
```

The authentication provider owns login state. The gateway verifies the
provider's signed assertion and an exact owner identity allowlist on every
request. The gateway does not issue durable user sessions, store credentials,
or receive browser cookies.

The gateway is stateless at the application layer. Platform access logs and
metrics may exist for security and operations, but they must not contain page
bodies, transcripts, authorization headers, query secrets, or conversation
content. Content caching is disabled in version 1.

## 5. Tool Contract

### 5.1 `read`

Reads one public URL after URL and destination validation. It classifies the
source and selects the first healthy compatible adapter. It returns cleaned
text, not executable page content.

### 5.2 `transcript`

Extracts public captions or a public transcript from a supported video URL.
It does not bypass authentication, digital-rights controls, or unavailable
captions. Automatic speech recognition is outside version 1 unless later
approved as a bounded fallback.

### 5.3 `health`

Runs bounded live probes for requested channels and returns the selected
backend, probe time, availability, degraded state, and a stable reason code.
It does not report a channel healthy merely because a binary or configuration
entry exists.

## 6. Normalized Result Envelope

Every tool returns a common envelope:

```json
{
  "status": "passed | failed | unavailable",
  "source": "web | x | youtube | reddit | rss",
  "operation": "read | transcript | health",
  "canonical_url": "https://example.com/item",
  "retrieved_at": "RFC 3339 timestamp",
  "backend": "adapter identifier and version",
  "content": "bounded normalized text or null",
  "items": [],
  "citations": [],
  "warnings": [],
  "reason_code": "stable machine-readable code or null"
}
```

`status` has exact semantics:

- `passed`: the requested operation completed and the returned evidence was
  validated structurally;
- `failed`: the operation ran but did not satisfy its acceptance condition;
- `unavailable`: no authorized healthy backend could attempt the operation.

The service never converts `failed` or `unavailable` into a successful answer.

## 7. Routing and Source Policy

The companion skill tells assistants to prefer an existing native integration
when it is stronger or more authoritative. Reach Gateway is selected when the
native path is absent, fails, or the user explicitly requests its normalized
contract or health evidence.

Within the gateway, every channel has an ordered adapter registry. Each adapter
declares supported operations, public-access requirements, probe behavior,
timeouts, output limits, and stable failure codes. A fallback is attempted only
when the prior result is retryable. Authorization, policy, invalid-input, and
unsupported-operation failures never trigger a more permissive backend.

Initial adapter candidates will be evaluated during implementation rather than
being accepted from marketing claims. The likely starting set is:

- web: safe direct HTTP extraction and a clean-text public reader fallback;
- X: official public embed or syndication paths followed by an explicitly
  reviewed public compatibility reader for individual URLs;
- video: a maintained public metadata and caption extractor;
- Reddit: public page, RSS, or JSON paths;
- RSS: a standards-compliant RSS/Atom parser.

Backend selection is configuration-driven and versioned. Changing an adapter
does not change the MCP contract.

## 8. Authentication and Authorization

Authentication is delegated to an identity boundary compatible with the
supported MCP clients. The implementation must verify current Codex, ChatGPT,
and custom-GPT app authentication behavior before selecting the provider.

Authorization rules are fixed for version 1:

- allow exactly the owner's authenticated identity;
- deny anonymous requests;
- deny every write-like operation;
- deny credential, cookie, token, or session-material inputs;
- deny access to private-network and local-machine destinations;
- apply per-tool and per-source resource limits;
- reject any identity assertion whose audience, issuer, expiry, or signature is
  invalid.

Authentication failure returns a bounded error without revealing whether a
different identity is allowlisted.

## 9. Security Controls

The gateway treats URLs, pages, metadata, transcripts, and upstream responses
as untrusted input.

Required controls include:

- HTTPS-only destinations except an explicitly tested internal health fixture;
- DNS and IP validation before connection and after every redirect;
- denial of loopback, link-local, multicast, private, metadata-service, and
  reserved address ranges;
- normalized hostname comparison and bounded redirect counts;
- response byte, decompression, time, item-count, and text-length limits;
- permitted content-type allowlists;
- no execution of retrieved scripts, markup, commands, or tool instructions;
- explicit labeling of retrieved text as untrusted evidence;
- output encoding and removal of active content;
- secret and authorization-header redaction from errors and logs;
- rate limits at the owner and tool levels;
- dependency pinning, license review, and supply-chain verification;
- stable audit events for authentication failure, policy denial, backend
  degradation, and adapter changes without logging retrieved content.

The service must include a tested disable path and a deployment rollback to the
last verified configuration.

## 10. Error Model

Stable reason-code families are:

- `AUTH_*`: missing, invalid, expired, or unauthorized owner identity;
- `INPUT_*`: invalid query, URL, source, range, or limit;
- `POLICY_*`: forbidden destination, content type, operation, or credential
  material;
- `SOURCE_*`: unsupported or inaccessible public source;
- `BACKEND_*`: timeout, rate limit, malformed response, degraded provider, or
  all fallbacks exhausted;
- `CONTENT_*`: oversized, empty, unsafe, or structurally invalid result;
- `INTERNAL_*`: bounded unexpected failure with no sensitive details.

Retry guidance is returned only for retryable failures. The gateway uses
bounded retries and never loops across identical failed adapter fingerprints.

## 11. Packaging and Surface Integration

The completed product consists of:

1. The stateless remote MCP service.
2. A focused routing skill explaining native-tool preference, tool selection,
   provenance requirements, and failure semantics.
3. A plugin manifest declaring the skill and existing registered app identity.
4. Icons, metadata, privacy information, authentication configuration, and
   declared dependencies required by the target directory.
5. Operational health, disable, rollback, and version-identification surfaces.

The plugin remains owner-private through the Personal or Created by me account
surface and the personal Codex marketplace. It is not a public multi-user
listing. The web interface is the ChatGPT authoring and connection surface, not
the boundary of plugin use. Eligible native surfaces signed into that account
may inherit the connection, but support is reported only after discovery,
invocation, and authentication are tested on that exact surface and account.

The Codex skill is not considered installed until the final package is
synchronized to:

```text
${CODEX_HOME:-~/.codex}/skills/reach-gateway
```

The installed copy, rather than a repository draft, is the validation and
fresh-session discovery target.

Custom GPT integration uses app mode when that surface supports the published
private plugin. It will not combine custom Actions with apps. An OpenAPI Action
facade is not part of version 1.

## 12. Verification Strategy

### 12.1 Contract tests

- valid and invalid schemas for every tool;
- exact result-envelope semantics;
- stable reason codes;
- deterministic adapter ordering;
- no fallback after authorization or policy denial.

### 12.2 Security tests

- SSRF cases for private, loopback, link-local, encoded, redirected, and DNS
  rebinding destinations;
- oversized, compressed, slow, malformed, and misleading content;
- prompt-injection text returned only as inert evidence;
- secret and header redaction;
- unauthorized and expired identity assertions;
- read-only enforcement against write-shaped requests.

### 12.3 Adapter tests

Each adapter gets a known-good fixture, a deliberately broken fixture, a live
bounded probe, and a fallback test. Live third-party failures are recorded as
degraded or unavailable rather than hidden by mocked success.

Representative acceptance cases include:

- an ordinary public article;
- the X post that motivated this project;
- a public YouTube video with captions;
- a public Reddit thread;
- an RSS or Atom feed;
- an unsupported or private URL;
- a redirect toward a forbidden network destination.

### 12.4 Packaging and discovery tests

- validate the complete plugin bundle and installed global skill;
- audit all relative links and bundled resources;
- test the private listing and authentication flow;
- start fresh supported Codex and ChatGPT sessions;
- prove explicit and implicit skill selection;
- invoke every MCP tool from each intended supported surface;
- test custom GPT app invocation separately;
- verify disable, uninstall, and rollback behavior.

Verification is reported only as `passed`, `failed`, `skipped`, or
`unavailable`, with evidence. A surface with skipped or unavailable verification
is not described as supported.

## 13. Acceptance Criteria

Version 1 is complete only when:

1. The private remote MCP enforces owner identity and read-only authority.
2. All three tools satisfy their contract and security tests.
3. At least web reading, individual X URL reading, caption extraction, public
   Reddit retrieval, and RSS parsing have one verified live path or an explicit
   documented `unavailable` boundary accepted before release.
4. Fallback and health behavior is deterministic and evidence-backed.
5. The plugin bundle is complete and validated.
6. The app is connected in the owner's personal ChatGPT account and the plugin
   is installed from the personal Codex marketplace using the same registered
   app identity.
7. The global Codex skill is installed and validated at the canonical path.
8. Fresh supported Codex, ChatGPT, and custom-GPT checks prove installation,
   discovery, authentication, and invocation.
9. The disable, uninstall, and deployment rollback paths pass.
10. No surface, source, or privilege is claimed without exact verification.

If directory publication, owner authentication, review policy, or an intended
surface is unavailable, the product remains unpublished or unsupported for
that surface. A local package or development connector does not satisfy
completion.

## 14. Delivery Sequence

Implementation will follow one bounded path:

1. Verify the exact private-plugin and MCP authentication contracts on the
   intended OpenAI surfaces.
2. Build the gateway contract, policy layer, and test fixtures.
3. Implement and live-test adapters one at a time.
4. Package the routing skill and cross-surface plugin.
5. Deploy behind owner authentication and run security checks.
6. Install privately and verify every supported surface from fresh sessions.
7. Install and validate the global Codex skill.
8. Record version, health, disable, uninstall, and rollback evidence.

The implementation must stop if the selected authentication path cannot be
verified, an adapter requires cookies or private credentials, or satisfying
acceptance would materially widen version 1. An unverified optional surface is
reported as unsupported until its exact check passes.
