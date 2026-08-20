import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { encodeSourceSnapshot } from "../../packages/domain/dist/index.js";
import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import {
  bld015FixtureRevision,
  bld015GeneratorRevision,
  bld015IterationsPerSeed,
  bld015OracleRevision,
  bld015PropertySeeds,
  bld015Snapshot,
} from "./bld-015-fixtures.mjs";
import { runBld015PropertyModel } from "./bld-015-property-model.mjs";

const expectedNodeExecutableDigest =
  "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582";
const nodeExecutableDigest = `sha256:${createHash("sha256")
  .update(readFileSync(process.execPath))
  .digest("hex")}`;
if (process.version !== "v24.18.1" || nodeExecutableDigest !== expectedNodeExecutableDigest) {
  throw new Error("BLD-015 requires the exact admitted pinned Node executable");
}

const fixedSnapshot = encodeSourceSnapshot(bld015Snapshot);
if (!fixedSnapshot.accepted) throw new Error(fixedSnapshot.code);

const repetitions = [];
for (let repetition = 1; repetition <= 2; repetition += 1) {
  const propertyRuns = bld015PropertySeeds.map((seed) =>
    runBld015PropertyModel(seed, bld015IterationsPerSeed),
  );
  const normalized = {
    fixtureRevision: bld015FixtureRevision,
    oracleRevision: bld015OracleRevision,
    generatorRevision: bld015GeneratorRevision,
    snapshotIdentity: bld015Snapshot.snapshotIdentity,
    snapshotLogicalDigest: bld015Snapshot.logicalDigest,
    snapshotEncodingDigest: fixedSnapshot.digest,
    blockedCapabilityCount: bld015Snapshot.blockedCapabilities.length,
    propertyRuns,
    failures: propertyRuns.flatMap((run) => run.failures),
    privacy: {
      repositorySafeSyntheticOnly: true,
      credentialsPresent: false,
      hostUserPathPresent: false,
    },
    nonclaims: [
      "no-vendor-wire-dto-admitted",
      "no-source-candidate-or-refresh-acceptance-implemented",
      "no-render-dataset-produced",
      "no-positive-evidence-blocked-capability-mapped",
      "extension-limits-are-fail-closed-safety-limits-not-workload-claims",
    ],
  };
  repetitions.push({
    repetition,
    ...normalized,
    normalizedDigest: sha256CanonicalJson(normalized),
  });
}

const environment = new Intl.DateTimeFormat().resolvedOptions();
const normalizedRepetitions = repetitions.map((run) => ({
  fixtureRevision: run.fixtureRevision,
  oracleRevision: run.oracleRevision,
  generatorRevision: run.generatorRevision,
  snapshotIdentity: run.snapshotIdentity,
  snapshotLogicalDigest: run.snapshotLogicalDigest,
  snapshotEncodingDigest: run.snapshotEncodingDigest,
  blockedCapabilityCount: run.blockedCapabilityCount,
  propertyRuns: run.propertyRuns,
  failures: run.failures,
  privacy: run.privacy,
  nonclaims: run.nonclaims,
  normalizedDigest: run.normalizedDigest,
}));
const output = {
  result: repetitions.every((run) => run.failures.length === 0) ? "PASS" : "FAIL",
  nodeExecutableIdentity: "node@24.18.1",
  nodeExecutableDigest,
  locale: environment.locale,
  timeZone: environment.timeZone,
  repetitions,
  identicalRepetitions: new Set(repetitions.map((run) => run.normalizedDigest)).size === 1,
  processTranscriptDigest: sha256CanonicalJson(normalizedRepetitions),
};

process.stdout.write(`${JSON.stringify(output)}\n`);
