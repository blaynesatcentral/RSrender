import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import { BLD006_PATHS, PACKAGING_PROFILE } from "./shell-package-bld006.mjs";

const root = path.resolve(import.meta.dirname, "..");
const resultMarker = "RSRENDER_BLD006_RESULT=";
const resultFile = path.join(os.tmpdir(), "rsrender-bld006-probe-result.json");
const shellProfileRoot = path.join(os.tmpdir(), "rsrender-bld006-shell-profile");
const recordEvidence = process.argv.includes("--record");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function hashFile(file) {
  return sha256(await readFile(file));
}

async function runPowerShell(script, extraEnvironment = {}) {
  const powershell = path.join(
    process.env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  return new Promise((resolve, reject) => {
    const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      env: { ...process.env, ...extraEnvironment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`BLD006_PROCESS_QUERY_FAILED:${code}:${stderr.trim()}`));
    });
  });
}

async function matchingProcessCount(executable) {
  const output = await runPowerShell(
    "$target=$env:RSR_SHELL_EXE; @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $target }).Count",
    { RSR_SHELL_EXE: executable },
  );
  const count = Number.parseInt(output, 10);
  if (!Number.isInteger(count) || count < 0) throw new Error("BLD006_PROCESS_COUNT_INVALID");
  return count;
}

async function stopExactPackagedProcesses(executable) {
  await runPowerShell(
    "$target=$env:RSR_SHELL_EXE; Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $target } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    { RSR_SHELL_EXE: executable },
  );
}

async function waitForZeroProcesses(executable, timeoutMilliseconds) {
  const started = Date.now();
  let count = await matchingProcessCount(executable);
  while (count !== 0 && Date.now() - started < timeoutMilliseconds) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    count = await matchingProcessCount(executable);
  }
  return count;
}

async function launchPackagedProbe(executable) {
  const before = await matchingProcessCount(executable);
  if (before !== 0) throw new Error("BLD006_PACKAGE_ALREADY_RUNNING");
  await rm(resultFile, { force: true });
  if (path.basename(shellProfileRoot) !== "rsrender-bld006-shell-profile") {
    throw new Error("BLD006_PROFILE_TARGET_INVALID");
  }
  await rm(shellProfileRoot, { recursive: true, force: true });

  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(executable, ["--rsrender-bld006-probe"], {
      cwd: path.dirname(executable),
      windowsHide: true,
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 30_000);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 1_000_000) child.kill();
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 1_000_000) child.kill();
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });

  if (outcome.timedOut) await stopExactPackagedProcesses(executable);
  const after = await waitForZeroProcesses(executable, 5_000);
  if (after === 0) await rm(shellProfileRoot, { recursive: true, force: true });
  return { before, after, profileRemoved: after === 0, ...outcome };
}

function sanitizedDiagnostic(value) {
  return value
    .replaceAll(root, "[workspace]")
    .replaceAll(process.env.USERPROFILE ?? "[no-user-profile]", "[user-profile]")
    .slice(0, 2_000);
}

async function parsePackagedResult(run) {
  const { stdout } = run;
  const line = stdout.split(/\r?\n/u).find((candidate) => candidate.startsWith(resultMarker));
  if (line) {
    const payload = line.slice(resultMarker.length);
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  }
  try {
    const fileResult = JSON.parse(await readFile(resultFile, "utf8"));
    await rm(resultFile, { force: true });
    return fileResult;
  } catch {
    throw new Error(
      `BLD006_RESULT_MARKER_MISSING:${JSON.stringify({
        exitCode: run.code,
        signal: run.signal,
        timedOut: run.timedOut,
        stdoutBytes: Buffer.byteLength(run.stdout),
        stderrBytes: Buffer.byteLength(run.stderr),
        stdout: sanitizedDiagnostic(run.stdout),
        stderr: sanitizedDiagnostic(run.stderr),
      })}`,
    );
  }
}

async function collectEvidence() {
  const packageResult = JSON.parse(
    await readFile(path.join(BLD006_PATHS.temporaryRoot, "package-result.json"), "utf8"),
  );
  const run = await launchPackagedProbe(BLD006_PATHS.packagedExecutable);
  const packagedResult = await parsePackagedResult(run);
  const appAsar = path.join(BLD006_PATHS.packagedDirectory, "resources", "app.asar");
  const sourceFiles = [
    "package.json",
    "package-lock.json",
    "packages/platform-electron-main/src/index.ts",
    "packages/platform-electron-main/src/main.ts",
    "packages/platform-electron-main/src/security-profile.ts",
    "packages/renderer-ui/src/index.ts",
    "tooling/shell-package-bld006.mjs",
    "tooling/shell-run-bld006.mjs",
    "tests/bld-006-electron-shell.test.mjs",
  ];
  const sourceSha256 = {};
  for (const relative of sourceFiles) {
    sourceSha256[relative] = await hashFile(path.join(root, relative));
  }

  const externalObservations = [
    {
      id: "PACKAGED_PROCESS_EXIT",
      pass: run.code === 0 && !run.timedOut,
      detail: `exitCode=${String(run.code)}; signal=${String(run.signal)}; timedOut=${run.timedOut}`,
      evidenceGrade: "OBSERVED_PACKAGED",
    },
    {
      id: "ZERO_ORPHAN_CHILDREN",
      pass: run.before === 0 && run.after === 0 && run.profileRemoved,
      detail: `matchingProcessesBefore=${run.before}; matchingProcessesAfter=${run.after}; profileRemoved=${run.profileRemoved}`,
      evidenceGrade: "OBSERVED_PACKAGED",
    },
    {
      id: "EXACT_BINARY_AND_CONFIG_RECORDED",
      pass:
        packageResult.result === "PASS" &&
        packagedResult.versions?.electron === PACKAGING_PROFILE.electronVersion,
      detail: `electron=${packagedResult.versions?.electron ?? "missing"}; packager=${PACKAGING_PROFILE.packagerVersion}; asar=${PACKAGING_PROFILE.asar}`,
      evidenceGrade: "OBSERVED_PACKAGED",
    },
  ];
  const observations = [...(packagedResult.observations ?? []), ...externalObservations];
  const result = observations.every((entry) => entry.pass) ? "PASS" : "FAIL";
  const evidence = {
    schema: "rsrender.bld006.empty-shell-evidence.v0",
    ticket: "BLD-006 / GitHub #50",
    generatedAtUtc: new Date().toISOString(),
    result,
    scope: "empty packaged Electron security shell baseline",
    trace: ["PI-16", "PI-20", "ADR-0007", "ADR-0008", "P06-harness-seam"],
    packageResult,
    packagedResult: {
      ...packagedResult,
      observations: undefined,
    },
    observations,
    counts: {
      passed: observations.filter((entry) => entry.pass).length,
      total: observations.length,
    },
    digests: {
      packagedExecutableSha256: await hashFile(BLD006_PATHS.packagedExecutable),
      packagedAppAsarSha256: await hashFile(appAsar),
      packageLockSha256: sourceSha256["package-lock.json"],
      packagingProfileSha256: sha256(Buffer.from(JSON.stringify(PACKAGING_PROFILE), "utf8")),
      sourceSha256,
    },
    processInventory: {
      exactExecutableMatchesBefore: run.before,
      exactExecutableMatchesAfter: run.after,
      exitCode: run.code,
      terminationSignal: run.signal,
      timedOut: run.timedOut,
      profileRemoved: run.profileRemoved,
    },
    testEnvironment: {
      launcherNode: process.version,
      platform: process.platform,
      architecture: process.arch,
      osRelease: os.release(),
      packagedElectron: packagedResult.versions,
    },
    privacy: {
      classification: "SYNTHETIC_LOCAL",
      retainedStdout: false,
      retainedStderr: false,
      hostnameRetained: false,
      usernameRetained: false,
      absolutePathRetained: false,
      productionDataRetained: false,
      credentialsRetained: false,
    },
    rerunCommands: [
      "npm run build",
      "npm run shell:package",
      "npm run shell:test:packaged",
      "npm run shell:verify",
    ],
    limitations: [
      "This is the bounded BLD-006 empty-shell baseline, not complete P06 or issue #37 acceptance.",
      "Renderer crash/rebind, utility processes, native decoding, fuses, signing, installer/update, and release security remain unproved here.",
      "The launcher Node version describes this host's test runner; the packaged Electron result records its embedded Node version separately.",
      "No app-supplied icon or asset was provided; admitted Electron runtime resources remain part of the packaged binary.",
    ],
  };
  if (recordEvidence) {
    await writeFile(
      path.join(root, "artifacts", "bld-006-empty-shell-evidence.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
  }
  return evidence;
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  const evidence = await collectEvidence();
  console.log(
    JSON.stringify({
      result: evidence.result,
      passed: evidence.counts.passed,
      total: evidence.counts.total,
      evidence: recordEvidence ? "artifacts/bld-006-empty-shell-evidence.json" : "not-recorded",
    }),
  );
  if (evidence.result !== "PASS") process.exitCode = 1;
}
