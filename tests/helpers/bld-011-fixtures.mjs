import { createInMemoryHistoryCore } from "../../packages/application/dist/index.js";
import { sha256Utf8 } from "../../packages/contracts/dist/index.js";
import { createEmptyLogTemplate } from "../../packages/domain/dist/aggregate-skeleton.js";

export const historyIds = Object.freeze({
  document: "urn:test:bld-011:document:template",
  template: "urn:test:bld-011:template:one",
});

export const initialHistoryDigest = sha256Utf8("bld-011-initial");
export const historyCapacities = Object.freeze({
  replayEntries: 4096,
  historyEntries: 1024,
  commits: 4096,
  events: 4096,
  subscriptionBatch: 4096,
});

export function initialHistoryTemplate() {
  const result = createEmptyLogTemplate({
    documentIdentity: historyIds.document,
    templateIdentity: historyIds.template,
    currentContentDigest: initialHistoryDigest,
  });
  if (!result.accepted) throw new Error(`Fixture aggregate rejected: ${result.code}`);
  return result.value;
}

export function historyCore(capacities = historyCapacities) {
  const result = createInMemoryHistoryCore({
    aggregate: initialHistoryTemplate(),
    ownerGeneration: 11,
    capacities,
  });
  if (!result.accepted) throw new Error(`History core rejected: ${result.code}`);
  return result.core;
}

export function makeHistoryMutation({
  requestId = "urn:test:bld-011:request:mutation:1",
  documentId = historyIds.document,
  ownerGeneration = 11,
  expectedWorkingRevision = 0,
  newContentDigest = sha256Utf8("bld-011-mutation-1"),
} = {}) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "synthetic.template-content.replace",
    requestId,
    commandId: "synthetic.template-content.replace",
    documentId,
    ownerGeneration,
    expectedWorkingRevision,
    payload: { newContentDigest },
  };
}

export function makeHistoryUndo({
  requestId = "urn:test:bld-011:request:undo:1",
  documentId = historyIds.document,
  ownerGeneration = 11,
  expectedWorkingRevision = 1,
} = {}) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.undo",
    requestId,
    commandId: "history.undo",
    documentId,
    ownerGeneration,
    expectedWorkingRevision,
    payload: null,
  };
}

export function makeHistoryRedo({
  requestId = "urn:test:bld-011:request:redo:1",
  documentId = historyIds.document,
  ownerGeneration = 11,
  expectedWorkingRevision = 2,
} = {}) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.redo",
    requestId,
    commandId: "history.redo",
    documentId,
    ownerGeneration,
    expectedWorkingRevision,
    payload: null,
  };
}

export function historySnapshotSummary(core) {
  const snapshot = core.inspect();
  return {
    workingRevision: snapshot.workingRevision,
    durableRevision: snapshot.durableRevision,
    contentDigest: snapshot.aggregate.currentContentDigest,
    aggregateDigest: snapshot.aggregateDigest,
    dirty: snapshot.dirty,
    historyCursor: snapshot.historyCursor,
    historyLength: snapshot.historyLength,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    replayEntryCount: snapshot.replayEntryCount,
    executionTranscriptCount: snapshot.executionTranscriptCount,
    historyEntryIdentities: snapshot.history.map((entry) => entry.historyEntryIdentity),
  };
}
