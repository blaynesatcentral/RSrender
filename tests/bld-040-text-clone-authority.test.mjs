import assert from "node:assert/strict";
import test from "node:test";

import { validateBoringLogLayoutJobInput } from "../packages/contracts/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import { projectBoringLogSceneToSvg } from "../packages/renderer-ui/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function job(clones) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-040-text-clone@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: {
      ...structuredClone(boringLogMvpTemplate),
      textOccurrenceClones: clones,
    },
  };
}

const clone = Object.freeze({
  cloneNodeId: "node:clone:header-company-copy-1",
  sourceOccurrenceNodeId: "node:header-company",
  semanticId: "header-company:clone:copy-1",
  offsetXMpt: 10_000,
  offsetYMpt: 10_000,
});

test("BLD-040 clones a structured text occurrence with independent scene and measurement identity", () => {
  const prepared = prepareBoringLogLayout(job([clone]));
  assert.equal(prepared.accepted, true, prepared.contractCode);
  const cloneRequest = prepared.value.textRequests.find(
    ({ measurementId }) => measurementId === `measure:${clone.cloneNodeId}`,
  );
  assert.ok(cloneRequest);
  assert.equal(cloneRequest.sourceIdentity, clone.semanticId);

  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true, measured.code);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true, resolved.contractCode);
  const sourceNode = resolved.value.pages[0].nodes.find(({ id }) => id === "node:header-company");
  const cloneNode = resolved.value.pages[0].nodes.find(({ id }) => id === clone.cloneNodeId);
  assert.equal(sourceNode.kind, "text");
  assert.equal(cloneNode.kind, "text");
  assert.equal(cloneNode.content, sourceNode.content);
  assert.equal(cloneNode.frame.xMpt, sourceNode.frame.xMpt + clone.offsetXMpt);
  assert.equal(cloneNode.frame.yMpt, sourceNode.frame.yMpt + clone.offsetYMpt);
  assert.equal(cloneNode.measurementId, `measure:${clone.cloneNodeId}`);
  assert.equal(cloneNode.presentation.positionMode, "free");
  assert.deepEqual(cloneNode.provenance, sourceNode.provenance);

  const screen = projectBoringLogSceneToSvg(resolved.value);
  const publication = projectBoringLogSceneForPublication(resolved.value);
  assert.equal(screen.accepted, true, screen.detail);
  assert.equal(publication.accepted, true, publication.code);
  assert.match(screen.markup, /id="node:clone:header-company-copy-1"/u);
  assert.match(publication.projection.svgMarkup, /id="node:clone:header-company-copy-1"/u);
});

test("BLD-040 rejects malformed, duplicate, unresolved, and off-page clones", () => {
  assert.equal(
    validateBoringLogLayoutJobInput(job([{ ...clone, cloneNodeId: "node:not-a-clone" }])).accepted,
    false,
  );
  assert.equal(validateBoringLogLayoutJobInput(job([clone, clone])).accepted, false);
  assert.deepEqual(
    prepareBoringLogLayout(job([{ ...clone, sourceOccurrenceNodeId: "node:missing" }])),
    {
      accepted: false,
      code: "BORING_LOG_LAYOUT_PLAN_REJECTED",
      contractCode: "BORING_LOG_LAYOUT_INTERNAL_INVARIANT",
    },
  );
  assert.equal(prepareBoringLogLayout(job([{ ...clone, offsetXMpt: 700_000 }])).accepted, false);
});
