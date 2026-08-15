import { createEmptyLogTemplate } from "../../packages/domain/dist/aggregate-skeleton.js";

export const digestA = `sha256:${"a".repeat(64)}`;
export const digestB = `sha256:${"b".repeat(64)}`;
export const ids = Object.freeze({
  document: "urn:test:bld-010:document:template",
  template: "urn:test:bld-010:template:one",
});
export const defaultCapacities = Object.freeze({
  replayEntries: 4096,
  commits: 1024,
  events: 1024,
  subscriptionBatch: 1024,
});

export function initialTemplate() {
  const result = createEmptyLogTemplate({
    documentIdentity: ids.document,
    templateIdentity: ids.template,
    currentContentDigest: digestA,
  });
  if (!result.accepted) throw new Error(`Fixture aggregate rejected: ${result.code}`);
  return result.value;
}

export function makeCommand({
  requestId = "urn:test:bld-010:request:command:1",
  documentId = ids.document,
  ownerGeneration = 7,
  expectedWorkingRevision = 0,
  newContentDigest = digestB,
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

export function makeQuery({
  requestId = "urn:test:bld-010:request:query:1",
  documentId = ids.document,
  ownerGeneration = 7,
  minimumWorkingRevision = null,
} = {}) {
  return {
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "synthetic.template.projection",
    requestId,
    documentId,
    ownerGeneration,
    minimumWorkingRevision,
  };
}

export function makeSubscription({
  requestId = "urn:test:bld-010:request:subscription:1",
  documentId = ids.document,
  ownerGeneration = 7,
  afterEventSequence = 0,
} = {}) {
  return {
    contractVersion: 1,
    messageType: "subscription-request",
    scope: "document-domain",
    kind: "synthetic.document.events",
    requestId,
    documentId,
    ownerGeneration,
    afterEventSequence,
  };
}

export async function collect(iterable) {
  const values = [];
  for await (const value of iterable) values.push(value);
  return values;
}
