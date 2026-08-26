import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const temporaryRoot = path.join(root, ".tmp", "bld-050-hidden-qualification-r12");
const sourceLabel = `bld-050-hidden-qualification-source-${process.pid}`;
const outputDirectory = path.join(temporaryRoot, "out");
const packagedDirectory = path.join(outputDirectory, "RSrender-win32-x64");
const packagedExecutable = path.join(packagedDirectory, "RSrender.exe");

/**
 * Package the current built product for the BLD-050 hidden qualification.
 *
 * This is intentionally a thin wrapper around the admitted BLD-026 packager.
 * It does not build, patch, or replace any product package.  The qualification
 * runner is responsible for refusing to launch until the product has an
 * explicit BLD-050 hidden probe hook.
 */
export async function packageHiddenSymbologyQualification() {
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = sourceLabel;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld050=${Date.now()}`
  );
  const source = await packageBoringLogEditor();
  await rm(temporaryRoot, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(source.paths.packagedDirectory, packagedDirectory, { recursive: true });
  await rm(source.paths.temporaryRoot, { recursive: true, force: true });
  return Object.freeze({
    ...source,
    schema: "rsrender.bld050.package-result.v1",
    result: "PASS",
    qualification: Object.freeze({
      mode: "hidden-offscreen-dom-events-only",
      productBuildUntouched: true,
    }),
    paths: Object.freeze({
      temporaryRoot,
      outputDirectory,
      packagedDirectory,
      packagedExecutable,
    }),
    executableBytes: (await stat(packagedExecutable)).size,
  });
}

// Feature-oriented name follows the BLD-049 packaging runner convention.
export const packageDataLayerSymbologyStudio = packageHiddenSymbologyQualification;

export const BLD050_PATHS = Object.freeze({
  temporaryRoot,
  outputDirectory,
  packagedDirectory,
  packagedExecutable,
});

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  console.log(JSON.stringify(await packageHiddenSymbologyQualification()));
}
