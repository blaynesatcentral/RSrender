import {
  createDisplayValueOverride,
  createEmptyPhase1LogProject,
  createEmptyProjectInputRevisionHandle,
  createPresentationOverrideCollection,
  createProjectInputRevisionHandle,
  createSourceRecord,
  createSourceFieldRecord,
  createSourceSnapshot,
  decodePhase1LogProjectAggregate,
  derivePresentationOverrideIdentity,
  digestSourceBaselineValue,
  displayValueTypeOf,
} from "../../packages/domain/dist/index.js";
import { bld015ExplorationNameField, bld015Snapshot } from "./bld-015-fixtures.mjs";

export const bld017FixtureRevision = "FX-05:bld-017-display-override@r1";
export const bld017PropertySeeds = Object.freeze([0x1700_0001, 0x1700_0002, 0x1700_0003]);
export const bld017IterationsPerSeed = 1_000;
export const bld017OwnerDocumentIdentity = "urn:test:bld-017:document:1";
export const bld017RecordedAtUtc = "2026-08-20T15:30:00.000Z";

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceSnapshotDraft(snapshot) {
  const draft = clone(snapshot);
  delete draft.blockedCapabilities;
  delete draft.diagnostics;
  delete draft.logicalDigest;
  delete draft.snapshotIdentity;
  return draft;
}

export function requireAccepted(result) {
  if (!result.accepted) throw new Error(result.code);
  return result.value;
}

export function makeOverrideDraft(changes = {}) {
  const sourceField = changes.sourceField ?? bld015ExplorationNameField;
  const localOverrideIdentity =
    changes.localOverrideIdentity ?? "urn:test:bld-017:local-override:name";
  const presentationOverrideIdentity = requireAccepted(
    derivePresentationOverrideIdentity({
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      localOverrideIdentity,
    }),
  );
  const baselineDigest = requireAccepted(digestSourceBaselineValue(sourceField.value));
  const overrideRevision = changes.overrideRevision ?? 1;
  const recordedAtUtc = changes.recordedAtUtc ?? bld017RecordedAtUtc;
  const targetSourceFieldIdentity =
    changes.targetSourceFieldIdentity ?? sourceField.sourceFieldIdentity;
  const replacementValue = {
    ...sourceField.value,
    content: changes.replacementContent ?? {
      kind: "value",
      value: changes.replacementText ?? "SYNTHETIC-OVERRIDDEN-EXPLORATION",
      originalRepresentation: changes.replacementText ?? "SYNTHETIC-OVERRIDDEN-EXPLORATION",
    },
    provenance: {
      provenanceClass: "override",
      presentationOverrideIdentity,
      sourceFieldIdentity: targetSourceFieldIdentity,
      expectedSourceValueDigest: changes.expectedSourceValueDigest ?? baselineDigest,
      overrideRevision,
      recordedAtUtc,
      basisCodes: ["presentation-override"],
      transformations: [],
    },
  };
  return {
    overrideVersion: 1,
    ownerDocumentIdentity: bld017OwnerDocumentIdentity,
    localOverrideIdentity,
    targetSourceContextIdentity:
      changes.targetSourceContextIdentity ?? bld015Snapshot.sourceContextIdentity,
    targetSourceEntityIdentity:
      changes.targetSourceEntityIdentity ?? sourceField.sourceEntityIdentity,
    targetSourceFieldIdentity,
    expectedSourceValueDigest: changes.expectedSourceValueDigest ?? baselineDigest,
    expectedSourceValueType:
      changes.expectedSourceValueType ?? requireAccepted(displayValueTypeOf(sourceField.value)),
    expectedSourceUnit: changes.expectedSourceUnit ?? sourceField.value.unit,
    replacementValue: changes.replacementValue ?? replacementValue,
    overrideRevision,
    enabled: changes.enabled ?? true,
    reason: changes.reason ?? "Synthetic presentation replacement",
    authorIdentity: changes.authorIdentity ?? "urn:test:bld-017:author:1",
    recordedAtUtc,
  };
}

export function makeOverride(changes = {}) {
  return requireAccepted(createDisplayValueOverride(makeOverrideDraft(changes)));
}

export function makeCollection(items = [makeOverride()], projectRevision = 1) {
  return requireAccepted(
    createPresentationOverrideCollection({
      collectionVersion: 1,
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      projectRevision,
      items,
    }),
  );
}

export function makeCurrentOverrideHandle(collection) {
  return requireAccepted(
    createProjectInputRevisionHandle({
      collectionKind: "presentation-overrides",
      ownerDocumentIdentity: bld017OwnerDocumentIdentity,
      state: "current",
      projectRevision: collection.projectRevision,
      contentDigest: collection.logicalDigest,
    }),
  );
}

export function makeEmptyHandle(collectionKind) {
  return requireAccepted(
    createEmptyProjectInputRevisionHandle(bld017OwnerDocumentIdentity, collectionKind),
  );
}

export function makeAssemblyInput(collection = makeCollection(), sourceSnapshot = bld015Snapshot) {
  const presentationOverrideHandle =
    collection === null
      ? makeEmptyHandle("presentation-overrides")
      : makeCurrentOverrideHandle(collection);
  const supplementalSourcesHandle = makeEmptyHandle("supplemental-sources");
  const sourceResolutionDecisionsHandle = makeEmptyHandle("source-resolution-decisions");
  const sourceExtensionBindingsHandle = makeEmptyHandle("source-extension-bindings");
  const emptyProject = requireAccepted(
    createEmptyPhase1LogProject({
      documentIdentity: bld017OwnerDocumentIdentity,
      sourceContextIdentity: sourceSnapshot.sourceContextIdentity,
      sourceProjectIdentity: sourceSnapshot.sourceProjectIdentity,
    }),
  );
  const replacementHandles = new Map(
    [
      presentationOverrideHandle,
      supplementalSourcesHandle,
      sourceResolutionDecisionsHandle,
      sourceExtensionBindingsHandle,
    ].map((handle) => [handle.collectionKind, handle]),
  );
  const phase1Project = requireAccepted(
    decodePhase1LogProjectAggregate({
      ...emptyProject,
      phase1Inputs: {
        acceptedSourceSnapshot: sourceSnapshot,
        revisionHandles: emptyProject.phase1Inputs.revisionHandles.map(
          (handle) => replacementHandles.get(handle.collectionKind) ?? handle,
        ),
      },
    }),
  );
  return {
    phase1Project,
    sourceSnapshot,
    presentationOverrides:
      collection === null
        ? { state: "empty", handle: presentationOverrideHandle }
        : { state: "current", handle: presentationOverrideHandle, collection },
    supplementalSourcesHandle,
    sourceResolutionDecisionsHandle,
    sourceExtensionBindingsHandle,
  };
}

export function makeRefreshedSnapshot({ candidateIdentity, acceptedAtUtc, explorationFields }) {
  const draft = sourceSnapshotDraft(bld015Snapshot);
  const exploration = bld015Snapshot.explorations[0];
  const refreshedExploration = requireAccepted(
    createSourceRecord({
      recordVersion: exploration.recordVersion,
      entityKind: exploration.entityKind,
      sourceContextIdentity: exploration.sourceContextIdentity,
      providerNativeIdentity: exploration.providerNativeIdentity,
      parentEntityIdentity: exploration.parentEntityIdentity,
      relatedEntityIdentity: exploration.relatedEntityIdentity,
      sourceOrder: exploration.sourceOrder,
      fields: explorationFields,
      lookupReferences: exploration.lookupReferences,
      fieldTestColumns: exploration.fieldTestColumns,
      extensionObservations: exploration.extensionObservations,
    }),
  );
  const result = createSourceSnapshot({
    ...draft,
    candidateIdentity,
    acceptedAtUtc,
    explorations: [refreshedExploration],
  });
  return requireAccepted(result);
}

export function makeRefreshedNameSnapshot({
  revision,
  sourceField = bld015ExplorationNameField,
  content = sourceField.value.content,
  unit = sourceField.value.unit,
  omitName = false,
  retrievedAtUtc = `2026-08-20T16:${String(revision).padStart(2, "0")}:00.000Z`,
}) {
  const exploration = bld015Snapshot.explorations[0];
  const replacement = requireAccepted(
    createSourceFieldRecord({
      fieldVersion: sourceField.fieldVersion,
      sourceContextIdentity: sourceField.sourceContextIdentity,
      sourceEntityIdentity: sourceField.sourceEntityIdentity,
      fieldPath: sourceField.fieldPath,
      value: {
        ...sourceField.value,
        content,
        unit,
        provenance: {
          ...sourceField.value.provenance,
          retrievedAtUtc,
        },
      },
    }),
  );
  const explorationFields = exploration.fields.flatMap((field) =>
    field.sourceFieldIdentity === sourceField.sourceFieldIdentity
      ? omitName
        ? []
        : [replacement]
      : [field],
  );
  return makeRefreshedSnapshot({
    candidateIdentity: `urn:test:bld-017:candidate:refresh-${revision}`,
    acceptedAtUtc: `2026-08-20T17:${String(revision).padStart(2, "0")}:00.000Z`,
    explorationFields,
  });
}

export function makeMinimalPropertySnapshot() {
  const draft = sourceSnapshotDraft(bld015Snapshot);
  const exploration = bld015Snapshot.explorations[0];
  const minimalExploration = requireAccepted(
    createSourceRecord({
      recordVersion: exploration.recordVersion,
      entityKind: exploration.entityKind,
      sourceContextIdentity: exploration.sourceContextIdentity,
      providerNativeIdentity: exploration.providerNativeIdentity,
      parentEntityIdentity: exploration.parentEntityIdentity,
      relatedEntityIdentity: exploration.relatedEntityIdentity,
      sourceOrder: exploration.sourceOrder,
      fields: [bld015ExplorationNameField],
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    }),
  );
  return requireAccepted(
    createSourceSnapshot({
      ...draft,
      candidateIdentity: "urn:test:bld-017:candidate:property-minimal-r1",
      acceptedAtUtc: "2026-08-20T18:00:00.000Z",
      explorations: [minimalExploration],
      strata: [],
      samples: [],
      fieldTests: [],
      comments: [],
      openHoleGroundwaterObservations: [],
      lookups: [],
      extensionManifest: [],
    }),
  );
}

export const bld017MinimalPropertySnapshot = makeMinimalPropertySnapshot();
