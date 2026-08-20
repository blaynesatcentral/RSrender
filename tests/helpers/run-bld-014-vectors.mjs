import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { encodeDiagnosticFact, encodeDiagnosticFactSet } from "../../packages/domain/dist/index.js";
import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

import {
  bld014BoundaryFacts,
  bld014FixtureRevision,
  bld014GeneratorRevision,
  bld014IterationsPerSeed,
  bld014OracleRevision,
  bld014PropertySeeds,
} from "./bld-014-fixtures.mjs";
import { runBld014PropertyModel } from "./bld-014-property-model.mjs";

const expectedNodeExecutableDigest =
  "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582";
const nodeExecutableDigest = `sha256:${createHash("sha256")
  .update(readFileSync(process.execPath))
  .digest("hex")}`;
if (process.version !== "v24.18.1" || nodeExecutableDigest !== expectedNodeExecutableDigest) {
  throw new Error("BLD-014 requires the exact admitted pinned Node executable");
}

const fixedSet = encodeDiagnosticFactSet([...bld014BoundaryFacts].reverse());
if (!fixedSet.accepted) throw new Error(fixedSet.code);

const fixedFactDigests = bld014BoundaryFacts.map((fact) => {
  const encoded = encodeDiagnosticFact(fact);
  if (!encoded.accepted) throw new Error(encoded.code);
  return encoded.digest;
});

const repetitions = [];
for (let repetition = 1; repetition <= 2; repetition += 1) {
  const propertyRuns = bld014PropertySeeds.map((seed) =>
    runBld014PropertyModel(seed, bld014IterationsPerSeed),
  );
  const normalized = {
    fixtureRevision: bld014FixtureRevision,
    oracleRevision: bld014OracleRevision,
    generatorRevision: bld014GeneratorRevision,
    fixedSetDigest: fixedSet.digest,
    fixedFactDigests,
    propertyRuns,
    failures: propertyRuns.flatMap((run) => run.failures),
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
  fixedSetDigest: run.fixedSetDigest,
  fixedFactDigests: run.fixedFactDigests,
  propertyRuns: run.propertyRuns,
  failures: run.failures,
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
