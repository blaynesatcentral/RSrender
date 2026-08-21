import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import {
  BORING_LOG_MVP_BUNDLE_DIGEST,
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_FIXTURE_SCHEMA_VERSION,
  BORING_LOG_MVP_ORACLE_DIGEST,
  BORING_LOG_MVP_ORACLE_SCHEMA_VERSION,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_SCHEMA_VERSION,
  boringLogMvpFixture,
  boringLogMvpOracle,
  boringLogMvpTemplate,
  validateBoringLogMvpFixtureBundle,
} from "../packages/test-support/dist/index.js";

function mutableBundle() {
  return JSON.parse(
    JSON.stringify({
      fixture: boringLogMvpFixture,
      template: boringLogMvpTemplate,
      oracle: boringLogMvpOracle,
    }),
  );
}

test("BLD-022 freezes renderer-usable structured boring-log inputs and oracle", () => {
  const result = validateBoringLogMvpFixtureBundle();
  assert.equal(result.accepted, true);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(boringLogMvpFixture.schemaVersion, BORING_LOG_MVP_FIXTURE_SCHEMA_VERSION);
  assert.equal(boringLogMvpTemplate.schemaVersion, BORING_LOG_MVP_TEMPLATE_SCHEMA_VERSION);
  assert.equal(boringLogMvpOracle.schemaVersion, BORING_LOG_MVP_ORACLE_SCHEMA_VERSION);
  assert.equal(result.fixtureDigest, BORING_LOG_MVP_FIXTURE_DIGEST);
  assert.equal(result.templateDigest, BORING_LOG_MVP_TEMPLATE_DIGEST);
  assert.equal(result.oracleDigest, BORING_LOG_MVP_ORACLE_DIGEST);
  assert.equal(result.bundleDigest, BORING_LOG_MVP_BUNDLE_DIGEST);
});

test("BLD-022 covers the complete reference-shaped information architecture", () => {
  assert.deepEqual(
    boringLogMvpTemplate.regions.map(({ role }) => role),
    ["header", "depth-body", "footer"],
  );
  assert.deepEqual(
    boringLogMvpTemplate.columns.map(({ role }) => role),
    boringLogMvpOracle.requiredColumnRoles,
  );
  assert.equal(boringLogMvpFixture.lithologyIntervals.length, 3);
  assert.equal(boringLogMvpFixture.samples.length, 10);
  assert.equal(boringLogMvpFixture.dataTrack.axes.length, 2);
  assert.equal(boringLogMvpFixture.dataTrack.layers.length, 3);
  assert.equal(boringLogMvpFixture.remarks.length, 7);
  assert.equal(boringLogMvpFixture.legend.length, 10);
  assert.equal(boringLogMvpFixture.notes.length, 8);
  assert.equal(boringLogMvpFixture.approval.heading, "REVIEWED & APPROVED");
});

test("BLD-022 uses exact integer mpt metrics and complete depth/column coverage", () => {
  assert.equal(boringLogMvpTemplate.page.widthMpt, 612_000);
  assert.equal(boringLogMvpTemplate.page.heightMpt, 792_000);
  assert.equal(boringLogMvpTemplate.depthTransform.mptPerFoot, 14_575);
  assert.equal(boringLogMvpTemplate.depthTransform.yEndMpt, 704_000);
  assert.equal(boringLogMvpFixture.lithologyIntervals[0].depthFromFt, 0);
  assert.equal(boringLogMvpFixture.lithologyIntervals.at(-1).depthToFt, 40);
  assert.equal(boringLogMvpTemplate.columns[0].xMpt, 15_000);
  const last = boringLogMvpTemplate.columns.at(-1);
  assert.equal(last.xMpt + last.widthMpt, 597_000);
});

test("BLD-022 retains source provenance and distinct shared data-track axes", () => {
  assert.ok(
    boringLogMvpFixture.samples.every(({ provenance }) => provenance.provenanceClass === "source"),
  );
  assert.deepEqual(
    boringLogMvpFixture.dataTrack.axes.map(({ id }) => id),
    ["axis-n-value", "axis-water-percent"],
  );
  assert.equal(boringLogMvpFixture.dataTrack.layers[0].axisId, "axis-n-value");
  assert.equal(boringLogMvpFixture.dataTrack.layers[1].axisId, "axis-water-percent");
  assert.equal(boringLogMvpFixture.dataTrack.layers[2].axisId, "axis-water-percent");
});

test("BLD-022 rejects non-integer geometry, gaps, broken references, and raster shortcuts", () => {
  const nonInteger = mutableBundle();
  nonInteger.template.page.widthMpt = 612_000.5;
  assert.deepEqual(validateBoringLogMvpFixtureBundle(nonInteger).diagnostics, [
    "MVP_FIXTURE_GEOMETRY_NOT_INTEGER_MPT",
  ]);

  const gap = mutableBundle();
  gap.fixture.lithologyIntervals[1].depthFromFt = 16;
  assert.deepEqual(validateBoringLogMvpFixtureBundle(gap).diagnostics, [
    "MVP_FIXTURE_DEPTH_COVERAGE_INVALID",
  ]);

  const brokenLayer = mutableBundle();
  brokenLayer.fixture.dataTrack.layers[0].axisId = "missing-axis";
  assert.deepEqual(validateBoringLogMvpFixtureBundle(brokenLayer).diagnostics, [
    "MVP_FIXTURE_DATA_TRACK_REFERENCE_INVALID",
  ]);

  const raster = mutableBundle();
  raster.template.backgroundImage = "page.png";
  assert.deepEqual(validateBoringLogMvpFixtureBundle(raster).diagnostics, [
    "MVP_FIXTURE_RASTER_OR_REFERENCE_SHORTCUT_FORBIDDEN",
  ]);
});

test("BLD-022 canonical input digests are stable across fresh-process-equivalent clones", () => {
  const first = validateBoringLogMvpFixtureBundle();
  const second = validateBoringLogMvpFixtureBundle(mutableBundle());
  assert.equal(second.accepted, true);
  assert.equal(second.fixtureDigest, first.fixtureDigest);
  assert.equal(second.templateDigest, first.templateDigest);
  assert.equal(second.oracleDigest, first.oracleDigest);
  assert.equal(second.bundleDigest, first.bundleDigest);
});

test("BLD-022 repeats the exact frozen vector twice in three fresh admitted-runtime processes", () => {
  const helperPath = fileURLToPath(new URL("./helpers/run-bld-022-vectors.mjs", import.meta.url));
  const transcripts = [];
  for (let processIndex = 0; processIndex < 3; processIndex += 1) {
    for (let repetition = 0; repetition < 2; repetition += 1) {
      const output = execFileSync(process.execPath, [helperPath], {
        encoding: "utf8",
        env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      }).trim();
      transcripts.push(JSON.parse(output));
    }
  }
  assert.equal(transcripts.length, 6);
  assert.ok(transcripts.every(({ node }) => node === "v24.18.1"));
  assert.ok(transcripts.every(({ bundleDigest }) => bundleDigest === BORING_LOG_MVP_BUNDLE_DIGEST));
  assert.equal(new Set(transcripts.map((entry) => JSON.stringify(entry))).size, 1);
});
