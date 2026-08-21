import { createInMemoryOverrideRenderDatasetService } from "../../packages/application/dist/index.js";
import {
  createEmptyPhase1LogProject,
  createProjectInputRevisionHandle,
  decodePhase1LogProjectAggregate,
  encodeSourceSnapshot,
} from "../../packages/domain/dist/index.js";
import {
  bld017OwnerDocumentIdentity,
  makeAssemblyInput,
  makeOverrideDraft,
} from "./bld-017-fixtures.mjs";

export const bld019OwnerGeneration = 1;

export const bld019Capacities = Object.freeze({
  replayEntries: 64,
  historyEntries: 64,
  commits: 64,
  events: 64,
  subscriptionBatch: 64,
  collectionEntries: 64,
  commandReplayEntries: 64,
});

export function requireInitialized(result) {
  if (!result.accepted) throw new Error(result.code);
  return result.service;
}

export function makeService({
  aggregate,
  collection = null,
  capacities = bld019Capacities,
  ownerGeneration = bld019OwnerGeneration,
  sourceSnapshot,
} = {}) {
  const input = makeAssemblyInput(collection, sourceSnapshot);
  return requireInitialized(
    createInMemoryOverrideRenderDatasetService({
      aggregate: aggregate ?? input.phase1Project,
      ownerGeneration,
      capacities,
      presentationOverrideCollections: collection === null ? [] : [collection],
    }),
  );
}

export function sourceSnapshotEncoding(sourceSnapshot) {
  const snapshot =
    sourceSnapshot ?? makeAssemblyInput(null).phase1Project.phase1Inputs.acceptedSourceSnapshot;
  const encoded = encodeSourceSnapshot(snapshot);
  if (!encoded.accepted) throw new Error(encoded.code);
  return encoded;
}

export function makeAggregateForDocument(documentIdentity) {
  const sourceSnapshot = makeAssemblyInput(null).sourceSnapshot;
  const empty = requireInitializedDomain(
    createEmptyPhase1LogProject({
      documentIdentity,
      sourceContextIdentity: sourceSnapshot.sourceContextIdentity,
      sourceProjectIdentity: sourceSnapshot.sourceProjectIdentity,
    }),
  );
  return requireInitializedDomain(
    decodePhase1LogProjectAggregate({
      ...empty,
      phase1Inputs: {
        ...empty.phase1Inputs,
        acceptedSourceSnapshot: sourceSnapshot,
      },
    }),
  );
}

export function makeUnsupportedInputAggregate(collectionKind) {
  const input = makeAssemblyInput(null);
  const current = requireInitializedDomain(
    createProjectInputRevisionHandle({
      collectionKind,
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      state: "current",
      projectRevision: 1,
      contentDigest: `sha256:${"7".repeat(64)}`,
    }),
  );
  return requireInitializedDomain(
    decodePhase1LogProjectAggregate({
      ...input.phase1Project,
      phase1Inputs: {
        ...input.phase1Project.phase1Inputs,
        revisionHandles: input.phase1Project.phase1Inputs.revisionHandles.map((handle) =>
          handle.collectionKind === collectionKind ? current : handle,
        ),
      },
    }),
  );
}

function requireInitializedDomain(result) {
  if (!result.accepted) throw new Error(result.code);
  return result.value;
}

export function makeSetCommand(changes = {}) {
  const projectedValue = changes.projectedValue;
  const draft = makeOverrideDraft({
    replacementText: changes.replacementText,
    localOverrideIdentity: changes.localOverrideIdentity,
    recordedAtUtc: changes.recordedAtUtc,
  });
  const payload = {
    localOverrideIdentity: draft.localOverrideIdentity,
    targetSourceFieldIdentity:
      changes.targetSourceFieldIdentity ??
      projectedValue?.sourceFieldIdentity ??
      draft.targetSourceFieldIdentity,
    expectedSourceValueDigest:
      changes.expectedSourceValueDigest ??
      projectedValue?.sourceBaselineValueDigest ??
      draft.expectedSourceValueDigest,
    expectedSourceValueType:
      changes.expectedSourceValueType ??
      projectedValue?.sourceOriginal.valueType ??
      draft.expectedSourceValueType,
    expectedSourceUnit:
      changes.expectedSourceUnit ?? projectedValue?.sourceOriginal.unit ?? draft.expectedSourceUnit,
    replacementContent: changes.replacementContent ?? draft.replacementValue.content,
    replacementUnit:
      changes.replacementUnit ?? projectedValue?.sourceOriginal.unit ?? draft.replacementValue.unit,
    reason: changes.reason ?? draft.reason,
    authorIdentity: Object.hasOwn(changes, "authorIdentity")
      ? changes.authorIdentity
      : draft.authorIdentity,
    recordedAtUtc: changes.recordedAtUtc ?? draft.recordedAtUtc,
  };
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: changes.requestId ?? "urn:test:bld-019:request:set:1",
    commandId: "presentation-override.set-display-value",
    documentId: changes.documentId ?? bld017OwnerDocumentIdentity,
    ownerGeneration: changes.ownerGeneration ?? bld019OwnerGeneration,
    expectedWorkingRevision: changes.expectedWorkingRevision ?? 0,
    payload,
  };
}

export function makeUndo(changes = {}) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.undo",
    requestId: changes.requestId ?? "urn:test:bld-019:request:undo:1",
    commandId: "history.undo",
    documentId: changes.documentId ?? bld017OwnerDocumentIdentity,
    ownerGeneration: changes.ownerGeneration ?? bld019OwnerGeneration,
    expectedWorkingRevision: changes.expectedWorkingRevision ?? 1,
    payload: null,
  };
}

export function makeRedo(changes = {}) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.redo",
    requestId: changes.requestId ?? "urn:test:bld-019:request:redo:1",
    commandId: "history.redo",
    documentId: changes.documentId ?? bld017OwnerDocumentIdentity,
    ownerGeneration: changes.ownerGeneration ?? bld019OwnerGeneration,
    expectedWorkingRevision: changes.expectedWorkingRevision ?? 2,
    payload: null,
  };
}

export function makeQuery(changes = {}) {
  return {
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId: changes.requestId ?? "urn:test:bld-019:request:query:1",
    documentId: changes.documentId ?? bld017OwnerDocumentIdentity,
    ownerGeneration: changes.ownerGeneration ?? bld019OwnerGeneration,
    minimumWorkingRevision: Object.hasOwn(changes, "minimumWorkingRevision")
      ? changes.minimumWorkingRevision
      : null,
  };
}

export { bld017OwnerDocumentIdentity };
