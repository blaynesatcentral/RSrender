import assert from "node:assert/strict";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  inspectRsLogJsonShape,
  rsLogJsonShapeLedgerRevision,
} from "../packages/platform-electron-main/dist/index.js";

test("BLD-051 JSON shape ledger records structure, types, nullability, counts, and no source values", () => {
  const source = JSON.stringify([
    { Id: "project-secret-1", Title: "Client Alpha", JobNo: null, Tags: ["one", "two"] },
    { Id: "project-secret-2", Title: "Client Beta", JobNo: "private-42", Tags: [] },
  ]);
  const result = inspectRsLogJsonShape(new TextEncoder().encode(source));
  assert.equal(rsLogJsonShapeLedgerRevision, "bld-051-json-shape-ledger-v1");
  assert.equal(result.inspected, true);
  assert.equal(result.ledger.admitted, false);
  assert.equal(result.ledger.rootKind, "array");
  assert.match(result.ledger.sourceDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(result.ledger.shapeDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(
    result.ledger.paths.find(({ path }) => path === "/[]/JobNo"),
    {
      path: "/[]/JobNo",
      kinds: ["null", "string"],
      observations: 2,
      nulls: 1,
      minimumArrayLength: null,
      maximumArrayLength: null,
    },
  );
  assert.deepEqual(
    result.ledger.paths.find(({ path }) => path === "/[]/Tags"),
    {
      path: "/[]/Tags",
      kinds: ["array"],
      observations: 2,
      nulls: 0,
      minimumArrayLength: 0,
      maximumArrayLength: 2,
    },
  );
  const ledgerText = JSON.stringify(result.ledger);
  for (const sourceValue of [
    "project-secret-1",
    "project-secret-2",
    "Client Alpha",
    "Client Beta",
    "private-42",
    "one",
    "two",
  ]) {
    assert.equal(ledgerText.includes(sourceValue), false);
  }
});

test("BLD-051 JSON shape ledger rejects malformed, hostile, and over-depth input explicitly", () => {
  assert.deepEqual(inspectRsLogJsonShape(null), {
    inspected: false,
    code: "RSLOG_SCHEMA_LEDGER_INPUT_INVALID",
  });
  assert.equal(
    inspectRsLogJsonShape(new Uint8Array([0xff])).code,
    "RSLOG_SCHEMA_LEDGER_UTF8_INVALID",
  );
  assert.equal(
    inspectRsLogJsonShape(new TextEncoder().encode("{")).code,
    "RSLOG_SCHEMA_LEDGER_JSON_INVALID",
  );
  let nested = 1;
  for (let index = 0; index < 13; index += 1) nested = [nested];
  assert.equal(
    inspectRsLogJsonShape(new TextEncoder().encode(JSON.stringify(nested))).code,
    "RSLOG_SCHEMA_LEDGER_LIMIT_EXCEEDED",
  );
});
