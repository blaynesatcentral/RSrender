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
import { packageDocumentRoute } from "./shell-package-bld020.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD020_RESULT=";
const artifactPath = path.join(root, "artifacts", "bld-020-document-session-route-evidence.json");

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

async function runPackaged(packageResult, label) {
  const executable = packageResult.paths.packagedExecutable;
  if ((await processCount(executable)) !== 0) throw new Error("PACKAGE_ALREADY_RUNNING");
  const profile = path.join(os.tmpdir(), `rsrender-bld020-${label}-profile`);
  await rm(profile, { recursive: true, force: true });
  const startedAtUtc = new Date().toISOString();
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["--rsrender-bld020-probe", `--rsrender-bld020-profile=${profile}`],
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
    label,
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

function assertPositive(run) {
  const result = run.result;
  if (
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    result.schema !== "rsrender.bld020.packaged-document-route-probe.v1" ||
    result.result !== "PASS" ||
    result.electronVersion !== "43.4.0" ||
    result.preloadSha256 !== expectedDocumentPreloadSha256() ||
    canonicalizeJson(result.revisions) !==
      canonicalizeJson({ initial: 0, set: 1, undo: 2, redo: 3, refetch: 3, reload: 3 }) ||
    result.digests.initialDataset !== result.digests.undoDataset ||
    result.digests.setDataset !== result.digests.redoDataset ||
    result.denials.navigation < 1 ||
    result.denials.popup < 1 ||
    result.denials.rotation < 2 ||
    result.denials.windowCount !== 1
  )
    throw new Error(
      `POSITIVE_SESSION_INVALID:${run.label}:${JSON.stringify({ process: run.process, result: run.result })}`,
    );
}

function assertNegative(run) {
  if (
    run.process.exitCode !== 1 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    canonicalizeJson(run.result) !==
      canonicalizeJson({
        schema: "rsrender.bld020.packaged-document-route-probe.v1",
        result: "FAIL",
        code: "DOCUMENT_PRELOAD_UNAVAILABLE",
        diagnosticCode: "UNCLASSIFIED",
        windowCount: 0,
        sessionPresent: false,
      })
  )
    throw new Error(`NEGATIVE_SESSION_INVALID:${run.label}`);
}

async function runPure(index) {
  const startedAtUtc = new Date().toISOString();
  const started = Date.now();
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--test",
        "tests/bld-020-synthetic-override-render-dataset-session.test.mjs",
        "tests/bld-020-document-session-route.test.mjs",
      ],
      {
        cwd: root,
        windowsHide: true,
        env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  const exactReceipt =
    /ℹ tests 11$/mu.test(outcome.stdout) &&
    /ℹ pass 11$/mu.test(outcome.stdout) &&
    /ℹ fail 0$/mu.test(outcome.stdout) &&
    /ℹ cancelled 0$/mu.test(outcome.stdout) &&
    /ℹ skipped 0$/mu.test(outcome.stdout) &&
    /ℹ todo 0$/mu.test(outcome.stdout);
  if (outcome.code !== 0 || outcome.stderr !== "" || !exactReceipt)
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
    repetitions: 2,
    fixedTestsPerRepetition: 11,
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
  const exactPackage = await packageDocumentRoute("exact");
  const positives = [];
  for (let index = 1; index <= 3; index += 1)
    positives.push(await runPackaged(exactPackage, `positive-${index}`));
  for (const run of positives) assertPositive(run);
  if (new Set(positives.map((run) => run.result.ownerIdentitySha256)).size !== 3)
    throw new Error("OWNER_IDENTITY_NOT_FRESH");
  const normalizedPositiveDigests = positives.map((run) => {
    const normalized = Object.fromEntries(
      Object.entries(run.result).filter(([key]) => key !== "ownerIdentitySha256"),
    );
    return sha256(Buffer.from(canonicalizeJson(normalized), "utf8"));
  });
  if (new Set(normalizedPositiveDigests).size !== 1) throw new Error("POSITIVE_SESSION_DRIFT");
  const negatives = [];
  for (const variant of ["missing", "tampered", "wrong-route"]) {
    const packaged = await packageDocumentRoute(variant);
    const run = await runPackaged(packaged, `negative-${variant}`);
    assertNegative(run);
    negatives.push(run);
  }
  const sourcePaths = [
    "package-lock.json",
    "packages/application/src/synthetic-override-render-dataset-session.ts",
    "packages/platform-electron-main/src/document-main.ts",
    "packages/platform-electron-main/src/document-preload-bundle.ts",
    "packages/platform-electron-main/src/document-preload-runtime.ts",
    "packages/platform-electron-main/src/document-route-broker.ts",
    "packages/platform-electron-main/src/document-route-contract.ts",
    "packages/platform-electron-main/src/document-security-profile.ts",
    "packages/platform-electron-main/src/document-session-host.ts",
    "packages/platform-electron-main/src/document-session.ts",
    "packages/platform-electron-main/src/generated-document-preload.ts",
    "packages/platform-electron-main/src/packaged-document-preload.ts",
    "tests/bld-020-document-session-route.test.mjs",
    "tests/bld-020-synthetic-override-render-dataset-session.test.mjs",
    "tooling/generate-document-preload-bundle.mjs",
    "tooling/shell-package-bld020.mjs",
    "tooling/shell-run-bld020.mjs",
  ];
  const sourceSha256 = {};
  for (const relative of sourcePaths)
    sourceSha256[relative] = sha256(await readFile(path.join(root, relative)));
  const evidence = {
    schema: "rsrender.bld020.document-session-route-evidence.v1",
    ticket: "BLD-020 / GitHub #64",
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
      pureProtocol: "3 fresh processes x 2 identical focused runs",
      packagedProtocol:
        "3 fresh positive sessions plus missing/tampered/wrong-route preload variants",
      pure,
      positiveSessions: positives,
      negativeSessions: negatives,
      normalizedPositiveDigests,
      ownerIdentityDigests: positives.map((run) => run.result.ownerIdentitySha256),
      failures: [],
    },
    custody: {
      packageLockSha256: sourceSha256["package-lock.json"],
      packagedExecutableSha256: exactPackage.executableSha256,
      packagedAppAsarSha256: exactPackage.appAsarSha256,
      packagedPreloadSha256: expectedDocumentPreloadSha256(),
      sourceSha256,
    },
    privacy: {
      classification: "SYNTHETIC_REPOSITORY_SAFE",
      capabilityRetained: false,
      rawOwnerIdentityRetained: false,
      hostPathRetained: false,
      stdoutRetained: false,
      stderrRetained: false,
      clientDataRetained: false,
      credentialsRetained: false,
    },
    nonclaims: [
      "No filesystem, Save/Open, package document, source/auth/credential broker, multi-document workflow, generic event bridge, menu/shortcut registry, Canvas/layout/PDF, representative UI, signed release, full P06, or full E01 acceptance.",
      "Observed Electron fuse bytes are not a fuse-hardening, binary-hardening, distribution, MVP, pilot, or release claim.",
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
    normalizedPositiveSha256: normalizedPositiveDigests[0],
  });
}

export { collect as collectBld020Evidence };

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) console.log(JSON.stringify(await collect()));
