# Connect Reach the G to a Custom GPT

1. In the GPT editor, paste `instructions.md` into the GPT instructions.
2. Under Actions, import `https://reach-gateway.izeesub.workers.dev/openapi.json` or paste `openapi.yaml`.
3. Select OAuth authentication. The GPT editor will show its exact callback URL; copy that URL before entering credentials.
4. Register that exact callback URL as a private Reach OAuth client. Do not guess or generalize the callback URL.
5. Enter the resulting client ID and client secret in the GPT editor, then use:
   - Authorization URL: `https://noisy-pond-95ae.cloudflareaccess.com/cdn-cgi/access/oauth/authorization`
   - Token URL: `https://noisy-pond-95ae.cloudflareaccess.com/cdn-cgi/access/oauth/token`
   - Scope: `reach:read`
   - Token exchange method: Basic authorization header
6. Keep the GPT private. Do not expose OAuth client credentials in its instructions or schema.
7. Sign in with the owner-approved identity and run these checks:
   - `Check all Reach evidence channels and report status and backend.`
   - `Read https://example.com through Reach and report status, backend, and canonical URL.`

Expected action names are `checkEvidenceChannels`, `readPublicUrl`, and `getPublicTranscript`. The Action is not complete until the owner sign-in and both checks pass inside the Custom GPT.
