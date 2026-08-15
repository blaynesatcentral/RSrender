import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import vm from "node:vm";
import test from "node:test";

import {
  applicationVersionContractRevision,
  createApplicationVersionQuery,
  validateApplicationVersionQuery,
  validateApplicationVersionResult,
} from "../packages/contracts/dist/index.js";
import {
  applicationVersionQueryHandlerRevision,
  createApplicationVersionQueryHandler,
} from "../packages/application/dist/index.js";
import {
  APPLICATION_START_URL,
  ApplicationVersionRouteBroker,
  applicationVersionTransportRevision,
  buildApplicationVersionTransportRequest,
  generateApplicationVersionPreloadQualificationSource,
  generateApplicationVersionPreloadSource,
  expectedApplicationVersionPreloadSha256,
  verifyPackagedApplicationVersionPreload,
} from "../packages/platform-electron-main/dist/index.js";

const capability = "a".repeat(64);
const queryResult = createApplicationVersionQuery("urn:test:bld-012:version:1");
assert.equal(queryResult.accepted, true);
if (!queryResult.accepted) throw new Error(queryResult.code);
const query = queryResult.value;

function setup(options = {}) {
  const window = {};
  const webContents = {};
  const frame = {};
  const handlerResult = createApplicationVersionQueryHandler("0.0.0");
  assert.equal(handlerResult.accepted, true);
  if (!handlerResult.accepted) throw new Error(handlerResult.code);
  const broker = new ApplicationVersionRouteBroker({
    expectedWindow: window,
    expectedWebContents: webContents,
    service: options.service ?? handlerResult.service,
    createCapability: () => capability,
    ...(options.initialSequence === undefined ? {} : { initialSequence: options.initialSequence }),
  });
  const context = {
    window,
    webContents,
    frame,
    mainFrame: frame,
    url: APPLICATION_START_URL,
    windowLive: true,
    webContentsLive: true,
  };
  const bootstrap = broker.bootstrap(context);
  assert.equal(bootstrap.accepted, true);
  if (!bootstrap.accepted) throw new Error(bootstrap.code);
  return { broker, context, bootstrap, window, webContents, frame };
}

function request(bootstrap, overrides = {}) {
  return {
    ...buildApplicationVersionTransportRequest({
      capability: bootstrap.capability,
      generation: bootstrap.generation,
      sequence: 1,
      query,
    }),
    ...overrides,
  };
}

test("dedicated application-version contract is strict, bounded, and not BLD-003 version", async () => {
  assert.equal(applicationVersionContractRevision, "bld-012-v1");
  assert.equal(applicationVersionQueryHandlerRevision, "bld-012-v1");
  assert.equal(applicationVersionTransportRevision, "bld-012-v1");
  assert.equal(validateApplicationVersionQuery(query).accepted, true);
  assert.equal(validateApplicationVersionQuery({ ...query, extra: true }).accepted, false);
  assert.equal(validateApplicationVersionQuery({ ...query, contractVersion: 2 }).accepted, false);
  for (const badVersion of ["", "1", "01.0.0", "1.0", "version 1", "x".repeat(129)]) {
    assert.equal(
      validateApplicationVersionResult({
        contractVersion: 1,
        messageType: "query-result",
        kind: "application.version.result",
        requestId: query.requestId,
        version: badVersion,
      }).accepted,
      false,
    );
  }
  const handler = createApplicationVersionQueryHandler("1.2.3-beta.1+build");
  assert.equal(handler.accepted, true);
  if (handler.accepted) {
    const result = await handler.service.query(query);
    assert.equal(result.kind, "application.version.result");
    if (result.kind === "application.version.result")
      assert.equal(result.version, "1.2.3-beta.1+build");
  }
});

test("broker accepts one exact route-bound query and rejects replay without redispatch", async () => {
  const actual = setup();
  const envelope = request(actual.bootstrap);
  const first = await actual.broker.handle(actual.context, envelope);
  assert.equal(first.accepted, true);
  if (first.accepted) {
    assert.equal(first.result.version, "0.0.0");
    assert.equal(first.sequence, 1);
  }
  assert.deepEqual(await actual.broker.handle(actual.context, envelope), {
    accepted: false,
    code: "SEQUENCE_REPLAYED",
  });
});

test("sender, frame, route, capability, generation, transport, and query matrix fails closed", async () => {
  for (const code of ["CROSS_WINDOW", "SENDER_INVALID", "FRAME_INVALID", "ORIGIN_ROUTE_INVALID"]) {
    const actual = setup();
    const context = { ...actual.context };
    if (code === "CROSS_WINDOW") context.window = {};
    if (code === "SENDER_INVALID") context.webContents = {};
    if (code === "FRAME_INVALID") context.frame = {};
    if (code === "ORIGIN_ROUTE_INVALID") context.url = `${APPLICATION_START_URL}#x`;
    assert.deepEqual(await actual.broker.handle(context, request(actual.bootstrap)), {
      accepted: false,
      code,
    });
  }
  for (const [overrides, code] of [
    [{ capability: "b".repeat(64) }, "CAPABILITY_INVALID"],
    [{ generation: 2 }, "GENERATION_INVALID"],
    [{ extra: true }, "TRANSPORT_MALFORMED"],
    [{ transportVersion: 2 }, "TRANSPORT_UNSUPPORTED_VERSION"],
    [{ sequence: 0 }, "SEQUENCE_INVALID"],
    [{ query: { ...query, extra: true } }, "QUERY_SCHEMA_INVALID"],
  ]) {
    const actual = setup();
    assert.deepEqual(
      await actual.broker.handle(actual.context, request(actual.bootstrap, overrides)),
      { accepted: false, code },
    );
  }
});

test("one in-flight request, rotation during dispatch, and sequence exhaustion reject", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const fixed = createApplicationVersionQueryHandler("0.0.0");
  assert.equal(fixed.accepted, true);
  if (!fixed.accepted) return;
  const delayed = {
    async query(input) {
      await gate;
      return fixed.service.query(input);
    },
  };
  const actual = setup({ service: delayed });
  const first = actual.broker.handle(actual.context, request(actual.bootstrap));
  assert.deepEqual(
    await actual.broker.handle(
      actual.context,
      request(actual.bootstrap, {
        sequence: 2,
        query: { ...query, requestId: "urn:test:bld-012:2" },
      }),
    ),
    { accepted: false, code: "QUERY_IN_FLIGHT" },
  );
  actual.broker.invalidate();
  release();
  assert.deepEqual(await first, { accepted: false, code: "CAPABILITY_STALE" });

  const exhausted = setup({ initialSequence: Number.MAX_SAFE_INTEGER });
  assert.deepEqual(
    await exhausted.broker.handle(
      exhausted.context,
      request(exhausted.bootstrap, { sequence: Number.MAX_SAFE_INTEGER }),
    ),
    { accepted: false, code: "SEQUENCE_EXHAUSTED" },
  );
});

function executePreload(source, invoke) {
  let exposed;
  vm.runInNewContext(source, {
    require(name) {
      assert.equal(name, "electron");
      return {
        contextBridge: {
          exposeInMainWorld(_name, value) {
            exposed = value;
          },
        },
        ipcRenderer: { invoke },
      };
    },
  });
  return exposed;
}

test("generated preload exposes one frozen zero-argument method and validates results", async () => {
  let queryCalls = 0;
  const api = executePreload(
    generateApplicationVersionPreloadSource(),
    async (channel, envelope) => {
      if (channel.includes("bootstrap")) {
        return { accepted: true, transportVersion: 1, generation: 1, capability };
      }
      queryCalls += 1;
      return {
        accepted: true,
        transportVersion: 1,
        generation: 1,
        sequence: 1,
        result: {
          contractVersion: 1,
          messageType: "query-result",
          kind: "application.version.result",
          requestId: envelope.query.requestId,
          version: "0.0.0",
        },
      };
    },
  );
  assert.deepEqual(Object.keys(api), ["application"]);
  assert.deepEqual(Object.keys(api.application), ["getVersion"]);
  assert.equal(api.application.getVersion.length, 0);
  assert.equal(Object.isFrozen(api), true);
  assert.equal(Object.isFrozen(api.application), true);
  assert.equal((await api.application.getVersion()).version, "0.0.0");
  await assert.rejects(() => api.application.getVersion("extra"), /ARGUMENTS_REJECTED/u);
  assert.equal(queryCalls, 1);
});

test("generated preload rejects unsafe sequence locally before query IPC", async () => {
  let queryCalls = 0;
  const source = generateApplicationVersionPreloadQualificationSource(Number.MAX_SAFE_INTEGER);
  const api = executePreload(source, async (channel) => {
    if (channel.includes("bootstrap")) {
      return { accepted: true, transportVersion: 1, generation: 1, capability };
    }
    queryCalls += 1;
    return null;
  });
  await assert.rejects(() => api.application.getVersion(), /APPLICATION_VERSION_UNAVAILABLE/u);
  assert.equal(queryCalls, 0);
});

test("generated preload redacts every internal broker rejection from page JavaScript", async () => {
  for (const internalCode of [
    "CAPABILITY_INVALID",
    "CAPABILITY_STALE",
    "FRAME_INVALID",
    "ORIGIN_ROUTE_INVALID",
    "SEQUENCE_REPLAYED",
    "SERVICE_RESULT_INVALID",
  ]) {
    const api = executePreload(generateApplicationVersionPreloadSource(), async (channel) => {
      if (channel.includes("bootstrap")) {
        return { accepted: true, transportVersion: 1, generation: 1, capability };
      }
      return { accepted: false, code: internalCode };
    });
    await assert.rejects(
      () => api.application.getVersion(),
      (error) =>
        typeof error === "object" &&
        error !== null &&
        error.message === "APPLICATION_VERSION_UNAVAILABLE" &&
        !error.message.includes(internalCode),
    );
  }
});

test("generated preload redacts rejected bootstrap and query promises", async () => {
  const bootstrapRejected = executePreload(generateApplicationVersionPreloadSource(), async () => {
    throw new Error("ipc channel bootstrap detail");
  });
  await assert.rejects(
    () => bootstrapRejected.application.getVersion(),
    (error) => error?.message === "APPLICATION_VERSION_UNAVAILABLE",
  );

  const queryRejected = executePreload(
    generateApplicationVersionPreloadSource(),
    async (channel) => {
      if (channel.includes("bootstrap")) {
        return { accepted: true, transportVersion: 1, generation: 1, capability };
      }
      throw new Error("ipc query transport detail");
    },
  );
  await assert.rejects(
    () => queryRejected.application.getVersion(),
    (error) => error?.message === "APPLICATION_VERSION_UNAVAILABLE",
  );
});

test("generated preload redacts malformed transport and result payloads", async () => {
  for (const response of [
    { accepted: true, unexpected: true },
    {
      accepted: true,
      transportVersion: 1,
      generation: 1,
      sequence: 1,
      result: {
        contractVersion: 1,
        messageType: "query-result",
        kind: "application.version.result",
        requestId: "urn:rsrender:application-version:1:1",
        version: "not-semver",
      },
    },
  ]) {
    const api = executePreload(generateApplicationVersionPreloadSource(), async (channel) =>
      channel.includes("bootstrap")
        ? { accepted: true, transportVersion: 1, generation: 1, capability }
        : response,
    );
    await assert.rejects(
      () => api.application.getVersion(),
      (error) => error?.message === "APPLICATION_VERSION_UNAVAILABLE",
    );
  }
});

test("packaged preload verification rejects missing, tampered, and digest-mismatched bytes", () => {
  const exact = Buffer.from(generateApplicationVersionPreloadSource(), "utf8");
  const accepted = verifyPackagedApplicationVersionPreload(exact);
  assert.equal(accepted.accepted, true);
  if (accepted.accepted) assert.equal(accepted.sha256, expectedApplicationVersionPreloadSha256());
  assert.deepEqual(verifyPackagedApplicationVersionPreload(null), {
    accepted: false,
    code: "PACKAGED_PRELOAD_MISSING",
  });
  assert.deepEqual(verifyPackagedApplicationVersionPreload(Buffer.from("tampered", "utf8")), {
    accepted: false,
    code: "PACKAGED_PRELOAD_DIGEST_MISMATCH",
  });
  const oneByteChanged = Buffer.from(exact);
  oneByteChanged[0] ^= 1;
  assert.deepEqual(verifyPackagedApplicationVersionPreload(oneByteChanged), {
    accepted: false,
    code: "PACKAGED_PRELOAD_DIGEST_MISMATCH",
  });
});
