import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("BLD-043 Studio exposes exact stratum appearance Properties and project default commands", async () => {
  const [route, entry] = await Promise.all([
    source("packages/renderer-ui/src/boring-log-studio-route.ts"),
    source("packages/renderer-ui/src/boring-log-studio-entry.ts"),
  ]);

  for (const id of [
    "lithology-appearance-properties",
    "lithology-classification",
    "lithology-mapped-key",
    "lithology-fill-color",
    "lithology-pattern",
    "apply-lithology-interval",
    "set-lithology-default",
    "lithology-fill-scope",
    "lithology-pattern-scope",
  ]) {
    assert.match(route, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(route, /Set as default for mapped soil type/u);
  assert.match(entry, /setLithologyAppearance/u);
  assert.match(entry, /applyScope: "interval" \| "classification-default"/u);
  assert.match(entry, /\^lithology:\(\[\^:\]\+\)/u);
  assert.match(entry, /materialFillColor/u);
  assert.match(entry, /patternId: authoredPatternId/u);
  assert.match(entry, /explicit interval values remain higher precedence/iu);
});

test("BLD-043 main routes interval and all-boring defaults through existing history authorities", async () => {
  const main = await source("packages/platform-electron-main/src/semantic-editor-main.ts");
  const application = await source(
    "packages/application/src/in-memory-override-render-dataset-service.ts",
  );

  assert.match(main, /authorLithologyAppearance/u);
  assert.match(main, /commitEmbeddedTemplateReplacement\(source\.service/u);
  assert.match(main, /operation: "lithology-interval-appearance"/u);
  assert.match(main, /commitEmbeddedTemplateReplacementBatch\(source\.service/u);
  assert.match(main, /operation: "lithology-classification-default"/u);
  assert.match(main, /for \(const candidateDocument of projectDocuments\)/u);
  assert.match(main, /retainedLayoutJobs\.set/u);
  assert.match(main, /BORING_LOG_STUDIO_SET_LITHOLOGY_APPEARANCE_CHANNEL/u);
  assert.match(application, /"lithology-interval-appearance"/u);
  assert.match(application, /Set lithology interval appearance/u);
});
