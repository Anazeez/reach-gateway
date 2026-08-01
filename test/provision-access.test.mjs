import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("plans an owner-private Managed OAuth application without exposing the owner email", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reach-access-test-"));
  const fixture = join(directory, "fixture.json");
  const output = join(directory, "plan.json");
  await writeFile(
    fixture,
    JSON.stringify({
      sourceApp: {
        type: "self_hosted",
        allowed_idps: ["idp-1"],
        auto_redirect_to_identity: true,
        oauth_configuration: {
          enabled: true,
          dynamic_client_registration: {
            enabled: true,
            allowed_uris: ["https://chatgpt.com/connector/oauth/*"],
          },
        },
      },
      sourcePolicies: [
        {
          name: "Essentials owner access",
          decision: "allow",
          include: [{ email: { email: "owner@example.com" } }],
          require: [],
          exclude: [],
          precedence: 1,
        },
      ],
    }),
  );

  const result = spawnSync(
    process.execPath,
    ["scripts/provision-access.mjs", "plan", fixture, output],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(await readFile(output, "utf8"));
  assert.equal(plan.app.name, "Reach Gateway");
  assert.equal(plan.app.domain, "reach-gateway.izeesub.workers.dev");
  assert.deepEqual(plan.app.oauth_configuration, {
    enabled: true,
    dynamic_client_registration: {
      enabled: true,
      allowed_uris: [
        "https://chatgpt.com/connector/oauth/*",
        "https://chat.openai.com/aip/*",
        "https://chatgpt.com/aip/*",
      ],
    },
  });
  assert.equal(plan.policy.name, "Reach owner access");
  assert.deepEqual(plan.schemaApp, {
    name: "Reach Gateway OpenAPI",
    domain: "reach-gateway.izeesub.workers.dev/openapi.json",
    destinations: [
      { type: "public", uri: "reach-gateway.izeesub.workers.dev/openapi.json" },
    ],
    type: "self_hosted",
    session_duration: "24h",
    app_launcher_visible: false,
  });
  assert.equal(plan.ownerEmail, "owner@example.com");
  assert.equal(result.stdout.includes("owner@example.com"), false);
  assert.equal(result.stderr.includes("owner@example.com"), false);
});
