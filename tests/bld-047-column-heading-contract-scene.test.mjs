import assert from "node:assert/strict";
import test from "node:test";

import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
} from "../packages/contracts/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-047-column-heading@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: globalThis.structuredClone(boringLogMvpFixture),
    template: globalThis.structuredClone(boringLogMvpTemplate),
  };
}

test("BLD-047 preserves legacy column heading defaults and strictly admits bounded template headings", () => {
  const legacy = layoutJob();
  assert.equal(validateBoringLogLayoutJobInput(legacy).accepted, true);

  const custom = layoutJob();
  custom.template.columns[3].heading = "STRATUM DESCRIPTION";
  custom.templateDigest = sha256CanonicalJson(custom.template);
  const accepted = validateBoringLogLayoutJobInput(custom);
  assert.equal(accepted.accepted, true, JSON.stringify(accepted));
  assert.equal(accepted.value.template.columns[3].heading, "STRATUM DESCRIPTION");

  for (const heading of ["", "x".repeat(513), "\ud800", 42, null]) {
    const invalid = layoutJob();
    invalid.template.columns[3].heading = heading;
    if (typeof heading === "string" && !heading.includes("\ud800")) {
      invalid.templateDigest = sha256CanonicalJson(invalid.template);
    }
    assert.equal(
      validateBoringLogLayoutJobInput(invalid).accepted,
      false,
      `heading should be rejected: ${String(heading)}`,
    );
  }
});

test("BLD-047 resolves template-owned column heading text without source provenance or source mutation", () => {
  const input = layoutJob();
  const originalSourceDigest = sha256CanonicalJson(input.document);
  input.template.columns[3].heading = "STRATUM DESCRIPTION";
  input.templateDigest = sha256CanonicalJson(input.template);

  const preparation = prepareBoringLogLayout(input);
  assert.equal(preparation.accepted, true, JSON.stringify(preparation));
  assert.equal(preparation.value.pagePlan.pages[0].columns[3].heading, "STRATUM DESCRIPTION");
  const scene = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(scene.accepted, true, JSON.stringify(scene));

  const defaultHeading = scene.value.pages[0].nodes.find(
    ({ id }) => id === "node:column-elevation:heading",
  );
  assert.equal(defaultHeading?.content, "ELEV\nFT");
  const heading = scene.value.pages[0].nodes.find(
    ({ id }) => id === "node:column-description:heading",
  );
  assert.equal(heading?.kind, "text");
  assert.equal(heading?.content, "STRATUM DESCRIPTION");
  assert.equal(heading?.semanticId, "column-description");
  assert.equal(heading?.provenance, null);
  assert.equal(
    scene.value.textRequests.find(
      ({ measurementId }) => measurementId === "measure:node:column-description:heading",
    )?.sourceIdentity,
    "column-description",
  );
  assert.equal(sha256CanonicalJson(input.document), originalSourceDigest);
});
