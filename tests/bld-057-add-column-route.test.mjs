import assert from "node:assert/strict";
import test from "node:test";

import {
  BoringLogStudioRouteBroker,
  DOCUMENT_ROUTE_URL,
} from "../packages/platform-electron-main/dist/index.js";
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";

const documentIdentity = "urn:test:bld-057:add-column-route";

function routeContext(expectedWindow, expectedWebContents, frame) {
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

test("BLD-057 exposes a searchable provider-field picker from the shared context menu", () => {
  const html = createBoringLogStudioHtml(null);
  assert.match(html, /id="context-add-column"/u);
  assert.match(html, /id="add-column-catalog"/u);
  assert.match(html, /id="add-column-search"/u);
  assert.match(html, /id="add-column-side"/u);
  assert.match(html, /id="add-column-options"/u);
});

test("BLD-057 routes one exact provider-bound Add Column command", async () => {
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let received = null;
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "7".repeat(64),
    getProjection: async () => ({
      accepted: false,
      code: "BORING_LOG_STUDIO_CONFIGURATION_INVALID",
    }),
    addProviderColumn: async (input) => {
      received = input;
      return {
        accepted: true,
        code: "PROVIDER_COLUMN_ADDED",
        workingRevision: 4,
        columnId: "column-provider-rslog-sample-n60-1",
      };
    },
  });
  const context = routeContext(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(context);
  assert.equal(binding.accepted, true, binding.code);
  const args = {
    expectedWorkingRevision: 3,
    fieldId: "rslog.sample.n60",
    targetRole: "numeric-value-column",
    referenceColumnId: "column-n-value",
    side: "after",
  };
  const accepted = await route.addProviderColumn(context, envelope(binding, 1, args));
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(received, args);
  assert.deepEqual(accepted.result, {
    accepted: true,
    code: "PROVIDER_COLUMN_ADDED",
    workingRevision: 4,
    columnId: "column-provider-rslog-sample-n60-1",
  });

  for (const invalidArgs of [
    { ...args, fieldId: "" },
    { ...args, targetRole: "data-track-polyline" },
    { ...args, referenceColumnId: "" },
    { ...args, side: "middle" },
  ]) {
    assert.deepEqual(await route.addProviderColumn(context, envelope(binding, 2, invalidArgs)), {
      accepted: false,
      code: "STUDIO_ROUTE_ARGUMENT_INVALID",
    });
  }
});
