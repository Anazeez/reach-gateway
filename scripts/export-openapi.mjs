import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "reach-openapi-"));
const bundlePath = join(temporaryDirectory, "actions.mjs");

try {
  await build({
    entryPoints: ["src/actions.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundlePath,
    logLevel: "silent",
  });
  const { OPENAPI_DOCUMENT } = await import(pathToFileURL(bundlePath));
  await writeFile(
    "actions/openapi.yaml",
    `${JSON.stringify(OPENAPI_DOCUMENT, null, 2)}\n`,
    "utf8",
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
