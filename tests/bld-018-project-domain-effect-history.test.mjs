import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";

import {
  createInMemoryHistoryCore,
  createInMemoryPhase1ProjectHistoryCore,
} from "../packages/application/dist/index.js";
import {
  commitPreparedProjectDomainEffectTransition,
  createPhase1ProjectHistoryState,
  executeProjectDomainHistoryNavigation,
  inspectPhase1ProjectHistoryState,
  lookupProjectSourceCommandReplay,
  prepareProjectDomainEffectTransition,
} from "../packages/application/dist/project-domain-effect-state.js";
import {
  canonicalizeJson,
  createProjectDomainEffect,
  decodeProjectDomainEffect,
  encodeProjectDomainEffect,
  sha256Utf8,
} from "../packages/contracts/dist/index.js";
import { withCurrentHandle, emptyPhase1Project } from "./helpers/bld-016-fixtures.mjs";
import { historyCapacities, initialHistoryTemplate } from "./helpers/bld-011-fixtures.mjs";
import {
  bld018IterationsPerSeed,
  bld018PropertyInvariants,
  bld018PropertySeeds,
  runBld018PropertyModel,
} from "./helpers/bld-018-property-model.mjs";

const capacities = Object.freeze({
  replayEntries: 64,
  historyEntries: 32,
  commits: 64,
  events: 64,
});
const execFileAsync = promisify(execFile);

function accepted(result) {
  assert.equal(result.accepted, true);
  return result.value;
}

function stateFor(aggregate, override = {}) {
  const result = createPhase1ProjectHistoryState({
    aggregate,
    ownerGeneration: 7,
    capacities: { ...capacities, ...override },
  });
  assert.equal(result.accepted, true);
  return result.state;
}

function projectAtRevision(base, revision, marker) {
  return withCurrentHandle(
    base,
    "presentation-overrides",
    revision,
    sha256Utf8(`bld-018-presentation-overrides:${marker}`),
  );
}

function makeEffect(before, after, index, workingRevision = index - 1) {
  const beforeJson = canonicalizeJson(before);
  const afterJson = canonicalizeJson(after);
  const sourceCommandCanonicalJson = canonicalizeJson({
    contractVersion: 1,
    kind: "bld-018.synthetic-project-mutation",
    requestId: `urn:rsrender:bld-018-request:${index}`,
    payload: { marker: `change-${index}` },
  });
  return accepted(
    createProjectDomainEffect({
      sourceRequestId: `urn:rsrender:bld-018-request:${index}`,
      sourceCommandCanonicalJson,
      sourceCommandIdentity: "urn:rsrender:command:bld-018.synthetic-project-mutation",
      commandLabel: `Synthetic project mutation ${index}`,
      documentId: before.documentIdentity,
      ownerGeneration: 7,
      expectedWorkingRevision: workingRevision,
      beforeAggregateCanonicalJson: beforeJson,
      afterAggregateCanonicalJson: afterJson,
      affectedIdentities: [before.documentIdentity],
      invalidations: ["render-dataset"],
      eventResult: {
        resultCode: "BLD_018_SYNTHETIC_MUTATION_APPLIED",
        canonicalPayload: canonicalizeJson({ marker: `change-${index}` }),
      },
    }),
  );
}

function recreateEffect(effect, changes = {}) {
  return accepted(
    createProjectDomainEffect({
      sourceRequestId: effect.sourceRequestId,
      sourceCommandCanonicalJson: effect.sourceCommandCanonicalJson,
      sourceCommandIdentity: effect.sourceCommandIdentity,
      commandLabel: effect.commandLabel,
      documentId: effect.documentId,
      ownerGeneration: effect.ownerGeneration,
      expectedWorkingRevision: effect.expectedWorkingRevision,
      beforeAggregateCanonicalJson: effect.beforeAggregate.canonicalJson,
      afterAggregateCanonicalJson: effect.afterAggregate.canonicalJson,
      affectedIdentities: effect.affectedIdentities,
      invalidations: effect.invalidations,
      eventResult: {
        resultCode: effect.eventResult.resultCode,
        canonicalPayload: effect.eventResult.canonicalPayload,
      },
      ...changes,
    }),
  );
}

function navigation(kind, aggregate, workingRevision, index) {
  return Object.freeze({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-018-${kind}:${index}`,
    commandId: kind,
    documentId: aggregate.documentIdentity,
    ownerGeneration: 7,
    expectedWorkingRevision: workingRevision,
    payload: null,
  });
}

function deepFrozen(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) deepFrozen(child, seen);
}

test("closed effect derives command/effect digests and round-trips immutable canonical bytes", () => {
  const before = emptyPhase1Project();
  const after = projectAtRevision(before, 1, "one");
  const effect = makeEffect(before, after, 1);
  assert.equal(effect.sourceCommandDigest, sha256Utf8(effect.sourceCommandCanonicalJson));
  assert.match(effect.effectIdentity, /^urn:rsrender:project-domain-effect:sha256:[0-9a-f]{64}$/u);
  assert.equal(
    effect.forwardApplication.replacementAggregateCanonicalJson,
    canonicalizeJson(after),
  );
  assert.equal(
    effect.inverseApplication.replacementAggregateCanonicalJson,
    canonicalizeJson(before),
  );
  assert.equal(effect.eventResult.payloadDigest, sha256Utf8(effect.eventResult.canonicalPayload));
  deepFrozen(effect);
  assert.deepEqual(decodeProjectDomainEffect(JSON.parse(JSON.stringify(effect))), {
    accepted: true,
    value: effect,
  });
  const encoded = encodeProjectDomainEffect(effect);
  assert.equal(encoded.accepted, true);
  assert.equal(encoded.value.digest, sha256Utf8(encoded.value.canonicalJson));
});

test("effect boundary rejects untrusted derived fields and hostile/noncanonical structures", () => {
  const before = emptyPhase1Project();
  const effect = makeEffect(before, projectAtRevision(before, 1, "one"), 1);
  assert.deepEqual(
    decodeProjectDomainEffect({ ...effect, sourceCommandDigest: sha256Utf8("forged") }),
    { accepted: false, code: "PROJECT_EFFECT_CONTRACT_DIGEST_MISMATCH" },
  );
  assert.deepEqual(
    decodeProjectDomainEffect({ ...effect, effectIdentity: `${effect.effectIdentity}:forged` }),
    { accepted: false, code: "PROJECT_EFFECT_CONTRACT_IDENTITY_MISMATCH" },
  );
  assert.equal(
    createProjectDomainEffect({
      sourceRequestId: effect.sourceRequestId,
      sourceCommandCanonicalJson: '{"z":1,"a":2}',
      sourceCommandIdentity: effect.sourceCommandIdentity,
      commandLabel: effect.commandLabel,
      documentId: effect.documentId,
      ownerGeneration: effect.ownerGeneration,
      expectedWorkingRevision: effect.expectedWorkingRevision,
      beforeAggregateCanonicalJson: effect.beforeAggregate.canonicalJson,
      afterAggregateCanonicalJson: effect.afterAggregate.canonicalJson,
      affectedIdentities: effect.affectedIdentities,
      invalidations: effect.invalidations,
      eventResult: { resultCode: "x", canonicalPayload: "{}" },
    }).accepted,
    false,
  );
  const accessor = { ...effect };
  Object.defineProperty(accessor, "commandLabel", { enumerable: true, get: () => "executed" });
  assert.deepEqual(decodeProjectDomainEffect(accessor), {
    accepted: false,
    code: "PROJECT_EFFECT_CONTRACT_MALFORMED",
  });
  const symbol = { ...effect, [Symbol("hostile")]: true };
  assert.deepEqual(decodeProjectDomainEffect(symbol), {
    accepted: false,
    code: "PROJECT_EFFECT_CONTRACT_EXTRA_FIELD",
  });
  assert.equal(
    decodeProjectDomainEffect({
      ...effect,
      inverseApplication: {
        ...effect.inverseApplication,
        replacementAggregateCanonicalJson: effect.afterAggregate.canonicalJson,
      },
    }).accepted,
    false,
  );
});

test("nested arrays are closed, Unicode ordered, detached, and recursively immutable", () => {
  const before = emptyPhase1Project();
  const after = projectAtRevision(before, 1, "nested");
  const base = makeEffect(before, after, 1);
  const draft = {
    sourceRequestId: base.sourceRequestId,
    sourceCommandCanonicalJson: base.sourceCommandCanonicalJson,
    sourceCommandIdentity: base.sourceCommandIdentity,
    commandLabel: base.commandLabel,
    documentId: base.documentId,
    ownerGeneration: base.ownerGeneration,
    expectedWorkingRevision: base.expectedWorkingRevision,
    beforeAggregateCanonicalJson: base.beforeAggregate.canonicalJson,
    afterAggregateCanonicalJson: base.afterAggregate.canonicalJson,
    affectedIdentities: ["urn:rsrender:affected:é", "urn:rsrender:affected:𝄞"],
    invalidations: ["alpha", "omega"],
    eventResult: { resultCode: "NESTED", canonicalPayload: "{}" },
  };
  const created = accepted(createProjectDomainEffect(draft));
  draft.affectedIdentities[0] = "urn:mutated";
  draft.invalidations.push("zeta");
  assert.deepEqual(created.affectedIdentities, [
    "urn:rsrender:affected:é",
    "urn:rsrender:affected:𝄞",
  ]);
  assert.deepEqual(created.invalidations, ["alpha", "omega"]);
  deepFrozen(created);

  const sparse = new Array(3);
  sparse[0] = "urn:rsrender:affected:a";
  sparse[2] = "urn:rsrender:affected:b";
  const extra = ["urn:rsrender:affected:a"];
  extra.extra = true;
  const symbol = ["urn:rsrender:affected:a"];
  symbol[Symbol("hostile")] = true;
  const accessor = [];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    get: () => "urn:rsrender:affected:a",
  });
  accessor.length = 1;
  for (const affectedIdentities of [sparse, extra, symbol, accessor]) {
    assert.equal(createProjectDomainEffect({ ...draft, affectedIdentities }).accepted, false);
  }
  assert.equal(
    createProjectDomainEffect({
      ...draft,
      affectedIdentities: ["urn:rsrender:affected:𝄞", "urn:rsrender:affected:é"],
    }).accepted,
    false,
  );
  assert.equal(
    createProjectDomainEffect({ ...draft, commandLabel: `bad-${String.fromCharCode(0xd800)}` })
      .accepted,
    false,
  );
});

test("prepare is read-only and commit publishes aggregate, entry, event, and replay together", () => {
  const before = emptyPhase1Project();
  const after = projectAtRevision(before, 1, "one");
  const effect = makeEffect(before, after, 1);
  const state = stateFor(before);
  const initial = inspectPhase1ProjectHistoryState(state);
  const preparation = prepareProjectDomainEffectTransition(state, effect);
  assert.equal(preparation.kind, "ready");
  assert.deepEqual(inspectPhase1ProjectHistoryState(state), initial);
  assert.equal(initial.historyLength, 0);
  assert.equal(initial.events.length, 0);
  assert.equal(initial.replayEntryCount, 0);

  const committed = commitPreparedProjectDomainEffectTransition(state, preparation.prepared);
  assert.equal(committed.accepted, true);
  assert.notEqual(committed.state, state);
  const next = inspectPhase1ProjectHistoryState(committed.state);
  assert.equal(next.workingRevision, 1);
  assert.equal(next.aggregateDigest, effect.afterAggregate.digest);
  assert.equal(next.historyLength, 1);
  assert.equal(next.historyCursor, 1);
  assert.equal(next.events.length, 1);
  assert.equal(next.replayEntryCount, 1);
  assert.equal(next.commitCount, 1);
  assert.equal(next.events[0].result.resultCode, effect.eventResult.resultCode);
  deepFrozen(next);
});

test("read-only replay preflight distinguishes exact replay from request-id reuse mismatch", () => {
  const before = emptyPhase1Project();
  const effect = makeEffect(before, projectAtRevision(before, 1, "one"), 1);
  const state = stateFor(before);
  const prepared = prepareProjectDomainEffectTransition(state, effect);
  assert.equal(prepared.kind, "ready");
  const committed = commitPreparedProjectDomainEffectTransition(state, prepared.prepared);
  assert.equal(committed.accepted, true);
  assert.equal(
    lookupProjectSourceCommandReplay(committed.state, {
      requestId: effect.sourceRequestId,
      sourceCommandDigest: effect.sourceCommandDigest,
    }).kind,
    "replayed",
  );
  assert.equal(
    lookupProjectSourceCommandReplay(committed.state, {
      requestId: effect.sourceRequestId,
      sourceCommandDigest: sha256Utf8("different-command"),
    }).kind,
    "request-id-mismatch",
  );
  const replayPreparation = prepareProjectDomainEffectTransition(committed.state, effect);
  assert.equal(replayPreparation.kind, "replayed");
  assert.equal(inspectPhase1ProjectHistoryState(committed.state).commitCount, 1);
});

test("normal replay binds the full effect even when source command bytes are identical", () => {
  const before = emptyPhase1Project();
  const effect = makeEffect(before, projectAtRevision(before, 1, "one"), 1);
  const changedEffect = recreateEffect(effect, { commandLabel: "Changed audit label" });
  assert.equal(changedEffect.sourceCommandDigest, effect.sourceCommandDigest);
  assert.notEqual(changedEffect.effectIdentity, effect.effectIdentity);
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: before,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  assert.equal(
    created.core.executeProjectDomainEffect(effect).kind,
    "project-domain-history.committed",
  );
  const beforeMismatch = created.core.inspectProject();
  const mismatch = created.core.executeProjectDomainEffect(changedEffect);
  assert.equal(mismatch.kind, "project-domain-history.rejected");
  assert.equal(mismatch.reason, "REQUEST_ID_REUSE_MISMATCH");
  assert.deepEqual(created.core.inspectProject(), beforeMismatch);
  assert.equal(
    created.core.lookupProjectSourceCommandReplay({
      requestId: effect.sourceRequestId,
      sourceCommandDigest: effect.sourceCommandDigest,
    }).kind,
    "replayed",
  );
});

test("semantic effect rejections are replayed exactly with zero domain/history/event mutation", () => {
  const before = emptyPhase1Project();
  const after = projectAtRevision(before, 1, "one");
  const base = makeEffect(before, after, 1);
  const cases = [
    ["DOCUMENT_IDENTITY_MISMATCH", recreateEffect(base, { documentId: "urn:wrong:document" })],
    ["OWNER_GENERATION_MISMATCH", recreateEffect(base, { ownerGeneration: 8 })],
    ["STALE_WORKING_REVISION", recreateEffect(base, { expectedWorkingRevision: 1 })],
    [
      "BEFORE_AGGREGATE_MISMATCH",
      makeEffect(projectAtRevision(before, 1, "other-before"), after, 1, 0),
    ],
  ];
  for (const [reason, effect] of cases) {
    const created = createInMemoryPhase1ProjectHistoryCore({
      aggregate: before,
      ownerGeneration: 7,
      capacities: { ...capacities, subscriptionBatch: 8 },
    });
    assert.equal(created.accepted, true);
    const initial = created.core.inspectProject();
    const first = created.core.executeProjectDomainEffect(effect);
    assert.equal(first.kind, "project-domain-history.rejected");
    assert.equal(first.reason, reason);
    const retained = created.core.inspectProject();
    assert.equal(retained.workingRevision, initial.workingRevision);
    assert.equal(retained.aggregateCanonicalJson, initial.aggregateCanonicalJson);
    assert.equal(retained.historyLength, 0);
    assert.equal(retained.events.length, 0);
    assert.equal(retained.commitCount, 0);
    assert.equal(retained.replayEntryCount, 1);
    assert.deepEqual(created.core.executeProjectDomainEffect(effect), first);
    assert.deepEqual(created.core.inspectProject(), retained);
    const changed = recreateEffect(effect, { commandLabel: `${effect.commandLabel} changed` });
    const mismatch = created.core.executeProjectDomainEffect(changed);
    assert.equal(mismatch.kind, "project-domain-history.rejected");
    assert.equal(mismatch.reason, "REQUEST_ID_REUSE_MISMATCH");
  }
});

test("contract-valid non-Phase1 aggregate bytes reject once and retain only replay metadata", () => {
  const before = emptyPhase1Project();
  const valid = makeEffect(before, projectAtRevision(before, 1, "one"), 1);
  const invalidAggregateEffect = accepted(
    createProjectDomainEffect({
      sourceRequestId: valid.sourceRequestId,
      sourceCommandCanonicalJson: valid.sourceCommandCanonicalJson,
      sourceCommandIdentity: valid.sourceCommandIdentity,
      commandLabel: valid.commandLabel,
      documentId: valid.documentId,
      ownerGeneration: valid.ownerGeneration,
      expectedWorkingRevision: valid.expectedWorkingRevision,
      beforeAggregateCanonicalJson: valid.beforeAggregate.canonicalJson,
      afterAggregateCanonicalJson: "{}",
      affectedIdentities: valid.affectedIdentities,
      invalidations: valid.invalidations,
      eventResult: {
        resultCode: valid.eventResult.resultCode,
        canonicalPayload: valid.eventResult.canonicalPayload,
      },
    }),
  );
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: before,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  const initial = created.core.inspectProject();
  const result = created.core.executeProjectDomainEffect(invalidAggregateEffect);
  assert.equal(result.kind, "project-domain-history.rejected");
  assert.equal(result.reason, "AGGREGATE_CONTRACT_INVALID");
  const after = created.core.inspectProject();
  assert.equal(after.aggregateCanonicalJson, initial.aggregateCanonicalJson);
  assert.equal(after.workingRevision, 0);
  assert.equal(after.historyLength, 0);
  assert.equal(after.events.length, 0);
  assert.equal(after.commitCount, 0);
  assert.equal(after.replayEntryCount, 1);
  assert.deepEqual(created.core.executeProjectDomainEffect(invalidAggregateEffect), result);
});

test("contract-invalid inverse is rejected at the sole public core with no replay fingerprint", () => {
  const before = emptyPhase1Project();
  const effect = makeEffect(before, projectAtRevision(before, 1, "inverse"), 1);
  const inverseForged = {
    ...effect,
    inverseApplication: {
      ...effect.inverseApplication,
      replacementAggregateCanonicalJson: effect.afterAggregate.canonicalJson,
    },
  };
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: before,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  const initial = created.core.inspectProject();
  const result = created.core.executeProjectDomainEffect(inverseForged);
  assert.deepEqual(result, {
    contractVersion: 1,
    messageType: "command-result",
    kind: "project-domain-history.rejected",
    requestId: null,
    reason: "EFFECT_CONTRACT_INVALID",
    changed: false,
    safeActions: [],
  });
  assert.deepEqual(created.core.inspectProject(), initial);
  assert.equal(created.core.inspectProject().replayEntryCount, 0);
});

test("lifecycle/storage/Refresh/callback-looking canonical bytes remain inert metadata", () => {
  const before = emptyPhase1Project();
  const after = projectAtRevision(before, 1, "inert");
  const base = makeEffect(before, after, 1);
  const inert = accepted(
    createProjectDomainEffect({
      sourceRequestId: base.sourceRequestId,
      sourceCommandCanonicalJson: canonicalizeJson({
        callback: "globalThis.__mustNotExecute = true",
        file: { delete: "C:/synthetic" },
        lifecycle: { save: true, close: true },
        refresh: { provider: "never-contact" },
        storage: { write: true },
      }),
      sourceCommandIdentity: base.sourceCommandIdentity,
      commandLabel: base.commandLabel,
      documentId: base.documentId,
      ownerGeneration: base.ownerGeneration,
      expectedWorkingRevision: base.expectedWorkingRevision,
      beforeAggregateCanonicalJson: base.beforeAggregate.canonicalJson,
      afterAggregateCanonicalJson: base.afterAggregate.canonicalJson,
      affectedIdentities: base.affectedIdentities,
      invalidations: base.invalidations,
      eventResult: {
        resultCode: "callback:never-dispatch",
        canonicalPayload: canonicalizeJson({
          callback: "throw new Error('never')",
          publish: true,
          refresh: true,
          save: true,
        }),
      },
    }),
  );
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: before,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  assert.equal(
    created.core.executeProjectDomainEffect(inert).kind,
    "project-domain-history.committed",
  );
  assert.equal(
    created.core.inspectProject().events[0].result.canonicalPayload,
    inert.eventResult.canonicalPayload,
  );
  assert.equal(globalThis.__mustNotExecute, undefined);
});

test("two preparations at one revision admit one commit and reject the stale prepared state", () => {
  const before = emptyPhase1Project();
  const first = makeEffect(before, projectAtRevision(before, 1, "first"), 1);
  const competing = makeEffect(before, projectAtRevision(before, 1, "competing"), 2, 0);
  const state = stateFor(before);
  const p1 = prepareProjectDomainEffectTransition(state, first);
  const p2 = prepareProjectDomainEffectTransition(state, competing);
  assert.equal(p1.kind, "ready");
  assert.equal(p2.kind, "ready");
  const c1 = commitPreparedProjectDomainEffectTransition(state, p1.prepared);
  assert.equal(c1.accepted, true);
  const c2 = commitPreparedProjectDomainEffectTransition(c1.state, p2.prepared);
  assert.equal(c2.accepted, false);
  assert.equal(c2.result.reason, "PREPARED_STATE_MISMATCH");
  assert.equal(inspectPhase1ProjectHistoryState(c2.state).commitCount, 1);
});

test("factory, core, navigation, and prepared-token boundaries are total over hostile values", () => {
  const throwing = new Proxy(
    {},
    {
      getPrototypeOf: () => {
        throw new Error("must not escape");
      },
    },
  );
  assert.doesNotThrow(() => createInMemoryPhase1ProjectHistoryCore(throwing));
  assert.equal(createInMemoryPhase1ProjectHistoryCore(throwing).accepted, false);
  const project = emptyPhase1Project();
  const first = createInMemoryPhase1ProjectHistoryCore({
    aggregate: project,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  const second = createInMemoryPhase1ProjectHistoryCore({
    aggregate: project,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.doesNotThrow(() => first.core.executeProjectDomainEffect(throwing));
  assert.equal(first.core.executeProjectDomainEffect(throwing).reason, "EFFECT_CONTRACT_INVALID");
  assert.doesNotThrow(() => first.core.executeProjectHistoryNavigation(throwing));
  assert.equal(
    first.core.executeProjectHistoryNavigation(throwing).reason,
    "UNKNOWN_HISTORY_OPERATION",
  );
  assert.equal(
    first.core.commitPreparedProjectDomainEffect(Object.freeze({})).reason,
    "HISTORY_INVARIANT_VIOLATION",
  );
  const effect = makeEffect(project, projectAtRevision(project, 1, "prepared"), 1);
  const prepared = first.core.prepareProjectDomainEffect(effect);
  assert.equal(prepared.kind, "ready");
  const before = second.core.inspectProject();
  const wrongCore = second.core.commitPreparedProjectDomainEffect(prepared.prepared);
  assert.equal(wrongCore.kind, "project-domain-history.rejected");
  assert.equal(wrongCore.reason, "PREPARED_STATE_MISMATCH");
  assert.deepEqual(second.core.inspectProject(), before);
});

test("undo/redo and post-undo mutation preserve branch semantics and monotonic revisions", () => {
  const p0 = emptyPhase1Project();
  const p1 = projectAtRevision(p0, 1, "one");
  const p2 = projectAtRevision(p1, 2, "two");
  let state = stateFor(p0);
  for (const effect of [makeEffect(p0, p1, 1), makeEffect(p1, p2, 2)]) {
    const prepared = prepareProjectDomainEffectTransition(state, effect);
    assert.equal(prepared.kind, "ready");
    const committed = commitPreparedProjectDomainEffectTransition(state, prepared.prepared);
    assert.equal(committed.accepted, true);
    state = committed.state;
  }
  const undone = executeProjectDomainHistoryNavigation(state, navigation("history.undo", p0, 2, 1));
  assert.equal(undone.accepted, true);
  state = undone.state;
  assert.equal(
    inspectPhase1ProjectHistoryState(state).aggregateDigest,
    sha256Utf8(canonicalizeJson(p1)),
  );
  const redone = executeProjectDomainHistoryNavigation(state, navigation("history.redo", p0, 3, 1));
  assert.equal(redone.accepted, true);
  assert.equal(
    inspectPhase1ProjectHistoryState(redone.state).aggregateDigest,
    sha256Utf8(canonicalizeJson(p2)),
  );

  const undoAgain = executeProjectDomainHistoryNavigation(
    redone.state,
    navigation("history.undo", p0, 4, 2),
  );
  assert.equal(undoAgain.accepted, true);
  const branchProject = projectAtRevision(p1, 2, "branch");
  const branch = makeEffect(p1, branchProject, 3, 5);
  const prepared = prepareProjectDomainEffectTransition(undoAgain.state, branch);
  assert.equal(prepared.kind, "ready");
  const committed = commitPreparedProjectDomainEffectTransition(undoAgain.state, prepared.prepared);
  assert.equal(committed.accepted, true);
  const snapshot = inspectPhase1ProjectHistoryState(committed.state);
  assert.equal(snapshot.historyLength, 2);
  assert.equal(snapshot.historyCursor, 2);
  assert.equal(snapshot.canRedo, false);
  const noRedo = executeProjectDomainHistoryNavigation(
    committed.state,
    navigation("history.redo", p0, 6, 3),
  );
  assert.equal(noRedo.accepted, true);
  assert.equal(noRedo.result.reason, "NOTHING_TO_REDO");
  assert.equal(inspectPhase1ProjectHistoryState(noRedo.state).canRedo, false);
});

test("capacity rejection leaves every authoritative count and aggregate byte exact", () => {
  const before = emptyPhase1Project();
  const state = stateFor(before, { historyEntries: 1, commits: 1, events: 1, replayEntries: 1 });
  const first = makeEffect(before, projectAtRevision(before, 1, "one"), 1);
  const p1 = prepareProjectDomainEffectTransition(state, first);
  assert.equal(p1.kind, "ready");
  const c1 = commitPreparedProjectDomainEffectTransition(state, p1.prepared);
  assert.equal(c1.accepted, true);
  const after = inspectPhase1ProjectHistoryState(c1.state);
  const secondProject = projectAtRevision(after.aggregate, 2, "two");
  const second = makeEffect(after.aggregate, secondProject, 2, 1);
  const rejected = prepareProjectDomainEffectTransition(c1.state, second);
  assert.equal(rejected.kind, "rejected");
  assert.equal(rejected.result.reason, "CAPACITY_EXHAUSTED");
  assert.deepEqual(inspectPhase1ProjectHistoryState(c1.state), after);
});

test("individual capacity axes fail closed and an abandoned branch reuses its history slot", () => {
  const initial = emptyPhase1Project();
  for (const constrained of ["commits", "events", "historyEntries"]) {
    const created = createInMemoryPhase1ProjectHistoryCore({
      aggregate: initial,
      ownerGeneration: 7,
      capacities: {
        replayEntries: 8,
        historyEntries: constrained === "historyEntries" ? 1 : 8,
        commits: constrained === "commits" ? 1 : 8,
        events: constrained === "events" ? 1 : 8,
        subscriptionBatch: 8,
      },
    });
    assert.equal(created.accepted, true);
    const p1 = projectAtRevision(initial, 1, `${constrained}:one`);
    assert.equal(
      created.core.executeProjectDomainEffect(makeEffect(initial, p1, 1)).kind,
      "project-domain-history.committed",
    );
    const before = created.core.inspectProject();
    const rejected = created.core.executeProjectDomainEffect(
      makeEffect(p1, projectAtRevision(p1, 2, `${constrained}:two`), 2, 1),
    );
    assert.equal(rejected.kind, "project-domain-history.rejected");
    assert.equal(rejected.reason, "CAPACITY_EXHAUSTED");
    const after = created.core.inspectProject();
    assert.equal(after.aggregateCanonicalJson, before.aggregateCanonicalJson);
    assert.equal(after.workingRevision, before.workingRevision);
    assert.equal(after.historyLength, before.historyLength);
    assert.equal(after.events.length, before.events.length);
    assert.equal(after.commitCount, before.commitCount);
    assert.equal(after.replayEntryCount, before.replayEntryCount + 1);
  }

  const replayBounded = createInMemoryPhase1ProjectHistoryCore({
    aggregate: initial,
    ownerGeneration: 7,
    capacities: {
      replayEntries: 1,
      historyEntries: 8,
      commits: 8,
      events: 8,
      subscriptionBatch: 8,
    },
  });
  assert.equal(replayBounded.accepted, true);
  const stale = recreateEffect(makeEffect(initial, projectAtRevision(initial, 1, "stale"), 1), {
    expectedWorkingRevision: 1,
  });
  assert.equal(
    replayBounded.core.executeProjectDomainEffect(stale).reason,
    "STALE_WORKING_REVISION",
  );
  const replayFullBefore = replayBounded.core.inspectProject();
  const full = replayBounded.core.executeProjectDomainEffect(
    makeEffect(initial, projectAtRevision(initial, 1, "full"), 2),
  );
  assert.equal(full.reason, "CAPACITY_EXHAUSTED");
  assert.deepEqual(replayBounded.core.inspectProject(), replayFullBefore);

  const branch = createInMemoryPhase1ProjectHistoryCore({
    aggregate: initial,
    ownerGeneration: 7,
    capacities: {
      replayEntries: 8,
      historyEntries: 1,
      commits: 4,
      events: 4,
      subscriptionBatch: 8,
    },
  });
  assert.equal(branch.accepted, true);
  const firstProject = projectAtRevision(initial, 1, "branch-one");
  branch.core.executeProjectDomainEffect(makeEffect(initial, firstProject, 1));
  branch.core.executeProjectHistoryNavigation(navigation("history.undo", initial, 1, 1));
  const replacement = projectAtRevision(initial, 2, "branch-replacement");
  const replacementResult = branch.core.executeProjectDomainEffect(
    makeEffect(initial, replacement, 2, 2),
  );
  assert.equal(replacementResult.kind, "project-domain-history.committed");
  assert.equal(branch.core.inspectProject().historyLength, 1);
  assert.equal(branch.core.inspectProject().canRedo, false);
});

test("same history implementation exposes a synchronous Phase1 adapter without widening execute", () => {
  const before = emptyPhase1Project();
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: before,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  const effect = makeEffect(before, projectAtRevision(before, 1, "adapter"), 1);
  const result = created.core.executeProjectDomainEffect(effect);
  assert.equal(result.kind, "project-domain-history.committed");
  assert.equal(created.core.inspectProject().workingRevision, 1);
  assert.equal(
    created.core.lookupProjectSourceCommandReplay({
      requestId: effect.sourceRequestId,
      sourceCommandDigest: effect.sourceCommandDigest,
    }).kind,
    "replayed",
  );
});

test("public serialized same-revision execution admits one commit and one retained stale result", async () => {
  const before = emptyPhase1Project();
  const first = makeEffect(before, projectAtRevision(before, 1, "first"), 1, 0);
  const second = makeEffect(before, projectAtRevision(before, 1, "second"), 2, 0);
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: before,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  const results = await Promise.all([
    Promise.resolve().then(() => created.core.executeProjectDomainEffect(first)),
    Promise.resolve().then(() => created.core.executeProjectDomainEffect(second)),
  ]);
  assert.equal(
    results.filter((result) => result.kind === "project-domain-history.committed").length,
    1,
  );
  assert.deepEqual(
    results
      .filter((result) => result.kind === "project-domain-history.rejected")
      .map((result) => result.reason),
    ["STALE_WORKING_REVISION"],
  );
  const snapshot = created.core.inspectProject();
  assert.equal(snapshot.workingRevision, 1);
  assert.equal(snapshot.historyLength, 1);
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.replayEntryCount, 2);
});

test("navigation rejection replay is stable and does not create a history event", () => {
  const project = emptyPhase1Project();
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: project,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  const undo = navigation("history.undo", project, 0, 1);
  const first = created.core.executeProjectHistoryNavigation(undo);
  assert.equal(first.kind, "project-domain-history.rejected");
  assert.equal(first.reason, "NOTHING_TO_UNDO");
  const retained = created.core.inspectProject();
  assert.equal(retained.replayEntryCount, 1);
  assert.equal(retained.historyLength, 0);
  assert.equal(retained.events.length, 0);
  assert.deepEqual(created.core.executeProjectHistoryNavigation(undo), first);
  assert.deepEqual(created.core.inspectProject(), retained);
  const reuse = created.core.executeProjectHistoryNavigation({
    ...undo,
    expectedWorkingRevision: 1,
  });
  assert.equal(reuse.kind, "project-domain-history.rejected");
  assert.equal(reuse.reason, "REQUEST_ID_REUSE_MISMATCH");
});

test("captured Phase1 revisions are exact immutable snapshots", () => {
  const project = emptyPhase1Project();
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: project,
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(created.accepted, true);
  const capture = created.core.captureProjectWorkingRevision();
  assert.equal(capture.aggregateCanonicalJson, canonicalizeJson(project));
  assert.equal(capture.aggregateDigest, sha256Utf8(capture.aggregateCanonicalJson));
  deepFrozen(capture);
  created.core.executeProjectDomainEffect(
    makeEffect(project, projectAtRevision(project, 1, "after-capture"), 1),
  );
  assert.equal(capture.workingRevision, 0);
  assert.equal(capture.aggregateCanonicalJson, canonicalizeJson(project));
});

test("mode-specific facades preserve legacy surface and exclude cross-mode/public generic execution", () => {
  const legacy = createInMemoryHistoryCore({
    aggregate: initialHistoryTemplate(),
    ownerGeneration: 11,
    capacities: historyCapacities,
  });
  assert.equal(legacy.accepted, true);
  const phase1 = createInMemoryPhase1ProjectHistoryCore({
    aggregate: emptyPhase1Project(),
    ownerGeneration: 7,
    capacities: { ...capacities, subscriptionBatch: 8 },
  });
  assert.equal(phase1.accepted, true);
  assert.deepEqual(
    Reflect.ownKeys(Object.getPrototypeOf(legacy.core))
      .filter((key) => key !== "constructor")
      .sort(),
    ["captureWorkingRevision", "execute", "inspect"],
  );
  assert.deepEqual(
    Reflect.ownKeys(Object.getPrototypeOf(phase1.core))
      .filter((key) => key !== "constructor")
      .sort(),
    [
      "captureProjectWorkingRevision",
      "commitPreparedProjectDomainEffect",
      "executeProjectDomainEffect",
      "executeProjectHistoryNavigation",
      "inspectProject",
      "lookupProjectSourceCommandReplay",
      "prepareProjectDomainEffect",
    ],
  );
  assert.equal("executeProjectDomainEffect" in legacy.core, false);
  assert.equal("prepareProjectDomainEffect" in legacy.core, false);
  assert.equal("execute" in phase1.core, false);
  assert.equal("inspect" in phase1.core, false);
  assert.equal("captureWorkingRevision" in phase1.core, false);
  for (const forbidden of [
    "save",
    "publish",
    "refresh",
    "recover",
    "openWorkspace",
    "readSource",
    "writeFile",
  ]) {
    assert.equal(forbidden in phase1.core, false);
  }
});

test("five project-effect history invariants hold for 3 seeds x 1,000 operations", () => {
  assert.deepEqual(bld018PropertyInvariants, [
    "atomicity",
    "full-effect-replay",
    "monotonic-revision-event",
    "bounded-capacity-no-eviction",
    "undo-redo-branch-model",
  ]);
  const summaries = bld018PropertySeeds.map((seed) =>
    runBld018PropertyModel(seed, bld018IterationsPerSeed),
  );
  for (const summary of summaries) {
    assert.equal(summary.iterations, 1_000);
    assert.equal(summary.invariantChecksPerInvariant, 1_000);
    assert.ok(summary.branchReplacementCount > 0);
  }
});

test("EP-PURE repeats the full property transcript in three fresh processes twice", async () => {
  const runner = fileURLToPath(new URL("./helpers/run-bld-018-vectors.mjs", import.meta.url));
  const executions = await Promise.all(
    Array.from({ length: 3 }, () =>
      execFileAsync(process.execPath, [runner], {
        env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30 * 60 * 1_000,
      }),
    ),
  );
  for (const execution of executions) assert.equal(execution.stderr, "");
  const outputs = executions.map(({ stdout }) => stdout.trim());
  assert.equal(new Set(outputs).size, 1);
  const result = JSON.parse(outputs[0]);
  assert.equal(result.repetitions.length, 2);
  assert.equal(new Set(result.repetitions.map(({ digest }) => digest)).size, 1);
  for (const { transcript } of result.repetitions) {
    assert.equal(transcript.runtime.node, "v24.18.1");
    assert.equal(
      transcript.runtime.executableSha256,
      "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582",
    );
    assert.equal(transcript.runtime.locale, "en-US");
    assert.equal(transcript.runtime.timeZone, "UTC");
    assert.equal(transcript.property.cases, 3_000);
    assert.equal(transcript.property.invariantEvaluations, 15_000);
  }
});
