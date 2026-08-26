import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";

const root = path.resolve(import.meta.dirname, "..");
const evidencePath = path.join(root, "artifacts", "bld-042-font-palette-evidence.json");
const resultMarker = "RSRENDER_BLD025_RESULT=";

function parseResult(stdout) {
  const lines = stdout.split(/\r?\n/u).filter((line) => line.startsWith(resultMarker));
  if (lines.length !== 1) throw new Error(`BLD042_RESULT_MARKER_INVALID:${stdout}`);
  return JSON.parse(Buffer.from(lines[0].slice(resultMarker.length), "base64").toString("utf8"));
}

async function runPackagedWithWindowsHost(packageResult, index, options) {
  const executable = packageResult.paths.packagedExecutable;
  const profile = path.join(root, ".tmp", `f-${process.pid}-${index}-p`);
  const stdoutPath = path.join(root, ".tmp", `bld-042-${process.pid}-${index}.stdout.log`);
  const stderrPath = path.join(root, ".tmp", `bld-042-${process.pid}-${index}.stderr.log`);
  await rm(profile, { recursive: true, force: true });
  await rm(stdoutPath, { force: true });
  await rm(stderrPath, { force: true });
  const powershell = path.join(
    process.env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const script =
    "$probeArgs=@($env:RSR_PROBE,($env:RSR_PROFILE_PREFIX+$env:RSR_PROFILE)); " +
    "$process=Start-Process -FilePath $env:RSR_EXE -ArgumentList $probeArgs -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $env:RSR_STDOUT -RedirectStandardError $env:RSR_STDERR; " +
    "Write-Output $process.ExitCode";
  const started = Date.now();
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      env: {
        ...process.env,
        RSR_EXE: executable,
        RSR_PROBE: options.probeArgument,
        RSR_PROFILE_PREFIX: options.profileArgumentPrefix,
        RSR_PROFILE: profile,
        RSR_STDOUT: stdoutPath,
        RSR_STDERR: stderrPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => (output += String(chunk)));
    child.stderr.on("data", (chunk) => (errorOutput += String(chunk)));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(`BLD042_WINDOWS_HOST_FAILED:${errorOutput}`));
      else resolve(Number.parseInt(output.trim(), 10));
    });
  });
  const stdout = await readFile(stdoutPath, "utf8");
  const stderr = await readFile(stderrPath, "utf8");
  await rm(profile, { recursive: true, force: true });
  await rm(stdoutPath, { force: true });
  await rm(stderrPath, { force: true });
  return Object.freeze({
    index,
    durationMs: Date.now() - started,
    result: parseResult(stdout),
    process: Object.freeze({
      exitCode,
      signal: null,
      timedOut: false,
      stdoutBytes: Buffer.byteLength(stdout),
      stderrBytes: Buffer.byteLength(stderr),
      stderrText: stderr.slice(0, 2_000),
      after: 0,
      profileRemoved: true,
      launchHost: "windows-start-process",
    }),
  });
}

export async function runFontPaletteQualification({ record = false } = {}) {
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-f-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld042=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  // Windows may still be scanning freshly written Electron runtime DLLs after packaging returns.
  // Give that finite filesystem activity time to settle before the single clean qualification launch.
  await new Promise((resolve) => globalThis.setTimeout(resolve, 10_000));
  const runOptions = {
    profileLabel: `rsrender-bld042-font-palette-${process.pid}`,
    probeArgument: "--rsrender-bld042-font-probe",
    profileArgumentPrefix: "--rsrender-bld025-profile=",
    extraArguments: [],
    timeoutMs: 180_000,
  };
  const run = await runPackagedWithWindowsHost(packageResult, 1, runOptions);
  const attempts = [run];
  const result = run.result;
  if (
    result.schema !== "rsrender.bld042.font-palette-probe.v1" ||
    result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    result.applied?.faceId !== "font.face.source-serif-4.bold-italic" ||
    result.applied?.fontFaceDigest !==
      "sha256:7b215b37f8873f5579f3f8d2ded3ca7c588e2f435cd996605ebfc5befe2cd5eb" ||
    result.applied?.fontMetricsDigest !==
      "sha256:f057826173c7df47881637f459ea87cbb8af6836053dff0dc83921ad50772890" ||
    result.undone?.family !== "font.logical.rsrender-sans" ||
    result.redone?.faceId !== "font.face.source-serif-4.bold-italic" ||
    result.palette?.length !== 4
  ) {
    throw new Error(`BLD042_PACKAGED_FONT_PALETTE_INVALID:${JSON.stringify(run)}`);
  }
  const evidence = Object.freeze({
    schema: "rsrender.bld042.font-palette-evidence.v1",
    result: "PASS",
    package: packageResult,
    attempts: Object.freeze(attempts),
    run,
  });
  if (record) await writeFile(evidencePath, canonicalizeJson(evidence), "utf8");
  return evidence;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const evidence = await runFontPaletteQualification({ record: process.argv.includes("--record") });
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}
