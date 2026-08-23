import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyBoringLogTextOccurrenceStyles,
  clearBoringLogTextOccurrencePresentation,
  prepareBoringLogLayout,
  prepareBoringLogLayoutWithTextOccurrenceStyles,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import {
  createBoringLogStudioHtml,
  projectBoringLogSceneToSvg,
} from "../packages/renderer-ui/dist/index.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function resolvedScene() {
  const preparation = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-037-occurrence-selection@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(preparation.accepted, true);
  const result = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(result.accepted, true);
  return result.value;
}

test("BLD-037 gives each scene occurrence a stable SVG hit identity", () => {
  const result = projectBoringLogSceneToSvg(resolvedScene());
  assert.equal(result.accepted, true);
  assert.match(
    result.markup,
    /id="node:lithology:stratum-01:transition:2:rule" data-node-id="node:lithology:stratum-01:transition:2:rule" data-semantic-id="lithology:stratum-01:transition:2"/u,
  );
  assert.match(
    result.markup,
    /id="node:lithology:stratum-01:transition:2:text" data-node-id="node:lithology:stratum-01:transition:2:text" data-semantic-id="lithology:stratum-01:transition:2"/u,
  );
});

test("BLD-037 exposes right-click Properties and exact occurrence identity", () => {
  const html = createBoringLogStudioHtml(resolvedScene());
  assert.match(html, /id="canvas-context-menu"[^>]+role="menu"/u);
  assert.match(html, /id="context-properties"[^>]+role="menuitem">Properties</u);
  assert.match(html, /id="property-node-id">/u);
  assert.match(html, /id="text-style-properties"/u);
  assert.match(html, /id="text-font-size"[^>]+min="4"[^>]+max="48"/u);
  assert.match(html, /id="text-font-weight"/u);
  assert.match(html, /id="text-decoration"[\s\S]*?Underline/u);
  assert.match(html, /id="text-line-height"/u);
  assert.match(html, /id="text-letter-spacing"[^>]+min="-2"[^>]+max="12"/u);
  assert.match(html, /id="text-word-spacing"[^>]+min="-2"[^>]+max="24"/u);
  assert.match(html, /id="text-paragraph-spacing"[^>]+min="0"[^>]+max="72"/u);
  assert.match(html, /id="text-color" type="color"/u);
  assert.match(html, /id="text-style-scope"[^>]*>[\s\S]*?This occurrence/u);
  assert.match(html, /id="text-layout-properties"/u);
  assert.match(html, /id="text-frame-x"/u);
  assert.match(html, /id="text-frame-y"[^>]+readonly/u);
  assert.match(html, /id="text-frame-width"/u);
  assert.match(html, /id="text-frame-height"/u);
  assert.match(html, /id="text-frame-anchor"/u);
  assert.match(html, /id="text-horizontal-alignment"/u);
  assert.match(html, /id="text-wrap-policy"/u);
  assert.match(html, /id="text-overflow-policy"[\s\S]*?Shrink to minimum/u);
  assert.match(html, /id="text-minimum-font-size"[^>]+min="4"[^>]+max="48"/u);
  assert.match(html, /id="text-locked"/u);
  assert.match(html, /id="apply-text-style"[^>]*>Apply text properties/u);
  assert.match(html, /id="detach-text-annotation"[^>]*>Detach as Annotation/u);
  assert.match(html, /id="text-style-inheritance"/u);
  assert.match(html, /id="text-layout-inheritance"/u);
  assert.match(html, /id="reset-text-presentation"[^>]*>Reset to inherited/u);
});

test("BLD-037 routes canvas click and contextmenu through exact node selection", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.match(entry, /selectedSceneNodeId/u);
  assert.match(entry, /addEventListener\("contextmenu"/u);
  assert.match(entry, /event\.preventDefault\(\);[\s\S]+select\(semantic, nodeId\);/u);
  assert.match(entry, /propertyNodeId\.textContent = representative\.id/u);
  assert.match(entry, /propertiesScroll\.focus\(\)/u);
  assert.match(entry, /selectionByBoring[\s\S]+nodeId: selectedSceneNodeId/u);
  assert.match(entry, /setTextOccurrenceStyle/u);
  assert.match(entry, /resetTextOccurrencePresentation/u);
  assert.match(entry, /resetSelectedTextPresentation/u);
  assert.match(entry, /applySelectedTextStyle/u);
  assert.match(entry, /detachSelectedTextAsAnnotation/u);
  assert.match(entry, /measurement\.effectiveFontSizeMpt/u);
  assert.match(entry, /textMinimumFontSize\.disabled/u);
  assert.match(entry, /textFrameY\.readOnly = textPositionMode\.value !== "free"/u);
  assert.match(entry, /expectedWorkingRevision: studioProjection\.workingRevision/u);
});

test("BLD-037 resolves one occurrence style before common screen and PDF projection", () => {
  const occurrenceNodeId = "node:lithology:stratum-01:transition:2:text";
  const prepared = prepareBoringLogLayoutWithTextOccurrenceStyles(
    boringLogMvpFixtureJob(),
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-style-override.v1",
        kind: "boring-log.text-occurrence-style-override",
        ownerDocumentIdentity: "urn:rsrender:document:bld-037-test",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "urn:rsrender:text-style-override:bld-037-test",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId,
        semanticId: "lithology:stratum-01:transition:2",
        baseStyleId: "style-small",
        style: {
          fontFamilyId: "font.logical.rsrender-sans",
          fontSizeMpt: 9_000,
          fontWeight: 700,
          lineHeightMpt: 11_000,
          letterSpacingMpt: 250,
          wordSpacingMpt: 500,
          paragraphSpacingMpt: 2_000,
          color: "#b42318",
          textDecoration: "underline",
        },
        locked: false,
      },
    ],
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-layout-override.v1",
        kind: "boring-log.text-occurrence-layout-override",
        ownerDocumentIdentity: "urn:rsrender:document:bld-037-test",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "urn:rsrender:text-layout-override:bld-037-test",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId,
        semanticId: "lithology:stratum-01:transition:2",
        layout: {
          frame: { xMpt: 125_000, yMpt: 293_338, widthMpt: 150_000, heightMpt: 22_000 },
          frameAnchor: "bottom-center",
          paddingMpt: { topMpt: 1_000, rightMpt: 2_000, bottomMpt: 1_000, leftMpt: 2_000 },
          horizontalAlignment: "center",
          verticalAlignment: "middle",
          wrapPolicy: "no-wrap",
          overflowPolicy: "clip-with-diagnostic",
          rotationMilliDegrees: 5_000,
          positionMode: "depth-bound",
          locked: true,
        },
      },
    ],
  );
  assert.equal(prepared.accepted, true);
  const request = prepared.value.textRequests.find(
    ({ measurementId }) => measurementId === `measure:${occurrenceNodeId}`,
  );
  assert.equal(request?.fontSizeMpt, 9_000);
  assert.equal(request?.fontWeight, 700);
  assert.equal(request?.lineHeightMpt, 11_000);
  assert.equal(request?.letterSpacingMpt, 250);
  assert.equal(request?.wordSpacingMpt, 500);
  assert.equal(request?.paragraphSpacingMpt, 2_000);
  assert.equal(request?.maximumWidthMpt, 146_000);
  assert.equal(request?.maximumLines, 1);
  assert.equal(request?.wrapPolicy, "no-wrap");
  const resolved = resolveBoringLogPageScene(
    prepared.value,
    deterministicTextResults(prepared.value.textRequests),
  );
  assert.equal(resolved.accepted, true);
  const node = resolved.value.pages[0].nodes.find(({ id }) => id === occurrenceNodeId);
  assert.match(node?.kind === "text" ? node.styleId : "", /^style-occurrence-/u);
  assert.deepEqual(node?.kind === "text" ? node.frame : null, {
    xMpt: 125_000,
    yMpt: 293_338,
    widthMpt: 150_000,
    heightMpt: 22_000,
  });
  assert.equal(node?.kind === "text" ? node.presentation?.locked : null, true);
  assert.equal(node?.kind === "text" ? node.presentation?.frameAnchor : null, "bottom-center");
  const screen = projectBoringLogSceneToSvg(resolved.value);
  const publication = projectBoringLogSceneForPublication(resolved.value);
  assert.equal(screen.accepted, true);
  assert.equal(publication.accepted, true);
  assert.match(
    screen.markup,
    /id="node:lithology:stratum-01:transition:2:text"[^>]+font-size="9000"[^>]+font-weight="700"[^>]+fill="#b42318"/u,
  );
  assert.match(screen.markup, /data-horizontal-alignment="center"/u);
  assert.match(screen.markup, /text-decoration="underline"/u);
  assert.match(screen.markup, /data-text-decoration="underline"/u);
  assert.match(screen.markup, /letter-spacing="250"/u);
  assert.match(screen.markup, /word-spacing="500"/u);
  assert.match(screen.markup, /data-paragraph-spacing-mpt="2000"/u);
  assert.match(screen.markup, /data-frame-anchor="bottom-center"/u);
  assert.match(screen.markup, /transform="rotate\(5 200000 304338\)"/u);
  assert.match(
    publication.projection.svgMarkup,
    /id="node:lithology:stratum-01:transition:2:text"[^>]+font-size="9"[^>]+font-weight="700"[^>]+fill="#b42318"/u,
  );
  assert.match(publication.projection.svgMarkup, /data-horizontal-alignment="center"/u);
  assert.match(publication.projection.svgMarkup, /text-decoration="underline"/u);
  assert.match(publication.projection.svgMarkup, /data-text-decoration="underline"/u);
  assert.match(publication.projection.svgMarkup, /letter-spacing="0\.250"/u);
  assert.match(publication.projection.svgMarkup, /word-spacing="0\.500"/u);
  assert.match(publication.projection.svgMarkup, /data-paragraph-spacing-mpt="2000"/u);
  assert.match(publication.projection.svgMarkup, /data-frame-anchor="bottom-center"/u);
  assert.match(publication.projection.svgMarkup, /transform="rotate\(5 200 304\.338\)"/u);
});

test("BLD-037 projects one deterministic shrink result identically to screen and PDF", () => {
  const occurrenceNodeId = "node:lithology:stratum-01:transition:2:text";
  const prepared = prepareBoringLogLayoutWithTextOccurrenceStyles(
    boringLogMvpFixtureJob(),
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-style-override.v1",
        kind: "boring-log.text-occurrence-style-override",
        ownerDocumentIdentity: "urn:rsrender:document:bld-037-fit",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "urn:rsrender:text-style-override:bld-037-fit",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId,
        semanticId: "lithology:stratum-01:transition:2",
        baseStyleId: "style-small",
        style: {
          fontFamilyId: "font.logical.rsrender-sans",
          fontSizeMpt: 12_000,
          fontWeight: 400,
          lineHeightMpt: 14_000,
          color: "#111827",
        },
        locked: false,
      },
    ],
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-layout-override.v1",
        kind: "boring-log.text-occurrence-layout-override",
        ownerDocumentIdentity: "urn:rsrender:document:bld-037-fit",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "urn:rsrender:text-layout-override:bld-037-fit",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId,
        semanticId: "lithology:stratum-01:transition:2",
        layout: {
          frame: { xMpt: 120_000, yMpt: 293_338, widthMpt: 80_000, heightMpt: 20_000 },
          frameAnchor: "top-left",
          paddingMpt: { topMpt: 0, rightMpt: 0, bottomMpt: 0, leftMpt: 0 },
          horizontalAlignment: "start",
          verticalAlignment: "top",
          wrapPolicy: "word-v1",
          overflowPolicy: "shrink-to-minimum",
          minimumFontSizeMpt: 6_000,
          rotationMilliDegrees: 0,
          positionMode: "depth-bound",
          locked: false,
        },
      },
    ],
  );
  assert.equal(prepared.accepted, true);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true);
  const result = resolved.value.textResults.find(
    ({ measurementId }) => measurementId === `measure:${occurrenceNodeId}`,
  );
  assert.equal(result.overflow, "none");
  assert.ok(result.effectiveFontSizeMpt >= 6_000 && result.effectiveFontSizeMpt < 12_000);
  const screen = projectBoringLogSceneToSvg(resolved.value);
  const publication = projectBoringLogSceneForPublication(resolved.value);
  assert.equal(screen.accepted, true);
  assert.equal(publication.accepted, true);
  for (const markup of [screen.markup, publication.projection.svgMarkup]) {
    assert.match(markup, /data-overflow-policy="shrink-to-minimum"/u);
    assert.match(markup, /data-minimum-font-size-mpt="6000"/u);
    assert.match(markup, /data-authored-font-size-mpt="12000"/u);
    assert.match(
      markup,
      new RegExp(`data-effective-font-size-mpt="${result.effectiveFontSizeMpt}"`, "u"),
    );
  }
});

test("BLD-037 reset removes only one occurrence presentation and restores inheritance", () => {
  const occurrenceNodeId = "node:lithology:stratum-01:transition:2:text";
  const semanticId = "lithology:stratum-01:transition:2";
  const authored = applyBoringLogTextOccurrenceStyles(
    boringLogMvpFixtureJob(),
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-style-override.v1",
        kind: "boring-log.text-occurrence-style-override",
        ownerDocumentIdentity: "urn:rsrender:document:bld-037-reset",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "urn:rsrender:text-style-override:bld-037-reset",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId,
        semanticId,
        baseStyleId: "style-small",
        style: {
          fontFamilyId: "font.logical.rsrender-sans",
          fontSizeMpt: 9_000,
          fontWeight: 700,
          lineHeightMpt: 11_000,
          color: "#b42318",
        },
        locked: false,
      },
    ],
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-layout-override.v1",
        kind: "boring-log.text-occurrence-layout-override",
        ownerDocumentIdentity: "urn:rsrender:document:bld-037-reset",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "urn:rsrender:text-layout-override:bld-037-reset",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId,
        semanticId,
        layout: {
          frame: { xMpt: 125_000, yMpt: 293_338, widthMpt: 150_000, heightMpt: 22_000 },
          paddingMpt: { topMpt: 1_000, rightMpt: 2_000, bottomMpt: 1_000, leftMpt: 2_000 },
          horizontalAlignment: "center",
          verticalAlignment: "middle",
          wrapPolicy: "no-wrap",
          overflowPolicy: "clip-with-diagnostic",
          rotationMilliDegrees: 5_000,
          positionMode: "depth-bound",
          locked: true,
        },
      },
    ],
  );
  assert.equal(authored.accepted, true);
  assert.equal(authored.job.template.occurrenceLayouts?.[0]?.frameAnchor, "top-left");
  const reset = clearBoringLogTextOccurrencePresentation(
    authored.job,
    occurrenceNodeId,
    semanticId,
  );
  assert.equal(reset.accepted, true);
  assert.equal(reset.removedStyle, true);
  assert.equal(reset.removedLayout, true);
  assert.equal(reset.job.templateDigest, BORING_LOG_MVP_TEMPLATE_DIGEST);
  assert.equal(
    reset.job.template.bindings.some(
      ({ elementId, path }) =>
        elementId === occurrenceNodeId && path.startsWith("presentation.text-occurrence-"),
    ),
    false,
  );
  assert.equal(
    reset.job.template.styles.some(({ id }) => id.startsWith("style-occurrence-")),
    false,
  );
  assert.equal(
    reset.job.template.occurrenceLayouts?.some(({ id }) => id.startsWith("layout-occurrence-")) ??
      false,
    false,
  );
  const prepared = prepareBoringLogLayout(reset.job);
  assert.equal(prepared.accepted, true);
  const baseline = prepareBoringLogLayout(boringLogMvpFixtureJob());
  assert.equal(baseline.accepted, true);
  const request = prepared.value.textRequests.find(
    ({ measurementId }) => measurementId === `measure:${occurrenceNodeId}`,
  );
  const baselineRequest = baseline.value.textRequests.find(
    ({ measurementId }) => measurementId === `measure:${occurrenceNodeId}`,
  );
  assert.deepEqual(request, baselineRequest);
  assert.equal(
    clearBoringLogTextOccurrencePresentation(reset.job, occurrenceNodeId, semanticId).code,
    "BORING_LOG_TEXT_OCCURRENCE_ALREADY_INHERITED",
  );
  assert.equal(
    clearBoringLogTextOccurrencePresentation(authored.job, occurrenceNodeId, "wrong:semantic").code,
    "BORING_LOG_TEXT_OCCURRENCE_SCOPE_MISMATCH",
  );
});

function boringLogMvpFixtureJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-037-occurrence-style@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}
