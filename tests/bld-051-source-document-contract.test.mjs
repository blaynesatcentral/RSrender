import assert from "node:assert/strict";
import test from "node:test";

import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
} from "../packages/contracts/dist/index.js";
import { prepareBoringLogLayout } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function sourceJob() {
  const document = structuredClone(boringLogMvpFixture);
  document.schemaVersion = "rsrender.boring-log-source-document.v1";
  document.fixtureId = "urn:rsrender:source:rslog-project-json:project-1:boring-1";
  document.evidenceClass = "source-project-data";
  document.representativeClaimAllowed = true;
  document.publicationEligibility = "source-project-data";
  document.samples[0].nValue = null;
  document.samples[0].refusal = false;
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:source:rslog-project-json:project-1:boring-1@r1",
    inputRevision: 1,
    fixtureDigest: sha256CanonicalJson(document),
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document,
    template: structuredClone(boringLogMvpTemplate),
  };
}

test("BLD-051 admits source data and renders an unavailable N-value as blank", () => {
  const job = sourceJob();
  const validated = validateBoringLogLayoutJobInput(job);
  assert.equal(validated.accepted, true, JSON.stringify(validated));
  const prepared = prepareBoringLogLayout(job);
  assert.equal(prepared.accepted, true, JSON.stringify(prepared));
  assert.equal(
    prepared.value.textRequests.some(
      ({ sourceIdentity, text }) =>
        sourceIdentity === "sample-1:n-value" && (text === "REF" || text === "0"),
    ),
    false,
  );
});

test("BLD-051 rejects contradictory synthetic/source evidence labels", () => {
  const job = sourceJob();
  job.document.schemaVersion = "rsrender.boring-log-mvp-fixture.v1";
  const validated = validateBoringLogLayoutJobInput(job);
  assert.equal(validated.accepted, false);
  assert.equal(validated.code, "BORING_LOG_CONTRACT_WRONG_TYPE");
});
