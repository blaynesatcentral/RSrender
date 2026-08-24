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

test("BLD-045 bounded ingress classifies valid JSON without inventing an RSLog schema", () => {
  const source = '{"testHoles":[{"name":"SYNTHETIC-01"}],"project":{"title":"Synthetic"}}';
  const inspected = inspectRsLogProjectDataJson(source);
  assert.equal(rsLogProjectDataIngressRevision, "bld-045-rslog-project-data-ingress-v1");
  assert.equal(inspected.accepted, false);
  assert.equal(inspected.code, "RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED");
  assert.equal(inspected.byteLength, new TextEncoder().encode(source).byteLength);
  assert.match(inspected.sourceDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(inspected.topLevelKind, "object");
  assert.deepEqual(inspected.topLevelKeys, ["project", "testHoles"]);
  assert.equal("layoutJobs" in inspected, false);
  assert.equal("sourceSnapshot" in inspected, false);
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

test("BLD-045 Studio distinguishes RSLog JSON Import from RSrender project Open", async () => {
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
  assert.match(main, /RSLog Project Data JSON.+schema has not been admitted/su);
  assert.match(main, /current project was left unchanged/u);
  assert.doesNotMatch(main, /inspectRsLogProjectDataJson[\s\S]{0,500}layoutJobs/u);
});
