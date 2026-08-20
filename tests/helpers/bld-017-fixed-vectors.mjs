import assert from "node:assert/strict";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import {
  assembleBoundedOverrideRenderDataset,
  createDisplayValueOverride,
  createProjectInputRevisionHandle,
  decodePhase1LogProjectAggregate,
} from "../../packages/domain/dist/index.js";
import { bld015Snapshot } from "./bld-015-fixtures.mjs";
import {
  bld017OwnerDocumentIdentity,
  clone,
  makeAssemblyInput,
  makeCollection,
  makeOverride,
  makeOverrideDraft,
  makeRefreshedNameSnapshot,
  requireAccepted,
} from "./bld-017-fixtures.mjs";

function capture(label, input, expectedCode, expectedFactCode = null) {
  const beforeInputDigest = sha256CanonicalJson(input);
  const result = assembleBoundedOverrideRenderDataset(input);
  const repeated = assembleBoundedOverrideRenderDataset(input);
  assert.deepEqual(repeated, result);
  assert.equal(result.assembled, false);
  assert.equal(result.code, expectedCode);
  assert.equal(sha256CanonicalJson(input), beforeInputDigest);
  const fact = result.diagnostics[0] ?? null;
  assert.equal(fact?.code ?? null, expectedFactCode);
  return Object.freeze({
    label,
    code: result.code,
    factCode: fact?.code ?? null,
    factIdentity: fact?.diagnosticIdentity ?? null,
    factInputDigest: fact?.input.digest ?? null,
    affected: fact?.affected ?? null,
    beforeInputDigest,
    afterInputDigest: sha256CanonicalJson(input),
  });
}

function currentHandle(collectionKind, digit) {
  return requireAccepted(
    createProjectInputRevisionHandle({
      collectionKind,
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      state: "current",
      projectRevision: 1,
      contentDigest: `sha256:${digit.repeat(64)}`,
    }),
  );
}

function withOwnedHandle(input, handle) {
  input.phase1Project = requireAccepted(
    decodePhase1LogProjectAggregate({
      ...input.phase1Project,
      phase1Inputs: {
        ...input.phase1Project.phase1Inputs,
        revisionHandles: input.phase1Project.phase1Inputs.revisionHandles.map((candidate) =>
          candidate.collectionKind === handle.collectionKind ? handle : candidate,
        ),
      },
    }),
  );
  return input;
}

export function runBld017FixedFailureVectors() {
  const results = [];
  results.push(
    capture(
      "stale-baseline",
      makeAssemblyInput(
        makeCollection([makeOverride({ expectedSourceValueDigest: `sha256:${"f".repeat(64)}` })]),
      ),
      "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE",
      "OVERRIDE.BASELINE.STALE",
    ),
  );
  results.push(
    capture(
      "deleted-target",
      makeAssemblyInput(
        makeCollection([
          makeOverride({ targetSourceFieldIdentity: "urn:test:bld-017:source-field:deleted" }),
        ]),
      ),
      "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED",
      "OVERRIDE.TARGET.DELETED",
    ),
  );
  const retypedDraft = makeOverrideDraft();
  retypedDraft.expectedSourceValueType = "number";
  retypedDraft.replacementValue.content = { kind: "value", value: 7, originalRepresentation: "7" };
  results.push(
    capture(
      "retyped",
      makeAssemblyInput(
        makeCollection([requireAccepted(createDisplayValueOverride(retypedDraft))]),
      ),
      "BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT",
      "OVERRIDE.TYPE.CONFLICT",
    ),
  );
  const unitDraft = makeOverrideDraft();
  unitDraft.expectedSourceUnit = { state: "specified", quantity: "length", symbol: "m" };
  unitDraft.replacementValue.unit = unitDraft.expectedSourceUnit;
  results.push(
    capture(
      "unit",
      makeAssemblyInput(makeCollection([requireAccepted(createDisplayValueOverride(unitDraft))])),
      "BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT",
      "OVERRIDE.UNIT.CONFLICT",
    ),
  );
  results.push(
    capture(
      "context",
      makeAssemblyInput(
        makeCollection([
          makeOverride({ targetSourceContextIdentity: "urn:test:bld-017:source-context:other" }),
        ]),
      ),
      "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH",
      "OVERRIDE.CONTEXT.MISMATCH",
    ),
  );
  results.push(
    capture(
      "entity",
      makeAssemblyInput(
        makeCollection([
          makeOverride({
            targetSourceEntityIdentity: bld015Snapshot.samples[0].sourceEntityIdentity,
          }),
        ]),
      ),
      "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH",
      "OVERRIDE.ENTITY.MISMATCH",
    ),
  );
  for (const [axis, value] of [
    ["association", { state: "resolved", targetIdentity: "urn:test:bld-017:association:other" }],
    ["finality", { state: "final" }],
    ["eligibility", { state: "blocked", reasonCodes: ["policy"] }],
  ]) {
    const draft = makeOverrideDraft();
    draft.replacementValue[axis] = value;
    results.push(
      capture(
        `semantic-${axis}`,
        makeAssemblyInput(makeCollection([requireAccepted(createDisplayValueOverride(draft))])),
        "BOUNDED_OVERRIDE_ASSEMBLY_SEMANTIC_AXIS_CONFLICT",
        "OVERRIDE.SEMANTIC_AXIS.CONFLICT",
      ),
    );
  }
  const duplicate = makeAssemblyInput();
  duplicate.presentationOverrides.collection = {
    ...duplicate.presentationOverrides.collection,
    items: [
      duplicate.presentationOverrides.collection.items[0],
      makeOverride({ localOverrideIdentity: "urn:test:bld-017:fixed:duplicate" }),
    ],
  };
  results.push(
    capture(
      "duplicate-enabled",
      duplicate,
      "BOUNDED_OVERRIDE_ASSEMBLY_DUPLICATE_ENABLED_TARGET",
      "OVERRIDE.TARGET.DUPLICATE_ENABLED",
    ),
  );
  const multipleItems = [
    makeOverride(),
    makeOverride({
      localOverrideIdentity: "urn:test:bld-017:fixed:multiple",
      targetSourceFieldIdentity: "urn:test:bld-017:fixed:other-field",
    }),
  ].sort((left, right) =>
    left.targetSourceFieldIdentity < right.targetSourceFieldIdentity ? -1 : 1,
  );
  results.push(
    capture(
      "multiple-enabled",
      makeAssemblyInput(makeCollection(multipleItems)),
      "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_MULTIPLE_OVERRIDES",
      "OVERRIDE.BOUNDED_ASSEMBLER.MULTIPLE_UNSUPPORTED",
    ),
  );
  for (const [inputKey, kind, digit] of [
    ["supplementalSourcesHandle", "supplemental-sources", "d"],
    ["sourceResolutionDecisionsHandle", "source-resolution-decisions", "c"],
    ["sourceExtensionBindingsHandle", "source-extension-bindings", "b"],
  ]) {
    const input = makeAssemblyInput();
    input[inputKey] = currentHandle(kind, digit);
    withOwnedHandle(input, input[inputKey]);
    results.push(
      capture(`unsupported-${kind}`, input, "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT"),
    );
  }
  const wrongHandle = clone(makeAssemblyInput());
  wrongHandle.presentationOverrides.handle.contentDigest = `sha256:${"e".repeat(64)}`;
  results.push(
    capture(
      "presentation-handle-mismatch",
      wrongHandle,
      "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
    ),
  );

  let getterCalls = 0;
  const hostile = Object.create(Object.prototype, {
    phase1Project: {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("forbidden");
      },
    },
  });
  const hostileResult = assembleBoundedOverrideRenderDataset(hostile);
  assert.equal(getterCalls, 0);
  assert.deepEqual(hostileResult, {
    assembled: false,
    code: "BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED",
    diagnostics: [],
  });
  results.push(
    Object.freeze({
      label: "hostile-accessor",
      code: hostileResult.code,
      factCode: null,
      factIdentity: null,
      factInputDigest: null,
      affected: null,
      beforeInputDigest: null,
      afterInputDigest: null,
      getterCalls,
    }),
  );

  // Retain one actual accepted Refresh A/B changed-source conflict in every transcript.
  const changedSnapshot = makeRefreshedNameSnapshot({
    revision: 8,
    content: {
      kind: "value",
      value: "REFRESHED-CHANGED",
      originalRepresentation: "REFRESHED-CHANGED",
    },
  });
  results.push(
    capture(
      "refresh-a-b-changed-source",
      makeAssemblyInput(makeCollection(), changedSnapshot),
      "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE",
      "OVERRIDE.BASELINE.STALE",
    ),
  );
  return Object.freeze(results);
}
