import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  applyBld007DriftFixture,
  BLD007_POLICY,
  canonicalJson,
  enforceDependencyPolicy,
  loadBld007Inputs,
} from "../tooling/dependency-enforcement-bld007.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixtureDefinitions = JSON.parse(
  await readFile(path.join(root, "tests/fixtures/bld-007-drift-fixtures.json"), "utf8"),
);
const cleanInput = await loadBld007Inputs(root);

test("BLD-007 exact BLD-001 admission produces deterministic complete inventories", () => {
  assert.equal(process.version, BLD007_POLICY.nodeVersion);
  const first = enforceDependencyPolicy(cleanInput);
  const second = enforceDependencyPolicy(cleanInput);
  assert.equal(first.result, "PASS", JSON.stringify(first.diagnostics));
  assert.deepEqual(first.diagnostics, []);
  assert.equal(canonicalJson(first.artifacts), canonicalJson(second.artifacts));
  assert.deepEqual(first.artifactDigests, second.artifactDigests);
  assert.deepEqual(first.artifactDigests, cleanInput.topologyApproval.expectedArtifactDigests);
  assert.equal(first.inventories.custody.counts.admittedIdentities, 156);
  assert.equal(first.inventories.spdx.spdxVersion, "SPDX-2.3");
  assert.equal(first.inventories.spdx.packages.length, 168);
  assert.ok(first.inventories.custody.counts.dependencyEdges > 0);
  assert.ok(
    first.inventories.custody.graph.some(
      (edge) => edge.from === "@rsrender/domain@0.0.0" && edge.to === "@rsrender/contracts@0.0.0",
    ),
  );
  assert.equal(first.inventories.assets.assets.length, 0);
  assert.match(first.inventories.notices, /LICENSES\.chromium\.html/u);
  assert.match(first.inventories.notices, /not upstream notice evidence/u);
  assert.ok(
    first.inventories.custody.packages.every((entry) => entry.license.concluded === "NOASSERTION"),
  );
});

test("BLD-007 qualifying repetitions reload inputs in fresh pinned processes", () => {
  const script = path.join(root, "tooling", "enforce-dependency-admission-bld007.mjs");
  const runs = [0, 1].map(() =>
    spawnSync(process.execPath, [script, "--snapshot"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }),
  );
  assert.ok(
    runs.every((run) => run.status === 0),
    JSON.stringify(runs.map((run) => run.stderr)),
  );
  assert.deepEqual(JSON.parse(runs[0].stdout), JSON.parse(runs[1].stdout));
});

test("BLD-007 sanitizes input and JSON failures without a host transcript", () => {
  const script = path.join(root, "tooling", "enforce-dependency-admission-bld007.mjs");
  const run = spawnSync(process.execPath, [script, "--snapshot"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, BLD007_TEST_INPUT_FAILURE: "1" },
  });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /BLD007_SANITIZED_INPUT_FAILURE/u);
  assert.doesNotMatch(`${run.stdout}${run.stderr}`, /[A-Za-z]:[\\/]|BlayneSandau|Error:/u);
});

for (const fixture of fixtureDefinitions) {
  test(`BLD-007 fails closed for ${fixture.id}`, () => {
    const result = enforceDependencyPolicy(applyBld007DriftFixture(cleanInput, fixture.id));
    assert.equal(result.result, "FAIL");
    assert.ok(
      result.diagnostics.some((diagnostic) => diagnostic.code === fixture.expectedCode),
      JSON.stringify(result.diagnostics),
    );
  });
}

test("BLD-007 diagnostics and outputs retain no host identity, absolute path, or authority grant", () => {
  const result = enforceDependencyPolicy(cleanInput);
  const serialized = [canonicalJson(result.diagnostics), ...Object.values(result.artifacts)].join(
    "\n",
  );
  assert.doesNotMatch(serialized, /(?:^|["'\s])[A-Z]:[\\/]/u);
  assert.doesNotMatch(
    serialized,
    /"(?:hostname|username|userprofile|credential|authorization)"\s*:|bearer\s+[A-Za-z0-9._-]+/iu,
  );
  assert.match(serialized, /does not create an admission/iu);
  assert.doesNotMatch(serialized, /"(?:APPROVED|ADMITTED)"\s*:\s*true/iu);
});
