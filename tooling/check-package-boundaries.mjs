import { readFile } from "node:fs/promises";
import path from "node:path";

import { packageNames } from "./workspace-model.mjs";

const failures = [];
for (const packageName of packageNames) {
  const manifestPath = path.join("packages", packageName, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedName = `@rsrender/${packageName}`;
  if (manifest.name !== expectedName) failures.push(`${manifestPath}: name != ${expectedName}`);
  if (manifest.version !== "0.0.0") failures.push(`${manifestPath}: version must be 0.0.0`);
  if (manifest.private !== true) failures.push(`${manifestPath}: package must be private`);
  if (manifest.type !== "module") failures.push(`${manifestPath}: package must be ESM`);
  if (manifest.main !== "./dist/index.js") failures.push(`${manifestPath}: unexpected main`);
  if (manifest.types !== "./dist/index.d.ts") failures.push(`${manifestPath}: unexpected types`);
  if (JSON.stringify(manifest.files) !== JSON.stringify(["dist"])) {
    failures.push(`${manifestPath}: only dist may be packaged`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ result: "FAIL", failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ result: "PASS", packageCount: packageNames.length }));
}
