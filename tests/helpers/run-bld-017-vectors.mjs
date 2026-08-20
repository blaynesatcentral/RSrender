import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import {
  assembleBoundedOverrideRenderDataset,
  encodePresentationOverrideCollection,
  encodeSourceSnapshot,
} from "../../packages/domain/dist/index.js";
import { bld017FixtureRevision, makeAssemblyInput, makeCollection } from "./bld-017-fixtures.mjs";
import { runBld017PropertyModel } from "./bld-017-property-model.mjs";
import { runBld017FixedFailureVectors } from "./bld-017-fixed-vectors.mjs";

const executableSha256 = `sha256:${createHash("sha256")
  .update(readFileSync(process.execPath))
  .digest("hex")}`;
if (
  process.version !== "v24.18.1" ||
  executableSha256 !== "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582" ||
  Intl.DateTimeFormat().resolvedOptions().locale !== "en-US" ||
  Intl.DateTimeFormat().resolvedOptions().timeZone !== "UTC"
) {
  throw new Error("BLD-017 admitted runtime mismatch");
}

function runFullRepetition() {
  const input = makeAssemblyInput();
  const assembled = assembleBoundedOverrideRenderDataset(input);
  const sourceOnly = assembleBoundedOverrideRenderDataset(makeAssemblyInput(makeCollection([])));
  const sourceOnlyEmptyInput = makeAssemblyInput(null);
  const sourceOnlyEmpty = assembleBoundedOverrideRenderDataset(sourceOnlyEmptyInput);
  assert.equal(assembled.assembled, true);
  assert.equal(sourceOnly.assembled, true);
  assert.equal(sourceOnlyEmpty.assembled, true);
  assert.deepEqual(sourceOnlyEmpty.value.values, sourceOnly.value.values);
  const snapshot = encodeSourceSnapshot(input.sourceSnapshot);
  const collection = encodePresentationOverrideCollection(input.presentationOverrides.collection);
  assert.equal(snapshot.accepted, true);
  assert.equal(collection.accepted, true);
  const appliedValue = assembled.value.values.find(
    (value) => value.application.kind === "display-value-override",
  );
  assert.notEqual(appliedValue, undefined);
  assert.equal(appliedValue.sourceOriginalValue.provenance.provenanceClass, "source");
  assert.equal(appliedValue.effectiveDisplayValue.provenance.provenanceClass, "override");
  const transcript = {
    schema: "rsrender.bld-017-vector-transcript.v1",
    runtime: {
      node: process.version,
      executableSha256,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    fixtureRevision: bld017FixtureRevision,
    snapshotIdentity: input.sourceSnapshot.snapshotIdentity,
    snapshotEncodingDigest: snapshot.digest,
    collectionRevisionIdentity: input.presentationOverrides.collection.revisionIdentity,
    collectionLogicalDigest: input.presentationOverrides.collection.logicalDigest,
    collectionEncodingDigest: collection.digest,
    datasetIdentity: assembled.value.datasetIdentity,
    datasetLogicalDigest: assembled.value.logicalDigest,
    appliedOverrideWitness: {
      sourceFieldIdentity: appliedValue.sourceFieldIdentity,
      sourceOriginalDigest: sha256CanonicalJson(appliedValue.sourceOriginalValue),
      sourceOriginalProvenanceClass: appliedValue.sourceOriginalValue.provenance.provenanceClass,
      effectiveDisplayDigest: sha256CanonicalJson(appliedValue.effectiveDisplayValue),
      effectiveDisplayProvenanceClass:
        appliedValue.effectiveDisplayValue.provenance.provenanceClass,
      presentationOverrideIdentity: appliedValue.application.presentationOverrideIdentity,
    },
    sourceOnlyDatasetIdentity: sourceOnly.value.datasetIdentity,
    sourceOnlyDatasetLogicalDigest: sourceOnly.value.logicalDigest,
    sourceOnlyEmptyDatasetIdentity: sourceOnlyEmpty.value.datasetIdentity,
    sourceOnlyEmptyDatasetLogicalDigest: sourceOnlyEmpty.value.logicalDigest,
    sourceOnlyEmptyPresentation: {
      state: sourceOnlyEmpty.value.presentationOverrideState,
      projectRevision: sourceOnlyEmpty.value.presentationOverrideProjectRevision,
      revisionIdentity: sourceOnlyEmpty.value.presentationOverrideRevisionIdentity,
      contentDigest: sourceOnlyEmpty.value.presentationOverrideContentDigest,
      collectionIdentity: sourceOnlyEmpty.value.presentationOverrideCollectionIdentity,
      collectionRevision: sourceOnlyEmpty.value.presentationOverrideCollectionRevision,
      collectionDigest: sourceOnlyEmpty.value.presentationOverrideCollectionDigest,
    },
    sourceOnlyCurrentPresentation: {
      state: sourceOnly.value.presentationOverrideState,
      projectRevision: sourceOnly.value.presentationOverrideProjectRevision,
      revisionIdentity: sourceOnly.value.presentationOverrideRevisionIdentity,
      contentDigest: sourceOnly.value.presentationOverrideContentDigest,
      collectionIdentity: sourceOnly.value.presentationOverrideCollectionIdentity,
      collectionRevision: sourceOnly.value.presentationOverrideCollectionRevision,
      collectionDigest: sourceOnly.value.presentationOverrideCollectionDigest,
    },
    sourceOnlyEffectiveValuesDigest: sha256CanonicalJson(sourceOnly.value.values),
    sourceOnlyEmptyEffectiveValuesDigest: sha256CanonicalJson(sourceOnlyEmpty.value.values),
    sourceOnlyEmptyHandleIdentity:
      sourceOnlyEmptyInput.phase1Project.phase1Inputs.revisionHandles.find(
        (handle) => handle.collectionKind === "presentation-overrides",
      ).revisionIdentity,
    sourceBeforeDigest: snapshot.digest,
    sourceAfterDigest: encodeSourceSnapshot(input.sourceSnapshot).digest,
    fixedFailures: runBld017FixedFailureVectors(),
    property: runBld017PropertyModel(),
  };
  assert.equal(transcript.sourceBeforeDigest, transcript.sourceAfterDigest);
  assert.notEqual(sourceOnly.value.logicalDigest, sourceOnlyEmpty.value.logicalDigest);
  assert.equal(
    transcript.sourceOnlyEffectiveValuesDigest,
    transcript.sourceOnlyEmptyEffectiveValuesDigest,
  );
  assert.equal(transcript.sourceOnlyEmptyPresentation.state, "empty");
  assert.equal(transcript.sourceOnlyEmptyPresentation.projectRevision, 0);
  assert.equal(transcript.sourceOnlyEmptyPresentation.collectionIdentity, null);
  assert.equal(transcript.sourceOnlyCurrentPresentation.state, "current");
  assert.equal(transcript.sourceOnlyCurrentPresentation.projectRevision > 0, true);
  assert.equal(transcript.fixedFailures.length, 17);
  return { transcript, digest: sha256CanonicalJson(transcript) };
}

const repetitions = [runFullRepetition(), runFullRepetition()];
assert.equal(repetitions[0].digest, repetitions[1].digest);
process.stdout.write(`${JSON.stringify({ repetitions })}\n`);
