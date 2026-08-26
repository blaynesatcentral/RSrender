import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { boringLogMvpFixture } from "../packages/test-support/dist/index.js";
import { inspectBoringLogPdf } from "./inspect-boring-log-pdf.mjs";
import { inspectBoringLogPdfPackage } from "./inspect-boring-log-pdf-package.mjs";
import { packageBoringLogPdfStudio } from "./shell-package-bld027.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD025_RESULT=";
const artifactPath = path.join(root, "artifacts", "bld-027-boring-log-pdf-evidence.json");
const temporaryPdfDirectory = path.join(root, "tmp", "pdfs");
const finalPdfDirectory = path.join(root, "output", "pdf");
const finalPdfPath = path.join(finalPdfDirectory, "rsrender-boring-log-mvp.pdf");

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

function parseResult(stdout) {
  const lines = stdout.split(/\r?\n/u).filter((line) => line.startsWith(resultMarker));
  if (lines.length !== 1) throw new Error(`PACKAGED_RESULT_MARKER_INVALID:${stdout}`);
  return JSON.parse(Buffer.from(lines[0].slice(resultMarker.length), "base64").toString("utf8"));
}

function assertOwnedOutput(outputPath) {
  const relative = path.relative(root, outputPath);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    ![
      path.join("tmp", "pdfs", "rsrender-boring-log-bld027-run-1.pdf"),
      path.join("output", "pdf", "rsrender-boring-log-mvp.pdf"),
    ].includes(relative)
  ) {
    throw new Error("PDF_OUTPUT_SCOPE_INVALID");
  }
}

async function runPackaged(packageResult, index, outputPath) {
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  assertOwnedOutput(outputPath);
  await rm(outputPath, { force: true });
  const profile = path.join(os.tmpdir(), `rsrender-bld027-positive-${index}-profile`);
  await rm(profile, { recursive: true, force: true });
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        "--rsrender-bld027-probe",
        `--rsrender-bld027-profile=${profile}`,
        `--rsrender-bld027-output=${outputPath}`,
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
  if (
    outcome.code !== 0 ||
    outcome.timedOut ||
    Buffer.byteLength(outcome.stderr) !== 0 ||
    after !== 0 ||
    !profileRemoved ||
    result.schema !== "rsrender.bld027.boring-log-pdf-probe.v1" ||
    result.result !== "PASS" ||
    result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    path.resolve(result.publication.destinationPath) !== path.resolve(outputPath) ||
    result.denials?.windowCount !== 1
  ) {
    throw new Error(`POSITIVE_PDF_PACKAGE_INVALID:${index}:${JSON.stringify({ outcome, result })}`);
  }
  const pageCount = result.publication.pageCount;
  const inspection =
    pageCount === 1
      ? await inspectBoringLogPdf({
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
          renderPrefix: path.join(temporaryPdfDirectory, `bld027-run-${index}-preview`),
        })
      : await inspectBoringLogPdfPackage({
          pdfPath: outputPath,
          expectedOrderedTitles: result.publication.orderedBoringLogIdentities.map((identity) =>
            identity === "urn:rsrender:boring-log:test-02"
              ? "BORING LOG TEST-02"
              : boringLogMvpFixture.metadata.documentTitle,
          ),
          expectedPageSizesPoints: Array.from({ length: pageCount }, () => [612, 792]),
          expectedProjectionDigest: result.publication.projectionDigest,
        });
  if (
    inspection.pdfSha256 !== result.publication.pdfDigest ||
    inspection.pdfBytes !== result.publication.pdfBytes
  ) {
    throw new Error(`PDF_ROUTE_INSPECTION_DIGEST_MISMATCH:${index}`);
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
      stdoutBytes: Buffer.byteLength(outcome.stdout),
      stderrBytes: Buffer.byteLength(outcome.stderr),
      stdoutSha256: sha256(Buffer.from(outcome.stdout)),
      stderrSha256: sha256(Buffer.from(outcome.stderr)),
      after,
      profileRemoved,
    }),
  });
}

async function sourceDigests() {
  const files = [
    "packages/layout-host/src/boring-log-publication-projection.ts",
    "packages/platform-electron-main/src/boring-log-pdf-publication.ts",
    "packages/platform-electron-main/src/boring-log-publication-route-broker.ts",
    "packages/platform-electron-main/src/boring-log-studio-preload-runtime.ts",
    "packages/platform-electron-main/src/semantic-editor-main.ts",
    "packages/renderer-ui/src/boring-log-studio-entry.ts",
    "packages/scene/src/boring-log-layout-engine.ts",
    "packages/test-support/src/boring-log-mvp-fixture.ts",
    "tooling/inspect-boring-log-pdf.mjs",
    "tooling/shell-package-bld027.mjs",
    "tooling/shell-run-bld027.mjs",
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

export async function runBoringLogPdfQualification({ record = false } = {}) {
  await mkdir(temporaryPdfDirectory, { recursive: true });
  await mkdir(finalPdfDirectory, { recursive: true });
  const packageResult = await packageBoringLogPdfStudio();
  const outputs = [
    path.join(temporaryPdfDirectory, "rsrender-boring-log-bld027-run-1.pdf"),
    finalPdfPath,
  ];
  const runCount = process.argv.includes("--once") ? 1 : 2;
  const runs = [];
  for (let index = 1; index <= runCount; index += 1) {
    runs.push(await runPackaged(packageResult, index, outputs[index - 1]));
  }
  const evidence = {
    schema: "rsrender.bld027.boring-log-pdf-evidence.v1",
    ticket: "BLD-027 / GitHub #71",
    result: "PASS",
    package: packageResult,
    finalPdfPath: runCount === 2 ? finalPdfPath : outputs[0],
    runs,
    claims: {
      sameResolvedScene: true,
      fixedNonWrappingProjection: true,
      electronPrintToPdf: true,
      mainOwnedCreateNewPublication: true,
      reopenedDigestVerification: true,
      normalizedPdfInspection: true,
      taggedTargetObserved: true,
      selectableTextObserved: true,
      embeddedSubsetFontsObserved: true,
      rasterShortcut: false,
      replaceExisting: false,
      pdfUaConformance: false,
      qualifiedDestinationDurability: false,
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
      await runBoringLogPdfQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
