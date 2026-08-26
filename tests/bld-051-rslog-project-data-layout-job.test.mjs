import assert from "node:assert/strict";
import test from "node:test";

import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import { measureBoringLogTextRequests } from "../packages/layout-host/dist/index.js";
import {
  createRsLogProjectDataLayoutJobs,
  inspectRsLogProjectDataJson,
  rsLogProjectDataLayoutJobRevision,
} from "../packages/platform-electron-main/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

function templateJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-051-template",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

function source() {
  return JSON.stringify({
    Properties: { FileVersion: "v3" },
    Project: {
      Id: "synthetic-project",
      Title: "Synthetic Project",
      Number: "SYN-51",
      ClientName: "Synthetic Client",
      Address: "100 Example Way",
      UnitSystem: "Imperial",
      CoordinateSystem: "NAVD 88 / WGS 84",
    },
    Boreholes: [
      {
        Id: "synthetic-boring-1",
        Name: "B-1",
        Depth: 25,
        Elevation: 180.5,
        StartDate: "2026-08-24",
        LoggedBy: "Synthetic Logger",
        Stratigraphy: [
          {
            Id: "b1-layer-1",
            FromDepth: 0,
            ToDepth: 10,
            Title: "SILT",
            Description: "Synthetic silt",
            SoilSymbol: "ML",
            General: { ForeColor: "#183153", BackColor: "#e8edf2" },
          },
          {
            Id: "b1-layer-2",
            FromDepth: 12,
            ToDepth: 25,
            Title: "GRAVEL",
            Description: "Synthetic gravel after an unlogged gap",
            SoilSymbol: "GP-GW",
          },
        ],
        Samples: [
          {
            Id: "b1-sample-1",
            FromDepth: 5,
            Number: "S-1",
            TypeName: "SPT",
            BlowCounts: "3-4-5",
            NValue: 9,
            Refusal: false,
            LabTests: { IndexTests: { MoistureW: 22, LiquidLimit: 38, PlasticLimit: 19 } },
          },
        ],
        Comments: [{ Id: "b1-comment-1", Depth: 15, Description: "Synthetic comment" }],
      },
      {
        Id: "synthetic-boring-2",
        Name: "B-2",
        Depth: 60,
        Elevation: 175,
        Stratigraphy: [
          {
            Id: "b2-layer-1",
            FromDepth: 0,
            ToDepth: 60,
            Description: "Synthetic deep boring",
            SoilSymbol: "CL",
          },
        ],
      },
    ],
  });
}

test("BLD-051 maps every admitted borehole to a source-labeled renderer job", () => {
  assert.equal(rsLogProjectDataLayoutJobRevision, "bld-051-rslog-project-data-layout-job-v1");
  const decoded = inspectRsLogProjectDataJson(source());
  assert.equal(decoded.accepted, true, JSON.stringify(decoded));
  const mapped = createRsLogProjectDataLayoutJobs({
    source: decoded.value,
    templateJob: templateJob(),
  });
  assert.equal(mapped.accepted, true, JSON.stringify(mapped));
  assert.equal(mapped.layoutJobs.length, 2);
  assert.deepEqual(mapped.warnings, ["RSLOG_HATCH_PATTERN_FALLBACK"]);
  for (const job of mapped.layoutJobs) {
    assert.equal(job.document.schemaVersion, "rsrender.boring-log-source-document.v1");
    assert.equal(job.document.evidenceClass, "source-project-data");
    assert.equal(job.document.publicationEligibility, "source-project-data");
    assert.equal(job.fixtureDigest, sha256CanonicalJson(job.document));
    assert.equal(job.templateDigest, sha256CanonicalJson(job.template));
    const prepared = prepareBoringLogLayout(job);
    assert.equal(prepared.accepted, true, JSON.stringify(prepared));
    const resolved = resolveBoringLogPageScene(
      prepared.value,
      strictCoverageTextResults(prepared.value.textRequests),
    );
    assert.equal(resolved.accepted, true, JSON.stringify(resolved));
    assert.deepEqual(
      resolved.value.diagnostics.filter(({ severity }) => severity === "error"),
      [],
      JSON.stringify(resolved.value.diagnostics),
    );
    const measured = measureBoringLogTextRequests(prepared.value.textRequests);
    assert.equal(measured.accepted, true, JSON.stringify(measured));
    const publicationResolved = resolveBoringLogPageScene(prepared.value, measured.results);
    assert.equal(publicationResolved.accepted, true, JSON.stringify(publicationResolved));
    assert.deepEqual(
      publicationResolved.value.diagnostics.filter(({ severity }) => severity === "error"),
      [],
      JSON.stringify(publicationResolved.value.diagnostics),
    );
  }
  const first = mapped.layoutJobs[0];
  assert.equal(first.document.samples[0].recoveryPercent, null);
  assert.equal(first.document.samples[0].nValue, 9);
  assert.equal(first.document.samples[0].refusal, false);
  assert.equal(first.document.lithologyIntervals[1].depthFromFt, 12);
  assert.equal(first.template.visualTokens["rslog-lithology-background-1"], "#e8edf2");
  assert.equal(first.document.dataTrack.layers.length, 3);
  assert.deepEqual(
    first.document.dataTrack.layers.find(({ id }) => id === "layer-n-value").values,
    [["b1-sample-1", 9]],
  );
  assert.equal(mapped.layoutJobs[1].template.pagination.policy, "fixed-scale-continuation-v1");
});

test("BLD-051 makes an absent source elevation explicit and editable without blocking import", () => {
  const parsed = JSON.parse(source());
  delete parsed.Boreholes[0].Elevation;
  const decoded = inspectRsLogProjectDataJson(JSON.stringify(parsed));
  assert.equal(decoded.accepted, true);
  const mapped = createRsLogProjectDataLayoutJobs({
    source: decoded.value,
    templateJob: templateJob(),
  });
  assert.equal(mapped.accepted, true);
  assert.equal(mapped.layoutJobs[0].document.metadata.groundElevationFt, 0);
  assert.ok(mapped.warnings.includes("RSLOG_TOP_ELEVATION_PLACEHOLDER"));
  assert.ok(
    mapped.layoutJobs[0].document.notes.some((note) => note.includes("must be replaced in Data")),
  );
});
