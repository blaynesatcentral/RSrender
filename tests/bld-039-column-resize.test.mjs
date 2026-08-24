import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  boringLogDefaultColumnMinimumWidthMpt,
  boringLogColumnResizeRevision,
  resizeAdjacentBoringLogColumns,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const columns = Object.freeze([
  Object.freeze({ id: "column-a", role: "a", xMpt: 24_000, widthMpt: 28_000 }),
  Object.freeze({ id: "column-b", role: "b", xMpt: 52_000, widthMpt: 48_000 }),
  Object.freeze({ id: "column-c", role: "c", xMpt: 100_000, widthMpt: 80_000 }),
]);
const constraints = Object.freeze([
  Object.freeze({ columnId: "column-a", minimumWidthMpt: 18_000, widthPinned: false }),
  Object.freeze({ columnId: "column-b", minimumWidthMpt: 20_000, widthPinned: false }),
  Object.freeze({ columnId: "column-c", minimumWidthMpt: 50_000, widthPinned: false }),
]);

test("BLD-039 adjacent divider resize conserves the pair and every following column", () => {
  assert.equal(boringLogColumnResizeRevision, "bld-039-column-resize-v1");
  const result = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 60_000,
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.columns, [
    { id: "column-a", role: "a", xMpt: 24_000, widthMpt: 36_000 },
    { id: "column-b", role: "b", xMpt: 60_000, widthMpt: 40_000 },
    columns[2],
  ]);
  assert.equal(result.conservedWidthMpt, 76_000);
  assert.equal(result.changed, true);
  assert.equal(result.clamped, false);
});

test("BLD-039 default template constraints are explicit and role-aware", () => {
  assert.equal(boringLogDefaultColumnMinimumWidthMpt("material-description"), 80_000);
  assert.equal(boringLogDefaultColumnMinimumWidthMpt("penetration-moisture-plasticity"), 60_000);
  assert.equal(boringLogDefaultColumnMinimumWidthMpt("custom-column"), 12_000);
});

test("BLD-039 adjacent divider resize clamps to both explicit minimum widths", () => {
  const left = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 0,
  });
  assert.equal(left.accepted, true);
  assert.equal(left.effectiveDividerXMpt, 42_000);
  assert.equal(left.leftMinimumReached, true);
  assert.equal(left.clamped, true);
  const right = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 200_000,
  });
  assert.equal(right.accepted, true);
  assert.equal(right.effectiveDividerXMpt, 80_000);
  assert.equal(right.rightMinimumReached, true);
  assert.equal(right.columns[0].widthMpt + right.columns[1].widthMpt, 76_000);
});

test("BLD-039 adjacent divider resize honors pins and fails closed for invalid topology", () => {
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns,
      constraints: constraints.map((constraint) =>
        constraint.columnId === "column-b" ? { ...constraint, widthPinned: true } : constraint,
      ),
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_PINNED" },
  );
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns: [columns[0], { ...columns[1], xMpt: 53_000 }, columns[2]],
      constraints,
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_ORDER_INVALID" },
  );
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns,
      constraints: constraints.slice(0, 2),
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_CONSTRAINT_INVALID" },
  );
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns,
      constraints,
      dividerAfterColumnId: "column-c",
      requestedDividerXMpt: 180_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_DIVIDER_NOT_FOUND" },
  );
});

test("BLD-039 adjacent divider resize is detached and total for hostile input", () => {
  const result = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 60_000,
  });
  assert.equal(result.accepted, true);
  assert.notEqual(result.columns, columns);
  assert.notEqual(result.columns[0], columns[0]);
  assert.deepEqual(resizeAdjacentBoringLogColumns(null), {
    accepted: false,
    code: "COLUMN_RESIZE_ARGUMENT_INVALID",
  });
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns: [null],
      constraints: [],
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_ARGUMENT_INVALID" },
  );
});

test("BLD-039 Canvas and main route consume the constrained divider authority", async () => {
  const [entry, stylesheet, main] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
    readFile(
      new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(entry, /id = "column-divider-controls"/u);
  assert.match(entry, /setAttribute\("role", "separator"\)/u);
  assert.match(entry, /Column preview:/u);
  assert.match(entry, /Adjacent-pair width is conserved/u);
  assert.match(entry, /setColumnDivider/u);
  assert.match(
    entry,
    /Column divider gesture canceled[\s\S]*history and template geometry were unchanged/u,
  );
  assert.match(entry, /ArrowLeft[\s\S]*ArrowRight/u);
  assert.match(stylesheet, /\.column-divider-control/u);
  assert.match(stylesheet, /\.column-divider-preview/u);
  assert.match(main, /resizeAdjacentBoringLogColumns/u);
  assert.match(main, /commitEmbeddedTemplateReplacement/u);
  assert.match(main, /column-divider-adjacent-resize/u);
});

test("BLD-039 adjacent divider replacement commits as one shared history item", async () => {
  const documentId = "urn:rsrender:log-project:bld-039:column-divider";
  const layoutJob = {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-039-column-divider@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
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
  const secondLayoutJob = {
    ...layoutJob,
    jobId: "job:bld-039-column-divider-02@r1",
    document: secondDocument,
  };
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [layoutJob, secondLayoutJob],
  });
  assert.equal(created.accepted, true, created.code);
  const initial = await captureOverrideRenderDatasetWorkingState(created.session.service);
  assert.ok(initial);
  const explorationIdentity = layoutJob.document.identity.explorationId;
  const membership = initial.project.aggregate.logSet.memberships.find(
    ({ sourceExplorationIdentity }) => sourceExplorationIdentity === explorationIdentity,
  );
  const assignment = initial.project.aggregate.logSet.templateAssignments.find(
    ({ scope }) =>
      scope.kind === "exploration" && scope.targetIdentity === membership.membershipIdentity,
  );
  const initialRepresentation =
    initial.project.aggregate.logSet.embeddedTemplateRepresentations.find(
      ({ embeddedTemplateRepresentationIdentity }) =>
        embeddedTemplateRepresentationIdentity ===
        assignment.embeddedTemplateRepresentationIdentity,
    );
  const resized = resizeAdjacentBoringLogColumns({
    columns: layoutJob.template.columns,
    constraints: layoutJob.template.columns.map((column) => ({
      columnId: column.id,
      minimumWidthMpt: boringLogDefaultColumnMinimumWidthMpt(column.role),
      widthPinned: false,
    })),
    dividerAfterColumnId: "column-data-track",
    requestedDividerXMpt: 515_000,
  });
  assert.equal(resized.accepted, true);
  const template = { ...layoutJob.template, columns: resized.columns };
  const authored = {
    ...layoutJob,
    templateDigest: sha256CanonicalJson(template),
    template,
  };
  assert.equal(validateBoringLogLayoutJobInput(authored).accepted, true);
  const committed = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-039:request:column-divider:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    explorationIdentity,
    expectedEffectiveContentDigest: initialRepresentation.effectiveContentDigest,
    replacementEffectiveContentDigest: authored.templateDigest,
    reason: "Resize adjacent Log Columns",
    operation: "column-divider-adjacent-resize",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.canUndo, true);
});
