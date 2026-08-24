import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { TextEncoder } from "node:util";

import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_SET_LITHOLOGY_APPEARANCE_CHANNEL,
  BoringLogStudioRouteBroker,
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_ROUTE_URL,
  generateBoringLogStudioPreloadSource,
} from "../packages/platform-electron-main/dist/index.js";

const documentIdentity = "urn:test:bld-043:studio-route:document";

function context(expectedWindow, expectedWebContents, frame) {
  return {
    window: expectedWindow,
    webContents: expectedWebContents,
    frame,
    mainFrame: frame,
    url: DOCUMENT_ROUTE_URL,
    windowLive: true,
    webContentsLive: true,
  };
}

function createRoute(setLithologyAppearance) {
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "4".repeat(64),
    getProjection: async () => ({ accepted: false, code: "NOT_USED" }),
    setLithologyAppearance,
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  return { route, routeContext, binding };
}

function envelope(binding, sequence, args) {
  return {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity,
    ownerGeneration: 1,
    args,
  };
}

const intervalAppearance = Object.freeze({
  expectedWorkingRevision: 7,
  boringLogIdentity: "urn:rsrender:boring-log:WTP-4",
  intervalId: "stratum-02",
  applyScope: "interval",
  materialFillColor: "#8b5a2b",
  patternId: null,
});

test("BLD-043 Studio route admits only exact canonical lithology appearance commands", async () => {
  const received = [];
  const { route, routeContext, binding } = createRoute(async (input) => {
    received.push(input);
    return { accepted: true, code: "LITHOLOGY_APPEARANCE_SET", workingRevision: 8 };
  });

  const accepted = await route.setLithologyAppearance(
    routeContext,
    envelope(binding, 1, intervalAppearance),
  );
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(received, [intervalAppearance]);

  for (const invalidArgs of [
    { ...intervalAppearance, materialFillColor: "#8B5A2B" },
    { ...intervalAppearance, materialFillColor: "brown" },
    { ...intervalAppearance, applyScope: "all-borings" },
    { ...intervalAppearance, boringLogIdentity: "" },
    { ...intervalAppearance, intervalId: "" },
    { ...intervalAppearance, materialFillColor: null, patternId: null },
    { ...intervalAppearance, extra: true },
  ]) {
    assert.deepEqual(
      await route.setLithologyAppearance(routeContext, envelope(binding, 2, invalidArgs)),
      { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
    );
  }

  const classificationDefault = {
    ...intervalAppearance,
    applyScope: "classification-default",
    materialFillColor: null,
    patternId: "pattern-gravel",
  };
  assert.equal(
    (await route.setLithologyAppearance(routeContext, envelope(binding, 2, classificationDefault)))
      .accepted,
    true,
  );
  assert.deepEqual(received[1], classificationDefault);
  assert.deepEqual(
    await route.setLithologyAppearance(routeContext, envelope(binding, 2, classificationDefault)),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
});

test("BLD-043 generated preload validates locally and forwards one sequenced capability command", async () => {
  let received = null;
  let appearanceInvokeCount = 0;
  const routed = createRoute(async (input) => {
    received = input;
    return { accepted: true, code: "LITHOLOGY_APPEARANCE_SET", workingRevision: 8 };
  });
  let vmContext;
  const intoPreloadRealm = (value) =>
    vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, vmContext);
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require(name) {
      assert.equal(name, "electron");
      return {
        contextBridge: {
          exposeInMainWorld(name, value) {
            sandbox[name] = value;
          },
        },
        ipcRenderer: {
          invoke: async (channel, input) => {
            if (channel === DOCUMENT_BOOTSTRAP_CHANNEL) {
              return intoPreloadRealm({ accepted: false, code: "NOT_USED" });
            }
            if (channel === BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL) {
              return intoPreloadRealm(routed.binding);
            }
            if (channel === BORING_LOG_STUDIO_SET_LITHOLOGY_APPEARANCE_CHANNEL) {
              appearanceInvokeCount += 1;
              return intoPreloadRealm(
                await routed.route.setLithologyAppearance(
                  routed.routeContext,
                  JSON.parse(JSON.stringify(input)),
                ),
              );
            }
            return intoPreloadRealm({ accepted: false, code: "NOT_USED" });
          },
        },
      };
    },
    TextEncoder,
  };
  vmContext = vm.createContext(sandbox);
  vm.runInContext(generateBoringLogStudioPreloadSource(), vmContext, {
    filename: "boring-log-studio-preload.cjs",
  });

  assert.equal(typeof sandbox.rsrenderStudio.setLithologyAppearance, "function");
  const rejected = await vm.runInContext(
    `globalThis.rsrenderStudio.setLithologyAppearance(${JSON.stringify({
      ...intervalAppearance,
      materialFillColor: "#8B5A2B",
    })})`,
    vmContext,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(rejected)), {
    accepted: false,
    code: "STUDIO_ROUTE_UNAVAILABLE",
  });
  assert.equal(appearanceInvokeCount, 0);

  const accepted = await vm.runInContext(
    `globalThis.rsrenderStudio.setLithologyAppearance(${JSON.stringify(intervalAppearance)})`,
    vmContext,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(accepted)), {
    accepted: true,
    code: "LITHOLOGY_APPEARANCE_SET",
    workingRevision: 8,
  });
  assert.equal(appearanceInvokeCount, 1);
  assert.deepEqual(received, intervalAppearance);
});
