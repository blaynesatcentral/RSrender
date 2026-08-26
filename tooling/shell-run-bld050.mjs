import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { boringLogMvpFixture } from "../packages/test-support/dist/index.js";
import { inspectBoringLogPdf } from "./inspect-boring-log-pdf.mjs";
import { BLD050_PATHS, packageHiddenSymbologyQualification } from "./shell-package-bld050.mjs";

const root = path.resolve(import.meta.dirname, "..");
const probeArgument = "--rsrender-bld050-probe";
const offscreenArgument = "--rsrender-bld050-offscreen";
const profileArgumentPrefix = "--rsrender-bld027-profile=";
const resultMarkers = ["RSRENDER_BLD050_RESULT=", "RSRENDER_BLD025_RESULT="];
const outputRoot = path.join(root, ".tmp", "bld-050-hidden-qualification-r12");
const artifactPath = path.join(root, "artifacts", "bld-050-hidden-qualification-evidence.json");
const pdfPath = path.join(outputRoot, "Hidden Symbology Proof.pdf");
const projectPath = path.join(outputRoot, "Hidden Symbology Proof.rsrender");

/** The product probe owns the DOM actions; this is its bounded qualification contract. */
export const BLD050_HIDDEN_WORKFLOW = Object.freeze({
  inputMode: "dom-events-only",
  selection: Object.freeze({
    graphPointSelector:
      '#svg-page .scene-data-hit-target[data-node-role^="data-point-"][data-node-role$="-hit-target"]',
    clickEvent: "click",
    rightClickEvent: "contextmenu",
    propertiesSection: "#data-layer-symbology-properties",
  }),
  apply: Object.freeze({
    activeLayerPoint: "#data-layer-point-shape",
    activeLayerLine: "#data-layer-line-style",
    legendLabel: "#data-layer-legend-label",
    applyButton: "#apply-data-layer-symbology",
  }),
  linkage: Object.freeze({
    canvasHoverEvent: "pointermove",
    attributeTable: "#attribute-table-dock",
  }),
  history: Object.freeze({ undo: "#undo", redo: "#redo" }),
  publication: Object.freeze({ exportButton: "#export-pdf" }),
});

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function readProductMainSource() {
  const candidates = [
    path.join(root, "packages", "platform-electron-main", "dist", "semantic-editor-main.js"),
    path.join(root, "packages", "platform-electron-main", "src", "semantic-editor-main.ts"),
  ];
  for (const candidate of candidates) {
    const source = await readFile(candidate, "utf8").catch(() => null);
    if (source !== null) return Object.freeze({ path: candidate, source });
  }
  throw new Error("BLD050_PRODUCT_MAIN_UNAVAILABLE");
}

/**
 * Refuse to run until the product has an explicit BLD-050 probe.  In
 * particular, an ordinary (visible) studio launch is never an acceptable
 * fallback for this qualification.
 */
export async function assertHiddenProbeHook() {
  const { path: sourcePath, source } = await readProductMainSource();
  const required = [["probe argument", probeArgument]];
  const missing = required.filter(([, token]) => !source.includes(token)).map(([label]) => label);
  if (missing.length > 0) {
    throw new Error(`BLD050_PRODUCT_HOOK_UNAVAILABLE:${JSON.stringify({ sourcePath, missing })}`);
  }
  return Object.freeze({ sourcePath, sourceSha256: sha256(Buffer.from(source, "utf8")) });
}

async function runPowerShell(script, environment) {
  const executable = path.join(
    process.env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0 ? resolve(stdout.trim()) : reject(new Error("PROCESS_INVENTORY_FAILED")),
    );
  });
}

async function processCount(executable) {
  const output = await runPowerShell(
    "$target=$env:RSR_EXE; @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $target }).Count",
    { RSR_EXE: executable },
  );
  const count = Number.parseInt(output, 10);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("PROCESS_COUNT_INVALID");
  return count;
}

async function terminateExactTree(executable, pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  await runPowerShell(
    "$rootPid=[int]$env:RSR_PID; $target=$env:RSR_EXE; $all=@(Get-CimInstance Win32_Process); $root=@($all|Where-Object{$_.ProcessId -eq $rootPid -and $_.ExecutablePath -eq $target}); if($root.Count -ne 1){exit 0}; $ids=New-Object 'System.Collections.Generic.HashSet[int]'; [void]$ids.Add($rootPid); do{$added=$false;foreach($p in $all){if($ids.Contains([int]$p.ParentProcessId)-and -not $ids.Contains([int]$p.ProcessId)){[void]$ids.Add([int]$p.ProcessId);$added=$true}}}while($added); $all|Where-Object{$ids.Contains([int]$_.ProcessId)}|Sort-Object ProcessId -Descending|ForEach-Object{Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}",
    { RSR_EXE: executable, RSR_PID: String(pid) },
  ).catch(() => undefined);
}

async function waitForZero(executable) {
  const started = Date.now();
  let count = await processCount(executable);
  while (count !== 0 && Date.now() - started < 10_000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    count = await processCount(executable);
  }
  return count;
}

function parseProbeResult(stdout) {
  const lines = stdout.split(/\r?\n/u).flatMap((line) => {
    const marker = resultMarkers.find((candidate) => line.startsWith(candidate));
    return marker === undefined ? [] : [{ marker, line }];
  });
  if (lines.length !== 1) throw new Error(`BLD050_RESULT_MARKER_INVALID:${stdout}`);
  return JSON.parse(
    Buffer.from(lines[0].line.slice(lines[0].marker.length), "base64").toString("utf8"),
  );
}

function requireEvidence(condition, code, value) {
  if (!condition) throw new Error(`${code}:${JSON.stringify(value)}`);
}

function validateProbeResult(result, pdfPathValue, projectPathValue) {
  requireEvidence(
    result?.schema === "rsrender.bld050.hidden-packaged-probe.v1" && result?.result === "PASS",
    "BLD050_PROBE_RESULT_INVALID",
    result,
  );
  requireEvidence(
    result.visibility?.hidden === true &&
      result.visibility?.offscreen === true &&
      result.visibility?.pointerControl === "dom-events-only",
    "BLD050_VISIBILITY_INVALID",
    result.visibility,
  );
  requireEvidence(
    result.selection?.point?.clickEvent === "dom" &&
      result.selection?.point?.rightClickEvent === "dom" &&
      result.selection?.point?.rightClickContextMenu === true &&
      result.selection?.properties?.focusedSymbology === true,
    "BLD050_DOM_SELECTION_INVALID",
    result.selection,
  );
  requireEvidence(
    result.symbology?.applied?.point === true &&
      result.symbology?.applied?.line === true &&
      result.symbology?.applied?.legend === true &&
      result.symbology?.applied?.activeLayerOnly === true,
    "BLD050_SYMBOLOGY_APPLY_INVALID",
    result.symbology,
  );
  requireEvidence(
    result.symbology?.projectDefault?.affectedBoringLogCount === 2 &&
      result.symbology.projectDefault.first?.state?.source === "layer-override" &&
      result.symbology.projectDefault.second?.state?.source === "layer-override" &&
      result.symbology.projectDefault.first?.legend?.label === "N custom" &&
      result.symbology.projectDefault.second?.legend?.label === "N custom" &&
      result.history?.projectDefaultCount === 2 &&
      result.symbology.projectDefault.first?.activeBoringLogIdentity !==
        result.symbology.projectDefault.second?.activeBoringLogIdentity,
    "BLD050_PROJECT_DEFAULT_INVALID",
    result.symbology?.projectDefault,
  );
  requireEvidence(
    result.projection?.canvasAndLegendShared === true &&
      result.projection?.canvasSymbolDigest === result.projection?.legendSymbolDigest &&
      result.projection?.normalizedScene === true,
    "BLD050_SHARED_PROJECTION_INVALID",
    result.projection,
  );
  requireEvidence(
    result.history?.undo?.restoresSource === true && result.history?.redo?.restoresApplied === true,
    "BLD050_HISTORY_INVALID",
    result.history,
  );
  requireEvidence(
    result.hover?.attributeLinkage === true &&
      result.hover?.canvasLinked === true &&
      result.hover?.tableLinked === true,
    "BLD050_HOVER_LINKAGE_INVALID",
    result.hover,
  );
  if (result.persistence?.supported === true) {
    requireEvidence(
      result.persistence.saved === true &&
        result.persistence.reopened === true &&
        typeof result.persistence.destinationPath === "string" &&
        result.persistence.destinationPath === path.resolve(projectPathValue),
      "BLD050_SAVE_REOPEN_INVALID",
      result.persistence,
    );
  }
  requireEvidence(
    result.publication?.result === "EXPORT_VERIFIED_SUCCESS" &&
      typeof result.publication.destinationPath === "string" &&
      path.resolve(result.publication.destinationPath) === path.resolve(pdfPathValue) &&
      typeof result.publication.sceneDigest === "string" &&
      typeof result.publication.projectionDigest === "string" &&
      typeof result.publication.pdfDigest === "string" &&
      Number.isSafeInteger(result.publication.pdfBytes) &&
      result.publication?.vector === true &&
      result.publication?.rasterImages === 0 &&
      result.publication?.normalizedScene === true,
    "BLD050_PUBLICATION_INVALID",
    result.publication,
  );
}

async function runHiddenProbe(packageResult) {
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  const profile = path.join(os.tmpdir(), `rsrender-bld050-hidden-${process.pid}-profile`);
  await rm(profile, { recursive: true, force: true });
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        probeArgument,
        offscreenArgument,
        `${profileArgumentPrefix}${profile}`,
        `--rsrender-bld050-workflow=${Buffer.from(JSON.stringify(BLD050_HIDDEN_WORKFLOW), "utf8").toString("base64url")}`,
        `--rsrender-bld027-output=${pdfPath}`,
        `--rsrender-bld035-output=${projectPath}`,
      ],
      {
        cwd: path.dirname(executable),
        windowsHide: true,
        env: { ...process.env, ELECTRON_ENABLE_LOGGING: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      void terminateExactTree(executable, child.pid).finally(() => child.kill());
    }, 600_000);
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut, pid: child.pid });
    });
  });
  if (outcome.timedOut) await terminateExactTree(executable, outcome.pid);
  const remainingProcesses = await waitForZero(executable);
  await rm(profile, { recursive: true, force: true });
  const profileRemoved = await access(profile).then(
    () => false,
    () => true,
  );
  requireEvidence(
    outcome.code === 0 &&
      outcome.timedOut === false &&
      Buffer.byteLength(outcome.stderr) === 0 &&
      remainingProcesses === 0 &&
      profileRemoved,
    "BLD050_HIDDEN_PROCESS_INVALID",
    { outcome, remainingProcesses, profileRemoved },
  );
  return Object.freeze({
    result: parseProbeResult(outcome.stdout),
    process: Object.freeze({
      exitCode: outcome.code,
      signal: outcome.signal,
      timedOut: outcome.timedOut,
      stdoutBytes: Buffer.byteLength(outcome.stdout),
      stderrBytes: Buffer.byteLength(outcome.stderr),
      remainingProcesses,
      profileRemoved,
    }),
    durationMs: Date.now() - started,
  });
}

async function sourceDigests() {
  const files = [
    "packages/platform-electron-main/src/semantic-editor-main.ts",
    "packages/platform-electron-main/src/boring-log-studio-projection.ts",
    "packages/renderer-ui/src/boring-log-studio-entry.ts",
    "packages/renderer-ui/src/boring-log-svg-projection.ts",
    "tooling/inspect-boring-log-pdf.mjs",
    "tooling/shell-package-bld050.mjs",
    "tooling/shell-run-bld050.mjs",
  ];
  return Object.freeze(
    Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [file, sha256(await readFile(path.join(root, file)))]),
      ),
    ),
  );
}

export async function runHiddenSymbologyQualification({
  record = false,
  reusePackage = false,
} = {}) {
  const hook = await assertHiddenProbeHook();
  await mkdir(outputRoot, { recursive: true });
  await rm(pdfPath, { force: true });
  await rm(projectPath, { force: true });
  const packageResult = reusePackage
    ? Object.freeze({
        schema: "rsrender.bld050.package-result.v1",
        result: "PASS",
        paths: BLD050_PATHS,
        executableBytes: (await stat(BLD050_PATHS.packagedExecutable)).size,
        qualification: Object.freeze({
          mode: "hidden-offscreen-dom-events-only",
          productBuildUntouched: true,
          reusedExistingPackage: true,
        }),
      })
    : await packageHiddenSymbologyQualification();
  const run = await runHiddenProbe(packageResult);
  validateProbeResult(run.result, pdfPath, projectPath);
  const inspection = await inspectBoringLogPdf({
    pdfPath,
    expectedSceneDigest: run.result.publication.sceneDigest,
    expectedProjectionDigest: run.result.publication.projectionDigest,
    expectedText: [
      boringLogMvpFixture.metadata.companyName,
      boringLogMvpFixture.metadata.documentTitle,
      ...boringLogMvpFixture.notes,
      ...boringLogMvpFixture.remarks.map(({ text }) => text),
      ...boringLogMvpFixture.lithologyIntervals.flatMap(({ classification, description }) => [
        classification,
        description,
      ]),
    ],
    expectedSceneNodes: run.result.publication.sceneNodes,
    expectedPageCount: run.result.publication.pageCount,
    requireSceneDigestInTitle: false,
    renderPrefix: path.join(outputRoot, "bld050-vector-inspection"),
  });
  requireEvidence(
    inspection.pdfSha256 === run.result.publication.pdfDigest &&
      inspection.pdfBytes === run.result.publication.pdfBytes &&
      inspection.images === 0 &&
      inspection.vectorGeometry.result === "AVAILABLE",
    "BLD050_PDF_INSPECTION_INVALID",
    inspection,
  );
  const evidence = {
    schema: "rsrender.bld050.hidden-qualification-evidence.v1",
    ticket: "BLD-050",
    result: "PASS",
    package: packageResult,
    hook,
    run,
    inspection,
    claims: {
      hiddenOffscreenElectron: true,
      domEventsOnly: true,
      graphPointClickAndContextMenu: true,
      focusedSymbologyProperties: true,
      activeLayerPointLineLegendApply: true,
      projectDefaultAcrossBothBoringLogs: true,
      sharedCanvasLegendProjection: true,
      undoRedo: true,
      saveReopenWhenSupported: run.result.persistence?.supported === true,
      hoverAttributeLinkage: true,
      normalizedVectorPdf: true,
      rasterImages: false,
      packagedProcessCleanup: true,
    },
    sourceDigests: await sourceDigests(),
  };
  const canonical = `${canonicalizeJson(evidence)}\n`;
  if (record) {
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, canonical, "utf8");
  }
  return Object.freeze({
    ...evidence,
    evidenceSha256: sha256(Buffer.from(canonical, "utf8")),
    evidenceRecorded:
      record &&
      (await access(artifactPath).then(
        () => true,
        () => false,
      )),
  });
}

// Feature-oriented name follows the BLD-049 qualification runner convention.
export const runDataLayerSymbologyQualification = runHiddenSymbologyQualification;

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  console.log(
    JSON.stringify(
      await runHiddenSymbologyQualification({
        record: process.argv.includes("--record"),
        reusePackage: process.argv.includes("--reuse-package"),
      }),
    ),
  );
}
