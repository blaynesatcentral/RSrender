import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import {
  createEmptyLogTemplate,
  decodeLogProjectAggregate,
  decodeLogTemplateAggregate,
  deriveBoringLogIdentity,
  deriveEmbeddedTemplateRepresentationIdentity,
  deriveExplorationMembershipIdentity,
  divergeEmbeddedTemplateRepresentation,
  encodeLogProjectAggregate,
  encodeLogTemplateAggregate,
  evaluateCompleteTemplateAssignments,
  replaceSharedEmbeddedTemplateRepresentation,
  resolveEffectiveTemplateAssignment,
} from "../packages/domain/dist/aggregate-skeleton.js";
import {
  digestA,
  digestB,
  digestC,
  emptyProject,
  fixtureRevisions,
  fx01Project,
  fx07Project,
  fx08MembershipPair,
  ids,
  makeAssignment,
  makeEtr,
  makeGroup,
  makeMembership,
  withLogSet,
} from "./helpers/bld-009-fixtures.mjs";

function expectRejected(value, code) {
  const result = decodeLogProjectAggregate(value);
  assert.deepEqual(result, { accepted: false, code });
}

test("empty authoring aggregates are scalar, strict, immutable, and canonical", () => {
  const project = emptyProject();
  assert.equal(project.aggregateKind, "log-project");
  assert.equal(Array.isArray(project.logSet), false);
  assert.equal(Object.isFrozen(project), true);
  assert.equal(Object.isFrozen(project.logSet), true);
  assert.deepEqual(evaluateCompleteTemplateAssignments(project), {
    complete: true,
    assignments: [],
  });

  const template = createEmptyLogTemplate({
    documentIdentity: "urn:test:bld-009:document:template",
    templateIdentity: ids.templateA,
    currentContentDigest: digestA,
  });
  assert.equal(template.accepted, true);
  if (!template.accepted) return;
  const encodedTemplate = encodeLogTemplateAggregate(template.value);
  assert.equal(encodedTemplate.accepted, true);
  if (encodedTemplate.accepted) {
    assert.deepEqual(decodeLogTemplateAggregate(encodedTemplate.json), {
      accepted: false,
      code: "AGGREGATE_MALFORMED",
    });
    assert.deepEqual(decodeLogTemplateAggregate(JSON.parse(encodedTemplate.json)), template);
  }
  const encodedProject = encodeLogProjectAggregate(project);
  assert.equal(encodedProject.accepted, true);
  if (encodedProject.accepted) {
    assert.deepEqual(decodeLogProjectAggregate(JSON.parse(encodedProject.json)).value, project);
  }
});

test("structurally incomplete authoring projects remain valid but evaluation fails deterministically", () => {
  const project = emptyProject();
  const membership = makeMembership(project, "urn:test:bld-009:exploration:incomplete");
  const incomplete = withLogSet(project, { memberships: [membership] });
  assert.equal(decodeLogProjectAggregate(incomplete).accepted, true);
  assert.deepEqual(resolveEffectiveTemplateAssignment(incomplete, membership.membershipIdentity), {
    resolved: false,
    code: "TEMPLATE_ASSIGNMENT_MISSING",
    membershipIdentity: membership.membershipIdentity,
  });
  assert.deepEqual(evaluateCompleteTemplateAssignments(incomplete), {
    complete: false,
    code: "TEMPLATE_ASSIGNMENT_MISSING",
    membershipIdentity: membership.membershipIdentity,
  });
});

test("FX-01 resolves one exploration to exactly one log-set assignment and Boring Log", () => {
  assert.equal(fixtureRevisions.fx01, "FX-01:one-exploration@r1");
  const project = fx01Project();
  const result = evaluateCompleteTemplateAssignments(project);
  assert.equal(result.complete, true);
  if (!result.complete) return;
  assert.equal(result.assignments.length, 1);
  const membership = project.logSet.memberships[0];
  assert.equal(result.assignments[0].origin, "log-set");
  assert.equal(result.assignments[0].inherited, true);
  assert.equal(
    result.assignments[0].boringLogIdentity,
    deriveBoringLogIdentity(project.documentIdentity, membership.membershipIdentity),
  );
});

test("FX-07 applies exploration, nearest group, ancestor group, then log-set precedence", () => {
  assert.equal(fixtureRevisions.fx07, "FX-07:assignment-precedence@r1");
  const project = fx07Project();
  const result = evaluateCompleteTemplateAssignments(project);
  assert.equal(result.complete, true);
  if (!result.complete) return;
  assert.equal(result.assignments.length, 4);
  assert.deepEqual(
    result.assignments.map(({ origin, inherited }) => [origin, inherited]),
    [
      ["exploration", false],
      ["group", true],
      ["group", true],
      ["log-set", true],
    ],
  );
  assert.equal(
    result.assignments[1].embeddedTemplateRepresentationIdentity,
    project.logSet.embeddedTemplateRepresentations[1].embeddedTemplateRepresentationIdentity,
  );
  assert.equal(
    result.assignments[2].embeddedTemplateRepresentationIdentity,
    project.logSet.embeddedTemplateRepresentations[0].embeddedTemplateRepresentationIdentity,
  );
});

test("shared ETR replacement rewrites all references without retaining template history", () => {
  const project = fx07Project();
  const source = project.logSet.embeddedTemplateRepresentations[0];
  const sourceAssignments = project.logSet.templateAssignments.filter(
    (assignment) =>
      assignment.embeddedTemplateRepresentationIdentity ===
      source.embeddedTemplateRepresentationIdentity,
  );
  assert.equal(sourceAssignments.length, 2);
  const result = replaceSharedEmbeddedTemplateRepresentation(project, {
    sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
    newEffectiveContentDigest: digestC,
  });
  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  const replacementIdentity = deriveEmbeddedTemplateRepresentationIdentity(
    project.documentIdentity,
    source.admittedTemplateIdentity,
    digestC,
  );
  assert.equal(
    result.value.logSet.embeddedTemplateRepresentations.some(
      (etr) =>
        etr.embeddedTemplateRepresentationIdentity ===
        source.embeddedTemplateRepresentationIdentity,
    ),
    false,
  );
  assert.equal(
    result.value.logSet.templateAssignments.filter(
      (assignment) => assignment.embeddedTemplateRepresentationIdentity === replacementIdentity,
    ).length,
    2,
  );
  assert.deepEqual(
    result.value.logSet.templateAssignments.map((assignment) => assignment.assignmentIdentity),
    project.logSet.templateAssignments.map((assignment) => assignment.assignmentIdentity),
  );
  assert.equal(JSON.stringify(result.value).includes("history"), false);
  assert.equal(JSON.stringify(result.value).includes("prior"), false);
});

test("explicit divergence creates a separate template and reassigns only selected scopes", () => {
  const project = fx07Project();
  const source = project.logSet.embeddedTemplateRepresentations[0];
  const selected = project.logSet.templateAssignments[1];
  const result = divergeEmbeddedTemplateRepresentation(project, {
    sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
    newAdmittedTemplateIdentity: "urn:test:bld-009:template:diverged",
    newEffectiveContentDigest: digestC,
    separationOperationIdentity: ids.separation,
    assignmentIdentitiesToReassign: [selected.assignmentIdentity],
  });
  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  const updated = result.value.logSet.templateAssignments.find(
    (assignment) => assignment.assignmentIdentity === selected.assignmentIdentity,
  );
  assert.notEqual(
    updated.embeddedTemplateRepresentationIdentity,
    source.embeddedTemplateRepresentationIdentity,
  );
  assert.equal(
    result.value.logSet.templateAssignments[0].embeddedTemplateRepresentationIdentity,
    source.embeddedTemplateRepresentationIdentity,
  );
  const newEtr = result.value.logSet.embeddedTemplateRepresentations.find(
    (etr) =>
      etr.embeddedTemplateRepresentationIdentity === updated.embeddedTemplateRepresentationIdentity,
  );
  assert.deepEqual(newEtr.origin, {
    kind: "separate-template",
    separationOperationIdentity: ids.separation,
  });
  assert.deepEqual(
    divergeEmbeddedTemplateRepresentation(project, {
      sourceEmbeddedTemplateRepresentationIdentity: source.embeddedTemplateRepresentationIdentity,
      newAdmittedTemplateIdentity: source.admittedTemplateIdentity,
      newEffectiveContentDigest: digestB,
      separationOperationIdentity: ids.separation,
      assignmentIdentitiesToReassign: [selected.assignmentIdentity],
    }),
    { accepted: false, code: "ETR_DIVERGENCE_INVALID" },
  );
});

test("strict aggregate invariants reject mismatches, orphans, ambiguity, cycles, and inferred fields", () => {
  const project = fx01Project();
  expectRejected({ ...project, displayName: "must not be inferred" }, "AGGREGATE_EXTRA_FIELD");
  expectRejected(
    { ...project, sourceContextIdentity: [ids.sourceContext] },
    "AGGREGATE_WRONG_TYPE",
  );
  expectRejected(
    { ...project, logSet: { ...project.logSet, logSetIdentity: "wrong" } },
    "LOG_SET_IDENTITY_MISMATCH",
  );
  const membership = project.logSet.memberships[0];
  expectRejected(
    withLogSet(project, {
      memberships: [{ ...membership, membershipIdentity: "wrong" }],
    }),
    "MEMBERSHIP_IDENTITY_MISMATCH",
  );
  expectRejected(
    withLogSet(project, { memberships: [membership, membership] }),
    "MEMBERSHIP_DUPLICATE_IDENTITY",
  );
  const orphanGroup = makeGroup(project, "urn:test:bld-009:group:orphan", "missing-parent");
  expectRejected(withLogSet(project, { groups: [orphanGroup] }), "GROUP_PARENT_ORPHANED");
  const groupA = makeGroup(project, "urn:test:bld-009:group:a");
  const groupB = makeGroup(project, "urn:test:bld-009:group:b", groupA.groupIdentity);
  const cyclicA = { ...groupA, parentGroupIdentity: groupB.groupIdentity };
  expectRejected(withLogSet(project, { groups: [cyclicA, groupB] }), "GROUP_CYCLE");
  expectRejected(
    withLogSet(project, {
      memberships: [{ ...membership, groupIdentity: "missing-group" }],
    }),
    "MEMBERSHIP_GROUP_ORPHANED",
  );
  const assignment = project.logSet.templateAssignments[0];
  expectRejected(
    withLogSet(project, {
      templateAssignments: [{ ...assignment, assignmentIdentity: "wrong" }],
    }),
    "ASSIGNMENT_IDENTITY_MISMATCH",
  );
  const duplicateScope = makeAssignment(
    project,
    "urn:test:bld-009:assignment:duplicate-scope",
    assignment.scope,
    assignment.embeddedTemplateRepresentationIdentity,
  );
  expectRejected(
    withLogSet(project, { templateAssignments: [assignment, duplicateScope] }),
    "TEMPLATE_ASSIGNMENT_AMBIGUOUS",
  );
  const orphanEtrAssignment = {
    ...assignment,
    embeddedTemplateRepresentationIdentity: "urn:test:bld-009:etr:missing",
  };
  expectRejected(
    withLogSet(project, { templateAssignments: [orphanEtrAssignment] }),
    "TEMPLATE_ASSIGNMENT_ETR_ORPHANED",
  );
});

test("separately addressable FX-08A/B preserve source-key identity across a bounded pair", () => {
  const project = emptyProject();
  const pair = fx08MembershipPair();
  assert.equal(pair.familyId, "FX-08");
  assert.equal(pair.acceptedBefore.fixtureId, "FX-08A");
  assert.equal(pair.acceptedBefore.fixtureRevision, "FX-08A:accepted-before@r1");
  assert.equal(pair.stagedAfter.fixtureId, "FX-08B");
  assert.equal(pair.stagedAfter.fixtureRevision, "FX-08B:staged-after@r1");
  const before = pair.acceptedBefore.memberships;
  const after = pair.stagedAfter.memberships;
  assert.equal(before[1].membershipIdentity, after[0].membershipIdentity);
  assert.equal(
    after[0].membershipIdentity,
    deriveExplorationMembershipIdentity(project.documentIdentity, "urn:test:bld-009:exploration:b"),
  );
  assert.notEqual(before[0].membershipIdentity, after[1].membershipIdentity);
});

test("same template with different content is a distinct ETR and no substitute is inferred", () => {
  const project = emptyProject();
  const a = makeEtr(project, ids.templateA, digestA);
  const b = makeEtr(project, ids.templateA, digestB);
  assert.notEqual(
    a.embeddedTemplateRepresentationIdentity,
    b.embeddedTemplateRepresentationIdentity,
  );
  assert.equal(
    decodeLogProjectAggregate(
      withLogSet(project, {
        embeddedTemplateRepresentations: [a, b],
      }),
    ).accepted,
    true,
  );
  assert.equal(JSON.stringify(project).includes("substitute"), false);
});

test("derived identity and canonical aggregate encodings repeat across fresh processes", () => {
  const script = fileURLToPath(new URL("./helpers/run-bld-009-vectors.mjs", import.meta.url));
  const outputs = [];
  for (let index = 0; index < 6; index += 1) {
    const run = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    outputs.push(run.stdout.trim());
  }
  assert.equal(new Set(outputs).size, 1);
  assert.match(outputs[0], /^sha256:[0-9a-f]{64}$/u);
});

test("3,000 seeded complete aggregate vectors preserve exactly one assignment per membership", () => {
  const seeds = [0x13579bdf, 0x2468ace0, 0x5eedb009];
  for (const seed of seeds) {
    for (let index = 0; index < 1_000; index += 1) {
      const project = emptyProject();
      const source = `urn:test:bld-009:exploration:${seed}:${index}`;
      const membership = makeMembership(project, source);
      const etr = makeEtr(project, ids.templateA, (index & 1) === 0 ? digestA : digestB);
      const assignment = makeAssignment(
        project,
        `urn:test:bld-009:assignment:${seed}:${index}`,
        { kind: "log-set", targetIdentity: project.logSet.logSetIdentity },
        etr.embeddedTemplateRepresentationIdentity,
      );
      const aggregate = withLogSet(project, {
        memberships: [membership],
        embeddedTemplateRepresentations: [etr],
        templateAssignments: [assignment],
      });
      const decoded = decodeLogProjectAggregate(aggregate);
      assert.equal(decoded.accepted, true);
      const complete = evaluateCompleteTemplateAssignments(aggregate);
      assert.equal(complete.complete, true);
      if (complete.complete) assert.equal(complete.assignments.length, 1);
    }
  }
});
