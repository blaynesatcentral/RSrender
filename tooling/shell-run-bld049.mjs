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
import { inspectBoringLogPdfPackage } from "./inspect-boring-log-pdf-package.mjs";
import { packagePageSetupStudio } from "./shell-package-bld049.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD025_RESULT=";
const artifactPath = path.join(root, "artifacts", "bld-049-page-setup-evidence.json");
const pdfPath = path.join(root, "tmp", "pdfs", "rsrender-boring-log-bld049.pdf");

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
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

export async function runPageSetupQualification({ record = false } = {}) {
  await mkdir(path.dirname(pdfPath), { recursive: true });
  await rm(pdfPath, { force: true });
  const packageResult = await packagePageSetupStudio();
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  const profile = path.join(os.tmpdir(), "rsrender-bld049-page-setup-profile");
  await rm(profile, { recursive: true, force: true });
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        "--rsrender-bld049-probe",
        `--rsrender-bld027-profile=${profile}`,
        `--rsrender-bld027-output=${pdfPath}`,
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
    }, 180_000);
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
  const result = parseResult(outcome.stdout);
  if (
    outcome.code !== 0 ||
    outcome.timedOut ||
    Buffer.byteLength(outcome.stderr) !== 0 ||
    remainingProcesses !== 0 ||
    !profileRemoved ||
    result.schema !== "rsrender.bld049.page-setup-probe.v1" ||
    result.result !== "PASS" ||
    result.pageSetup?.applied?.pageSetup?.paperPreset !== "a4" ||
    result.pageSetup?.applied?.viewBox !== "0 0 595276 841890" ||
    result.pageSetup?.undo?.viewBox !== "0 0 612000 792000" ||
    result.pageSetup?.redo?.viewBox !== "0 0 595276 841890" ||
    result.pageSetup?.invalid?.workingRevision !== result.pageSetup?.redo?.workingRevision ||
    result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    path.resolve(result.publication.destinationPath) !== path.resolve(pdfPath) ||
    result.publication?.pageCount !== 2
  ) {
    throw new Error(
      `BLD049_PACKAGED_RESULT_INVALID:${JSON.stringify({ outcome, remainingProcesses, profileRemoved, result })}`,
    );
  }
  const inspection = await inspectBoringLogPdfPackage({
    pdfPath,
    expectedOrderedTitles: [boringLogMvpFixture.metadata.documentTitle, "BORING LOG TEST-02"],
    expectedPageSizesPoints: [
      [595.276, 841.89],
      [612, 792],
    ],
    expectedProjectionDigest: result.publication.projectionDigest,
    pageSizeTolerancePoints: 0.5,
  });
  if (
    inspection.pdfSha256 !== result.publication.pdfDigest ||
    inspection.pdfBytes !== result.publication.pdfBytes
  ) {
    throw new Error("BLD049_PDF_ROUTE_INSPECTION_DIGEST_MISMATCH");
  }
  const evidence = {
    schema: "rsrender.bld049.page-setup-evidence.v1",
    ticket: "BLD-049 / GitHub #93",
    result: "PASS",
    package: packageResult,
    durationMs: Date.now() - started,
    probe: result,
    inspection,
    process: {
      exitCode: outcome.code,
      signal: outcome.signal,
      timedOut: outcome.timedOut,
      stdoutBytes: Buffer.byteLength(outcome.stdout),
      stderrBytes: Buffer.byteLength(outcome.stderr),
      remainingProcesses,
      profileRemoved,
    },
    claims: {
      visibleLayoutControls: true,
      oneSharedHistoryCommand: true,
      undoRedoRestoresGeometry: true,
      invalidInputDoesNotMutate: true,
      screenAndPagePlanAgree: true,
      mixedPhysicalPdfPageBoxesVerified: true,
      chromiumPageSizeQuantizationBoundedToHalfPoint: true,
      embeddedSubsetUnicodeFonts: true,
      rasterImages: false,
      sharedDesktopPointerUsed: false,
    },
    sourceDigests: {
      pageSetup: sha256(
        await readFile(path.join(root, "packages", "scene", "src", "boring-log-page-setup.ts")),
      ),
      renderer: sha256(
        await readFile(
          path.join(root, "packages", "renderer-ui", "src", "boring-log-studio-entry.ts"),
        ),
      ),
      main: sha256(
        await readFile(
          path.join(root, "packages", "platform-electron-main", "src", "semantic-editor-main.ts"),
        ),
      ),
    },
  };
  const canonical = `${canonicalizeJson(evidence)}\n`;
  if (record) {
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, canonical, "utf8");
  }
  return Object.freeze({ ...evidence, evidenceSha256: sha256(Buffer.from(canonical, "utf8")) });
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  console.log(
    JSON.stringify(await runPageSetupQualification({ record: process.argv.includes("--record") })),
  );
}
