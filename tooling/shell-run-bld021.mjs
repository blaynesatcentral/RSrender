import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { expectedDocumentPreloadSha256 } from "../packages/platform-electron-main/dist/index.js";
import { packageSemanticEditor } from "./shell-package-bld021.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD021_RESULT=";
const artifactPath = path.join(root, "artifacts", "bld-021-semantic-editor-evidence.json");

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
  if (lines.length !== 1) throw new Error("PACKAGED_RESULT_MARKER_INVALID");
  return JSON.parse(Buffer.from(lines[0].slice(resultMarker.length), "base64").toString("utf8"));
}

async function runPackaged(packageResult, index) {
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  const profile = path.join(os.tmpdir(), `rsrender-bld021-positive-${index}-profile`);
  await rm(profile, { recursive: true, force: true });
  const startedAtUtc = new Date().toISOString();
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["--rsrender-bld021-probe", `--rsrender-bld021-profile=${profile}`],
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
    }, 60_000);
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
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
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
  const result = run.result;
  if (
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    result.schema !== "rsrender.bld021.semantic-editor-probe.v1" ||
    result.result !== "PASS" ||
    result.electronVersion !== "43.4.0" ||
    result.preloadSha256 !== expectedDocumentPreloadSha256() ||
    result.rendererSha256 !== packageResult.rendererSha256 ||
    canonicalizeJson(result.revisions) !==
      canonicalizeJson({
        initial: 0,
        set: 1,
        undo: 2,
        redo: 3,
        refetch: 3,
        staleRecovery: 4,
      }) ||
    result.semantic.initial.workingRevision !== "0" ||
    result.semantic.set.workingRevision !== "1" ||
    result.semantic.undo.workingRevision !== "2" ||
    result.semantic.redo.workingRevision !== "3" ||
    result.semantic.refetch.workingRevision !== "3" ||
    result.semantic.invalid.workingRevision !== "3" ||
    result.semantic.oversized.workingRevision !== "3" ||
    result.semantic.multiple.workingRevision !== "3" ||
    result.semantic.invalidType !== "INVALID_VALUE_TYPE" ||
    result.semantic.invalidUnit !== "INVALID_UNIT" ||
    result.semantic.staleRecovery.workingRevision !== "4" ||
    result.semantic.initial.dirty !== "No" ||
    result.semantic.set.dirty !== "Yes" ||
    result.semantic.undo.dirty !== "Yes" ||
    result.semantic.redo.dirty !== "Yes" ||
    result.semantic.initial.liveRegions !== 1 ||
    result.semantic.initial.canvasCount !== 0 ||
    result.denials.navigation < 1 ||
    result.denials.popup < 1 ||
    result.denials.windowCount !== 1
  ) {
    throw new Error(
      `POSITIVE_SESSION_INVALID:${run.index}:${JSON.stringify({ process: run.process, result })}`,
    );
  }
}

async function runPure(index) {
  const startedAtUtc = new Date().toISOString();
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", "tests/bld-021-semantic-editor.test.mjs"], {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  const receipt =
    /(?:ℹ|#) tests 6$/mu.test(outcome.stdout) &&
    /(?:ℹ|#) pass 6$/mu.test(outcome.stdout) &&
    /(?:ℹ|#) fail 0$/mu.test(outcome.stdout);
  if (outcome.code !== 0 || outcome.stderr !== "" || !receipt)
    throw new Error(`PURE_PROCESS_INVALID:${index}`);
  return Object.freeze({
    index,
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
    durationMs: Date.now() - started,
    exitCode: outcome.code,
    signal: outcome.signal,
    stdoutBytes: Buffer.byteLength(outcome.stdout),
    stdoutSha256: sha256(Buffer.from(outcome.stdout)),
    stderrBytes: 0,
    result: "PASS",
    fixedTests: 6,
  });
}

async function collect() {
  const startedAtUtc = new Date().toISOString();
  const pure = [];
  for (let processIndex = 1; processIndex <= 3; processIndex += 1) {
    for (let repetition = 1; repetition <= 2; repetition += 1) {
      pure.push(await runPure(`${processIndex}.${repetition}`));
    }
  }
  const packageResult = await packageSemanticEditor();
  const sessions = [];
  for (let index = 1; index <= 3; index += 1) {
    const run = await runPackaged(packageResult, index);
    assertPositive(run, packageResult);
    sessions.push(run);
  }
  const normalizedDigests = sessions.map((run) =>
    sha256(Buffer.from(canonicalizeJson(run.result), "utf8")),
  );
  if (new Set(normalizedDigests).size !== 1) throw new Error("PACKAGED_SESSION_DRIFT");
  const sourcePaths = [
    "package-lock.json",
    "packages/renderer-ui/src/index.ts",
    "packages/renderer-ui/src/semantic-override-editor-model.ts",
    "packages/renderer-ui/src/semantic-override-editor-route.ts",
    "packages/renderer-ui/src/semantic-override-editor-entry.ts",
    "packages/platform-electron-main/src/index.ts",
    "packages/platform-electron-main/src/semantic-editor-main.ts",
    "packages/platform-electron-main/src/semantic-editor-security-profile.ts",
    "packages/platform-electron-main/src/packaged-semantic-editor-renderer.ts",
    "tests/bld-021-semantic-editor.test.mjs",
    "tooling/shell-package-bld021.mjs",
    "tooling/shell-run-bld021.mjs",
  ];
  const sourceSha256 = {};
  for (const relative of sourcePaths)
    sourceSha256[relative] = sha256(await readFile(path.join(root, relative)));
  const evidence = {
    schema: "rsrender.bld021.semantic-editor-evidence.v1",
    ticket: "BLD-021 / GitHub #65",
    activation: "https://github.com/blaynesatcentral/RSrender/issues/65#issuecomment-5371851512",
    result: "PASS",
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
    environment: {
      node: process.version,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      electron: "43.4.0",
    },
    qualification: {
      pureProtocol: "3 fresh processes x 2 focused runs",
      packagedProtocol: "3 fresh full semantic editor sessions",
      pure,
      sessions,
      normalizedDigests,
      failures: [],
    },
    custody: {
      packageLockSha256: sourceSha256["package-lock.json"],
      executableSha256: packageResult.executableSha256,
      appAsarSha256: packageResult.appAsarSha256,
      preloadSha256: expectedDocumentPreloadSha256(),
      rendererSha256: packageResult.rendererSha256,
      sourceSha256,
    },
    privacy: {
      classification: "SYNTHETIC_REPOSITORY_SAFE",
      rawOutputsRetained: false,
      hostPathRetained: false,
      clientDataRetained: false,
      credentialsRetained: false,
      screenshotsRetained: false,
    },
    nonclaims: [
      "No Canvas/SVG, Contents tree, layout element, direct manipulation, template authoring, Save/Open/package document, source transport, Refresh, Supplemental/Resolution/Annotation workflow, Data Track, scene/PDF, representative usability, performance, screen-reader/AT acceptance, signed deployment, pilot, or release.",
      "This is bounded S06/D03/D04 packaged semantic-edit evidence, not full D03, D06, P06, E01, S07, Phase 1 exit, Production workspace acceptance, MVP, v0.9, or release evidence.",
    ],
  };
  const text = `${JSON.stringify(evidence, null, 2)}\n`;
  if (/C:\\\\Users\\\\|Bearer\s+[A-Za-z0-9._~-]+|PRIVATE KEY/u.test(text))
    throw new Error("PRIVACY_SCAN_FAILED");
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, text, "utf8");
  return Object.freeze({
    result: "PASS",
    artifact: path.relative(root, artifactPath).replaceAll("\\", "/"),
    artifactSha256: sha256(Buffer.from(text)),
    packagedExecutable: packageResult.paths.packagedExecutable,
    normalizedDigest: normalizedDigests[0],
  });
}

export { collect as collectBld021Evidence };

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) console.log(JSON.stringify(await collect()));
