import assert from "node:assert/strict";
import test from "node:test";

import {
  createRsLogSourceSelectionHtml,
  generateRsLogSourceSelectionPreloadSource,
  RSLOG_SOURCE_SELECTION_URL,
  RsLogSourceSelectionRouteBroker,
  rsLogSourceSelectionRouteRevision,
} from "../packages/platform-electron-main/dist/index.js";

const capability = "c".repeat(64);
const context = Object.freeze({
  senderId: 41,
  frameUrl: RSLOG_SOURCE_SELECTION_URL,
  isMainFrame: true,
});
const options = Object.freeze([
  Object.freeze({ id: "project-guid-1", label: "Synthetic Project One", description: "P-001" }),
  Object.freeze({ id: "project-guid-2", label: "Synthetic Project Two", description: "P-002" }),
]);

test("BLD-051 source chooser admits one exact project and consumes its capability", () => {
  assert.equal(rsLogSourceSelectionRouteRevision, "bld-051-source-selection-route-v1");
  const broker = new RsLogSourceSelectionRouteBroker({
    mode: "project",
    expectedSenderId: context.senderId,
    capability,
    options,
  });
  assert.deepEqual(broker.bootstrap(context), {
    accepted: true,
    mode: "project",
    capability,
    options,
  });
  assert.deepEqual(
    broker.submit(context, {
      capability,
      payload: { selectedIds: ["project-guid-2"] },
    }),
    { accepted: true, selectedIds: ["project-guid-2"] },
  );
  assert.deepEqual(
    broker.submit(context, {
      capability,
      payload: { selectedIds: ["project-guid-1"] },
    }),
    { accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" },
  );
});

test("BLD-051 exploration chooser accepts an ordered subset and rejects hostile selection", () => {
  const broker = new RsLogSourceSelectionRouteBroker({
    mode: "explorations",
    expectedSenderId: context.senderId,
    capability,
    options,
  });
  broker.bootstrap(context);
  assert.deepEqual(
    broker.submit(context, {
      capability,
      payload: { selectedIds: ["project-guid-2", "project-guid-1"] },
    }),
    { accepted: true, selectedIds: ["project-guid-2", "project-guid-1"] },
  );

  for (const payload of [
    { selectedIds: [] },
    { selectedIds: ["missing"] },
    { selectedIds: ["project-guid-1", "project-guid-1"] },
  ]) {
    const hostile = new RsLogSourceSelectionRouteBroker({
      mode: "explorations",
      expectedSenderId: context.senderId,
      capability,
      options,
    });
    hostile.bootstrap(context);
    assert.deepEqual(hostile.submit(context, { capability, payload }), {
      accepted: false,
      code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE",
    });
  }
});

test("BLD-051 source chooser rejects cross-frame bootstrap and renders values with textContent", () => {
  const broker = new RsLogSourceSelectionRouteBroker({
    mode: "project",
    expectedSenderId: context.senderId,
    capability,
    options,
  });
  assert.deepEqual(broker.bootstrap({ ...context, frameUrl: "https://attacker.invalid/" }), {
    accepted: false,
    code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE",
  });
  assert.deepEqual(broker.bootstrap(context), {
    accepted: true,
    mode: "project",
    capability,
    options,
  });
  assert.doesNotMatch(createRsLogSourceSelectionHtml(), /<script|onclick=|onchange=/iu);
  const preload = generateRsLogSourceSelectionPreloadSource();
  assert.match(preload, /textContent = option\.label/u);
  assert.match(preload, /textContent = option\.description/u);
  assert.doesNotMatch(preload, /innerHTML|localStorage|sessionStorage|fetch\(/u);
});
