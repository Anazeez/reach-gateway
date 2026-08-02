#!/usr/bin/env node

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://api.cloudflare.com/client/v4";
const SOURCE_APP_NAME = "The Essentials MCP";
const APP_NAME = "Reach Gateway";
const HEALTH_APP_NAME = "Reach Gateway Health";
const SCHEMA_APP_NAME = "Reach Gateway OpenAPI";
const OAUTH_AUTHORIZE_APP_NAME = "Reach Gateway OAuth Authorize";
const OAUTH_TOKEN_APP_NAME = "Reach Gateway OAuth Token";
const DOMAIN = "reach-gateway.izeesub.workers.dev";
const CUSTOM_GPT_REDIRECT_PATTERNS = [
  "https://chat.openai.com/aip/*",
  "https://chatgpt.com/aip/*",
];

function ownerEmail(policies) {
  for (const policy of policies) {
    for (const rule of policy.include ?? []) {
      const email = rule?.email?.email;
      if (typeof email === "string" && email.includes("@")) return email;
    }
  }
  throw new Error("The source owner policy has no exact-email include rule");
}

function applicationBody(sourceApp) {
  return {
    name: APP_NAME,
    domain: DOMAIN,
    destinations: [{ type: "public", uri: DOMAIN }],
    type: "self_hosted",
    session_duration: sourceApp.session_duration ?? "24h",
    app_launcher_visible: false,
    allowed_idps: sourceApp.allowed_idps ?? [],
    auto_redirect_to_identity: sourceApp.auto_redirect_to_identity ?? false,
    service_auth_401_redirect: true,
    oauth_configuration: {
      ...sourceApp.oauth_configuration,
      dynamic_client_registration: {
        ...sourceApp.oauth_configuration.dynamic_client_registration,
        allowed_uris: [
          ...new Set([
            ...(sourceApp.oauth_configuration.dynamic_client_registration?.allowed_uris ?? []),
            ...CUSTOM_GPT_REDIRECT_PATTERNS,
          ]),
        ],
      },
    },
  };
}

function policyBody(sourcePolicies) {
  const source = sourcePolicies.find((policy) => policy.decision === "allow");
  if (!source) throw new Error("The source application has no allow policy");
  return {
    name: "Reach owner access",
    decision: "allow",
    include: source.include ?? [],
    require: source.require ?? [],
    exclude: source.exclude ?? [],
    precedence: 1,
  };
}

function plan(sourceApp, sourcePolicies) {
  if (!sourceApp?.oauth_configuration?.enabled) {
    throw new Error("The source application does not have Managed OAuth enabled");
  }
  return {
    app: applicationBody(sourceApp),
    policy: policyBody(sourcePolicies),
    schemaApp: bypassApplicationBody(SCHEMA_APP_NAME, "/openapi.json"),
    oauthAuthorizeApp: bypassApplicationBody(OAUTH_AUTHORIZE_APP_NAME, "/oauth/authorize"),
    oauthTokenApp: bypassApplicationBody(OAUTH_TOKEN_APP_NAME, "/oauth/token"),
    ownerEmail: ownerEmail(sourcePolicies),
  };
}

function bypassApplicationBody(name, pathname) {
  return {
    name,
    domain: `${DOMAIN}${pathname}`,
    destinations: [{ type: "public", uri: `${DOMAIN}${pathname}` }],
    type: "self_hosted",
    session_duration: "24h",
    app_launcher_visible: false,
  };
}

async function cloudflare(path, init = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is required");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json();
  if (!response.ok || body.success !== true) {
    const messages = (body.errors ?? []).map((error) => error.message).join("; ");
    throw new Error(`Cloudflare API ${response.status}: ${messages || "request failed"}`);
  }
  return body.result;
}

async function upsertApplication(accountId, existing, body) {
  const path = existing
    ? `/accounts/${accountId}/access/apps/${existing.id}`
    : `/accounts/${accountId}/access/apps`;
  return cloudflare(path, {
    method: existing ? "PUT" : "POST",
    body: JSON.stringify(body),
  });
}

async function upsertPolicy(accountId, appId, existing, body) {
  const path = existing
    ? `/accounts/${accountId}/access/apps/${appId}/policies/${existing.id}`
    : `/accounts/${accountId}/access/apps/${appId}/policies`;
  return cloudflare(path, {
    method: existing ? "PUT" : "POST",
    body: JSON.stringify(body),
  });
}

async function provisionPublicBypass(accountId, apps, body, policyName) {
  const existing = apps.find((candidate) => candidate.name === body.name);
  const app = await upsertApplication(accountId, existing, body);
  const policies = existing
    ? await cloudflare(`/accounts/${accountId}/access/apps/${app.id}/policies?per_page=100`)
    : [];
  await upsertPolicy(
    accountId,
    app.id,
    policies.find((policy) => policy.name === policyName),
    {
      name: policyName,
      decision: "bypass",
      include: [{ everyone: {} }],
      require: [],
      exclude: [],
      precedence: 1,
    },
  );
  return app;
}

async function provision(outputDirectory) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID is required");

  const apps = await cloudflare(`/accounts/${accountId}/access/apps?per_page=100`);
  const sourceApp = apps.find((app) => app.name === SOURCE_APP_NAME);
  if (!sourceApp) throw new Error(`Source Access application not found: ${SOURCE_APP_NAME}`);
  const sourcePolicies = await cloudflare(
    `/accounts/${accountId}/access/apps/${sourceApp.id}/policies?per_page=100`,
  );
  const desired = plan(sourceApp, sourcePolicies);

  const existingApp = apps.find((app) => app.name === APP_NAME);
  const app = await upsertApplication(accountId, existingApp, desired.app);
  const appPolicies = existingApp
    ? await cloudflare(`/accounts/${accountId}/access/apps/${app.id}/policies?per_page=100`)
    : [];
  await upsertPolicy(
    accountId,
    app.id,
    appPolicies.find((policy) => policy.name === desired.policy.name),
    desired.policy,
  );

  const oauthAuthorizeApp = await provisionPublicBypass(
    accountId,
    apps,
    desired.oauthAuthorizeApp,
    "Public OAuth authorization endpoint",
  );
  const oauthTokenApp = await provisionPublicBypass(
    accountId,
    apps,
    desired.oauthTokenApp,
    "Public OAuth token endpoint",
  );

  const existingSchema = apps.find((candidate) => candidate.name === SCHEMA_APP_NAME);
  const schemaApp = await upsertApplication(accountId, existingSchema, desired.schemaApp);
  const schemaPolicies = existingSchema
    ? await cloudflare(`/accounts/${accountId}/access/apps/${schemaApp.id}/policies?per_page=100`)
    : [];
  await upsertPolicy(
    accountId,
    schemaApp.id,
    schemaPolicies.find((policy) => policy.name === "Public OpenAPI schema"),
    {
      name: "Public OpenAPI schema",
      decision: "bypass",
      include: [{ everyone: {} }],
      require: [],
      exclude: [],
      precedence: 1,
    },
  );

  const healthBody = {
    name: HEALTH_APP_NAME,
    domain: `${DOMAIN}/healthz`,
    destinations: [{ type: "public", uri: `${DOMAIN}/healthz` }],
    type: "self_hosted",
    session_duration: "24h",
    app_launcher_visible: false,
  };
  const existingHealth = apps.find((candidate) => candidate.name === HEALTH_APP_NAME);
  const healthApp = await upsertApplication(accountId, existingHealth, healthBody);
  const healthPolicies = existingHealth
    ? await cloudflare(`/accounts/${accountId}/access/apps/${healthApp.id}/policies?per_page=100`)
    : [];
  await upsertPolicy(
    accountId,
    healthApp.id,
    healthPolicies.find((policy) => policy.name === "Public health probe"),
    {
      name: "Public health probe",
      decision: "bypass",
      include: [{ everyone: {} }],
      require: [],
      exclude: [],
      precedence: 1,
    },
  );

  const metadataResponse = await fetch(
    "https://the-essentials-mcp.izeesub.workers.dev/.well-known/oauth-authorization-server",
  );
  if (!metadataResponse.ok) throw new Error("Could not resolve the Access OAuth issuer");
  const metadata = await metadataResponse.json();
  if (typeof metadata.issuer !== "string") throw new Error("Access OAuth issuer is missing");

  await mkdir(outputDirectory, { recursive: true });
  const ownerPath = join(outputDirectory, "owner-email");
  const deploymentPath = join(outputDirectory, "deployment.json");
  await writeFile(ownerPath, desired.ownerEmail, { mode: 0o600 });
  await writeFile(
    deploymentPath,
    JSON.stringify({
      issuer: metadata.issuer,
      audience: app.aud,
      appId: app.id,
      healthAppId: healthApp.id,
      schemaAppId: schemaApp.id,
      oauthAuthorizeAppId: oauthAuthorizeApp.id,
      oauthTokenAppId: oauthTokenApp.id,
    }),
    { mode: 0o600 },
  );
  await chmod(ownerPath, 0o600);
  await chmod(deploymentPath, 0o600);
  process.stdout.write("Reach Access applications and owner policy are configured.\n");
}

async function main() {
  const [command, first, second] = process.argv.slice(2);
  if (command === "plan" && first && second) {
    const fixture = JSON.parse(await readFile(first, "utf8"));
    await writeFile(second, JSON.stringify(plan(fixture.sourceApp, fixture.sourcePolicies)));
    return;
  }
  if (command === "provision" && first) {
    await provision(first);
    return;
  }
  throw new Error("usage: provision-access.mjs plan <fixture> <output> | provision <output-dir>");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Access provisioning failed"}\n`);
  process.exitCode = 1;
});
