import assert from "node:assert/strict";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  inspectRsLogProjectCatalog,
  maximumRsLogProjectCatalogEntries,
  rsLogProjectCatalogIngressRevision,
} from "../packages/platform-electron-main/dist/index.js";

const encoder = new TextEncoder();
const project = (overrides = {}) => ({
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  title: "Synthetic Project",
  jobNo: "SYN-001",
  clientName: "Synthetic Client",
  siteLocation: null,
  boreholeCount: 2,
  isActive: true,
  isExample: false,
  unknownVendorField: { remains: "inert" },
  ...overrides,
});

test("BLD-051 admits the authorized tenant project-list shape without retaining extras", () => {
  assert.equal(rsLogProjectCatalogIngressRevision, "bld-051-rslog-project-catalog-ingress-v1");
  const result = inspectRsLogProjectCatalog(encoder.encode(JSON.stringify([project()])));
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.match(result.responseDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(result.projects, [
    {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      title: "Synthetic Project",
      jobNumber: "SYN-001",
      clientName: "Synthetic Client",
      siteLocation: null,
      boreholeCount: 2,
      isActive: true,
      isExample: false,
    },
  ]);
  assert.equal("unknownVendorField" in result.projects[0], false);
});

test("BLD-051 project catalog fails closed on drift, duplicates, and capacity", () => {
  const cases = [
    [project({ id: "" })],
    [project({ title: null })],
    [project({ boreholeCount: -1 })],
    [project(), project()],
    { items: [project()] },
  ];
  for (const candidate of cases) {
    assert.equal(
      inspectRsLogProjectCatalog(encoder.encode(JSON.stringify(candidate))).accepted,
      false,
    );
  }
  const tooMany = Array.from({ length: maximumRsLogProjectCatalogEntries + 1 }, (_, index) =>
    project({ id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}` }),
  );
  assert.deepEqual(inspectRsLogProjectCatalog(encoder.encode(JSON.stringify(tooMany))), {
    accepted: false,
    code: "RSLOG_PROJECT_CATALOG_CAPACITY_EXCEEDED",
  });
});
