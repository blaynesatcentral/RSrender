import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { packager } from "@electron/packager";
import { build } from "esbuild";

import { PACKAGING_PROFILE } from "./shell-package-bld006.mjs";
import { rsrenderAppIconRevision, writeRsrenderAppIcon } from "./rsrender-app-icon.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temporaryLabel = process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL ?? "bld-026-boring-log-editor";
if (!/^bld-[0-9a-z-]+$/u.test(temporaryLabel)) {
  throw new Error("BLD026_TEMPORARY_LABEL_INVALID");
}
const temporaryRoot = path.join(root, ".tmp", temporaryLabel);
const stageDirectory = path.join(temporaryRoot, "stage");
const outputDirectory = path.join(temporaryRoot, "out");
const applicationName = "RSrender";
const packagedDirectory = path.join(
  outputDirectory,
  `${applicationName}-win32-${PACKAGING_PROFILE.architecture}`,
);
const packagedExecutable = path.join(packagedDirectory, `${applicationName}.exe`);
const bundleMarker = "rsrender.boring-log-editor.bundle.v1";
const exampleInputRelativePath = path.join("example-data", "rsrender-example-boring-log.json");
const generatedExampleInputPath = path.join(temporaryRoot, "rsrender-example-boring-log.json");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function findCachedElectronZip(directory) {
  const expectedName = `electron-v${PACKAGING_PROFILE.electronVersion}-${PACKAGING_PROFILE.platform}-${PACKAGING_PROFILE.architecture}.zip`;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findCachedElectronZip(candidate);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name === expectedName) return candidate;
  }
  return null;
}

async function electronZip() {
  const cacheRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "electron", "Cache")
    : null;
  if (!cacheRoot) throw new Error("BLD026_ELECTRON_CACHE_UNAVAILABLE");
  const result = await findCachedElectronZip(cacheRoot).catch(() => null);
  if (!result) throw new Error("BLD026_ELECTRON_ZIP_UNAVAILABLE");
  return result;
}

async function structuredInputs() {
  const stamp = Date.now();
  const platformModule = await import(
    `${pathToFileURL(path.join(root, "packages", "platform-electron-main", "dist", "index.js")).href}?bld032=${stamp}`
  );
  const inputBytes = Buffer.from(platformModule.boringLogExampleDocumentSource, "utf8");
  const decoded = platformModule.decodeBoringLogDocumentBundle(inputBytes);
  if (!decoded.accepted) throw new Error(`BLD032_EXAMPLE_INPUT_REJECTED:${decoded.code}`);
  const layoutJob = decoded.layoutJob;
  return Object.freeze({ layoutJob, inputBytes });
}

async function rendererBundle() {
  const result = await build({
    entryPoints: [path.join(root, "packages", "renderer-ui", "src", "boring-log-studio-entry.ts")],
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    target: "chrome142",
    charset: "utf8",
    legalComments: "none",
    sourcemap: false,
    minify: false,
    logLevel: "silent",
  });
  if (result.outputFiles.length !== 1) throw new Error("BLD026_RENDERER_BUNDLE_INVALID");
  const source = `/* rsrender.semantic-editor.bundle.v1 */\n/* ${bundleMarker} */\n${result.outputFiles[0].text}`;
  const capabilitySource = source.replaceAll("http://www.w3.org/2000/svg", "");
  for (const forbidden of [
    "require(",
    "process.",
    "//# sourceMappingURL=",
    "eval(",
    "new Function(",
    "http://",
    "https://",
    "<img",
    "data:image/",
  ]) {
    if (capabilitySource.includes(forbidden)) {
      throw new Error(`BLD026_RENDERER_CAPABILITY_INVALID:${forbidden}`);
    }
  }
  return source;
}

async function prepareStage() {
  await rm(temporaryRoot, { recursive: true, force: true });
  await mkdir(path.join(stageDirectory, "main"), { recursive: true });
  await cp(
    path.join(root, "packages", "platform-electron-main", "dist"),
    path.join(stageDirectory, "main"),
    { recursive: true },
  );
  await cp(
    path.join(root, "packages", "platform-electron-main", "assets"),
    path.join(stageDirectory, "assets"),
    { recursive: true },
  );
  for (const packageName of [
    "application",
    "contracts",
    "domain",
    "layout-host",
    "package-contract",
    "platform-zipjs",
    "scene",
    "source-contract",
  ]) {
    const target = path.join(stageDirectory, "node_modules", "@rsrender", packageName);
    await mkdir(target, { recursive: true });
    await cp(path.join(root, "packages", packageName, "dist"), path.join(target, "dist"), {
      recursive: true,
    });
    await copyFile(
      path.join(root, "packages", packageName, "package.json"),
      path.join(target, "package.json"),
    );
  }
  const zipJsTarget = path.join(stageDirectory, "node_modules", "@zip.js", "zip.js");
  await mkdir(path.dirname(zipJsTarget), { recursive: true });
  await cp(path.join(root, "node_modules", "@zip.js", "zip.js"), zipJsTarget, {
    recursive: true,
  });
  const inputs = await structuredInputs();
  await writeFile(generatedExampleInputPath, inputs.inputBytes);
  const rendererUrl = `${pathToFileURL(path.join(root, "packages", "renderer-ui", "dist", "index.js")).href}?bld026=${Date.now()}`;
  const { createBoringLogStudioHtml } = await import(rendererUrl);
  const html = createBoringLogStudioHtml();
  const platformUrl = `${pathToFileURL(path.join(root, "packages", "platform-electron-main", "dist", "index.js")).href}?bld026=${Date.now()}`;
  const platform = await import(platformUrl);
  const preloadDirectory = path.join(stageDirectory, "preload");
  const rendererDirectory = path.join(stageDirectory, "renderer");
  await mkdir(preloadDirectory, { recursive: true });
  await mkdir(rendererDirectory, { recursive: true });
  const preload = platform.generateBoringLogStudioPreloadSource();
  const authEntryPreload = platform.generateRsLogAuthEntryPreloadSource();
  const sourceSelectionPreload = platform.generateRsLogSourceSelectionPreloadSource();
  const renderer = await rendererBundle();
  const stylesheet = await readFile(
    path.join(root, "packages", "renderer-ui", "src", "boring-log-studio.css"),
    "utf8",
  );
  const rendererSha256 = sha256(Buffer.from(renderer, "utf8"));
  await writeFile(path.join(preloadDirectory, "boring-log-studio.cjs"), preload, "utf8");
  await writeFile(path.join(preloadDirectory, "rslog-auth-entry.cjs"), authEntryPreload, "utf8");
  await writeFile(
    path.join(preloadDirectory, "rslog-source-selection.cjs"),
    sourceSelectionPreload,
    "utf8",
  );
  await writeFile(path.join(rendererDirectory, "semantic-editor.js"), renderer, "utf8");
  await writeFile(path.join(rendererDirectory, "boring-log-studio.css"), stylesheet, "utf8");
  await writeFile(
    path.join(stageDirectory, "entry.mjs"),
    `import { app } from "electron";\napp.disableHardwareAcceleration();\napp.commandLine.appendSwitch("disable-gpu");\napp.commandLine.appendSwitch("in-process-gpu");\nglobalThis.__RSRENDER_SEMANTIC_EDITOR_HTML__ = ${JSON.stringify(html)};\nglobalThis.__RSRENDER_SEMANTIC_EDITOR_RENDERER_SHA256__ = ${JSON.stringify(rendererSha256)};\nglobalThis.__RSRENDER_WINDOW_TITLE__ = "RSrender Boring Log Studio";\nglobalThis.__RSRENDER_BORING_LOG_RUNTIME_INPUT_REQUIRED__ = true;\nawait import("./main/semantic-editor-main.js");\n`,
    "utf8",
  );
  await writeFile(
    path.join(stageDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "rsrender-bld026-boring-log-editor",
        productName: applicationName,
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
  return Object.freeze({
    rendererSha256,
    rendererBytes: Buffer.byteLength(renderer, "utf8"),
    preloadSha256: sha256(Buffer.from(preload, "utf8")),
    preloadBytes: Buffer.byteLength(preload, "utf8"),
    authEntryPreloadSha256: sha256(Buffer.from(authEntryPreload, "utf8")),
    authEntryPreloadBytes: Buffer.byteLength(authEntryPreload, "utf8"),
    sourceSelectionPreloadSha256: sha256(Buffer.from(sourceSelectionPreload, "utf8")),
    sourceSelectionPreloadBytes: Buffer.byteLength(sourceSelectionPreload, "utf8"),
    stylesheetSha256: sha256(stylesheet),
    layoutJobSha256: sha256(Buffer.from(JSON.stringify(inputs.layoutJob), "utf8")),
    initialSceneSha256: null,
    runtimeInputSha256: sha256(inputs.inputBytes),
    runtimeInputBytes: inputs.inputBytes.byteLength,
    runtimeInputRelativePath: exampleInputRelativePath.replaceAll("\\", "/"),
    sceneNodes: null,
    editableValues: 24,
  });
}

export async function packageBoringLogEditor() {
  const staged = await prepareStage();
  const appIconPath = path.join(temporaryRoot, "rsrender-app-icon.ico");
  await writeRsrenderAppIcon(appIconPath);
  const zip = await electronZip();
  const admittedExecutable = path.join(root, "node_modules", "electron", "dist", "electron.exe");
  const admittedElectronExecutableSha256 = sha256(await readFile(admittedExecutable));
  const options = {
    dir: stageDirectory,
    name: applicationName,
    executableName: applicationName,
    appVersion: PACKAGING_PROFILE.applicationVersion,
    buildVersion: PACKAGING_PROFILE.applicationVersion,
    electronVersion: PACKAGING_PROFILE.electronVersion,
    electronZipDir: path.dirname(zip),
    platform: PACKAGING_PROFILE.platform,
    arch: PACKAGING_PROFILE.architecture,
    out: outputDirectory,
    overwrite: true,
    asar: true,
    prune: false,
    icon: appIconPath,
    quiet: true,
    afterComplete: [
      async ({ buildPath }) => {
        const runtimeInputDirectory = path.join(buildPath, "example-data");
        await mkdir(runtimeInputDirectory, { recursive: true });
        await copyFile(generatedExampleInputPath, path.join(buildPath, exampleInputRelativePath));
      },
    ],
  };
  let outputs;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      outputs = await packager(options);
      break;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EPERM" ||
        attempt === 3
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  if (outputs?.length !== 1 || path.resolve(outputs[0]) !== packagedDirectory) {
    throw new Error("BLD026_UNEXPECTED_PACKAGE_OUTPUT");
  }
  const executableSha256 = sha256(await readFile(packagedExecutable));
  if (executableSha256 === admittedElectronExecutableSha256) {
    throw new Error("BLD054_ICON_NOT_APPLIED");
  }
  const packagedRuntimeInput = path.join(packagedDirectory, exampleInputRelativePath);
  if (sha256(await readFile(packagedRuntimeInput)) !== staged.runtimeInputSha256) {
    throw new Error("BLD032_RUNTIME_INPUT_COPY_DRIFT");
  }
  const appAsar = path.join(packagedDirectory, "resources", "app.asar");
  return Object.freeze({
    schema: "rsrender.bld026.package-result.v1",
    result: "PASS",
    paths: Object.freeze({
      temporaryRoot,
      stageDirectory,
      outputDirectory,
      packagedDirectory,
      packagedExecutable,
      packagedRuntimeInput,
    }),
    electronZipSha256: sha256(await readFile(zip)),
    executableSha256,
    admittedElectronExecutableSha256,
    executableBytes: (await stat(packagedExecutable)).size,
    appAsarSha256: sha256(await readFile(appAsar)),
    appAsarBytes: (await stat(appAsar)).size,
    appIconRevision: rsrenderAppIconRevision,
    appIconPath,
    ...staged,
  });
}

export const BLD026_PATHS = Object.freeze({
  temporaryRoot,
  stageDirectory,
  outputDirectory,
  packagedDirectory,
  packagedExecutable,
});

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) console.log(JSON.stringify(await packageBoringLogEditor()));
