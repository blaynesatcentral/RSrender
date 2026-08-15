import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { packager } from "@electron/packager";

export const PACKAGING_PROFILE = Object.freeze({
  schema: "rsrender.bld006.packaging-profile.v0",
  applicationName: "RSrenderShell",
  executableName: "RSrenderShell",
  applicationVersion: "0.0.0",
  electronVersion: "43.4.0",
  packagerVersion: "20.0.4",
  platform: "win32",
  architecture: "x64",
  asar: true,
  prune: false,
  icon: "none-app-supplied",
  executableResourcePolicy:
    "restore exact admitted Electron executable after packager metadata edit; no app metadata, icon, or signing in BLD-006",
  sourceMap: "compiled TypeScript plus generated inert HTML constant",
});

const root = path.resolve(import.meta.dirname, "..");
const temporaryRoot = path.join(root, ".tmp", "bld-006-shell");
const stageDirectory = path.join(temporaryRoot, "stage");
const outputDirectory = path.join(temporaryRoot, "out");
const packagedDirectory = path.join(
  outputDirectory,
  `${PACKAGING_PROFILE.applicationName}-win32-${PACKAGING_PROFILE.architecture}`,
);
const packagedExecutable = path.join(packagedDirectory, `${PACKAGING_PROFILE.executableName}.exe`);

export const BLD006_PATHS = Object.freeze({
  temporaryRoot,
  stageDirectory,
  outputDirectory,
  packagedDirectory,
  packagedExecutable,
});

function assertTemporaryTarget(target) {
  const relative = path.relative(path.join(root, ".tmp"), target);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    throw new Error("BLD006_UNSAFE_TEMPORARY_TARGET");
  }
}

async function findCachedElectronZip(directory) {
  const expectedName = `electron-v${PACKAGING_PROFILE.electronVersion}-${PACKAGING_PROFILE.platform}-${PACKAGING_PROFILE.architecture}.zip`;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findCachedElectronZip(candidate);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name === expectedName) {
      return candidate;
    }
  }
  return null;
}

async function resolveElectronZip() {
  const cacheRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "electron", "Cache")
    : null;
  if (!cacheRoot) throw new Error("BLD006_ELECTRON_CACHE_ROOT_UNAVAILABLE");
  const cachedZip = await findCachedElectronZip(cacheRoot).catch(() => null);
  if (!cachedZip) {
    throw new Error(
      "BLD006_ELECTRON_ZIP_UNAVAILABLE: exact admitted Electron ZIP is not cached; packaging will not download or change the dependency graph",
    );
  }
  return cachedZip;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function verifyInstalledVersions() {
  const electronManifest = JSON.parse(
    await readFile(path.join(root, "node_modules", "electron", "package.json"), "utf8"),
  );
  const packagerManifest = JSON.parse(
    await readFile(
      path.join(root, "node_modules", "@electron", "packager", "package.json"),
      "utf8",
    ),
  );
  if (electronManifest.version !== PACKAGING_PROFILE.electronVersion) {
    throw new Error("BLD006_ELECTRON_VERSION_MISMATCH");
  }
  if (packagerManifest.version !== PACKAGING_PROFILE.packagerVersion) {
    throw new Error("BLD006_PACKAGER_VERSION_MISMATCH");
  }
}

async function prepareStage() {
  assertTemporaryTarget(temporaryRoot);
  await rm(temporaryRoot, { recursive: true, force: true });
  await mkdir(path.join(stageDirectory, "main"), { recursive: true });
  await cp(
    path.join(root, "packages", "platform-electron-main", "dist"),
    path.join(stageDirectory, "main"),
    { recursive: true },
  );

  const rendererModuleUrl = `${
    pathToFileURL(path.join(root, "packages", "renderer-ui", "dist", "index.js")).href
  }?bld006=${Date.now()}`;
  const { inertShellHtml } = await import(rendererModuleUrl);
  if (typeof inertShellHtml !== "string" || inertShellHtml.length === 0) {
    throw new Error("BLD006_INERT_RENDERER_MISSING");
  }

  const entrySource = [
    `globalThis.__RSRENDER_INERT_SHELL_HTML__ = ${JSON.stringify(inertShellHtml)};`,
    `await import("./main/main.js");`,
    "",
  ].join("\n");
  await writeFile(path.join(stageDirectory, "entry.mjs"), entrySource, "utf8");
  await writeFile(
    path.join(stageDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "rsrender-bld006-shell",
        productName: PACKAGING_PROFILE.applicationName,
        version: PACKAGING_PROFILE.applicationVersion,
        author: "RSrender contributors",
        private: true,
        type: "module",
        main: "entry.mjs",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export async function packageEmptyShell() {
  await verifyInstalledVersions();
  await prepareStage();
  const electronZip = await resolveElectronZip();
  const electronZipDirectory = path.dirname(electronZip);
  const electronZipDigest = sha256(await readFile(electronZip));
  const admittedElectronExecutable = path.join(
    root,
    "node_modules",
    "electron",
    "dist",
    "electron.exe",
  );
  const admittedElectronExecutableDigest = sha256(await readFile(admittedElectronExecutable));

  const outputs = await packager({
    dir: stageDirectory,
    name: PACKAGING_PROFILE.applicationName,
    executableName: PACKAGING_PROFILE.executableName,
    appVersion: PACKAGING_PROFILE.applicationVersion,
    buildVersion: PACKAGING_PROFILE.applicationVersion,
    electronVersion: PACKAGING_PROFILE.electronVersion,
    electronZipDir: electronZipDirectory,
    platform: PACKAGING_PROFILE.platform,
    arch: PACKAGING_PROFILE.architecture,
    out: outputDirectory,
    overwrite: true,
    asar: PACKAGING_PROFILE.asar,
    prune: PACKAGING_PROFILE.prune,
    quiet: true,
    afterComplete: [
      async ({ buildPath }) => {
        await copyFile(
          admittedElectronExecutable,
          path.join(buildPath, `${PACKAGING_PROFILE.executableName}.exe`),
        );
      },
    ],
  });

  if (outputs.length !== 1 || path.resolve(outputs[0]) !== packagedDirectory) {
    throw new Error("BLD006_UNEXPECTED_PACKAGE_OUTPUT");
  }
  const executableInfo = await stat(packagedExecutable);
  const packagedExecutableDigest = sha256(await readFile(packagedExecutable));
  if (packagedExecutableDigest !== admittedElectronExecutableDigest) {
    throw new Error("BLD006_PACKAGED_EXECUTABLE_DRIFT");
  }
  const asarPath = path.join(packagedDirectory, "resources", "app.asar");
  const asarInfo = await stat(asarPath);
  const result = {
    schema: "rsrender.bld006.package-result.v0",
    result: "PASS",
    packagingProfile: PACKAGING_PROFILE,
    electronZipSha256: electronZipDigest,
    admittedElectronExecutableSha256: admittedElectronExecutableDigest,
    output: {
      executable: `${PACKAGING_PROFILE.applicationName}-win32-${PACKAGING_PROFILE.architecture}/${PACKAGING_PROFILE.executableName}.exe`,
      executableBytes: executableInfo.size,
      appAsar: `${PACKAGING_PROFILE.applicationName}-win32-${PACKAGING_PROFILE.architecture}/resources/app.asar`,
      appAsarBytes: asarInfo.size,
    },
  };
  await writeFile(
    path.join(temporaryRoot, "package-result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  return result;
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  const result = await packageEmptyShell();
  console.log(JSON.stringify(result));
}
