import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";

import * as domain from "../packages/domain/dist/index.js";
import {
  createEmptyPhase1LogProject,
  createEmptyProjectInputRevisionHandle,
  createProjectInputRevisionHandle,
  decodePhase1LogProjectAggregate,
  deriveEmptyProjectInputContentDigest,
  deriveProjectInputRevisionIdentity,
  divergePhase1EmbeddedTemplateRepresentation,
  encodeLogProjectAggregate,
  encodePhase1LogProjectAggregate,
  getProjectInputRevisionHandle,
  inspectPhase1ProjectAvailability,
  migrateLogProjectAggregateV1ToPhase1V2,
  PROJECT_INPUT_COLLECTION_KINDS,
  replacePhase1SharedEmbeddedTemplateRepresentation,
  divergeEmbeddedTemplateRepresentation,
  evaluateCompleteTemplateAssignments,
  replaceSharedEmbeddedTemplateRepresentation,
  toLogProjectAggregateV1CompatibilityView,
} from "../packages/domain/dist/index.js";
import { digestB, digestC, fx07Project, ids } from "./helpers/bld-009-fixtures.mjs";
import { bld015Snapshot } from "./helpers/bld-015-fixtures.mjs";
import {
  clone,
  compatibilityFixtures,
  currentHandle,
  emptyPhase1Project,
  migrateV1,
  sourceBackedPhase1Project,
} from "./helpers/bld-016-fixtures.mjs";
import { runBld016PropertyModel } from "./helpers/bld-016-property-model.mjs";

const execFileAsync = promisify(execFile);

function accepted(result) {
  assert.equal(result.accepted, true);
  return result.value;
}

function expectRejected(candidate, code) {
  assert.deepEqual(decodePhase1LogProjectAggregate(candidate), { accepted: false, code });
}

function assertDeepFrozen(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const item of Object.values(value)) assertDeepFrozen(item, seen);
}

function collectKeys(value, result = new Set()) {
  if (typeof value !== "object" || value === null) return result;
  for (const [key, child] of Object.entries(value)) {
    result.add(key);
    collectKeys(child, result);
  }
  return result;
}

test("v1 migration produces the exact seven explicit empty sentinels and preserves the v1 view", () => {
  for (const { v1 } of compatibilityFixtures()) {
    const v2 = migrateV1(v1);
    assert.equal(v2.aggregateVersion, 2);
    assert.equal(v2.phase1Inputs.acceptedSourceSnapshot, null);
    assert.deepEqual(
      v2.phase1Inputs.revisionHandles.map((handle) => handle.collectionKind),
      PROJECT_INPUT_COLLECTION_KINDS,
    );
    for (const handle of v2.phase1Inputs.revisionHandles) {
      assert.equal(handle.ownerDocumentIdentity, v2.documentIdentity);
      assert.equal(handle.state, "empty");
      assert.equal(handle.projectRevision, 0);
      assert.equal(handle.revisionIdentity.includes(handle.collectionKind), false);
      assert.deepEqual(deriveEmptyProjectInputContentDigest(handle.collectionKind), {
        accepted: true,
        value: handle.contentDigest,
      });
      assert.deepEqual(
        deriveProjectInputRevisionIdentity({
          ownerDocumentIdentity: v2.documentIdentity,
          collectionKind: handle.collectionKind,
          projectRevision: 0,
        }),
        { accepted: true, value: handle.revisionIdentity },
      );
    }
    const view = accepted(toLogProjectAggregateV1CompatibilityView(v2));
    assert.equal(encodeLogProjectAggregate(view).json, encodeLogProjectAggregate(v1).json);
  }
});

test("strict handle inventory rejects omission, duplicates, unknowns, reordering, and forged sentinels", () => {
  const base = emptyPhase1Project();
  const handles = base.phase1Inputs.revisionHandles;
  expectRejected(
    { ...base, phase1Inputs: { ...base.phase1Inputs, revisionHandles: handles.slice(1) } },
    "PHASE1_PROJECT_HANDLE_MISSING",
  );
  expectRejected(
    { ...base, phase1Inputs: { ...base.phase1Inputs, revisionHandles: [...handles, handles[0]] } },
    "PHASE1_PROJECT_HANDLE_DUPLICATE",
  );
  const duplicateCurrent = currentHandle(base, handles[0].collectionKind, 1, digestC);
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [duplicateCurrent, duplicateCurrent, ...handles.slice(1)],
      },
    },
    "PHASE1_PROJECT_HANDLE_DUPLICATE",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [handles[1], handles[0], ...handles.slice(2)],
      },
    },
    "PHASE1_PROJECT_HANDLE_ORDER_MISMATCH",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [{ ...handles[0], collectionKind: "invented" }, ...handles.slice(1)],
      },
    },
    "PHASE1_PROJECT_HANDLE_KIND_INVALID",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [{ ...handles[0], contentDigest: digestB }, ...handles.slice(1)],
      },
    },
    "PHASE1_PROJECT_HANDLE_DIGEST_MISMATCH",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [{ ...handles[0], revisionIdentity: "urn:forged" }, ...handles.slice(1)],
      },
    },
    "PHASE1_PROJECT_HANDLE_IDENTITY_MISMATCH",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [{ ...handles[0], state: "current" }, ...handles.slice(1)],
      },
    },
    "PHASE1_PROJECT_HANDLE_REVISION_INVALID",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [
          { ...handles[0], ownerDocumentIdentity: "urn:test:bld-016:other-document" },
          ...handles.slice(1),
        ],
      },
    },
    "PHASE1_PROJECT_HANDLE_OWNER_MISMATCH",
  );
  expectRejected({ ...base, unexpected: true }, "PHASE1_PROJECT_EXTRA_FIELD");
  expectRejected(
    {
      ...base,
      phase1Inputs: { ...base.phase1Inputs, unexpected: true },
    },
    "PHASE1_PROJECT_EXTRA_FIELD",
  );
  const sparseHandles = [...handles];
  delete sparseHandles[0];
  expectRejected(
    {
      ...base,
      phase1Inputs: { ...base.phase1Inputs, revisionHandles: sparseHandles },
    },
    "PHASE1_PROJECT_MALFORMED",
  );
  expectRejected(
    {
      ...base,
      phase1Inputs: {
        ...base.phase1Inputs,
        revisionHandles: [{ ...handles[0], unexpected: true }, ...handles.slice(1)],
      },
    },
    "PHASE1_PROJECT_EXTRA_FIELD",
  );
});

test("current handles require a positive revision, exact owner and digest, and expose lookup without transition semantics", () => {
  const project = emptyPhase1Project();
  assert.equal("replaceProjectInputRevisionHandle" in domain, false);
  assert.deepEqual(
    createProjectInputRevisionHandle({
      collectionKind: PROJECT_INPUT_COLLECTION_KINDS[0],
      ownerDocumentIdentity: project.documentIdentity,
      state: "current",
      projectRevision: 0,
      contentDigest: digestC,
    }),
    { accepted: false, code: "PHASE1_PROJECT_HANDLE_REVISION_INVALID" },
  );
  const handle = currentHandle(project, PROJECT_INPUT_COLLECTION_KINDS[3], 7, digestC);
  assert.deepEqual(
    createProjectInputRevisionHandle({
      collectionKind: handle.collectionKind,
      ownerDocumentIdentity: project.documentIdentity,
      state: "current",
      projectRevision: 7,
      contentDigest: "not-a-digest",
    }),
    { accepted: false, code: "PHASE1_PROJECT_WRONG_TYPE" },
  );
  const candidate = accepted(
    decodePhase1LogProjectAggregate({
      ...project,
      phase1Inputs: {
        ...project.phase1Inputs,
        revisionHandles: project.phase1Inputs.revisionHandles.map((item) =>
          item.collectionKind === handle.collectionKind ? handle : item,
        ),
      },
    }),
  );
  assert.deepEqual(getProjectInputRevisionHandle(candidate, handle.collectionKind), {
    accepted: true,
    value: handle,
  });
  expectRejected(
    {
      ...candidate,
      phase1Inputs: {
        ...candidate.phase1Inputs,
        revisionHandles: candidate.phase1Inputs.revisionHandles.map((item) =>
          item.collectionKind === handle.collectionKind
            ? {
                ...item,
                revisionIdentity: project.phase1Inputs.revisionHandles[3].revisionIdentity,
              }
            : item,
        ),
      },
    },
    "PHASE1_PROJECT_HANDLE_IDENTITY_MISMATCH",
  );
});

test("incomplete authoring stays valid while evaluation and publication prerequisites are explicitly unavailable", () => {
  const empty = emptyPhase1Project();
  const availability = accepted(inspectPhase1ProjectAvailability(empty));
  assert.deepEqual(
    [
      availability.structuralAuthoring,
      availability.sourceSnapshot,
      availability.evaluation,
      availability.publication,
    ],
    ["available", "absent", "unavailable", "unavailable"],
  );
  assert.equal(
    availability.diagnostics.some((fact) => fact.code === "PROJECT.SOURCE_SNAPSHOT.ABSENT"),
    true,
  );
  assert.equal(
    availability.diagnostics.every((fact) => fact.remediationActionIds.length > 0),
    true,
  );

  const complete = sourceBackedPhase1Project();
  const completeAvailability = accepted(inspectPhase1ProjectAvailability(complete));
  assert.deepEqual(
    [
      completeAvailability.sourceSnapshot,
      completeAvailability.templateAssignments,
      completeAvailability.sourceMemberships,
    ],
    ["present", "complete", "available"],
  );
  assert.deepEqual(
    [
      completeAvailability.evaluation,
      completeAvailability.publication,
      completeAvailability.diagnostics.length,
    ],
    ["not-evaluated-by-bld-016", "not-evaluated-by-bld-016", 0],
  );

  const incomplete = accepted(
    decodePhase1LogProjectAggregate({
      ...complete,
      logSet: {
        ...complete.logSet,
        memberships: [
          {
            ...complete.logSet.memberships[0],
            sourceExplorationIdentity: "urn:test:bld-016:missing-source-exploration",
            membershipIdentity: domain.deriveExplorationMembershipIdentity(
              complete.documentIdentity,
              "urn:test:bld-016:missing-source-exploration",
            ),
          },
        ],
        templateAssignments: [],
      },
    }),
  );
  const incompleteAvailability = accepted(inspectPhase1ProjectAvailability(incomplete));
  assert.equal(incompleteAvailability.structuralAuthoring, "available");
  assert.deepEqual(incompleteAvailability.diagnostics.map((fact) => fact.code).sort(), [
    "PROJECT.MEMBERSHIP.SOURCE_EXPLORATION_UNAVAILABLE",
    "TEMPLATE.ASSIGNMENT.MISSING",
  ]);
  const diagnosticKeys = collectKeys(incompleteAvailability.diagnostics);
  for (const forbidden of [
    "severity",
    "suppression",
    "acknowledgement",
    "publication",
    "policy",
    "ui",
  ]) {
    assert.equal(diagnosticKeys.has(forbidden), false);
  }
});

test("Snapshot membership uses only the exact provider-native SourceExplorationIdentity basis", () => {
  const project = sourceBackedPhase1Project();
  assert.equal(
    project.logSet.memberships[0].sourceExplorationIdentity,
    bld015Snapshot.explorations[0].providerNativeIdentity,
  );
  const wrong = accepted(
    decodePhase1LogProjectAggregate({
      ...project,
      logSet: {
        ...project.logSet,
        memberships: [
          {
            ...project.logSet.memberships[0],
            sourceExplorationIdentity: bld015Snapshot.explorations[0].sourceEntityIdentity,
            membershipIdentity: domain.deriveExplorationMembershipIdentity(
              project.documentIdentity,
              bld015Snapshot.explorations[0].sourceEntityIdentity,
            ),
          },
        ],
      },
    }),
  );
  const availability = accepted(inspectPhase1ProjectAvailability(wrong));
  assert.equal(availability.sourceMemberships, "unavailable");
  assert.equal(availability.evaluation, "unavailable");
  assert.equal(availability.publication, "unavailable");
  assert.equal(
    availability.diagnostics.some(
      (fact) => fact.code === "PROJECT.MEMBERSHIP.SOURCE_EXPLORATION_UNAVAILABLE",
    ),
    true,
  );
});

test("Snapshot custody and core compatibility reject mismatches without weakening v1 codes", () => {
  const empty = emptyPhase1Project();
  expectRejected(
    {
      ...empty,
      phase1Inputs: { ...empty.phase1Inputs, acceptedSourceSnapshot: bld015Snapshot },
    },
    "PHASE1_PROJECT_SNAPSHOT_CONTEXT_MISMATCH",
  );
  const projectMismatch = accepted(
    createEmptyPhase1LogProject({
      documentIdentity: "urn:test:bld-016:project-mismatch-document",
      sourceContextIdentity: bld015Snapshot.sourceContextIdentity,
      sourceProjectIdentity: "urn:test:bld-016:different-source-project",
    }),
  );
  expectRejected(
    {
      ...projectMismatch,
      phase1Inputs: {
        ...projectMismatch.phase1Inputs,
        acceptedSourceSnapshot: bld015Snapshot,
      },
    },
    "PHASE1_PROJECT_SNAPSHOT_PROJECT_MISMATCH",
  );
  const sourceBacked = sourceBackedPhase1Project();
  expectRejected(
    {
      ...sourceBacked,
      phase1Inputs: {
        ...sourceBacked.phase1Inputs,
        acceptedSourceSnapshot: {
          ...sourceBacked.phase1Inputs.acceptedSourceSnapshot,
          logicalDigest: digestC,
        },
      },
    },
    "SOURCE_SNAPSHOT_DIGEST_MISMATCH",
  );
  expectRejected(
    {
      ...empty,
      logSet: {
        ...empty.logSet,
        groups: [
          {
            groupIdentity: domain.deriveExplorationGroupIdentity(empty.documentIdentity, "urn:g"),
            localGroupIdentity: "urn:g",
            parentGroupIdentity: "urn:missing",
          },
        ],
      },
    },
    "GROUP_PARENT_ORPHANED",
  );
});

test("persisted source-backed v2 round-trips with exact canonical bytes, digest, Snapshot and handle identities", () => {
  const sourceBacked = sourceBackedPhase1Project();
  const encoded = encodePhase1LogProjectAggregate(sourceBacked);
  assert.equal(encoded.accepted, true);
  const decoded = accepted(decodePhase1LogProjectAggregate(JSON.parse(encoded.canonicalJson)));
  const reencoded = encodePhase1LogProjectAggregate(decoded);
  assert.equal(reencoded.accepted, true);
  assert.equal(reencoded.canonicalJson, encoded.canonicalJson);
  assert.equal(reencoded.digest, encoded.digest);
  assert.equal(
    decoded.phase1Inputs.acceptedSourceSnapshot.snapshotIdentity,
    sourceBacked.phase1Inputs.acceptedSourceSnapshot.snapshotIdentity,
  );
  assert.deepEqual(
    decoded.phase1Inputs.revisionHandles.map((handle) => handle.revisionIdentity),
    sourceBacked.phase1Inputs.revisionHandles.map((handle) => handle.revisionIdentity),
  );
});

test("v2 wrappers preserve phase1 inputs byte-for-byte across frozen v1 ETR operations", () => {
  const v1 = fx07Project();
  const v2 = migrateV1(v1);
  const before = encodePhase1LogProjectAggregate(v2);
  const source = v1.logSet.embeddedTemplateRepresentations[0];
  const replaced = replacePhase1SharedEmbeddedTemplateRepresentation(v2, {
    sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
    newEffectiveContentDigest: digestC,
  });
  assert.equal(replaced.accepted, true);
  assert.deepEqual(replaced.value.phase1Inputs, v2.phase1Inputs);
  const replacedV1 = replaceSharedEmbeddedTemplateRepresentation(v1, {
    sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
    newEffectiveContentDigest: digestC,
  });
  assert.equal(replacedV1.accepted, true);
  assert.deepEqual(
    accepted(toLogProjectAggregateV1CompatibilityView(replaced.value)),
    replacedV1.value,
  );
  assert.deepEqual(
    domain.evaluatePhase1CompleteTemplateAssignments(replaced.value),
    evaluateCompleteTemplateAssignments(replacedV1.value),
  );

  const selected = v1.logSet.templateAssignments[1];
  const diverged = divergePhase1EmbeddedTemplateRepresentation(v2, {
    sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
    newAdmittedTemplateIdentity: "urn:test:bld-016:template:diverged",
    newEffectiveContentDigest: digestB,
    separationOperationIdentity: ids.separation,
    assignmentIdentitiesToReassign: [selected.assignmentIdentity],
  });
  assert.equal(diverged.accepted, true);
  assert.deepEqual(diverged.value.phase1Inputs, v2.phase1Inputs);
  const divergedV1 = divergeEmbeddedTemplateRepresentation(v1, {
    sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
    newAdmittedTemplateIdentity: "urn:test:bld-016:template:diverged",
    newEffectiveContentDigest: digestB,
    separationOperationIdentity: ids.separation,
    assignmentIdentitiesToReassign: [selected.assignmentIdentity],
  });
  assert.equal(divergedV1.accepted, true);
  assert.deepEqual(
    accepted(toLogProjectAggregateV1CompatibilityView(diverged.value)),
    divergedV1.value,
  );
  assert.deepEqual(
    domain.evaluatePhase1CompleteTemplateAssignments(diverged.value),
    evaluateCompleteTemplateAssignments(divergedV1.value),
  );
  assert.equal(encodePhase1LogProjectAggregate(v2).canonicalJson, before.canonicalJson);
});

test("all public BLD-016 helpers are total for hostile input and never execute accessors", () => {
  let getterCalls = 0;
  const hostile = Object.create(Object.prototype, {
    documentIdentity: {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      },
    },
  });
  const calls = [
    () => deriveProjectInputRevisionIdentity(hostile),
    () => deriveEmptyProjectInputContentDigest(Symbol("kind")),
    () => createProjectInputRevisionHandle(hostile),
    () => createEmptyProjectInputRevisionHandle("\ud800", Symbol("kind")),
    () => createEmptyPhase1LogProject(hostile),
    () => decodePhase1LogProjectAggregate(hostile),
    () => encodePhase1LogProjectAggregate(hostile),
    () => migrateLogProjectAggregateV1ToPhase1V2(hostile),
    () => toLogProjectAggregateV1CompatibilityView(hostile),
    () => getProjectInputRevisionHandle(hostile, Symbol("kind")),
    () => inspectPhase1ProjectAvailability(hostile),
    () => replacePhase1SharedEmbeddedTemplateRepresentation(hostile, hostile),
    () => divergePhase1EmbeddedTemplateRepresentation(hostile, hostile),
  ];
  for (const call of calls) assert.doesNotThrow(call);
  assert.equal(getterCalls, 0);
  assert.deepEqual(decodePhase1LogProjectAggregate(Object.create(null)), {
    accepted: false,
    code: "PHASE1_PROJECT_MISSING_FIELD",
  });
  assert.deepEqual(decodePhase1LogProjectAggregate({ [Symbol("x")]: 1 }), {
    accepted: false,
    code: "PHASE1_PROJECT_EXTRA_FIELD",
  });
  assert.deepEqual(deriveEmptyProjectInputContentDigest(Symbol("kind")), {
    accepted: false,
    code: "PHASE1_PROJECT_HANDLE_KIND_INVALID",
  });

  const callerOwned = clone(sourceBackedPhase1Project());
  const decoded = accepted(decodePhase1LogProjectAggregate(callerOwned));
  const retainedDigest = decoded.phase1Inputs.revisionHandles[0].contentDigest;
  callerOwned.phase1Inputs.revisionHandles[0].contentDigest = digestC;
  assert.equal(decoded.phase1Inputs.revisionHandles[0].contentDigest, retainedDigest);
  assertDeepFrozen(decoded);
});

test("bounded property model covers ownership, references, nested precedence, cycle/orphan parity", () => {
  assert.deepEqual(runBld016PropertyModel(), {
    seeds: [0x1600_0001, 0x1600_0002, 0x1600_0003],
    cases: 3_000,
    invariantsPerCase: 7,
    invariantEvaluations: 21_000,
  });
});

test("EP-PURE repeats the full vector transcript in three fresh processes twice", async () => {
  const runner = fileURLToPath(new URL("./helpers/run-bld-016-vectors.mjs", import.meta.url));
  const executions = await Promise.all(
    Array.from({ length: 3 }, () =>
      execFileAsync(process.execPath, [runner], {
        env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30 * 60 * 1_000,
      }),
    ),
  );
  for (const execution of executions) assert.equal(execution.stderr, "");
  const outputs = executions.map(({ stdout }) => stdout.trim());
  assert.equal(new Set(outputs).size, 1);
  const result = JSON.parse(outputs[0]);
  assert.equal(result.repetitions.length, 2);
  assert.equal(new Set(result.repetitions.map(({ digest }) => digest)).size, 1);
  for (const { transcript } of result.repetitions) {
    assert.equal(transcript.runtime.node, "v24.18.1");
    assert.equal(
      transcript.runtime.executableSha256,
      "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582",
    );
    assert.equal(transcript.runtime.locale, "en-US");
    assert.equal(transcript.runtime.timeZone, "UTC");
    assert.equal(transcript.property.cases, 3_000);
  }
});
