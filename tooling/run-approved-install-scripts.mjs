import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const esbuild = lock.packages?.["node_modules/esbuild"];
if (esbuild?.version !== "0.28.1") {
  throw new Error(`ESBUILD_VERSION_NOT_ADMITTED:${esbuild?.version ?? "missing"}`);
}

const installScript = path.resolve("node_modules", "esbuild", "install.js");
const result = spawnSync(process.execPath, [installScript], {
  encoding: "utf8",
  env: { ...process.env, npm_config_ignore_scripts: "true" },
  shell: false,
  windowsHide: true,
});
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  throw new Error(`ESBUILD_APPROVED_INSTALL_FAILED:${result.status}`);
}
process.stdout.write(result.stdout);
console.log(JSON.stringify({ result: "PASS", package: "esbuild", version: esbuild.version }));
