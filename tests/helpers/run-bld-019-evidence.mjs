import { execFile } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);
const runnerPath = "tests/helpers/run-bld-019-vectors.mjs";
const evidencePath = "artifacts/bld-019-override-render-dataset-application-evidence.json";
const retainedPaths = [
  "packages/contracts/src/override-render-dataset-application-contract.ts",
  "packages/contracts/src/index.ts",
  "packages/application/src/in-memory-override-render-dataset-service.ts",
  "packages/application/src/override-render-dataset-projection-replica.ts",
  "packages/application/src/index.ts",
  "tests/bld-019-override-render-dataset-application.test.mjs",
  "tests/helpers/bld-015-fixtures.mjs",
  "tests/helpers/bld-017-fixtures.mjs",
  "tests/helpers/bld-019-fixtures.mjs",
  "tests/helpers/bld-019-property-model.mjs",
  runnerPath,
  "tests/helpers/run-bld-019-evidence.mjs",
];
const prerequisitePaths = [
  "artifacts/bld-003-contract-evidence.json",
  "artifacts/bld-010-application-service-evidence.json",
  "artifacts/bld-013-aggregate-evidence-index.json",
  "artifacts/bld-013-aggregate-evidence-index-evidence.json",
  "artifacts/bld-014-diagnostic-fact-evidence.json",
  "artifacts/bld-015-source-snapshot-evidence.json",
  "artifacts/bld-016-project-input-revisions-evidence.json",
  "artifacts/bld-017-display-value-override-evidence.json",
  "artifacts/bld-018-project-domain-effect-history-evidence.json",
  "packages/contracts/src/application-service-contract.ts",
  "packages/contracts/src/project-domain-effect-contract.ts",
  "packages/domain/src/diagnostic-fact.ts",
  "packages/domain/src/source-snapshot.ts",
  "packages/domain/src/project-input-revisions.ts",
  "packages/domain/src/display-value-override.ts",
  "packages/domain/src/bounded-override-render-dataset.ts",
  "packages/application/src/in-memory-history-core.ts",
  "packages/application/src/project-domain-effect-state.ts",
];
const executedPaths = [
  "packages/contracts/dist/override-render-dataset-application-contract.js",
  "packages/contracts/dist/project-domain-effect-contract.js",
  "packages/contracts/dist/index.js",
  "packages/domain/dist/display-value-override.js",
  "packages/domain/dist/bounded-override-render-dataset.js",
  "packages/domain/dist/diagnostic-fact.js",
  "packages/domain/dist/value-record.js",
  "packages/domain/dist/project-input-revisions.js",
  "packages/domain/dist/source-snapshot.js",
  "packages/domain/dist/index.js",
  "packages/application/dist/in-memory-override-render-dataset-service.js",
  "packages/application/dist/override-render-dataset-projection-replica.js",
  "packages/application/dist/in-memory-history-core.js",
  "packages/application/dist/project-domain-effect-state.js",
  "packages/application/dist/index.js",
];
const authorityPaths = [
  "docs/planning/specifications/rsrender-architecture.md",
  "docs/planning/specifications/boring-log-domain-model.md",
  "docs/planning/specifications/rsrender-product-specification.md",
  "docs/planning/specifications/rsrender-phased-implementation-roadmap.md",
  "docs/planning/specifications/rsrender-acceptance-strategy.md",
  "docs/adr/0008-main-owned-application-core-and-least-capable-electron-topology.md",
];
const workspaceAndAdmissionPaths = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.base.json",
  "packages/contracts/package.json",
  "packages/domain/package.json",
  "packages/application/package.json",
  "docs/governance/bld-001-internal-dependency-admission.json",
  "docs/governance/bld-001-authority-approval-packet.md",
  "docs/governance/bld-007-workspace-topology-approvals.json",
  "artifacts/bld-007-dependency-enforcement-evidence.json",
  "artifacts/bld-007-dependency-custody.json",
  "artifacts/bld-007-sbom.spdx.json",
  "artifacts/bld-007-third-party-notices.txt",
  "artifacts/bld-007-asset-inventory.json",
];
const downstreamSyntheticSessionMarker = "synthetic-override-render-dataset-session";
if (
  retainedPaths.some((path) => path.includes(downstreamSyntheticSessionMarker)) ||
  executedPaths.some((path) => path.includes(downstreamSyntheticSessionMarker)) ||
  readFileSync("packages/application/src/index.ts", "utf8").includes(
    downstreamSyntheticSessionMarker,
  ) ||
  readFileSync("packages/application/dist/index.js", "utf8").includes(
    downstreamSyntheticSessionMarker,
  )
) {
  throw new Error("BLD-019 qualification must exclude downstream BLD-020 bootstrap bytes");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

for (const path of [
  ...retainedPaths,
  ...prerequisitePaths,
  ...executedPaths,
  ...authorityPaths,
  ...workspaceAndAdmissionPaths,
]) {
  if (!existsSync(path)) throw new Error(`BLD-019 retained path missing: ${path}`);
}

const privacyPatterns = [
  /C:\\Users\\/giu,
  /Authorization\s*:/giu,
  /Bearer\s+[A-Za-z0-9._~-]+/gu,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
  /(?:password|secret|token)\s*[:=]\s*["'][^"']+["']/giu,
];
const privacyMatches = retainedPaths.flatMap((path) => {
  const contents = readFileSync(path, "utf8");
  return privacyPatterns.flatMap((pattern) =>
    (contents.match(pattern) ?? []).map((match) => ({ path, match })),
  );
});
if (privacyMatches.length !== 0) throw new Error("BLD-019 privacy scan mismatch");

const targetedStartedAtUtc = new Date().toISOString();
const targeted = await execFileAsync(
  process.execPath,
  ["--test", "tests/bld-019-override-render-dataset-application.test.mjs"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 15 * 60 * 1_000,
  },
);
const targetedFinishedAtUtc = new Date().toISOString();
const targetedDurationMilliseconds =
  Date.parse(targetedFinishedAtUtc) - Date.parse(targetedStartedAtUtc);
if (targeted.stderr !== "") throw new Error("BLD-019 targeted suite wrote stderr");
for (const pattern of [
  /^ℹ tests 19$/mu,
  /^ℹ suites 0$/mu,
  /^ℹ pass 19$/mu,
  /^ℹ fail 0$/mu,
  /^ℹ cancelled 0$/mu,
  /^ℹ skipped 0$/mu,
  /^ℹ todo 0$/mu,
  /^ℹ duration_ms [0-9]+(?:\.[0-9]+)?$/mu,
]) {
  if (!pattern.test(targeted.stdout)) {
    throw new Error("BLD-019 targeted receipt mismatch");
  }
}
const targetedReceipt = Object.freeze({
  result: "PASS",
  exitCode: 0,
  tests: 19,
  passed: 19,
  failed: 0,
  startedAtUtc: targetedStartedAtUtc,
  finishedAtUtc: targetedFinishedAtUtc,
  durationMilliseconds: targetedDurationMilliseconds,
  stdoutBytes: Buffer.byteLength(targeted.stdout, "utf8"),
  stderrBytes: Buffer.byteLength(targeted.stderr, "utf8"),
  stdoutSha256: `sha256:${createHash("sha256").update(targeted.stdout).digest("hex")}`,
  stderrSha256: `sha256:${createHash("sha256").update(targeted.stderr).digest("hex")}`,
  command:
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; <admitted-node> --test tests/bld-019-override-render-dataset-application.test.mjs",
});

const startedAtUtc = new Date().toISOString();
const executions = [];
for (let processIndex = 0; processIndex < 3; processIndex += 1) {
  const childStartedAtUtc = new Date().toISOString();
  const run = await execFileAsync(process.execPath, [runnerPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 15 * 60 * 1_000,
  });
  const childFinishedAtUtc = new Date().toISOString();
  if (run.stderr !== "") throw new Error("BLD-019 evidence child wrote stderr");
  if (
    [run.stdout, run.stderr].some((contents) =>
      privacyPatterns.some((pattern) => (contents.match(pattern) ?? []).length !== 0),
    )
  ) {
    throw new Error("BLD-019 child privacy scan mismatch");
  }
  const output = JSON.parse(run.stdout);
  if (output.repetitions.length !== 2) throw new Error("BLD-019 repetition count mismatch");
  const repetitionDigests = output.repetitions.map(({ digest }) => digest);
  if (new Set(repetitionDigests).size !== 1) {
    throw new Error("BLD-019 within-process digest mismatch");
  }
  executions.push(
    Object.freeze({
      process: processIndex + 1,
      result: "PASS",
      exitCode: 0,
      startedAtUtc: childStartedAtUtc,
      finishedAtUtc: childFinishedAtUtc,
      durationMilliseconds: Date.parse(childFinishedAtUtc) - Date.parse(childStartedAtUtc),
      command:
        "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; <admitted-node> tests/helpers/run-bld-019-vectors.mjs",
      stdoutBytes: Buffer.byteLength(run.stdout, "utf8"),
      stderrBytes: Buffer.byteLength(run.stderr, "utf8"),
      stdoutSha256: `sha256:${createHash("sha256").update(run.stdout).digest("hex")}`,
      stderrSha256: `sha256:${createHash("sha256").update(run.stderr).digest("hex")}`,
      repetitionDigests,
      fixedDigest: output.repetitions[0].transcript.fixedDigest,
      transcript: output.repetitions[0].transcript,
      processDigest: sha256CanonicalJson(output),
    }),
  );
}
const finishedAtUtc = new Date().toISOString();
if (new Set(executions.map(({ processDigest }) => processDigest)).size !== 1) {
  throw new Error("BLD-019 cross-process digest mismatch");
}
const transcript = executions[0].transcript;
const expectedSeeds = [0x1900_0001, 0x1900_0002, 0x1900_0003];
const expectedInvariants = [
  "command-precondition",
  "replay-revision",
  "baseline",
  "projection-replica",
  "atomicity",
  "source-immutability",
];
const expectedCounterKeys = [
  "commandPrecondition",
  "replayRevision",
  "baseline",
  "projectionReplica",
  "atomicity",
  "sourceImmutability",
];
if (
  JSON.stringify(transcript.property.seeds) !== JSON.stringify(expectedSeeds) ||
  transcript.property.iterationsPerSeed !== 1_000 ||
  transcript.property.casesPerInvariant !== 3_000 ||
  JSON.stringify(transcript.property.invariants) !== JSON.stringify(expectedInvariants) ||
  JSON.stringify(transcript.property.summaries.map(({ seed }) => seed)) !==
    JSON.stringify(expectedSeeds) ||
  transcript.fixed.failures.length !== 0 ||
  transcript.property.failures.length !== 0 ||
  transcript.property.summaries.some(
    (summary) =>
      summary.iterations !== 1_000 ||
      summary.failures.length !== 0 ||
      JSON.stringify(Object.keys(summary.invariantChecks)) !==
        JSON.stringify(expectedCounterKeys) ||
      Object.values(summary.invariantChecks).some((count) => count !== 1_000),
  )
) {
  throw new Error("BLD-019 transcript scope mismatch");
}

const runtimePrivacyMatches = [targeted.stdout, targeted.stderr].flatMap((contents) =>
  privacyPatterns.flatMap((pattern) => contents.match(pattern) ?? []),
);
if (runtimePrivacyMatches.length !== 0) throw new Error("BLD-019 runtime privacy mismatch");
const executionReceipts = Object.freeze(
  executions.map(({ transcript: executionTranscript, ...receipt }) => {
    if (executionTranscript.schema !== transcript.schema) {
      throw new Error("BLD-019 execution transcript schema mismatch");
    }
    return Object.freeze(receipt);
  }),
);

const evidence = {
  schema: "rsrender.bld-019.override-render-dataset-application-evidence.v1",
  ticket: "BLD-019 / GitHub #63",
  result: "PASS",
  authority: {
    claimReference:
      "https://github.com/blaynesatcentral/RSrender/issues/63#issuecomment-5359649241",
    scope:
      "Early Application Core subset: set one Display Value Override, Undo, Redo, and full-refetch one revision-tagged source-original/effective Render Dataset projection",
  },
  environment: {
    executionProfile: "EP-PURE",
    evidenceGrade: "G1",
    node: transcript.runtime.node,
    nodeExecutableSha256: transcript.runtime.executableSha256,
    locale: transcript.runtime.locale,
    timeZone: transcript.runtime.timeZone,
    npm: "11.16.0",
    typescript: "6.0.3",
    lockfileVersion: 3,
    lockfileSha256: sha256File("package-lock.json"),
    manifestLockOrTopologyChanged: false,
  },
  acceptance: {
    matrixRows: Object.freeze([
      {
        id: "D03",
        revision: sha256File("docs/planning/specifications/rsrender-acceptance-strategy.md"),
      },
      {
        id: "D04",
        revision: sha256File("docs/planning/specifications/rsrender-acceptance-strategy.md"),
      },
      {
        id: "S06",
        revision: sha256File("docs/planning/specifications/rsrender-acceptance-strategy.md"),
      },
    ]),
    productSections: ["product specification section 8"],
    admittedBoundedCapabilities: ["D03", "D04", "S06"],
    requiredOracleAxes: ["OA-PROV-001"],
    fixtureIds: ["FX-05", "FX-08"],
    propertyInvariantIds: ["PI-05", "PI-20"],
    acceptanceCriterion: "bounded AC-005",
    qualification:
      "Only the four named early Override/Render Dataset Application Core operations are qualified; full D03/D04/S06, AC-005, registry, packaged UI, MVP, and release acceptance are not claimed.",
  },
  contract: {
    operations: [
      "presentation-override.set-display-value",
      "history.undo",
      "history.redo",
      "render-dataset.get",
    ],
    publicFacadeKeys: ["setDisplayValue", "undo", "redo", "getProjection"],
    genericDispatcherExposed: false,
    refreshExposed: false,
    sourceSnapshotMutationAllowed: false,
    reassemblyCreatesStateOrHistory: false,
    sourceBaselineValueDigest: {
      field: "OverrideRenderValueProjection.sourceBaselineValueDigest",
      schema: "rsrender.source-baseline-value.v1",
      axes: ["content", "association", "finality", "eligibility", "unit"],
      excludedAxis: "source provenance",
      producer: "BLD-017 digestSourceBaselineValue(sourceOriginalValue)",
      directCommandUse:
        "The projected field is the exact expectedSourceValueDigest accepted by set-display-value.",
      carriers: ["projection", "query-result", "command-result", "event", "replica"],
    },
  },
  oracle: {
    generatorRevision: transcript.generatorRevision,
    oracleRevision: transcript.oracleRevision,
    seeds: transcript.property.seeds,
    iterationsPerSeed: transcript.property.iterationsPerSeed,
    invariants: transcript.property.invariants,
    casesPerInvariantPerRepetition: transcript.property.casesPerInvariant,
    freshProcesses: 3,
    repetitionsPerFreshProcess: 2,
    fullFreshExecutions: 6,
    totalCasesPerInvariant: transcript.property.casesPerInvariant * 6,
    normalizedRepetitionDigest: executions[0].repetitionDigests[0],
    processTranscriptDigest: executions[0].processDigest,
    fixedTranscriptDigest: transcript.fixedDigest,
    fixedTranscript: transcript.fixed,
    summaries: transcript.property.summaries,
    executions: executionReceipts,
    generatorWindow: { startedAtUtc, finishedAtUtc, failures: [] },
  },
  qualificationProtocol: {
    comparisonMethod:
      "Exact decoded structural equality plus canonical JSON SHA-256 digest equality",
    comparisonVersion: "bld-019-override-render-dataset-oracle-v1",
    tolerance: "zero semantic, revision, ordering, identity, provenance, or digest drift",
    warmups: 0,
    exclusions: [],
    executionOrder:
      "three fresh child processes executed sequentially; two full repetitions per child",
    injectedFaults: [
      "malformed and hostile command/query structures",
      "stale revision, replay drift, wrong document/owner, baseline/type/unit/rationale faults",
      "capacity exhaustion and projection replica sequence/generation/base/source mismatches",
      "omitted and wrong-valid sourceBaselineValueDigest in projection, query result, command result, event, and retained replica-state carriers; invalid retained state is discarded before full refetch",
      "each of five baseline axes changed independently while source-provenance-only change remained digest-neutral",
    ],
    predeclaredValidityRule:
      "PASS only when the admitted Node executable/locale/time zone match, the current targeted suite is 19/19/0, every one of three fresh processes completes two identical full repetitions, all six per-seed counters equal 1,000, stderr and failure inventories are empty, and all process digests agree exactly.",
    rawArtifactDigests: {
      targetedStdout: targetedReceipt.stdoutSha256,
      targetedStderr: targetedReceipt.stderrSha256,
      runnerSource: `sha256:${sha256File(runnerPath)}`,
      testSource: `sha256:${sha256File("tests/bld-019-override-render-dataset-application.test.mjs")}`,
      processTranscript: executions[0].processDigest,
    },
    normalizedArtifactDigests: {
      repetition: executions[0].repetitionDigests[0],
      fixedTranscript: transcript.fixedDigest,
      sourceSnapshotEncoding: transcript.fixed.sourceSnapshotEncodingDigest,
    },
    aggregateResult: "PASS",
    failures: [],
  },
  qualifyingTargetedRun: targetedReceipt,
  hashes: retainedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  prerequisites: prerequisitePaths.map((path) => ({ path, sha256: sha256File(path) })),
  executedJavaScript: executedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  authorities: authorityPaths.map((path) => ({ path, sha256: sha256File(path) })),
  workspaceAndAdmissionInputs: workspaceAndAdmissionPaths.map((path) => ({
    path,
    sha256: sha256File(path),
  })),
  fixtureAdmission: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    rightsState:
      "Repository-safe synthetic fixtures authored for RSrender internal qualification; no client, vendor, credential, restricted go-by, or third-party content",
    purpose:
      "Qualify the exact early Override/Render Dataset Application Core subset and no broader product behavior",
    sourcePaths: [
      "tests/helpers/bld-015-fixtures.mjs",
      "tests/helpers/bld-017-fixtures.mjs",
      "tests/helpers/bld-019-fixtures.mjs",
    ],
    sourceHashes: [
      "tests/helpers/bld-015-fixtures.mjs",
      "tests/helpers/bld-017-fixtures.mjs",
      "tests/helpers/bld-019-fixtures.mjs",
    ].map((path) => ({ path, sha256: sha256File(path) })),
    chain:
      "BLD-015 supplies the accepted synthetic Source Snapshot; BLD-017 supplies the Override/dataset fixtures and admitted minimal property Snapshot; BLD-019 supplies commands/service initialization. BLD-016 is a frozen aggregate ownership seam, not a fixture source.",
  },
  privacy: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    scanResult: "PASS",
    prohibitedMatches: privacyMatches.length,
    runtimeProhibitedMatches: runtimePrivacyMatches.length,
    runtimeOutputProhibitedMatches: runtimePrivacyMatches.length,
    runtimeOutputsScanned: {
      targeted: {
        stdoutBytes: Buffer.byteLength(targeted.stdout, "utf8"),
        stderrBytes: Buffer.byteLength(targeted.stderr, "utf8"),
        stdoutSha256: targetedReceipt.stdoutSha256,
        stderrSha256: targetedReceipt.stderrSha256,
      },
      children: executionReceipts.map(
        ({ process, stdoutBytes, stderrBytes, stdoutSha256, stderrSha256 }) => ({
          process,
          stdoutBytes,
          stderrBytes,
          stdoutSha256,
          stderrSha256,
        }),
      ),
    },
    scanner:
      "Literal scan for absolute Windows user paths, authorization/bearer shapes, private-key headers, and assigned password/secret/token values",
    scannedPaths: retainedPaths,
    containsHostUserPath: false,
    containsClientData: false,
    containsCredentials: false,
    rejectionEchoesInput: false,
  },
  sanitizedEnvironment: {
    operatingSystemFamily: process.platform === "win32" ? "Windows" : process.platform,
    architecture: process.arch,
    hardware: "not measured; EP-PURE semantic qualification only",
    storage: "not measured; no filesystem/storage behavior in scope",
    display: "not exercised",
    assistiveTechnology: "not exercised",
    network: "not exercised",
    usernameHostnameSerialTenantInternalPathRetained: false,
  },
  custody: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    acceptanceOwner: "RSrender Application Core acceptance owner",
    custodyOwner: "RSrender Application Core evidence owner",
    executorRole: "implementation agent",
    observerRole: "independent adversarial reviewer and integration owner",
    approvalReference:
      "https://github.com/blaynesatcentral/RSrender/issues/63#issuecomment-5359649241",
    rawLocation:
      "The bound test and tests/helpers/bld-019-*.mjs files retain fixed vectors, generator, oracle, transcript, and failure conditions.",
    normalizedLocation: evidencePath,
    retention:
      "Retain source, fixtures, oracle, generator, evidence, prerequisites, lock, and admitted Node bytes together until a recorded replacement supersedes them.",
    deletion:
      "Deletion or loss invalidates this bounded PASS and downstream citations until replacement qualification is retained.",
  },
  integrationGates: {
    rootIntegratedVerify: "PENDING_INTEGRATION_OWNER",
    dependencyAdmissionAndTopology: "PENDING_ROOT_INTEGRATED_GATES",
    boundedEpPureResultIndependentOfPendingGates: true,
  },
  amendmentIsolation: {
    supersedesPriorArtifactFileSha256:
      "8f1152c346ab65cad5cd1c04e67972f54f84ec0b681713b5c3c330a000926b7e",
    supersedesPriorCanonicalEvidenceDigest:
      "sha256:f61910a2bf436ce40cab494a98fc7902e93f417d0a3d7bea16facecd509c0867",
    baselineCommit: "aeddb7d99eef85940f346a8180e68a17be10d2bc",
    downstreamBld020Retained: false,
    downstreamBld020Executed: false,
    downstreamBld020ApplicationIndexExportPresent: false,
    amendmentPaths:
      "BLD-019 contract/service/tests/fixtures/property/runner/evidence/doc only; package manifests, lock, topology, and downstream BLD-020 are excluded.",
  },
  qualifyingFreshRun: {
    result: "PASS",
    startedAtUtc,
    finishedAtUtc,
    durationMilliseconds: Date.parse(finishedAtUtc) - Date.parse(startedAtUtc),
    runtime: transcript.runtime,
    processModel: "sequential 3 fresh processes x 2 identical full repetitions",
    warmups: 0,
    exclusions: [],
    exactWork:
      "Each repetition executes full-Snapshot set->query->repeat-query->Undo->query->Redo->query plus 3 seeds x 1,000 substantive public/schema cases for each of six invariants.",
    validity:
      "Valid only with exact admitted runtime, empty stderr/failure inventories, 19/19 targeted PASS, exact seeds/invariant/key order and counts, two equal repetition digests per process, and one equal process digest across all three processes.",
    perProcess: executionReceipts,
  },
  transitiveBindings: {
    bld014: "Diagnostic fact DTO and policy-key exclusion bound by retained evidence/source hashes",
    bld015:
      "Accepted Source Snapshot identity/logical/encoding/source-context/source-project bound by retained evidence/source hashes",
    bld016:
      "Phase1 aggregate and exact seven-handle ownership seam bound by retained evidence/source hashes",
    bld017:
      "Display Value Override collection and bounded Render Dataset assembler bound by retained evidence/source hashes",
    bld018:
      "Prepared project effect/history/replay atomicity seam bound by retained evidence/source hashes",
  },
  rerunTriggers: [
    "Any BLD-003, BLD-010, BLD-013, BLD-017, or BLD-018 prerequisite contract/evidence change",
    "Any command, query, result, event, projection, Override, collection, assembler, history, replay, atomicity, replica, source, identity, revision, digest, provenance, or Diagnostic change",
    "Any fixture, oracle, generator, source, export, executed JavaScript, prerequisite, manifest, lock, toolchain, locale, time-zone, authority, or retained hash change",
    "Introduction of a generic dispatcher, Refresh, broader registry, persistence, Electron/preload, UI, scene, PDF, or publication behavior",
    "Deletion or loss of retained raw or normalized evidence",
  ],
  rerunCommands: [
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\typescript\\bin\\tsc -b packages\\contracts packages\\domain packages\\application --force",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\prettier\\bin\\prettier.cjs --check <BLD-019 retained source/test/evidence/doc paths>",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\eslint\\bin\\eslint.js <BLD-019 retained source/test/helper paths>",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe --test tests\\bld-019-override-render-dataset-application.test.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe tests\\helpers\\run-bld-019-evidence.mjs",
    "After integration-owner coordination: & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\npm.cmd run verify",
  ],
  nonclaims: [
    "No full command registry, generic dispatcher/string command, Refresh, annotation, Supplemental/Resolution/extension command, or Data Track behavior is implemented.",
    "No filesystem, Electron/preload, source transport/auth, menu/keyboard UI, scene, PDF, or publication decision is implemented.",
    "The evidence qualifies bounded D03/D04/S06 Application Core behavior only, not full D03/D04/S06, AC-005, packaged UI, MVP, release, security, privacy, performance, or production acceptance.",
    "The queue yield occurs before the sole serializer reads authoritative state; reduction, prepared core commit, collection retention, and wrapper publication are synchronous with no yield afterward.",
  ],
  retainedFailureInventory: {
    aggregateFailures: [],
    fixedRejectionAndDiscardClasses: [
      "CONTRACT_MALFORMED",
      "REQUEST_ID_REUSE_MISMATCH",
      "DOCUMENT_IDENTITY_MISMATCH",
      "OWNER_GENERATION_MISMATCH",
      "STALE_WORKING_REVISION",
      "INVALID_BASELINE",
      "INVALID_VALUE_TYPE",
      "INVALID_UNIT",
      "INVALID_RATIONALE",
      "TARGET_NOT_FOUND",
      "DOMAIN_PRECONDITION_FAILED",
      "CAPACITY_EXHAUSTED",
      "NOTHING_TO_UNDO",
      "NOTHING_TO_REDO",
      "MINIMUM_WORKING_REVISION_UNAVAILABLE",
      "UNSUPPORTED_CURRENT_INPUT",
      "UNKNOWN_COMMAND",
      "INVALID_REPLICA_STATE",
      "NO_PROJECTION",
      "DOCUMENT_IDENTITY_CHANGED",
      "OWNER_GENERATION_CHANGED",
      "EVENT_SEQUENCE_GAP",
      "BASE_WORKING_REVISION_MISMATCH",
      "BEFORE_AGGREGATE_DIGEST_MISMATCH",
      "SOURCE_SNAPSHOT_CHANGED",
      "UNKNOWN_OR_MALFORMED_EVENT",
      "SOURCE_BASELINE_DIGEST_OMITTED_PROJECTION",
      "SOURCE_BASELINE_DIGEST_WRONG_VALID_PROJECTION",
      "SOURCE_BASELINE_DIGEST_WRONG_VALID_QUERY_RESULT",
      "SOURCE_BASELINE_DIGEST_WRONG_VALID_COMMAND_RESULT",
      "SOURCE_BASELINE_DIGEST_WRONG_VALID_EVENT",
      "SOURCE_BASELINE_DIGEST_WRONG_VALID_REPLICA_EVENT",
      "SOURCE_BASELINE_DIGEST_MISSING_RETAINED_REPLICA_STATE",
      "SOURCE_BASELINE_DIGEST_WRONG_VALID_RETAINED_REPLICA_STATE",
    ],
    amendmentVectorInventory: [
      "SOURCE_BASELINE_FIVE_AXIS_CHANGE",
      "SOURCE_BASELINE_PROVENANCE_ONLY_STABLE",
      "SOURCE_BASELINE_DIRECT_SET_SUCCESS",
      "SOURCE_BASELINE_SOURCE_OVERRIDE_UNDO_REDO_RETENTION",
      "SOURCE_SNAPSHOT_CUSTODY_UNCHANGED",
    ],
    classification:
      "Covered fixed rejection/discard classes exercised by this bounded suite; not a claim that every future union member exists or is covered.",
  },
};

const output = `${JSON.stringify(
  { ...evidence, evidenceDigest: sha256CanonicalJson(evidence) },
  null,
  2,
)}\n`;
writeFileSync(evidencePath, output, "utf8");
process.stdout.write(output);
