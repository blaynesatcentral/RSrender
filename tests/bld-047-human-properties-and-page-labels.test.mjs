import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  createSyntheticBoringLogProjectSession,
} from "../packages/application/dist/index.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentId = "urn:rsrender:log-project:bld-047:column-heading-history";

function layoutJob(document = structuredClone(boringLogMvpFixture), ordinal = 1) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: `job:bld-047-column-heading-history:${ordinal}@r1`,
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document,
    template: structuredClone(boringLogMvpTemplate),
  };
}

function secondDocument() {
  const document = JSON.parse(
    JSON.stringify(boringLogMvpFixture)
      .replaceAll("test-01", "test-02")
      .replaceAll("stratum-", "b02-stratum-")
      .replaceAll("sample-", "b02-sample-")
      .replaceAll("remark-", "b02-remark-"),
  );
  document.metadata.documentTitle = "BORING LOG TEST-02";
  return document;
}

function navigationCommand(kind, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-047:${kind}:${expectedWorkingRevision}`,
    commandId: kind,
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision,
    payload: null,
  };
}

function assignedDigest(capture, explorationIdentity) {
  const membership = capture.project.aggregate.logSet.memberships.find(
    ({ sourceExplorationIdentity }) => sourceExplorationIdentity === explorationIdentity,
  );
  const assignment = capture.project.aggregate.logSet.templateAssignments.find(
    ({ scope }) =>
      scope.kind === "exploration" && scope.targetIdentity === membership.membershipIdentity,
  );
  return capture.project.aggregate.logSet.embeddedTemplateRepresentations.find(
    ({ embeddedTemplateRepresentationIdentity }) =>
      embeddedTemplateRepresentationIdentity === assignment.embeddedTemplateRepresentationIdentity,
  ).effectiveContentDigest;
}

test("BLD-047 column headings use one project history command without mutating Source Data", async () => {
  const job = layoutJob();
  const sourceDigest = sha256CanonicalJson(job.document);
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [job, layoutJob(secondDocument(), 2)],
  });
  assert.equal(created.accepted, true, created.code);
  const explorationIdentity = boringLogMvpFixture.identity.explorationId;
  const initial = await captureOverrideRenderDatasetWorkingState(created.session.service);
  const initialDigest = assignedDigest(initial, explorationIdentity);
  const authoredTemplate = structuredClone(job.template);
  authoredTemplate.columns.find(({ id }) => id === "column-description").heading =
    "STRATUM DESCRIPTION";
  const replacementDigest = sha256CanonicalJson(authoredTemplate);
  const committed = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-047:request:column-heading:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    explorationIdentity,
    expectedEffectiveContentDigest: initialDigest,
    replacementEffectiveContentDigest: replacementDigest,
    reason: "Set Log Column heading",
    operation: "column-heading-text",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.canUndo, true);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
  const undone = await created.session.service.undo(navigationCommand("history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    initialDigest,
  );
  const redone = await created.session.service.redo(navigationCommand("history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
  assert.equal(sha256CanonicalJson(job.document), sourceDigest);
});

test("BLD-047 exposes human Properties, effective depth data, and dedicated heading authority", async () => {
  const [route, entry, main, stylesheet] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(route, /Source project[\s\S]*Source original[\s\S]*Displayed value[\s\S]*Override/u);
  assert.match(route, /Advanced diagnostics[\s\S]*Semantic ID[\s\S]*Technical provenance/u);
  assert.match(route, /data-top-elevation[\s\S]*data-depth-range[\s\S]*data-depth-scale/u);
  assert.match(entry, /representative\.role === "log-column-heading"/u);
  assert.match(entry, /apis\.studio\.setColumnHeading/u);
  assert.match(
    entry,
    /renderDataSummary\(\);\s*renderPageSetup\(\);\s*renderAttributeTable\(\);\s*if \(studioProjection === null\)/u,
  );
  assert.match(
    entry,
    /document\.body\.dataset\["workingRevision"\] = String\(next\.workingRevision\)/u,
  );
  assert.match(entry, /Active boring · embedded page template/u);
  assert.match(main, /operation: "column-heading-text"/u);
  assert.match(main, /Number\(document\.body\.dataset\.workingRevision\)/u);
  assert.match(
    stylesheet,
    /\.data-control-grid\s*\{[^}]*grid-template-columns:\s*repeat\(8,\s*minmax\(86px,\s*1fr\)\)[^}]*margin:\s*2px 0/su,
  );
  assert.doesNotMatch(entry, /propertyBounds\.textContent = rawBoundsText/u);
});
