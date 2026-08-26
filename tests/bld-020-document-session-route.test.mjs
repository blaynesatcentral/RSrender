import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import vm from "node:vm";
import test from "node:test";
import { TextEncoder } from "node:util";

import { createSyntheticOverrideRenderDatasetSession } from "../packages/application/dist/index.js";
import {
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  DOCUMENT_ROUTE_INPUT_LIMITS,
  DOCUMENT_ROUTE_RESULT_LIMITS,
  DOCUMENT_ROUTE_SECURITY_PROFILE,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
  createDocumentOwnerIdentity,
  createDocumentRouteBroker,
  createDocumentSession,
  DocumentSessionHost,
  documentRouteTransportRevision,
  documentSessionRevision,
  expectedDocumentPreloadSha256,
  generateDocumentPreloadQualificationSource,
  generatedDocumentPreloadRevision,
  parseDocumentOwnerIdentity,
  verifyPackagedDocumentPreload,
} from "../packages/platform-electron-main/dist/index.js";

const documentIdentity = "urn:rsrender:bld-020:document:synthetic-session-001";
const initialRequestId = "urn:rsrender:bld-020:request:initial";
const fixedTime = "2026-08-20T19:02:00.000Z";

function contextFor(window, webContents, frame, overrides = {}) {
  return {
    window,
    webContents,
    frame,
    mainFrame: frame,
    url: DOCUMENT_ROUTE_URL,
    windowLive: true,
    webContentsLive: true,
    ...overrides,
  };
}

async function hosted(options = {}) {
  const synthetic = createSyntheticOverrideRenderDatasetSession({
    documentIdentity,
    ownerGeneration: 1,
  });
  assert.equal(synthetic.accepted, true, synthetic.code);
  const owner = createDocumentOwnerIdentity(options.ownerSeed ?? "bld-020-owner-seed");
  assert.equal(owner.accepted, true, owner.code);
  const result = await createDocumentSession({
    documentIdentity,
    documentOwnerIdentity: owner.value,
    ownerGeneration: 1,
    service: options.service ?? synthetic.session.service,
    initialRequestId,
    clock: options.clock ?? (() => fixedTime),
  });
  assert.equal(result.accepted, true, result.code);
  return { session: result.session, synthetic: synthetic.session, owner: owner.value };
}

async function routed(options = {}) {
  const host = await hosted(options);
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let requestOrdinal = 0;
  const created = createDocumentRouteBroker({
    expectedWindow,
    expectedWebContents,
    session: host.session,
    createCapability: options.createCapability ?? (() => "a".repeat(64)),
    createRequestId:
      options.createRequestId ??
      (({ operation, generation, sequence }) =>
        `urn:rsrender:bld-020:request:${generation}:${sequence}:${operation}:${++requestOrdinal}`),
  });
  assert.equal(created.accepted, true, created.code);
  const context = contextFor(expectedWindow, expectedWebContents, frame);
  const binding = created.broker.bootstrap(context);
  assert.equal(binding.accepted, true, binding.code);
  return {
    ...host,
    broker: created.broker,
    binding,
    context,
    expectedWindow,
    expectedWebContents,
    frame,
  };
}

function envelope(binding, sequence, args, overrides = {}) {
  return {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity: binding.documentIdentity,
    documentOwnerIdentity: binding.documentOwnerIdentity,
    ownerGeneration: binding.ownerGeneration,
    args,
    ...overrides,
  };
}

function sourceTarget(result) {
  const values = result.result.projection.values;
  const target = values.find(
    (value) =>
      value.sourceOriginal.content.kind === "value" &&
      value.sourceOriginal.content.value === "SYNTHETIC-EXPLORATION-001",
  );
  assert.ok(target, "synthetic exploration-name source field must be present");
  return target;
}

function setArgs(initial, target) {
  return {
    expectedWorkingRevision: initial.result.workingRevision,
    localOverrideIdentity: "urn:test:bld-020:local-override:exploration-name",
    targetSourceFieldIdentity: target.sourceFieldIdentity,
    expectedSourceValueDigest: target.sourceBaselineValueDigest,
    expectedSourceValueType: target.sourceOriginal.valueType,
    expectedSourceUnit: target.sourceOriginal.unit,
    replacementContent: {
      kind: "value",
      value: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
      originalRepresentation: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
    },
    replacementUnit: target.sourceOriginal.unit,
    reason: "Synthetic packaged-route qualification",
  };
}

test("document owner and session boundaries are role-specific, total, and main-owned", async () => {
  assert.equal(documentSessionRevision, "bld-020-document-session-v1");
  const owner = createDocumentOwnerIdentity("owner nonce");
  assert.equal(owner.accepted, true);
  assert.match(owner.value, /^urn:rsrender:document-owner:v1:[0-9a-f]{64}$/u);
  assert.deepEqual(parseDocumentOwnerIdentity(owner.value), owner);
  for (const invalid of [
    null,
    "urn:rsrender:document-owner:v1:",
    `urn:rsrender:document-owner:v1:${"A".repeat(64)}`,
    `urn:rsrender:document-owner:v1:${"a".repeat(63)}`,
    "urn:rsrender:document-owner:v1:💥",
  ]) {
    assert.deepEqual(parseDocumentOwnerIdentity(invalid), {
      accepted: false,
      code: "DOCUMENT_OWNER_IDENTITY_INVALID",
    });
  }
  const proxy = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error("must be total");
      },
    },
  );
  assert.deepEqual(await createDocumentSession(proxy), {
    accepted: false,
    code: "DOCUMENT_SESSION_CONFIGURATION_INVALID",
  });
  const host = await hosted();
  assert.equal(host.session.snapshot().historyAuthority, "application-core");
  assert.equal(host.session.snapshot().closed, false);
  host.session.close();
  assert.equal(host.session.snapshot().closed, true);
  assert.deepEqual(
    await host.session.getProjection("urn:rsrender:bld-020:request:closed", {
      minimumWorkingRevision: null,
    }),
    { accepted: false, code: "DOCUMENT_SESSION_CLOSED" },
  );
});

test("session host replaces atomically with monotonic generation and a fresh owner", async () => {
  const host = new DocumentSessionHost();
  const firstCore = createSyntheticOverrideRenderDatasetSession({
    documentIdentity,
    ownerGeneration: 1,
  });
  assert.equal(firstCore.accepted, true);
  const first = await host.replace({
    documentIdentity,
    service: firstCore.session.service,
    initialRequestId: "urn:rsrender:bld-020:host:first",
    clock: () => fixedTime,
    ownerNonce: "1".repeat(64),
  });
  assert.equal(first.accepted, true, first.code);
  assert.equal(first.ownerGeneration, 1);
  assert.equal(first.replaced, false);
  const firstOwner = first.session.snapshot().documentOwnerIdentity;
  const failed = await host.replace({
    documentIdentity,
    service: Object.freeze({}),
    initialRequestId: "urn:rsrender:bld-020:host:failed",
    clock: () => fixedTime,
    ownerNonce: "2".repeat(64),
  });
  assert.equal(failed.accepted, false);
  assert.equal(host.current(), first.session);
  assert.equal(host.snapshot().ownerGeneration, 1);
  assert.equal(first.session.snapshot().closed, false);
  const secondCore = createSyntheticOverrideRenderDatasetSession({
    documentIdentity,
    ownerGeneration: 2,
  });
  assert.equal(secondCore.accepted, true);
  const second = await host.replace({
    documentIdentity,
    service: secondCore.session.service,
    initialRequestId: "urn:rsrender:bld-020:host:second",
    clock: () => fixedTime,
    ownerNonce: "2".repeat(64),
  });
  assert.equal(second.accepted, true, second.code);
  assert.equal(second.ownerGeneration, 2);
  assert.equal(second.replaced, true);
  assert.notEqual(second.session.snapshot().documentOwnerIdentity, firstOwner);
  assert.equal(first.session.snapshot().closed, true);
  assert.equal(host.current(), second.session);
  host.close();
  assert.equal(host.current(), null);
  assert.equal(second.session.snapshot().closed, true);
  assert.deepEqual(host.snapshot(), {
    ownerGeneration: 2,
    hasSession: false,
    documentIdentity: null,
    documentOwnerIdentity: null,
    closed: true,
  });
});

test("one route performs exact projection, set, Undo, Redo, and refetch without changing source", async () => {
  assert.equal(documentRouteTransportRevision, "bld-020-document-route-v1");
  const route = await routed();
  const initial = await route.broker.getProjection(
    route.context,
    envelope(route.binding, 1, { minimumWorkingRevision: null }),
  );
  assert.equal(initial.accepted, true, initial.code);
  assert.equal(initial.result.kind, "render-dataset.projection.result");
  assert.deepEqual(
    [initial.result.workingRevision, initial.result.durableRevision, initial.result.dirty],
    [0, 0, false],
  );
  const target = sourceTarget(initial);
  const sourceWitness = JSON.stringify({
    snapshotIdentity: initial.result.projection.sourceSnapshotIdentity,
    snapshotLogicalDigest: initial.result.projection.sourceSnapshotLogicalDigest,
    snapshotEncodingDigest: initial.result.projection.sourceSnapshotEncodingDigest,
    sourceOriginal: target.sourceOriginal,
    sourceBaselineValueDigest: target.sourceBaselineValueDigest,
  });
  const set = await route.broker.setDisplayValue(
    route.context,
    envelope(route.binding, 2, setArgs(initial, target)),
  );
  assert.equal(set.accepted, true, set.code);
  assert.deepEqual(
    [set.result.workingRevision, set.result.dirty, set.result.canUndo, set.result.canRedo],
    [1, true, true, false],
  );
  const undo = await route.broker.undo(
    route.context,
    envelope(route.binding, 3, { expectedWorkingRevision: 1 }),
  );
  assert.equal(undo.accepted, true, undo.code);
  assert.deepEqual(
    [undo.result.workingRevision, undo.result.dirty, undo.result.canUndo, undo.result.canRedo],
    [2, true, false, true],
  );
  const redo = await route.broker.redo(
    route.context,
    envelope(route.binding, 4, { expectedWorkingRevision: 2 }),
  );
  assert.equal(redo.accepted, true, redo.code);
  const refetch = await route.broker.getProjection(
    route.context,
    envelope(route.binding, 5, { minimumWorkingRevision: 3 }),
  );
  assert.equal(refetch.accepted, true, refetch.code);
  assert.equal(refetch.result.projection.projectionDigest, redo.result.projection.projectionDigest);
  for (const result of [set, undo, redo, refetch]) {
    const current = sourceTarget(result);
    assert.equal(
      JSON.stringify({
        snapshotIdentity: result.result.projection.sourceSnapshotIdentity,
        snapshotLogicalDigest: result.result.projection.sourceSnapshotLogicalDigest,
        snapshotEncodingDigest: result.result.projection.sourceSnapshotEncodingDigest,
        sourceOriginal: current.sourceOriginal,
        sourceBaselineValueDigest: current.sourceBaselineValueDigest,
      }),
      sourceWitness,
    );
  }
  assert.equal(
    sourceTarget(set).effectiveDisplay.content.value,
    "SYNTHETIC-EXPLORATION-001-OVERRIDE",
  );
  assert.deepEqual(sourceTarget(undo).effectiveDisplay, sourceTarget(initial).sourceOriginal);
  assert.deepEqual(sourceTarget(redo).effectiveDisplay, sourceTarget(set).effectiveDisplay);
});

test("route authority rejects sender, frame, route, owner, capability, sequence, schema, and stale bindings", async () => {
  const cases = [
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        { ...r.context, window: {} },
        envelope(r.binding, 1, { minimumWorkingRevision: null }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        { ...r.context, webContents: {} },
        envelope(r.binding, 1, { minimumWorkingRevision: null }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        { ...r.context, frame: {}, mainFrame: r.frame },
        envelope(r.binding, 1, { minimumWorkingRevision: null }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        { ...r.context, url: `${DOCUMENT_ROUTE_URL}?query=forbidden` },
        envelope(r.binding, 1, { minimumWorkingRevision: null }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        r.context,
        envelope(r.binding, 1, { minimumWorkingRevision: null }, { ownerGeneration: 2 }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        r.context,
        envelope(r.binding, 1, { minimumWorkingRevision: null }, { capability: "b".repeat(64) }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        r.context,
        envelope(r.binding, 2, { minimumWorkingRevision: null }),
      );
    },
    async () => {
      const r = await routed();
      return r.broker.getProjection(
        r.context,
        envelope(r.binding, 1, { minimumWorkingRevision: null }, { transportVersion: 2 }),
      );
    },
    async () => {
      const r = await routed();
      r.broker.invalidate();
      return r.broker.getProjection(
        r.context,
        envelope(r.binding, 1, { minimumWorkingRevision: null }),
      );
    },
  ];
  const expectedCodes = [
    "CROSS_WINDOW",
    "SENDER_INVALID",
    "FRAME_INVALID",
    "ORIGIN_ROUTE_INVALID",
    "DOCUMENT_OWNER_INVALID",
    "CAPABILITY_INVALID",
    "SEQUENCE_REPLAYED",
    "TRANSPORT_UNSUPPORTED_VERSION",
    "CAPABILITY_STALE",
  ];
  for (const [index, run] of cases.entries()) {
    assert.deepEqual(await run(), { accepted: false, code: expectedCodes[index] });
  }
  const hostile = new Proxy(
    {},
    {
      getOwnPropertyDescriptor() {
        throw new Error("hostile");
      },
    },
  );
  assert.deepEqual(createDocumentRouteBroker(hostile), {
    accepted: false,
    code: "BROKER_CONFIGURATION_INVALID",
  });
});

test("close during an admitted operation drops the late result without undoing application authority", async () => {
  const synthetic = createSyntheticOverrideRenderDatasetSession({
    documentIdentity,
    ownerGeneration: 1,
  });
  assert.equal(synthetic.accepted, true);
  let resolveLate;
  let calls = 0;
  const service = Object.freeze({
    setDisplayValue: synthetic.session.service.setDisplayValue,
    undo: synthetic.session.service.undo,
    redo: synthetic.session.service.redo,
    getProjection: Object.freeze(async (input) => {
      calls += 1;
      if (calls === 1) return synthetic.session.service.getProjection(input);
      return new Promise((resolve) => {
        resolveLate = () => void synthetic.session.service.getProjection(input).then(resolve);
      });
    }),
  });
  const host = await hosted({ service });
  const pending = host.session.getProjection("urn:rsrender:bld-020:request:late", {
    minimumWorkingRevision: null,
  });
  host.session.close();
  resolveLate();
  assert.deepEqual(await pending, { accepted: false, code: "DOCUMENT_SESSION_CLOSED" });
});

test("generated preload exposes only five frozen methods and sanitizes real route results", async () => {
  const route = await routed();
  let exposed;
  let vmContext;
  const intoPreloadRealm = (value) =>
    vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, vmContext);
  const invoke = async (channel, input) => {
    const mainInput = input === undefined ? undefined : JSON.parse(JSON.stringify(input));
    if (channel === DOCUMENT_BOOTSTRAP_CHANNEL) return intoPreloadRealm(route.binding);
    if (channel === DOCUMENT_GET_PROJECTION_CHANNEL)
      return intoPreloadRealm(await route.broker.getProjection(route.context, mainInput));
    if (channel === DOCUMENT_SET_DISPLAY_VALUE_CHANNEL)
      return intoPreloadRealm(await route.broker.setDisplayValue(route.context, mainInput));
    if (channel === DOCUMENT_UNDO_CHANNEL)
      return intoPreloadRealm(await route.broker.undo(route.context, mainInput));
    if (channel === DOCUMENT_REDO_CHANNEL)
      return intoPreloadRealm(await route.broker.redo(route.context, mainInput));
    throw new Error("raw channel denied");
  };
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require(name) {
      assert.equal(name, "electron");
      return {
        contextBridge: {
          exposeInMainWorld(name, value) {
            exposed = value;
            sandbox[name] = value;
          },
        },
        ipcRenderer: { invoke },
      };
    },
    TextEncoder,
  };
  vmContext = vm.createContext(sandbox);
  vm.runInContext(generateDocumentPreloadQualificationSource(0), vmContext, {
    filename: "document-preload.cjs",
  });
  assert.deepEqual(Object.keys(exposed), ["document"]);
  assert.deepEqual(Object.keys(exposed.document), [
    "getProjection",
    "setDisplayValue",
    "revertDisplayValue",
    "undo",
    "redo",
  ]);
  assert.equal(Object.isFrozen(exposed), true);
  assert.equal(Object.isFrozen(exposed.document), true);
  for (const method of Object.values(exposed.document)) {
    assert.equal(typeof method, "function");
    assert.equal(method.length, 1);
    assert.equal(Object.isFrozen(method), true);
  }
  const initial = await vm.runInContext(
    `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: null }).then(
      (value) => (globalThis.initialResult = value),
    )`,
    vmContext,
  );
  assert.equal(initial.accepted, true);
  assert.deepEqual(Object.keys(initial), [
    "accepted",
    "kind",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
    "projection",
  ]);
  const rejected = await vm.runInContext(
    `globalThis.rsrender.document.undo({ expectedWorkingRevision: 0 })`,
    vmContext,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(rejected)), {
    accepted: false,
    code: "NOTHING_TO_UNDO",
  });
  const set = await vm.runInContext(
    `(() => {
      const target = globalThis.initialResult.projection.values.find(
        (value) => value.sourceOriginal.content.value === "SYNTHETIC-EXPLORATION-001",
      );
      return globalThis.rsrender.document.setDisplayValue({
        expectedWorkingRevision: globalThis.initialResult.workingRevision,
        localOverrideIdentity: "urn:test:bld-020:local-override:exploration-name",
        targetSourceFieldIdentity: target.sourceFieldIdentity,
        expectedSourceValueDigest: target.sourceBaselineValueDigest,
        expectedSourceValueType: target.sourceOriginal.valueType,
        expectedSourceUnit: target.sourceOriginal.unit,
        replacementContent: {
          kind: "value",
          value: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
          originalRepresentation: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
        },
        replacementUnit: target.sourceOriginal.unit,
        reason: "Synthetic packaged-route qualification",
      });
    })()`,
    vmContext,
  );
  assert.equal(set.accepted, true);
  assert.deepEqual(Object.keys(set), [
    "accepted",
    "kind",
    "previousWorkingRevision",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
    "projection",
    "changed",
  ]);
  for (const forbidden of [
    "requestId",
    "commandId",
    "event",
    "historyEntryIdentity",
    "capability",
    "sequence",
  ]) {
    assert.equal(forbidden in set, false);
  }
  const [first, second] = await vm.runInContext(
    `Promise.all([
      globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 1 }),
      globalThis.rsrender.document.redo({ expectedWorkingRevision: 1 }),
    ])`,
    vmContext,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(second)), {
    accepted: false,
    code: "DOCUMENT_ROUTE_UNAVAILABLE",
  });
  assert.equal(first.accepted, true);
  route.broker.invalidate();
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await vm.runInContext(
          `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: null })`,
          vmContext,
        ),
      ),
    ),
    {
      accepted: false,
      code: "DOCUMENT_ROUTE_UNAVAILABLE",
    },
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await vm.runInContext(
          `globalThis.rsrender.document.getProjection(new Proxy({}, { ownKeys() { throw new Error("no leak"); } }))`,
          vmContext,
        ),
      ),
    ),
    {
      accepted: false,
      code: "DOCUMENT_ROUTE_UNAVAILABLE",
    },
  );
});

test("preload custody, bounded limits, and document security profile are exact", () => {
  assert.equal(generatedDocumentPreloadRevision, "bld-020-generated-document-preload-v1");
  assert.deepEqual(DOCUMENT_ROUTE_INPUT_LIMITS, {
    maximumUtf8Bytes: 65_536,
    maximumDepth: 32,
    maximumNodes: 4_096,
    maximumContainerEntries: 256,
    maximumStringUtf8Bytes: 16_384,
  });
  assert.deepEqual(DOCUMENT_ROUTE_RESULT_LIMITS, {
    maximumUtf8Bytes: 4_194_304,
    maximumDepth: 64,
    maximumNodes: 65_536,
    maximumContainerEntries: 65_536,
    maximumStringUtf8Bytes: 1_048_576,
  });
  const source = generateDocumentPreloadQualificationSource(0);
  assert.deepEqual(verifyPackagedDocumentPreload(Buffer.from(source)), {
    accepted: true,
    sha256: expectedDocumentPreloadSha256(),
  });
  assert.deepEqual(verifyPackagedDocumentPreload(null), {
    accepted: false,
    code: "PACKAGED_DOCUMENT_PRELOAD_MISSING",
  });
  const tampered = Buffer.from(source);
  tampered[0] ^= 1;
  assert.deepEqual(verifyPackagedDocumentPreload(tampered), {
    accepted: false,
    code: "PACKAGED_DOCUMENT_PRELOAD_DIGEST_MISMATCH",
  });
  assert.equal(DOCUMENT_ROUTE_SECURITY_PROFILE.electronVersion, "43.4.0");
  assert.deepEqual(DOCUMENT_ROUTE_SECURITY_PROFILE.rendererCapabilities, [
    "rsrender.document.getProjection",
    "rsrender.document.setDisplayValue",
    "rsrender.document.undo",
    "rsrender.document.redo",
  ]);
  assert.equal(DOCUMENT_ROUTE_SECURITY_PROFILE.webPreferences.sandbox, true);
  assert.equal(DOCUMENT_ROUTE_SECURITY_PROFILE.webPreferences.contextIsolation, true);
  assert.equal(DOCUMENT_ROUTE_SECURITY_PROFILE.webPreferences.nodeIntegration, false);
  assert.equal(DOCUMENT_ROUTE_SECURITY_PROFILE.webPreferences.devTools, false);
  assert.match(DOCUMENT_ROUTE_SECURITY_PROFILE.contentPolicy, /default-src 'none'/u);
});
