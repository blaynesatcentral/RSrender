import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { packager } from "@electron/packager";
import { build } from "esbuild";

import { PACKAGING_PROFILE } from "./shell-package-bld006.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temporaryRoot = path.join(root, ".tmp", "bld-026-boring-log-editor");
const stageDirectory = path.join(temporaryRoot, "stage");
const outputDirectory = path.join(temporaryRoot, "out");
const applicationName = "RSrender";
const packagedDirectory = path.join(
  outputDirectory,
  `${applicationName}-win32-${PACKAGING_PROFILE.architecture}`,
);
const packagedExecutable = path.join(packagedDirectory, `${applicationName}.exe`);
const bundleMarker = "rsrender.boring-log-editor.bundle.v1";

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
  const [sceneModule, layoutHostModule, fixtureModule] = await Promise.all([
    import(
      `${pathToFileURL(path.join(root, "packages", "scene", "dist", "index.js")).href}?bld026=${stamp}`
    ),
    import(
      `${pathToFileURL(path.join(root, "packages", "layout-host", "dist", "index.js")).href}?bld026=${stamp}`
    ),
    import(
      `${pathToFileURL(path.join(root, "packages", "test-support", "dist", "index.js")).href}?bld026=${stamp}`
    ),
  ]);
  const layoutJob = {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:mvp-boring-log-editor-01@r1",
    inputRevision: 1,
    fixtureDigest: fixtureModule.BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: fixtureModule.BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(fixtureModule.boringLogMvpFixture),
    template: structuredClone(fixtureModule.boringLogMvpTemplate),
  };
  const prepared = sceneModule.prepareBoringLogLayout(layoutJob);
  if (!prepared.accepted) throw new Error(`BLD026_PAGE_PLAN_REJECTED:${prepared.code}`);
  const measured = layoutHostModule.measureBoringLogTextRequests(prepared.value.textRequests);
  if (!measured.accepted) throw new Error(`BLD026_TEXT_REJECTED:${measured.code}`);
  const resolved = sceneModule.resolveBoringLogPageScene(prepared.value, measured.results);
  if (!resolved.accepted) throw new Error(`BLD026_SCENE_REJECTED:${resolved.code}`);
  return Object.freeze({ layoutJob, scene: resolved.value });
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
  for (const packageName of ["application", "contracts", "domain", "layout-host", "scene"]) {
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
  const inputs = await structuredInputs();
  const rendererUrl = `${pathToFileURL(path.join(root, "packages", "renderer-ui", "dist", "index.js")).href}?bld026=${Date.now()}`;
  const { createBoringLogStudioHtml } = await import(rendererUrl);
  const html = createBoringLogStudioHtml(inputs.scene);
  const platformUrl = `${pathToFileURL(path.join(root, "packages", "platform-electron-main", "dist", "index.js")).href}?bld026=${Date.now()}`;
  const platform = await import(platformUrl);
  const preloadDirectory = path.join(stageDirectory, "preload");
  const rendererDirectory = path.join(stageDirectory, "renderer");
  await mkdir(preloadDirectory, { recursive: true });
  await mkdir(rendererDirectory, { recursive: true });
  const preload = platform.generateBoringLogStudioPreloadSource();
  const renderer = await rendererBundle();
  const stylesheet = await readFile(
    path.join(root, "packages", "renderer-ui", "src", "boring-log-studio.css"),
    "utf8",
  );
  const rendererSha256 = sha256(Buffer.from(renderer, "utf8"));
  await writeFile(path.join(preloadDirectory, "boring-log-studio.cjs"), preload, "utf8");
  await writeFile(path.join(rendererDirectory, "semantic-editor.js"), renderer, "utf8");
  await writeFile(path.join(rendererDirectory, "boring-log-studio.css"), stylesheet, "utf8");
  await writeFile(
    path.join(stageDirectory, "entry.mjs"),
    `globalThis.__RSRENDER_SEMANTIC_EDITOR_HTML__ = ${JSON.stringify(html)};\nglobalThis.__RSRENDER_SEMANTIC_EDITOR_RENDERER_SHA256__ = ${JSON.stringify(rendererSha256)};\nglobalThis.__RSRENDER_WINDOW_TITLE__ = "RSrender Boring Log Studio";\nglobalThis.__RSRENDER_BORING_LOG_LAYOUT_JOB__ = ${JSON.stringify(inputs.layoutJob)};\nawait import("./main/semantic-editor-main.js");\n`,
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
    stylesheetSha256: sha256(stylesheet),
    layoutJobSha256: sha256(Buffer.from(JSON.stringify(inputs.layoutJob), "utf8")),
    initialSceneSha256: sha256(Buffer.from(JSON.stringify(inputs.scene), "utf8")),
    sceneNodes: inputs.scene.pages[0].nodes.length,
    editableValues: 24,
  });
}

export async function packageBoringLogEditor() {
  const staged = await prepareStage();
  const zip = await electronZip();
  const admittedExecutable = path.join(root, "node_modules", "electron", "dist", "electron.exe");
  const executableSha256 = sha256(await readFile(admittedExecutable));
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
    quiet: true,
    afterComplete: [
      async ({ buildPath }) => {
        await copyFile(admittedExecutable, path.join(buildPath, `${applicationName}.exe`));
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
  if (sha256(await readFile(packagedExecutable)) !== executableSha256) {
    throw new Error("BLD026_EXECUTABLE_DRIFT");
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
    }),
    electronZipSha256: sha256(await readFile(zip)),
    executableSha256,
    executableBytes: (await stat(packagedExecutable)).size,
    appAsarSha256: sha256(await readFile(appAsar)),
    appAsarBytes: (await stat(appAsar)).size,
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
