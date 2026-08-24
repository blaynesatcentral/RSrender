import assert from "node:assert/strict";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacementBatch,
  createSyntheticBoringLogProjectSession,
  lithologyClassificationDefaultBatchOperationIdentity,
  lithologyClassificationDefaultBatchOperationLabel,
} from "../packages/application/dist/index.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentId = "urn:rsrender:log-project:bld-043:template-batch-history";

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
    jobId: `job:bld-043-template-batch:${ordinal}@r1`,
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document,
    template,
  };
}

function createSession() {
  const unrelatedTemplate = structuredClone(boringLogMvpTemplate);
  unrelatedTemplate.visualTokens.pageFill = "#fefefe";
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [
      job(documentFor(1), 1),
      job(documentFor(2), 2),
      job(documentFor(3), 3, unrelatedTemplate),
    ],
  });
  assert.equal(created.accepted, true, created.code);
  return created.session;
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
  const etr = capture.project.aggregate.logSet.embeddedTemplateRepresentations.find(
    ({ embeddedTemplateRepresentationIdentity }) =>
      embeddedTemplateRepresentationIdentity === assignment.embeddedTemplateRepresentationIdentity,
  );
  assert.ok(etr);
  return { assignment, etr };
}

function replacementInput(initial, explorationIdentities, replacementDigests) {
  return {
    requestId: "urn:rsrender:bld-043:lithology-default:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    operation: "lithology-classification-default",
    replacements: explorationIdentities.map((explorationIdentity, index) => {
      const current = assigned(initial, explorationIdentity);
      return {
        explorationIdentity,
        expectedTemplateAssignmentIdentity: current.assignment.assignmentIdentity,
        expectedEmbeddedTemplateRepresentationIdentity:
          current.etr.embeddedTemplateRepresentationIdentity,
        expectedEffectiveContentDigest: current.etr.effectiveContentDigest,
        replacementEffectiveContentDigest: replacementDigests[index],
      };
    }),
    reason: "Set the GW classification appearance default across assigned boring logs",
  };
}

function navigationCommand(kind, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-043:${kind}:${expectedWorkingRevision}`,
    commandId: kind,
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision,
    payload: null,
  };
}

test("BLD-043 classification default replaces shared assignments in one history entry", async () => {
  const session = createSession();
  const initial = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.ok(initial);
  const explorationIdentities = [
    documentFor(1).identity.explorationId,
    documentFor(2).identity.explorationId,
  ];
  const first = assigned(initial, explorationIdentities[0]);
  const second = assigned(initial, explorationIdentities[1]);
  const unrelatedExplorationIdentity = documentFor(3).identity.explorationId;
  const unrelated = assigned(initial, unrelatedExplorationIdentity);
  assert.equal(
    first.etr.embeddedTemplateRepresentationIdentity,
    second.etr.embeddedTemplateRepresentationIdentity,
  );
  assert.notEqual(
    first.etr.embeddedTemplateRepresentationIdentity,
    unrelated.etr.embeddedTemplateRepresentationIdentity,
  );

  const replacementDigest = sha256CanonicalJson({
    authority: "bld-043-lithology-classification-default",
    classification: "GW",
    color: "#8b5e3c",
  });
  const committed = await commitEmbeddedTemplateReplacementBatch(
    session.service,
    replacementInput(initial, explorationIdentities, [replacementDigest, replacementDigest]),
  );
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.previousWorkingRevision, 0);
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.canUndo, true);
  assert.equal(committed.operationIdentity, lithologyClassificationDefaultBatchOperationIdentity);
  assert.equal(committed.operationLabel, lithologyClassificationDefaultBatchOperationLabel);
  assert.equal(committed.embeddedTemplateRepresentationIdentities.length, 1);

  const after = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.ok(after);
  assert.equal(
    assigned(after, explorationIdentities[0]).etr.effectiveContentDigest,
    replacementDigest,
  );
  assert.equal(
    assigned(after, explorationIdentities[1]).etr.effectiveContentDigest,
    replacementDigest,
  );
  assert.equal(
    assigned(after, explorationIdentities[0]).etr.embeddedTemplateRepresentationIdentity,
    assigned(after, explorationIdentities[1]).etr.embeddedTemplateRepresentationIdentity,
  );
  assert.equal(
    assigned(after, unrelatedExplorationIdentity).etr.embeddedTemplateRepresentationIdentity,
    unrelated.etr.embeddedTemplateRepresentationIdentity,
  );
  assert.ok(
    after.project.aggregate.logSet.embeddedTemplateRepresentations.some(
      ({ embeddedTemplateRepresentationIdentity }) =>
        embeddedTemplateRepresentationIdentity ===
        unrelated.etr.embeddedTemplateRepresentationIdentity,
    ),
  );

  const undone = await session.service.undo(navigationCommand("history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  const afterUndo = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.equal(
    assigned(afterUndo, explorationIdentities[0]).etr.effectiveContentDigest,
    first.etr.effectiveContentDigest,
  );
  assert.equal(
    assigned(afterUndo, explorationIdentities[1]).etr.effectiveContentDigest,
    second.etr.effectiveContentDigest,
  );

  const redone = await session.service.redo(navigationCommand("history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  const afterRedo = await captureOverrideRenderDatasetWorkingState(session.service);
  assert.equal(
    assigned(afterRedo, explorationIdentities[0]).etr.effectiveContentDigest,
    replacementDigest,
  );
  assert.equal(
    assigned(afterRedo, explorationIdentities[1]).etr.effectiveContentDigest,
    replacementDigest,
  );
});

test("BLD-043 batch rejects duplicate, conflicting, stale, and missing inputs atomically", async () => {
  const scenarios = [
    {
      name: "duplicate",
      expectedCode: "DUPLICATE_EXPLORATION_ASSIGNMENT",
      mutate(input) {
        input.replacements[1] = structuredClone(input.replacements[0]);
      },
    },
    {
      name: "conflicting shared replacement",
      expectedCode: "CONFLICTING_TEMPLATE_REPLACEMENT",
      mutate(input) {
        input.replacements[1].replacementEffectiveContentDigest = sha256CanonicalJson({
          conflict: true,
        });
      },
    },
    {
      name: "stale revision",
      expectedCode: "STALE_WORKING_REVISION",
      mutate(input) {
        input.expectedWorkingRevision = 1;
      },
    },
    {
      name: "missing exploration",
      expectedCode: "EXPLORATION_ASSIGNMENT_MISSING",
      mutate(input) {
        input.replacements[1].explorationIdentity =
          "urn:rsrender:source-entity:bld-043:missing-exploration";
      },
    },
    {
      name: "stale ETR identity",
      expectedCode: "TEMPLATE_BASELINE_MISMATCH",
      mutate(input) {
        input.replacements[1].expectedEmbeddedTemplateRepresentationIdentity =
          "urn:rsrender:embedded-template-representation:bld-043:stale";
      },
    },
    {
      name: "stale assignment identity",
      expectedCode: "TEMPLATE_BASELINE_MISMATCH",
      mutate(input) {
        input.replacements[1].expectedTemplateAssignmentIdentity =
          "urn:rsrender:template-assignment:bld-043:stale";
      },
    },
  ];
  for (const scenario of scenarios) {
    const session = createSession();
    const initial = await captureOverrideRenderDatasetWorkingState(session.service);
    const explorationIdentities = [
      documentFor(1).identity.explorationId,
      documentFor(2).identity.explorationId,
    ];
    const replacementDigest = sha256CanonicalJson({ scenario: scenario.name, replacement: true });
    const input = replacementInput(initial, explorationIdentities, [
      replacementDigest,
      replacementDigest,
    ]);
    scenario.mutate(input);
    const rejected = await commitEmbeddedTemplateReplacementBatch(session.service, input);
    assert.equal(rejected.accepted, false, scenario.name);
    assert.equal(rejected.code, scenario.expectedCode, scenario.name);
    const after = await captureOverrideRenderDatasetWorkingState(session.service);
    assert.equal(after.project.workingRevision, 0, scenario.name);
    assert.equal(after.project.aggregateDigest, initial.project.aggregateDigest, scenario.name);
  }
});
