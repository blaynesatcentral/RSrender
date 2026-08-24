import assert from "node:assert/strict";
import test from "node:test";

import { validateBoringLogTextOccurrenceLayoutOverride } from "../packages/contracts/dist/index.js";
import {
  prepareBoringLogLayoutWithTextOccurrenceStyles,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
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

const job = () => ({
  contractVersion: 1,
  schemaVersion: "rsrender.boring-log-layout-job.v1",
  kind: "boring-log.layout-job",
  jobId: "job:bld-040-text-presentation@r1",
  inputRevision: 1,
  fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
  templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
  document: structuredClone(boringLogMvpFixture),
  template: structuredClone(boringLogMvpTemplate),
});

const override = (changes = {}) => ({
  contractVersion: 1,
  schemaVersion: "rsrender.boring-log-text-occurrence-layout-override.v1",
  kind: "boring-log.text-occurrence-layout-override",
  ownerDocumentIdentity: "urn:rsrender:document:bld-040-presentation",
  boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
  overrideIdentity: "urn:rsrender:text-layout-override:bld-040-presentation",
  overrideRevision: 1,
  scope: "occurrence",
  occurrenceNodeId: "node:header-company",
  semanticId: "header-company",
  layout: {
    frame: { xMpt: 32_000, yMpt: 29_000, widthMpt: 250_000, heightMpt: 15_000 },
    frameAnchor: "top-left",
    paddingMpt: { topMpt: 0, rightMpt: 0, bottomMpt: 0, leftMpt: 0 },
    horizontalAlignment: "start",
    verticalAlignment: "top",
    wrapPolicy: "no-wrap",
    overflowPolicy: "clip-with-diagnostic",
    frameFillColor: null,
    frameStrokeColor: null,
    frameStrokeWidthMpt: 0,
    rotationMilliDegrees: 0,
    positionMode: "depth-bound",
    locked: false,
    visible: false,
    drawingOrderOffset: 100,
    ...changes,
  },
});

test("BLD-040 validates optional visibility and bounded sibling drawing-order authority", () => {
  assert.equal(validateBoringLogTextOccurrenceLayoutOverride(override()).accepted, true);
  assert.equal(
    validateBoringLogTextOccurrenceLayoutOverride(override({ visible: "false" })).accepted,
    false,
  );
  assert.equal(
    validateBoringLogTextOccurrenceLayoutOverride(override({ drawingOrderOffset: 1_000_001 }))
      .accepted,
    false,
  );
});

test("BLD-040 preserves hidden text in the resolved scene while omitting it from screen and PDF", () => {
  const prepared = prepareBoringLogLayoutWithTextOccurrenceStyles(job(), [], [override()]);
  assert.equal(prepared.accepted, true, prepared.contractCode);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true, measured.code);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true, resolved.contractCode);
  const node = resolved.value.pages[0].nodes.find(({ id }) => id === "node:header-company");
  assert.equal(node.kind, "text");
  assert.equal(node.presentation.visible, false);
  assert.equal(node.presentation.drawingOrderOffset, 100);

  const header = resolved.value.pages[0].nodes.find(({ id }) => id === "node:region-header");
  assert.equal(header.kind, "group");
  assert.ok(
    header.childIds.indexOf("node:header-company") >
      header.childIds.indexOf("node:header-company-subtitle"),
  );

  const screen = projectBoringLogSceneToSvg(resolved.value);
  const publication = projectBoringLogSceneForPublication(resolved.value);
  assert.equal(screen.accepted, true, screen.detail);
  assert.equal(publication.accepted, true, publication.code);
  assert.doesNotMatch(screen.markup, /id="node:header-company"/u);
  assert.doesNotMatch(publication.projection.svgMarkup, /id="node:header-company"/u);
  assert.match(screen.markup, /id="node:header-company-subtitle"/u);
  assert.match(publication.projection.svgMarkup, /id="node:header-company-subtitle"/u);
});
