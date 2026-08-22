import assert from "node:assert/strict";
import test from "node:test";

import {
  boringLogTextAuthorityRevision,
  measureBoringLogTextRequests,
} from "../packages/layout-host/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function preparation() {
  return prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-026-layout-host@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
}

test("BLD-026 Layout Host deterministically resolves every scene text request", () => {
  const prepared = preparation();
  assert.equal(prepared.accepted, true);
  const first = measureBoringLogTextRequests(prepared.value.textRequests);
  const second = measureBoringLogTextRequests(structuredClone(prepared.value.textRequests));
  assert.equal(boringLogTextAuthorityRevision, "bld-026-layout-host-text-v1");
  assert.equal(first.accepted, true);
  assert.deepEqual(first, second);
  assert.equal(first.results.length, prepared.value.textRequests.length);
  assert.ok(
    first.results.every(({ fontFaceDigest }) => /^sha256:[0-9a-f]{64}$/u.test(fontFaceDigest)),
  );
  const scene = resolveBoringLogPageScene(prepared.value, first.results);
  assert.equal(scene.accepted, true);
  assert.equal(scene.value.pages[0].nodes.length, 328);
});

test("BLD-026 Layout Host rejects duplicate, malformed, or excessive text requests", () => {
  const prepared = preparation();
  assert.equal(prepared.accepted, true);
  assert.deepEqual(measureBoringLogTextRequests(null), {
    accepted: false,
    code: "BORING_LOG_TEXT_REQUESTS_INVALID",
  });
  const duplicate = [prepared.value.textRequests[0], prepared.value.textRequests[0]];
  assert.equal(measureBoringLogTextRequests(duplicate).accepted, false);
  const malformed = structuredClone(prepared.value.textRequests.slice(0, 1));
  malformed[0].maximumWidthMpt = -1;
  assert.equal(measureBoringLogTextRequests(malformed).accepted, false);
});
