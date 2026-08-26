import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  boringLogLayoutJobSchemaVersion,
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
} from "../packages/contracts/dist/index.js";
import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  createSyntheticBoringLogProjectSession,
} from "../packages/application/dist/index.js";
import {
  applyBoringLogPageSetup,
  boringLogPageSetupRevision,
  boringLogPaperPresetsMpt,
  prepareBoringLogLayout,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import {
  createBoringLogStudioHtml,
  projectBoringLogSceneToSvg,
} from "../packages/renderer-ui/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function apply(input) {
  return applyBoringLogPageSetup(structuredClone(boringLogMvpTemplate), input);
}

function authoredTemplate(result) {
  assert.equal(result.accepted, true);
  return {
    ...structuredClone(boringLogMvpTemplate),
    page: result.page,
    regions: result.regions,
    columns: result.columns,
    depthTransform: result.depthTransform,
    ...(result.pagination === undefined ? {} : { pagination: result.pagination }),
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

function historyCommand(documentId, kind, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-049:${kind}:${expectedWorkingRevision}`,
    commandId: kind,
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision,
    payload: null,
  };
}

test("BLD-049 exposes deterministic physical paper constants and persists Letter margins", () => {
  assert.equal(boringLogPageSetupRevision, "bld-049-page-setup-v1");
  assert.deepEqual(boringLogPaperPresetsMpt, {
    letter: { widthMpt: 612_000, heightMpt: 792_000 },
    a4: { widthMpt: 595_276, heightMpt: 841_890 },
  });
  const result = apply({
    paperPreset: "letter",
    orientation: "portrait",
    widthMpt: 612_000,
    heightMpt: 792_000,
    marginsMpt: { topMpt: 14_000, rightMpt: 24_000, bottomMpt: 14_000, leftMpt: 24_000 },
  });
  assert.equal(result.accepted, true);
  assert.equal(result.changed, true);
  assert.equal(result.repaginationRequired, false);
  assert.equal(result.pageCount, 1);
  assert.deepEqual(result.page, {
    widthMpt: 612_000,
    heightMpt: 792_000,
    orientation: "portrait",
    paperPreset: "letter",
    marginsMpt: { topMpt: 14_000, rightMpt: 24_000, bottomMpt: 14_000, leftMpt: 24_000 },
  });
  assert.equal(result.columns[0].xMpt, 24_000);
  assert.equal(result.columns.at(-1).xMpt + result.columns.at(-1).widthMpt, 588_000);
  assert.equal(result.depthTransform.mptPerFoot, 12_025);
});

test("BLD-049 Letter landscape reflows regions and columns while preserving fixed depth scale", () => {
  const result = apply({
    paperPreset: "letter",
    orientation: "landscape",
    widthMpt: 792_000,
    heightMpt: 612_000,
    marginsMpt: { topMpt: 14_000, rightMpt: 24_000, bottomMpt: 14_000, leftMpt: 24_000 },
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(
    [result.page.widthMpt, result.page.heightMpt, result.page.orientation],
    [792_000, 612_000, "landscape"],
  );
  assert.ok(result.regions.every(({ xMpt, widthMpt }) => xMpt === 24_000 && widthMpt === 744_000));
  assert.equal(result.columns[0].xMpt, 24_000);
  assert.equal(result.columns.at(-1).xMpt + result.columns.at(-1).widthMpt, 768_000);
  assert.ok(
    result.columns.every(
      (column, index) =>
        index === 0 ||
        column.xMpt === result.columns[index - 1].xMpt + result.columns[index - 1].widthMpt,
    ),
  );
  assert.equal(result.depthTransform.mptPerFoot, 12_025);
  assert.equal(result.repaginationRequired, true);
  assert.equal(result.pageCount, 2);
});

test("BLD-049 A4 and Custom Page Setup remain admissible renderer-neutral templates", () => {
  for (const input of [
    {
      paperPreset: "a4",
      orientation: "portrait",
      widthMpt: 595_276,
      heightMpt: 841_890,
      marginsMpt: { topMpt: 18_000, rightMpt: 15_000, bottomMpt: 20_000, leftMpt: 15_000 },
    },
    {
      paperPreset: "custom",
      orientation: "landscape",
      widthMpt: 720_000,
      heightMpt: 540_000,
      marginsMpt: { topMpt: 20_000, rightMpt: 30_000, bottomMpt: 24_000, leftMpt: 36_000 },
    },
  ]) {
    const result = apply(input);
    const template = authoredTemplate(result);
    const job = {
      contractVersion: 1,
      schemaVersion: boringLogLayoutJobSchemaVersion,
      kind: "boring-log.layout-job",
      jobId: `job:bld-049-${input.paperPreset}`,
      inputRevision: 1,
      fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
      templateDigest: sha256CanonicalJson(template),
      document: structuredClone(boringLogMvpFixture),
      template,
    };
    assert.equal(validateBoringLogLayoutJobInput(job).accepted, true);
  }
});

test("BLD-049 rejects impossible or inconsistent setup without mutating the template", () => {
  const before = JSON.stringify(boringLogMvpTemplate);
  assert.deepEqual(
    apply({
      paperPreset: "letter",
      orientation: "portrait",
      widthMpt: 792_000,
      heightMpt: 612_000,
      marginsMpt: { topMpt: 14_000, rightMpt: 24_000, bottomMpt: 14_000, leftMpt: 24_000 },
    }),
    { accepted: false, code: "PAGE_SETUP_PRESET_MISMATCH" },
  );
  assert.deepEqual(
    apply({
      paperPreset: "custom",
      orientation: "portrait",
      widthMpt: 400_000,
      heightMpt: 500_000,
      marginsMpt: { topMpt: 200_000, rightMpt: 180_000, bottomMpt: 200_000, leftMpt: 180_000 },
    }),
    { accepted: false, code: "PAGE_SETUP_CONTENT_TOO_SMALL" },
  );
  assert.equal(JSON.stringify(boringLogMvpTemplate), before);
});

test("BLD-049 Page Setup is one admitted project-history command with Undo and Redo", async () => {
  const documentId = "urn:rsrender:log-project:bld-049:page-setup-history";
  const job = {
    contractVersion: 1,
    schemaVersion: boringLogLayoutJobSchemaVersion,
    kind: "boring-log.layout-job",
    jobId: "job:bld-049-page-setup-history",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(boringLogMvpTemplate),
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
  const secondDocument = JSON.parse(
    JSON.stringify(boringLogMvpFixture)
      .replaceAll("test-01", "test-02")
      .replaceAll("stratum-", "b02-stratum-")
      .replaceAll("sample-", "b02-sample-")
      .replaceAll("remark-", "b02-remark-"),
  );
  secondDocument.metadata.documentTitle = "BORING LOG TEST-02";
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [
      { ...job, jobId: "job:bld-049-page-setup-history:1" },
      { ...job, jobId: "job:bld-049-page-setup-history:2", document: secondDocument },
    ],
  });
  assert.equal(created.accepted, true, created.code);
  const explorationIdentity = boringLogMvpFixture.identity.explorationId;
  const before = await captureOverrideRenderDatasetWorkingState(created.session.service);
  const beforeDigest = assignedDigest(before, explorationIdentity);
  const adjusted = apply({
    paperPreset: "a4",
    orientation: "portrait",
    widthMpt: 595_276,
    heightMpt: 841_890,
    marginsMpt: { topMpt: 18_000, rightMpt: 15_000, bottomMpt: 20_000, leftMpt: 15_000 },
  });
  const replacementDigest = sha256CanonicalJson(authoredTemplate(adjusted));
  const committed = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-049:request:page-setup:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    explorationIdentity,
    expectedEffectiveContentDigest: beforeDigest,
    replacementEffectiveContentDigest: replacementDigest,
    reason: "Set A4 portrait Page Setup",
    operation: "page-setup",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.canUndo, true);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
  const undone = await created.session.service.undo(historyCommand(documentId, "history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    beforeDigest,
  );
  const redone = await created.session.service.redo(historyCommand(documentId, "history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
});

test("BLD-049 Canvas SVG and publication consume the same A4 Page Plan and scene", () => {
  const result = apply({
    paperPreset: "a4",
    orientation: "portrait",
    widthMpt: 595_276,
    heightMpt: 841_890,
    marginsMpt: { topMpt: 18_000, rightMpt: 15_000, bottomMpt: 20_000, leftMpt: 15_000 },
  });
  assert.ok(
    result.columns.every(
      (column, index) => column.widthMpt >= boringLogMvpTemplate.columns[index].widthMpt,
    ),
  );
  const template = authoredTemplate(result);
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: boringLogLayoutJobSchemaVersion,
    kind: "boring-log.layout-job",
    jobId: "job:bld-049-a4-scene",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document: structuredClone(boringLogMvpFixture),
    template,
  });
  assert.equal(prepared.accepted, true);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true);
  assert.deepEqual(
    resolved.value.diagnostics.filter(({ severity }) => severity === "error"),
    [],
  );
  assert.deepEqual(
    [resolved.value.pages[0].widthMpt, resolved.value.pages[0].heightMpt],
    [595_276, 841_890],
  );
  const screen = projectBoringLogSceneToSvg(resolved.value);
  const publication = projectBoringLogSceneForPublication(resolved.value);
  assert.equal(screen.accepted, true);
  assert.equal(publication.accepted, true);
  assert.match(screen.markup, /viewBox="0 0 595276 841890"/u);
  assert.equal(publication.projection.manifest.sceneInputDigest, screen.scene.inputDigest);
  assert.match(publication.projection.html, /@page\{size:595\.276pt 841\.890pt;margin:0\}/u);
  assert.match(publication.projection.svgMarkup, /viewBox="0 0 595\.276 841\.890"/u);
});

test("BLD-049 Layout UI exposes bounded Word-familiar Page Setup controls", async () => {
  const html = createBoringLogStudioHtml(null);
  for (const id of [
    "page-paper-preset",
    "page-orientation",
    "page-width",
    "page-height",
    "page-margin-top",
    "page-margin-right",
    "page-margin-bottom",
    "page-margin-left",
    "apply-page-setup",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(html, /<option value="letter">Letter<\/option>/u);
  assert.match(html, /<option value="a4">A4<\/option>/u);
  assert.match(html, /<option value="custom">Custom<\/option>/u);
  const [entry, stylesheet] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(entry, /async function applyPageSetup\(\)/u);
  assert.match(entry, /apis\.studio\.setPageSetup\(input\)/u);
  assert.match(entry, /refreshStudioProjection\(/u);
  assert.match(stylesheet, /\.page-setup-grid\s*\{/u);
});
