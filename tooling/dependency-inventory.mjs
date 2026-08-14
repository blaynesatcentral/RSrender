import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const lockBytes = await readFile("package-lock.json");
const lock = JSON.parse(lockBytes);
const packageEntries = Object.entries(lock.packages).filter(([packagePath]) => packagePath !== "");
const externalPackages = packageEntries
  .filter(([packagePath, value]) => packagePath.startsWith("node_modules/") && !value.link)
  .map(([packagePath, value]) => ({
    path: packagePath.replaceAll("\\", "/"),
    version: value.version,
    resolved: value.resolved ?? null,
    integrity: value.integrity ?? null,
    dev: Boolean(value.dev),
    optional: Boolean(value.optional),
    hasInstallScript: Boolean(value.hasInstallScript),
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

const workspacePackages = packageEntries
  .filter(([packagePath, value]) => value.link || packagePath.startsWith("packages/"))
  .map(([packagePath, value]) => ({
    path: packagePath.replaceAll("\\", "/"),
    version: value.version ?? null,
    link: Boolean(value.link),
    resolved: value.resolved ?? null,
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

if (externalPackages.some((entry) => !entry.integrity || !entry.resolved)) {
  throw new Error("DEPENDENCY_INVENTORY_INCOMPLETE");
}

const inventory = {
  schema: "rsrender.dependency-inventory.v0",
  admission: "ADMITTED_INTERNAL_BLD001",
  authority: "Central Engineering Services/admin; GitHub #45; 2026-08-14",
  lockfileVersion: lock.lockfileVersion,
  lockSha256: createHash("sha256").update(lockBytes).digest("hex"),
  externalPackages,
  workspacePackages,
};
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/dependency-inventory.json", `${JSON.stringify(inventory, null, 2)}\n`);
console.log(
  JSON.stringify({
    result: "PASS",
    externalPackageCount: externalPackages.length,
    workspacePackageEntryCount: workspacePackages.length,
    lockSha256: inventory.lockSha256,
  }),
);
