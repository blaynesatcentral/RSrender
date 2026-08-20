import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  encodeOverrideRenderDatasetCommand,
  sha256CanonicalJson,
} from "../../packages/contracts/dist/index.js";
import {
  bld019GeneratorRevision,
  bld019IterationsPerSeed,
  bld019OracleRevision,
  bld019PropertyInvariants,
  bld019PropertySeeds,
  runBld019PropertyModel,
} from "./bld-019-property-model.mjs";
import {
  makeQuery,
  makeRedo,
  makeService,
  makeSetCommand,
  makeUndo,
  sourceSnapshotEncoding,
} from "./bld-019-fixtures.mjs";

const admittedNodeVersion = "v24.18.1";
const admittedExecutableSha256 =
  "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582";
const executableSha256 = `sha256:${createHash("sha256")
  .update(readFileSync(process.execPath))
  .digest("hex")}`;
const runtimeLocale = Intl.DateTimeFormat().resolvedOptions().locale;
const runtimeTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (
  process.version !== admittedNodeVersion ||
  executableSha256 !== admittedExecutableSha256 ||
  runtimeLocale !== "en-US" ||
  runtimeTimeZone !== "UTC"
) {
  throw new Error("BLD-019 admitted runtime mismatch");
}

function requireCommitted(result) {
  assert.equal(result.kind, "override-render-dataset.committed");
  return result;
}

function encodeCommand(command) {
  const encoded = encodeOverrideRenderDatasetCommand(command);
  assert.equal(encoded.accepted, true);
  return encoded.digest;
}

function projectionWitness(projection) {
  return Object.freeze({
    projectionIdentity: projection.projectionIdentity,
    projectionDigest: projection.projectionDigest,
    aggregateDigest: projection.aggregateDigest,
    datasetIdentity: projection.datasetIdentity,
    datasetLogicalDigest: projection.datasetLogicalDigest,
    datasetEncodingDigest: projection.datasetEncodingDigest,
    presentationOverrideState: projection.presentationOverrideState,
    presentationOverrideRevisionIdentity: projection.presentationOverrideRevisionIdentity,
    presentationOverrideCollectionIdentity: projection.presentationOverrideCollectionIdentity,
    presentationOverrideCollectionRevision: projection.presentationOverrideCollectionRevision,
    presentationOverrideCollectionDigest: projection.presentationOverrideCollectionDigest,
    presentationOverrideCollectionEncodingDigest:
      projection.presentationOverrideCollectionEncodingDigest,
    sourceSnapshotIdentity: projection.sourceSnapshotIdentity,
    sourceSnapshotLogicalDigest: projection.sourceSnapshotLogicalDigest,
    sourceSnapshotEncodingDigest: projection.sourceSnapshotEncodingDigest,
    sourceContextIdentity: projection.sourceContextIdentity,
    sourceProjectIdentity: projection.sourceProjectIdentity,
    valuesDigest: sha256CanonicalJson(projection.values),
    overridesDigest: sha256CanonicalJson(projection.overrides),
    diagnosticsDigest: projection.diagnosticFactsDigest,
  });
}

function resultWitness(result) {
  return Object.freeze({
    kind: result.kind,
    requestId: result.requestId,
    documentId: Object.hasOwn(result, "documentId") ? result.documentId : null,
    ownerGeneration: Object.hasOwn(result, "ownerGeneration") ? result.ownerGeneration : null,
    operation: result.kind === "override-render-dataset.committed" ? result.operation : null,
    reason: result.kind === "override-render-dataset.rejected" ? result.reason : null,
    workingRevision: Object.hasOwn(result, "workingRevision") ? result.workingRevision : null,
    previousWorkingRevision: Object.hasOwn(result, "previousWorkingRevision")
      ? result.previousWorkingRevision
      : null,
    durableRevision: Object.hasOwn(result, "durableRevision") ? result.durableRevision : null,
    dirty: Object.hasOwn(result, "dirty") ? result.dirty : null,
    canUndo: Object.hasOwn(result, "canUndo") ? result.canUndo : null,
    canRedo: Object.hasOwn(result, "canRedo") ? result.canRedo : null,
    eventSequence: Object.hasOwn(result, "eventSequence") ? result.eventSequence : null,
    changed: Object.hasOwn(result, "changed") ? result.changed : null,
    historyEntryIdentity:
      result.kind === "override-render-dataset.committed" ? result.historyEntryIdentity : null,
    eventDigest:
      result.kind === "override-render-dataset.committed"
        ? sha256CanonicalJson(result.event)
        : null,
    projection: Object.hasOwn(result, "projection") ? projectionWitness(result.projection) : null,
  });
}

function assertAuthorityEquals(actual, expected) {
  for (const key of [
    "documentId",
    "ownerGeneration",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
  ]) {
    assert.equal(actual[key], expected[key], key);
  }
  assert.deepEqual(actual.projection, expected.projection);
}

async function runFixedTranscript() {
  const service = makeService();
  const source = sourceSnapshotEncoding();
  const initialQueryCommand = makeQuery({ requestId: "urn:test:bld-019:runner:initial" });
  const initial = await service.getProjection(initialQueryCommand);
  assert.equal(initial.kind, "render-dataset.projection.result");
  assert.equal(initial.workingRevision, 0);
  assert.equal(initial.durableRevision, 0);
  assert.equal(initial.dirty, false);
  assert.equal(initial.canUndo, false);
  assert.equal(initial.canRedo, false);
  assert.equal(initial.eventSequence, 0);

  const setCommand = makeSetCommand({ requestId: "urn:test:bld-019:runner:set" });
  const set = requireCommitted(await service.setDisplayValue(setCommand));
  const setQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:runner:set-query" }),
  );
  assertAuthorityEquals(setQuery, set);
  const setQueryRepeated = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:runner:set-query-repeat" }),
  );
  assertAuthorityEquals(setQueryRepeated, setQuery);

  const undoCommand = makeUndo({ requestId: "urn:test:bld-019:runner:undo" });
  const undo = requireCommitted(await service.undo(undoCommand));
  const undoQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:runner:undo-query" }),
  );
  assertAuthorityEquals(undoQuery, undo);
  assert.equal(undo.projection.datasetLogicalDigest, initial.projection.datasetLogicalDigest);

  const redoCommand = makeRedo({ requestId: "urn:test:bld-019:runner:redo" });
  const redo = requireCommitted(await service.redo(redoCommand));
  const redoQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:runner:redo-query" }),
  );
  assertAuthorityEquals(redoQuery, redo);
  assert.equal(redo.projection.datasetLogicalDigest, set.projection.datasetLogicalDigest);

  for (const result of [initial, set, setQuery, undo, undoQuery, redo, redoQuery]) {
    assert.equal(result.projection.sourceSnapshotIdentity, source.value.snapshotIdentity);
    assert.equal(result.projection.sourceSnapshotLogicalDigest, source.value.logicalDigest);
    assert.equal(result.projection.sourceSnapshotEncodingDigest, source.digest);
    assert.equal(result.projection.sourceContextIdentity, source.value.sourceContextIdentity);
    assert.equal(result.projection.sourceProjectIdentity, source.value.sourceProjectIdentity);
  }

  return Object.freeze({
    schema: "rsrender.bld-019-fixed-command-query-transcript.v1",
    sourceSnapshotCanonicalDigest: sha256CanonicalJson(JSON.parse(source.canonicalJson)),
    sourceSnapshotEncodingDigest: source.digest,
    commandDigests: Object.freeze({
      set: encodeCommand(setCommand),
      undo: encodeCommand(undoCommand),
      redo: encodeCommand(redoCommand),
    }),
    records: Object.freeze({
      initial: resultWitness(initial),
      set: resultWitness(set),
      setQuery: resultWitness(setQuery),
      setQueryRepeated: resultWitness(setQueryRepeated),
      undo: resultWitness(undo),
      undoQuery: resultWitness(undoQuery),
      redo: resultWitness(redo),
      redoQuery: resultWitness(redoQuery),
    }),
    failures: Object.freeze([]),
  });
}

async function runFullRepetition() {
  const fixed = await runFixedTranscript();
  const summaries = [];
  for (const seed of bld019PropertySeeds) {
    summaries.push(await runBld019PropertyModel(seed, bld019IterationsPerSeed));
  }
  for (const summary of summaries) {
    assert.equal(summary.iterations, bld019IterationsPerSeed);
    for (const invariant of Object.keys(summary.invariantChecks)) {
      assert.equal(summary.invariantChecks[invariant], bld019IterationsPerSeed);
    }
    assert.deepEqual(summary.failures, []);
  }
  const transcript = Object.freeze({
    schema: "rsrender.bld-019-command-query-vector-transcript.v1",
    runtime: Object.freeze({
      node: process.version,
      executableSha256,
      locale: runtimeLocale,
      timeZone: runtimeTimeZone,
    }),
    generatorRevision: bld019GeneratorRevision,
    oracleRevision: bld019OracleRevision,
    fixed,
    fixedDigest: sha256CanonicalJson(fixed),
    property: Object.freeze({
      seeds: bld019PropertySeeds,
      iterationsPerSeed: bld019IterationsPerSeed,
      casesPerInvariant: bld019PropertySeeds.length * bld019IterationsPerSeed,
      invariants: bld019PropertyInvariants,
      summaries: Object.freeze(summaries),
      failures: Object.freeze([]),
    }),
  });
  return Object.freeze({ transcript, digest: sha256CanonicalJson(transcript) });
}

const repetitions = Object.freeze([await runFullRepetition(), await runFullRepetition()]);
assert.equal(repetitions[0].digest, repetitions[1].digest);
process.stdout.write(`${JSON.stringify({ repetitions })}\n`);
