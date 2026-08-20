import assert from "node:assert/strict";
import test from "node:test";

import {
  assembleBoundedOverrideRenderDataset,
  createDisplayValueOverride,
  createNextPresentationOverrideCollection,
  createPresentationOverrideCollection,
  createProjectInputRevisionHandle,
  decodeDisplayValueOverride,
  decodePhase1LogProjectAggregate,
  decodePresentationOverrideCollection,
  digestSourceBaselineValue,
  encodeDisplayValueOverride,
  encodePresentationOverrideCollection,
  encodeSourceSnapshot,
} from "../packages/domain/dist/index.js";
import { bld015ExplorationNameField, bld015Snapshot } from "./helpers/bld-015-fixtures.mjs";
import {
  bld017OwnerDocumentIdentity,
  clone,
  makeAssemblyInput,
  makeCollection,
  makeOverride,
  makeOverrideDraft,
  makeRefreshedNameSnapshot,
  requireAccepted,
} from "./helpers/bld-017-fixtures.mjs";
import { runBld017PropertyModel } from "./helpers/bld-017-property-model.mjs";

function assembled(result) {
  assert.equal(result.assembled, true);
  return result.value;
}

function assertAssemblyFailureUnchanged(input, code, factCode) {
  const before = JSON.stringify(input);
  const result = assembleBoundedOverrideRenderDataset(input);
  const repeated = assembleBoundedOverrideRenderDataset(input);
  assert.deepEqual(repeated, result);
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.assembled, false);
  assert.equal(result.code, code);
  if (factCode === undefined) return;
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].code, factCode);
  assert.equal(result.diagnostics[0].remediationActionIds.length > 0, true);
  return result;
}

test("override item and collection round-trip canonically with exact baseline, type, unit and provenance", () => {
  const item = makeOverride();
  const collection = makeCollection([item]);
  const encodedItem = encodeDisplayValueOverride(item);
  const encodedCollection = encodePresentationOverrideCollection(collection);
  assert.equal(encodedItem.accepted, true);
  assert.equal(encodedCollection.accepted, true);
  assert.deepEqual(decodeDisplayValueOverride(JSON.parse(encodedItem.canonicalJson)), {
    accepted: true,
    value: item,
  });
  assert.deepEqual(
    decodePresentationOverrideCollection(JSON.parse(encodedCollection.canonicalJson)),
    { accepted: true, value: collection },
  );
  assert.equal(item.targetSourceEntityIdentity, bld015ExplorationNameField.sourceEntityIdentity);
  assert.equal(item.replacementValue.provenance.provenanceClass, "override");
  assert.equal(
    item.replacementValue.provenance.expectedSourceValueDigest,
    requireAccepted(digestSourceBaselineValue(bld015ExplorationNameField.value)),
  );
});

test("zero-current collection keeps source original and effective value exact", () => {
  const collection = makeCollection([]);
  const before = encodeSourceSnapshot(bld015Snapshot);
  const dataset = assembled(assembleBoundedOverrideRenderDataset(makeAssemblyInput(collection)));
  const target = dataset.values.find(
    (value) => value.sourceFieldIdentity === bld015ExplorationNameField.sourceFieldIdentity,
  );
  assert.deepEqual(target.sourceOriginalValue, bld015ExplorationNameField.value);
  assert.deepEqual(target.effectiveDisplayValue, bld015ExplorationNameField.value);
  assert.deepEqual(target.application, { kind: "source" });
  assert.deepEqual(encodeSourceSnapshot(bld015Snapshot), before);
});

test("revision-zero empty presentation input is queryable and canonically distinct", () => {
  const emptyInput = makeAssemblyInput(null);
  const empty = assembled(assembleBoundedOverrideRenderDataset(emptyInput));
  const currentEmpty = assembled(
    assembleBoundedOverrideRenderDataset(makeAssemblyInput(makeCollection([]))),
  );
  assert.equal(empty.presentationOverrideState, "empty");
  assert.equal(empty.presentationOverrideProjectRevision, 0);
  assert.equal(empty.presentationOverrideCollectionIdentity, null);
  assert.equal(empty.presentationOverrideCollectionRevision, null);
  assert.equal(empty.presentationOverrideCollectionDigest, null);
  assert.equal(
    empty.presentationOverrideRevisionIdentity,
    emptyInput.presentationOverrides.handle.revisionIdentity,
  );
  assert.equal(
    empty.presentationOverrideContentDigest,
    emptyInput.presentationOverrides.handle.contentDigest,
  );
  assert.equal(currentEmpty.presentationOverrideState, "current");
  assert.equal(currentEmpty.presentationOverrideProjectRevision, 1);
  assert.equal(currentEmpty.presentationOverrideCollectionRevision, 1);
  assert.deepEqual(empty.values, currentEmpty.values);
  const sourceTarget = empty.values.find(
    (value) => value.sourceFieldIdentity === bld015ExplorationNameField.sourceFieldIdentity,
  );
  assert.deepEqual(sourceTarget.sourceOriginalValue, sourceTarget.effectiveDisplayValue);
  assert.deepEqual(sourceTarget.application, { kind: "source" });
  assert.notEqual(empty.logicalDigest, currentEmpty.logicalDigest);
  assert.notEqual(JSON.stringify(empty), JSON.stringify(currentEmpty));
  assert.deepEqual(assembleBoundedOverrideRenderDataset(makeAssemblyInput(null)), {
    assembled: true,
    value: empty,
  });
});

test("one applicable override replaces only effective display value and preserves source truth", () => {
  const input = makeAssemblyInput();
  const before = encodeSourceSnapshot(input.sourceSnapshot);
  const dataset = assembled(assembleBoundedOverrideRenderDataset(input));
  const target = dataset.values.find(
    (value) => value.sourceFieldIdentity === bld015ExplorationNameField.sourceFieldIdentity,
  );
  assert.deepEqual(target.sourceOriginalValue, bld015ExplorationNameField.value);
  assert.equal(target.effectiveDisplayValue.content.value, "SYNTHETIC-OVERRIDDEN-EXPLORATION");
  assert.equal(target.effectiveDisplayValue.provenance.provenanceClass, "override");
  assert.equal(target.application.kind, "display-value-override");
  const snapshotEncoding = encodeSourceSnapshot(input.sourceSnapshot);
  assert.equal(dataset.sourceSnapshotEncodingDigest, snapshotEncoding.digest);
  assert.equal(
    dataset.supplementalSourcesEmptyContentDigest,
    input.supplementalSourcesHandle.contentDigest,
  );
  assert.equal(
    dataset.sourceResolutionDecisionsEmptyContentDigest,
    input.sourceResolutionDecisionsHandle.contentDigest,
  );
  assert.equal(
    dataset.sourceExtensionBindingsEmptyContentDigest,
    input.sourceExtensionBindingsHandle.contentDigest,
  );
  assert.deepEqual(encodeSourceSnapshot(input.sourceSnapshot), before);
});

test("stale, deleted, retyped, incompatible-unit, entity and context states fail with exact facts", () => {
  const stale = makeCollection([
    makeOverride({ expectedSourceValueDigest: `sha256:${"f".repeat(64)}` }),
  ]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(stale),
    "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE",
    "OVERRIDE.BASELINE.STALE",
  );

  const deleted = makeCollection([
    makeOverride({ targetSourceFieldIdentity: "urn:test:bld-017:source-field:deleted" }),
  ]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(deleted),
    "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED",
    "OVERRIDE.TARGET.DELETED",
  );

  const retypedDraft = makeOverrideDraft();
  retypedDraft.expectedSourceValueType = "number";
  retypedDraft.replacementValue.content = {
    kind: "value",
    value: 7,
    originalRepresentation: "7",
  };
  const retyped = makeCollection([requireAccepted(createDisplayValueOverride(retypedDraft))]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(retyped),
    "BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT",
    "OVERRIDE.TYPE.CONFLICT",
  );

  const unitDraft = makeOverrideDraft();
  unitDraft.expectedSourceUnit = { state: "specified", quantity: "length", symbol: "m" };
  unitDraft.replacementValue.unit = unitDraft.expectedSourceUnit;
  const unit = makeCollection([requireAccepted(createDisplayValueOverride(unitDraft))]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(unit),
    "BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT",
    "OVERRIDE.UNIT.CONFLICT",
  );

  const entity = makeCollection([
    makeOverride({ targetSourceEntityIdentity: bld015Snapshot.samples[0].sourceEntityIdentity }),
  ]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(entity),
    "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH",
    "OVERRIDE.ENTITY.MISMATCH",
  );

  const context = makeCollection([
    makeOverride({ targetSourceContextIdentity: "urn:test:bld-017:source-context:other" }),
  ]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(context),
    "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH",
    "OVERRIDE.CONTEXT.MISMATCH",
  );

  const semanticDraft = makeOverrideDraft();
  semanticDraft.replacementValue.eligibility = {
    state: "blocked",
    reasonCodes: ["policy"],
  };
  const semantic = makeCollection([requireAccepted(createDisplayValueOverride(semanticDraft))]);
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(semantic),
    "BOUNDED_OVERRIDE_ASSEMBLY_SEMANTIC_AXIS_CONFLICT",
    "OVERRIDE.SEMANTIC_AXIS.CONFLICT",
  );

  for (const [axis, value] of [
    ["association", { state: "resolved", targetIdentity: "urn:test:bld-017:association:other" }],
    ["finality", { state: "final" }],
  ]) {
    const draft = makeOverrideDraft();
    draft.replacementValue[axis] = value;
    assertAssemblyFailureUnchanged(
      makeAssemblyInput(makeCollection([requireAccepted(createDisplayValueOverride(draft))])),
      "BOUNDED_OVERRIDE_ASSEMBLY_SEMANTIC_AXIS_CONFLICT",
      "OVERRIDE.SEMANTIC_AXIS.CONFLICT",
    );
  }
});

test("accepted Snapshot refresh A/B vectors detect changed, deleted, retyped and unit conflicts", () => {
  const collection = makeCollection();
  const provenanceOnly = makeRefreshedNameSnapshot({ revision: 1 });
  assert.equal(
    assembleBoundedOverrideRenderDataset(makeAssemblyInput(collection, provenanceOnly)).assembled,
    true,
  );

  const changed = makeRefreshedNameSnapshot({
    revision: 2,
    content: { kind: "value", value: "CHANGED-SOURCE", originalRepresentation: "CHANGED-SOURCE" },
  });
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(collection, changed),
    "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE",
    "OVERRIDE.BASELINE.STALE",
  );
  const totalDepth = bld015Snapshot.explorations[0].fields.find(
    (field) => field.fieldPath === "mapped:/totalDepth",
  );
  const deletedCollection = makeCollection([
    makeOverride({
      sourceField: totalDepth,
      localOverrideIdentity: "urn:test:bld-017:local-override:total-depth",
      replacementContent: { kind: "value", value: 9.5, originalRepresentation: "9.5" },
    }),
  ]);
  const deleted = makeRefreshedNameSnapshot({
    revision: 3,
    sourceField: totalDepth,
    omitName: true,
  });
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(deletedCollection, deleted),
    "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED",
    "OVERRIDE.TARGET.DELETED",
  );
  const retyped = makeRefreshedNameSnapshot({
    revision: 4,
    content: { kind: "value", value: 4, originalRepresentation: "4" },
  });
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(collection, retyped),
    "BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT",
    "OVERRIDE.TYPE.CONFLICT",
  );
  const changedUnit = makeRefreshedNameSnapshot({
    revision: 5,
    unit: { state: "specified", quantity: "length", symbol: "m" },
  });
  assertAssemblyFailureUnchanged(
    makeAssemblyInput(collection, changedUnit),
    "BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT",
    "OVERRIDE.UNIT.CONFLICT",
  );
});

test("collection rejects duplicate enabled targets, duplicate identities and noncanonical order", () => {
  const first = makeOverride();
  const second = makeOverride({
    localOverrideIdentity: "urn:test:bld-017:local-override:second",
  });
  assert.deepEqual(
    createPresentationOverrideCollection({
      collectionVersion: 1,
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      projectRevision: 1,
      items: [first, second],
    }),
    { accepted: false, code: "PRESENTATION_OVERRIDE_COLLECTION_DUPLICATE_ENABLED_TARGET" },
  );
  assert.deepEqual(
    createPresentationOverrideCollection({
      collectionVersion: 1,
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      projectRevision: 1,
      items: [
        { ...first, enabled: false },
        { ...first, enabled: false },
      ],
    }),
    { accepted: false, code: "DISPLAY_VALUE_OVERRIDE_IDENTITY_MISMATCH" },
  );
  const other = makeOverride({
    enabled: false,
    localOverrideIdentity: "urn:test:bld-017:local-override:ordered",
    targetSourceFieldIdentity: "urn:test:bld-017:source-field:ordered",
  });
  const ordered = [first, other].sort((left, right) =>
    left.targetSourceFieldIdentity < right.targetSourceFieldIdentity ? -1 : 1,
  );
  assert.equal(makeCollection(ordered).items.length, 2);
  assert.deepEqual(
    createPresentationOverrideCollection({
      collectionVersion: 1,
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      projectRevision: 1,
      items: [...ordered].reverse(),
    }),
    { accepted: false, code: "PRESENTATION_OVERRIDE_COLLECTION_ORDER_MISMATCH" },
  );
});

test("bounded assembler rejects more than one enabled override even for distinct targets", () => {
  const items = [
    makeOverride(),
    makeOverride({
      localOverrideIdentity: "urn:test:bld-017:local-override:second-enabled",
      targetSourceFieldIdentity: "urn:test:bld-017:source-field:second-enabled",
    }),
  ].sort((left, right) =>
    left.targetSourceFieldIdentity < right.targetSourceFieldIdentity ? -1 : 1,
  );
  const collection = makeCollection(items);
  const failure = assertAssemblyFailureUnchanged(
    makeAssemblyInput(collection),
    "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_MULTIPLE_OVERRIDES",
    "OVERRIDE.BOUNDED_ASSEMBLER.MULTIPLE_UNSUPPORTED",
  );
  assert.deepEqual(failure.diagnostics[0].affected, {
    identityKind: "PresentationOverrideCollectionIdentity",
    identity: collection.collectionIdentity,
  });
});

test("bounded assembler preserves duplicate-enabled target taxonomy and Diagnostic", () => {
  const input = makeAssemblyInput();
  const first = input.presentationOverrides.collection.items[0];
  const second = makeOverride({
    localOverrideIdentity: "urn:test:bld-017:local-override:duplicate-assembly",
  });
  input.presentationOverrides.collection = {
    ...input.presentationOverrides.collection,
    items: [first, second],
  };
  const firstFailure = assertAssemblyFailureUnchanged(
    input,
    "BOUNDED_OVERRIDE_ASSEMBLY_DUPLICATE_ENABLED_TARGET",
    "OVERRIDE.TARGET.DUPLICATE_ENABLED",
  );

  const firstFact = firstFailure.diagnostics[0];
  assert.deepEqual(firstFact.affected, {
    identityKind: "SourceSnapshotIdentity",
    identity: input.sourceSnapshot.snapshotIdentity,
  });
  const distinct = makeAssemblyInput();
  distinct.presentationOverrides.collection = {
    ...distinct.presentationOverrides.collection,
    items: [
      distinct.presentationOverrides.collection.items[0],
      makeOverride({ localOverrideIdentity: "urn:test:bld-017:local-override:duplicate-distinct" }),
    ],
  };
  const secondFact = assertAssemblyFailureUnchanged(
    distinct,
    "BOUNDED_OVERRIDE_ASSEMBLY_DUPLICATE_ENABLED_TARGET",
    "OVERRIDE.TARGET.DUPLICATE_ENABLED",
  ).diagnostics[0];
  assert.notEqual(firstFact.input.digest, secondFact.input.digest);
  // BLD-014 Diagnostic Identity is stable across changed input digests for the same cause.
  assert.equal(firstFact.diagnosticIdentity, secondFact.diagnosticIdentity);
});

test("pure next collection enforces new, unchanged and edited item revision semantics", () => {
  const prior = makeCollection([makeOverride()], 1);
  const unchanged = createNextPresentationOverrideCollection({
    previousCollection: prior,
    items: prior.items,
  });
  assert.equal(unchanged.accepted, true);
  assert.equal(unchanged.value.projectRevision, 2);
  assert.equal(unchanged.value.items[0].overrideRevision, 1);

  const editedDraft = makeOverrideDraft({ overrideRevision: 2, replacementText: "EDITED" });
  const edited = createNextPresentationOverrideCollection({
    previousCollection: prior,
    items: [requireAccepted(createDisplayValueOverride(editedDraft))],
  });
  assert.equal(edited.accepted, true);
  assert.equal(edited.value.items[0].overrideRevision, 2);

  const reusedRevision = makeOverride({ replacementText: "EDITED" });
  assert.deepEqual(
    createNextPresentationOverrideCollection({
      previousCollection: prior,
      items: [reusedRevision],
    }),
    { accepted: false, code: "DISPLAY_VALUE_OVERRIDE_REVISION_INVALID" },
  );
});

test("presentation handle and explicit unsupported input handles fail closed", () => {
  const input = makeAssemblyInput();
  const wrongPresentation = clone(input);
  wrongPresentation.presentationOverrides.handle.contentDigest = `sha256:${"e".repeat(64)}`;
  assertAssemblyFailureUnchanged(
    wrongPresentation,
    "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
  );

  const nonempty = clone(input);
  nonempty.supplementalSourcesHandle = requireAccepted(
    createProjectInputRevisionHandle({
      collectionKind: "supplemental-sources",
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      state: "current",
      projectRevision: 1,
      contentDigest: `sha256:${"d".repeat(64)}`,
    }),
  );
  nonempty.phase1Project = requireAccepted(
    decodePhase1LogProjectAggregate({
      ...nonempty.phase1Project,
      phase1Inputs: {
        ...nonempty.phase1Project.phase1Inputs,
        revisionHandles: nonempty.phase1Project.phase1Inputs.revisionHandles.map((handle) =>
          handle.collectionKind === "supplemental-sources"
            ? nonempty.supplementalSourcesHandle
            : handle,
        ),
      },
    }),
  );
  assertAssemblyFailureUnchanged(nonempty, "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT");

  for (const [inputKey, collectionKind, digit] of [
    ["sourceResolutionDecisionsHandle", "source-resolution-decisions", "c"],
    ["sourceExtensionBindingsHandle", "source-extension-bindings", "b"],
  ]) {
    const active = clone(input);
    active[inputKey] = requireAccepted(
      createProjectInputRevisionHandle({
        collectionKind,
        ownerDocumentIdentity: bld017OwnerDocumentIdentity,
        state: "current",
        projectRevision: 1,
        contentDigest: `sha256:${digit.repeat(64)}`,
      }),
    );
    active.phase1Project = requireAccepted(
      decodePhase1LogProjectAggregate({
        ...active.phase1Project,
        phase1Inputs: {
          ...active.phase1Project.phase1Inputs,
          revisionHandles: active.phase1Project.phase1Inputs.revisionHandles.map((handle) =>
            handle.collectionKind === collectionKind ? active[inputKey] : handle,
          ),
        },
      }),
    );
    assertAssemblyFailureUnchanged(active, "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT");
  }

  const revisionTwo = makeAssemblyInput(makeCollection([], 2));
  revisionTwo.phase1Project = input.phase1Project;
  assertAssemblyFailureUnchanged(
    revisionTwo,
    "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
  );
});

test("freeform, page-range and data-track handles are deliberate nondependencies", () => {
  const baselineInput = makeAssemblyInput();
  const baseline = assembled(assembleBoundedOverrideRenderDataset(baselineInput));
  const nondependencyKinds = [
    "freeform-annotations",
    "page-range-configuration",
    "data-track-configuration",
  ];
  const replacements = new Map(
    nondependencyKinds.map((collectionKind, index) => [
      collectionKind,
      requireAccepted(
        createProjectInputRevisionHandle({
          collectionKind,
          ownerDocumentIdentity: bld017OwnerDocumentIdentity,
          state: "current",
          projectRevision: index + 1,
          contentDigest: `sha256:${String(index + 1).repeat(64)}`,
        }),
      ),
    ]),
  );
  const changedInput = clone(baselineInput);
  changedInput.phase1Project = requireAccepted(
    decodePhase1LogProjectAggregate({
      ...baselineInput.phase1Project,
      phase1Inputs: {
        ...baselineInput.phase1Project.phase1Inputs,
        revisionHandles: baselineInput.phase1Project.phase1Inputs.revisionHandles.map(
          (handle) => replacements.get(handle.collectionKind) ?? handle,
        ),
      },
    }),
  );
  const changed = assembled(assembleBoundedOverrideRenderDataset(changedInput));
  assert.equal(JSON.stringify(changed), JSON.stringify(baseline));
  for (const kind of nondependencyKinds) {
    assert.equal(JSON.stringify(changed).includes(kind), false);
  }
});

test("hostile boundaries are total, accessor-safe, immutable and detached", () => {
  let getterCalls = 0;
  const hostile = Object.create(Object.prototype, {
    sourceSnapshot: {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      },
    },
  });
  const calls = [
    () => createDisplayValueOverride(hostile),
    () => decodeDisplayValueOverride(hostile),
    () => createPresentationOverrideCollection(hostile),
    () => decodePresentationOverrideCollection(hostile),
    () => createNextPresentationOverrideCollection(hostile),
    () => assembleBoundedOverrideRenderDataset(hostile),
    () => digestSourceBaselineValue(hostile),
  ];
  for (const call of calls) assert.doesNotThrow(call);
  assert.equal(getterCalls, 0);
  assert.deepEqual(digestSourceBaselineValue(makeOverride().replacementValue), {
    accepted: false,
    code: "DISPLAY_VALUE_OVERRIDE_WRONG_TYPE",
  });

  const caller = clone(makeCollection());
  const decoded = requireAccepted(decodePresentationOverrideCollection(caller));
  caller.items[0].reason = "mutated";
  assert.equal(decoded.items[0].reason, "Synthetic presentation replacement");
  assert.equal(Object.isFrozen(decoded), true);
  assert.equal(Object.isFrozen(decoded.items), true);
  assert.equal(Object.isFrozen(decoded.items[0]), true);

  const assembledDataset = assembled(assembleBoundedOverrideRenderDataset(makeAssemblyInput()));
  const visit = (value) => {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) visit(child);
  };
  visit(assembledDataset);
  const rawAssemblyInput = clone(makeAssemblyInput());
  const detachedDataset = assembled(assembleBoundedOverrideRenderDataset(rawAssemblyInput));
  const detachedDigest = detachedDataset.logicalDigest;
  rawAssemblyInput.sourceSnapshot.explorations[0].fields[0].value.content.value = "MUTATED";
  rawAssemblyInput.presentationOverrides.collection.items[0].replacementValue.content.value =
    "MUTATED";
  assert.equal(detachedDataset.logicalDigest, detachedDigest);
  assert.equal(
    detachedDataset.values.find(
      (value) => value.sourceFieldIdentity === bld015ExplorationNameField.sourceFieldIdentity,
    ).effectiveDisplayValue.content.value,
    "SYNTHETIC-OVERRIDDEN-EXPLORATION",
  );
  const forbidden = new Set([
    "severity",
    "suppressed",
    "suppression",
    "acknowledged",
    "acknowledgement",
    "publication",
    "publicationState",
    "policy",
    "ui",
    "displayMessage",
  ]);
  const scanKeys = (value) => {
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.has(key), false);
      scanKeys(child);
    }
  };
  const diagnosticFailure = assembleBoundedOverrideRenderDataset(
    makeAssemblyInput(
      makeCollection([makeOverride({ expectedSourceValueDigest: `sha256:${"a".repeat(64)}` })]),
    ),
  );
  assert.equal(diagnosticFailure.assembled, false);
  scanKeys(diagnosticFailure.diagnostics);
});

test("bounded property model covers target, baseline, type, unit, provenance, immutability and determinism", () => {
  assert.deepEqual(runBld017PropertyModel(), {
    seeds: [0x1700_0001, 0x1700_0002, 0x1700_0003],
    cases: 3_000,
    invariantsPerCase: 10,
    invariantEvaluations: 30_000,
    outcomes: {
      assembled: 999,
      BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE: 501,
      BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT: 501,
      BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT: 501,
      BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED: 498,
    },
  });
});
