import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);
const runnerPath = "tests/helpers/run-bld-018-vectors.mjs";
const evidencePath = "artifacts/bld-018-project-domain-effect-history-evidence.json";
const retainedPaths = [
  "packages/contracts/src/project-domain-effect-contract.ts",
  "packages/contracts/src/index.ts",
  "packages/application/src/project-domain-effect-state.ts",
  "packages/application/src/in-memory-history-core.ts",
  "packages/application/src/index.ts",
  "tests/bld-018-project-domain-effect-history.test.mjs",
  "tests/helpers/bld-009-fixtures.mjs",
  "tests/helpers/bld-015-fixtures.mjs",
  "tests/helpers/bld-016-fixtures.mjs",
  "tests/helpers/bld-018-property-model.mjs",
  runnerPath,
  "tests/helpers/run-bld-018-evidence.mjs",
];
const prerequisitePaths = [
  "artifacts/bld-010-application-service-evidence.json",
  "artifacts/bld-011-history-core-evidence.json",
  "artifacts/bld-013-aggregate-evidence-index-evidence.json",
  "artifacts/bld-013-aggregate-evidence-index.json",
  "artifacts/bld-016-project-input-revisions-evidence.json",
  "packages/contracts/src/application-service-contract.ts",
  "packages/contracts/src/history-core-contract.ts",
  "packages/domain/src/project-input-revisions.ts",
  "packages/test-support/src/aggregate-evidence-index.ts",
  "packages/application/src/in-memory-application-service.ts",
];
const executedPaths = [
  "packages/contracts/dist/project-domain-effect-contract.js",
  "packages/contracts/dist/index.js",
  "packages/domain/dist/project-input-revisions.js",
  "packages/domain/dist/index.js",
  "packages/application/dist/project-domain-effect-state.js",
  "packages/application/dist/in-memory-history-core.js",
  "packages/application/dist/index.js",
];
const authorityPaths = [
  "docs/planning/specifications/boring-log-domain-model.md",
  "docs/planning/specifications/rsrender-product-specification.md",
  "docs/planning/specifications/rsrender-phased-implementation-roadmap.md",
  "docs/planning/specifications/rsrender-acceptance-strategy.md",
  "docs/adr/0008-main-owned-application-core-and-least-capable-electron-topology.md",
];
const compatibilityPaths = [
  "packages/contracts/src/application-service-contract.ts",
  "packages/contracts/src/history-core-contract.ts",
  "packages/application/src/in-memory-application-service.ts",
  "tests/bld-010-application-service.test.mjs",
  "tests/bld-011-history-core.test.mjs",
  "artifacts/bld-010-application-service-evidence.json",
  "artifacts/bld-011-history-core-evidence.json",
];
const manifestWorkspaceAdmissionPaths = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "packages/contracts/package.json",
  "packages/domain/package.json",
  "packages/application/package.json",
  "docs/governance/bld-001-internal-dependency-admission.json",
  "docs/governance/bld-001-authority-approval-packet.md",
  "docs/governance/bld-007-workspace-topology-approvals.json",
  "artifacts/bld-007-dependency-enforcement-evidence.json",
  "artifacts/bld-007-dependency-custody.json",
];

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

for (const path of [
  ...retainedPaths,
  ...prerequisitePaths,
  ...executedPaths,
  ...authorityPaths,
  ...compatibilityPaths,
  ...manifestWorkspaceAdmissionPaths,
]) {
  if (!existsSync(path)) throw new Error(`BLD-018 retained path missing: ${path}`);
}

const bld011Evidence = JSON.parse(readFileSync("artifacts/bld-011-history-core-evidence.json"));
const bld011ArtifactHash = (path) =>
  bld011Evidence.artifacts.find((artifact) => artifact.path === path)?.sha256 ?? null;
const frozenBld011Baseline = Object.freeze({
  implementationSha256: bld011ArtifactHash("packages/application/src/in-memory-history-core.ts"),
  applicationIndexSha256: bld011ArtifactHash("packages/application/src/index.ts"),
});
if (
  frozenBld011Baseline.implementationSha256 !==
    "f7661c7b97403b67c057cb10ccddc142a68e90899a511e4d0ad95613ee80ff13" ||
  frozenBld011Baseline.applicationIndexSha256 !==
    "d36c1d04cfc985153901d6f8c771c2a0703c77ee939d1b3408fba98cd8f98725"
) {
  throw new Error("BLD-011 frozen baseline hash mismatch");
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
if (privacyMatches.length !== 0) throw new Error("BLD-018 privacy scan mismatch");

const targetedStartedAtUtc = new Date().toISOString();
const targetedRun = await execFileAsync(
  process.execPath,
  ["--test", "tests/bld-018-project-domain-effect-history.test.mjs"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30 * 60 * 1_000,
  },
);
const targetedFinishedAtUtc = new Date().toISOString();
if (targetedRun.stderr !== "") throw new Error("BLD-018 targeted suite wrote stderr");
if (
  !targetedRun.stdout.includes("tests 22") ||
  !targetedRun.stdout.includes("pass 22") ||
  !targetedRun.stdout.includes("fail 0")
) {
  throw new Error("BLD-018 targeted receipt mismatch");
}
const targetedReceipt = Object.freeze({
  result: "PASS",
  tests: 22,
  passed: 22,
  failed: 0,
  startedAtUtc: targetedStartedAtUtc,
  finishedAtUtc: targetedFinishedAtUtc,
  stdoutSha256: `sha256:${createHash("sha256").update(targetedRun.stdout).digest("hex")}`,
  stderrSha256: `sha256:${createHash("sha256").update(targetedRun.stderr).digest("hex")}`,
  command:
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; <admitted-node> --test tests/bld-018-project-domain-effect-history.test.mjs",
});

const compatibilityStartedAtUtc = new Date().toISOString();
const compatibilityRun = await execFileAsync(
  process.execPath,
  ["--test", "tests/bld-010-application-service.test.mjs", "tests/bld-011-history-core.test.mjs"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30 * 60 * 1_000,
  },
);
const compatibilityFinishedAtUtc = new Date().toISOString();
if (compatibilityRun.stderr !== "") throw new Error("BLD-010/011 regression wrote stderr");
if (
  !compatibilityRun.stdout.includes("tests 28") ||
  !compatibilityRun.stdout.includes("pass 28") ||
  !compatibilityRun.stdout.includes("fail 0")
) {
  throw new Error("BLD-010/011 regression receipt mismatch");
}
const compatibilityReceipt = Object.freeze({
  result: "PASS",
  tests: 28,
  passed: 28,
  failed: 0,
  startedAtUtc: compatibilityStartedAtUtc,
  finishedAtUtc: compatibilityFinishedAtUtc,
  stdoutSha256: `sha256:${createHash("sha256").update(compatibilityRun.stdout).digest("hex")}`,
  stderrSha256: `sha256:${createHash("sha256").update(compatibilityRun.stderr).digest("hex")}`,
  command:
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; <admitted-node> --test tests/bld-010-application-service.test.mjs tests/bld-011-history-core.test.mjs",
});

const startedAtUtc = new Date().toISOString();
const executions = await Promise.all(
  Array.from({ length: 3 }, async (_, processIndex) => {
    const run = await execFileAsync(process.execPath, [runnerPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      maxBuffer: 16 * 1024 * 1024,
      timeout: 30 * 60 * 1_000,
    });
    if (run.stderr !== "") throw new Error("BLD-018 evidence child wrote stderr");
    const output = JSON.parse(run.stdout);
    if (output.repetitions.length !== 2) throw new Error("BLD-018 repetition count mismatch");
    if (new Set(output.repetitions.map(({ digest }) => digest)).size !== 1) {
      throw new Error("BLD-018 within-process digest mismatch");
    }
    return Object.freeze({
      process: processIndex + 1,
      repetitionDigests: output.repetitions.map(({ digest }) => digest),
      fixedDigests: output.repetitions.map(({ transcript }) => transcript.fixedDigest),
      transcript: output.repetitions[0].transcript,
      processDigest: sha256CanonicalJson(output),
    });
  }),
);
const finishedAtUtc = new Date().toISOString();
if (new Set(executions.map(({ processDigest }) => processDigest)).size !== 1) {
  throw new Error("BLD-018 cross-process digest mismatch");
}
const transcript = executions[0].transcript;
const evidence = {
  schema: "rsrender.bld-018.project-domain-effect-history-evidence.v1",
  ticket: "BLD-018 / GitHub #62",
  result: "PASS",
  authority: {
    claimReference:
      "https://github.com/blaynesatcentral/RSrender/issues/62#issuecomment-5357998665",
    scope:
      "closed generic declarative Phase1 Project domain effect composition through the single existing in-memory history authority",
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
    domainCapability: "D04-Undo-Redo-and-revision-history",
    evidenceSeam: "bounded-pure-E03-captured-working-revision",
    principles: ["PI-20"],
    boundedCriteria: ["AC-001"],
    scopeQualification:
      "bounded pure project-domain effect/history composition only; not full D04, E03, or AC-001 acceptance",
  },
  contract: {
    effectVersion: 1,
    applicationKind: "phase1-project.aggregate.replace",
    aggregateContract: "Phase1LogProjectAggregate v2 / BLD-016",
    commandBytes:
      "inert canonical source-command JSON; digest derived and independently verified; never dispatched by BLD-018",
    directionProof:
      "before/after and forward/inverse replacement bytes each decode under BLD-016, re-encode canonically, match exact digests, and agree in both directions before preparation",
    replay:
      "source-command preflight is deliberately requestId+sourceCommandDigest only; effect composition replay binds full effectIdentity; retained semantic rejections advance replay metadata only",
    atomicity:
      "synchronous prepared transition rechecks immutable state and publishes aggregate plus exactly one history/event/replay result, or replay-only rejection metadata, through one state reference swap",
    publicRuntimeSurface:
      "mode-specific frozen facade; Phase1 facade has no legacy execute/query surface and raw state functions are not package runtime exports",
  },
  oracle: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    rightsState:
      "repository-safe synthetic fixtures authored for RSrender internal qualification; no client, vendor, credential, restricted go-by, or third-party content",
    fixtureSource: "tests/helpers/bld-018-property-model.mjs",
    fixtureSha256: sha256File("tests/helpers/bld-018-property-model.mjs"),
    generatorRevision: transcript.generatorRevision,
    oracleRevision: transcript.oracleRevision,
    seeds: transcript.property.seeds,
    iterationsPerSeed: transcript.property.iterationsPerSeed,
    invariants: transcript.property.invariants,
    casesPerRepetition: transcript.property.cases,
    invariantEvaluationsPerRepetition: transcript.property.invariantEvaluations,
    capacityPropertyClaim:
      "1,000 bounded-capacity upper-bound/no-eviction checks per seed; capacity exhaustion itself is covered by fixed per-axis vectors, not claimed as 3,000 generated exhaustion cases",
    freshProcesses: 3,
    repetitionsPerFreshProcess: 2,
    fullFreshExecutions: 6,
    totalGeneratedCases: transcript.property.cases * 6,
    totalInvariantEvaluations: transcript.property.invariantEvaluations * 6,
    fixedTranscriptDigest: transcript.fixedDigest,
    normalizedRepetitionDigest: executions[0].repetitionDigests[0],
    processTranscriptDigest: executions[0].processDigest,
    executions: executions.map(({ process, repetitionDigests, fixedDigests, processDigest }) => ({
      process,
      result: "PASS",
      repetitionDigests,
      fixedDigests,
      processDigest,
    })),
    propertySummaries: transcript.property.summaries,
    fixedTranscript: transcript.fixed,
    generatorWindow: { startedAtUtc, finishedAtUtc, failures: [] },
  },
  hashes: retainedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  prerequisites: prerequisitePaths.map((path) => ({ path, sha256: sha256File(path) })),
  executedJavaScript: executedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  authorities: authorityPaths.map((path) => ({ path, sha256: sha256File(path) })),
  compatibility: {
    result: "PASS",
    receipt: compatibilityReceipt,
    frozenBld011Baseline,
    currentGeneralizedAuthority: {
      implementationSha256: sha256File("packages/application/src/in-memory-history-core.ts"),
      applicationIndexSha256: sha256File("packages/application/src/index.ts"),
      relationship:
        "current source extends the same internal authority behind disjoint mode-specific facades; the frozen BLD-011 runtime contract/outcome is guarded by the retained 28/28 receipt",
    },
    frozenHashes: compatibilityPaths.map((path) => ({ path, sha256: sha256File(path) })),
  },
  dependencyAndWorkspace: {
    result: "NO_TOPOLOGY_DELTA_BY_BLD_018",
    externalIdentityCount: 156,
    addedExternalIdentities: 0,
    removedExternalIdentities: 0,
    changedExternalIdentities: 0,
    boundHashes: manifestWorkspaceAdmissionPaths.map((path) => ({
      path,
      sha256: sha256File(path),
    })),
    integratedVerification:
      "PENDING_INTEGRATION_OWNER_ROOT_VERIFY: final 156/156 dependency admission, package-boundary, architecture-boundary, and workspace checks are not claimed until the root integrated receipt passes",
  },
  qualifyingFreshRun: {
    startedAtUtc,
    finishedAtUtc,
    warmups: "none",
    exclusions: "none",
    validity:
      "PASS only if all three admitted-Node processes complete two identical fixed-plus-property repetitions under en-US/UTC with empty stderr, exact executable digest, 3 seeds x 1,000 operations x 5 named invariants, fail-closed fixed assertions, and identical repetition/process digests",
  },
  qualifyingTargetedRun: targetedReceipt,
  fixedVectors: [
    "strict effect create/decode/encode, derived command/effect/payload/aggregate digests, conventional effect URN, recursive freeze and caller detachment",
    "hostile prototype/accessor/symbol/hidden/sparse/extra-property/Unicode array and record rejection",
    "BLD-016 before/after/forward/inverse decode, canonical bytes, direction, document/context/project checks, forged inverse nonretention, and semantic invalid aggregate retention",
    "public commit, exact replay, changed full-effect reuse mismatch, retained wrong-document/owner/stale/before/capacity rejections, and digest-only pre-reducer source-command lookup",
    "prepared read-only preflight, wrong-token/state rejection, public same-revision one-commit/one-stale serialization, and exact aggregate/history/event/replay atomic deltas",
    "Undo, Redo, abandoned-branch replacement, monotonic working/event revision, capture immutability, durable baseline, and each bounded capacity axis",
    "inert lifecycle/storage/Refresh/callback-looking source-command and event-result JSON with retained metadata/digests and no dispatch",
    "exact legacy/Phase1 runtime facade keys, cross-mode method absence, and unchanged BLD-010/011 outcomes",
  ],
  privacy: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    scanResult: "PASS",
    prohibitedMatches: privacyMatches.length,
    scanner:
      "literal scan for absolute Windows user paths, authorization/bearer shapes, private-key headers, and assigned password/secret/token values",
    scannedPaths: retainedPaths,
    containsHostUserPath: false,
    containsClientData: false,
    containsCredentials: false,
    rejectionEchoesInput: false,
  },
  custody: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    acceptanceOwner: "RSrender application/history acceptance owner",
    custodyOwner: "RSrender application evidence owner",
    executorRole: "implementation agent",
    observerRole: "independent adversarial reviewer and integration owner",
    approvalReference: "GitHub #62 activation under standing internal-development authorization",
    rawLocation:
      "tests/bld-018-project-domain-effect-history.test.mjs and tests/helpers/bld-018-*.mjs retain fixed vectors, public-core generator/oracle, fail-closed assertions, and repetition transcript",
    normalizedLocation: evidencePath,
    retention:
      "Retain bound source, tests, generator/oracle, normalized evidence, prerequisite evidence, lock, and admitted Node bytes until a recorded replacement qualification supersedes them.",
    deletion:
      "Deletion or loss invalidates this bounded PASS and downstream citations until replacement qualification is retained.",
  },
  rerunTriggers: [
    "Any project-domain effect field, digest, identity, canonicalization, BLD-016 aggregate, forward/inverse, rejection, replay, prepared transition, history, event, Undo/Redo, capture, capacity, concurrency, facade, or export change",
    "Any BLD-010/011/013/016 prerequisite, fixture, oracle, generator, source, executed JavaScript, manifest, lock, topology, toolchain, locale, time-zone, authority, or retained hash change",
    "Introduction of Override/Refresh command semantics, Save/durable transition, storage/source access, Electron/IPC, renderer/UI, publication policy, lifecycle, workspace, or recovery behavior",
    "Deletion or loss of retained raw or normalized evidence",
  ],
  rerunCommands: [
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\typescript\\bin\\tsc -b packages\\contracts packages\\domain packages\\application --force --pretty false",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\prettier\\bin\\prettier.cjs --check packages/contracts/src/project-domain-effect-contract.ts packages/contracts/src/index.ts packages/application/src/project-domain-effect-state.ts packages/application/src/in-memory-history-core.ts packages/application/src/index.ts tests/bld-018-project-domain-effect-history.test.mjs tests/helpers/bld-018-property-model.mjs tests/helpers/run-bld-018-vectors.mjs tests/helpers/run-bld-018-evidence.mjs artifacts/bld-018-project-domain-effect-history-evidence.json docs/planning/evidence/bld-018-project-domain-effect-history-verification.md",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\eslint\\bin\\eslint.js packages/contracts/src/project-domain-effect-contract.ts packages/contracts/src/index.ts packages/application/src/project-domain-effect-state.ts packages/application/src/in-memory-history-core.ts packages/application/src/index.ts tests/bld-018-project-domain-effect-history.test.mjs tests/helpers/bld-018-property-model.mjs tests/helpers/run-bld-018-vectors.mjs tests/helpers/run-bld-018-evidence.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe --test tests\\bld-018-project-domain-effect-history.test.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe tests\\helpers\\run-bld-018-evidence.mjs",
    "after integration-owner coordination: & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\npm.cmd run verify",
  ],
  nonclaims: [
    "No Override, Refresh, source retrieval, storage, Save/durable revision transition, publication, lifecycle, workspace, recovery, Electron, IPC, renderer, or UI behavior is implemented.",
    "Source-command and event-result canonical JSON are inert audit bytes only; BLD-018 exposes no generic executable command, callback, reducer, plugin, script, or event dispatcher.",
    "The digest-only source-command replay lookup is a read-only pre-reducer seam for BLD-019; it is not full-effect replay authority and never admits an effect.",
    "No public raw state-machine runtime functions or second history authority are exported; type-only DTO/token exports do not create runtime capabilities.",
    "No performance, production, packaged, security, privacy, MVP, full D04, full E03, or full AC-001 acceptance is claimed.",
  ],
};

const artifact = { ...evidence, evidenceDigest: sha256CanonicalJson(evidence) };
writeFileSync(evidencePath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    result: artifact.result,
    evidenceDigest: artifact.evidenceDigest,
    startedAtUtc,
    finishedAtUtc,
    processDigest: executions[0].processDigest,
  })}\n`,
);
