import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { OPENAPI_DOCUMENT } from "../src/actions";
import { versionResponse } from "../src/legal";

describe("release version", () => {
  it("keeps the package, HTTP surface, and Action schema at 0.2.0", async () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

    expect(packageJson.version).toBe("0.2.0");
    expect(await versionResponse().json()).toEqual({
      name: "reach-gateway",
      version: "0.2.0",
    });
    expect(OPENAPI_DOCUMENT.info.version).toBe("0.2.0");
  });
});
