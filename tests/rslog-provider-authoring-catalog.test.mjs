import assert from "node:assert/strict";
import test from "node:test";

import {
  createRsLogProviderAuthoringBinding,
  providerAuthoringCatalogSchemaVersion,
  resolveRsLogProviderAuthoringField,
  rsLogProviderAuthoringCatalog,
  rsLogProviderAuthoringCatalogRevision,
} from "../packages/source-contract/dist/index.js";

function request(overrides = {}) {
  return {
    contractVersion: 1,
    providerId: "rslog",
    catalogRevision: rsLogProviderAuthoringCatalogRevision,
    fieldId: "rslog.field-test.n-value",
    sourcePath: "exploration.fieldTests[].nValue",
    targetRole: "data-track-polyline",
    ...overrides,
  };
}

test("the RSLog provider-authoring catalog is value-free, typed, deterministic, and immutable", () => {
  assert.equal(rsLogProviderAuthoringCatalog.schemaVersion, providerAuthoringCatalogSchemaVersion);
  assert.equal(rsLogProviderAuthoringCatalog.providerId, "rslog");
  assert.ok(rsLogProviderAuthoringCatalog.fields.length >= 10);
  assert.equal(Object.isFrozen(rsLogProviderAuthoringCatalog), true);
  assert.equal(Object.isFrozen(rsLogProviderAuthoringCatalog.fields), true);

  const ids = rsLogProviderAuthoringCatalog.fields.map(({ fieldId }) => fieldId);
  const paths = rsLogProviderAuthoringCatalog.fields.map(({ binding }) => binding.sourcePath);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(paths).size, paths.length);

  for (const field of rsLogProviderAuthoringCatalog.fields) {
    assert.equal(Object.isFrozen(field), true);
    assert.equal(Object.isFrozen(field.binding), true);
    assert.equal(Object.isFrozen(field.binding.depth), true);
    assert.equal(Object.isFrozen(field.supportedTargetRoles), true);
    assert.equal(field.availability.collectionRequirement, "required-when-bound");
    assert.ok(["available", "unavailable"].includes(field.availability.state));
    assert.equal(field.provenance.providerId, "rslog");
    assert.equal(field.provenance.sourceOriginalRetained, true);
    assert.equal(field.provenance.effectiveOverrideSeparate, true);
    assert.equal("value" in field, false);
  }
});

test("exact admitted paths resolve and produce a target-compatible renderer-neutral binding", () => {
  const resolved = resolveRsLogProviderAuthoringField("exploration.fieldTests[].nValue");
  assert.equal(resolved.accepted, true);
  assert.equal(resolved.field.fieldId, "rslog.field-test.n-value");
  assert.equal(resolved.field.valueType, "number");
  assert.equal(resolved.field.unit, "blows/ft");

  const created = createRsLogProviderAuthoringBinding(request());
  assert.equal(created.accepted, true, JSON.stringify(created));
  assert.deepEqual(created.binding, {
    contractVersion: 1,
    providerId: "rslog",
    catalogRevision: rsLogProviderAuthoringCatalogRevision,
    fieldId: "rslog.field-test.n-value",
    targetRole: "data-track-polyline",
    root: "render-dataset",
    recordScope: "field-test",
    sourcePath: "exploration.fieldTests[].nValue",
    cardinality: "one-per-record",
    valueType: "number",
    unit: "blows/ft",
    depth: {
      kind: "point",
      fromPath: "exploration.fieldTests[].fromDepth",
      toPath: null,
    },
    provenance: {
      sourceClass: "provider-source",
      providerId: "rslog",
      mappingRevision: rsLogProviderAuthoringCatalogRevision,
      sourceOriginalRetained: true,
      effectiveOverrideSeparate: true,
    },
  });
  assert.equal(Object.isFrozen(created.binding), true);
});

test("unknown, extension, wire, credential, and hatch paths fail closed", () => {
  for (const sourcePath of [
    "exploration.strata[].vendorHatchBytes",
    "$.Boreholes[].Samples[].NValue",
    "exploration.extensions[].mysteryField",
    "session.password",
    "https://example.invalid/field",
  ]) {
    assert.deepEqual(resolveRsLogProviderAuthoringField(sourcePath), {
      accepted: false,
      code: "PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED",
    });
    assert.equal(
      createRsLogProviderAuthoringBinding(request({ sourcePath })).code,
      "PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED",
    );
  }
});

test("standard sample choices remain discoverable while evidence-blocked mappings stay unavailable", () => {
  for (const sourcePath of [
    "exploration.samples[].blowCounts",
    "exploration.samples[].nValue",
    "exploration.samples[].n60",
    "exploration.samples[].refusal",
    "exploration.samples[].recoveryPercent",
    "exploration.samples[].moistureContent",
    "exploration.samples[].moistureW",
    "exploration.samples[].liquidLimit",
    "exploration.samples[].plasticLimit",
    "exploration.samples[].plasticIndex",
  ]) {
    assert.equal(resolveRsLogProviderAuthoringField(sourcePath).accepted, true, sourcePath);
  }

  for (const sourcePath of [
    "exploration.samples[].blowCounts",
    "exploration.samples[].moistureContent",
    "exploration.samples[].moistureW",
    "exploration.samples[].liquidLimit",
    "exploration.samples[].plasticLimit",
    "exploration.samples[].plasticIndex",
  ]) {
    const resolved = resolveRsLogProviderAuthoringField(sourcePath);
    assert.equal(resolved.accepted, true);
    assert.deepEqual(resolved.field.availability, {
      state: "unavailable",
      admission: "mapping-evidence-required",
      collectionRequirement: "required-when-bound",
      diagnosticCode: "PROVIDER_AUTHORING_SOURCE_MAPPING_UNADMITTED",
      reason: resolved.field.availability.reason,
    });
    assert.ok(resolved.field.availability.reason.length > 20);
    assert.equal(
      createRsLogProviderAuthoringBinding(
        request({
          fieldId: resolved.field.fieldId,
          sourcePath,
          targetRole: resolved.field.supportedTargetRoles[0],
        }),
      ).code,
      "PROVIDER_AUTHORING_FIELD_UNAVAILABLE",
    );
  }
});

test("field identity, exact path, target role, provider, revision, and request shape cannot drift", () => {
  assert.equal(
    createRsLogProviderAuthoringBinding(request({ fieldId: "rslog.not-admitted" })).code,
    "PROVIDER_AUTHORING_FIELD_UNADMITTED",
  );
  assert.equal(
    createRsLogProviderAuthoringBinding(
      request({
        fieldId: "rslog.field-test.n60",
        sourcePath: "exploration.fieldTests[].nValue",
      }),
    ).code,
    "PROVIDER_AUTHORING_FIELD_PATH_MISMATCH",
  );
  assert.equal(
    createRsLogProviderAuthoringBinding(request({ targetRole: "remarks-column" })).code,
    "PROVIDER_AUTHORING_TARGET_ROLE_UNSUPPORTED",
  );
  assert.equal(
    createRsLogProviderAuthoringBinding(request({ providerId: "unknown" })).code,
    "PROVIDER_AUTHORING_PROVIDER_UNSUPPORTED",
  );
  assert.equal(
    createRsLogProviderAuthoringBinding(request({ catalogRevision: "future" })).code,
    "PROVIDER_AUTHORING_CATALOG_REVISION_UNSUPPORTED",
  );
  assert.equal(
    createRsLogProviderAuthoringBinding({ ...request(), extra: true }).code,
    "PROVIDER_AUTHORING_BINDING_EXTRA_FIELD",
  );
  const missing = request();
  delete missing.sourcePath;
  assert.equal(
    createRsLogProviderAuthoringBinding(missing).code,
    "PROVIDER_AUTHORING_BINDING_MISSING_FIELD",
  );
  const getter = request();
  Object.defineProperty(getter, "fieldId", {
    enumerable: true,
    get: () => "rslog.field-test.n-value",
  });
  assert.equal(
    createRsLogProviderAuthoringBinding(getter).code,
    "PROVIDER_AUTHORING_BINDING_MISSING_FIELD",
  );
});
