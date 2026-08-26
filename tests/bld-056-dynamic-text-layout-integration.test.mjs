import assert from "node:assert/strict";
import test from "node:test";

import { dynamicTextCatalogSchemaVersion } from "../packages/contracts/dist/index.js";
import { measureBoringLogTextRequests } from "../packages/layout-host/dist/index.js";
import {
  applyBoringLogTextMeasurements,
  prepareBoringLogLayout,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const projectNameProvenance = Object.freeze({
  provenanceClass: "example",
  exampleDatasetIdentity: "example:dynamic-text-layout",
  fieldIdentity: "project.name",
});

function catalog() {
  return {
    schemaVersion: dynamicTextCatalogSchemaVersion,
    definitions: [
      {
        identifier: "project_name",
        label: "Project name",
        description: "Current Source Project display name",
        category: "Project",
        valueKind: "text",
        missingValuePolicy: "error",
        providerMappingKey: "rslog.project.name",
        order: 10,
      },
    ],
  };
}

function job(values) {
  const document = structuredClone(boringLogMvpFixture);
  document.metadata.documentTitle = "LOG FOR @project_name";
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-056-dynamic-text-layout@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document,
    template: structuredClone(boringLogMvpTemplate),
    dynamicText: {
      catalog: catalog(),
      values,
      elementIds: ["node:header-title"],
    },
  };
}

function projectNameValue() {
  return {
    identifier: "project_name",
    original: { text: "Riverside", provenance: projectNameProvenance },
    effective: { text: "Riverside", provenance: projectNameProvenance },
  };
}

test("BLD-056 resolves Dynamic Text before Layout Host measurement and preserves token provenance", () => {
  const prepared = prepareBoringLogLayout(job([projectNameValue()]));
  assert.equal(prepared.accepted, true, JSON.stringify(prepared));
  const request = prepared.value.textRequests.find(
    ({ measurementId }) => measurementId === "measure:node:header-title",
  );
  assert.equal(request.text, "LOG FOR Riverside");
  assert.equal(request.dynamicTextResolution.sourceText, "LOG FOR @project_name");
  assert.equal(request.dynamicTextResolution.measurementText, request.text);
  assert.deepEqual(
    request.dynamicTextResolution.occurrences.map(
      ({ identifier, sourceStartUtf16, sourceEndUtf16, resolvedStartUtf16, resolvedEndUtf16 }) => [
        identifier,
        sourceStartUtf16,
        sourceEndUtf16,
        resolvedStartUtf16,
        resolvedEndUtf16,
      ],
    ),
    [["project_name", 8, 21, 8, 17]],
  );
  assert.equal(
    request.dynamicTextResolution.occurrences[0].effective.provenance.fieldIdentity,
    "project.name",
  );
  assert.deepEqual(prepared.value.pagePlan.diagnostics, []);

  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const scene = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(scene.accepted, true, JSON.stringify(scene));
  assert.equal(
    scene.value.pages[0].nodes.find(({ id }) => id === "node:header-title").content,
    "LOG FOR Riverside",
  );
  assert.deepEqual(scene.value.diagnostics, []);
});

test("BLD-056 carries missing required bindings as publication-blocking scene diagnostics", () => {
  const prepared = prepareBoringLogLayout(job([]));
  assert.equal(prepared.accepted, true, JSON.stringify(prepared));
  const request = prepared.value.textRequests.find(
    ({ measurementId }) => measurementId === "measure:node:header-title",
  );
  assert.equal(request.text, "LOG FOR @project_name");
  assert.equal(request.dynamicTextResolution.occurrences[0].substitution, "unresolved-token");
  assert.equal(prepared.value.pagePlan.overflow, "clipped-with-diagnostic");
  assert.deepEqual(
    prepared.value.pagePlan.diagnostics.map(({ code, severity, semanticId }) => [
      code,
      severity,
      semanticId,
    ]),
    [["BINDING_TARGET_MISSING", "error", "header-title"]],
  );

  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const scene = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(scene.accepted, true, JSON.stringify(scene));
  assert.ok(
    scene.value.diagnostics.some(
      ({ code, severity, semanticId }) =>
        code === "BINDING_TARGET_MISSING" && severity === "error" && semanticId === "header-title",
    ),
  );
  const gated = applyBoringLogTextMeasurements(scene.value, measured.results);
  assert.equal(gated.accepted, true, JSON.stringify(gated));
  assert.equal(gated.scene.pagePlan.overflow, "clipped-with-diagnostic");
  assert.ok(
    gated.scene.diagnostics.some(
      ({ code, severity }) => code === "BINDING_TARGET_MISSING" && severity === "error",
    ),
  );
});

test("BLD-056 Layout Host rejects detached Dynamic Text metadata that does not match measured text", () => {
  const prepared = prepareBoringLogLayout(job([projectNameValue()]));
  assert.equal(prepared.accepted, true);
  const requests = structuredClone(prepared.value.textRequests);
  const request = requests.find(
    ({ measurementId }) => measurementId === "measure:node:header-title",
  );
  request.dynamicTextResolution.measurementText = "tampered";
  assert.deepEqual(measureBoringLogTextRequests(requests), {
    accepted: false,
    code: "BORING_LOG_TEXT_REQUESTS_INVALID",
  });
});
