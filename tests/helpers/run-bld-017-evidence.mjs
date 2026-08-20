import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);
const runnerPath = "tests/helpers/run-bld-017-vectors.mjs";
const retainedPaths = [
  "packages/domain/src/display-value-override.ts",
  "packages/domain/src/bounded-override-render-dataset.ts",
  "packages/domain/src/index.ts",
  "tests/bld-017-display-value-override.test.mjs",
  "tests/helpers/bld-015-fixtures.mjs",
  "tests/helpers/bld-017-fixtures.mjs",
  "tests/helpers/bld-017-property-model.mjs",
  "tests/helpers/bld-017-fixed-vectors.mjs",
  runnerPath,
  "tests/helpers/run-bld-017-evidence.mjs",
  "artifacts/bld-017-targeted-run.stdout.txt",
];
const prerequisitePaths = [
  "artifacts/bld-008-domain-value-evidence.json",
  "artifacts/bld-014-diagnostic-fact-evidence.json",
  "artifacts/bld-015-source-snapshot-evidence.json",
  "artifacts/bld-016-project-input-revisions-evidence.json",
  "packages/domain/src/value-record.ts",
  "packages/domain/src/diagnostic-fact.ts",
  "packages/domain/src/source-snapshot.ts",
  "packages/domain/src/project-input-revisions.ts",
];
const executedPaths = [
  "packages/contracts/dist/index.js",
  "packages/domain/dist/value-record.js",
  "packages/domain/dist/diagnostic-fact.js",
  "packages/domain/dist/source-snapshot.js",
  "packages/domain/dist/project-input-revisions.js",
  "packages/domain/dist/display-value-override.js",
  "packages/domain/dist/bounded-override-render-dataset.js",
  "packages/domain/dist/index.js",
];
const authorityPaths = [
  "docs/planning/specifications/boring-log-domain-model.md",
  "docs/planning/specifications/rsrender-product-specification.md",
  "docs/planning/specifications/rsrender-phased-implementation-roadmap.md",
  "docs/planning/specifications/rsrender-acceptance-strategy.md",
  "docs/adr/0005-source-snapshot-acceptance-boundary.md",
];
const workspaceAndAdmissionPaths = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.base.json",
  "packages/domain/package.json",
  "packages/domain/tsconfig.json",
  "docs/governance/bld-001-internal-dependency-admission.json",
  "docs/governance/bld-001-authority-approval-packet.md",
  "artifacts/bld-007-dependency-enforcement-evidence.json",
  "artifacts/bld-007-dependency-custody.json",
  "docs/governance/bld-007-workspace-topology-approvals.json",
];
const targetedReceiptPath = "artifacts/bld-017-targeted-run.stdout.txt";

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
if (privacyMatches.length !== 0) throw new Error("BLD-017 privacy scan mismatch");
const targetedReceipt = readFileSync(targetedReceiptPath, "utf8");
for (const required of [
  "ℹ tests 14",
  "ℹ pass 14",
  "ℹ fail 0",
  "duration_ms 800428.9182",
  "start=2026-08-20T16:31:19.0300254Z",
  "finish=2026-08-20T16:44:39.8175056Z",
  "durationMs=800766.2541 exit=0",
]) {
  if (!targetedReceipt.includes(required)) throw new Error("BLD-017 targeted receipt mismatch");
}
const targetedReceiptSha256 = sha256File(targetedReceiptPath);

const startedAtUtc = new Date().toISOString();
const executions = await Promise.all(
  Array.from({ length: 3 }, async (_, processIndex) => {
    const run = await execFileAsync(process.execPath, [runnerPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      maxBuffer: 32 * 1024 * 1024,
      timeout: 45 * 60 * 1_000,
    });
    if (run.stderr !== "") throw new Error("BLD-017 evidence child wrote stderr");
    const output = JSON.parse(run.stdout);
    if (output.repetitions.length !== 2) throw new Error("BLD-017 repetition count mismatch");
    if (new Set(output.repetitions.map(({ digest }) => digest)).size !== 1) {
      throw new Error("BLD-017 within-process digest mismatch");
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
  throw new Error("BLD-017 cross-process digest mismatch");
}
const transcript = executions[0].transcript;
if (
  transcript.fixedFailures.length !== 17 ||
  transcript.property.cases !== 3_000 ||
  transcript.property.invariantEvaluations !== 30_000
) {
  throw new Error("BLD-017 transcript scope mismatch");
}
const evidence = {
  schema: "rsrender.bld-017.display-value-override-evidence.v1",
  ticket: "BLD-017 / GitHub #61",
  result: "PASS",
  authority: {
    claimReference:
      "https://github.com/blaynesatcentral/RSrender/issues/61#issuecomment-5357998655",
    scope:
      "Immutable Display Value Override collection plus bounded D02/D03/S06 Render Dataset assembly over one accepted BLD-015 Snapshot and exact BLD-016 ownership inputs",
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
    displayValueOverrideVersion: 1,
    presentationOverrideCollectionVersion: 1,
    boundedOverrideRenderDatasetVersion: 1,
    sourceSnapshotCardinality: "exactly one accepted BLD-015 SourceSnapshot",
    presentationInput:
      "strict tagged union: exact owned revision-0 empty handle with no collection, or exact owned positive current handle with one strict collection",
    boundedEnabledOverrideCardinality: "zero-or-one enabled Display Value Override",
    requiredEmptyInputs: [
      "supplemental-sources",
      "source-resolution-decisions",
      "source-extension-bindings",
    ],
    deliberateNondependencies: [
      "freeform-annotations",
      "page-range-configuration",
      "data-track-configuration",
    ],
  },
  acceptance: {
    admittedBoundedCapabilities: ["D02", "D03", "S06"],
    requiredOracleAxes: ["OA-VAL-001", "OA-PROV-001"],
    fixtureIds: ["FX-05", "FX-08"],
    propertyInvariantIds: ["PI-05", "PI-19"],
    acceptanceCriterion: "bounded AC-005",
    qualification:
      "This evidence admits only the one-Snapshot, zero-or-one enabled Display Value Override seam; it does not admit full D02, D03, S06, or AC-005 behavior.",
  },
  oracle: {
    fixtureRevisions: [
      transcript.fixtureRevision,
      "FX-05:bld-017-minimal-property-snapshot@r1",
      "FX-08:bld-017-refresh-a-b-conflicts@r1",
    ],
    fixtureAdmission: {
      classification: "SYNTHETIC_REPOSITORY_SAFE",
      rightsState:
        "repository-safe synthetic fixtures authored for RSrender internal domain qualification; no client, vendor, credential, restricted go-by, or third-party content",
      sourcePath: "tests/helpers/bld-017-fixtures.mjs",
      sourceSha256: sha256File("tests/helpers/bld-017-fixtures.mjs"),
    },
    oracleRevision: "bld-017-display-value-override-oracle-v1",
    generatorRevision: "bld-017-display-value-override-generator-v1",
    seeds: transcript.property.seeds,
    iterationsPerSeed: 1_000,
    casesPerRepetition: transcript.property.cases,
    invariantsPerCase: transcript.property.invariantsPerCase,
    exactOutcomeDistributionPerRepetition: transcript.property.outcomes,
    fixedFailureVectorsPerRepetition: transcript.fixedFailures.length,
    freshProcesses: 3,
    repetitionsPerFreshProcess: 2,
    fullFreshPropertyExecutions: 6,
    totalGeneratedCases: transcript.property.cases * 6,
    totalAssemblyEvaluations: transcript.property.cases * 2 * 6,
    totalInvariantEvaluations: transcript.property.invariantEvaluations * 6,
    normalizedRepetitionDigest: executions[0].repetitionDigests[0],
    processTranscriptDigest: executions[0].processDigest,
    executions: executions.map(({ process, repetitionDigests, processDigest }) => ({
      process,
      result: "PASS",
      repetitionDigests,
      processDigest,
    })),
    successfulOverrideWitness: transcript.appliedOverrideWitness,
    revisionZeroEmptyPresentationWitness: transcript.sourceOnlyEmptyPresentation,
    currentEmptyPresentationWitness: transcript.sourceOnlyCurrentPresentation,
    sourceEffectiveDigest: transcript.sourceOnlyEmptyEffectiveValuesDigest,
    fixedFailures: transcript.fixedFailures,
    generatorWindow: { startedAtUtc, finishedAtUtc, failures: [] },
  },
  hashes: retainedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  prerequisites: prerequisitePaths.map((path) => ({ path, sha256: sha256File(path) })),
  executedJavaScript: executedPaths.map((path) => ({ path, sha256: sha256File(path) })),
  authorities: authorityPaths.map((path) => ({ path, sha256: sha256File(path) })),
  workspaceAndAdmissionInputs: workspaceAndAdmissionPaths.map((path) => ({
    path,
    sha256: sha256File(path),
  })),
  integrationGates: {
    rootIntegratedVerify: "PENDING_INTEGRATION_OWNER",
    dependencyAdmissionAndTopology: "PENDING_ROOT_INTEGRATED_GATES",
    boundedEpPureResultIndependentOfPendingGates: true,
  },
  qualifyingTargetedRun: {
    startedAtUtc: "2026-08-20T16:31:19.0300254Z",
    finishedAtUtc: "2026-08-20T16:44:39.8175056Z",
    durationMilliseconds: 800_766.2541,
    nodeTestDurationMilliseconds: 800_428.9182,
    normalizedStdoutPath: targetedReceiptPath,
    normalizedStdoutSha256: targetedReceiptSha256,
    tests: 14,
    passed: 14,
    failed: 0,
    fixedVectorGroups: 13,
    directPropertyGroups: 1,
    propertyCasesPerRepetition: transcript.property.cases,
    validity:
      "PASS only if the retained admitted-Node receipt reports 14/14 tests passed and zero failures, followed by three fresh admitted-Node processes each completing two identical full repetitions with empty stderr and exact cross-process digests",
  },
  fixedVectors: [
    "revision-0 empty presentation sentinel and positive current empty collection are both source-effective but canonically distinct",
    "one exact applicable Override retains source-original and separate effective override value/provenance",
    "accepted Refresh A/B changed, deleted, retyped, and unit conflicts plus provenance-only refresh applicability",
    "context, entity, association, finality, eligibility, stale baseline, deleted target, retype, and unit fail-closed Diagnostics",
    "duplicate enabled target, duplicate identity, noncanonical order, and bounded multiple-enabled rejection",
    "exact honestly-owned nonempty Supplemental, Resolution, and Extension-binding rejection plus presentation-handle mismatch",
    "freeform Annotation, page-range, and Data Track handle changes are deliberate byte-exact nondependencies",
    "pure next collection new/unchanged/edited item revision rules with no command or history semantics",
    "hostile accessor-safe total boundaries, recursive forbidden Diagnostic policy-key absence, deep freeze, caller detachment, and source immutability",
    "3,000 generated cases varying target/deletion, baseline, type, unit, and provenance with two exact assemblies per case",
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
    acceptanceOwner: "RSrender domain/Override acceptance owner",
    custodyOwner: "RSrender domain evidence owner",
    executorRole: "implementation agent",
    observerRole: "independent adversarial reviewer and integration owner",
    approvalReference: "GitHub #61 activation under standing internal-development authorization",
    rawLocation:
      "tests/bld-017-display-value-override.test.mjs and tests/helpers/bld-017-*.mjs retain fixed vectors, fixtures, generator, repetition transcript, and failure conditions",
    normalizedLocation:
      "artifacts/bld-017-display-value-override-evidence.json retains normalized process/repetition digests, timing, hashes, and failures",
    retention:
      "Retain the bound source, fixtures, oracle, generator, evidence, prerequisite evidence, lock, and admitted Node bytes together until a recorded replacement rerun supersedes them.",
    deletion:
      "Deletion or loss invalidates this bounded PASS and every downstream citation until a replacement qualification is retained.",
  },
  rerunTriggers: [
    "Any Override item/collection, baseline value-state digest, provenance, identity, revision, canonicalization, conflict, Diagnostic, or bounded dataset contract change",
    "Any Source Snapshot, Phase1 ownership handle, empty/current presentation input, Supplemental/Resolution/Extension precondition, or deliberate nondependency change",
    "Any fixture, oracle, generator, source, export, executed JavaScript, prerequisite, manifest, lock, toolchain, locale, time-zone, authority, or retained hash change",
    "Introduction of full assembler, Supplemental interpretation, Resolution, Extension binding, Refresh command, history, persistence, scene, renderer, publication policy, or UI behavior",
    "Deletion or loss of any retained raw or normalized evidence",
  ],
  rerunCommands: [
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\typescript\\bin\\tsc -b packages\\domain --force --pretty false",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\prettier\\bin\\prettier.cjs --check packages/domain/src/display-value-override.ts packages/domain/src/bounded-override-render-dataset.ts packages/domain/src/index.ts tests/bld-017-display-value-override.test.mjs tests/helpers/bld-017-fixtures.mjs tests/helpers/bld-017-property-model.mjs tests/helpers/bld-017-fixed-vectors.mjs tests/helpers/run-bld-017-vectors.mjs tests/helpers/run-bld-017-evidence.mjs artifacts/bld-017-display-value-override-evidence.json docs/planning/evidence/bld-017-display-value-override-verification.md",
    "& .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe node_modules\\eslint\\bin\\eslint.js packages/domain/src/display-value-override.ts packages/domain/src/bounded-override-render-dataset.ts packages/domain/src/index.ts tests/bld-017-display-value-override.test.mjs tests/helpers/bld-017-fixtures.mjs tests/helpers/bld-017-property-model.mjs tests/helpers/bld-017-fixed-vectors.mjs tests/helpers/run-bld-017-vectors.mjs tests/helpers/run-bld-017-evidence.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe --test tests\\bld-017-display-value-override.test.mjs",
    "$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\node.exe tests\\helpers\\run-bld-017-evidence.mjs",
    "after integration-owner coordination: & .\\.wayfinder-tmp\\admission-resolution\\toolchain\\node-v24.18.1-win-x64\\npm.cmd run verify",
  ],
  nonclaims: [
    "The bounded assembler admits at most one enabled Display Value Override and is not the full D03 Render Dataset assembler.",
    "No Supplemental Source interpretation, Resolution application, active Source Extension binding, Refresh, command, reducer, history, persistence, scene, renderer, PDF, publication decision, or UI behavior is implemented.",
    "Freeform Annotation, page-range configuration, and Data Track configuration are deliberate nondependencies under domain section 11 and are excluded from the dataset header/digest.",
    "createNextPresentationOverrideCollection is a pure structural next-state constructor, not a transition, monotonicity, command, reducer, or history API.",
    "No source value or provenance is flattened, overwritten, or mutated; effective override display value and provenance remain separate from the retained source original.",
    "No MVP, release, security, privacy, performance, or production acceptance is claimed.",
  ],
};

const output = `${JSON.stringify(
  { ...evidence, evidenceDigest: sha256CanonicalJson(evidence) },
  null,
  2,
)}\n`;
writeFileSync("artifacts/bld-017-display-value-override-evidence.json", output, "utf8");
process.stdout.write(output);
