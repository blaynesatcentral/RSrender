import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  inspectRsLogProjectDataJson,
  maximumRsLogProjectDataBytes,
  rsLogProjectDataIngressRevision,
} from "../packages/platform-electron-main/dist/index.js";
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";

test("BLD-045 bounded ingress rejects unadmitted JSON without inventing a schema", () => {
  const source = '{"testHoles":[{"name":"SYNTHETIC-01"}],"project":{"title":"Synthetic"}}';
  const inspected = inspectRsLogProjectDataJson(source);
  assert.equal(rsLogProjectDataIngressRevision, "bld-051-rslog-project-data-ingress-v2");
  assert.equal(inspected.accepted, false);
  assert.equal(inspected.code, "RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED");
  assert.equal(inspected.byteLength, new TextEncoder().encode(source).byteLength);
  assert.match(inspected.sourceDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(inspected.topLevelKind, "object");
  assert.deepEqual(inspected.topLevelKeys, ["project", "testHoles"]);
  assert.equal("layoutJobs" in inspected, false);
  assert.equal("sourceSnapshot" in inspected, false);
});

test("BLD-051 admits the documented RSLog Project JSON v3 core for multiple boreholes", () => {
  const source = JSON.stringify({
    Properties: { FileVersion: "v3", ExportedBy: "synthetic@example.invalid" },
    Project: {
      Id: "project-synthetic-1",
      Title: "Synthetic Multi-Borehole Project",
      Number: "SYN-001",
      ClientName: "Synthetic Client",
      Address: "100 Example Way",
      UnitSystem: "Imperial",
      CoordinateSystem: "WGS 84",
    },
    Boreholes: [
      {
        Id: "borehole-synthetic-1",
        Name: "B-1",
        Depth: 20,
        Elevation: 175.5,
        Latitude: 45.1,
        Longitude: -122.7,
        LoggedBy: "Synthetic Logger",
        DrillingGroundwaterLevels: {
          GroundwaterDepth: 12.5,
          GroundwaterNotes: "Synthetic observation",
        },
        Stratigraphy: [
          {
            Id: "stratum-synthetic-1",
            FromDepth: 0,
            ToDepth: 20,
            Title: "SILT",
            Description: "Synthetic brown moist silt",
            SoilSymbol: "ML",
            General: { ForeColor: "#000000", BackColor: "#D2B48C" },
          },
        ],
        Samples: [
          {
            Id: "sample-synthetic-1",
            FromDepth: 5,
            ToDepth: 6.5,
            Number: "S-1",
            TypeName: "SPT",
            RecoveryPercent: 80,
            BlowCounts: "3-4-5",
            MoistureContent: 18,
            LabTests: {
              IndexTests: [
                { MoistureW: 18.5, LiquidLimit: 35, PlasticLimit: 18, PlasticIndex: 17 },
              ],
            },
          },
          { FromDepth: 10, Number: "inactive", IsActive: false },
        ],
        Comments: [{ Depth: 12, Description: "Synthetic depth comment" }],
        BoringMethods: [
          {
            FromDepth: 0,
            ToDepth: 20,
            DrillMethod: "Mud rotary",
            DrillRigModel: "Synthetic Rig",
            HoleDiameter: 4,
            Date: "2026-08-25",
          },
        ],
        UnknownFutureField: { remains: "inert" },
      },
      {
        Name: "B-2",
        Depth: 10,
        Stratigraphy: [
          { FromDepth: 0, ToDepth: 10, Description: "Synthetic sand", SoilSymbol: "SP" },
        ],
      },
    ],
  });
  const inspected = inspectRsLogProjectDataJson(source);
  assert.equal(inspected.accepted, true, JSON.stringify(inspected));
  assert.equal(inspected.code, "RSLOG_PROJECT_DATA_ACCEPTED");
  assert.equal(inspected.value.schemaVersion, "rslog.project-json.v3");
  assert.equal(inspected.value.project.identity, "project-synthetic-1");
  assert.equal(inspected.value.boreholes.length, 2);
  assert.equal(inspected.value.boreholes[0].samples.length, 1);
  assert.equal(inspected.value.boreholes[0].samples[0].plasticIndex, 17);
  assert.equal(inspected.value.boreholes[0].groundwaterDepth, 12.5);
  assert.match(inspected.value.boreholes[1].identity, /^urn:rsrender:source:/u);
  assert.equal("UnknownFutureField" in inspected.value.boreholes[0], false);
});

test("BLD-051 refuses unsupported versions, malformed intervals, and duplicate source IDs", () => {
  const candidate = {
    Properties: { FileVersion: "v2" },
    Project: {
      Title: "Synthetic",
      UnitSystem: "Imperial",
      CoordinateSystem: "WGS 84",
    },
    Boreholes: [{ Name: "B-1", Depth: 10 }],
  };
  assert.equal(
    inspectRsLogProjectDataJson(JSON.stringify(candidate)).code,
    "RSLOG_PROJECT_DATA_VERSION_UNSUPPORTED",
  );
  candidate.Properties.FileVersion = "v3";
  candidate.Boreholes[0].Stratigraphy = [{ FromDepth: 5, ToDepth: 4 }];
  const malformed = inspectRsLogProjectDataJson(JSON.stringify(candidate));
  assert.equal(malformed.code, "RSLOG_PROJECT_DATA_SCHEMA_MALFORMED");
  assert.equal(malformed.diagnosticPath, "$.Boreholes[0].Stratigraphy[0].FromDepth/ToDepth");
  candidate.Boreholes = [
    { Id: "duplicate", Name: "B-1", Depth: 10 },
    { Id: "duplicate", Name: "B-2", Depth: 10 },
  ];
  assert.equal(
    inspectRsLogProjectDataJson(JSON.stringify(candidate)).code,
    "RSLOG_PROJECT_DATA_DUPLICATE_IDENTITY",
  );
});

test("BLD-045 ingress rejects malformed, scalar, hostile, and over-limit inputs explicitly", () => {
  assert.deepEqual(inspectRsLogProjectDataJson(null), {
    accepted: false,
    code: "RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE",
  });
  assert.deepEqual(inspectRsLogProjectDataJson(new Uint8Array()), {
    accepted: false,
    code: "RSLOG_PROJECT_DATA_INPUT_EMPTY",
  });
  assert.equal(
    inspectRsLogProjectDataJson(new Uint8Array([0xff])).code,
    "RSLOG_PROJECT_DATA_INPUT_INVALID_UTF8",
  );
  assert.equal(inspectRsLogProjectDataJson("{").code, "RSLOG_PROJECT_DATA_INPUT_INVALID_JSON");
  assert.equal(
    inspectRsLogProjectDataJson("null").code,
    "RSLOG_PROJECT_DATA_TOP_LEVEL_UNSUPPORTED",
  );
  assert.equal(
    inspectRsLogProjectDataJson(new Uint8Array(maximumRsLogProjectDataBytes + 1)).code,
    "RSLOG_PROJECT_DATA_INPUT_TOO_LARGE",
  );
  let getterCalls = 0;
  const hostile = Object.defineProperty({}, "byteLength", {
    get() {
      getterCalls += 1;
      return 1;
    },
  });
  assert.equal(inspectRsLogProjectDataJson(hostile).code, "RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE");
  assert.equal(getterCalls, 0);
});

test("BLD-051 Studio maps all logs in place and retains disposable probe staging", async () => {
  const html = createBoringLogStudioHtml(null);
  assert.match(html, /id="open-project"[^>]*>.*Open/su);
  assert.match(html, /id="import-rslog-project-data"[^>]*>.*Import RSLog/su);
  const [renderer, broker, preload, main] = await Promise.all(
    [
      "packages/renderer-ui/src/boring-log-studio-entry.ts",
      "packages/platform-electron-main/src/boring-log-studio-route-broker.ts",
      "packages/platform-electron-main/src/boring-log-studio-preload-runtime.ts",
      "packages/platform-electron-main/src/semantic-editor-main.ts",
    ].map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")),
  );
  for (const source of [renderer, broker, preload, main]) {
    assert.match(source, /import-rslog-project-data/u);
  }
  assert.match(main, /Import RSLog Project Data JSON/u);
  assert.match(main, /createRsLogProjectDataLayoutJobs/u);
  assert.match(main, /RSLOG_PROJECT_DATA_IMPORTED/u);
  assert.match(main, /RSLOG_PROJECT_DATA_IMPORT_STAGED_FOR_PROBE/u);
  assert.match(main, /IMPORTED_PROJECT_STAGING_ARGUMENT/u);
  assert.match(main, /unlinkSync\(resolvedRuntimeProjectPath\)/u);
  assert.match(main, /layoutJobs: mapped\.layoutJobs/u);
});
