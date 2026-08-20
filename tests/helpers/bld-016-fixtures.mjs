import {
  createEmptyPhase1LogProject,
  createProjectInputRevisionHandle,
  decodePhase1LogProjectAggregate,
  encodeLogProjectAggregate,
  encodePhase1LogProjectAggregate,
  migrateLogProjectAggregateV1ToPhase1V2,
} from "../../packages/domain/dist/index.js";
import {
  digestA,
  emptyProject,
  fx01Project,
  fx07Project,
  makeAssignment,
  makeEtr,
  makeMembership,
} from "./bld-009-fixtures.mjs";
import { bld015Snapshot, bld015SourceContextIdentity } from "./bld-015-fixtures.mjs";

export const bld016FixtureRevisions = Object.freeze({
  emptyCompatibility: "BLD-009:empty-project@v1-to-bld-016-v2-r1",
  fx01Compatibility: "FX-01:one-exploration@r1-to-bld-016-v2-r1",
  fx07Compatibility: "FX-07:assignment-precedence@r1-to-bld-016-v2-r1",
  sourceBacked: "FX-01:bld-016-source-backed-project@r1",
});

export const bld016PropertySeeds = Object.freeze([0x1600_0001, 0x1600_0002, 0x1600_0003]);
export const bld016IterationsPerSeed = 1_000;
export const bld016GeneratorRevision = "bld-016-project-input-generator-v1";
export const bld016OracleRevision = "bld-016-project-input-oracle-v1";

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function requireAccepted(result) {
  if (!result.accepted) throw new Error(result.code);
  return result.value;
}

export function requireMigrated(result) {
  if (!result.migrated) throw new Error(result.code);
  return result.value;
}

export function migrateV1(project) {
  return requireMigrated(migrateLogProjectAggregateV1ToPhase1V2(project));
}

export function emptyPhase1Project() {
  return migrateV1(emptyProject());
}

export function compatibilityFixtures() {
  return Object.freeze([
    Object.freeze({
      revision: bld016FixtureRevisions.emptyCompatibility,
      v1: emptyProject(),
    }),
    Object.freeze({
      revision: bld016FixtureRevisions.fx01Compatibility,
      v1: fx01Project(),
    }),
    Object.freeze({
      revision: bld016FixtureRevisions.fx07Compatibility,
      v1: fx07Project(),
    }),
  ]);
}

export function currentHandle(project, collectionKind, projectRevision, contentDigest) {
  return requireAccepted(
    createProjectInputRevisionHandle({
      collectionKind,
      ownerDocumentIdentity: project.documentIdentity,
      state: "current",
      projectRevision,
      contentDigest,
    }),
  );
}

export function withCurrentHandle(project, collectionKind, projectRevision, contentDigest) {
  const replacement = currentHandle(project, collectionKind, projectRevision, contentDigest);
  return requireAccepted(
    decodePhase1LogProjectAggregate({
      ...project,
      phase1Inputs: {
        ...project.phase1Inputs,
        revisionHandles: project.phase1Inputs.revisionHandles.map((handle) =>
          handle.collectionKind === collectionKind ? replacement : handle,
        ),
      },
    }),
  );
}

export function sourceBackedPhase1Project() {
  const created = requireAccepted(
    createEmptyPhase1LogProject({
      documentIdentity: "urn:test:bld-016:document:source-backed",
      sourceContextIdentity: bld015SourceContextIdentity,
      sourceProjectIdentity: bld015Snapshot.sourceProjectIdentity,
    }),
  );
  const sourceExplorationIdentity = bld015Snapshot.explorations[0].providerNativeIdentity;
  const membership = makeMembership(created, sourceExplorationIdentity);
  const etr = makeEtr(created, "urn:test:bld-016:template:source-backed", digestA);
  const assignment = makeAssignment(
    created,
    "urn:test:bld-016:assignment:source-backed",
    { kind: "log-set", targetIdentity: created.logSet.logSetIdentity },
    etr.embeddedTemplateRepresentationIdentity,
  );
  return requireAccepted(
    decodePhase1LogProjectAggregate({
      ...created,
      logSet: {
        ...created.logSet,
        memberships: [membership],
        embeddedTemplateRepresentations: [etr],
        templateAssignments: [assignment],
      },
      phase1Inputs: {
        ...created.phase1Inputs,
        acceptedSourceSnapshot: bld015Snapshot,
      },
    }),
  );
}

export function compatibilityEncoding(projectV1, projectV2) {
  const v1 = encodeLogProjectAggregate(projectV1);
  const v2 = encodePhase1LogProjectAggregate(projectV2);
  if (!v1.accepted || !v2.accepted) throw new Error("compatibility encoding rejected");
  return Object.freeze({ v1: v1.json, v2: v2.canonicalJson, v2Digest: v2.digest });
}
