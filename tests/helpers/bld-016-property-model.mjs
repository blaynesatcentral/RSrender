import assert from "node:assert/strict";

import {
  decodeLogProjectAggregate,
  decodePhase1LogProjectAggregate,
  encodeLogProjectAggregate,
  evaluateCompleteTemplateAssignments,
  evaluatePhase1CompleteTemplateAssignments,
  getProjectInputRevisionHandle,
  PROJECT_INPUT_COLLECTION_KINDS,
  toLogProjectAggregateV1CompatibilityView,
} from "../../packages/domain/dist/index.js";
import {
  digestA,
  makeAssignment,
  makeEtr,
  makeGroup,
  makeMembership,
  withLogSet,
} from "./bld-009-fixtures.mjs";
import {
  bld016IterationsPerSeed,
  bld016PropertySeeds,
  emptyPhase1Project,
  migrateV1,
  withCurrentHandle,
} from "./bld-016-fixtures.mjs";

function digestFor(seed, index) {
  const hex = ((BigInt(seed) << 32n) | BigInt(index + 1)).toString(16).padStart(64, "0");
  return `sha256:${hex.slice(-64)}`;
}

export function runBld016PropertyModel() {
  let cases = 0;
  for (const seed of bld016PropertySeeds) {
    for (let index = 0; index < bld016IterationsPerSeed; index += 1) {
      const empty = emptyPhase1Project();
      const outer = makeGroup(empty, `urn:test:bld-016:property:group:${seed}:${index}:outer`);
      const inner = makeGroup(
        empty,
        `urn:test:bld-016:property:group:${seed}:${index}:inner`,
        outer.groupIdentity,
      );
      const groups = [outer, inner];
      const role = ["exploration", "nearest-group", "broader-group", "log-set"][index % 4];
      const membership = makeMembership(
        empty,
        `urn:test:bld-016:property:exploration:${seed}:${index}:${role}`,
        inner.groupIdentity,
      );
      const etr = makeEtr(
        empty,
        `urn:test:bld-016:property:template:${seed}:${index}:${role}`,
        digestA,
      );
      const scope =
        role === "exploration"
          ? { kind: "exploration", targetIdentity: membership.membershipIdentity }
          : role === "nearest-group"
            ? { kind: "group", targetIdentity: inner.groupIdentity }
            : role === "broader-group"
              ? { kind: "group", targetIdentity: outer.groupIdentity }
              : { kind: "log-set", targetIdentity: empty.logSet.logSetIdentity };
      const assignment = makeAssignment(
        empty,
        `urn:test:bld-016:property:assignment:${seed}:${index}:${role}`,
        scope,
        etr.embeddedTemplateRepresentationIdentity,
      );
      const v1 = withLogSet(toLogProjectAggregateV1CompatibilityView(empty).value, {
        groups,
        memberships: [membership],
        embeddedTemplateRepresentations: [etr],
        templateAssignments: [assignment],
      });
      const v2 = migrateV1(v1);

      // Ownership + cardinality.
      assert.equal(v2.phase1Inputs.revisionHandles.length, 7);
      assert.deepEqual(
        v2.phase1Inputs.revisionHandles.map((handle) => handle.collectionKind),
        PROJECT_INPUT_COLLECTION_KINDS,
      );
      assert.equal(
        v2.phase1Inputs.revisionHandles.every(
          (handle) => handle.ownerDocumentIdentity === v2.documentIdentity,
        ),
        true,
      );

      // Exact current reference + lookup.
      const kind = PROJECT_INPUT_COLLECTION_KINDS[index % PROJECT_INPUT_COLLECTION_KINDS.length];
      const current = withCurrentHandle(v2, kind, index + 1, digestFor(seed, index));
      const lookedUp = getProjectInputRevisionHandle(current, kind);
      assert.equal(lookedUp.accepted, true);
      if (lookedUp.accepted) assert.equal(lookedUp.value.projectRevision, index + 1);

      // Identity/compatibility and assignment acyclicity/outcome.
      const view = toLogProjectAggregateV1CompatibilityView(v2);
      assert.equal(view.accepted, true);
      if (!view.accepted) continue;
      assert.equal(encodeLogProjectAggregate(view.value).json, encodeLogProjectAggregate(v1).json);
      const v1Assignments = evaluateCompleteTemplateAssignments(v1);
      assert.deepEqual(evaluatePhase1CompleteTemplateAssignments(v2), v1Assignments);
      assert.equal(v1Assignments.complete, true);
      if (v1Assignments.complete) {
        const expectedOrigin =
          role === "exploration" ? "exploration" : role === "log-set" ? "log-set" : "group";
        assert.equal(v1Assignments.assignments[0].origin, expectedOrigin);
        assert.equal(v1Assignments.assignments[0].originTargetIdentity, scope.targetIdentity);
      }

      const cycleGroups = groups.map((group, groupIndex) =>
        groupIndex === 0 ? { ...group, parentGroupIdentity: inner.groupIdentity } : group,
      );
      const cycleV1 = withLogSet(v1, { groups: cycleGroups });
      const cycleV1Result = decodeLogProjectAggregate(cycleV1);
      const cycleV2Result = decodePhase1LogProjectAggregate({ ...v2, logSet: cycleV1.logSet });
      assert.deepEqual(cycleV1Result, { accepted: false, code: "GROUP_CYCLE" });
      assert.deepEqual(cycleV2Result, cycleV1Result);

      const orphanMemberships = [
        { ...membership, groupIdentity: `urn:test:bld-016:property:orphan:${seed}:${index}` },
      ];
      const orphanV1 = withLogSet(v1, { memberships: orphanMemberships });
      const orphanV1Result = decodeLogProjectAggregate(orphanV1);
      const orphanV2Result = decodePhase1LogProjectAggregate({ ...v2, logSet: orphanV1.logSet });
      assert.deepEqual(orphanV1Result, { accepted: false, code: "MEMBERSHIP_GROUP_ORPHANED" });
      assert.deepEqual(orphanV2Result, orphanV1Result);
      assert.equal(decodePhase1LogProjectAggregate(current).accepted, true);
      cases += 1;
    }
  }
  return Object.freeze({
    seeds: bld016PropertySeeds,
    cases,
    invariantsPerCase: 7,
    invariantEvaluations: cases * 7,
  });
}
