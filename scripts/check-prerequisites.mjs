import { pathToFileURL } from "node:url";

const REQUIRED_ENV = ["REACH_OWNER_SUB", "REACH_OAUTH_ISSUER"];

export async function checkPrerequisites(env, probes) {
  const blockers = [];

  for (const key of REQUIRED_ENV) {
    if (typeof env[key] !== "string" || env[key].trim() === "") {
      blockers.push(`MISSING_${key}`);
    }
  }

  if (!(await probes.privateListing())) {
    blockers.push("PRIVATE_LISTING_UNVERIFIED");
  }

  if (!(await probes.customGptApps())) {
    blockers.push("CUSTOM_GPT_APP_UNVERIFIED");
  }

  return {
    status: blockers.length === 0 ? "passed" : "failed",
    blockers,
  };
}

const isDirectInvocation =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectInvocation) {
  const report = await checkPrerequisites(process.env, {
    privateListing: async () =>
      process.env.REACH_PRIVATE_LISTING_VERIFIED === "1",
    customGptApps: async () =>
      process.env.REACH_CUSTOM_GPT_APPS_VERIFIED === "1",
  });

  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.status !== "passed") process.exitCode = 1;
}
