import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const listing = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
const files = listing.split("\0").filter(Boolean);
const configuredSecrets = [
  "REACH_TEST_TOKEN",
  "BRAVE_SEARCH_API_KEY",
  "OPENAI_APPS_CHALLENGE",
].map((name) => process.env[name]).filter((value) => value && value.length >= 8);
const privateKeyMarker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
const patterns = [
  /Bearer\s+[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/u,
  /(?:api[_-]?key|token|cookie)\s*[:=]\s*[A-Za-z0-9_+\/-]{24,}/iu,
];

const failures = [];
for (const file of files) {
  let content;
  try {
    content = await readFile(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes(privateKeyMarker)) failures.push(`${file}:private_key`);
  for (const pattern of patterns) {
    if (pattern.test(content)) failures.push(`${file}:credential_pattern`);
  }
  for (const secret of configuredSecrets) {
    if (content.includes(secret)) failures.push(`${file}:configured_secret`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`passed:${files.length}_files\n`);
}
