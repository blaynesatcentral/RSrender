import {
  EVIDENCE_MANIFEST_SCHEMA_VERSION,
  writeEvidenceManifest,
} from "../../packages/test-support/dist/index.js";

export const TEST_DIGEST = `sha256:${"5".repeat(64)}`;

function present(identity) {
  return { identity, state: "present", digest: TEST_DIGEST, reason: "not-applicable" };
}

function absent(identity, reason) {
  return { identity, state: "not-applicable", digest: "not-applicable", reason };
}

export function resultForState(state) {
  const base = {
    state,
    decisionClass: "technical",
    releaseContribution: "none",
    methodDefined: true,
    qualifyingEvidenceExecuted: false,
    requiredRepetitions: 2,
    completedRepetitions: 0,
    blockers: [],
    repetitions: [],
    failures: [],
    invalidationReasons: [],
    organizationalDecision: null,
  };

  if (state === "BLOCKED") {
    base.blockers = ["synthetic-prerequisite-not-present"];
  } else if (state === "PASS") {
    base.releaseContribution = "technical-pass";
    base.qualifyingEvidenceExecuted = true;
    base.completedRepetitions = 2;
    base.repetitions = [
      { repetitionId: "rep-001", state: "PASS", artifactRefs: ["normalized-result"] },
      { repetitionId: "rep-002", state: "PASS", artifactRefs: ["normalized-result"] },
    ];
  } else if (state === "FAIL") {
    base.qualifyingEvidenceExecuted = true;
    base.completedRepetitions = 2;
    base.repetitions = [
      { repetitionId: "rep-001", state: "PASS", artifactRefs: ["normalized-result"] },
      { repetitionId: "rep-002", state: "FAIL", artifactRefs: ["normalized-result"] },
    ];
    base.failures = [
      {
        code: "SYNTHETIC_ORACLE_FAILED",
        repetitionId: "rep-002",
        oracleId: "OA-GOLD-001",
        consequence: "The synthetic writer/validator result is not a pass.",
      },
    ];
  } else if (state === "INVALID") {
    base.qualifyingEvidenceExecuted = true;
    base.completedRepetitions = 1;
    base.repetitions = [
      { repetitionId: "rep-001", state: "INVALID", artifactRefs: ["normalized-result"] },
    ];
    base.invalidationReasons = ["synthetic-environment-mismatch"];
  } else if (state === "APPROVED" || state === "NOT_APPROVED") {
    base.decisionClass = "organizational";
    base.releaseContribution = state === "APPROVED" ? "organizational-approval" : "none";
    base.qualifyingEvidenceExecuted = true;
    base.requiredRepetitions = 0;
    base.organizationalDecision = {
      disposition: state,
      accountableFunction: "synthetic-authority-validator-exercise",
      decisionDateUtc: "2000-01-01T00:00:00Z",
      scopeReferences: ["TEST-BLD005-only"],
      conditions: ["not-an-actual-organizational-decision"],
      expiryOrReviewTrigger: "discard-after-validator-test",
      evidenceLocationReference: "synthetic-controlled-reference",
    };
  }
  return base;
}

export function evidenceDraft(state = "METHOD_NOT_RUN") {
  const result = resultForState(state);
  return {
    schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    manifestId: `test-bld005-${state.toLowerCase().replaceAll("_", "-")}`,
    manifestRevision: 1,
    evidencePurpose: "writer-validator-test",
    row: {
      matrixRowId: `TEST-BLD005-${state}`,
      matrixRevision: 1,
      productSpecificationSections: ["product-21-test-reference"],
      acceptanceCriteriaIds: ["AC-TEST-BLD005"],
      verificationClasses: state === "APPROVED" || state === "NOT_APPROVED" ? ["ORG"] : ["EQ"],
      acceptanceOwner: "test-support-maintainer-role",
    },
    fixtureEvidence: [
      {
        corpusVersion: "rsrender.golden-log-corpus.v1",
        fixtureId: "fx-01-smoke-short",
        fixtureRevision: 1,
        fixtureDigest: TEST_DIGEST,
        semanticLayer: "writer-validator-synthetic-metadata",
        oracleId: "OA-GOLD-001",
        oracleRevision: 1,
        provenanceState: "independently-authored-synthetic",
        admissionState: "test-vector-only",
        rightsState: "repository-safe-no-external-assets",
      },
    ],
    componentDigests: {
      applicationBinary: absent(
        "applicationBinary",
        "writer-validator test does not execute an app",
      ),
      dependencyLock: present("dependencyLock"),
      sbom: absent("sbom", "writer-validator test does not make a release inventory claim"),
      harness: present("harness"),
      schema: present("schema"),
      migration: absent("migration", "no migration is exercised"),
      commandContract: absent("commandContract", "no product command is exercised"),
      sceneEngine: absent("sceneEngine", "no scene is exercised"),
      electron: absent("electron", "no packaged application is exercised"),
      chromium: absent("chromium", "no layout host is exercised"),
      node: present("node"),
      fonts: absent("fonts", "no text metrics are exercised"),
      assets: absent("assets", "no external asset is exercised"),
    },
    environment: {
      profileId: "synthetic-pure-test-profile",
      executionProfile: "EP-PURE",
      osFamily: "Windows-sanitized",
      osBuildClass: "not-applicable-pure-test",
      architecture: "x64",
      hardwareClass: "not-applicable-pure-test",
      storageClass: "not-applicable-pure-test",
      displayClass: "not-applicable-pure-test",
      assistiveTechnology: [],
      locale: "invariant",
      timeZone: "UTC",
      softwareVersions: { node: "24.18.1", typescript: "6.0.3", schema: "v1" },
    },
    execution: {
      startUtc: "2000-01-01T00:00:00Z",
      endUtc: "2000-01-01T00:00:01Z",
      repetitions: result.decisionClass === "technical" ? result.requiredRepetitions : 0,
      warmups: 0,
      seeds: ["bld005-seed-001", "bld005-seed-002", "bld005-seed-003"],
      injectedFaults: [],
      exclusions: [
        {
          exclusionId: "product-row-execution",
          validityRule: "This manifest tests only writer/validator vocabulary.",
        },
      ],
    },
    artifacts: [
      {
        artifactId: "raw-result",
        artifactKind: "raw",
        mediaType: "application/octet-stream",
        digest: absent("raw-result", "no raw or restricted evidence was collected"),
        custodyClass: "repository-safe",
        locationKind: "not-collected",
        locationReference: "not-applicable",
      },
      {
        artifactId: "normalized-result",
        artifactKind: "normalized",
        mediaType: "application/json",
        digest: present("normalized-result"),
        custodyClass: "repository-safe",
        locationKind: "repository-relative",
        locationReference: "tests/helpers/bld-005-evidence-fixture.mjs",
      },
    ],
    comparison: {
      method: "exact-canonical-json-and-state-semantics",
      version: "bld-005-v1",
      tolerance: "exact-no-tolerance",
    },
    result,
    evidenceGrade: "G1",
    executorRoleCategory: "implementation-agent",
    observerRoleCategory: "automated-test",
    approvalOrConsentReference: "not-applicable-synthetic-test",
    privacy: {
      privacyClass: "repository-safe-synthetic",
      prohibitedContentScan: "passed",
      rawLocation: { state: "not-collected", reference: "not-applicable" },
    },
    retention: {
      retentionRule: "retain repository-safe test vector",
      deletionRule: "normal repository history",
      ownerFunction: "test-support-maintainer-role",
    },
    nonclaims: [
      "not-product-row-evidence",
      "not-an-acceptance-or-release-claim",
      "not-an-actual-organizational-decision",
      "not-representative",
    ],
    rerunTriggers: [
      "evidence schema or result-state semantic change",
      "runtime, canonicalization, or digest implementation change",
    ],
  };
}

export async function signedEvidence(state = "METHOD_NOT_RUN") {
  const result = await writeEvidenceManifest(evidenceDraft(state));
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result;
}
