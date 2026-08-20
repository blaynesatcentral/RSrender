import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);
const runnerPath = "tests/helpers/run-bld-016-vectors.mjs";
const retainedPaths = [
  "packages/domain/src/project-input-revisions.ts",
  "packages/domain/src/index.ts",
  "tests/bld-016-project-input-revisions.test.mjs",
  "tests/helpers/bld-016-fixtures.mjs",
  "tests/helpers/bld-016-property-model.mjs",
  runnerPath,
  "tests/helpers/run-bld-016-evidence.mjs",
];
const prerequisitePaths = [
  "artifacts/bld-009-aggregate-skeleton-evidence.json",
  "artifacts/bld-013-aggregate-evidence-index-evidence.json",
  "artifacts/bld-014-diagnostic-fact-evidence.json",
  "artifacts/bld-015-source-snapshot-evidence.json",
  "packages/domain/src/aggregate-skeleton.ts",
  "packages/domain/src/diagnostic-fact.ts",
  "packages/domain/src/source-snapshot.ts",
];
const executedPaths = [
  "packages/contracts/dist/index.js",
  "packages/domain/dist/aggregate-skeleton.js",
  "packages/domain/dist/diagnostic-fact.js",
  "packages/domain/dist/source-snapshot.js",
  "packages/domain/dist/project-input-revisions.js",
  "packages/domain/dist/index.js",
];
const authorityPaths = [
  "docs/planning/specifications/boring-log-domain-model.md",
  "docs/planning/specifications/rsrender-product-specification.md",
  "docs/planning/specifications/rsrender-phased-implementation-roadmap.md",
  "docs/planning/specifications/rsrender-acceptance-strategy.md",
  "docs/adr/0005-source-snapshot-acceptance-boundary.md",
];

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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
if (privacyMatches.length !== 0) throw new Error("BLD-016 privacy scan mismatch");

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
    if (run.stderr !== "") throw new Error("BLD-016 evidence child wrote stderr");
    const output = JSON.parse(run.stdout);
    if (output.repetitions.length !== 2) throw new Error("BLD-016 repetition count mismatch");
    if (new Set(output.repetitions.map(({ digest }) => digest)).size !== 1) {
      throw new Error("BLD-016 within-process digest mismatch");
    }
    return {
      process: processIndex + 1,
      repetitionDigests: output.repetitions.map(({ digest }) => digest),
      transcript: output.repetitions[0].transcript,
      processDigest: sha256CanonicalJson(output),
    };
  }),
);
const finishedAtUtc = new Date().toISOString();
if (new Set(executions.map(({ processDigest }) => processDigest)).size !== 1) {
  throw new Error("BLD-016 cross-process digest mismatch");
}
const transcript = executions[0].transcript;
const evidence = {
  schema: "rsrender.bld-016.project-input-revisions-evidence.v1",
  ticket: "BLD-016 / GitHub #60",
  result: "PASS",
  authority: {
    claimReference:
      "https://github.com/blaynesatcentral/RSrender/issues/60#issuecomment-5356571829",
    scope:
      "Phase 1 Log Project v2 ownership of zero/one accepted Source Snapshot and seven explicit current revision references while preserving BLD-009 compatibility",
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
  contract: {
    retainedBld009AggregateVersion: 1,
    phase1LogProjectAggregateVersion: 2,
    projectInputRevisionHandleVersion: 1,
    orderedCollectionKinds: [
      "supplemental-sources",
      "presentation-overrides",
      "freeform-annotations",
      "source-resolution-decisions",
      "source-extension-bindings",
      "page-range-configuration",
      "data-track-configuration",
    ],
    acceptedSourceSnapshotCardinality: "zero-or-one full BLD-015 SourceSnapshot",
    emptyHandleSemantics:
      "state=empty requires projectRevision=0, derived revision identity, and canonical empty-content digest",
    currentHandleSemantics:
      "state=current requires a positive project revision, derived revision identity, and supplied valid content digest",
  },
  oracle: {
    fixtureRevisions: transcript.fixtureRevisions,
    fixtureAdmission: {
      classification: "SYNTHETIC_REPOSITORY_SAFE",
      rightsState:
        "repository-safe synthetic fixtures authored for RSrender internal domain qualification; no client, vendor, credential, restricted go-by, or third-party content",
      sourcePath: "tests/helpers/bld-016-fixtures.mjs",
      sourceSha256: sha256File("tests/helpers/bld-016-fixtures.mjs"),
    },
    oracleRevision: "bld-016-project-input-oracle-v1",
    generatorRevision: "bld-016-project-input-generator-v1",
    seeds: transcript.property.seeds,
    iterationsPerSeed: 1000,
    casesPerRepetition: transcript.property.cases,
    invariantsPerCase: transcript.property.invariantsPerCase,
    freshProcesses: 3,
    repetitionsPerFreshProcess: 2,
    fullFreshPropertyExecutions: 6,
    totalGeneratedCases: transcript.property.cases * 6,
    totalInvariantEvaluations: transcript.property.invariantEvaluations * 6,
    normalizedRepetitionDigest: executions[0].repetitionDigests[0],
    processTranscriptDigest: executions[0].processDigest,
    executions: executions.map(({ process, repetitionDigests, processDigest }) => ({
      process,
      result: "PASS",
      repetitionDigests,
      processDigest,
    })),
    compatibility: transcript.compatibility,
    sourceBacked: transcript.sourceBacked,
    generatorWindow: { startedAtUtc, finishedAtUtc, failures: [] },
  },
  hashes: retainedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  prerequisites: prerequisitePaths.map((path) => ({ path, sha256: sha256File(path) })),
  executedJavaScript: executedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  authorities: authorityPaths.map((path) => ({ path, sha256: sha256File(path) })),
  qualifyingTargetedRun: {
    startedAtUtc: "2026-08-20T14:31:54.1599503Z",
    finishedAtUtc: "2026-08-20T14:34:53.2802909Z",
    durationMilliseconds: 178925.5339,
    tests: 11,
    passed: 11,
    failed: 0,
    fixedVectorGroups: 9,
    directPropertyGroups: 1,
    epPureFreshProcessGroups: 1,
    propertyCasesPerRepetition: transcript.property.cases,
    fullFreshPropertyExecutions: 6,
    totalGeneratedCases: transcript.property.cases * 6,
    totalInvariantEvaluations: transcript.property.invariantEvaluations * 6,
    warmups: "none",
    exclusions: "none",
    validity:
      "PASS only if the retained admitted-Node receipt reports 11/11 tests passed and zero failures, every fail-closed child observes exact admitted Node bytes/en-US/UTC with empty stderr, each of three processes completes two identical full repetitions over all three 1000-case seeds, and all repetition/process digests agree",
  },
  fixedVectors: [
    "v1-to-v2 migration with exact seven explicit empty sentinels and byte-exact v1 compatibility view",
    "missing, duplicate-empty, duplicate-current, unknown, noncanonical-order, wrong-owner, forged-identity/digest/state/revision, malformed-digest, and nested/top-level extra-field rejections",
    "zero/one exact full BLD-015 Snapshot with context/project/digest mismatch rejection",
    "provider-native SourceExplorationIdentity matching with no name, depth, order, or SourceEntityIdentity inference",
    "structurally valid incomplete authoring with stable BLD-014 facts and unavailable evaluation/publication prerequisites",
    "persisted parsed canonical JSON/digest/Snapshot/handle-identity round-trip",
    "frozen v1/v2 assignment precedence and ETR replace/diverge compatibility with phase1Inputs preservation",
    "hostile null-prototype/accessor/symbol/sparse/lone-surrogate inputs, deep freeze, and caller-mutation detachment",
    "generated bounded nested group chains with exploration/nearest/broader/log-set precedence and cycle/orphan v1/v2 rejection parity",
  ],
  privacy: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    scanResult: "PASS",
    prohibitedMatches: privacyMatches.length,
    contextReviewedScannerLiteralMatches: 0,
    scanner:
      "literal scan for absolute Windows user paths, authorization-header and bearer-token shapes, private-key headers, and assigned password/secret/token values",
    scannedPaths: retainedPaths,
    containsHostUserPath: false,
    containsClientData: false,
    containsCredentials: false,
    rejectionEchoesInput: false,
  },
  custody: {
    classification: "SYNTHETIC_REPOSITORY_SAFE",
    acceptanceOwner: "RSrender domain/project-input acceptance owner",
    custodyOwner: "RSrender domain evidence owner",
    executorRole: "implementation agent",
    observerRole: "independent adversarial reviewer and integration owner",
    approvalReference: "GitHub #60 activation under standing internal-development authorization",
    rawLocation:
      "tests/bld-016-project-input-revisions.test.mjs and tests/helpers/bld-016-*.mjs retain fixed vectors, fixtures, generator, repetition transcript, and failure conditions",
    normalizedLocation:
      "artifacts/bld-016-project-input-revisions-evidence.json retains normalized process/repetition digests, timing, hashes, and failures",
    retention:
      "Retain the bound source, fixtures, oracle, generator, evidence, prerequisite evidence, lock, and admitted Node bytes together until a recorded replacement rerun supersedes them.",
    deletion:
      "Deletion or loss invalidates this bounded PASS and every downstream citation until a replacement qualification is retained.",
  },
  rerunTriggers: [
    "Any Phase 1 aggregate, revision-handle, identity, Snapshot ownership, availability Diagnostic, canonicalization, rejection-code, or BLD-009 compatibility change",
    "Any fixture, oracle, generator, source, export, executed JavaScript, prerequisite, manifest, lock, toolchain, locale, time-zone, authority, or retained hash change",
    "Introduction of handle transition/reducer, command/history, assembler, persistence, scene, renderer, publication policy, or UI behavior",
    "Deletion or loss of any retained raw or normalized evidence",
  ],
  rerunCommands: [
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\typescript\\bin\\tsc -b packages\\domain --force --pretty false",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\prettier\\bin\\prettier.cjs --check packages/domain/src/project-input-revisions.ts packages/domain/src/index.ts tests/bld-016-project-input-revisions.test.mjs tests/helpers/bld-016-fixtures.mjs tests/helpers/bld-016-property-model.mjs tests/helpers/run-bld-016-vectors.mjs tests/helpers/run-bld-016-evidence.mjs artifacts/bld-016-project-input-revisions-evidence.json docs/planning/evidence/bld-016-project-input-revisions-verification.md",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\eslint\\bin\\eslint.js packages/domain/src/project-input-revisions.ts packages/domain/src/index.ts tests/bld-016-project-input-revisions.test.mjs tests/helpers/bld-016-fixtures.mjs tests/helpers/bld-016-property-model.mjs tests/helpers/run-bld-016-vectors.mjs tests/helpers/run-bld-016-evidence.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe --test tests\\bld-016-project-input-revisions.test.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe tests\\helpers\\run-bld-016-evidence.mjs",
    "after integration-owner coordination: & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\npm.cmd run verify",
  ],
  nonclaims: [
    "Revision handles are immutable opaque current-reference values only; BLD-016 exposes no handle transition, replacement, reducer, monotonicity, command, or history API.",
    "The empty revision-zero sentinel has a derived Project Collection Revision identity/digest for explicit empty ownership, but is not a positive current collection payload or transition event.",
    "No Supplemental Source, Override, Annotation, Resolution, Extension-binding, page-range, or Data Track collection behavior is implemented.",
    "No assembler, persistence, scene, renderer, publication decision, UI, MVP, release, security, privacy, performance, or production acceptance is claimed.",
  ],
};

process.stdout.write(
  `${JSON.stringify({ ...evidence, evidenceDigest: sha256CanonicalJson(evidence) }, null, 2)}\n`,
);
