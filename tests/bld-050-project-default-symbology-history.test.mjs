import assert from "node:assert/strict";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacementBatch,
  createSyntheticBoringLogProjectSession,
  dataLayerSymbologyProjectDefaultBatchOperationIdentity,
  dataLayerSymbologyProjectDefaultBatchOperationLabel,
} from "../packages/application/dist/index.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import { authorBoringLogDataLayerSymbology } from "../packages/platform-electron-main/dist/boring-log-data-layer-symbology-authoring.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentId = "urn:rsrender:log-project:bld-050:project-default-history";

function documentFor(ordinal) {
  if (ordinal === 1) return structuredClone(boringLogMvpFixture);
  const suffix = String(ordinal).padStart(2, "0");
  const document = JSON.parse(
    JSON.stringify(boringLogMvpFixture)
      .replaceAll("test-01", `test-${suffix}`)
      .replaceAll("stratum-", `b${suffix}-stratum-`)
      .replaceAll("sample-", `b${suffix}-sample-`)
      .replaceAll("remark-", `b${suffix}-remark-`),
  );
  document.metadata.documentTitle = `BORING LOG TEST-${suffix}`;
  return document;
}

function job(document, ordinal, template = structuredClone(boringLogMvpTemplate)) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: `job:bld-050-project-default:${ordinal}@r1`,
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document,
    template,
  };
}

function createSession() {
  const distinctTemplate = structuredClone(boringLogMvpTemplate);
  distinctTemplate.visualTokens.pageFill = "#fefefe";
  const jobs = [
    job(documentFor(1), 1),
    job(documentFor(2), 2),
    job(documentFor(3), 3, distinctTemplate),
  ];
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: jobs,
  });
  assert.equal(created.accepted, true, created.code);
  return { session: created.session, jobs };
}

function assigned(capture, explorationIdentity) {
  const membership = capture.project.aggregate.logSet.memberships.find(
    ({ sourceExplorationIdentity }) => sourceExplorationIdentity === explorationIdentity,
  );
  assert.ok(membership);
  const assignment = capture.project.aggregate.logSet.templateAssignments.find(
    ({ scope }) =>
      scope.kind === "exploration" && scope.targetIdentity === membership.membershipIdentity,
  );
  assert.ok(assignment);
  const representation = capture.project.aggregate.logSet.embeddedTemplateRepresentations.find(
    ({ embeddedTemplateRepresentationIdentity }) =>
      embeddedTemplateRepresentationIdentity === assignment.embeddedTemplateRepresentationIdentity,
  );
  assert.ok(representation);
  return { assignment, representation };
}

const projectDefaultIdentity = "urn:rsrender:data-layer-symbology-project-default:bld-050-n-value";
const symbologyInput = {
  layerId: "layer-n-value",
  expectedKind: "numeric-polyline",
  visible: true,
  order: 8,
  line: { strokeToken: "nTrack", strokeWidthMpt: 1_200, dashMpt: [4_000, 2_000] },
  point: {
    shape: "circle",
    sizeMpt: 5_000,
    fillToken: null,
    strokeToken: "nTrack",
    strokeWidthMpt: 800,
  },
  range: null,
  legend: { visible: true, label: "Project N-value default" },
  overrideIdentity: projectDefaultIdentity,
};

function navigation(kind, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-050:${kind}:${expectedWorkingRevision}`,
    commandId: kind,
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision,
    payload: null,
  };
}

test("BLD-050 project default authors every boring and commits one undoable batch", async () => {
  const { session, jobs } = createSession();
  const initial = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.ok(initial);
  const authored = jobs.map((candidate) =>
    authorBoringLogDataLayerSymbology(candidate, symbologyInput),
  );
  assert.equal(
    authored.every(({ accepted }) => accepted),
    true,
  );
  for (const result of authored) {
    assert.equal(result.override.overrideIdentity, projectDefaultIdentity);
    assert.equal(result.override.overrideRevision, 1);
  }
  const replacements = jobs.map((candidate, index) => {
    const current = assigned(initial, candidate.document.identity.explorationId);
    return {
      explorationIdentity: candidate.document.identity.explorationId,
      expectedTemplateAssignmentIdentity: current.assignment.assignmentIdentity,
      expectedEmbeddedTemplateRepresentationIdentity:
        current.representation.embeddedTemplateRepresentationIdentity,
      expectedEffectiveContentDigest: current.representation.effectiveContentDigest,
      replacementEffectiveContentDigest: authored[index].layoutJob.templateDigest,
    };
  });
  const committed = await commitEmbeddedTemplateReplacementBatch(session.service, {
    requestId: "urn:rsrender:bld-050:data-layer-project-default:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    operation: "data-layer-symbology-project-default",
    replacements,
    reason: "Set N-value Data Layer symbology project default across three boring logs",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.operationIdentity, dataLayerSymbologyProjectDefaultBatchOperationIdentity);
  assert.equal(committed.operationLabel, dataLayerSymbologyProjectDefaultBatchOperationLabel);
  assert.equal(committed.canUndo, true);

  const after = await captureOverrideRenderDatasetWorkingState(session.service);
  jobs.forEach((candidate, index) => {
    assert.equal(
      assigned(after, candidate.document.identity.explorationId).representation
        .effectiveContentDigest,
      authored[index].layoutJob.templateDigest,
    );
  });

  const undone = await session.service.undo(navigation("history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  const afterUndo = await captureOverrideRenderDatasetWorkingState(session.service);
  jobs.forEach((candidate) => {
    assert.equal(
      assigned(afterUndo, candidate.document.identity.explorationId).representation
        .effectiveContentDigest,
      assigned(initial, candidate.document.identity.explorationId).representation
        .effectiveContentDigest,
    );
  });

  const redone = await session.service.redo(navigation("history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  const afterRedo = await captureOverrideRenderDatasetWorkingState(session.service);
  jobs.forEach((candidate, index) => {
    assert.equal(
      assigned(afterRedo, candidate.document.identity.explorationId).representation
        .effectiveContentDigest,
      authored[index].layoutJob.templateDigest,
    );
  });
});

test("BLD-050 project-default preflight fails closed before history when one boring lacks a token", async () => {
  const { session, jobs } = createSession();
  const initial = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.ok(initial);
  jobs[0].template.visualTokens.projectOnlyTrack = "#123456";
  jobs[0].templateDigest = sha256CanonicalJson(jobs[0].template);
  const requested = {
    ...symbologyInput,
    line: { ...symbologyInput.line, strokeToken: "projectOnlyTrack" },
    point: { ...symbologyInput.point, strokeToken: "projectOnlyTrack" },
  };
  const results = jobs.map((candidate) => authorBoringLogDataLayerSymbology(candidate, requested));
  assert.equal(results[0].accepted, true);
  assert.equal(results[1].accepted, false);
  assert.equal(results[1].code, "DATA_LAYER_SYMBOLOGY_TOKEN_UNKNOWN");
  const validAuthored = jobs.map((candidate) =>
    authorBoringLogDataLayerSymbology(candidate, symbologyInput),
  );
  assert.equal(
    validAuthored.every(({ accepted }) => accepted),
    true,
  );
  const stale = await commitEmbeddedTemplateReplacementBatch(session.service, {
    requestId: "urn:rsrender:bld-050:data-layer-project-default:stale",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 1,
    operation: "data-layer-symbology-project-default",
    replacements: jobs.map((candidate, index) => {
      const current = assigned(initial, candidate.document.identity.explorationId);
      return {
        explorationIdentity: candidate.document.identity.explorationId,
        expectedTemplateAssignmentIdentity: current.assignment.assignmentIdentity,
        expectedEmbeddedTemplateRepresentationIdentity:
          current.representation.embeddedTemplateRepresentationIdentity,
        expectedEffectiveContentDigest: current.representation.effectiveContentDigest,
        replacementEffectiveContentDigest: validAuthored[index].layoutJob.templateDigest,
      };
    }),
    reason: "Reject stale project-wide Data Layer symbology command",
  });
  assert.equal(stale.accepted, false);
  assert.equal(stale.code, "STALE_WORKING_REVISION");
  const afterPreflight = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.equal(afterPreflight.project.workingRevision, 0);
  assert.equal(afterPreflight.project.aggregateDigest, initial.project.aggregateDigest);
});
