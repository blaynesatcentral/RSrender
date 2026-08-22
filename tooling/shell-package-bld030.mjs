import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { packageBoringLogPdfStudio } from "./shell-package-bld027.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temporaryRoot = path.join(root, ".tmp", "bld-030-reference-fidelity-r8");
const outputDirectory = path.join(temporaryRoot, "out");
const packagedDirectory = path.join(outputDirectory, "RSrender-win32-x64");
const packagedExecutable = path.join(packagedDirectory, "RSrender.exe");
const packagedRuntimeInput = path.join(
  packagedDirectory,
  "example-data",
  "rsrender-example-boring-log.json",
);

export async function packageReferenceQualifiedBoringLogMvp() {
  const source = await packageBoringLogPdfStudio();
  await rm(temporaryRoot, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(source.paths.packagedDirectory, packagedDirectory, { recursive: true });
  return Object.freeze({
    ...source,
    schema: "rsrender.bld030.package-result.v1",
    result: "PASS",
    paths: Object.freeze({
      temporaryRoot,
      outputDirectory,
      packagedDirectory,
      packagedExecutable,
      packagedRuntimeInput,
    }),
    executableBytes: (await stat(packagedExecutable)).size,
    productOwnerLaunchTarget: packagedExecutable,
    qualificationMode: "frozen-reference-oracle-and-same-scene-pdf",
  });
}

export const BLD030_PATHS = Object.freeze({
  temporaryRoot,
  outputDirectory,
  packagedDirectory,
  packagedExecutable,
  packagedRuntimeInput,
});

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) console.log(JSON.stringify(await packageReferenceQualifiedBoringLogMvp()));
