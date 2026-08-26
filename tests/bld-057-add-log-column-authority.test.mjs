import assert from "node:assert/strict";
import test from "node:test";

import {
  addProviderBoundBoringLogColumn,
  boringLogAddColumnRevision,
  boringLogDefaultColumnMinimumWidthMpt,
  boringLogMaximumColumnCount,
} from "@rsrender/scene";
import {
  createRsLogProviderAuthoringBinding,
  rsLogProviderAuthoringCatalog,
  rsLogProviderAuthoringCatalogRevision,
} from "@rsrender/source-contract";
import { boringLogMvpTemplate } from "@rsrender/test-support";

function requireBinding(fieldId, sourcePath, targetRole) {
  const result = createRsLogProviderAuthoringBinding({
    contractVersion: 1,
    providerId: "rslog",
    catalogRevision: rsLogProviderAuthoringCatalogRevision,
    fieldId,
    sourcePath,
    targetRole,
  });
  assert.equal(result.accepted, true);
  return result.binding;
}

function constraints(template, pinnedColumnId = null) {
  return template.columns.map((column) => ({
    columnId: column.id,
    minimumWidthMpt: Math.min(column.widthMpt, boringLogDefaultColumnMinimumWidthMpt(column.role)),
    widthPinned: column.id === pinnedColumnId,
  }));
}

function request(overrides = {}) {
  const template = overrides.template ?? boringLogMvpTemplate;
  return {
    template,
    providerCatalog: rsLogProviderAuthoringCatalog,
    providerBinding:
      overrides.providerBinding ??
      requireBinding("rslog.sample.n60", "exploration.samples[].n60", "numeric-value-column"),
    column: {
      id: "column-provider-n60",
      heading: "N60",
      styleId: "style-body",
      widthMpt: 20_000,
      minimumWidthMpt: 12_000,
      ...overrides.column,
    },
    placement: {
      referenceColumnId: "column-n-value",
      side: "after",
      resizeDonorColumnId: "column-description",
      ...overrides.placement,
    },
    constraints: overrides.constraints ?? constraints(template),
  };
}

test("BLD-057 adds one exact provider-bound Log Column without changing the occupied span", () => {
  assert.equal(boringLogAddColumnRevision, "bld-057-add-log-column-v1");
  const before = structuredClone(boringLogMvpTemplate);
  const result = addProviderBoundBoringLogColumn(request());
  assert.equal(result.accepted, true);
  assert.deepEqual(boringLogMvpTemplate, before);
  assert.equal(result.template.templateRevision, boringLogMvpTemplate.templateRevision + 1);
  assert.equal(result.addedColumn.id, "column-provider-n60");
  assert.equal(result.addedColumn.role, "numeric-value-column");
  assert.equal(result.addedColumn.widthMpt, 20_000);
  assert.equal(result.insertionIndex, 8);
  assert.equal(result.conservedLeftMpt, 24_000);
  assert.equal(result.conservedRightMpt, 588_000);
  assert.equal(
    result.template.columns.find(({ id }) => id === "column-description").widthMpt,
    166_000,
  );
  assert.equal(
    result.template.columns.at(-1).xMpt + result.template.columns.at(-1).widthMpt,
    588_000,
  );
  const depthBody = result.template.hierarchy.children.find(
    (child) => typeof child !== "string" && child.id === "region-depth-body",
  );
  const addedHierarchy = depthBody.children[8];
  assert.equal(typeof addedHierarchy, "object");
  assert.deepEqual(addedHierarchy, {
    id: "column-provider-n60",
    role: "log-column",
    children: [
      {
        id: "column-provider-n60:provider-value",
        role: "numeric-value-column",
        children: [],
      },
    ],
  });
  assert.deepEqual(result.providerBinding, {
    elementId: "column-provider-n60:provider-value",
    ...requireBinding("rslog.sample.n60", "exploration.samples[].n60", "numeric-value-column"),
  });
  assert.deepEqual(result.template.providerAuthoringBindings, [result.providerBinding]);
  assert.deepEqual(
    result.template.bindings.find(
      ({ elementId }) => elementId === "column-provider-n60:provider-value",
    ),
    {
      elementId: "column-provider-n60:provider-value",
      path: "exploration.samples[].n60",
      styleId: "style-body",
    },
  );
  assert.deepEqual(addProviderBoundBoringLogColumn(request()), result);
});

test("BLD-057 rejects unavailable, forged, and Data Layer-only binding choices", () => {
  const field = rsLogProviderAuthoringCatalog.fields.find(
    ({ fieldId }) => fieldId === "rslog.sample.moisture-content",
  );
  const unavailableBinding = {
    contractVersion: 1,
    providerId: "rslog",
    catalogRevision: rsLogProviderAuthoringCatalogRevision,
    fieldId: field.fieldId,
    targetRole: "numeric-value-column",
    root: field.binding.root,
    recordScope: field.binding.recordScope,
    sourcePath: field.binding.sourcePath,
    cardinality: field.binding.cardinality,
    valueType: field.valueType,
    unit: field.unit,
    depth: field.binding.depth,
    provenance: field.provenance,
  };
  assert.deepEqual(
    addProviderBoundBoringLogColumn(request({ providerBinding: unavailableBinding })),
    { accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" },
  );
  const admitted = requireBinding(
    "rslog.sample.n60",
    "exploration.samples[].n60",
    "numeric-value-column",
  );
  assert.deepEqual(
    addProviderBoundBoringLogColumn(
      request({
        providerBinding: { ...admitted, sourcePath: "exploration.comments[].description" },
      }),
    ),
    { accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" },
  );
  assert.deepEqual(
    addProviderBoundBoringLogColumn(
      request({
        providerBinding: requireBinding(
          "rslog.sample.n60",
          "exploration.samples[].n60",
          "data-track-polyline",
        ),
      }),
    ),
    { accepted: false, code: "ADD_COLUMN_TARGET_ROLE_UNSUPPORTED" },
  );
});

test("BLD-057 fails closed on identity, placement, hierarchy, pin, and width collisions", () => {
  assert.deepEqual(addProviderBoundBoringLogColumn(request({ column: { id: "column-n-value" } })), {
    accepted: false,
    code: "ADD_COLUMN_IDENTITY_COLLISION",
  });
  assert.deepEqual(
    addProviderBoundBoringLogColumn(
      request({ placement: { referenceColumnId: "column-missing" } }),
    ),
    { accepted: false, code: "ADD_COLUMN_PLACEMENT_INVALID" },
  );
  assert.deepEqual(
    addProviderBoundBoringLogColumn(
      request({ constraints: constraints(boringLogMvpTemplate, "column-description") }),
    ),
    { accepted: false, code: "ADD_COLUMN_RESIZE_PINNED" },
  );
  assert.deepEqual(addProviderBoundBoringLogColumn(request({ column: { widthMpt: 110_000 } })), {
    accepted: false,
    code: "ADD_COLUMN_CONSTRAINT_INVALID",
  });
  const badHierarchy = structuredClone(boringLogMvpTemplate);
  const depthBody = badHierarchy.hierarchy.children.find(
    (child) => typeof child !== "string" && child.id === "region-depth-body",
  );
  depthBody.children.reverse();
  assert.deepEqual(addProviderBoundBoringLogColumn(request({ template: badHierarchy })), {
    accepted: false,
    code: "ADD_COLUMN_HIERARCHY_INVALID",
  });
});

test("BLD-057 enforces the fixed renderer-neutral Log Column capacity", () => {
  assert.equal(boringLogMaximumColumnCount, 64);
  const template = structuredClone(boringLogMvpTemplate);
  const original = new Map(template.columns.map((column) => [column.id, column]));
  const ids = [
    ...template.columns.map(({ id }) => id),
    ...Array.from({ length: 54 }, (_, index) => `column-capacity-${index + 1}`),
  ];
  let xMpt = 24_000;
  template.columns = ids.map((id, index) => {
    const widthMpt = index === ids.length - 1 ? 60_000 : 8_000;
    const source = original.get(id);
    const column = {
      id,
      role: source?.role ?? "point-text-column",
      xMpt,
      widthMpt,
      ...(source?.heading === undefined ? {} : { heading: source.heading }),
    };
    xMpt += widthMpt;
    return column;
  });
  const depthBody = template.hierarchy.children.find(
    (child) => typeof child !== "string" && child.id === "region-depth-body",
  );
  depthBody.children = ids;
  assert.deepEqual(
    addProviderBoundBoringLogColumn(request({ template, constraints: constraints(template) })),
    { accepted: false, code: "ADD_COLUMN_CAPACITY_EXHAUSTED" },
  );
});
