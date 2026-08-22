import assert from "node:assert/strict";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  createSyntheticBoringLogProjectSession,
} from "../packages/application/dist/index.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import {
  applyBoringLogTextOccurrenceStyles,
  clearBoringLogTextOccurrencePresentation,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentId = "urn:rsrender:log-project:bld-037:embedded-template-history";

function job(document, ordinal) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: `job:bld-037-embedded-template:${ordinal}@r1`,
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
    requestId: `urn:rsrender:bld-037:${kind}:${expectedWorkingRevision}`,
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

test("BLD-037 occurrence style replacement uses the shared document history authority", async () => {
  const firstJob = job(structuredClone(boringLogMvpFixture), 1);
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [firstJob, job(secondDocument(), 2)],
  });
  assert.equal(created.accepted, true, created.code);
  const initial = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.ok(initial);
  assert.equal(initial.project.aggregate.logSet.templateAssignments.length, 2);
  const explorationIdentity = boringLogMvpFixture.identity.explorationId;
  const initialDigest = sha256CanonicalJson(firstJob.template);
  assert.equal(assignedDigest(initial, explorationIdentity), initialDigest);

  const authored = applyBoringLogTextOccurrenceStyles(firstJob, [
    {
      contractVersion: 1,
      schemaVersion: "rsrender.boring-log-text-occurrence-style-override.v1",
      kind: "boring-log.text-occurrence-style-override",
      ownerDocumentIdentity: documentId,
      boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
      overrideIdentity: "urn:rsrender:text-style-override:bld-037-history",
      overrideRevision: 1,
      scope: "occurrence",
      occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
      semanticId: "lithology:stratum-01:transition:2",
      baseStyleId: "style-small",
      style: {
        fontFamilyId: "font.logical.rsrender-sans",
        fontSizeMpt: 9_000,
        fontWeight: 700,
        lineHeightMpt: 11_000,
        color: "#b42318",
      },
      locked: false,
    },
  ]);
  assert.equal(authored.accepted, true, authored.code);
  const replacementDigest = sha256CanonicalJson(authored.job.template);
  const committed = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-037:request:set-occurrence-style:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    explorationIdentity,
    expectedEffectiveContentDigest: initialDigest,
    replacementEffectiveContentDigest: replacementDigest,
    reason: "Set exact occurrence typography",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.canUndo, true);
  const after = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.equal(assignedDigest(after, explorationIdentity), replacementDigest);
  const replacement = after.project.aggregate.logSet.embeddedTemplateRepresentations.find(
    ({ effectiveContentDigest }) => effectiveContentDigest === replacementDigest,
  );
  assert.equal(replacement.origin.kind, "separate-template");

  const undone = await created.session.service.undo(navigationCommand("history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  assert.equal(undone.workingRevision, 2);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    initialDigest,
  );
  const redone = await created.session.service.redo(navigationCommand("history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  assert.equal(redone.workingRevision, 3);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );

  const reset = clearBoringLogTextOccurrencePresentation(
    authored.job,
    "node:lithology:stratum-01:transition:2:text",
    "lithology:stratum-01:transition:2",
  );
  assert.equal(reset.accepted, true, reset.code);
  assert.equal(reset.job.templateDigest, initialDigest);
  const resetCommitted = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-037:request:reset-occurrence-presentation:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 3,
    explorationIdentity,
    expectedEffectiveContentDigest: replacementDigest,
    replacementEffectiveContentDigest: reset.job.templateDigest,
    reason: "Reset exact occurrence presentation to inherited",
  });
  assert.equal(resetCommitted.accepted, true, JSON.stringify(resetCommitted));
  assert.equal(resetCommitted.workingRevision, 4);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    initialDigest,
  );
  const resetUndone = await created.session.service.undo(navigationCommand("history.undo", 4));
  assert.equal(resetUndone.kind, "override-render-dataset.committed");
  assert.equal(resetUndone.workingRevision, 5);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
  const resetRedone = await created.session.service.redo(navigationCommand("history.redo", 5));
  assert.equal(resetRedone.kind, "override-render-dataset.committed");
  assert.equal(resetRedone.workingRevision, 6);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    initialDigest,
  );
});
