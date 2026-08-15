import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import {
  applicationServiceContractRevision,
  applicationServiceSchemaManifest,
  canonicalApplicationServiceRequest,
  isEventSequence,
  isOwnerGeneration,
  isWorkingRevision,
  parseEventSequence,
  parseOwnerGeneration,
  parseWorkingRevision,
  sha256CanonicalJson,
  sha256Utf8,
  validateApplicationServiceCommand,
  validateApplicationServiceMessage,
} from "../packages/contracts/dist/index.js";
import {
  advanceProjectionReplica,
  ApplicationServiceSubscriptionError,
  createInMemoryApplicationService,
  createProjectionReplica,
  inMemoryApplicationServiceRevision,
} from "../packages/application/dist/index.js";
import {
  collect,
  defaultCapacities,
  digestA,
  digestB,
  ids,
  initialTemplate,
  makeCommand,
  makeQuery,
  makeSubscription,
} from "./helpers/bld-010-fixtures.mjs";

function service(capacities = defaultCapacities) {
  const result = createInMemoryApplicationService({
    aggregate: initialTemplate(),
    ownerGeneration: 7,
    capacities,
  });
  assert.equal(result.accepted, true);
  if (!result.accepted) throw new Error(result.code);
  return result.service;
}

function expectUnchanged(actual, before) {
  const after = actual.inspect();
  assert.equal(after.workingRevision, before.workingRevision);
  assert.equal(after.eventSequence, before.eventSequence);
  assert.equal(after.aggregate.currentContentDigest, before.aggregate.currentContentDigest);
  assert.equal(after.commits.length, before.commits.length);
  assert.equal(after.retainedEvents.length, before.retainedEvents.length);
}

test("application-service contract has exact revisions, strict scalars, and closed schemas", () => {
  assert.equal(applicationServiceContractRevision, "bld-010-v1");
  assert.equal(inMemoryApplicationServiceRevision, "bld-010-v1");
  assert.deepEqual(Object.keys(applicationServiceSchemaManifest).sort(), [
    "command-result:domainCommitted",
    "command-result:rejected",
    "command:synthetic.template-content.replace",
    "event:synthetic.template-content.replaced",
    "query-result:rejected",
    "query-result:synthetic.template.projection.result",
    "query:synthetic.template.projection",
    "subscription-request:synthetic.document.events",
  ]);
  for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) {
    assert.equal(isWorkingRevision(value), true);
    assert.equal(isEventSequence(value), true);
    assert.equal(isOwnerGeneration(value), true);
  }
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, "0", null]) {
    assert.equal(isWorkingRevision(value), false);
    assert.throws(() => parseWorkingRevision(value), /WORKING_REVISION_INVALID/u);
    assert.throws(() => parseEventSequence(value), /EVENT_SEQUENCE_INVALID/u);
    assert.throws(() => parseOwnerGeneration(value), /OWNER_GENERATION_INVALID/u);
  }
  assert.equal(parseWorkingRevision(4), 4);
  assert.equal(canonicalApplicationServiceRequest(makeCommand()).startsWith("{"), true);

  const badReason = {
    contractVersion: 1,
    messageType: "command-result",
    kind: "rejected",
    requestId: null,
    reason: "INVENTED_REASON",
    changed: false,
    safeActions: [],
  };
  assert.deepEqual(validateApplicationServiceMessage(badReason), {
    accepted: false,
    code: "APPLICATION_CONTRACT_WRONG_TYPE",
  });
});

test("inert query returns the exact revision-tagged projection without mutation", async () => {
  const actual = service();
  const before = actual.inspect();
  const result = await actual.query(makeQuery());
  assert.deepEqual(result, {
    contractVersion: 1,
    messageType: "query-result",
    kind: "synthetic.template.projection.result",
    requestId: "urn:test:bld-010:request:query:1",
    documentId: ids.document,
    ownerGeneration: 7,
    workingRevision: 0,
    eventSequence: 0,
    projection: {
      projectionVersion: 1,
      projectionKind: "synthetic.template.projection",
      documentId: ids.document,
      aggregateVersion: 1,
      aggregateKind: "log-template",
      templateIdentity: ids.template,
      currentContentDigest: digestA,
      aggregateDigest: sha256CanonicalJson(initialTemplate()),
    },
  });
  assert.equal(validateApplicationServiceMessage(result).accepted, true);
  expectUnchanged(actual, before);
});

test("valid synthetic mutation makes one atomic commit and ordered result/event/projection", async () => {
  const actual = service();
  const result = await actual.execute(makeCommand());
  assert.equal(result.kind, "domainCommitted");
  if (result.kind !== "domainCommitted") return;
  assert.equal(result.previousWorkingRevision, 0);
  assert.equal(result.workingRevision, 1);
  assert.equal(result.eventSequence, 1);
  assert.match(result.commitIdentity, /^urn:rsrender:synthetic-commit:[0-9a-f]{64}$/u);
  assert.notEqual(result.beforeAggregateDigest, result.afterAggregateDigest);
  assert.equal(validateApplicationServiceMessage(result).accepted, true);

  const snapshot = actual.inspect();
  assert.equal(snapshot.workingRevision, 1);
  assert.equal(snapshot.eventSequence, 1);
  assert.equal(snapshot.aggregate.currentContentDigest, digestB);
  assert.equal(snapshot.commits.length, 1);
  assert.equal(snapshot.retainedEvents.length, 1);
  assert.equal(snapshot.commits[0].commitIdentity, result.commitIdentity);
  assert.equal(snapshot.commits[0].beforeAggregate.currentContentDigest, digestA);
  assert.equal(snapshot.commits[0].afterAggregate.currentContentDigest, digestB);

  const events = await collect(actual.subscribe(makeSubscription()));
  assert.equal(events.length, 1);
  assert.equal(events[0].commitIdentity, result.commitIdentity);
  assert.equal(events[0].baseWorkingRevision, 0);
  assert.equal(events[0].resultingWorkingRevision, 1);
  assert.equal(validateApplicationServiceMessage(events[0]).accepted, true);

  const queried = await actual.query(
    makeQuery({ requestId: "urn:test:bld-010:request:query:after", minimumWorkingRevision: 1 }),
  );
  assert.equal(queried.kind, "synthetic.template.projection.result");
  if (queried.kind === "synthetic.template.projection.result") {
    assert.deepEqual(queried.projection, events[0].projection);
    assert.equal(queried.workingRevision, events[0].resultingWorkingRevision);
  }
});

test("same request and canonical envelope returns cached result; any reuse drift rejects", async () => {
  const actual = service();
  const command = makeCommand();
  const first = await actual.execute(command);
  const beforeReplay = actual.inspect();
  const reordered = {
    payload: { newContentDigest: command.payload.newContentDigest },
    expectedWorkingRevision: command.expectedWorkingRevision,
    ownerGeneration: command.ownerGeneration,
    documentId: command.documentId,
    commandId: command.commandId,
    requestId: command.requestId,
    kind: command.kind,
    scope: command.scope,
    messageType: command.messageType,
    contractVersion: command.contractVersion,
  };
  const replay = await actual.execute(reordered);
  assert.equal(replay, first);
  expectUnchanged(actual, beforeReplay);

  for (const changed of [
    makeCommand({ requestId: command.requestId, newContentDigest: sha256Utf8("different") }),
    makeCommand({ requestId: command.requestId, expectedWorkingRevision: 1 }),
    { ...command, scope: "application" },
  ]) {
    const rejected = await actual.execute(changed);
    assert.equal(rejected.kind, "rejected");
    if (rejected.kind === "rejected") {
      assert.equal(rejected.reason, "REQUEST_ID_REUSE_MISMATCH");
    }
    expectUnchanged(actual, beforeReplay);
  }
});

test("concurrent same-revision commands serialize to one commit and one stale rejection", async () => {
  const actual = service();
  const results = await Promise.all([
    actual.execute(
      makeCommand({
        requestId: "urn:test:bld-010:race:a",
        newContentDigest: sha256Utf8("race:a"),
      }),
    ),
    actual.execute(
      makeCommand({
        requestId: "urn:test:bld-010:race:b",
        newContentDigest: sha256Utf8("race:b"),
      }),
    ),
  ]);
  assert.deepEqual(
    results.map((result) =>
      result.kind === "domainCommitted" ? result.kind : `${result.kind}:${result.reason}`,
    ),
    ["domainCommitted", "rejected:STALE_WORKING_REVISION"],
  );
  const snapshot = actual.inspect();
  assert.equal(snapshot.workingRevision, 1);
  assert.equal(snapshot.eventSequence, 1);
  assert.equal(snapshot.commits.length, 1);
  assert.equal(snapshot.retainedEvents.length, 1);
  assert.equal(snapshot.replayEntryCount, 2);
});

test("stale, malformed, unknown, owner, document, minimum-revision, and precondition failures mutate nothing", async () => {
  const cases = [
    [
      makeCommand({ requestId: "urn:test:bld-010:fault:stale", expectedWorkingRevision: 3 }),
      "STALE_WORKING_REVISION",
    ],
    [
      makeCommand({ requestId: "urn:test:bld-010:fault:owner", ownerGeneration: 8 }),
      "OWNER_GENERATION_MISMATCH",
    ],
    [
      makeCommand({ requestId: "urn:test:bld-010:fault:document", documentId: "urn:test:other" }),
      "DOCUMENT_IDENTITY_MISMATCH",
    ],
    [
      makeCommand({ requestId: "urn:test:bld-010:fault:precondition", newContentDigest: digestA }),
      "INVALID_PRECONDITION",
    ],
    [
      { ...makeCommand({ requestId: "urn:test:bld-010:fault:extra" }), extra: true },
      "CONTRACT_MALFORMED",
    ],
    [
      {
        ...makeCommand({ requestId: "urn:test:bld-010:fault:unknown" }),
        kind: "invented.command",
        commandId: "invented.command",
      },
      "UNKNOWN_COMMAND",
    ],
    [
      { ...makeCommand({ requestId: "urn:test:bld-010:fault:version" }), contractVersion: 2 },
      "CONTRACT_UNSUPPORTED_VERSION",
    ],
  ];
  for (const [command, reason] of cases) {
    const actual = service();
    const before = actual.inspect();
    const result = await actual.execute(command);
    assert.equal(result.kind, "rejected");
    if (result.kind === "rejected") assert.equal(result.reason, reason);
    expectUnchanged(actual, before);
  }

  const actual = service();
  const before = actual.inspect();
  const unavailable = await actual.query(makeQuery({ minimumWorkingRevision: 1 }));
  assert.equal(unavailable.kind, "rejected");
  if (unavailable.kind === "rejected") {
    assert.equal(unavailable.reason, "MINIMUM_WORKING_REVISION_UNAVAILABLE");
  }
  expectUnchanged(actual, before);
});

test("validation rejects hostile prototype, symbol, hidden, and accessor envelopes without invoking code", async () => {
  const actual = service();
  let getterCalls = 0;
  const accessor = makeCommand({ requestId: "urn:test:bld-010:hostile:accessor" });
  Object.defineProperty(accessor, "payload", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return { newContentDigest: digestB };
    },
  });
  const symbol = makeCommand({ requestId: "urn:test:bld-010:hostile:symbol" });
  symbol[Symbol("hidden")] = true;
  const hidden = makeCommand({ requestId: "urn:test:bld-010:hostile:hidden" });
  Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
  const inherited = Object.assign(
    Object.create({ inherited: true }),
    makeCommand({ requestId: "urn:test:bld-010:hostile:prototype" }),
  );
  const nestedAccessor = makeCommand({ requestId: "urn:test:bld-010:hostile:nested" });
  Object.defineProperty(nestedAccessor.payload, "newContentDigest", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return digestB;
    },
  });
  for (const input of [accessor, symbol, hidden, inherited, nestedAccessor]) {
    const before = actual.inspect();
    const result = await actual.execute(input);
    assert.equal(result.kind, "rejected");
    if (result.kind === "rejected") assert.equal(result.reason, "CONTRACT_MALFORMED");
    expectUnchanged(actual, before);
  }
  assert.equal(getterCalls, 0);
});

test("projection replica applies exact next event and discards gaps/mismatches for refetch", async () => {
  const actual = service();
  const initial = await actual.query(makeQuery());
  assert.equal(initial.kind, "synthetic.template.projection.result");
  if (initial.kind !== "synthetic.template.projection.result") return;
  const initialReplicaResult = createProjectionReplica(initial);
  assert.equal(initialReplicaResult.accepted, true);
  if (!initialReplicaResult.accepted) return;
  const initialReplica = initialReplicaResult.state;
  await actual.execute(makeCommand());
  const eventOne = (await collect(actual.subscribe(makeSubscription())))[0];
  const applied = advanceProjectionReplica(initialReplica, eventOne);
  assert.equal(applied.action, "applied");
  if (applied.action === "applied") {
    assert.equal(applied.state.workingRevision, 1);
    assert.equal(applied.state.projection.currentContentDigest, digestB);
  }

  await actual.execute(
    makeCommand({
      requestId: "urn:test:bld-010:request:command:2",
      expectedWorkingRevision: 1,
      newContentDigest: sha256Utf8("third"),
    }),
  );
  const eventTwo = (
    await collect(actual.subscribe(makeSubscription({ afterEventSequence: 1 })))
  )[0];
  assert.deepEqual(advanceProjectionReplica(initialReplica, eventTwo), {
    action: "discard-and-refetch",
    reason: "EVENT_SEQUENCE_GAP",
    discardedState: null,
  });
  assert.equal(
    advanceProjectionReplica(initialReplica, { ...eventOne, ownerGeneration: 9 }).reason,
    "OWNER_GENERATION_CHANGED",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, { ...eventOne, documentId: "urn:test:other" }).reason,
    "DOCUMENT_IDENTITY_CHANGED",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, { ...eventOne, baseWorkingRevision: 9 }).reason,
    "BASE_WORKING_REVISION_MISMATCH",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      resultingWorkingRevision: 999,
    }).reason,
    "RESULTING_WORKING_REVISION_MISMATCH",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      projection: { ...eventOne.projection, documentId: "urn:test:other" },
    }).reason,
    "PROJECTION_IDENTITY_CHANGED",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      projection: { ...eventOne.projection, templateIdentity: "urn:test:other-template" },
    }).reason,
    "PROJECTION_IDENTITY_CHANGED",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      beforeAggregateDigest: sha256Utf8("wrong-before"),
    }).reason,
    "BEFORE_AGGREGATE_DIGEST_MISMATCH",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      afterAggregateDigest: sha256Utf8("wrong-after"),
    }).reason,
    "AFTER_AGGREGATE_DIGEST_MISMATCH",
  );
  const forgedAggregateDigest = `sha256:${"c".repeat(64)}`;
  const forgedCommitDigest = sha256CanonicalJson({
    commandId: eventOne.commandId,
    documentId: eventOne.documentId,
    requestId: eventOne.sourceRequestId,
    resultingWorkingRevision: eventOne.resultingWorkingRevision,
    beforeAggregateDigest: eventOne.beforeAggregateDigest,
    afterAggregateDigest: forgedAggregateDigest,
  });
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      afterAggregateDigest: forgedAggregateDigest,
      commitIdentity: `urn:rsrender:synthetic-commit:${forgedCommitDigest.slice("sha256:".length)}`,
      projection: {
        ...eventOne.projection,
        aggregateDigest: forgedAggregateDigest,
      },
    }).reason,
    "PROJECTION_AGGREGATE_DIGEST_INVALID",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, {
      ...eventOne,
      commitIdentity: `urn:rsrender:synthetic-commit:${"0".repeat(64)}`,
    }).reason,
    "COMMIT_IDENTITY_MISMATCH",
  );
  assert.equal(
    advanceProjectionReplica(initialReplica, { kind: "unknown" }).reason,
    "UNKNOWN_OR_MALFORMED_EVENT",
  );

  const refetched = await actual.query(
    makeQuery({ requestId: "urn:test:bld-010:query:refetch", minimumWorkingRevision: 2 }),
  );
  assert.equal(refetched.kind, "synthetic.template.projection.result");
  if (refetched.kind === "synthetic.template.projection.result") {
    const restored = createProjectionReplica(refetched);
    assert.equal(restored.accepted, true);
    if (restored.accepted) {
      assert.equal(restored.state.workingRevision, 2);
      assert.equal(restored.state.eventSequence, 2);
    }
  }
});

test("exported creation and replica boundaries are total and reject hostile configuration", async () => {
  assert.deepEqual(createInMemoryApplicationService(null), {
    accepted: false,
    code: "INITIAL_CONFIGURATION_MALFORMED",
  });
  assert.deepEqual(
    createInMemoryApplicationService({ aggregate: initialTemplate(), ownerGeneration: 7 }),
    { accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" },
  );
  for (const capacities of [
    { ...defaultCapacities, replayEntries: 0 },
    { ...defaultCapacities, commits: -1 },
    { ...defaultCapacities, events: 0.5 },
    { ...defaultCapacities, subscriptionBatch: Number.MAX_SAFE_INTEGER + 1 },
    { ...defaultCapacities, extra: 1 },
  ]) {
    assert.deepEqual(
      createInMemoryApplicationService({
        aggregate: initialTemplate(),
        ownerGeneration: 7,
        capacities,
      }),
      { accepted: false, code: "INITIAL_CAPACITIES_INVALID" },
    );
  }
  let getterCalls = 0;
  const accessorCapacities = { ...defaultCapacities };
  Object.defineProperty(accessorCapacities, "events", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 1;
    },
  });
  assert.deepEqual(
    createInMemoryApplicationService({
      aggregate: initialTemplate(),
      ownerGeneration: 7,
      capacities: accessorCapacities,
    }),
    { accepted: false, code: "INITIAL_CAPACITIES_INVALID" },
  );
  assert.equal(getterCalls, 0);

  assert.deepEqual(createProjectionReplica(null), {
    accepted: false,
    code: "PROJECTION_RESULT_INVALID",
  });
  const queried = await service().query(makeQuery());
  assert.equal(queried.kind, "synthetic.template.projection.result");
  if (queried.kind !== "synthetic.template.projection.result") return;
  const forgedProjectionDigest = {
    ...queried,
    projection: {
      ...queried.projection,
      aggregateDigest: `sha256:${"c".repeat(64)}`,
    },
  };
  assert.deepEqual(createProjectionReplica(forgedProjectionDigest), {
    accepted: false,
    code: "PROJECTION_AGGREGATE_DIGEST_INVALID",
  });
  assert.deepEqual(
    createProjectionReplica({
      ...queried,
      projection: { ...queried.projection, documentId: "urn:test:other" },
    }),
    { accepted: false, code: "PROJECTION_RESULT_INVALID" },
  );
  assert.deepEqual(advanceProjectionReplica(undefined, null), {
    action: "discard-and-refetch",
    reason: "INVALID_REPLICA_STATE",
    discardedState: null,
  });
});

test("subscription failures are explicit and do not expose an incomplete stream", async () => {
  const actual = service();
  assert.throws(
    () => actual.subscribe({ ...makeSubscription(), ownerGeneration: 8 }),
    (error) =>
      error instanceof ApplicationServiceSubscriptionError &&
      error.code === "OWNER_GENERATION_MISMATCH",
  );
  assert.throws(
    () => actual.subscribe({ ...makeSubscription(), extra: true }),
    (error) =>
      error instanceof ApplicationServiceSubscriptionError && error.code === "CONTRACT_MALFORMED",
  );
  assert.throws(
    () => actual.subscribe(makeSubscription({ afterEventSequence: 1 })),
    (error) =>
      error instanceof ApplicationServiceSubscriptionError && error.code === "EVENT_SEQUENCE_AHEAD",
  );

  const bounded = service({
    replayEntries: 3,
    commits: 3,
    events: 3,
    subscriptionBatch: 1,
  });
  await bounded.execute(makeCommand());
  await bounded.execute(
    makeCommand({
      requestId: "urn:test:bld-010:subscription:2",
      expectedWorkingRevision: 1,
      newContentDigest: sha256Utf8("subscription:2"),
    }),
  );
  assert.throws(
    () => bounded.subscribe(makeSubscription()),
    (error) =>
      error instanceof ApplicationServiceSubscriptionError &&
      error.code === "SUBSCRIPTION_BATCH_CAPACITY_EXCEEDED",
  );
  const tail = await collect(bounded.subscribe(makeSubscription({ afterEventSequence: 1 })));
  assert.equal(tail.length, 1);
  assert.equal(tail[0].eventSequence, 2);
});

test("caller capacities fail closed atomically while retained exact replay remains available", async () => {
  const actual = service({
    replayEntries: 256,
    commits: 256,
    events: 256,
    subscriptionBatch: 256,
  });
  const firstCommand = makeCommand({ newContentDigest: sha256Utf8("content:0") });
  const firstResult = await actual.execute(firstCommand);
  for (let index = 1; index < 256; index += 1) {
    const result = await actual.execute(
      makeCommand({
        requestId: `urn:test:bld-010:capacity:${index}`,
        expectedWorkingRevision: index,
        newContentDigest: sha256Utf8(`content:${index}`),
      }),
    );
    assert.equal(result.kind, "domainCommitted");
  }
  const atCapacity = actual.inspect();
  assert.equal(atCapacity.commits.length, 256);
  assert.equal(atCapacity.retainedEvents.length, 256);
  assert.equal(atCapacity.replayEntryCount, 256);

  const exhausted = await actual.execute(
    makeCommand({
      requestId: "urn:test:bld-010:capacity:256",
      expectedWorkingRevision: 256,
      newContentDigest: sha256Utf8("content:256"),
    }),
  );
  assert.equal(exhausted.kind, "rejected");
  if (exhausted.kind === "rejected") assert.equal(exhausted.reason, "CAPACITY_EXHAUSTED");
  expectUnchanged(actual, atCapacity);

  assert.equal(await actual.execute(firstCommand), firstResult);
  expectUnchanged(actual, atCapacity);
  const reused = await actual.execute({ ...firstCommand, expectedWorkingRevision: 1 });
  assert.equal(reused.kind, "rejected");
  if (reused.kind === "rejected") {
    assert.equal(reused.reason, "REQUEST_ID_REUSE_MISMATCH");
  }
  expectUnchanged(actual, atCapacity);
  const malformedAtCapacity = await actual.execute({
    ...makeCommand({ requestId: "urn:test:bld-010:capacity:malformed" }),
    extra: true,
  });
  assert.equal(malformedAtCapacity.kind, "rejected");
  if (malformedAtCapacity.kind === "rejected") {
    assert.equal(malformedAtCapacity.reason, "CONTRACT_MALFORMED");
  }
  assert.equal(actual.inspect().replayEntryCount, 256);
  expectUnchanged(actual, atCapacity);

  const events = await collect(actual.subscribe(makeSubscription()));
  assert.equal(events.length, 256);
  assert.deepEqual(
    events.map((event) => event.eventSequence),
    Array.from({ length: 256 }, (_, i) => i + 1),
  );
  const tail = await collect(actual.subscribe(makeSubscription({ afterEventSequence: 200 })));
  assert.equal(tail.length, 56);
  assert.equal(tail[0].eventSequence, 201);
});

test("3,000 seeded rejection vectors preserve zero unauthorized mutation", async () => {
  const seeds = [0x13579bdf, 0x2468ace0, 0x5eedb010];
  for (const seed of seeds) {
    const actual = service();
    for (let index = 0; index < 1_000; index += 1) {
      const variant = (seed + index) % 5;
      const base = {
        requestId: `urn:test:bld-010:property:${seed}:${index}`,
        expectedWorkingRevision: variant === 0 ? 1 : 0,
        ownerGeneration: variant === 1 ? 8 : 7,
        documentId: variant === 2 ? "urn:test:wrong-document" : ids.document,
        newContentDigest: variant === 3 ? digestA : sha256Utf8(`property:${seed}:${index}`),
      };
      const command = makeCommand(base);
      const input = variant === 4 ? { ...command, unexpected: true } : command;
      const before = actual.inspect();
      const result = await actual.execute(input);
      assert.equal(result.kind, "rejected");
      expectUnchanged(actual, before);
    }
  }
});

test("deterministic transcript repeats across six fresh pinned-runtime processes", () => {
  const script = fileURLToPath(new URL("./helpers/run-bld-010-vectors.mjs", import.meta.url));
  const outputs = [];
  for (let index = 0; index < 6; index += 1) {
    const run = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    outputs.push(run.stdout.trim());
  }
  assert.equal(new Set(outputs).size, 1);
  assert.match(outputs[0], /"digest":"sha256:[0-9a-f]{64}"/u);
});

test("contract validator is total over representative scalar and structural values", () => {
  const values = [
    undefined,
    null,
    true,
    0,
    -0,
    NaN,
    Infinity,
    "",
    [],
    Object.create(null),
    () => undefined,
    Symbol("x"),
    1n,
  ];
  for (const value of values) {
    assert.doesNotThrow(() => validateApplicationServiceCommand(value));
    assert.equal(validateApplicationServiceCommand(value).accepted, false);
  }
});
