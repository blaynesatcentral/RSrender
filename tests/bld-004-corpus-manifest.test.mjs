import assert from "node:assert/strict";
import test from "node:test";

import {
  computeCorpusAdmissionRecordDigest,
  computeCorpusFixtureCandidateDigest,
  computeCorpusManifestDigest,
  CORPUS_DIAGNOSTIC_CODES,
  CORPUS_MANIFEST_SCHEMA_VERSION,
  GOLDEN_LOG_CORPUS_VERSION,
  readAdmittedCorpusManifest,
} from "../packages/test-support/dist/index.js";

const ZERO_DIGEST = `sha256:${"0".repeat(64)}`;
const ONE_DIGEST = `sha256:${"1".repeat(64)}`;
const ADMISSION_GATES = Object.freeze({
  "A1-synthetic-origin": "passed",
  "A2-prohibited-content-scan": "passed",
  "A3-mosaic-review": "passed",
  "A4-layer-eligibility": "passed",
  "A5-provenance-completeness": "passed",
  "A6-asset-rights": "passed",
  "A7-non-executable-content": "passed",
  "A8-integrity-resource-bounds": "passed",
  "A9-deterministic-rebuild": "passed",
  "A10-derivative-release": "passed",
});

function baseManifest() {
  return {
    schemaVersion: CORPUS_MANIFEST_SCHEMA_VERSION,
    corpusVersion: GOLDEN_LOG_CORPUS_VERSION,
    corpusRevision: 1,
    manifestDigest: ZERO_DIGEST,
    oracleRevisions: [
      { oracleId: "OA-GOLD-001", revision: 1, state: "decided" },
      { oracleId: "OA-REP-001", revision: 1, state: "accepted-uncertainty" },
    ],
    representativeLabelAllowed: false,
    fixtures: [
      {
        corpusVersion: GOLDEN_LOG_CORPUS_VERSION,
        fixtureId: "fx-01-smoke-short",
        fixtureRevision: 1,
        familyId: "FX-01",
        title: "Synthetic short-log smoke fixture",
        purpose: "Exercise metadata-only corpus admission without payload materialization.",
        originClass: "independently-authored-synthetic",
        layerClass: "render-dataset-synthetic",
        oracleStatus: {
          aggregate: "decided",
          oracles: [
            { oracleId: "OA-GOLD-001", revision: 1, state: "decided" },
            { oracleId: "OA-REP-001", revision: 1, state: "accepted-uncertainty" },
          ],
        },
        sourceContract: {
          contractId: "rsrender.synthetic.render-dataset.v1",
          schemaVersion: "1",
          origin: "synthetic",
          captureDigest: "not-applicable",
        },
        identityRules: {
          namespace: "urn:rsrender:fixture:fx-01-smoke-short",
          parentRule: "fixture-root",
          orderingKeys: ["depthFrom", "depthTo", "syntheticRecordId"],
          duplicateIdentityIntent: "forbidden",
        },
        unitContext: {
          depth: "ft",
          length: "in",
          pressure: "psf",
          percentage: "%",
          elevation: "ft",
          coordinate: "not-applicable",
          timeZone: "UTC",
        },
        collectionManifest: [
          {
            collectionId: "synthetic-strata",
            required: true,
            state: "success",
            recordCount: 1,
            paginationState: "complete",
            failureClass: "not-applicable",
          },
        ],
        valueStates: [
          "absent",
          "null",
          "empty-string",
          "empty-array",
          "numeric-zero",
          "not_available",
          "not_permitted",
          "malformed",
        ],
        inputParts: [
          {
            partId: "render-dataset-metadata",
            mediaType: "application/json",
            semanticLayer: "render-dataset-synthetic",
            byteLength: 0,
            digest: ZERO_DIGEST,
          },
        ],
        expectedArtifacts: [
          {
            artifactId: "diagnostics-oracle",
            artifactType: "diagnostics.json",
            semanticLayer: "cross-layer",
            formatVersion: "v1",
            digest: ONE_DIGEST,
            oracleIds: ["OA-GOLD-001", "OA-REP-001"],
          },
        ],
        diagnostics: [],
        workloadParameters: {
          parameterSetId: "not-applicable",
          representativeLabelAllowed: false,
          values: {},
        },
        privacy: {
          syntheticGenerationDeclared: true,
          prohibitedContentScan: "passed",
          mosaicRiskReview: "passed",
          approvalReference: "approval:bld-004:synthetic-v1",
        },
        rights: {
          repositoryUseStatus: "approved",
          approvalReference: "approval:bld-004:synthetic-v1",
          assets: [],
        },
        distributionClass: {
          repository: "approved",
          internalTest: "approved",
          editableTemplateProject: "not-approved",
          generatedPdf: "not-approved",
          productBundle: "not-approved",
          commercialDistribution: "not-approved",
          buyerTransfer: "not-reviewed",
        },
        integrityClass: "expected-valid",
        admissionDisposition: "admitted-canonical",
        determinism: {
          canonicalization: "JCS",
          hashAlgorithm: "sha256",
          generatorVersion: "not-applicable",
          seed: "not-applicable",
          environmentSensitiveInputs: [],
          claim: "semantic",
        },
        dependencies: {
          upstreamEvidence: ["corpus-specification-revision:2026-08-14"],
          downstreamTickets: ["#48"],
        },
        limitations: ["OA-REP-001", "not-representative", "not-a-supported-limit"],
        admissionRecord: {
          recordId: "admission:fx-01-smoke-short:r1",
          fixtureIdentity: "fx-01-smoke-short@r1",
          candidateDigest: ZERO_DIGEST,
          recordDigest: ZERO_DIGEST,
          disposition: "admitted-canonical",
          gates: { ...ADMISSION_GATES },
        },
      },
    ],
  };
}

async function signAdmissionRecords(manifest) {
  for (const fixture of manifest.fixtures) {
    fixture.admissionRecord.candidateDigest = await computeCorpusFixtureCandidateDigest(fixture);
    fixture.admissionRecord.recordDigest = await computeCorpusAdmissionRecordDigest(
      fixture.admissionRecord,
    );
  }
}

async function signManifest(manifest) {
  await signAdmissionRecords(manifest);
  manifest.manifestDigest = await computeCorpusManifestDigest(manifest);
  return manifest;
}

async function readWithSpy(manifestOrText) {
  const access = [];
  const source = {
    readManifestText() {
      access.push("manifest-text");
      return typeof manifestOrText === "string" ? manifestOrText : JSON.stringify(manifestOrText);
    },
    readPayload() {
      access.push("payload");
      throw new Error("The metadata reader must never receive payload authority.");
    },
    readRestrictedGoBy() {
      access.push("restricted-go-by");
      throw new Error("The metadata reader must never receive restricted-evidence authority.");
    },
  };
  const result = await readAdmittedCorpusManifest(source);
  assert.deepEqual(access, ["manifest-text"]);
  return result;
}

function diagnosticCodes(result) {
  assert.equal(result.ok, false);
  return result.diagnostics.map(({ code }) => code);
}

test("BLD-004 admits exact repository-safe synthetic metadata without materializing payloads", async () => {
  const input = await signManifest(baseManifest());
  const result = await readWithSpy(input);

  assert.equal(result.ok, true);
  assert.equal(result.manifest.fixtures[0].fixtureId, "fx-01-smoke-short");
  assert.equal(result.manifest.fixtures[0].layerClass, "render-dataset-synthetic");
  assert.equal(result.manifest.fixtures[0].originClass, "independently-authored-synthetic");
  assert.equal(result.manifest.fixtures[0].admissionDisposition, "admitted-canonical");
  assert.equal(result.manifest.claimRestrictions.oracleId, "OA-REP-001");
  assert.equal(result.manifest.claimRestrictions.representativeClaimAllowed, false);
  assert.equal(result.manifest.claimRestrictions.frequencyClaimAllowed, false);
  assert.equal(result.manifest.claimRestrictions.supportedLimitClaimAllowed, false);
  assert.equal(Object.isFrozen(result.manifest), true);
  assert.equal(Object.isFrozen(result.manifest.fixtures[0]), true);
  assert.equal("payload" in result.manifest.fixtures[0], false);
  assert.equal("records" in result.manifest.fixtures[0], false);
  assert.equal("filePath" in result.manifest.fixtures[0], false);
});

test("BLD-004 rejects prohibited and pending candidates without opening data", async () => {
  const prohibited = baseManifest();
  prohibited.fixtures[0].originClass = "restricted-approved-exception";
  await signManifest(prohibited);
  assert.ok(
    diagnosticCodes(await readWithSpy(prohibited)).includes(
      CORPUS_DIAGNOSTIC_CODES.prohibitedOrigin,
    ),
  );

  const pending = baseManifest();
  pending.fixtures[0].admissionDisposition = "pending";
  pending.fixtures[0].admissionRecord.disposition = "pending";
  await signManifest(pending);
  assert.ok(
    diagnosticCodes(await readWithSpy(pending)).includes(
      CORPUS_DIAGNOSTIC_CODES.admissionNotAdmitted,
    ),
  );
});

test("BLD-004 rejects missing, malformed, and mismatched integrity metadata", async () => {
  const wrongManifestDigest = await signManifest(baseManifest());
  wrongManifestDigest.fixtures[0].title = "Mutation after signing";
  assert.ok(
    diagnosticCodes(await readWithSpy(wrongManifestDigest)).includes(
      CORPUS_DIAGNOSTIC_CODES.manifestDigestMismatch,
    ),
  );

  const missingManifestDigest = await signManifest(baseManifest());
  delete missingManifestDigest.manifestDigest;
  assert.ok(
    diagnosticCodes(await readWithSpy(missingManifestDigest)).includes(
      CORPUS_DIAGNOSTIC_CODES.manifestDigestMissing,
    ),
  );

  const wrongAdmissionDigest = await signManifest(baseManifest());
  wrongAdmissionDigest.fixtures[0].admissionRecord.recordDigest = ONE_DIGEST;
  wrongAdmissionDigest.manifestDigest = await computeCorpusManifestDigest(wrongAdmissionDigest);
  assert.ok(
    diagnosticCodes(await readWithSpy(wrongAdmissionDigest)).includes(
      CORPUS_DIAGNOSTIC_CODES.admissionDigestMismatch,
    ),
  );

  const changedCandidate = await signManifest(baseManifest());
  changedCandidate.fixtures[0].purpose = "Changed after exact-candidate admission";
  changedCandidate.manifestDigest = await computeCorpusManifestDigest(changedCandidate);
  assert.ok(
    diagnosticCodes(await readWithSpy(changedCandidate)).includes(
      CORPUS_DIAGNOSTIC_CODES.admissionDigestMismatch,
    ),
  );

  const missingAdmissionDigest = await signManifest(baseManifest());
  delete missingAdmissionDigest.fixtures[0].admissionRecord.recordDigest;
  missingAdmissionDigest.manifestDigest = await computeCorpusManifestDigest(missingAdmissionDigest);
  assert.ok(
    diagnosticCodes(await readWithSpy(missingAdmissionDigest)).includes(
      CORPUS_DIAGNOSTIC_CODES.admissionDigestMissing,
    ),
  );
});

test("BLD-004 rejects evidence-layer mismatch", async () => {
  const input = baseManifest();
  input.fixtures[0].inputParts[0].semanticLayer = "source-snapshot-synthetic";
  await signManifest(input);
  assert.ok(
    diagnosticCodes(await readWithSpy(input)).includes(CORPUS_DIAGNOSTIC_CODES.layerMismatch),
  );
});

test("BLD-004 rejects duplicate fixture and admission identities without precedence", async () => {
  const input = baseManifest();
  input.fixtures.push(JSON.parse(JSON.stringify(input.fixtures[0])));
  await signManifest(input);
  const codes = diagnosticCodes(await readWithSpy(input));
  assert.ok(codes.includes(CORPUS_DIAGNOSTIC_CODES.fixtureDuplicateIdentity));
  assert.ok(codes.includes(CORPUS_DIAGNOSTIC_CODES.admissionDuplicateIdentity));
});

test("BLD-004 rejects unsupported versions, unknown fields, and invalid JSON", async () => {
  const unsupported = baseManifest();
  unsupported.schemaVersion = "rsrender.corpus-manifest.schema.v2";
  await signManifest(unsupported);
  assert.ok(
    diagnosticCodes(await readWithSpy(unsupported)).includes(
      CORPUS_DIAGNOSTIC_CODES.unsupportedVersion,
    ),
  );

  const unknownField = baseManifest();
  unknownField.fixtures[0].payload = { records: ["must-not-be-materialized"] };
  await signManifest(unknownField);
  assert.ok(
    diagnosticCodes(await readWithSpy(unknownField)).includes(
      CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
    ),
  );

  assert.ok(
    diagnosticCodes(await readWithSpy("{not-json")).includes(
      CORPUS_DIAGNOSTIC_CODES.manifestJsonInvalid,
    ),
  );
});

test("BLD-004 retains mandatory OA-REP-001 restrictions", async () => {
  const input = baseManifest();
  input.fixtures[0].limitations = ["OA-REP-001", "not-representative"];
  await signManifest(input);
  assert.ok(
    diagnosticCodes(await readWithSpy(input)).includes(
      CORPUS_DIAGNOSTIC_CODES.nonrepresentativeRestrictionMissing,
    ),
  );
});

test("BLD-004 diagnostics are stable for an identical rejected vector", async () => {
  const input = baseManifest();
  input.fixtures[0].admissionDisposition = "quarantined";
  input.fixtures[0].admissionRecord.disposition = "quarantined";
  await signManifest(input);
  const first = await readWithSpy(input);
  const second = await readWithSpy(input);
  assert.deepEqual(first, second);
});

function xorshift32(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

test("BLD-004 EP-PURE mutation property rejects 3 seeds x 1000 wrong digests", async () => {
  for (const seed of [0x0048_0001, 0x0048_0002, 0x0048_0003]) {
    const random = xorshift32(seed);
    for (let index = 0; index < 1_000; index += 1) {
      const input = await signManifest(baseManifest());
      const position = 7 + (random() % 64);
      const replacement = input.manifestDigest[position] === "f" ? "0" : "f";
      input.manifestDigest =
        input.manifestDigest.slice(0, position) +
        replacement +
        input.manifestDigest.slice(position + 1);
      const result = await readAdmittedCorpusManifest({
        readManifestText: () => JSON.stringify(input),
      });
      assert.equal(result.ok, false);
      assert.ok(
        result.diagnostics.some(
          ({ code }) => code === CORPUS_DIAGNOSTIC_CODES.manifestDigestMismatch,
        ),
      );
    }
  }
});
