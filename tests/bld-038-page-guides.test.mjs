import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  createSyntheticBoringLogProjectSession,
} from "../packages/application/dist/index.js";
import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
} from "../packages/contracts/dist/index.js";
import {
  openLogProjectFile,
  saveLogProjectFile,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentId = "urn:rsrender:log-project:bld-038:page-guides";

function secondDocument() {
  const document = JSON.parse(
    JSON.stringify(boringLogMvpFixture)
      .replaceAll("test-01", "test-02")
      .replaceAll("stratum-", "b02-stratum-")
      .replaceAll("sample-", "b02-sample-")
      .replaceAll("remark-", "b02-remark-"),
  );
  document.metadata.documentTitle = "BORING LOG TEST-02";
  return document;
}

function job(document, ordinal) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: `job:bld-038-page-guides:${ordinal}@r1`,
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document,
    template: structuredClone(boringLogMvpTemplate),
  };
}

function assignedDigest(capture, explorationIdentity) {
  const membership = capture.project.aggregate.logSet.memberships.find(
    ({ sourceExplorationIdentity }) => sourceExplorationIdentity === explorationIdentity,
  );
  const assignment = capture.project.aggregate.logSet.templateAssignments.find(
    ({ scope }) =>
      scope.kind === "exploration" && scope.targetIdentity === membership.membershipIdentity,
  );
  return capture.project.aggregate.logSet.embeddedTemplateRepresentations.find(
    ({ embeddedTemplateRepresentationIdentity }) =>
      embeddedTemplateRepresentationIdentity === assignment.embeddedTemplateRepresentationIdentity,
  ).effectiveContentDigest;
}

function navigationCommand(kind, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-038:${kind}:${expectedWorkingRevision}`,
    commandId: kind,
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision,
    payload: null,
  };
}

test("BLD-038 page guides fork only the active boring and survive Undo, Redo, Save, and Open", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rsrender-bld038-guides-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const firstJob = job(structuredClone(boringLogMvpFixture), 1);
  const secondJob = job(secondDocument(), 2);
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [firstJob, secondJob],
  });
  assert.equal(created.accepted, true, created.code);
  const initial = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.ok(initial);
  const firstExploration = firstJob.document.identity.explorationId;
  const secondExploration = secondJob.document.identity.explorationId;
  const firstInitialDigest = assignedDigest(initial, firstExploration);
  const secondInitialDigest = assignedDigest(initial, secondExploration);

  const authored = structuredClone(firstJob);
  authored.template.guides = [
    { id: "guide-history-1", orientation: "vertical", positionMpt: 144_000, locked: false },
  ];
  authored.templateDigest = sha256CanonicalJson(authored.template);
  assert.equal(validateBoringLogLayoutJobInput(authored).accepted, true);
  const committed = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-038:request:page-guide-add:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    explorationIdentity: firstExploration,
    expectedEffectiveContentDigest: firstInitialDigest,
    replacementEffectiveContentDigest: authored.templateDigest,
    reason: "Add nonprinting page guide",
    operation: "page-guide-add",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  const after = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.equal(assignedDigest(after, firstExploration), authored.templateDigest);
  assert.equal(assignedDigest(after, secondExploration), secondInitialDigest);

  const undone = await created.session.service.undo(navigationCommand("history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      firstExploration,
    ),
    firstInitialDigest,
  );
  const redone = await created.session.service.redo(navigationCommand("history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  const redoneCapture = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.equal(assignedDigest(redoneCapture, firstExploration), authored.templateDigest);

  const target = path.join(root, "Saved Guides.rsrender");
  const saved = await saveLogProjectFile({
    targetPath: target,
    expectedBaseline: null,
    replaceExisting: false,
    layoutJobs: [authored, secondJob],
    projectAggregate: redoneCapture.project.aggregate,
    presentationOverrideCollections: redoneCapture.presentationOverrideCollections,
  });
  assert.equal(saved.accepted, true, saved.code);
  const reopened = await openLogProjectFile(target);
  assert.equal(reopened.accepted, true, reopened.code);
  const reopenedFirst = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.explorationId === firstExploration,
  );
  const reopenedSecond = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.explorationId === secondExploration,
  );
  assert.deepEqual(reopenedFirst.template.guides, authored.template.guides);
  assert.equal(Object.hasOwn(reopenedSecond.template, "guides"), false);
});

test("BLD-038 Studio rulers and guide overlay are nonprinting, draggable, lockable, and snap-aware", async () => {
  const [route, entry, stylesheet] = await Promise.all([
    import("../packages/renderer-ui/dist/index.js"),
    import("node:fs/promises").then(({ readFile }) =>
      readFile(
        new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
        "utf8",
      ),
    ),
    import("node:fs/promises").then(({ readFile }) =>
      readFile(
        new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
        "utf8",
      ),
    ),
  ]);
  const html = route.createBoringLogStudioHtml(null);
  assert.match(html, /id="horizontal-ruler"/u);
  assert.match(html, /id="vertical-ruler"/u);
  assert.match(html, /id="page-guides"/u);
  assert.match(entry, /beginPageGuideGesture/u);
  assert.match(entry, /setPageGuides/u);
  assert.match(entry, /currentSnapTargets\(gesture\.guideId\)/u);
  assert.match(entry, /kind: "set-locked"/u);
  assert.match(entry, /kind: "delete"/u);
  assert.match(stylesheet, /\.page-guide/u);
  assert.doesNotMatch(entry, /localStorage/u);
});
