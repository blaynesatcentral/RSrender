import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";

import { checkImportBoundaries } from "../tooling/check-import-boundaries.mjs";

test("accepted package graph has no inward dependency violation", async () => {
  assert.deepEqual(await checkImportBoundaries(path.resolve("packages")), []);
});

test("deliberately invalid domain-to-Electron import is rejected", async () => {
  const violations = await checkImportBoundaries(
    path.resolve("tests", "fixtures", "invalid-import", "packages"),
  );
  assert.ok(
    violations.some(
      (entry) => entry.packageName === "domain" && entry.code === "PURE_PACKAGE_PRIVILEGE_IMPORT",
    ),
  );
});
