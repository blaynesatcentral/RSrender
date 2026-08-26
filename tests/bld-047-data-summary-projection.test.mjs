import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import {
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

const documentIdentity = "urn:test:bld-047:document:data-summary-001";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-047-data-summary@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

test("BLD-047 Studio projection exposes Data summary from the effective layout job", async () => {
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: layoutJob(),
  });
  assert.equal(created.accepted, true, created.code);
  const query = await created.session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId: "urn:test:bld-047:query:data-summary",
    documentId: documentIdentity,
    ownerGeneration: 1,
    minimumWorkingRevision: null,
  });
  assert.equal(query.kind, "render-dataset.projection.result");
  const prepared = prepareBoringLogStudioProjection({
    layoutJob: created.session.layoutJob,
    bindings: created.session.bindings,
    dataset: query.projection,
  });
  assert.equal(prepared.accepted, true, prepared.code);
  const projected = completeBoringLogStudioProjection(
    prepared.preparation,
    strictCoverageTextResults(prepared.preparation.layout.textRequests),
  );
  assert.equal(projected.accepted, true, projected.code);
  assert.deepEqual(projected.projection.dataSummary, {
    projectName: boringLogMvpFixture.metadata.projectName,
    groundElevationFt: boringLogMvpFixture.metadata.groundElevationFt,
    elevationDatum: boringLogMvpFixture.metadata.elevationDatum,
    referenceStartFt: boringLogMvpFixture.referenceDepthRange.startFt,
    referenceEndFt: boringLogMvpFixture.referenceDepthRange.endFt,
    totalDepthFt: boringLogMvpFixture.metadata.totalDepthFt,
    completionDepthFt: boringLogMvpFixture.metadata.completionDepthFt,
    depthScaleMptPerFoot: boringLogMvpTemplate.depthTransform.mptPerFoot,
    depthIntervalFt:
      boringLogMvpTemplate.depthTransform.depthEndFt -
      boringLogMvpTemplate.depthTransform.depthStartFt,
    nValueGraphMaximum: boringLogMvpFixture.dataTrack.axes.find(({ id }) => id === "axis-n-value")
      .maximum,
  });
});
