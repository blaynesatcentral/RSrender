import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import {
  createInMemoryHistoryCore,
  inMemoryHistoryCoreRevision,
} from "../packages/application/dist/index.js";
import {
  historyCoreContractRevision,
  historyCoreSchemaManifest,
  isDurableRevision,
  isHistoryCoreCommittedResult,
  isHistoryCursor,
  parseDurableRevision,
  parseHistoryCursor,
  sha256Utf8,
  validateHistoryCoreCommand,
  validateHistoryCoreResult,
} from "../packages/contracts/dist/index.js";

import {
  historyCapacities,
  historyCore,
  historySnapshotSummary,
  initialHistoryDigest,
  initialHistoryTemplate,
  makeHistoryMutation,
  makeHistoryRedo,
  makeHistoryUndo,
} from "./helpers/bld-011-fixtures.mjs";
import {
  historyPropertyIterationsPerSeed,
  historyPropertySeeds,
  runHistoryPropertyModel,
} from "./helpers/bld-011-property-model.mjs";

function expectUnchanged(core, before) {
  const after = historySnapshotSummary(core);
  assert.deepEqual({ ...after, replayEntryCount: before.replayEntryCount }, before);
}

test("history contract is strict, revision primitives are exact, and lifecycle scopes are excluded", () => {
  assert.equal(historyCoreContractRevision, "bld-011-v1");
  assert.equal(inMemoryHistoryCoreRevision, "bld-011-v1");
  assert.deepEqual(Object.keys(historyCoreSchemaManifest).sort(), [
    "command-result:history.committed",
    "command-result:history.rejected",
    "command:history.redo",
    "command:history.undo",
    "command:synthetic.template-content.replace",
  ]);
  for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) {
    assert.equal(isDurableRevision(value), true);
    assert.equal(isHistoryCursor(value), true);
    assert.equal(parseDurableRevision(value), value);
    assert.equal(parseHistoryCursor(value), value);
  }
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, "0", null]) {
    assert.equal(isDurableRevision(value), false);
    assert.equal(isHistoryCursor(value), false);
  }

  assert.equal(validateHistoryCoreCommand(makeHistoryMutation()).accepted, true);
  assert.equal(validateHistoryCoreCommand(makeHistoryUndo()).accepted, true);
  assert.equal(validateHistoryCoreCommand(makeHistoryRedo()).accepted, true);
  for (const scope of ["application", "document-lifecycle", "workspace", "recovery-policy"]) {
    const result = validateHistoryCoreCommand({ ...makeHistoryUndo(), scope });
    assert.equal(result.accepted, false);
  }
  assert.equal(
    validateHistoryCoreCommand({ ...makeHistoryUndo(), lifecycleEffect: "save" }).accepted,
    false,
  );
  for (let offset = 0; offset < 128; offset += 1) {
    const invalidUnicode = `urn:test:bld-011:${String.fromCharCode(0xd800 + offset)}`;
    assert.equal(
      validateHistoryCoreCommand({ ...makeHistoryUndo(), requestId: invalidUnicode }).accepted,
      false,
    );
    assert.equal(
      validateHistoryCoreCommand({ ...makeHistoryUndo(), documentId: invalidUnicode }).accepted,
      false,
    );
  }
});

test("initial aggregate is the immutable durable baseline without performing Save", () => {
  const core = historyCore();
  const snapshot = core.inspect();
  assert.equal(snapshot.workingRevision, 0);
  assert.equal(snapshot.durableRevision, 0);
  assert.equal(snapshot.aggregate.currentContentDigest, initialHistoryDigest);
  assert.equal(snapshot.aggregateDigest, snapshot.durableAggregateDigest);
  assert.equal(snapshot.dirty, false);
  assert.equal(snapshot.historyLength, 0);
  assert.equal(snapshot.executionTranscriptCount, 0);
});

test("one mutation advances once and creates one separate history entry", async () => {
  const core = historyCore();
  const input = makeHistoryMutation();
  const requestedDigest = input.payload.newContentDigest;
  const result = await core.execute(input);
  input.payload.newContentDigest = sha256Utf8("later-caller-edit");
  assert.equal(isHistoryCoreCommittedResult(result), true);
  assert.equal(result.kind, "history.committed");
  if (result.kind !== "history.committed") return;
  assert.equal(result.operation, "mutation");
  assert.equal(result.previousWorkingRevision, 0);
  assert.equal(result.workingRevision, 1);
  assert.equal(result.durableRevision, 0);
  assert.equal(result.historyCursor, 1);
  assert.equal(result.historyLength, 1);
  assert.equal(result.dirty, true);
  assert.match(result.historyEntryIdentity, /^urn:rsrender:history-entry:/u);
  assert.doesNotMatch(result.historyEntryIdentity, /synthetic-commit/u);

  const snapshot = core.inspect();
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.executionTranscriptCount, 1);
  assert.equal(snapshot.history[0].sourceRequestId, result.requestId);
  assert.equal(snapshot.history[0].forwardCommand.payload.newContentDigest, requestedDigest);
  assert.equal(Object.isFrozen(snapshot.history[0].forwardCommand), true);
  assert.equal(Object.isFrozen(snapshot.history[0].forwardCommand.payload), true);
  assert.equal(snapshot.history[0].beforeAggregate.currentContentDigest, initialHistoryDigest);
  assert.equal(
    snapshot.history[0].afterAggregate.currentContentDigest,
    snapshot.aggregate.currentContentDigest,
  );
  assert.equal(snapshot.durableRevision, 0);
});

test("result validation rejects impossible revision, cursor, operation, identity, and reason states", async () => {
  const core = historyCore();
  const committed = await core.execute(makeHistoryMutation());
  assert.equal(validateHistoryCoreResult(committed).accepted, true);
  assert.equal(committed.kind, "history.committed");
  if (committed.kind !== "history.committed") return;
  const forged = [
    { ...committed, workingRevision: committed.previousWorkingRevision },
    { ...committed, historyCursor: committed.historyLength + 1 },
    { ...committed, dirty: false },
    { ...committed, operation: "undo" },
    { ...committed, historyCursor: 0 },
    { ...committed, requestId: `urn:test:${String.fromCharCode(0xd800)}` },
    { ...committed, historyEntryIdentity: "" },
  ];
  for (const value of forged) assert.equal(validateHistoryCoreResult(value).accepted, false);

  const rejected = await core.execute(
    makeHistoryRedo({ requestId: "urn:test:bld-011:result:rejected", expectedWorkingRevision: 1 }),
  );
  assert.equal(validateHistoryCoreResult(rejected).accepted, true);
  assert.equal(
    validateHistoryCoreResult({ ...rejected, reason: "HISTORY_INTEGRITY_FAILURE" }).accepted,
    false,
  );
  assert.equal(
    validateHistoryCoreResult({ ...rejected, reason: "SAVE_ROLLED_BACK" }).accepted,
    false,
  );
});

test("Undo and Redo are commands that advance working revision and apply the exact stored states", async () => {
  const core = historyCore();
  const mutation = await core.execute(makeHistoryMutation());
  assert.equal(mutation.kind, "history.committed");
  if (mutation.kind !== "history.committed") return;
  const changedDigest = core.inspect().aggregateDigest;

  const undo = await core.execute(makeHistoryUndo());
  assert.equal(undo.kind, "history.committed");
  if (undo.kind !== "history.committed") return;
  assert.equal(undo.operation, "undo");
  assert.equal(undo.workingRevision, 2);
  assert.equal(undo.historyEntryIdentity, mutation.historyEntryIdentity);
  assert.equal(undo.historyCursor, 0);
  assert.equal(undo.historyLength, 1);
  assert.equal(undo.dirty, true);
  assert.equal(core.inspect().aggregate.currentContentDigest, initialHistoryDigest);
  assert.equal(core.inspect().aggregateDigest, core.inspect().durableAggregateDigest);
  assert.ok(core.inspect().workingRevision > core.inspect().durableRevision);

  const redo = await core.execute(makeHistoryRedo());
  assert.equal(redo.kind, "history.committed");
  if (redo.kind !== "history.committed") return;
  assert.equal(redo.operation, "redo");
  assert.equal(redo.workingRevision, 3);
  assert.equal(redo.historyEntryIdentity, mutation.historyEntryIdentity);
  assert.equal(redo.historyCursor, 1);
  assert.equal(redo.historyLength, 1);
  assert.equal(redo.aggregateDigest, changedDigest);
  assert.equal(redo.dirty, true);
  assert.equal(core.inspect().durableRevision, 0);
  assert.equal(core.inspect().executionTranscriptCount, 3);
});

test("captured working revision remains immutable after later mutation, Undo, and Redo", async () => {
  const core = historyCore();
  const captured = core.captureWorkingRevision();
  const capturedJson = JSON.stringify(captured);
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.aggregate), true);
  assert.match(captured.capturedRevisionIdentity, /^urn:rsrender:captured-revision:/u);

  await core.execute(makeHistoryMutation());
  await core.execute(makeHistoryUndo());
  await core.execute(makeHistoryRedo());
  assert.equal(JSON.stringify(captured), capturedJson);
  assert.equal(captured.workingRevision, 0);
  assert.equal(captured.aggregate.currentContentDigest, initialHistoryDigest);
  assert.equal(core.captureWorkingRevision().workingRevision, 3);
});

test("stale, wrong-scope, empty-history, and malformed operations mutate nothing", async () => {
  const core = historyCore();
  for (const command of [
    makeHistoryUndo({ expectedWorkingRevision: 0 }),
    makeHistoryRedo({ expectedWorkingRevision: 0 }),
    makeHistoryMutation({ requestId: "urn:test:bld-011:wrong-doc", documentId: "urn:test:other" }),
    makeHistoryMutation({ requestId: "urn:test:bld-011:wrong-owner", ownerGeneration: 12 }),
    makeHistoryMutation({ requestId: "urn:test:bld-011:stale", expectedWorkingRevision: 9 }),
    {
      ...makeHistoryUndo({ requestId: "urn:test:bld-011:lifecycle", expectedWorkingRevision: 0 }),
      scope: "document-lifecycle",
    },
  ]) {
    const before = historySnapshotSummary(core);
    const result = await core.execute(command);
    assert.equal(result.kind, "history.rejected");
    expectUnchanged(core, before);
  }
});

test("a new mutation after Undo invalidates exactly the abandoned Redo branch", async () => {
  const core = historyCore();
  const digestTwo = sha256Utf8("branch-two");
  const digestBranch = sha256Utf8("branch-replacement");
  const one = await core.execute(makeHistoryMutation());
  const two = await core.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:branch:two",
      expectedWorkingRevision: 1,
      newContentDigest: digestTwo,
    }),
  );
  assert.equal(one.kind, "history.committed");
  assert.equal(two.kind, "history.committed");
  await core.execute(
    makeHistoryUndo({ requestId: "urn:test:bld-011:branch:undo", expectedWorkingRevision: 2 }),
  );
  const branch = await core.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:branch:new",
      expectedWorkingRevision: 3,
      newContentDigest: digestBranch,
    }),
  );
  assert.equal(branch.kind, "history.committed");
  const snapshot = core.inspect();
  assert.equal(snapshot.workingRevision, 4);
  assert.equal(snapshot.historyLength, 2);
  assert.equal(snapshot.historyCursor, 2);
  assert.equal(snapshot.canRedo, false);
  assert.equal(snapshot.aggregate.currentContentDigest, digestBranch);
  if (two.kind === "history.committed") {
    assert.equal(
      snapshot.history.some((entry) => entry.historyEntryIdentity === two.historyEntryIdentity),
      false,
    );
  }
  const beforeRedo = historySnapshotSummary(core);
  const redo = await core.execute(
    makeHistoryRedo({ requestId: "urn:test:bld-011:branch:redo", expectedWorkingRevision: 4 }),
  );
  assert.equal(redo.kind, "history.rejected");
  assert.equal(redo.reason, "NOTHING_TO_REDO");
  expectUnchanged(core, beforeRedo);
});

test("request replay is exact and capacity failure never evicts prior identity", async () => {
  const capacities = { ...historyCapacities, replayEntries: 2, historyEntries: 1 };
  const core = historyCore(capacities);
  const command = makeHistoryMutation();
  const first = await core.execute(command);
  const replay = await core.execute({ ...command, payload: { ...command.payload } });
  assert.deepEqual(replay, first);
  assert.equal(core.inspect().workingRevision, 1);

  const drift = await core.execute({ ...command, expectedWorkingRevision: 1 });
  assert.equal(drift.kind, "history.rejected");
  assert.equal(drift.reason, "REQUEST_ID_REUSE_MISMATCH");
  const undo = await core.execute(makeHistoryUndo());
  assert.equal(undo.kind, "history.committed");
  const before = historySnapshotSummary(core);
  const exhausted = await core.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:capacity:new",
      expectedWorkingRevision: 2,
      newContentDigest: sha256Utf8("capacity-new"),
    }),
  );
  assert.equal(exhausted.kind, "history.rejected");
  assert.equal(exhausted.reason, "CAPACITY_EXHAUSTED");
  expectUnchanged(core, before);
  assert.deepEqual(await core.execute(command), first);
});

test("bounded history rejects at the tip and reuses only an explicitly abandoned branch slot", async () => {
  const core = historyCore({ ...historyCapacities, historyEntries: 1 });
  const first = await core.execute(makeHistoryMutation());
  assert.equal(first.kind, "history.committed");
  const beforeOverflow = historySnapshotSummary(core);
  const overflow = await core.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:history-capacity:overflow",
      expectedWorkingRevision: 1,
      newContentDigest: sha256Utf8("history-capacity-overflow"),
    }),
  );
  assert.equal(overflow.kind, "history.rejected");
  assert.equal(overflow.reason, "CAPACITY_EXHAUSTED");
  expectUnchanged(core, beforeOverflow);

  await core.execute(
    makeHistoryUndo({
      requestId: "urn:test:bld-011:history-capacity:undo",
      expectedWorkingRevision: 1,
    }),
  );
  const replacement = await core.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:history-capacity:replacement",
      expectedWorkingRevision: 2,
      newContentDigest: sha256Utf8("history-capacity-replacement"),
    }),
  );
  assert.equal(replacement.kind, "history.committed");
  const snapshot = core.inspect();
  assert.equal(snapshot.historyLength, 1);
  assert.equal(snapshot.historyCursor, 1);
  if (first.kind === "history.committed") {
    assert.notEqual(snapshot.history[0].historyEntryIdentity, first.historyEntryIdentity);
  }

  const delegateBounded = historyCore({
    ...historyCapacities,
    commits: 1,
    events: 1,
  });
  await delegateBounded.execute(makeHistoryMutation());
  const beforeDelegateOverflow = historySnapshotSummary(delegateBounded);
  const delegateOverflow = await delegateBounded.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:delegate-capacity:overflow",
      expectedWorkingRevision: 1,
      newContentDigest: sha256Utf8("delegate-capacity-overflow"),
    }),
  );
  assert.equal(delegateOverflow.kind, "history.rejected");
  assert.equal(delegateOverflow.reason, "CAPACITY_EXHAUSTED");
  expectUnchanged(delegateBounded, beforeDelegateOverflow);
});

test("concurrent same-revision mutations serialize to one history boundary", async () => {
  const core = historyCore();
  const results = await Promise.all([
    core.execute(makeHistoryMutation({ requestId: "urn:test:bld-011:race:a" })),
    core.execute(
      makeHistoryMutation({
        requestId: "urn:test:bld-011:race:b",
        newContentDigest: sha256Utf8("race-b"),
      }),
    ),
  ]);
  assert.deepEqual(
    results.map((result) => (result.kind === "history.committed" ? "committed" : result.reason)),
    ["committed", "STALE_WORKING_REVISION"],
  );
  const snapshot = core.inspect();
  assert.equal(snapshot.workingRevision, 1);
  assert.equal(snapshot.historyLength, 1);
  assert.equal(snapshot.executionTranscriptCount, 1);
});

test("factory and validator are total over hostile configuration and accessor inputs", async () => {
  assert.deepEqual(createInMemoryHistoryCore(null), {
    accepted: false,
    code: "INITIAL_CONFIGURATION_MALFORMED",
  });
  assert.deepEqual(
    createInMemoryHistoryCore({
      aggregate: null,
      ownerGeneration: 11,
      capacities: historyCapacities,
    }),
    { accepted: false, code: "INITIAL_AGGREGATE_INVALID" },
  );
  assert.deepEqual(
    createInMemoryHistoryCore({
      aggregate: initialHistoryTemplate(),
      ownerGeneration: -1,
      capacities: historyCapacities,
    }),
    { accepted: false, code: "INITIAL_OWNER_GENERATION_INVALID" },
  );
  for (const historyEntries of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, "1"]) {
    const result = createInMemoryHistoryCore({
      aggregate: initialHistoryTemplate(),
      ownerGeneration: 11,
      capacities: { ...historyCapacities, historyEntries },
    });
    assert.deepEqual(result, { accepted: false, code: "INITIAL_CAPACITIES_INVALID" });
  }
  let getterCalls = 0;
  const hostile = makeHistoryUndo();
  Object.defineProperty(hostile, "payload", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return null;
    },
  });
  assert.equal(validateHistoryCoreCommand(hostile).accepted, false);
  assert.equal(getterCalls, 0);
  const core = historyCore();
  assert.equal((await core.execute(hostile)).kind, "history.rejected");
  assert.equal(getterCalls, 0);

  const throwingProxy = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("must be contained");
      },
    },
  );
  assert.doesNotThrow(() => createInMemoryHistoryCore(throwingProxy));
  assert.deepEqual(createInMemoryHistoryCore(throwingProxy), {
    accepted: false,
    code: "INITIAL_CONFIGURATION_MALFORMED",
  });
  for (const value of [
    undefined,
    null,
    false,
    1,
    "command",
    Symbol("command"),
    [],
    new Date(0),
    throwingProxy,
  ]) {
    assert.doesNotThrow(() => validateHistoryCoreCommand(value));
    assert.equal(validateHistoryCoreCommand(value).accepted, false);
  }
});

test("seeded command sequences preserve the revision, cursor, branch, and durable model", async () => {
  const result = await runHistoryPropertyModel();
  assert.equal(result.result, "PASS");
  assert.deepEqual(result.seeds, historyPropertySeeds);
  assert.equal(result.iterationsPerSeed, historyPropertyIterationsPerSeed);
  assert.equal(result.generatedOperations, 3_000);
  for (const count of Object.values(result.invariantEvaluations)) assert.equal(count, 3_000);
  assert.match(result.digest, /^sha256:[0-9a-f]{64}$/u);
});

test("full property model and fixed transcript repeat twice in three fresh en-US/UTC processes", () => {
  const runner = fileURLToPath(new URL("./helpers/run-bld-011-vectors.mjs", import.meta.url));
  const outputs = [];
  for (let index = 0; index < 3; index += 1) {
    const child = spawnSync(process.execPath, [runner], {
      encoding: "utf8",
      env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
    });
    assert.equal(child.status, 0, child.stderr);
    outputs.push(child.stdout.trim());
  }
  assert.equal(new Set(outputs).size, 1);
  const parsed = JSON.parse(outputs[0]);
  assert.equal(parsed.result, "PASS");
  assert.equal(parsed.executionProfile.locale, "en-US");
  assert.equal(parsed.executionProfile.timeZone, "UTC");
  assert.equal(parsed.propertyRuns.length, 2);
  for (const run of parsed.propertyRuns) {
    assert.equal(run.result, "PASS");
    assert.equal(run.generatedOperations, 3_000);
    assert.deepEqual(run.seeds, historyPropertySeeds);
    assert.equal(run.iterationsPerSeed, 1_000);
    assert.match(run.digest, /^sha256:[0-9a-f]{64}$/u);
  }
  assert.match(parsed.digest, /^sha256:[0-9a-f]{64}$/u);
});
