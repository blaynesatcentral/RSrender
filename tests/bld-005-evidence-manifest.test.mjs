import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";

import {
  EVIDENCE_DIAGNOSTIC_CODES,
  EVIDENCE_RESULT_STATES,
  evidenceResultSatisfiesRequiredClass,
  readEvidenceManifest,
  writeEvidenceManifest,
} from "../packages/test-support/dist/index.js";
import {
  evidenceDraft,
  resultForState,
  signedEvidence,
} from "./helpers/bld-005-evidence-fixture.mjs";

function codes(result) {
  assert.equal(result.ok, false);
  return result.diagnostics.map(({ code }) => code);
}

test("BLD-005 round-trips every distinct immutable result state canonically", async () => {
  for (const state of EVIDENCE_RESULT_STATES) {
    const written = await signedEvidence(state);
    const read = await readEvidenceManifest(written.canonicalJson);
    assert.equal(read.ok, true);
    assert.equal(read.canonicalJson, written.canonicalJson);
    assert.equal(read.manifest.inventoryDigest, written.manifest.inventoryDigest);
    assert.equal(read.manifest.result.state, state);
    assert.equal(read.manifest.evidencePurpose, "writer-validator-test");
    assert.ok(read.manifest.nonclaims.includes("not-product-row-evidence"));
    assert.ok(read.manifest.nonclaims.includes("not-an-acceptance-or-release-claim"));
    assert.equal(Object.isFrozen(read.manifest), true);
    assert.equal(Object.isFrozen(read.manifest.result), true);
  }
});

test("BLD-005 repository-safe sample is exact writer/validator evidence, not product-row evidence", async () => {
  const samplePath = fileURLToPath(
    new URL("./fixtures/bld-005-evidence-manifest-sample.json", import.meta.url),
  );
  const sample = await readEvidenceManifest(readFileSync(samplePath, "utf8"));
  assert.equal(sample.ok, true);
  assert.equal(sample.manifest.evidencePurpose, "writer-validator-test");
  assert.equal(sample.manifest.result.state, "METHOD_NOT_RUN");
  assert.equal(sample.manifest.result.releaseContribution, "none");
  assert.ok(sample.manifest.nonclaims.includes("not-product-row-evidence"));
  assert.ok(sample.manifest.nonclaims.includes("not-an-acceptance-or-release-claim"));
  const generated = await signedEvidence("METHOD_NOT_RUN");
  assert.equal(sample.canonicalJson, generated.canonicalJson);
});

test("BLD-005 technical PASS and organizational APPROVED never substitute for each other", () => {
  for (const state of EVIDENCE_RESULT_STATES) {
    const result = resultForState(state);
    assert.equal(evidenceResultSatisfiesRequiredClass(result, "technical"), state === "PASS");
    assert.equal(
      evidenceResultSatisfiesRequiredClass(result, "organizational"),
      state === "APPROVED",
    );
  }
});

test("BLD-005 canonical inventory digest ignores insertion order but not stable identities", async () => {
  const forward = evidenceDraft();
  const reverse = Object.fromEntries(Object.entries(evidenceDraft()).reverse());
  const first = await writeEvidenceManifest(forward);
  const second = await writeEvidenceManifest(reverse);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.canonicalJson, second.canonicalJson);
  assert.equal(first.manifest.inventoryDigest, second.manifest.inventoryDigest);

  const changed = evidenceDraft();
  changed.row.matrixRevision += 1;
  const third = await writeEvidenceManifest(changed);
  assert.equal(third.ok, true);
  assert.notEqual(first.manifest.inventoryDigest, third.manifest.inventoryDigest);
});

test("BLD-005 rejects every missing §8.1 field family deterministically", async () => {
  const mutations = [
    (draft) => delete draft.row,
    (draft) => delete draft.row.matrixRevision,
    (draft) => delete draft.fixtureEvidence,
    (draft) => delete draft.fixtureEvidence[0].fixtureId,
    (draft) => delete draft.fixtureEvidence[0].oracleId,
    (draft) => delete draft.fixtureEvidence[0].provenanceState,
    (draft) => delete draft.componentDigests.harness,
    (draft) => delete draft.environment,
    (draft) => delete draft.artifacts,
    (draft) => delete draft.artifacts[0].artifactId,
    (draft) => delete draft.result,
    (draft) => delete draft.retention,
    (draft) => delete draft.rerunTriggers,
    (draft) => delete draft.nonclaims,
  ];
  for (const mutate of mutations) {
    const draft = evidenceDraft();
    mutate(draft);
    const result = await writeEvidenceManifest(draft);
    assert.ok(codes(result).includes(EVIDENCE_DIAGNOSTIC_CODES.requiredFieldMissing));
  }
});

test("BLD-005 rejects host, user, path, tenant, serial, secret, and raw-custody fields", async () => {
  const prohibitedFields = [
    ["hostname", "synthetic-host"],
    ["username", "synthetic-user"],
    ["internalPath", "synthetic-internal-location"],
    ["tenant", "synthetic-tenant"],
    ["serial", "synthetic-serial"],
    ["secret", "synthetic-secret"],
    ["rawEvidencePath", "synthetic-raw-location"],
  ];
  for (const [field, value] of prohibitedFields) {
    const draft = evidenceDraft();
    draft.environment[field] = value;
    const result = await writeEvidenceManifest(draft);
    assert.ok(codes(result).includes(EVIDENCE_DIAGNOSTIC_CODES.privacyProhibitedField));
  }

  for (const value of ["C:\\internal\\evidence.json", "Bearer synthetic-secret-value"]) {
    const draft = evidenceDraft();
    draft.environment.profileId = value;
    const result = await writeEvidenceManifest(draft);
    assert.ok(codes(result).includes(EVIDENCE_DIAGNOSTIC_CODES.privacyProhibitedValue));
  }

  const custody = evidenceDraft();
  custody.artifacts[0].custodyClass = "restricted";
  custody.artifacts[0].locationKind = "repository-relative";
  custody.artifacts[0].locationReference = "tests/prohibited-raw.bin";
  const custodyResult = await writeEvidenceManifest(custody);
  assert.ok(codes(custodyResult).includes(EVIDENCE_DIAGNOSTIC_CODES.custodyProhibited));
});

test("BLD-005 rejects semantic misuse of every result-state family", async () => {
  const invalidResults = [
    { ...resultForState("METHOD_NOT_RUN"), qualifyingEvidenceExecuted: true },
    { ...resultForState("BLOCKED"), blockers: [] },
    { ...resultForState("PASS"), releaseContribution: "organizational-approval" },
    { ...resultForState("FAIL"), failures: [] },
    { ...resultForState("INVALID"), invalidationReasons: [] },
    { ...resultForState("APPROVED"), decisionClass: "technical" },
    { ...resultForState("NOT_APPROVED"), releaseContribution: "organizational-approval" },
  ];
  for (const invalidResult of invalidResults) {
    const draft = evidenceDraft();
    draft.result = invalidResult;
    draft.execution.repetitions =
      invalidResult.decisionClass === "technical" ? invalidResult.requiredRepetitions : 0;
    const result = await writeEvidenceManifest(draft);
    assert.ok(codes(result).includes(EVIDENCE_DIAGNOSTIC_CODES.resultSemantics));
  }
});

test("BLD-005 rejects digest drift, missing digest, unknown version/field, and invalid JSON", async () => {
  const written = await signedEvidence();
  const changed = JSON.parse(written.canonicalJson);
  changed.row.matrixRevision += 1;
  assert.ok(
    codes(await readEvidenceManifest(JSON.stringify(changed))).includes(
      EVIDENCE_DIAGNOSTIC_CODES.digestMismatch,
    ),
  );

  const missingDigest = JSON.parse(written.canonicalJson);
  delete missingDigest.inventoryDigest;
  assert.ok(
    codes(await readEvidenceManifest(JSON.stringify(missingDigest))).includes(
      EVIDENCE_DIAGNOSTIC_CODES.digestMissing,
    ),
  );

  const unsupported = evidenceDraft();
  unsupported.schemaVersion = "rsrender.evidence-manifest.v2";
  assert.ok(
    codes(await writeEvidenceManifest(unsupported)).includes(
      EVIDENCE_DIAGNOSTIC_CODES.unsupportedVersion,
    ),
  );

  const unknown = evidenceDraft();
  unknown.releaseReady = true;
  assert.ok(
    codes(await writeEvidenceManifest(unknown)).includes(EVIDENCE_DIAGNOSTIC_CODES.unknownField),
  );
  assert.ok(
    codes(await readEvidenceManifest("{not-json")).includes(EVIDENCE_DIAGNOSTIC_CODES.jsonInvalid),
  );
});

test("BLD-005 digest is identical across three fresh processes and two repetitions", () => {
  const script = fileURLToPath(new URL("./helpers/bld-005-digest-process.mjs", import.meta.url));
  const outputs = [];
  for (let repetition = 0; repetition < 2; repetition += 1) {
    for (let processIndex = 0; processIndex < 3; processIndex += 1) {
      const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      outputs.push(result.stdout.trim());
    }
  }
  assert.equal(new Set(outputs).size, 1);
  assert.match(outputs[0], /^sha256:[0-9a-f]{64}$/u);
});
