import assert from "node:assert/strict";
import test from "node:test";

import { validateBoringLogLayoutJobInput } from "../packages/contracts/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import { projectBoringLogSceneToSvg } from "../packages/renderer-ui/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const group = Object.freeze({
  groupNodeId: "node:user-group:header-company-lockup",
  semanticId: "user-group:header-company-lockup",
  parentNodeId: "node:region-header",
  childOccurrenceNodeIds: ["node:header-company", "node:header-company-subtitle"],
});

function job(groups) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-040-text-group@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: {
      ...structuredClone(boringLogMvpTemplate),
      textOccurrenceGroups: groups,
    },
  };
}

test("BLD-040 groups sibling text without changing geometry, measurement, or publication content", () => {
  const prepared = prepareBoringLogLayout(job([group]));
  assert.equal(prepared.accepted, true, prepared.contractCode);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true, measured.code);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true, resolved.contractCode);
  const page = resolved.value.pages[0];
  const groupNode = page.nodes.find(({ id }) => id === group.groupNodeId);
  const company = page.nodes.find(({ id }) => id === "node:header-company");
  const subtitle = page.nodes.find(({ id }) => id === "node:header-company-subtitle");
  const header = page.nodes.find(({ id }) => id === group.parentNodeId);
  assert.equal(groupNode.kind, "group");
  assert.equal(groupNode.role, "user-text-group");
  assert.deepEqual(groupNode.childIds, group.childOccurrenceNodeIds);
  assert.equal(company.kind, "text");
  assert.equal(subtitle.kind, "text");
  assert.equal(company.parentId, group.groupNodeId);
  assert.equal(subtitle.parentId, group.groupNodeId);
  assert.equal(header.kind, "group");
  assert.ok(header.childIds.includes(group.groupNodeId));
  assert.equal(header.childIds.includes(company.id), false);
  assert.equal(header.childIds.includes(subtitle.id), false);

  const screen = projectBoringLogSceneToSvg(resolved.value);
  const publication = projectBoringLogSceneForPublication(resolved.value);
  assert.equal(screen.accepted, true, screen.detail);
  assert.equal(publication.accepted, true, publication.code);
  for (const nodeId of [group.groupNodeId, company.id, subtitle.id]) {
    assert.match(screen.markup, new RegExp(`id="${nodeId}"`, "u"));
    assert.match(publication.projection.svgMarkup, new RegExp(`id="${nodeId}"`, "u"));
  }
});

test("BLD-040 rejects ambiguous group ownership and non-sibling children", () => {
  assert.equal(validateBoringLogLayoutJobInput(job([group, group])).accepted, false);
  assert.equal(
    validateBoringLogLayoutJobInput(
      job([
        group,
        {
          ...group,
          groupNodeId: "node:user-group:second",
          semanticId: "user-group:second",
        },
      ]),
    ).accepted,
    false,
  );
  const crossParent = {
    ...group,
    childOccurrenceNodeIds: ["node:header-company", "node:approval:signature"],
  };
  assert.deepEqual(prepareBoringLogLayout(job([crossParent])), {
    accepted: false,
    code: "BORING_LOG_LAYOUT_PLAN_REJECTED",
    contractCode: "BORING_LOG_LAYOUT_INTERNAL_INVARIANT",
  });
});
