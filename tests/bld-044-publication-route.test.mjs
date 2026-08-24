import assert from "node:assert/strict";
import vm from "node:vm";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_ROUTE_URL,
  BoringLogPdfPublicationRouteBroker,
  boringLogPublicationRouteRevision,
  generateBoringLogStudioPreloadSource,
} from "../packages/platform-electron-main/dist/index.js";

const documentIdentity = "urn:test:bld-044:document:publication";
const orderedBoringLogIdentities = ["urn:test:boring-log:03", "urn:test:boring-log:01"];
const digest = (character) => `sha256:${character.repeat(64)}`;

function successfulOutcome(overrides = {}) {
  return {
    accepted: true,
    code: "EXPORT_VERIFIED_SUCCESS",
    workingRevision: 9,
    packageCandidateDigest: digest("a"),
    selectionDigest: digest("b"),
    orderedBoringLogIdentities,
    pageManifest: [
      {
        packagePageIndex: 0,
        boringLogIdentity: orderedBoringLogIdentities[0],
        explorationIdentity: "urn:test:exploration:03",
        sourceOrdinal: 3,
        boringPageIndex: 0,
        pageId: "urn:test:page:03:01",
        widthMpt: 612_000,
        heightMpt: 792_000,
        sceneInputDigest: digest("c"),
      },
      {
        packagePageIndex: 1,
        boringLogIdentity: orderedBoringLogIdentities[0],
        explorationIdentity: "urn:test:exploration:03",
        sourceOrdinal: 3,
        boringPageIndex: 1,
        pageId: "urn:test:page:03:02",
        widthMpt: 612_000,
        heightMpt: 792_000,
        sceneInputDigest: digest("c"),
      },
      {
        packagePageIndex: 2,
        boringLogIdentity: orderedBoringLogIdentities[1],
        explorationIdentity: "urn:test:exploration:01",
        sourceOrdinal: 1,
        boringPageIndex: 0,
        pageId: "urn:test:page:01:01",
        widthMpt: 792_000,
        heightMpt: 612_000,
        sceneInputDigest: digest("d"),
      },
    ],
    aggregateSceneDigest: digest("e"),
    aggregateProjectionDigest: digest("f"),
    pdfDigest: digest("0"),
    pdfBytes: 8_192,
    pageCount: 3,
    destinationPath: "C:\\output\\ordered-log-set.pdf",
    taggedPdfTarget: true,
    vectorTextTarget: true,
    ...overrides,
  };
}

function routeAuthority(exportPdf = async () => successfulOutcome()) {
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  const route = new BoringLogPdfPublicationRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 4,
    createCapability: () => "9".repeat(64),
    exportPdf,
  });
  const context = {
    window: expectedWindow,
    webContents: expectedWebContents,
    frame,
    mainFrame: frame,
    url: DOCUMENT_ROUTE_URL,
    windowLive: true,
    webContentsLive: true,
  };
  const binding = route.bootstrap(context);
  assert.equal(binding.accepted, true);
  return { route, context, binding };
}

function request(binding, args, sequence = 1) {
  return {
    transportVersion: 2,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity: binding.documentIdentity,
    ownerGeneration: binding.ownerGeneration,
    args,
  };
}

test("BLD-044 publication route carries only an exact ordered Log Set intent", async () => {
  let received = null;
  const authority = routeAuthority(async (input) => {
    received = input;
    return successfulOutcome();
  });
  assert.equal(boringLogPublicationRouteRevision, "bld-044-publication-route-v2");
  const result = await authority.route.exportPdf(
    authority.context,
    request(authority.binding, {
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
    }),
  );
  assert.equal(result.accepted, true, result.code);
  assert.equal(result.transportVersion, 2);
  assert.deepEqual(received, {
    expectedWorkingRevision: 9,
    orderedBoringLogIdentities,
  });
  assert.equal(Object.isFrozen(received.orderedBoringLogIdentities), true);
  assert.deepEqual(
    result.result.pageManifest.map(({ packagePageIndex }) => packagePageIndex),
    [0, 1, 2],
  );
  assert.deepEqual(
    result.result.pageManifest.map(({ boringLogIdentity }) => boringLogIdentity),
    [orderedBoringLogIdentities[0], orderedBoringLogIdentities[0], orderedBoringLogIdentities[1]],
  );
  assert.equal("scene" in received, false);
  assert.equal("expectedSceneInputDigest" in received, false);
  assert.equal("destinationPath" in received, false);
  assert.deepEqual(
    await authority.route.exportPdf(
      authority.context,
      request(authority.binding, { expectedWorkingRevision: 9, orderedBoringLogIdentities }, 1),
    ),
    { accepted: false, code: "PUBLICATION_ROUTE_SEQUENCE_INVALID" },
  );
});

test("BLD-044 publication route rejects empty, duplicate, oversized, extra, and cross-context intent", async () => {
  const authority = routeAuthority();
  const invalidArgs = [
    { expectedWorkingRevision: 9, orderedBoringLogIdentities: [] },
    {
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities: [orderedBoringLogIdentities[0], orderedBoringLogIdentities[0]],
    },
    {
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities: Array.from(
        { length: 65 },
        (_, index) => `urn:test:boring-log:${index}`,
      ),
    },
    { expectedWorkingRevision: 9, orderedBoringLogIdentities: [""] },
    { expectedWorkingRevision: 9, orderedBoringLogIdentities: ["x".repeat(513)] },
    {
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
      destinationPath: "C:\\forbidden.pdf",
    },
    { expectedWorkingRevision: 9, expectedSceneInputDigest: digest("a") },
  ];
  for (const args of invalidArgs) {
    assert.deepEqual(
      await authority.route.exportPdf(authority.context, request(authority.binding, args)),
      { accepted: false, code: "PUBLICATION_ROUTE_ARGUMENT_INVALID" },
    );
  }
  assert.deepEqual(
    await authority.route.exportPdf(
      { ...authority.context, url: "https://hostile.invalid" },
      request(authority.binding, { expectedWorkingRevision: 9, orderedBoringLogIdentities }),
    ),
    { accepted: false, code: "PUBLICATION_ROUTE_CONTEXT_INVALID" },
  );
});

test("BLD-044 publication route rejects malformed package results and concurrent publication", async () => {
  const malformed = [
    successfulOutcome({ orderedBoringLogIdentities: [...orderedBoringLogIdentities].reverse() }),
    successfulOutcome({ pageCount: 2 }),
    successfulOutcome({ packageCandidateDigest: "not-a-digest" }),
    successfulOutcome({ pageManifest: successfulOutcome().pageManifest.slice(1) }),
    successfulOutcome({
      pageManifest: successfulOutcome().pageManifest.map((page, index) =>
        index === 1 ? { ...page, packagePageIndex: 2 } : page,
      ),
    }),
    successfulOutcome({
      pageManifest: successfulOutcome().pageManifest.map((page, index) =>
        index === 2 ? { ...page, boringPageIndex: 4 } : page,
      ),
    }),
    { ...successfulOutcome(), unexpected: true },
  ];
  for (const outcome of malformed) {
    const authority = routeAuthority(async () => outcome);
    assert.deepEqual(
      await authority.route.exportPdf(
        authority.context,
        request(authority.binding, { expectedWorkingRevision: 9, orderedBoringLogIdentities }),
      ),
      { accepted: false, code: "PUBLICATION_ROUTE_RESULT_INVALID" },
    );
  }

  let release;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const authority = routeAuthority(async () => {
    await blocked;
    return successfulOutcome();
  });
  const first = authority.route.exportPdf(
    authority.context,
    request(authority.binding, { expectedWorkingRevision: 9, orderedBoringLogIdentities }),
  );
  assert.deepEqual(
    await authority.route.exportPdf(
      authority.context,
      request(authority.binding, { expectedWorkingRevision: 9, orderedBoringLogIdentities }, 2),
    ),
    { accepted: false, code: "PUBLICATION_ROUTE_IN_FLIGHT" },
  );
  release();
  assert.equal((await first).accepted, true);
});

test("BLD-044 generated preload validates ordered intent and exact package outcome", async () => {
  let vmContext;
  let publicationInput = null;
  let publicationOutcome = successfulOutcome();
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
                capability: "1".repeat(64),
                documentIdentity,
                documentOwnerIdentity: `urn:test:owner:${"1".repeat(64)}`,
                ownerGeneration: 4,
              });
            }
            if (channel === BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL) {
              return intoPreloadRealm({
                accepted: true,
                transportVersion: 1,
                generation: 1,
                capability: "2".repeat(64),
                documentIdentity,
                ownerGeneration: 4,
              });
            }
            if (channel === BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL) {
              return intoPreloadRealm({
                accepted: true,
                transportVersion: 2,
                generation: 1,
                capability: "3".repeat(64),
                documentIdentity,
                ownerGeneration: 4,
              });
            }
            if (channel === BORING_LOG_PUBLICATION_EXPORT_CHANNEL) {
              publicationInput = JSON.parse(JSON.stringify(input));
              return intoPreloadRealm({
                accepted: true,
                transportVersion: 2,
                generation: 1,
                sequence: publicationInput.sequence,
                result: publicationOutcome,
              });
            }
            throw new Error("CHANNEL_DENIED");
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
  const result = await vm.runInContext(
    `globalThis.rsrenderPublication.exportPdf(${JSON.stringify({
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
    })})`,
    vmContext,
  );
  assert.equal(result.accepted, true);
  assert.deepEqual(publicationInput.args, {
    expectedWorkingRevision: 9,
    orderedBoringLogIdentities,
  });
  assert.equal(publicationInput.transportVersion, 2);
  assert.equal("scene" in publicationInput.args, false);
  assert.equal("destinationPath" in publicationInput.args, false);

  const invalidCallsBefore = publicationInput.sequence;
  for (const invalidInput of [
    { expectedWorkingRevision: 9, orderedBoringLogIdentities: [] },
    {
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities: [orderedBoringLogIdentities[0], orderedBoringLogIdentities[0]],
    },
    {
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
      destinationPath: "C:\\forbidden.pdf",
    },
  ]) {
    const invalid = await vm.runInContext(
      `globalThis.rsrenderPublication.exportPdf(${JSON.stringify(invalidInput)})`,
      vmContext,
    );
    assert.deepEqual(JSON.parse(JSON.stringify(invalid)), {
      accepted: false,
      code: "PUBLICATION_ROUTE_UNAVAILABLE",
    });
    assert.equal(publicationInput.sequence, invalidCallsBefore);
  }

  publicationOutcome = successfulOutcome({ pageCount: 2 });
  const malformed = await vm.runInContext(
    `globalThis.rsrenderPublication.exportPdf(${JSON.stringify({
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
    })})`,
    vmContext,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(malformed)), {
    accepted: false,
    code: "PUBLICATION_ROUTE_UNAVAILABLE",
  });
});
