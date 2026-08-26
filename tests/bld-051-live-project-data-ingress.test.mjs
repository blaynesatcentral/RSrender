import assert from "node:assert/strict";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  inspectRsLogLiveBoreholeCatalog,
  inspectRsLogLiveProjectData,
  normalizeRsLogRichText,
} from "../packages/platform-electron-main/dist/rslog-live-project-data-ingress.js";
import { createRsLogProjectDataLayoutJobs } from "../packages/platform-electron-main/dist/rslog-project-data-layout-job.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const projectId = "cd4d34b8-0d0b-1ce6-4b2b-3a207932a127";
const boreholeId = "11111111-2222-3333-4444-555555555555";
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value));

const rosterBytes = bytes([
  {
    id: boreholeId,
    projectId,
    name: "SYN-1",
    depth: 25,
    elevation: null,
    lat: 45.5,
    long: -122.7,
    easting: 500000,
    northing: 5100000,
    startDate: "2026-08-20",
    endDate: "2026-08-21",
    loggedBy: "Synthetic Logger",
    reviewedBy: "Synthetic Reviewer",
    drillingContractor: "Synthetic Drilling",
    equipment: "Rig 1",
    size: "4 in",
    groundwaterLevel: 12,
    groundWaterNotes: "Synthetic observation",
  },
]);

function dataset(columns, rows) {
  return {
    columns: columns.map(([id, header, dataType]) => ({ id, header, dataType })),
    rows,
  };
}

const rsgeoBytes = bytes({
  exportSchemaVersion: 1,
  project: {
    id: projectId,
    name: "Synthetic Project",
    coordinateSystem: { kind: "projected", name: "Synthetic CRS" },
    verticalDatum: "Synthetic Datum",
    linearUnit: "ft",
  },
  surveyContext: { profile: "deviation" },
  datasets: {
    collar: dataset(
      [
        ["holeId", "Hole ID", "string"],
        ["elevation", "RL", "number"],
        ["depth", "Depth", "number"],
      ],
      [{ holeId: "SYN-1", elevation: 101.5, depth: 25 }],
    ),
    stratigraphy: dataset(
      [
        ["from", "From", "number"],
        ["to", "To", "number"],
        ["layerDescription", "Layer Description", "string"],
        ["logSymbol", "Log Symbol", "string"],
      ],
      [
        {
          from: 0,
          to: 10,
          layerDescription:
            '<span class="wrapper" align="left"><span data-name="AdditionalRemarks"><span class="text description-remarks" title="Click to edit" contenteditable="false">Stiff to medium-stiff, brown, SILT (ML), trace sand &amp; gravel, moist</span></span></span>',
          logSymbol: "ML",
        },
        { from: 10, to: 25, layerDescription: "Synthetic gravel", logSymbol: "GP-GW" },
      ],
    ),
    samples: {
      bySampleType: [
        {
          sampleTypeId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          sampleTypeName: "Synthetic split spoon",
          suggestedFileName: "synthetic.csv",
          ...dataset(
            [
              ["depth", "Depth", "number"],
              ["to", "To", "number"],
              ["sampleNumber", "Sample Number", "string"],
              ["sampleTypeTitle", "Sample Type Title", "string"],
              ["recovery", "Recovery", "number"],
              ["blowCounts", "Blow Counts", "string"],
              ["nValue", "N-Value", "number"],
              ["refusal", "Refusal", "boolean"],
            ],
            [
              {
                depth: 5,
                to: 6.5,
                sampleNumber: "S-1",
                sampleTypeTitle: "SPT",
                recovery: 80,
                blowCounts: "2-3-4",
                nValue: 7,
                refusal: false,
              },
              {
                depth: 12,
                to: 13.5,
                sampleNumber: "S-2",
                sampleTypeTitle: "Grab",
                recovery: null,
                blowCounts: 'REF 50/3"',
                nValue: null,
                refusal: true,
              },
              {
                depth: 18,
                to: 19.5,
                sampleNumber: "S-3",
                sampleTypeTitle: "SPT",
                recovery: 90,
                blowCounts: "5-8-11",
                nValue: null,
                refusal: false,
              },
            ],
          ),
        },
      ],
    },
    drillRuns: dataset(
      [
        ["fromDepth", "From Depth", "number"],
        ["toDepth", "To Depth", "number"],
        ["drillMethod", "Drill Method", "string"],
      ],
      [{ fromDepth: 0, toDepth: 25, drillMethod: "Synthetic rotary" }],
    ),
    boringDetails: dataset(
      [
        ["from", "From", "number"],
        ["to", "To", "number"],
        ["drillMethod", "Drill Method", "string"],
      ],
      [{ from: 0, to: 25, drillMethod: "Synthetic rotary" }],
    ),
    labResults: dataset([], []),
  },
});

test("BLD-051 admits an observed roster and maps one GUID-scoped RSGeo response", () => {
  const roster = inspectRsLogLiveBoreholeCatalog(rosterBytes, projectId);
  assert.equal(roster.accepted, true);
  assert.equal(roster.boreholes.length, 1);
  assert.equal(roster.boreholes[0].elevation, null);

  const result = inspectRsLogLiveProjectData({
    project: {
      id: projectId,
      title: "Synthetic Project",
      jobNumber: "SYN-2026",
      clientName: "Synthetic Client",
      siteLocation: "Synthetic Site",
      boreholeCount: 1,
      isActive: true,
      isExample: false,
    },
    projectBody: bytes({
      id: projectId,
      title: "Synthetic Project",
      jobNo: "SYN-2026",
      clientName: "Synthetic Client",
      siteLocation: "Synthetic Site",
      unitSystemTitle: "US customary",
      coordinateSystemTitle: "Synthetic CRS",
    }),
    boreholes: roster.boreholes,
    rsgeoResponses: [{ boreholeId, body: rsgeoBytes }],
  });
  assert.equal(result.accepted, true);
  assert.equal(result.value.schemaVersion, "rslog.live-rsgeo.v1");
  assert.equal(result.value.boreholes[0].identity, boreholeId);
  assert.equal(result.value.boreholes[0].elevation, 101.5);
  assert.equal(result.value.boreholes[0].stratigraphy.length, 2);
  assert.equal(
    result.value.boreholes[0].stratigraphy[0].description,
    "Stiff to medium-stiff, brown, SILT (ML), trace sand & gravel, moist",
  );
  assert.equal(result.value.boreholes[0].samples[0].blowCounts, "2-3-4");
  assert.equal(result.value.boreholes[0].samples[0].nValue, 7);
  assert.equal(result.value.boreholes[0].samples[1].blowCounts, 'REF 50/3"');
  assert.equal(result.value.boreholes[0].samples[1].refusal, true);
  assert.equal(result.value.boreholes[0].boringMethods[0].drillMethod, "Synthetic rotary");
  const layout = createRsLogProjectDataLayoutJobs({
    source: result.value,
    templateJob: {
      contractVersion: 1,
      schemaVersion: "rsrender.boring-log-layout-job.v1",
      kind: "boring-log.layout-job",
      jobId: "job:bld-051-live-template",
      inputRevision: 1,
      fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
      templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
      document: structuredClone(boringLogMvpFixture),
      template: structuredClone(boringLogMvpTemplate),
    },
  });
  assert.equal(layout.accepted, true, JSON.stringify(layout));
  assert.equal(layout.layoutJobs[0].document.samples[0].nValue, 7);
  assert.equal(layout.layoutJobs[0].document.samples[1].refusal, true);
  assert.equal(layout.layoutJobs[0].document.samples[2].nValue, 19);
  assert.deepEqual(layout.layoutJobs[0].document.samples[1].blowIncrements, [
    { blows: 50, penetrationInches: 3 },
  ]);
  assert.deepEqual(
    layout.layoutJobs[0].document.dataTrack.layers.find(({ id }) => id === "layer-n-value").values,
    [
      [`urn:rsrender:source:rslog-live:${boreholeId}:sample:1`, 7],
      [`urn:rsrender:source:rslog-live:${boreholeId}:sample:2`, 100],
      [`urn:rsrender:source:rslog-live:${boreholeId}:sample:3`, 19],
    ],
  );
  assert.ok(layout.warnings.includes("RSLOG_N_VALUE_DERIVED_FROM_STANDARD_INCREMENTS"));
});

test("BLD-051 normalizes provider rich text without executing or retaining markup", () => {
  assert.equal(
    normalizeRsLogRichText(
      "<div>First&nbsp;line<br>Second &ndash; line<script>not visible</script></div>",
    ),
    "First line\nSecond – line",
  );
  assert.equal(normalizeRsLogRichText("SILT &lt; sand &#38; gravel"), "SILT < sand & gravel");
  assert.equal(normalizeRsLogRichText("plain source text"), "plain source text");
});

test("BLD-051 live mapping fails closed on project mismatch and preserves missing elevation", () => {
  const roster = inspectRsLogLiveBoreholeCatalog(rosterBytes, projectId);
  assert.equal(roster.accepted, true);
  const base = {
    project: {
      id: projectId,
      title: "Synthetic Project",
      jobNumber: null,
      clientName: null,
      siteLocation: null,
      boreholeCount: 1,
      isActive: true,
      isExample: false,
    },
    projectBody: bytes({ id: projectId, title: "Synthetic Project" }),
    boreholes: roster.boreholes,
  };
  const mismatch = inspectRsLogLiveProjectData({
    ...base,
    rsgeoResponses: [
      {
        boreholeId,
        body: bytes({
          exportSchemaVersion: 1,
          project: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
          datasets: {},
        }),
      },
    ],
  });
  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.code, "RSLOG_LIVE_PROJECT_DATA_PROJECT_MISMATCH");

  const missingElevation = inspectRsLogLiveProjectData({
    ...base,
    rsgeoResponses: [
      {
        boreholeId,
        body: bytes({
          exportSchemaVersion: 1,
          project: { id: projectId },
          datasets: { collar: dataset([], []) },
        }),
      },
    ],
  });
  assert.equal(missingElevation.accepted, true);
  assert.equal(missingElevation.value.boreholes[0].elevation, null);
  assert.ok(missingElevation.warnings.includes("RSLOG_TOP_ELEVATION_PLACEHOLDER"));
});
