import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  fontProjectionBindingSchemaVersion,
  resolveExactFontProjectionFace,
  rsrenderFontProjectionBindings,
  rsrenderPublicationFontResources,
  validateFontProjectionBindingCatalog,
} from "../packages/contracts/dist/index.js";
import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import { projectBoringLogSceneToSvg } from "../packages/renderer-ui/dist/index.js";
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";
import { bundledSourceFontFaces } from "../packages/platform-electron-main/dist/shipped-font-inventory.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function resolvedScene() {
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-057-font-projection@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(prepared.accepted, true);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true);
  return resolved.value;
}

function customBindings() {
  return {
    contractVersion: 1,
    schemaVersion: fontProjectionBindingSchemaVersion,
    kind: "font-projection-binding-catalog",
    families: [{ familyId: "font.logical.test-serif", cssFamilyName: "Qualified Test Serif" }],
    faces: [
      {
        faceId: "font.face.test-serif.regular",
        familyId: "font.logical.test-serif",
        style: "normal",
        weight: 400,
      },
      {
        faceId: "font.face.test-serif.bold",
        familyId: "font.logical.test-serif",
        style: "normal",
        weight: 700,
      },
    ],
  };
}

function customScene() {
  const scene = structuredClone(resolvedScene());
  scene.resources.textStyles = scene.resources.textStyles.map((style) => ({
    ...style,
    fontFamilyId: "font.logical.test-serif",
  }));
  return scene;
}

test("BLD-057 screen and publication projection resolve exact admitted faces without substitution", () => {
  const bindings = customBindings();
  assert.equal(validateFontProjectionBindingCatalog(bindings).accepted, true);

  const screen = projectBoringLogSceneToSvg(customScene(), null, null, bindings);
  assert.equal(screen.accepted, true, JSON.stringify(screen));
  assert.match(screen.markup, /font-family="Qualified Test Serif"/u);
  assert.match(screen.markup, /data-font-face-id="font\.face\.test-serif\.regular"/u);
  assert.match(screen.markup, /data-font-face-id="font\.face\.test-serif\.bold"/u);

  const publication = projectBoringLogSceneForPublication(customScene(), {
    bindings,
    resources: [
      {
        faceId: "font.face.test-serif.regular",
        resourceUrl: "rsrender-layout://publication/test-serif-regular.ttf",
        format: "truetype",
      },
      {
        faceId: "font.face.test-serif.bold",
        resourceUrl: "rsrender-layout://publication/test-serif-bold.ttf",
        format: "truetype",
      },
    ],
  });
  assert.equal(publication.accepted, true, JSON.stringify(publication));
  assert.match(publication.projection.svgMarkup, /font-family="Qualified Test Serif"/u);
  assert.match(
    publication.projection.html,
    /@font-face\{font-family:"Qualified Test Serif";src:url\("rsrender-layout:\/\/publication\/test-serif-regular\.ttf"\) format\("truetype"\);font-style:normal;font-weight:400\}/u,
  );
});

test("BLD-057 unknown logical families and missing exact resources fail closed", () => {
  const bindings = customBindings();
  const screen = projectBoringLogSceneToSvg(resolvedScene(), null, null, bindings);
  assert.equal(screen.accepted, false);
  assert.equal(screen.code, "BORING_LOG_SVG_FONT_BINDING_REJECTED");
  assert.match(
    screen.detail,
    /^FONT_PROJECTION_BINDING_FACE_NOT_FOUND:font\.logical\.rsrender-sans:normal:(?:400|700)$/u,
  );

  const publication = projectBoringLogSceneForPublication(customScene(), {
    bindings,
    resources: [
      {
        faceId: "font.face.test-serif.regular",
        resourceUrl: "rsrender-layout://publication/test-serif-regular.ttf",
        format: "truetype",
      },
    ],
  });
  assert.deepEqual(publication, {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_FONT_BINDING_REJECTED",
  });
});

test("BLD-042 ships a complete exact four-family palette without synthetic faces", async () => {
  const validated = validateFontProjectionBindingCatalog(rsrenderFontProjectionBindings);
  assert.equal(validated.accepted, true);
  assert.deepEqual(
    rsrenderFontProjectionBindings.families.map(({ cssFamilyName }) => cssFamilyName),
    ["RSrender Qualified Arial", "Source Sans 3", "Source Serif 4", "Source Code Pro"],
  );
  assert.equal(rsrenderFontProjectionBindings.faces.length, 14);
  assert.equal(rsrenderPublicationFontResources.length, 14);
  for (const familyId of [
    "font.logical.source-sans-3",
    "font.logical.source-serif-4",
    "font.logical.source-code-pro",
  ]) {
    for (const [style, weight] of [
      ["normal", 400],
      ["italic", 400],
      ["normal", 700],
      ["italic", 700],
    ]) {
      assert.equal(
        resolveExactFontProjectionFace(rsrenderFontProjectionBindings, familyId, style, weight)
          .accepted,
        true,
      );
    }
  }

  assert.equal(bundledSourceFontFaces.length, 12);
  for (const face of bundledSourceFontFaces) {
    const bytes = await readFile(
      path.resolve("packages", "platform-electron-main", "assets", "fonts", face.fileName),
    );
    assert.equal(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, face.byteDigest);
  }
});

test("BLD-042 exposes every admitted family and conventional style in Properties", () => {
  const html = createBoringLogStudioHtml();
  for (const family of ["Arial", "Source Sans 3", "Source Serif 4", "Source Code Pro"]) {
    assert.match(html, new RegExp(`>${family.replaceAll(" ", "\\s")}</option>`, "u"));
  }
  assert.match(html, /id="text-font-style"[\s\S]*?>Regular<\/option>[\s\S]*?>Italic<\/option>/u);
  assert.match(
    html,
    /id="text-font-weight"[\s\S]*?>Regular · 400<\/option>[\s\S]*?>Bold · 700<\/option>/u,
  );
});
