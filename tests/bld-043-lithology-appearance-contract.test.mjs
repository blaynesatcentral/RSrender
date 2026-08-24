import assert from "node:assert/strict";
import test from "node:test";

import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
} from "../packages/contracts/dist/index.js";
import { measureBoringLogTextRequests } from "../packages/layout-host/dist/index.js";
import {
  prepareBoringLogLayout,
  resolveBoringLogLithologyAppearances,
  resolveBoringLogLithologyPatternResources,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function baselineJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-043-lithology-appearance@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

function authoredJob(mutate) {
  const job = baselineJob();
  mutate(job);
  job.fixtureDigest = sha256CanonicalJson(job.document);
  job.templateDigest = sha256CanonicalJson(job.template);
  return job;
}

function resolvedScene(job) {
  const prepared = prepareBoringLogLayout(job);
  assert.equal(prepared.accepted, true, prepared.contractCode);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true, measured.reason);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true, resolved.contractCode);
  return resolved.value;
}

test("BLD-043 contract requires explicit mapped classifications and admitted appearance resources", () => {
  assert.equal(validateBoringLogLayoutJobInput(baselineJob()).accepted, true);

  const missingKey = baselineJob();
  delete missingKey.document.lithologyIntervals[0].mappedClassificationKey;
  assert.equal(validateBoringLogLayoutJobInput(missingKey).accepted, false);

  const inferredDisplayText = baselineJob();
  inferredDisplayText.document.lithologyIntervals[0].mappedClassificationKey = "SILT (ML)";
  assert.equal(validateBoringLogLayoutJobInput(inferredDisplayText).accepted, false);

  const missingPattern = baselineJob();
  missingPattern.document.lithologyIntervals[0].patternId = "pattern-not-admitted";
  assert.equal(validateBoringLogLayoutJobInput(missingPattern).accepted, false);

  const emptyOverride = authoredJob((job) => {
    job.template.lithologyIntervalAppearanceOverrides = [
      {
        boringLogIdentity: job.document.identity.boringLogId,
        intervalId: "stratum-01",
        mappedClassificationKey: "ML",
        materialFillToken: null,
        patternId: null,
        overrideIdentity: "urn:rsrender:lithology-appearance:empty",
        overrideRevision: 1,
      },
    ];
  });
  assert.equal(validateBoringLogLayoutJobInput(emptyOverride).accepted, false);

  const wrongBaseline = authoredJob((job) => {
    job.template.lithologyIntervalAppearanceOverrides = [
      {
        boringLogIdentity: job.document.identity.boringLogId,
        intervalId: "stratum-01",
        mappedClassificationKey: "GW",
        materialFillToken: "materialGravelFill",
        patternId: null,
        overrideIdentity: "urn:rsrender:lithology-appearance:wrong-baseline",
        overrideRevision: 1,
      },
    ];
  });
  assert.equal(validateBoringLogLayoutJobInput(wrongBaseline).accepted, false);
});

test("BLD-043 appearance resolution is property-wise explicit > classification > source", () => {
  const job = authoredJob((candidate) => {
    candidate.template.visualTokens.materialRustFill = "#8b4513";
    candidate.template.lithologyClassificationAppearanceDefaults = [
      {
        mappedClassificationKey: "ML",
        materialFillToken: "materialGravelFill",
        patternId: "pattern-gravel-dot-ring",
        overrideIdentity: "urn:rsrender:lithology-default:ML",
        overrideRevision: 3,
      },
    ];
    candidate.template.lithologyIntervalAppearanceOverrides = [
      {
        boringLogIdentity: candidate.document.identity.boringLogId,
        intervalId: "stratum-01",
        mappedClassificationKey: "ML",
        materialFillToken: null,
        patternId: "pattern-silt-horizontal-dash",
        overrideIdentity: "urn:rsrender:lithology-interval:stratum-01",
        overrideRevision: 5,
      },
      {
        boringLogIdentity: candidate.document.identity.boringLogId,
        intervalId: "stratum-03",
        mappedClassificationKey: "ML",
        materialFillToken: "materialRustFill",
        patternId: null,
        overrideIdentity: "urn:rsrender:lithology-interval:stratum-03",
        overrideRevision: 7,
      },
    ];
  });
  const validated = validateBoringLogLayoutJobInput(job);
  assert.equal(validated.accepted, true, validated.code);
  const appearances = resolveBoringLogLithologyAppearances(validated.value);
  const first = appearances.find(({ intervalId }) => intervalId === "stratum-01");
  const second = appearances.find(({ intervalId }) => intervalId === "stratum-02");
  const third = appearances.find(({ intervalId }) => intervalId === "stratum-03");
  assert.deepEqual(
    {
      fill: first.materialFillToken,
      pattern: first.patternId,
      fillApplication: first.materialFillApplication.kind,
      patternApplication: first.patternApplication.kind,
    },
    {
      fill: "materialGravelFill",
      pattern: "pattern-silt-horizontal-dash",
      fillApplication: "classification-default",
      patternApplication: "interval-override",
    },
  );
  assert.deepEqual(
    {
      fill: second.materialFillToken,
      pattern: second.patternId,
      fillApplication: second.materialFillApplication.kind,
      patternApplication: second.patternApplication.kind,
    },
    {
      fill: "materialGravelFill",
      pattern: "pattern-gravel-dot-ring",
      fillApplication: "source",
      patternApplication: "source",
    },
  );
  assert.deepEqual(
    {
      fill: third.materialFillToken,
      pattern: third.patternId,
      fillApplication: third.materialFillApplication.kind,
      patternApplication: third.patternApplication.kind,
    },
    {
      fill: "materialRustFill",
      pattern: "pattern-gravel-dot-ring",
      fillApplication: "interval-override",
      patternApplication: "classification-default",
    },
  );
  assert.equal(first.materialFillProvenance.overrideIdentity, "urn:rsrender:lithology-default:ML");
  assert.equal(
    first.patternProvenance.overrideIdentity,
    "urn:rsrender:lithology-interval:stratum-01",
  );
  assert.equal(
    third.materialFillProvenance.overrideIdentity,
    "urn:rsrender:lithology-interval:stratum-03",
  );
  assert.equal(third.patternProvenance.overrideIdentity, "urn:rsrender:lithology-default:ML");
});

test("BLD-043 scene uses deterministic composite patterns and exact per-node provenance", () => {
  const job = authoredJob((candidate) => {
    candidate.template.visualTokens.materialRustFill = "#8b4513";
    candidate.template.vectorPatterns.push({
      id: "pattern-name-says-gravel-but-contract-says-line",
      kind: "line-hatch",
      foregroundToken: "selection",
      backgroundToken: "pageFill",
      spacingMpt: 7_000,
      markSizeMpt: 1_250,
      strokeWidthMpt: 750,
    });
    candidate.template.lithologyClassificationAppearanceDefaults = [
      {
        mappedClassificationKey: "ML",
        materialFillToken: "materialRustFill",
        patternId: "pattern-name-says-gravel-but-contract-says-line",
        overrideIdentity: "urn:rsrender:lithology-default:ML:rust",
        overrideRevision: 2,
      },
    ];
    candidate.template.lithologyIntervalAppearanceOverrides = [
      {
        boringLogIdentity: candidate.document.identity.boringLogId,
        intervalId: "stratum-03",
        mappedClassificationKey: "ML",
        materialFillToken: null,
        patternId: "pattern-silt-blue-dash",
        overrideIdentity: "urn:rsrender:lithology-interval:stratum-03:blue",
        overrideRevision: 4,
      },
    ];
  });
  const validated = validateBoringLogLayoutJobInput(job);
  assert.equal(validated.accepted, true, validated.code);
  const resources = resolveBoringLogLithologyPatternResources(validated.value);
  const repeated = resolveBoringLogLithologyPatternResources(validated.value);
  assert.deepEqual(resources, repeated);
  const firstAppearance = resolveBoringLogLithologyAppearances(validated.value)[0];
  const composite = resources.find(({ id }) => id === firstAppearance.patternPaintId);
  assert.ok(firstAppearance.patternPaintId.startsWith("pattern-composite-"));
  assert.equal(composite.kind, "line-hatch");
  assert.equal(composite.backgroundToken, "materialRustFill");
  assert.equal(composite.foregroundToken, "selection");
  assert.equal(composite.spacingMpt, 7_000);

  const scene = resolvedScene(validated.value);
  const page = scene.pages[0];
  const descriptionFill = page.nodes.find(
    ({ id }) => id === "node:lithology:stratum-01:description-fill",
  );
  const pattern = page.nodes.find(({ id }) => id === "node:lithology:stratum-01:pattern");
  const explicitPattern = page.nodes.find(({ id }) => id === "node:lithology:stratum-03:pattern");
  assert.equal(descriptionFill.fillToken, "materialRustFill");
  assert.equal(
    descriptionFill.provenance.overrideIdentity,
    "urn:rsrender:lithology-default:ML:rust",
  );
  assert.equal(pattern.fillToken, firstAppearance.patternPaintId);
  assert.equal(pattern.provenance.overrideIdentity, "urn:rsrender:lithology-default:ML:rust");
  assert.equal(
    explicitPattern.provenance.overrideIdentity,
    "urn:rsrender:lithology-interval:stratum-03:blue",
  );
  assert.equal(
    scene.resources.patterns.find(({ id }) => id === firstAppearance.patternPaintId).kind,
    "line-hatch",
  );
});
