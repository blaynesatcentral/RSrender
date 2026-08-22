import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import {
  boringLogExampleDocumentRevision,
  boringLogExampleDocumentSource,
  boringLogDocumentIngressRevision,
  decodeBoringLogDocumentBundle,
  maximumBoringLogDocumentBundleBytes,
} from "../packages/platform-electron-main/dist/index.js";

test("BLD-032 decodes the production-owned runtime example through the exact layout-job contract", () => {
  const bytes = Buffer.from(boringLogExampleDocumentSource, "utf8");
  const result = decodeBoringLogDocumentBundle(bytes);
  assert.equal(boringLogDocumentIngressRevision, "bld-032-runtime-ingress-v1");
  assert.equal(boringLogExampleDocumentRevision, "bld-032-example-document-v1");
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.byteLength, bytes.byteLength);
  assert.equal(result.canonicalDigest, sha256CanonicalJson(result.layoutJob));
  assert.equal(result.layoutJob.document.evidenceClass, "synthetic-coverage-only");
  assert.equal(result.layoutJob.document.representativeClaimAllowed, false);
  assert.equal(result.layoutJob.document.publicationEligibility, "example-dataset-only");
  assert.equal(result.layoutJob.document.samples.filter(({ refusal }) => refusal).length, 2);
  assert.equal(result.layoutJob.template.physicalUnits, "mpt");
  const originalTitle = result.layoutJob.document.metadata.documentTitle;
  bytes.fill(0);
  assert.equal(result.layoutJob.document.metadata.documentTitle, originalTitle);
  assert.equal(Object.isFrozen(result.layoutJob), true);
  assert.equal(
    decodeBoringLogDocumentBundle(JSON.stringify(result.layoutJob)).canonicalDigest,
    result.canonicalDigest,
  );
});

test("BLD-032 ingress is bounded, strict, UTF-8 exact, and contract validating", () => {
  for (const input of [null, undefined, 1, {}, []]) {
    assert.equal(decodeBoringLogDocumentBundle(input).code, "BORING_LOG_DOCUMENT_INPUT_WRONG_TYPE");
  }
  assert.equal(decodeBoringLogDocumentBundle("").code, "BORING_LOG_DOCUMENT_INPUT_EMPTY");
  assert.equal(
    decodeBoringLogDocumentBundle(new Uint8Array(maximumBoringLogDocumentBundleBytes + 1)).code,
    "BORING_LOG_DOCUMENT_INPUT_TOO_LARGE",
  );
  assert.equal(
    decodeBoringLogDocumentBundle(Uint8Array.from([0xff])).code,
    "BORING_LOG_DOCUMENT_INPUT_INVALID_UTF8",
  );
  assert.equal(decodeBoringLogDocumentBundle("{").code, "BORING_LOG_DOCUMENT_INPUT_INVALID_JSON");
  assert.equal(
    decodeBoringLogDocumentBundle("{}").code,
    "BORING_LOG_DOCUMENT_INPUT_CONTRACT_REJECTED",
  );
  const stale = JSON.parse(boringLogExampleDocumentSource);
  stale.document.metadata.documentTitle = "MUTATED WITH STALE DIGEST";
  assert.equal(
    decodeBoringLogDocumentBundle(JSON.stringify(stale)).code,
    "BORING_LOG_DOCUMENT_INPUT_DIGEST_MISMATCH",
  );
});

test("BLD-032 production packaging has external runtime input and no test-support injection", async () => {
  const [packager, main, packageJson] = await Promise.all([
    readFile(new URL("../tooling/shell-package-bld026.mjs", import.meta.url), "utf8"),
    readFile(
      new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  assert.doesNotMatch(packager, /test-support/u);
  assert.doesNotMatch(packager, /__RSRENDER_BORING_LOG_LAYOUT_JOB__/u);
  assert.match(packager, /example-data/u);
  assert.match(packager, /rsrender-example-boring-log\.json/u);
  assert.match(main, /--rsrender-boring-log-input=/u);
  assert.match(main, /decodeBoringLogDocumentBundle/u);
  assert.match(main, /fstatSync/u);
  assert.match(main, /maximumBoringLogDocumentBundleBytes/u);
  assert.match(main, /BORING_LOG_RUNTIME_INPUT_UNAVAILABLE/u);
  assert.doesNotMatch(main, /__RSRENDER_BORING_LOG_LAYOUT_JOB__/u);
  assert.equal(packageJson.scripts["shell:package"], "node ./tooling/shell-package-bld028.mjs");
  assert.equal(
    packageJson.scripts["shell:test:packaged"],
    "node ./tooling/shell-run-bld028.mjs --record",
  );
  assert.doesNotMatch(
    boringLogExampleDocumentSource,
    /(?:\.png|\.jpe?g|data:image|backgroundImage)/iu,
  );
});
