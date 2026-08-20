import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

import {
  encodeLogProjectAggregate,
  encodePhase1LogProjectAggregate,
  evaluateCompleteTemplateAssignments,
  evaluatePhase1CompleteTemplateAssignments,
  inspectPhase1ProjectAvailability,
  toLogProjectAggregateV1CompatibilityView,
} from "../../packages/domain/dist/index.js";
import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import {
  bld016FixtureRevisions,
  compatibilityFixtures,
  migrateV1,
  sourceBackedPhase1Project,
} from "./bld-016-fixtures.mjs";
import { runBld016PropertyModel } from "./bld-016-property-model.mjs";

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
  throw new Error("BLD-016 admitted runtime mismatch");
}

function runFullRepetition() {
  const compatibility = compatibilityFixtures().map(({ revision, v1 }) => {
    const v2 = migrateV1(v1);
    const view = toLogProjectAggregateV1CompatibilityView(v2);
    if (!view.accepted) throw new Error(view.code);
    const v1Encoded = encodeLogProjectAggregate(v1);
    const viewEncoded = encodeLogProjectAggregate(view.value);
    const v2Encoded = encodePhase1LogProjectAggregate(v2);
    if (!v1Encoded.accepted || !viewEncoded.accepted || !v2Encoded.accepted) {
      throw new Error("encoding rejected");
    }
    const assignmentResult = evaluateCompleteTemplateAssignments(v1);
    const phase1AssignmentResult = evaluatePhase1CompleteTemplateAssignments(v2);
    assert.equal(v1Encoded.json, viewEncoded.json);
    assert.deepEqual(phase1AssignmentResult, assignmentResult);
    return {
      revision,
      v1Digest: sha256CanonicalJson(JSON.parse(v1Encoded.json)),
      compatibilityDigest: sha256CanonicalJson(JSON.parse(viewEncoded.json)),
      v2Digest: v2Encoded.digest,
      assignmentResult,
      phase1AssignmentResult,
    };
  });
  const sourceBacked = sourceBackedPhase1Project();
  const sourceEncoded = encodePhase1LogProjectAggregate(sourceBacked);
  const availability = inspectPhase1ProjectAvailability(sourceBacked);
  if (!sourceEncoded.accepted || !availability.accepted) throw new Error("source-backed rejected");
  assert.deepEqual(availability.value, {
    structuralAuthoring: "available",
    sourceSnapshot: "present",
    templateAssignments: "complete",
    sourceMemberships: "available",
    evaluation: "not-evaluated-by-bld-016",
    publication: "not-evaluated-by-bld-016",
    diagnostics: [],
  });
  const transcript = {
    schema: "rsrender.bld-016-vector-transcript.v1",
    runtime: {
      node: process.version,
      executableSha256,
      locale: runtimeLocale,
      timeZone: runtimeTimeZone,
    },
    fixtureRevisions: bld016FixtureRevisions,
    compatibility,
    sourceBacked: {
      digest: sourceEncoded.digest,
      snapshotIdentity: sourceBacked.phase1Inputs.acceptedSourceSnapshot.snapshotIdentity,
      explorationIdentity: sourceBacked.logSet.memberships[0].sourceExplorationIdentity,
      availability: availability.value,
    },
    property: runBld016PropertyModel(),
  };
  return { transcript, digest: sha256CanonicalJson(transcript) };
}

const repetitions = [runFullRepetition(), runFullRepetition()];
if (repetitions[0].digest !== repetitions[1].digest) throw new Error("repeat mismatch");
process.stdout.write(`${JSON.stringify({ repetitions })}\n`);
