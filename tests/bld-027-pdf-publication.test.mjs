import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import {
  BoringLogPdfPublicationRouteBroker,
  boringLogPdfPublicationRevision,
  boringLogPublicationRouteRevision,
  publishBoringLogPdf,
  validBoringLogPdfEnvelope,
} from "../packages/platform-electron-main/dist/index.js";
import { DOCUMENT_ROUTE_URL } from "../packages/platform-electron-main/dist/index.js";
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
    jobId: "job:bld-027-pdf@r1",
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

function fakePdf() {
  const body = "0".repeat(2_048);
  return Buffer.from(`%PDF-1.7\n${body}\n%%EOF\n`, "ascii");
}

test("BLD-027 publication stages, verifies, and commits one create-new PDF", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "rsrender-bld027-pdf-"));
  try {
    const destinationPath = path.join(temporary, "boring-log.pdf");
    const scene = resolvedScene();
    const projected = projectBoringLogSceneForPublication(scene);
    assert.equal(projected.accepted, true);
    let renderRequest;
    const result = await publishBoringLogPdf({
      scene,
      workingRevision: 7,
      expectedWorkingRevision: 7,
      expectedSceneInputDigest: scene.inputDigest,
      chooseDestination: async () => destinationPath,
      renderPdf: async (request) => {
        renderRequest = request;
        return fakePdf();
      },
    });
    assert.equal(boringLogPdfPublicationRevision, "bld-027-pdf-publication-v1");
    assert.equal(result.accepted, true, JSON.stringify(result));
    assert.equal(result.code, "EXPORT_VERIFIED_SUCCESS");
    assert.equal(result.sceneDigest, projected.projection.manifest.sceneDigest);
    assert.equal(result.projectionDigest, projected.projection.projectionDigest);
    assert.deepEqual(result.pageSizes, [{ widthMpt: 612_000, heightMpt: 792_000 }]);
    assert.equal(renderRequest.projection.html, projected.projection.html);
    assert.deepEqual(await readFile(destinationPath), fakePdf());
    assert.equal(validBoringLogPdfEnvelope(await readFile(destinationPath)), true);
    assert.equal(
      (
        await publishBoringLogPdf({
          scene,
          workingRevision: 7,
          expectedWorkingRevision: 7,
          expectedSceneInputDigest: scene.inputDigest,
          chooseDestination: async () => destinationPath,
          renderPdf: async () => fakePdf(),
        })
      ).code,
      "EXPORT_DESTINATION_EXISTS",
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("BLD-027 publication fails closed before render for cancellation and stale scene", async () => {
  const scene = resolvedScene();
  let renders = 0;
  const renderPdf = async () => {
    renders += 1;
    return fakePdf();
  };
  assert.deepEqual(
    await publishBoringLogPdf({
      scene,
      workingRevision: 1,
      expectedWorkingRevision: 2,
      expectedSceneInputDigest: scene.inputDigest,
      chooseDestination: async () => "C:\\ignored.pdf",
      renderPdf,
    }),
    { accepted: false, code: "EXPORT_STALE_SCENE" },
  );
  assert.deepEqual(
    await publishBoringLogPdf({
      scene,
      workingRevision: 1,
      expectedWorkingRevision: 1,
      expectedSceneInputDigest: scene.inputDigest,
      chooseDestination: async () => null,
      renderPdf,
    }),
    { accepted: false, code: "EXPORT_CANCELLED" },
  );
  assert.equal(renders, 0);
  assert.equal(validBoringLogPdfEnvelope(Buffer.from("%PDF-1.7\n%%EOF")), false);
});

test("BLD-033 publication preflight blocks layout errors before destination or render", async () => {
  const scene = structuredClone(resolvedScene());
  const diagnostic = {
    code: "BORING_LOG_TEXT_COLLISION",
    severity: "error",
    message: "Deliberate text collision gate vector",
    semanticId: "header-company",
  };
  scene.diagnostics = [diagnostic];
  scene.pagePlan.diagnostics = [diagnostic];
  scene.pagePlan.overflow = "clipped-with-diagnostic";
  let destinations = 0;
  let renders = 0;
  assert.deepEqual(
    await publishBoringLogPdf({
      scene,
      workingRevision: 1,
      expectedWorkingRevision: 1,
      expectedSceneInputDigest: scene.inputDigest,
      chooseDestination: async () => {
        destinations += 1;
        return "C:\\ignored.pdf";
      },
      renderPdf: async () => {
        renders += 1;
        return fakePdf();
      },
    }),
    { accepted: false, code: "EXPORT_PREFLIGHT_BLOCKED" },
  );
  assert.equal(destinations, 0);
  assert.equal(renders, 0);
});

test("BLD-027 publication route is capability-bound, ordered, and scene-specific", async () => {
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  const outcome = {
    accepted: true,
    code: "EXPORT_VERIFIED_SUCCESS",
    workingRevision: 3,
    packageCandidateDigest: `sha256:${"a".repeat(64)}`,
    selectionDigest: `sha256:${"b".repeat(64)}`,
    orderedBoringLogIdentities: ["urn:test:boring-log:01"],
    pageManifest: [
      {
        packagePageIndex: 0,
        boringLogIdentity: "urn:test:boring-log:01",
        explorationIdentity: "urn:test:exploration:01",
        sourceOrdinal: 1,
        boringPageIndex: 0,
        pageId: "urn:test:page:01",
        widthMpt: 612_000,
        heightMpt: 792_000,
        sceneInputDigest: `sha256:${"c".repeat(64)}`,
      },
    ],
    aggregateSceneDigest: `sha256:${"d".repeat(64)}`,
    aggregateProjectionDigest: `sha256:${"e".repeat(64)}`,
    pdfDigest: `sha256:${"f".repeat(64)}`,
    pdfBytes: 4_096,
    pageCount: 1,
    destinationPath: "C:\\output\\boring-log.pdf",
    taggedPdfTarget: true,
    vectorTextTarget: true,
  };
  const route = new BoringLogPdfPublicationRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity: "urn:test:bld-027:document:1",
    ownerGeneration: 1,
    createCapability: () => "e".repeat(64),
    exportPdf: async () => outcome,
  });
  const context = {
    window: expectedWindow,
    webContents: expectedWebContents,
    frame,
    mainFrame: frame,
    url: DOCUMENT_ROUTE_URL,
    windowLive: true,
    webContentsLive: true,
  };
  const binding = route.bootstrap(context);
  assert.equal(binding.accepted, true);
  assert.equal(boringLogPublicationRouteRevision, "bld-044-publication-route-v2");
  const request = {
    transportVersion: 2,
    capability: binding.capability,
    generation: binding.generation,
    sequence: 1,
    documentIdentity: binding.documentIdentity,
    ownerGeneration: binding.ownerGeneration,
    args: {
      expectedWorkingRevision: 3,
      orderedBoringLogIdentities: outcome.orderedBoringLogIdentities,
    },
  };
  const accepted = await route.exportPdf(context, request);
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(accepted.result, outcome);
  assert.deepEqual(await route.exportPdf(context, request), {
    accepted: false,
    code: "PUBLICATION_ROUTE_SEQUENCE_INVALID",
  });
  assert.equal(
    (
      await route.exportPdf(
        { ...context, url: "https://example.invalid" },
        { ...request, sequence: 2 },
      )
    ).code,
    "PUBLICATION_ROUTE_CONTEXT_INVALID",
  );
});
