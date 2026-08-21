import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { packageBoringLogEditor } from "./shell-package-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD025_RESULT=";
const artifactPath = path.join(root, "artifacts", "bld-026-boring-log-editor-evidence.json");

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

async function runPackaged(packageResult, index) {
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  const profile = path.join(os.tmpdir(), `rsrender-bld026-positive-${index}-profile`);
  await rm(profile, { recursive: true, force: true });
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["--rsrender-bld025-probe", `--rsrender-bld025-profile=${profile}`],
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
    }, 90_000);
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
  return Object.freeze({
    index,
    durationMs: Date.now() - started,
    result: parseResult(outcome.stdout),
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

function assertPositive(run, packageResult) {
  const { result, process } = run;
  if (
    process.exitCode !== 0 ||
    process.timedOut ||
    process.stderrBytes !== 0 ||
    process.after !== 0 ||
    !process.profileRemoved ||
    result.schema !== "rsrender.bld026.boring-log-editor-probe.v1" ||
    result.result !== "PASS" ||
    result.electronVersion !== "43.4.0" ||
    result.rendererSha256 !== packageResult.rendererSha256 ||
    result.initial.panes !== 3 ||
    result.initial.svg !== 1 ||
    result.initial.sceneNodes !== 227 ||
    result.initial.semanticElements !== 88 ||
    result.initial.raster !== 0 ||
    result.selection.selectedTreeRows !== 1 ||
    result.selection.selectedSceneNodes < 1 ||
    result.editing.before.readonly !== false ||
    result.editing.before.applyDisabled !== false ||
    result.editing.applied.source !== result.editing.before.source ||
    result.editing.applied.effective !== result.editing.replacement ||
    result.editing.undo.effective !== result.editing.before.source ||
    result.editing.redo.effective !== result.editing.replacement ||
    result.editing.redo.raster !== 0 ||
    result.editing.style.source !== "reference-varied-patterns" ||
    result.editing.style.effective !== "gravel-dot-ring" ||
    result.editing.style.patternedIntervals !== 3 ||
    result.editing.layout.source !== "142000" ||
    result.editing.layout.effective !== "160000" ||
    result.editing.layout.width !== "160000" ||
    result.editing.layout.followingX !== "263000" ||
    result.zoomPercent !== 90 ||
    result.denials.windowCount !== 1
  ) {
    throw new Error(`POSITIVE_EDITOR_INVALID:${run.index}:${JSON.stringify(run)}`);
  }
}

async function sourceDigests() {
  const files = [
    "packages/application/src/synthetic-boring-log-override-session.ts",
    "packages/layout-host/src/boring-log-text-authority.ts",
    "packages/platform-electron-main/src/boring-log-studio-projection.ts",
    "packages/platform-electron-main/src/boring-log-studio-route-broker.ts",
    "packages/platform-electron-main/src/boring-log-studio-preload-runtime.ts",
    "packages/platform-electron-main/src/semantic-editor-main.ts",
    "packages/renderer-ui/src/boring-log-studio-entry.ts",
    "packages/renderer-ui/src/boring-log-studio-route.ts",
    "packages/renderer-ui/src/boring-log-studio.css",
    "tooling/shell-package-bld026.mjs",
    "tooling/shell-run-bld026.mjs",
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

export async function runBoringLogEditorQualification({ record = false } = {}) {
  const packageResult = await packageBoringLogEditor();
  const runs = [];
  const runCount = process.argv.includes("--once") ? 1 : 2;
  for (let index = 1; index <= runCount; index += 1) {
    const run = await runPackaged(packageResult, index);
    assertPositive(run, packageResult);
    runs.push(run);
  }
  const evidence = {
    schema: "rsrender.bld026.boring-log-editor-evidence.v1",
    ticket: "BLD-026 / GitHub #70",
    result: "PASS",
    package: packageResult,
    runs,
    claims: {
      packagedExecutable: true,
      mainOwnedStructuredScene: true,
      layoutHostTextAuthority: true,
      semanticSvg: true,
      contentsCanvasPropertiesSelection: true,
      textAndValueEditing: true,
      sourceOriginalPreserved: true,
      undoRedo: true,
      rasterShortcut: false,
      styleAndLayoutEditing: true,
      pdfExport: false,
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
      await runBoringLogEditorQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
