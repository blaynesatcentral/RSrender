import assert from "node:assert/strict";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  createPersistedBoringLogProjectSession,
  createSyntheticBoringLogProjectSession,
  syntheticBoringLogProjectSessionRevision,
} from "../packages/application/dist/index.js";
import {
  createLogProjectPackageParts,
  decodeLogProjectPackageParts,
  multiBoringLogProjectPackageContractRevision,
} from "../packages/package-contract/dist/index.js";
import {
  BoringLogStudioRouteBroker,
  DOCUMENT_ROUTE_URL,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const projectDocumentIdentity = "urn:rsrender:log-project:bld-036:multi-exploration";

function layoutJob(document, ordinal) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: `job:bld-036-multi-exploration:${ordinal}@r1`,
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document,
    template: structuredClone(boringLogMvpTemplate),
  };
}

function secondDocument() {
  const encoded = JSON.stringify(boringLogMvpFixture)
    .replaceAll("test-01", "test-02")
    .replaceAll("stratum-", "b02-stratum-")
    .replaceAll("sample-", "b02-sample-")
    .replaceAll("remark-", "b02-remark-");
  const document = JSON.parse(encoded);
  document.metadata.documentTitle = "BORING LOG TEST-02";
  document.metadata.groundElevationFt = 176.25;
  return document;
}

function jobs() {
  return [layoutJob(structuredClone(boringLogMvpFixture), 1), layoutJob(secondDocument(), 2)];
}

test("BLD-036 one project session retains ordered distinct Explorations on one authority", async () => {
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity,
    ownerGeneration: 1,
    layoutJobs: jobs(),
  });
  assert.equal(created.accepted, true, created.code);
  assert.equal(
    syntheticBoringLogProjectSessionRevision,
    "bld-036-synthetic-boring-log-project-session-v1",
  );
  assert.deepEqual(
    created.session.documents.map((document) => ({
      explorationIdentity: document.explorationIdentity,
      displayName: document.displayName,
      ordinal: document.ordinal,
    })),
    [
      {
        explorationIdentity: "urn:rsrender:exploration:test-01",
        displayName: "BORING LOG TEST-01",
        ordinal: 1,
      },
      {
        explorationIdentity: "urn:rsrender:exploration:test-02",
        displayName: "BORING LOG TEST-02",
        ordinal: 2,
      },
    ],
  );
  const captured = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.ok(captured);
  assert.equal(captured.project.aggregate.documentIdentity, projectDocumentIdentity);
  assert.equal(captured.project.aggregate.logSet.memberships.length, 2);
  assert.equal(
    captured.project.aggregate.phase1Inputs.acceptedSourceSnapshot.explorations.length,
    2,
  );
  assert.equal(captured.project.workingRevision, 0);

  const logicalPackage = createLogProjectPackageParts({
    layoutJobs: jobs(),
    projectAggregate: captured.project.aggregate,
    presentationOverrideCollections: captured.presentationOverrideCollections,
  });
  assert.equal(logicalPackage.accepted, true, logicalPackage.code);
  assert.equal(
    multiBoringLogProjectPackageContractRevision,
    "bld-036-multi-boring-log-project-package-v2",
  );
  assert.equal(logicalPackage.value.documentIdentity, projectDocumentIdentity);
  assert.equal(logicalPackage.value.layoutJobs.length, 2);
  const reopenedPackage = decodeLogProjectPackageParts(logicalPackage.value.parts);
  assert.equal(reopenedPackage.accepted, true, reopenedPackage.code);
  assert.deepEqual(
    reopenedPackage.value.layoutJobs.map(({ document }) => document.identity.explorationId),
    created.session.documents.map(({ explorationIdentity }) => explorationIdentity),
  );

  const restored = createPersistedBoringLogProjectSession({
    projectDocumentIdentity,
    ownerGeneration: 2,
    layoutJobs: jobs(),
    projectAggregate: captured.project.aggregate,
    presentationOverrideCollections: captured.presentationOverrideCollections,
  });
  assert.equal(restored.accepted, true, restored.code);
  assert.deepEqual(
    restored.session.documents.map(({ boringLogIdentity }) => boringLogIdentity),
    created.session.documents.map(({ boringLogIdentity }) => boringLogIdentity),
  );
});

test("BLD-036 project session rejects duplicate and cross-project Exploration inputs", () => {
  const duplicate = jobs()[0];
  assert.equal(
    createSyntheticBoringLogProjectSession({
      projectDocumentIdentity,
      ownerGeneration: 1,
      layoutJobs: [duplicate, structuredClone(duplicate)],
    }).accepted,
    false,
  );
  const foreign = secondDocument();
  foreign.metadata.provenance.sourceProjectIdentity = "urn:rsrender:synthetic-project:foreign";
  const rejected = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity,
    ownerGeneration: 1,
    layoutJobs: [jobs()[0], layoutJob(foreign, 2)],
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.code, "BORING_LOG_PROJECT_SOURCE_SCOPE_MISMATCH");
});

test("BLD-036 shared history retains simultaneous overrides from distinct Boring Logs", async () => {
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity,
    ownerGeneration: 1,
    layoutJobs: jobs(),
  });
  assert.equal(created.accepted, true, created.code);
  const session = created.session;
  let revision = 0;
  for (const [index, document] of session.documents.entries()) {
    const queried = await session.service.getProjection({
      contractVersion: 1,
      messageType: "query",
      scope: "document-domain",
      kind: "render-dataset.get",
      requestId: `urn:test:bld-036:query:before:${index + 1}`,
      documentId: session.projectDocumentIdentity,
      ownerGeneration: session.ownerGeneration,
      minimumWorkingRevision: revision,
    });
    assert.equal(queried.kind, "render-dataset.projection.result");
    const binding = document.bindings.find(({ property }) => property === "material-description");
    assert.ok(binding);
    const source = queried.projection.values.find(
      ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
    );
    assert.ok(source);
    const replacement = `Authored description for Boring ${index + 1}`;
    const committed = await session.service.setDisplayValue({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind: "presentation-override.set-display-value",
      requestId: `urn:test:bld-036:command:set:${index + 1}`,
      commandId: "presentation-override.set-display-value",
      documentId: session.projectDocumentIdentity,
      ownerGeneration: session.ownerGeneration,
      expectedWorkingRevision: revision,
      payload: {
        localOverrideIdentity: `urn:test:bld-036:override:description:${index + 1}`,
        targetSourceFieldIdentity: source.sourceFieldIdentity,
        expectedSourceValueDigest: source.sourceBaselineValueDigest,
        expectedSourceValueType: source.sourceOriginal.valueType,
        expectedSourceUnit: source.sourceOriginal.unit,
        replacementContent: {
          kind: "value",
          value: replacement,
          originalRepresentation: replacement,
        },
        replacementUnit: source.sourceOriginal.unit,
        reason: "BLD-036 simultaneous multi-boring override proof",
        authorIdentity: null,
        recordedAtUtc: `2026-08-22T16:0${index}:00.000Z`,
      },
    });
    assert.equal(committed.kind, "override-render-dataset.committed", committed.reason);
    revision = committed.workingRevision;
  }
  const after = await session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId: "urn:test:bld-036:query:after-both",
    documentId: session.projectDocumentIdentity,
    ownerGeneration: session.ownerGeneration,
    minimumWorkingRevision: 2,
  });
  assert.equal(after.kind, "render-dataset.projection.result");
  assert.equal(after.projection.overrides.length, 2);
  assert.deepEqual(
    session.documents.map((document, index) => {
      const binding = document.bindings.find(({ property }) => property === "material-description");
      const projected = after.projection.values.find(
        ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
      );
      return (
        projected.effectiveDisplay.content.value === `Authored description for Boring ${index + 1}`
      );
    }),
    [true, true],
  );
});

test("BLD-036 Studio route admits every bounded Boring Log navigation command", async () => {
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  const operations = [];
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity: projectDocumentIdentity,
    ownerGeneration: 1,
    createCapability: () => "d".repeat(64),
    getProjection: async () => ({ accepted: false, code: "UNUSED" }),
    lifecycle: async (input) => {
      operations.push(input.operation);
      return { accepted: true, code: "PROJECT_BORING_CHANGED", state: null };
    },
  });
  const routeContext = {
    window: expectedWindow,
    webContents: expectedWebContents,
    frame,
    mainFrame: frame,
    url: DOCUMENT_ROUTE_URL,
    windowLive: true,
    webContentsLive: true,
  };
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  for (const [index, operation] of [
    "first-boring",
    "previous-boring",
    "next-boring",
    "last-boring",
  ].entries()) {
    const response = await route.lifecycle(routeContext, {
      transportVersion: 1,
      capability: binding.capability,
      generation: binding.generation,
      sequence: index + 1,
      documentIdentity: binding.documentIdentity,
      ownerGeneration: binding.ownerGeneration,
      args: { operation, expectedWorkingRevision: 0 },
    });
    assert.equal(response.accepted, true, response.code);
  }
  assert.deepEqual(operations, ["first-boring", "previous-boring", "next-boring", "last-boring"]);
});
