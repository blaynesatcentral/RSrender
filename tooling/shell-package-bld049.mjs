import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { packageBoringLogEditor } from "./shell-package-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temporaryRoot = path.join(root, ".tmp", "bld-049-page-setup-r10");
const outputDirectory = path.join(temporaryRoot, "out");
const packagedDirectory = path.join(outputDirectory, "RSrender-win32-x64");
const packagedExecutable = path.join(packagedDirectory, "RSrender.exe");

export async function packagePageSetupStudio() {
  const source = await packageBoringLogEditor();
  await rm(temporaryRoot, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(source.paths.packagedDirectory, packagedDirectory, { recursive: true });
  return Object.freeze({
    ...source,
    schema: "rsrender.bld049.package-result.v1",
    result: "PASS",
    paths: Object.freeze({
      temporaryRoot,
      outputDirectory,
      packagedDirectory,
      packagedExecutable,
    }),
    executableBytes: (await stat(packagedExecutable)).size,
    publicationMode: "same-scene-page-setup-layout-host-print-to-pdf",
  });
}

export const BLD049_PATHS = Object.freeze({
  temporaryRoot,
  outputDirectory,
  packagedDirectory,
  packagedExecutable,
});

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) console.log(JSON.stringify(await packagePageSetupStudio()));
