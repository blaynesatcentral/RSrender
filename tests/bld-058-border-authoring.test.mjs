import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  sha256CanonicalJson,
  validateBoringLogTemplateInput,
} from "../packages/contracts/dist/index.js";
import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import {
  projectBoringLogSceneToSvg,
  createBoringLogStudioHtml,
} from "../packages/renderer-ui/dist/index.js";
import {
  applyBoringLogTextOccurrenceStyles,
  prepareBoringLogLayout,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function job(template = structuredClone(boringLogMvpTemplate)) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-058-border-authoring@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document: structuredClone(boringLogMvpFixture),
    template,
  };
}

function resolve(input) {
  const prepared = prepareBoringLogLayout(input);
  assert.equal(prepared.accepted, true, JSON.stringify(prepared));
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true, JSON.stringify(measured));
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true, JSON.stringify(resolved));
  return resolved.value;
}

test("BLD-058 region border emits only selected renderer-neutral edges on screen and publication", () => {
  const template = structuredClone(boringLogMvpTemplate);
  template.regions = template.regions.map((region) =>
    region.id === "region-header"
      ? {
          ...region,
          border: {
            top: true,
            right: false,
            bottom: true,
            left: false,
            color: "#b42318",
            widthMpt: 1_500,
            linePattern: "dash-dot",
          },
        }
      : region,
  );
  const scene = resolve(job(template));
  const edgeNodes = scene.pages[0].nodes.filter(({ id }) =>
    id.startsWith("node:region-header:frame:border-"),
  );
  assert.deepEqual(
    edgeNodes.map(({ id }) => id),
    ["node:region-header:frame:border-top", "node:region-header:frame:border-bottom"],
  );
  assert.deepEqual(edgeNodes[0].dashMpt, [6_000, 2_500, 1_000, 2_500]);
  const screen = projectBoringLogSceneToSvg(scene);
  const publication = projectBoringLogSceneForPublication(scene);
  assert.equal(screen.accepted, true);
  assert.equal(publication.accepted, true);
  assert.match(
    screen.markup,
    /id="node:region-header:frame:border-top"[^>]+stroke-dasharray="6000 2500 1000 2500"/u,
  );
  assert.match(
    publication.projection.svgMarkup,
    /id="node:region-header:frame:border-top"[^>]+stroke-dasharray="6 2\.500 1 2\.500"/u,
  );
  assert.doesNotMatch(screen.markup, /id="node:region-header:frame:border-right"/u);
  assert.doesNotMatch(
    publication.projection.svgMarkup,
    /id="node:region-header:frame:border-left"/u,
  );
});

test("BLD-058 text-frame edge authoring survives structured job revalidation and shares screen/PDF geometry", () => {
  const baseJob = job();
  const baseScene = resolve(baseJob);
  const node = baseScene.pages[0].nodes.find((candidate) => candidate.kind === "text");
  assert.equal(node?.kind, "text");
  const request = baseScene.textRequests.find(
    ({ measurementId }) => measurementId === node.measurementId,
  );
  assert.ok(request);
  const presentation = node.presentation;
  const authored = applyBoringLogTextOccurrenceStyles(
    baseJob,
    [],
    [
      {
        contractVersion: 1,
        schemaVersion: "rsrender.boring-log-text-occurrence-layout-override.v1",
        kind: "boring-log.text-occurrence-layout-override",
        ownerDocumentIdentity: "document:bld-058",
        boringLogIdentity: boringLogMvpFixture.identity.boringLogId,
        overrideIdentity: "override:bld-058:text-border",
        overrideRevision: 1,
        scope: "occurrence",
        occurrenceNodeId: node.id,
        semanticId: node.semanticId,
        layout: {
          frame: node.frame,
          frameAnchor: presentation?.frameAnchor ?? "top-left",
          paddingMpt: presentation?.paddingMpt ?? {
            topMpt: 0,
            rightMpt: 0,
            bottomMpt: 0,
            leftMpt: 0,
          },
          horizontalAlignment: presentation?.horizontalAlignment ?? "start",
          verticalAlignment: presentation?.verticalAlignment ?? "top",
          wrapPolicy: presentation?.wrapPolicy ?? request.wrapPolicy,
          overflowPolicy: presentation?.overflowPolicy ?? "clip-with-diagnostic",
          frameFillColor: null,
          frameStrokeColor: null,
          frameStrokeWidthMpt: 0,
          frameBorder: {
            top: false,
            right: true,
            bottom: false,
            left: true,
            color: "#175cd3",
            widthMpt: 2_000,
            linePattern: "dotted",
          },
          rotationMilliDegrees: presentation?.rotationMilliDegrees ?? 0,
          positionMode: presentation?.positionMode ?? "depth-bound",
          locked: presentation?.locked ?? false,
        },
      },
    ],
  );
  assert.equal(authored.accepted, true, JSON.stringify(authored));
  const scene = resolve(structuredClone(authored.job));
  const screen = projectBoringLogSceneToSvg(scene);
  const publication = projectBoringLogSceneForPublication(scene);
  assert.equal(screen.accepted, true);
  assert.equal(publication.accepted, true);
  assert.match(
    screen.markup,
    new RegExp(
      `id="${node.id}:presentation-frame:border-right"[^>]+stroke-dasharray="1000 2000"`,
      "u",
    ),
  );
  assert.match(
    publication.projection.svgMarkup,
    new RegExp(`id="${node.id}:presentation-frame:border-left"[^>]+stroke-dasharray="1 2"`, "u"),
  );
  assert.doesNotMatch(
    screen.markup,
    new RegExp(`id="${node.id}:presentation-frame:border-top"`, "u"),
  );
});

test("BLD-058 rejects malformed borders and exposes human border controls through owned commands", async () => {
  const malformed = structuredClone(boringLogMvpTemplate);
  malformed.regions[0].border = {
    top: true,
    right: true,
    bottom: true,
    left: true,
    color: "red",
    widthMpt: 500,
    linePattern: "solid",
  };
  assert.equal(validateBoringLogTemplateInput(malformed).accepted, false);
  const html = createBoringLogStudioHtml(resolve(job()));
  for (const id of [
    "region-border-all",
    "region-border-top",
    "region-border-right",
    "region-border-bottom",
    "region-border-left",
    "region-border-pattern",
    "apply-region-border",
    "text-border-top",
    "text-border-right",
    "text-border-bottom",
    "text-border-left",
    "text-border-pattern",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  const source = await readFile(
    new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /operation: "region-border-style"/u);
  assert.match(source, /commitEmbeddedTemplateReplacement/u);
});
