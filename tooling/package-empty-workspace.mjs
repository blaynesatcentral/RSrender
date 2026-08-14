import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { packageNames } from "./workspace-model.mjs";

const outputs = [];
for (const packageName of packageNames) {
  for (const relative of ["index.js", "index.d.ts", "index.js.map", "index.d.ts.map"]) {
    const file = path.join("packages", packageName, "dist", relative);
    const bytes = await readFile(file);
    const info = await stat(file);
    outputs.push({
      package: packageName,
      file: file.replaceAll("\\", "/"),
      bytes: info.size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
outputs.sort((left, right) => left.file.localeCompare(right.file));
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/empty-workspace-package-inventory.json",
  `${JSON.stringify({ schema: "rsrender.empty-workspace-package.v0", outputs }, null, 2)}\n`,
);
console.log(JSON.stringify({ result: "PASS", outputCount: outputs.length }));
