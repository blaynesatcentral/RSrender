import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { measureBoringLogTextRequests } from "../packages/layout-host/dist/index.js";
import {
  boringLogPdfPackagePublicationRevision,
  publishBoringLogPdfPackage,
} from "../packages/platform-electron-main/dist/index.js";
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
    jobId: "job:bld-044-pdf-package@r1",
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

function secondScene(first) {
  return JSON.parse(
    JSON.stringify(first)
      .replaceAll("test-01", "test-02")
      .replaceAll("bld-044-pdf-package@r1", "bld-044-pdf-package-02@r1"),
  );
}

function sceneSet() {
  const first = resolvedScene();
  const second = secondScene(first);
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-publication-scene-set.v1",
    kind: "boring-log.publication-scene-set",
    entries: [
      {
        boringLogIdentity: "urn:rsrender:boring-log:test-02",
        explorationIdentity: "urn:rsrender:exploration:test-02",
        sourceOrdinal: 2,
        scene: second,
      },
      {
        boringLogIdentity: "urn:rsrender:boring-log:test-01",
        explorationIdentity: "urn:rsrender:exploration:test-01",
        sourceOrdinal: 1,
        scene: first,
      },
    ],
  };
}

function fakePdf() {
  return Buffer.from(`%PDF-1.7\n${"0".repeat(2_048)}\n%%EOF\n`, "ascii");
}

test("BLD-044 publication freezes and commits one ordered multi-log PDF package", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "rsrender-bld044-package-"));
  try {
    const destinationPath = path.join(temporary, "ordered-log-set.pdf");
    const set = sceneSet();
    const orderedBoringLogIdentities = set.entries.map(
      ({ boringLogIdentity }) => boringLogIdentity,
    );
    let renderRequest;
    const result = await publishBoringLogPdfPackage({
      sceneSet: set,
      workingRevision: 9,
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
      chooseDestination: async () => destinationPath,
      renderPdf: async (request) => {
        renderRequest = request;
        return fakePdf();
      },
    });
    assert.equal(boringLogPdfPackagePublicationRevision, "bld-044-pdf-package-publication-v1");
    assert.equal(result.accepted, true, JSON.stringify(result));
    assert.deepEqual(result.orderedBoringLogIdentities, orderedBoringLogIdentities);
    assert.deepEqual(
      result.pageManifest.map(({ packagePageIndex, boringLogIdentity, sourceOrdinal }) => ({
        packagePageIndex,
        boringLogIdentity,
        sourceOrdinal,
      })),
      [
        {
          packagePageIndex: 0,
          boringLogIdentity: "urn:rsrender:boring-log:test-02",
          sourceOrdinal: 2,
        },
        {
          packagePageIndex: 1,
          boringLogIdentity: "urn:rsrender:boring-log:test-01",
          sourceOrdinal: 1,
        },
      ],
    );
    assert.equal(result.pageCount, 2);
    assert.match(result.selectionDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.match(result.packageCandidateDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(renderRequest.projection.manifest.pageCount, 2);
    assert.deepEqual(await readFile(destinationPath), fakePdf());
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("BLD-044 package publication rejects stale selection and empty destination before render", async () => {
  const set = sceneSet();
  const orderedBoringLogIdentities = set.entries.map(({ boringLogIdentity }) => boringLogIdentity);
  let renders = 0;
  const renderPdf = async () => {
    renders += 1;
    return fakePdf();
  };
  assert.deepEqual(
    await publishBoringLogPdfPackage({
      sceneSet: set,
      workingRevision: 8,
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
      chooseDestination: async () => "C:\\ignored.pdf",
      renderPdf,
    }),
    { accepted: false, code: "EXPORT_STALE_SCENE" },
  );
  assert.deepEqual(
    await publishBoringLogPdfPackage({
      sceneSet: set,
      workingRevision: 9,
      expectedWorkingRevision: 9,
      orderedBoringLogIdentities,
      chooseDestination: async () => null,
      renderPdf,
    }),
    { accepted: false, code: "EXPORT_CANCELLED" },
  );
  assert.equal(renders, 0);
});
