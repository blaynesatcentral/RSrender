import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticOverrideRenderDatasetSession } from "../packages/application/dist/index.js";

const documentIdentity = "urn:test:bld-048:document:revert-override-001";

async function projection(session, requestId) {
  const result = await session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId,
    documentId: documentIdentity,
    ownerGeneration: 1,
    minimumWorkingRevision: null,
  });
  assert.equal(result.kind, "render-dataset.projection.result");
  return result.projection;
}

test("BLD-048 removes one display override and Undo restores it", async () => {
  const created = createSyntheticOverrideRenderDatasetSession({
    documentIdentity,
    ownerGeneration: 1,
  });
  assert.equal(created.accepted, true, created.code);
  const session = created.session;
  const initial = await projection(session, "urn:test:bld-048:query:revert-initial");
  const target = initial.values.find(
    ({ sourceOriginal }) => sourceOriginal.content.kind === "value",
  );
  assert.ok(target);
  const original = target.sourceOriginal;
  const replacementValue =
    typeof original.content.value === "string"
      ? "BLD-048 override"
      : typeof original.content.value === "number"
        ? 123
        : true;
  const localOverrideIdentity = "urn:test:bld-048:override:revert-one";

  const set = await session.service.setDisplayValue({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: "urn:test:bld-048:command:set-revert-one",
    commandId: "presentation-override.set-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: initial.workingRevision,
    payload: {
      localOverrideIdentity,
      targetSourceFieldIdentity: target.sourceFieldIdentity,
      expectedSourceValueDigest: target.sourceBaselineValueDigest,
      expectedSourceValueType: original.valueType,
      expectedSourceUnit: original.unit,
      replacementContent: {
        kind: "value",
        value: replacementValue,
        originalRepresentation: String(replacementValue),
      },
      replacementUnit: original.unit,
      reason: "BLD-048 revert authority test",
      authorIdentity: null,
      recordedAtUtc: "2026-08-25T05:00:00.000Z",
    },
  });
  assert.equal(set.kind, "override-render-dataset.committed");
  const overridden = await projection(session, "urn:test:bld-048:query:revert-overridden");
  assert.equal(overridden.overrides.length, 1);
  assert.equal(
    overridden.values.find((value) => value.sourceFieldIdentity === target.sourceFieldIdentity)
      ?.effectiveDisplay.content.value,
    replacementValue,
  );

  const reverted = await session.service.revertDisplayValue({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.revert-display-value",
    requestId: "urn:test:bld-048:command:revert-one",
    commandId: "presentation-override.revert-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: overridden.workingRevision,
    payload: {
      localOverrideIdentity,
      targetSourceFieldIdentity: target.sourceFieldIdentity,
      expectedOverrideRevision: 1,
    },
  });
  assert.equal(reverted.kind, "override-render-dataset.committed");
  assert.equal(reverted.commandId, "presentation-override.revert-display-value");
  const restoredSource = await projection(session, "urn:test:bld-048:query:revert-source");
  const restoredValue = restoredSource.values.find(
    (value) => value.sourceFieldIdentity === target.sourceFieldIdentity,
  );
  assert.ok(restoredValue);
  assert.equal(restoredSource.overrides.length, 0);
  assert.equal(restoredValue.effectiveDisplay.digest, restoredValue.sourceOriginal.digest);
  assert.equal(restoredValue.application.kind, "source");

  const undone = await session.service.undo({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.undo",
    requestId: "urn:test:bld-048:command:undo-revert-one",
    commandId: "history.undo",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: restoredSource.workingRevision,
    payload: null,
  });
  assert.equal(undone.kind, "override-render-dataset.committed");
  const undoProjection = await projection(session, "urn:test:bld-048:query:undo-revert-one");
  assert.equal(undoProjection.overrides.length, 1);
  assert.equal(
    undoProjection.values.find((value) => value.sourceFieldIdentity === target.sourceFieldIdentity)
      ?.effectiveDisplay.content.value,
    replacementValue,
  );
});
