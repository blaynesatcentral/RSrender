import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import vm from "node:vm";
import test from "node:test";
import { TextEncoder } from "node:util";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_STUDIO_SET_COLUMN_DIVIDER_CHANNEL,
  BORING_LOG_STUDIO_SET_PAGE_GUIDES_CHANNEL,
  BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL,
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  BoringLogStudioRouteBroker,
  boringLogStudioRouteRevision,
  expectedBoringLogStudioPreloadSha256,
  generateBoringLogStudioPreloadSource,
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
  verifyPackagedBoringLogStudioPreload,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

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
      const prepared = prepareBoringLogStudioProjection({
        layoutJob,
        bindings: created.session.bindings,
        dataset: queried.projection,
      });
      if (!prepared.accepted) return prepared;
      return completeBoringLogStudioProjection(
        prepared.preparation,
        strictCoverageTextResults(prepared.preparation.layout.textRequests),
      );
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

test("BLD-037 Studio route admits only bounded exact-occurrence typography commands", async () => {
  const source = await authority();
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let received = null;
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "e".repeat(64),
    getProjection: source.getProjection,
    setTextOccurrenceStyle: async (input) => {
      received = input;
      return { accepted: true, code: "TEXT_OCCURRENCE_STYLE_SET", workingRevision: 1 };
    },
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  const args = {
    expectedWorkingRevision: 0,
    applyScope: "occurrence",
    occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
    semanticId: "lithology:stratum-01:transition:2",
    baseStyleId: "style-small",
    targets: [
      {
        occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
        semanticId: "lithology:stratum-01:transition:2",
        baseStyleId: "style-small",
      },
    ],
    fontFamilyId: "font.logical.rsrender-sans",
    fontSizeMpt: 9_000,
    fontWeight: 700,
    lineHeightMpt: 11_000,
    letterSpacingMpt: 0,
    wordSpacingMpt: 0,
    paragraphSpacingMpt: 0,
    color: "#b42318",
    textDecoration: "none",
    layout: {
      frame: { xMpt: 120_000, yMpt: 305_000, widthMpt: 150_000, heightMpt: 12_000 },
      frameAnchor: "top-left",
      paddingMpt: { topMpt: 0, rightMpt: 0, bottomMpt: 0, leftMpt: 0 },
      horizontalAlignment: "start",
      verticalAlignment: "top",
      wrapPolicy: "word-v1",
      overflowPolicy: "clip-with-diagnostic",
      frameFillColor: null,
      frameStrokeColor: null,
      frameStrokeWidthMpt: 0,
      rotationMilliDegrees: 0,
      positionMode: "depth-bound",
    },
    locked: false,
  };
  const accepted = await route.setTextOccurrenceStyle(routeContext, {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence: 1,
    documentIdentity,
    ownerGeneration: 1,
    args,
  });
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(received, args);
  const shrinkArgs = {
    ...args,
    layout: {
      ...args.layout,
      overflowPolicy: "shrink-to-minimum",
      minimumFontSizeMpt: 6_000,
    },
  };
  const shrinkAccepted = await route.setTextOccurrenceStyle(routeContext, {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence: 2,
    documentIdentity,
    ownerGeneration: 1,
    args: shrinkArgs,
  });
  assert.equal(shrinkAccepted.accepted, true, shrinkAccepted.code);
  assert.deepEqual(received, shrinkArgs);
  const allSelectedArgs = {
    ...args,
    applyScope: "all-selected",
    targets: [
      args.targets[0],
      {
        occurrenceNodeId: "node:lithology:stratum-01:transition:1:text",
        semanticId: "lithology:stratum-01:transition:1",
        baseStyleId: "style-small",
      },
    ],
  };
  const allSelectedAccepted = await route.setTextOccurrenceStyle(routeContext, {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence: 3,
    documentIdentity,
    ownerGeneration: 1,
    args: allSelectedArgs,
  });
  assert.equal(allSelectedAccepted.accepted, true, allSelectedAccepted.code);
  assert.deepEqual(received, allSelectedArgs);
  assert.deepEqual(
    await route.setTextOccurrenceStyle(routeContext, {
      transportVersion: 1,
      capability: binding.capability,
      generation: binding.generation,
      sequence: 4,
      documentIdentity,
      ownerGeneration: 1,
      args: {
        ...args,
        layout: { ...args.layout, overflowPolicy: "shrink-to-minimum" },
      },
    }),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
  assert.deepEqual(
    await route.setTextOccurrenceStyle(routeContext, {
      transportVersion: 1,
      capability: binding.capability,
      generation: binding.generation,
      sequence: 4,
      documentIdentity,
      ownerGeneration: 1,
      args: { ...args, layout: { ...args.layout, frameAnchor: "baseline" } },
    }),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
  assert.deepEqual(
    await route.setTextOccurrenceStyle(routeContext, {
      transportVersion: 1,
      capability: binding.capability,
      generation: binding.generation,
      sequence: 4,
      documentIdentity,
      ownerGeneration: 1,
      args: { ...args, fontSizeMpt: 0 },
    }),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
  assert.deepEqual(
    await route.setTextOccurrenceStyle(routeContext, {
      transportVersion: 1,
      capability: binding.capability,
      generation: binding.generation,
      sequence: 4,
      documentIdentity,
      ownerGeneration: 1,
      args: { ...args, applyScope: "all-selected" },
    }),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
  const templateArgs = {
    ...args,
    applyScope: "template-default",
    propertyMask: ["color", "textDecoration"],
  };
  const templateAccepted = await route.setTextOccurrenceStyle(routeContext, {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence: 4,
    documentIdentity,
    ownerGeneration: 1,
    args: templateArgs,
  });
  assert.equal(templateAccepted.accepted, true, templateAccepted.code);
  assert.deepEqual(received, templateArgs);
  for (const propertyMask of [[], ["not-a-property"], ["color", "color"]]) {
    assert.deepEqual(
      await route.setTextOccurrenceStyle(routeContext, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence: 5,
        documentIdentity,
        ownerGeneration: 1,
        args: { ...args, applyScope: "template-default", propertyMask },
      }),
      { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
    );
  }
  for (const invalidArgs of [
    { ...args, fontWeight: 500 },
    { ...args, textDecoration: "overline" },
  ]) {
    assert.deepEqual(
      await route.setTextOccurrenceStyle(routeContext, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence: 5,
        documentIdentity,
        ownerGeneration: 1,
        args: invalidArgs,
      }),
      { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
    );
  }
});

test("BLD-038 Studio route admits only exact atomic page-guide mutations", async () => {
  const source = await authority();
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  const received = [];
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "f".repeat(64),
    getProjection: source.getProjection,
    setPageGuides: async (input) => {
      received.push(input);
      return { accepted: true, code: "PAGE_GUIDE_MUTATED", workingRevision: received.length };
    },
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  const envelopeFor = (sequence, mutation) => ({
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity,
    ownerGeneration: 1,
    args: { expectedWorkingRevision: sequence - 1, mutation },
  });
  assert.equal(
    (
      await route.setPageGuides(
        routeContext,
        envelopeFor(1, {
          kind: "add",
          orientation: "vertical",
          positionMpt: 144_000,
        }),
      )
    ).accepted,
    true,
  );
  assert.equal(
    (
      await route.setPageGuides(
        routeContext,
        envelopeFor(2, {
          kind: "move",
          guideId: "guide-1",
          positionMpt: 145_000,
        }),
      )
    ).accepted,
    true,
  );
  assert.equal(
    (
      await route.setPageGuides(
        routeContext,
        envelopeFor(3, {
          kind: "set-locked",
          guideId: "guide-1",
          locked: true,
        }),
      )
    ).accepted,
    true,
  );
  assert.equal(
    (
      await route.setPageGuides(
        routeContext,
        envelopeFor(4, {
          kind: "delete",
          guideId: "guide-1",
        }),
      )
    ).accepted,
    true,
  );
  assert.equal(received.length, 4);
  assert.equal(
    (
      await route.setPageGuides(
        routeContext,
        envelopeFor(5, {
          kind: "move",
          guideId: "guide-1",
          positionMpt: -1,
        }),
      )
    ).code,
    "STUDIO_ROUTE_ARGUMENT_INVALID",
  );
});

test("BLD-039 Studio route admits only one exact adjacent column-divider command", async () => {
  const source = await authority();
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let received = null;
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "9".repeat(64),
    getProjection: source.getProjection,
    setColumnDivider: async (input) => {
      received = input;
      return { accepted: true, code: "COLUMN_DIVIDER_SET", workingRevision: 1 };
    },
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  const envelope = (sequence, args) => ({
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity,
    ownerGeneration: 1,
    args,
  });
  const args = {
    expectedWorkingRevision: 0,
    dividerAfterColumnId: "column-description",
    requestedDividerXMpt: 300_000,
  };
  assert.equal((await route.setColumnDivider(routeContext, envelope(1, args))).accepted, true);
  assert.deepEqual(received, args);
  for (const invalidArgs of [
    { ...args, dividerAfterColumnId: "" },
    { ...args, requestedDividerXMpt: -1 },
    { ...args, mode: "free-scale" },
  ]) {
    assert.deepEqual(await route.setColumnDivider(routeContext, envelope(2, invalidArgs)), {
      accepted: false,
      code: "STUDIO_ROUTE_ARGUMENT_INVALID",
    });
  }
});

test("BLD-037 Studio route admits only bounded exact-occurrence presentation resets", async () => {
  const source = await authority();
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let received = null;
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "f".repeat(64),
    getProjection: source.getProjection,
    resetTextOccurrencePresentation: async (input) => {
      received = input;
      return { accepted: true, code: "TEXT_OCCURRENCE_PRESENTATION_RESET", workingRevision: 1 };
    },
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  assert.equal(binding.accepted, true, binding.code);
  const args = {
    expectedWorkingRevision: 0,
    occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
    semanticId: "lithology:stratum-01:transition:2",
  };
  const accepted = await route.resetTextOccurrencePresentation(routeContext, {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence: 1,
    documentIdentity,
    ownerGeneration: 1,
    args,
  });
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(received, args);
  assert.deepEqual(
    await route.resetTextOccurrencePresentation(routeContext, {
      transportVersion: 1,
      capability: binding.capability,
      generation: binding.generation,
      sequence: 2,
      documentIdentity,
      ownerGeneration: 1,
      args: { ...args, occurrenceNodeId: "" },
    }),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
});

test("BLD-026 Studio route is capability-bound, ordered, origin-exact, and scene-bounded", async () => {
  const routedAuthority = await routed();
  assert.equal(boringLogStudioRouteRevision, "bld-026-studio-route-v1");
  const first = await routedAuthority.route.getProjection(
    routedAuthority.routeContext,
    envelope(routedAuthority.binding, 1),
  );
  assert.equal(first.accepted, true, first.code);
  assert.equal(first.projection.scene.pages[0].nodes.length, 328);
  assert.equal(first.projection.editableValues.length, 24);
  assert.equal(first.projection.textOccurrencePresentationStates.length, 135);
  assert.equal(
    first.projection.textOccurrencePresentationStates.every(
      ({ typography, layout }) => typography === "inherited" && layout === "inherited",
    ),
    true,
  );
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

test("BLD-038 Studio projection query admits one exact non-mutating text-frame preview", async () => {
  const source = await authority();
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let receivedPreview = null;
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "f".repeat(64),
    getProjection: async (minimum, preview) => {
      receivedPreview = preview;
      return source.getProjection(minimum);
    },
  });
  const routeContext = context(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(routeContext);
  const preview = {
    expectedWorkingRevision: 0,
    occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
    semanticId: "lithology:stratum-01:transition:2",
    frame: { xMpt: 114_000, yMpt: 293_338, widthMpt: 140_000, heightMpt: 18_000 },
  };
  const accepted = await route.getProjection(routeContext, {
    ...envelope(binding, 1, 0),
    args: { minimumWorkingRevision: 0, preview },
  });
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(receivedPreview, preview);
  assert.deepEqual(
    await route.getProjection(routeContext, {
      ...envelope(binding, 2, 0),
      args: {
        minimumWorkingRevision: 0,
        preview: { ...preview, frame: { ...preview.frame, widthMpt: 0 } },
      },
    }),
    { accepted: false, code: "STUDIO_ROUTE_ARGUMENT_INVALID" },
  );
});

test("BLD-026 generated Studio preload preserves document methods and exposes bounded Studio methods", async () => {
  const routedAuthority = await routed();
  let vmContext;
  let documentSetInput;
  let studioProjectionInput;
  let studioProjectionResponse;
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
              studioProjectionInput = JSON.parse(JSON.stringify(input));
              studioProjectionResponse = await routedAuthority.route.getProjection(
                routedAuthority.routeContext,
                studioProjectionInput,
              );
              return intoPreloadRealm(studioProjectionResponse);
            }
            if (channel === BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL) {
              return intoPreloadRealm(
                await routedAuthority.route.setTextOccurrenceStyle(
                  routedAuthority.routeContext,
                  JSON.parse(JSON.stringify(input)),
                ),
              );
            }
            if (channel === BORING_LOG_STUDIO_SET_PAGE_GUIDES_CHANNEL) {
              return intoPreloadRealm(
                await routedAuthority.route.setPageGuides(
                  routedAuthority.routeContext,
                  JSON.parse(JSON.stringify(input)),
                ),
              );
            }
            if (channel === BORING_LOG_STUDIO_SET_COLUMN_DIVIDER_CHANNEL) {
              return intoPreloadRealm(
                await routedAuthority.route.setColumnDivider(
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
  assert.deepEqual(Object.keys(sandbox.rsrenderStudio), [
    "getProjection",
    "lifecycle",
    "setTextOccurrenceStyle",
    "resetTextOccurrencePresentation",
    "setPageGuides",
    "setColumnDivider",
  ]);
  const result = await vm.runInContext(
    `globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null })`,
    vmContext,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.projection.scene.kind, "boring-log.resolved-page-scene");
  assert.equal(result.projection.editableValues.length, 24);
  assert.equal(result.projection.textTemplateScopeSummary.authoredStyleCount, 5);
  assert.equal(result.projection.textTemplateScopeSummary.excludedOverrideStyleCount, 0);
  assert.equal(result.projection.textOccurrencePresentationStates.length, 135);
  assert.equal(result.projection.columnResizeConstraints.length, 10);
  const columnResult = await vm.runInContext(
    `globalThis.rsrenderStudio.setColumnDivider(${JSON.stringify({
      expectedWorkingRevision: result.projection.workingRevision,
      dividerAfterColumnId: "column-description",
      requestedDividerXMpt: 300_000,
    })})`,
    vmContext,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(columnResult)), {
    accepted: false,
    code: "COLUMN_DIVIDER_UNAVAILABLE",
  });
  const previewResult = await vm.runInContext(
    `globalThis.rsrenderStudio.getProjection(${JSON.stringify({
      minimumWorkingRevision: result.projection.workingRevision,
      preview: {
        expectedWorkingRevision: result.projection.workingRevision,
        occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
        semanticId: "lithology:stratum-01:transition:2",
        frame: { xMpt: 114_000, yMpt: 293_338, widthMpt: 140_000, heightMpt: 18_000 },
      },
    })})`,
    vmContext,
  );
  assert.equal(
    previewResult.accepted,
    true,
    JSON.stringify({ previewResult, studioProjectionInput, studioProjectionResponse }),
  );
  const invalidPreview = await vm.runInContext(
    `globalThis.rsrenderStudio.getProjection(${JSON.stringify({
      minimumWorkingRevision: result.projection.workingRevision,
      preview: {
        expectedWorkingRevision: result.projection.workingRevision,
        occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
        semanticId: "lithology:stratum-01:transition:2",
        frame: { xMpt: 114_000, yMpt: 293_338, widthMpt: 0, heightMpt: 18_000 },
      },
    })})`,
    vmContext,
  );
  assert.equal(invalidPreview.accepted, false);
  const occurrenceResult = await vm.runInContext(
    `globalThis.rsrenderStudio.setTextOccurrenceStyle(${JSON.stringify({
      expectedWorkingRevision: result.projection.workingRevision,
      applyScope: "occurrence",
      occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
      semanticId: "lithology:stratum-01:transition:2",
      baseStyleId: "style-small",
      targets: [
        {
          occurrenceNodeId: "node:lithology:stratum-01:transition:2:text",
          semanticId: "lithology:stratum-01:transition:2",
          baseStyleId: "style-small",
        },
      ],
      fontFamilyId: "font.logical.rsrender-sans",
      fontSizeMpt: 9_000,
      fontWeight: 700,
      lineHeightMpt: 11_000,
      letterSpacingMpt: 250,
      wordSpacingMpt: 500,
      paragraphSpacingMpt: 2_000,
      color: "#b42318",
      textDecoration: "underline line-through",
      layout: {
        frame: { xMpt: 125_000, yMpt: 293_338, widthMpt: 150_000, heightMpt: 22_000 },
        frameAnchor: "bottom-center",
        paddingMpt: { topMpt: 1_000, rightMpt: 2_000, bottomMpt: 1_000, leftMpt: 2_000 },
        horizontalAlignment: "center",
        verticalAlignment: "middle",
        wrapPolicy: "no-wrap",
        overflowPolicy: "clip-with-diagnostic",
        frameFillColor: "#fff4cc",
        frameStrokeColor: "#b42318",
        frameStrokeWidthMpt: 750,
        rotationMilliDegrees: 5_000,
        positionMode: "depth-bound",
      },
      locked: true,
    })})`,
    vmContext,
  );
  assert.equal(occurrenceResult.accepted, false);
  assert.equal(occurrenceResult.code, "TEXT_OCCURRENCE_STYLE_UNAVAILABLE");
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
