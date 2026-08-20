import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);
const executions = await Promise.all(
  Array.from({ length: 3 }, async (_, processIndex) => {
    const run = await execFileAsync(process.execPath, ["tests/helpers/run-bld-015-vectors.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      maxBuffer: 8 * 1024 * 1024,
      timeout: 240_000,
    });
    if (run.stderr !== "") throw new Error("BLD-015 evidence child wrote stderr");
    const output = JSON.parse(run.stdout);
    return Object.freeze({
      processIndex: processIndex + 1,
      result: output.result,
      nodeExecutableIdentity: output.nodeExecutableIdentity,
      nodeExecutableDigest: output.nodeExecutableDigest,
      locale: output.locale,
      timeZone: output.timeZone,
      repetitions: output.repetitions,
      identicalRepetitions: output.identicalRepetitions,
      processTranscriptDigest: output.processTranscriptDigest,
    });
  }),
);

const evidence = {
  schema: "rsrender.bld-015.source-snapshot-evidence.v1",
  ticket: "BLD-015/#59",
  result:
    executions.every(
      (execution) => execution.result === "PASS" && execution.identicalRepetitions,
    ) && new Set(executions.map((execution) => execution.processTranscriptDigest)).size === 1
      ? "PASS"
      : "FAIL",
  executionProfile: "EP-PURE/G1",
  fixtureRevision: executions[0].repetitions[0].fixtureRevision,
  oracleRevision: executions[0].repetitions[0].oracleRevision,
  generatorRevision: executions[0].repetitions[0].generatorRevision,
  freshProcessCount: executions.length,
  repetitionsPerProcess: executions[0].repetitions.length,
  seedsPerRepetition: executions[0].repetitions[0].propertyRuns.length,
  iterationsPerSeed: executions[0].repetitions[0].propertyRuns[0].iterations,
  invariants: ["identity", "parent-cardinality", "immutability", "ordering", "canonical-digest"],
  generatedCasesPerInvariant: executions.reduce(
    (sum, execution) =>
      sum +
      execution.repetitions.reduce(
        (repetitionSum, repetition) =>
          repetitionSum +
          repetition.propertyRuns.reduce((runSum, run) => runSum + run.iterations, 0),
        0,
      ),
    0,
  ),
  totalGeneratedInvariantAssertions: 0,
  snapshotIdentity: executions[0].repetitions[0].snapshotIdentity,
  snapshotLogicalDigest: executions[0].repetitions[0].snapshotLogicalDigest,
  snapshotEncodingDigest: executions[0].repetitions[0].snapshotEncodingDigest,
  blockedCapabilityCount: executions[0].repetitions[0].blockedCapabilityCount,
  executions,
  failures: executions.flatMap((execution) =>
    execution.repetitions.flatMap((repetition) => repetition.failures),
  ),
  privacy: executions[0].repetitions[0].privacy,
  nonclaims: executions[0].repetitions[0].nonclaims,
};
evidence.totalGeneratedInvariantAssertions =
  evidence.generatedCasesPerInvariant * evidence.invariants.length;
const finalEvidence = Object.freeze({
  ...evidence,
  evidenceDigest: sha256CanonicalJson(evidence),
});

process.stdout.write(`${JSON.stringify(finalEvidence, null, 2)}\n`);
