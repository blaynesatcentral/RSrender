import assert from "node:assert/strict";
import { appendFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  createPersistedBoringLogOverrideSession,
  createSyntheticBoringLogOverrideSession,
  markOverrideRenderDatasetDurable,
} from "../packages/application/dist/index.js";
import {
  createLogProjectPackageParts,
  decodeLogProjectPackageParts,
  logProjectPackageContractRevision,
} from "../packages/package-contract/dist/index.js";
import {
  captureLogProjectFileBaseline,
  openLogProjectFile,
  saveLogProjectFile,
} from "../packages/platform-electron-main/dist/index.js";
import {
  logProjectZipAdapterRevision,
  readLogProjectZip,
  writeLogProjectZip,
} from "../packages/platform-zipjs/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentIdentity = boringLogMvpFixture.identity.boringLogId;
function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-035-project-persistence@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

function session() {
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: layoutJob(),
  });
  assert.equal(created.accepted, true, created.code);
  return created.session;
}

test("BLD-035 constrained Log Project package round-trips deterministically and rejects mutation", async () => {
  const active = session();
  const captured = await captureOverrideRenderDatasetWorkingState(active.service);
  assert.ok(captured);
  const logical = createLogProjectPackageParts({
    layoutJob: active.layoutJob,
    projectAggregate: captured.project.aggregate,
    presentationOverrideCollections: captured.presentationOverrideCollections,
  });
  assert.equal(logProjectPackageContractRevision, "bld-035-log-project-package-v1");
  assert.equal(logical.accepted, true, logical.code);
  const zipped = await writeLogProjectZip(logical.value.parts);
  assert.equal(logProjectZipAdapterRevision, "bld-035-zip-adapter-v1");
  assert.equal(zipped.accepted, true, zipped.code);
  const reopened = await readLogProjectZip(zipped.bytes);
  assert.equal(reopened.accepted, true, reopened.code);
  assert.equal(reopened.value.authoritativeDigest, logical.value.authoritativeDigest);
  const secondZip = await writeLogProjectZip(reopened.value.parts);
  assert.equal(secondZip.accepted, true);
  assert.deepEqual(secondZip.bytes, zipped.bytes);

  const restored = createPersistedBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: reopened.value.layoutJob,
    projectAggregate: reopened.value.projectAggregate,
    presentationOverrideCollections: reopened.value.presentationOverrideCollections,
  });
  assert.equal(restored.accepted, true, restored.code);

  const corruptParts = reopened.value.parts.map((part) => ({
    path: part.path,
    bytes: part.bytes.slice(),
  }));
  corruptParts[1].bytes[corruptParts[1].bytes.length - 2] ^= 1;
  assert.equal(
    decodeLogProjectPackageParts(corruptParts).code,
    "LOG_PROJECT_PACKAGE_DIGEST_MISMATCH",
  );
});

test("BLD-035 verified file broker creates, reopens, replaces, and detects an external conflict", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rsrender-bld035-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, "Lifecycle Proof.rsrender");
  const active = session();
  const firstCapture = await captureOverrideRenderDatasetWorkingState(active.service);
  assert.ok(firstCapture);
  const first = await saveLogProjectFile({
    targetPath: target,
    expectedBaseline: null,
    replaceExisting: false,
    layoutJob: active.layoutJob,
    projectAggregate: firstCapture.project.aggregate,
    presentationOverrideCollections: firstCapture.presentationOverrideCollections,
  });
  assert.equal(first.accepted, true, first.code);
  assert.equal(await markOverrideRenderDatasetDurable(active.service, firstCapture.project), true);
  const opened = await openLogProjectFile(target);
  assert.equal(opened.accepted, true, opened.code);
  assert.equal(opened.value.project.documentIdentity, documentIdentity);
  assert.equal(opened.value.storageStatus, "supported-local-fixed-ntfs");

  const secondCapture = await captureOverrideRenderDatasetWorkingState(active.service);
  assert.ok(secondCapture);
  const second = await saveLogProjectFile({
    targetPath: target,
    expectedBaseline: first.value.baseline,
    replaceExisting: true,
    layoutJob: active.layoutJob,
    projectAggregate: secondCapture.project.aggregate,
    presentationOverrideCollections: secondCapture.presentationOverrideCollections,
  });
  assert.equal(second.accepted, true, second.code);
  const stale = captureLogProjectFileBaseline(target);
  await appendFile(target, new Uint8Array([1]));
  const conflict = await saveLogProjectFile({
    targetPath: target,
    expectedBaseline: stale,
    replaceExisting: true,
    layoutJob: active.layoutJob,
    projectAggregate: secondCapture.project.aggregate,
    presentationOverrideCollections: secondCapture.presentationOverrideCollections,
  });
  assert.equal(conflict.accepted, false);
  assert.equal(conflict.code, "PROJECT_EXTERNAL_CONFLICT");
});
