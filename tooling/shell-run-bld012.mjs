import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { pathToFileURL } from "node:url";

import {
  applicationVersionContractRevision,
  canonicalizeJson,
} from "../packages/contracts/dist/index.js";
import { applicationVersionQueryHandlerRevision } from "../packages/application/dist/index.js";
import {
  applicationVersionTransportRevision,
  expectedApplicationVersionPreloadSha256,
  generatedApplicationVersionPreloadRevision,
} from "../packages/platform-electron-main/dist/index.js";
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
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", () => undefined);
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(new Error(`BLD012_PROCESS_QUERY_FAILED:${String(code)}`)),
    );
  });
}

async function processCount() {
  const output = await runPowerShell(
    "$target=$env:RSR_SHELL_EXE; @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $target }).Count",
    { RSR_SHELL_EXE: BLD006_PATHS.packagedExecutable },
  );
  const count = Number.parseInt(output, 10);
  if (!Number.isInteger(count) || count < 0) throw new Error("BLD012_PROCESS_COUNT_INVALID");
  return count;
}

async function waitForZero() {
  const started = Date.now();
  let count = await processCount();
  while (count !== 0 && Date.now() - started < 5_000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    count = await processCount();
  }
  return count;
}

async function terminateExactPidTree(rootProcessId) {
  if (!Number.isSafeInteger(rootProcessId) || rootProcessId <= 0) return;
  await runPowerShell(
    "$rootPid=[int]$env:RSR_ROOT_PID; $target=$env:RSR_SHELL_EXE; $all=@(Get-CimInstance Win32_Process); $root=@($all | Where-Object { [int]$_.ProcessId -eq $rootPid -and $_.ExecutablePath -eq $target }); if($root.Count -ne 1) { exit 0 }; $ids=New-Object 'System.Collections.Generic.HashSet[int]'; [void]$ids.Add($rootPid); do { $added=$false; foreach($p in $all) { if($ids.Contains([int]$p.ParentProcessId) -and -not $ids.Contains([int]$p.ProcessId)) { [void]$ids.Add([int]$p.ProcessId); $added=$true } } } while($added); $all | Where-Object { $ids.Contains([int]$_.ProcessId) } | Sort-Object ProcessId -Descending | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    {
      RSR_ROOT_PID: String(rootProcessId),
      RSR_SHELL_EXE: BLD006_PATHS.packagedExecutable,
    },
  );
}

async function runSession(index) {
  const before = await processCount();
  if (before !== 0) throw new Error("BLD012_PACKAGE_ALREADY_RUNNING");
  await rm(resultFile, { force: true });
  await rm(shellProfileRoot, { recursive: true, force: true });
  const outcome = await new Promise((resolve, reject) => {
    const child = spawn(BLD006_PATHS.packagedExecutable, ["--rsrender-bld006-probe"], {
      cwd: path.dirname(BLD006_PATHS.packagedExecutable),
      windowsHide: true,
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      void terminateExactPidTree(child.pid).finally(() => child.kill());
    }, 30_000);
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stdout, stderr, timedOut, rootProcessId: child.pid });
    });
  });
  if (outcome.timedOut || outcome.code !== 0) {
    await terminateExactPidTree(outcome.rootProcessId).catch(() => undefined);
  }
  const after = await waitForZero();
  if (after === 0) await rm(shellProfileRoot, { recursive: true, force: true });
  const profileRemoved = await access(shellProfileRoot).then(
    () => false,
    () => true,
  );
  const line = outcome.stdout
    .split(/\r?\n/u)
    .find((candidate) => candidate.startsWith(resultMarker));
  const result = line
    ? JSON.parse(Buffer.from(line.slice(resultMarker.length), "base64").toString("utf8"))
    : JSON.parse(await readFile(resultFile, "utf8"));
  await rm(resultFile, { force: true });
  return {
    index,
    result,
    process: {
      before,
      after,
      profileRemoved,
      exitCode: outcome.code,
      signal: outcome.signal,
      timedOut: outcome.timedOut,
      stdoutBytes: Buffer.byteLength(outcome.stdout),
      stderrBytes: Buffer.byteLength(outcome.stderr),
    },
  };
}

export async function collectBld012Evidence() {
  const startedAtUtc = new Date().toISOString();
  const sessionRuns = [];
  for (let index = 1; index <= 3; index += 1) sessionRuns.push(await runSession(index));
  const normalizedResultDigests = sessionRuns.map((session) =>
    sha256(Buffer.from(canonicalizeJson(session.result), "utf8")),
  );
  const sessions = sessionRuns.map((session, index) => ({
    index: session.index,
    normalizedResultSha256: normalizedResultDigests[index],
    result: {
      schema: session.result.schema,
      result: session.result.result,
      scope: session.result.scope,
      versions: session.result.versions,
      environment: session.result.environment,
      revisions: session.result.revisions,
      digests: session.result.digests,
      counters: session.result.counters,
      phases: session.result.phases,
      counts: session.result.counts,
      observations: session.result.observations,
      securityProfile: {
        ...session.result.securityProfile,
        ipcChannels: undefined,
        ipcChannelCount: session.result.securityProfile.ipcChannels.length,
      },
    },
    process: session.process,
  }));
  const appAsar = path.join(BLD006_PATHS.packagedDirectory, "resources", "app.asar");
  const sourceFiles = [
    "package-lock.json",
    "packages/contracts/src/application-version-contract.ts",
    "packages/contracts/src/index.ts",
    "packages/application/src/application-version-query-handler.ts",
    "packages/application/src/index.ts",
    "packages/platform-electron-main/package.json",
    "packages/platform-electron-main/src/application-version-route-broker.ts",
    "packages/platform-electron-main/src/generated-application-version-preload.ts",
    "packages/platform-electron-main/src/packaged-application-version-preload.ts",
    "packages/platform-electron-main/src/main.ts",
    "packages/platform-electron-main/src/security-profile.ts",
    "packages/renderer-ui/src/index.ts",
    "tests/bld-012-application-version-preload.test.mjs",
    "tooling/shell-package-bld006.mjs",
    "tooling/shell-package-bld012.mjs",
    "tooling/shell-run-bld012.mjs",
  ];
  const sourceSha256 = {};
  for (const relative of sourceFiles)
    sourceSha256[relative] = await hashFile(path.join(root, relative));
  const fixture = {
    identity: "FIX-BLD012-PACKAGED-APPLICATION-VERSION-001",
    revision: 1,
    packagedVersion: PACKAGING_PROFILE.applicationVersion,
    method: "rsrender.application.getVersion",
  };
  const failures = sessionRuns.flatMap((session) =>
    session.result.result === "PASS" &&
    session.process.exitCode === 0 &&
    !session.process.timedOut &&
    session.process.before === 0 &&
    session.process.after === 0 &&
    session.process.profileRemoved
      ? []
      : [{ session: session.index, result: session.result.result, process: session.process }],
  );
  if (new Set(normalizedResultDigests).size !== 1) {
    failures.push({ code: "FRESH_SESSION_RESULT_DRIFT", normalizedResultDigests });
  }
  const finishedAtUtc = new Date().toISOString();
  const evidence = {
    schema: "rsrender.bld012.application-version-evidence.v0",
    ticket: "BLD-012 / GitHub #56",
    startedAtUtc,
    finishedAtUtc,
    result: failures.length === 0 ? "PASS" : "FAIL",
    trace: ["PI-16", "PI-20", "P06-bounded-seam", "OA-GOLD-001", "OA-REP-001"],
    requirements: {
      productInvariants: ["PI-16", "PI-20"],
      acceptanceMatrix: { id: "P06", revision: "accepted-spec-2026-08-14" },
      fixturePolicies: ["OA-GOLD-001", "OA-REP-001"],
      liveObjective: "GitHub #56 Objective Done",
    },
    environment: {
      launcherNode: process.version,
      platform: process.platform,
      architecture: process.arch,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    sourceResult: {
      state: failures.length === 0 ? "PASS" : "FAIL",
      evidenceGrade: "G2_OBSERVED_PACKAGED_PLUS_G1_RELATIONAL",
      custodyClass: "SYNTHETIC_REPOSITORY_SAFE",
    },
    fixture: { ...fixture, sha256: sha256(Buffer.from(canonicalizeJson(fixture), "utf8")) },
    oracle: {
      version: "bld-012-packaged-oracle-v1",
      method:
        "exact schema/value/API-surface/rejection equality across three fresh packaged sessions",
      tolerance: "exact",
      freshSessionCount: 3,
      normalizedResultDigests,
      comparisonResult: new Set(normalizedResultDigests).size === 1 ? "EXACT_MATCH" : "DRIFT",
      gradeSplit: {
        G2_OBSERVED_PACKAGED: [
          "positive fixed-channel query through actual Electron IPC sender/main frame",
          "exact frozen page API and no Electron/Node/raw IPC global surface",
          "public late-capability rejection after rotation",
          "navigation/popup/permission/network denial and process/profile teardown",
        ],
        G1_RELATIONAL_IN_PACKAGED_PROCESS: [
          "cross-window/sender/frame/route, replay, malformed envelope, capability, generation, and query-schema broker matrix using live Electron object identities with fabricated relational contexts",
        ],
      },
      failures,
    },
    revisions: {
      applicationVersionContract: applicationVersionContractRevision,
      applicationVersionHandler: applicationVersionQueryHandlerRevision,
      applicationVersionTransport: applicationVersionTransportRevision,
      generatedPreload: generatedApplicationVersionPreloadRevision,
    },
    digests: {
      packagedExecutableSha256: await hashFile(BLD006_PATHS.packagedExecutable),
      packagedAppAsarSha256: await hashFile(appAsar),
      packageResultSha256: await hashFile(
        path.join(BLD006_PATHS.temporaryRoot, "package-result.json"),
      ),
      packagedPreloadSha256: expectedApplicationVersionPreloadSha256(),
      packageLockSha256: sourceSha256["package-lock.json"],
      applicationVersionContractSourceSha256:
        sourceSha256["packages/contracts/src/application-version-contract.ts"],
      applicationVersionHandlerSourceSha256:
        sourceSha256["packages/application/src/application-version-query-handler.ts"],
      applicationVersionTransportSourceSha256:
        sourceSha256["packages/platform-electron-main/src/application-version-route-broker.ts"],
      packagedHarnessSourceSha256: sourceSha256["tooling/shell-run-bld012.mjs"],
      packagingImplementationSourceSha256: sourceSha256["tooling/shell-package-bld006.mjs"],
      packagingWrapperSourceSha256: sourceSha256["tooling/shell-package-bld012.mjs"],
      packagedProbeSchemaSha256: normalizedResultDigests[0],
      securityProfileSha256: sha256(
        Buffer.from(canonicalizeJson(sessionRuns[0].result.securityProfile), "utf8"),
      ),
      sbomSha256: await hashFile(path.join(root, "artifacts", "bld-007-sbom.spdx.json")),
      dependencyCustodySha256: await hashFile(
        path.join(root, "artifacts", "bld-007-dependency-custody.json"),
      ),
      sourceSha256,
    },
    sessions,
    dependencyBoundary: {
      externalIdentityCount: 156,
      externalDelta: 0,
      internalEdgesAdded: [
        "@rsrender/platform-electron-main@0.0.0 -> @rsrender/application@0.0.0",
        "@rsrender/platform-electron-main@0.0.0 -> @rsrender/contracts@0.0.0",
      ],
    },
    privacy: {
      capabilityRetained: false,
      hostPathRetained: false,
      stdoutRetained: false,
      stderrRetained: false,
      credentialsRetained: false,
      clientDataRetained: false,
      scanner: {
        version: "bld-012-retained-evidence-scan-v1",
        rules: [
          "no Windows absolute host path",
          "no raw capability field",
          "no internal IPC channel literal",
          "no password/token/authorization field",
        ],
        result: "PENDING",
      },
    },
    rolesAndCustody: {
      executor: "implementation agent",
      observer: "independent adversarial reviewer",
      acceptanceOwner: "RSrender product owner",
      retention: "retain with BLD-012 source revision; invalidate on any rerun trigger",
    },
    rerunTriggers: [
      "Electron, Chromium, Node, preload, broker, contract, handler, packaged route, sender/frame/origin validation, security profile, package manifest, lock, or harness change",
      "Any retained source, SBOM, dependency custody, packaged binary, app.asar, preload, configuration, fixture, or schema digest change",
    ],
    nonClaims: [
      "Synthetic nonrepresentative one-query seam only",
      "Not full P06, document, file, source, auth, mutation, subscription, crash-rebind, release, installer, update, signing, or commercial acceptance",
      "BLD-006 evidence remains a historical no-preload baseline and is not rewritten by this result",
    ],
  };
  const retained = JSON.stringify(evidence);
  const privacyFailures = [
    /[A-Za-z]:\\\\(?:Users|frv)\\/u.test(retained) ? "HOST_PATH" : null,
    /"capability"\s*:/u.test(retained) ? "CAPABILITY_FIELD" : null,
    /rsrender:application-version:(?:bootstrap|query):v1/u.test(retained)
      ? "INTERNAL_CHANNEL"
      : null,
    /"(?:password|token|authorization)"\s*:/iu.test(retained) ? "SECRET_FIELD" : null,
  ].filter(Boolean);
  evidence.privacy.scanner.result = privacyFailures.length === 0 ? "PASS" : "FAIL";
  if (privacyFailures.length > 0) {
    evidence.oracle.failures.push({ code: "PRIVACY_SCAN_FAILED", privacyFailures });
    evidence.result = "FAIL";
    evidence.sourceResult.state = "FAIL";
  }
  if (recordEvidence) {
    await writeFile(
      path.join(root, "artifacts", "bld-012-application-version-evidence.json"),
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
  try {
    const evidence = await collectBld012Evidence();
    console.log(JSON.stringify({ result: evidence.result, sessions: evidence.sessions.length }));
    if (evidence.result !== "PASS") process.exitCode = 1;
  } catch {
    console.error(JSON.stringify({ result: "FAIL", code: "BLD012_HARNESS_FAILURE" }));
    process.exitCode = 1;
  }
}
