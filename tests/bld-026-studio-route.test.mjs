import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import vm from "node:vm";
import test from "node:test";
import { TextEncoder } from "node:util";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  BoringLogStudioRouteBroker,
  boringLogStudioRouteRevision,
  expectedBoringLogStudioPreloadSha256,
  generateBoringLogStudioPreloadSource,
  resolveBoringLogStudioProjection,
  verifyPackagedBoringLogStudioPreload,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentIdentity = "urn:test:bld-026:document:studio-route-001";

async function authority() {
  const layoutJob = {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-026-studio-route@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob,
  });
  assert.equal(created.accepted, true, created.code);
  let sequence = 0;
  return {
    session: created.session,
    getProjection: async (minimumWorkingRevision) => {
      sequence += 1;
      const queried = await created.session.service.getProjection({
        contractVersion: 1,
        messageType: "query",
        scope: "document-domain",
        kind: "render-dataset.get",
        requestId: `urn:test:bld-026:query:studio-route:${sequence}`,
        documentId: documentIdentity,
        ownerGeneration: 1,
        minimumWorkingRevision,
      });
      assert.equal(queried.kind, "render-dataset.projection.result");
      return resolveBoringLogStudioProjection({
        layoutJob,
        bindings: created.session.bindings,
        dataset: queried.projection,
      });
    },
  };
}

function context(expectedWindow, expectedWebContents, frame, overrides = {}) {
  return {
    window: expectedWindow,
    webContents: expectedWebContents,
    frame,
    mainFrame: frame,
    url: DOCUMENT_ROUTE_URL,
    windowLive: true,
    webContentsLive: true,
    ...overrides,
  };
}

function envelope(binding, sequence, minimumWorkingRevision = null, overrides = {}) {
  return {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity: binding.documentIdentity,
    ownerGeneration: binding.ownerGeneration,
    args: { minimumWorkingRevision },
    ...overrides,
  };
}

async function routed() {
  const source = await authority();
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "b".repeat(64),
    getProjection: source.getProjection,
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  return { ...source, route, routeContext, binding };
}

test("BLD-026 Studio route is capability-bound, ordered, origin-exact, and scene-bounded", async () => {
  const routedAuthority = await routed();
  assert.equal(boringLogStudioRouteRevision, "bld-026-studio-route-v1");
  const first = await routedAuthority.route.getProjection(
    routedAuthority.routeContext,
    envelope(routedAuthority.binding, 1),
  );
  assert.equal(first.accepted, true, first.code);
  assert.equal(first.projection.scene.pages[0].nodes.length, 319);
  assert.equal(first.projection.editableValues.length, 24);
  assert.deepEqual(
    await routedAuthority.route.getProjection(
      routedAuthority.routeContext,
      envelope(routedAuthority.binding, 1),
    ),
    { accepted: false, code: "STUDIO_ROUTE_SEQUENCE_INVALID" },
  );
  assert.equal(
    (
      await routedAuthority.route.getProjection(
        routedAuthority.routeContext,
        envelope(routedAuthority.binding, 2, null, { capability: "c".repeat(64) }),
      )
    ).code,
    "STUDIO_ROUTE_CAPABILITY_INVALID",
  );
  assert.equal(
    (
      await routedAuthority.route.getProjection(
        context({}, {}, {}, { url: "https://example.invalid" }),
        envelope(routedAuthority.binding, 2),
      )
    ).code,
    "STUDIO_ROUTE_CONTEXT_INVALID",
  );
});

test("BLD-026 generated Studio preload preserves the four document methods and adds one scene method", async () => {
  const routedAuthority = await routed();
  let vmContext;
  let documentSetInput;
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
              return intoPreloadRealm({
                accepted: true,
                transportVersion: 1,
                generation: 1,
                capability: "a".repeat(64),
                documentIdentity,
                documentOwnerIdentity: "urn:rsrender:document-owner:v1:" + "d".repeat(64),
                ownerGeneration: 1,
              });
            }
            if (channel === BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL) {
              return intoPreloadRealm(routedAuthority.binding);
            }
            if (channel === BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL) {
              return intoPreloadRealm(
                await routedAuthority.route.getProjection(
                  routedAuthority.routeContext,
                  JSON.parse(JSON.stringify(input)),
                ),
              );
            }
            if (channel === DOCUMENT_SET_DISPLAY_VALUE_CHANNEL) {
              documentSetInput = input;
              return intoPreloadRealm({ accepted: false, code: "EXPECTED_TEST_REJECTION" });
            }
            throw new Error("CHANNEL_DENIED");
          },
        },
      };
    },
    TextEncoder,
  };
  vmContext = vm.createContext(sandbox);
  const source = generateBoringLogStudioPreloadSource();
  vm.runInContext(source, vmContext, { filename: "boring-log-studio-preload.cjs" });
  assert.deepEqual(Object.keys(sandbox.rsrender.document), [
    "getProjection",
    "setDisplayValue",
    "undo",
    "redo",
  ]);
  assert.deepEqual(Object.keys(sandbox.rsrenderStudio), ["getProjection"]);
  const result = await vm.runInContext(
    `globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null })`,
    vmContext,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.projection.scene.kind, "boring-log.resolved-page-scene");
  assert.equal(result.projection.editableValues.length, 24);
  const editable = result.projection.editableValues.find(
    ({ semanticId }) => semanticId === "lithology:stratum-01",
  );
  const replacement = "Packaged command boundary probe";
  await vm.runInContext(
    `globalThis.rsrender.document.setDisplayValue(${JSON.stringify({
      expectedWorkingRevision: result.projection.workingRevision,
      localOverrideIdentity: `urn:rsrender:bld-026:local-override:${editable.sourceFieldIdentity}`,
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent: {
        kind: "value",
        value: replacement,
        originalRepresentation: replacement,
      },
      replacementUnit: editable.unit,
      reason: "Edited in RSrender Boring Log Studio",
    })})`,
    vmContext,
  );
  assert.ok(documentSetInput);
  assert.equal(documentSetInput.args.targetSourceFieldIdentity, editable.sourceFieldIdentity);
  assert.deepEqual(verifyPackagedBoringLogStudioPreload(Buffer.from(source)), {
    accepted: true,
    sha256: expectedBoringLogStudioPreloadSha256(),
  });
  assert.equal(
    verifyPackagedBoringLogStudioPreload(Buffer.from(`${source}\n//tampered`)).accepted,
    false,
  );
});
