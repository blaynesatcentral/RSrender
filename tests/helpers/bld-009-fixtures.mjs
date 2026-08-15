import {
  createEmptyLogProject,
  deriveEmbeddedTemplateRepresentationIdentity,
  deriveExplorationGroupIdentity,
  deriveExplorationMembershipIdentity,
  deriveTemplateAssignmentIdentity,
} from "../../packages/domain/dist/aggregate-skeleton.js";

export const fixtureRevisions = Object.freeze({
  fx01: "FX-01:one-exploration@r1",
  fx07: "FX-07:assignment-precedence@r1",
  fx08a: "FX-08A:accepted-before@r1",
  fx08b: "FX-08B:staged-after@r1",
});

export const digestA = `sha256:${"a".repeat(64)}`;
export const digestB = `sha256:${"b".repeat(64)}`;
export const digestC = `sha256:${"c".repeat(64)}`;

export const ids = Object.freeze({
  document: "urn:test:bld-009:document:1",
  sourceContext: "urn:test:bld-009:source-context:1",
  sourceProject: "urn:test:bld-009:source-project:1",
  templateA: "urn:test:bld-009:template:a",
  templateB: "urn:test:bld-009:template:b",
  templateC: "urn:test:bld-009:template:c",
  separation: "urn:test:bld-009:separation:1",
});

export function emptyProject() {
  const result = createEmptyLogProject({
    documentIdentity: ids.document,
    sourceContextIdentity: ids.sourceContext,
    sourceProjectIdentity: ids.sourceProject,
  });
  if (!result.accepted) throw new Error(`Empty project rejected: ${result.code}`);
  return result.value;
}

export function makeGroup(project, localGroupIdentity, parentGroupIdentity = null) {
  return Object.freeze({
    groupIdentity: deriveExplorationGroupIdentity(project.documentIdentity, localGroupIdentity),
    localGroupIdentity,
    parentGroupIdentity,
  });
}

export function makeMembership(project, sourceExplorationIdentity, groupIdentity = null) {
  return Object.freeze({
    membershipIdentity: deriveExplorationMembershipIdentity(
      project.documentIdentity,
      sourceExplorationIdentity,
    ),
    sourceExplorationIdentity,
    groupIdentity,
  });
}

export function makeEtr(project, admittedTemplateIdentity, effectiveContentDigest, origin) {
  return Object.freeze({
    embeddedTemplateRepresentationIdentity: deriveEmbeddedTemplateRepresentationIdentity(
      project.documentIdentity,
      admittedTemplateIdentity,
      effectiveContentDigest,
    ),
    admittedTemplateIdentity,
    effectiveContentDigest,
    origin: origin ?? Object.freeze({ kind: "admitted-template" }),
  });
}

export function makeAssignment(
  project,
  localAssignmentIdentity,
  scope,
  embeddedTemplateRepresentationIdentity,
) {
  return Object.freeze({
    assignmentIdentity: deriveTemplateAssignmentIdentity(
      project.documentIdentity,
      localAssignmentIdentity,
      scope,
    ),
    localAssignmentIdentity,
    scope: Object.freeze(scope),
    embeddedTemplateRepresentationIdentity,
  });
}

export function withLogSet(project, patch) {
  return {
    ...project,
    logSet: {
      ...project.logSet,
      ...patch,
    },
  };
}

export function fx01Project() {
  const project = emptyProject();
  const membership = makeMembership(project, "urn:test:bld-009:exploration:1");
  const etr = makeEtr(project, ids.templateA, digestA);
  const assignment = makeAssignment(
    project,
    "urn:test:bld-009:assignment:log-set",
    { kind: "log-set", targetIdentity: project.logSet.logSetIdentity },
    etr.embeddedTemplateRepresentationIdentity,
  );
  return withLogSet(project, {
    memberships: [membership],
    embeddedTemplateRepresentations: [etr],
    templateAssignments: [assignment],
  });
}

export function fx07Project() {
  const project = emptyProject();
  const outer = makeGroup(project, "urn:test:bld-009:group:outer");
  const inner = makeGroup(project, "urn:test:bld-009:group:inner", outer.groupIdentity);
  const exploration = makeMembership(
    project,
    "urn:test:bld-009:exploration:explicit",
    inner.groupIdentity,
  );
  const innerOnly = makeMembership(
    project,
    "urn:test:bld-009:exploration:inner",
    inner.groupIdentity,
  );
  const outerOnly = makeMembership(
    project,
    "urn:test:bld-009:exploration:outer",
    outer.groupIdentity,
  );
  const defaultOnly = makeMembership(project, "urn:test:bld-009:exploration:default");
  const defaultEtr = makeEtr(project, ids.templateA, digestA);
  const innerEtr = makeEtr(project, ids.templateB, digestB);
  const explicitEtr = makeEtr(project, ids.templateC, digestC);
  const assignments = [
    makeAssignment(
      project,
      "urn:test:bld-009:assignment:default",
      { kind: "log-set", targetIdentity: project.logSet.logSetIdentity },
      defaultEtr.embeddedTemplateRepresentationIdentity,
    ),
    makeAssignment(
      project,
      "urn:test:bld-009:assignment:outer",
      { kind: "group", targetIdentity: outer.groupIdentity },
      defaultEtr.embeddedTemplateRepresentationIdentity,
    ),
    makeAssignment(
      project,
      "urn:test:bld-009:assignment:inner",
      { kind: "group", targetIdentity: inner.groupIdentity },
      innerEtr.embeddedTemplateRepresentationIdentity,
    ),
    makeAssignment(
      project,
      "urn:test:bld-009:assignment:explicit",
      { kind: "exploration", targetIdentity: exploration.membershipIdentity },
      explicitEtr.embeddedTemplateRepresentationIdentity,
    ),
  ];
  return withLogSet(project, {
    groups: [outer, inner],
    memberships: [exploration, innerOnly, outerOnly, defaultOnly],
    embeddedTemplateRepresentations: [defaultEtr, innerEtr, explicitEtr],
    templateAssignments: assignments,
  });
}

export function fx08MembershipPair() {
  const project = emptyProject();
  const sourceKeys = ["a", "b", "c"].map((key) => `urn:test:bld-009:exploration:${key}`);
  return Object.freeze({
    familyId: "FX-08",
    acceptedBefore: Object.freeze({
      fixtureId: "FX-08A",
      fixtureRevision: fixtureRevisions.fx08a,
      memberships: Object.freeze(sourceKeys.slice(0, 2).map((key) => makeMembership(project, key))),
    }),
    stagedAfter: Object.freeze({
      fixtureId: "FX-08B",
      fixtureRevision: fixtureRevisions.fx08b,
      memberships: Object.freeze(sourceKeys.slice(1).map((key) => makeMembership(project, key))),
    }),
  });
}
