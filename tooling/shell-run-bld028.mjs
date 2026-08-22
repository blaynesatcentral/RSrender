import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { canonicalizeJson, sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import { boringLogMvpFixture } from "../packages/test-support/dist/index.js";
import { inspectBoringLogPdf } from "./inspect-boring-log-pdf.mjs";
import { packageBoringLogMvp } from "./shell-package-bld028.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD025_RESULT=";
const artifactPath = path.join(root, "artifacts", "bld-028-integrated-mvp-evidence.json");
const temporaryPdfDirectory = path.join(root, "tmp", "pdfs");
const finalPdfPath = path.join(root, "output", "pdf", "rsrender-boring-log-mvp.pdf");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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
    "$rootPid=[int]$env:RSR_PID; $target=$env:RSR_EXE; $all=@(Get-CimInstance Win32_Process); $root=@($all|Where-Object{$_.ProcessId -eq $rootPid -and $_.ExecutablePath -eq $target}); if($root.Count-ne 1){exit 0}; $ids=New-Object 'System.Collections.Generic.HashSet[int]'; [void]$ids.Add($rootPid); do{$added=$false;foreach($p in $all){if($ids.Contains([int]$p.ParentProcessId)-and-not $ids.Contains([int]$p.ProcessId)){[void]$ids.Add([int]$p.ProcessId);$added=$true}}}while($added); $all|Where-Object{$ids.Contains([int]$_.ProcessId)}|Sort-Object ProcessId -Descending|ForEach-Object{Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}",
    { RSR_EXE: executable, RSR_PID: String(pid) },
  ).catch(() => undefined);
}

async function waitForZero(executable) {
  const started = Date.now();
  let count = await processCount(executable);
  while (count !== 0 && Date.now() - started < 30_000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    count = await processCount(executable);
  }
  return count;
}

function parseResult(stdout) {
  const lines = stdout.split(/\r?\n/u).filter((line) => line.startsWith(resultMarker));
  if (lines.length !== 1) throw new Error("PACKAGED_RESULT_MARKER_INVALID");
  return JSON.parse(Buffer.from(lines[0].slice(resultMarker.length), "base64").toString("utf8"));
}

function assertIntegratedResult(result, outputPath, index) {
  const valid =
    result.schema === "rsrender.bld027.boring-log-pdf-probe.v1" &&
    result.result === "PASS" &&
    result.initial?.panes === 3 &&
    result.initial?.svg === 1 &&
    result.initial?.raster === 0 &&
    result.initial?.sceneNodes === 319 &&
    result.initial?.semanticElements === 88 &&
    result.initial?.errorDiagnostics === 0 &&
    result.initial?.clippedText === 0 &&
    result.initial?.textLines >= 100 &&
    result.initial?.positiveTextAdvances >= 100 &&
    result.initial?.fontFaceDigests?.length === 2 &&
    result.initial?.fontMetricsDigests?.length === 1 &&
    result.selection?.selectedTreeRows === 1 &&
    result.selection?.selectedSceneNodes >= 1 &&
    result.selection?.provenance?.includes("Source original") &&
    result.editing?.before?.source === result.editing?.before?.effective &&
    result.editing?.applied?.effective === result.editing?.replacement &&
    result.editing?.applied?.provenance?.includes("Effective override") &&
    result.editing?.undo?.effective === result.editing?.undo?.source &&
    result.editing?.redo?.effective === result.editing?.replacement &&
    result.editing?.style?.patternedIntervals === 3 &&
    result.editing?.layout?.width === "150000" &&
    result.editing?.layout?.followingX === "253000" &&
    result.publication?.result === "EXPORT_VERIFIED_SUCCESS" &&
    path.resolve(result.publication.destinationPath) === path.resolve(outputPath) &&
    result.zoomPercent === 90 &&
    result.denials?.windowCount === 1 &&
    result.denials?.network === 0;
  if (!valid) throw new Error(`INTEGRATED_PRODUCT_RESULT_INVALID:${index}`);
}

async function runPackaged(packageResult, index, outputPath, inputPath = null) {
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  await rm(outputPath, { force: true });
  const profile = path.join(os.tmpdir(), `rsrender-bld028-integrated-${index}-profile`);
  await rm(profile, { recursive: true, force: true });
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        "--rsrender-bld027-probe",
        `--rsrender-bld027-profile=${profile}`,
        `--rsrender-bld027-output=${outputPath}`,
        ...(inputPath === null ? [] : [`--rsrender-boring-log-input=${inputPath}`]),
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
    }, 120_000);
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut, pid: child.pid });
    });
  });
  if (outcome.timedOut) await terminateExactTree(executable, outcome.pid);
  const after = await waitForZero(executable);
  await rm(profile, { recursive: true, force: true });
  const profileRemoved = await access(profile).then(
    () => false,
    () => true,
  );
  const result = parseResult(outcome.stdout);
  assertIntegratedResult(result, outputPath, index);
  if (
    outcome.code !== 0 ||
    outcome.timedOut ||
    Buffer.byteLength(outcome.stderr) !== 0 ||
    after !== 0 ||
    !profileRemoved
  ) {
    throw new Error(
      `INTEGRATED_PRODUCT_PROCESS_INVALID:${index}:${JSON.stringify({ exitCode: outcome.code, signal: outcome.signal, timedOut: outcome.timedOut, stderr: outcome.stderr, after, profileRemoved })}`,
    );
  }
  const inspection = await inspectBoringLogPdf({
    pdfPath: outputPath,
    expectedSceneDigest: result.publication.sceneDigest,
    expectedProjectionDigest: result.publication.projectionDigest,
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
    expectedSceneNodes: result.initial.sceneNodes,
    renderPrefix: path.join(temporaryPdfDirectory, `bld028-run-${index}-preview`),
  });
  if (
    inspection.pdfSha256 !== result.publication.pdfDigest ||
    inspection.pdfBytes !== result.publication.pdfBytes
  ) {
    throw new Error(`INTEGRATED_PDF_DIGEST_MISMATCH:${index}`);
  }
  return Object.freeze({
    index,
    durationMs: Date.now() - started,
    result,
    inspection,
    process: Object.freeze({
      exitCode: outcome.code,
      signal: outcome.signal,
      timedOut: outcome.timedOut,
      stderrBytes: Buffer.byteLength(outcome.stderr),
      stderrSha256: sha256(Buffer.from(outcome.stderr)),
      after,
      profileRemoved,
    }),
  });
}

async function sourceDigests() {
  const files = [
    "tooling/shell-package-bld028.mjs",
    "tooling/shell-run-bld028.mjs",
    "tooling/shell-run-bld027.mjs",
    "packages/platform-electron-main/src/semantic-editor-main.ts",
    "packages/platform-electron-main/src/boring-log-document-ingress.ts",
    "packages/platform-electron-main/src/boring-log-example-document.ts",
    "packages/renderer-ui/src/boring-log-studio-entry.ts",
    "packages/layout-host/src/boring-log-publication-projection.ts",
    "packages/scene/src/boring-log-layout-engine.ts",
  ];
  return Object.freeze(
    Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [
          file,
          `sha256:${sha256(await readFile(path.join(root, file)))}`,
        ]),
      ),
    ),
  );
}

export async function runIntegratedBoringLogMvpQualification({ record = false } = {}) {
  await mkdir(temporaryPdfDirectory, { recursive: true });
  await mkdir(path.dirname(finalPdfPath), { recursive: true });
  const packageResult = await packageBoringLogMvp();
  const outputs = [
    path.join(temporaryPdfDirectory, "rsrender-boring-log-bld028-run-1.pdf"),
    path.join(temporaryPdfDirectory, "rsrender-boring-log-bld028-run-2.pdf"),
    finalPdfPath,
  ];
  const runs = [];
  for (let index = 1; index <= 3; index += 1) {
    runs.push(await runPackaged(packageResult, index, outputs[index - 1]));
  }
  const alternateInputPath = path.join(temporaryPdfDirectory, "bld032-alternate-input.json");
  const alternateInput = JSON.parse(
    await readFile(packageResult.paths.packagedRuntimeInput, "utf8"),
  );
  alternateInput.document.metadata.projectNumber = "SGS-24057-ALT";
  alternateInput.fixtureDigest = sha256CanonicalJson(alternateInput.document);
  await writeFile(alternateInputPath, `${canonicalizeJson(alternateInput)}\n`, "utf8");
  const alternateRun = await runPackaged(
    packageResult,
    "alternate-input",
    path.join(temporaryPdfDirectory, "rsrender-boring-log-bld032-alternate.pdf"),
    alternateInputPath,
  );
  if (alternateRun.result.initial.pageDigest === runs[0].result.initial.pageDigest) {
    throw new Error("BLD032_ALTERNATE_INPUT_NOT_OBSERVED");
  }
  const sceneDigests = new Set(runs.map(({ result }) => result.publication.sceneDigest));
  const projectionDigests = new Set(runs.map(({ result }) => result.publication.projectionDigest));
  if (sceneDigests.size !== 1 || projectionDigests.size !== 1) {
    throw new Error("INTEGRATED_CROSS_RUN_SCENE_DRIFT");
  }
  const evidence = {
    schema: "rsrender.bld028.integrated-mvp-evidence.v1",
    ticket: "BLD-028 / GitHub #72",
    result: "PASS",
    package: packageResult,
    productOwnerLaunchTarget: packageResult.productOwnerLaunchTarget,
    finalPdfPath,
    runs,
    runtimeIngress: {
      sameExecutableAndAsar: true,
      defaultInputSceneDigest: runs[0].result.initial.pageDigest,
      alternateInputSceneDigest: alternateRun.result.initial.pageDigest,
      alternateInputSha256: sha256(await readFile(alternateInputPath)),
      alternateRun,
    },
    crossRun: {
      exactRunCount: runs.length,
      sceneDigest: runs[0].result.publication.sceneDigest,
      projectionDigest: runs[0].result.publication.projectionDigest,
      everyProcessClean: runs.every(({ process }) => process.after === 0),
      everyPdfNormalized: runs.every(({ inspection }) => inspection.result === "PASS"),
    },
    claims: {
      completeStructuredDataToPdfFlow: true,
      contentsCanvasPropertiesSynchronized: true,
      textValueStyleLayoutEditing: true,
      undoRedo: true,
      sameResolvedScene: true,
      rasterShortcut: false,
      automatedQualificationComplete: true,
      productOwnerPersonallyOperated: false,
      broaderProgramComplete: false,
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
    evidenceSha256: `sha256:${sha256(Buffer.from(canonical, "utf8"))}`,
  });
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  console.log(
    JSON.stringify(
      await runIntegratedBoringLogMvpQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
