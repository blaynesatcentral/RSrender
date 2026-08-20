import {
  canonicalizeJson,
  defineOpaqueIdentityCodec,
  parseSha256Digest,
  sha256CanonicalJson,
  type OpaqueIdentity,
  type Sha256Digest,
} from "@rsrender/contracts";

import { createDiagnosticFact, type DiagnosticFact } from "./diagnostic-fact.js";
import {
  decodePresentationOverrideCollection,
  digestSourceBaselineValue,
  displayValueTypeOf,
  type DisplayValueOverride,
  type PresentationOverrideCollection,
} from "./display-value-override.js";
import {
  deriveEmptyProjectInputContentDigest,
  deriveProjectInputRevisionIdentity,
  decodePhase1LogProjectAggregate,
  getProjectInputRevisionHandle,
  type ProjectInputCollectionKind,
  type ProjectInputRevisionHandle,
} from "./project-input-revisions.js";
import {
  decodeSourceSnapshot,
  encodeSourceSnapshot,
  type SourceFieldRecord,
  type SourceSnapshot,
} from "./source-snapshot.js";
import type { DomainValueRecord } from "./value-record.js";

export const boundedOverrideRenderDatasetVersion = 1 as const;
export const boundedOverrideProjectionContractVersion =
  "bld-017-bounded-override-render-dataset-v1" as const;

export type BoundedOverrideRenderDatasetIdentity =
  OpaqueIdentity<"BoundedOverrideRenderDatasetIdentity">;
export const boundedOverrideRenderDatasetIdentityCodec = defineOpaqueIdentityCodec(
  "BoundedOverrideRenderDatasetIdentity",
);

export type BoundedOverrideAssemblyRejectionCode =
  | "BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED"
  | "BOUNDED_OVERRIDE_ASSEMBLY_MISSING_FIELD"
  | "BOUNDED_OVERRIDE_ASSEMBLY_EXTRA_FIELD"
  | "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH"
  | "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT"
  | "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH"
  | "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED"
  | "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE"
  | "BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT"
  | "BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT"
  | "BOUNDED_OVERRIDE_ASSEMBLY_SEMANTIC_AXIS_CONFLICT"
  | "BOUNDED_OVERRIDE_ASSEMBLY_DUPLICATE_ENABLED_TARGET"
  | "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_MULTIPLE_OVERRIDES";

export interface BoundedOverrideRenderValue {
  readonly sourceFieldIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly fieldPath: string;
  readonly sourceOriginalValue: DomainValueRecord;
  readonly effectiveDisplayValue: DomainValueRecord;
  readonly application:
    | { readonly kind: "source" }
    | {
        readonly kind: "display-value-override";
        readonly presentationOverrideIdentity: string;
      };
}

export interface BoundedOverrideRenderDataset {
  readonly datasetVersion: 1;
  readonly datasetIdentity: BoundedOverrideRenderDatasetIdentity;
  readonly logicalDigest: Sha256Digest;
  readonly projectionContractVersion: typeof boundedOverrideProjectionContractVersion;
  readonly ownerDocumentIdentity: string;
  readonly sourceSnapshotIdentity: string;
  readonly sourceSnapshotLogicalDigest: Sha256Digest;
  readonly sourceSnapshotEncodingDigest: Sha256Digest;
  readonly sourceContextIdentity: string;
  readonly sourceProjectIdentity: string;
  readonly presentationOverrideState: "empty" | "current";
  readonly presentationOverrideProjectRevision: number;
  readonly presentationOverrideRevisionIdentity: string;
  readonly presentationOverrideContentDigest: Sha256Digest;
  readonly presentationOverrideCollectionIdentity: string | null;
  readonly presentationOverrideCollectionRevision: number | null;
  readonly presentationOverrideCollectionDigest: Sha256Digest | null;
  readonly supplementalSourcesEmptyRevisionIdentity: string;
  readonly supplementalSourcesEmptyContentDigest: Sha256Digest;
  readonly sourceResolutionDecisionsEmptyRevisionIdentity: string;
  readonly sourceResolutionDecisionsEmptyContentDigest: Sha256Digest;
  readonly sourceExtensionBindingsEmptyRevisionIdentity: string;
  readonly sourceExtensionBindingsEmptyContentDigest: Sha256Digest;
  readonly values: readonly BoundedOverrideRenderValue[];
  readonly diagnostics: readonly DiagnosticFact[];
}

export type BoundedOverrideAssemblyResult =
  | { readonly assembled: true; readonly value: BoundedOverrideRenderDataset }
  | {
      readonly assembled: false;
      readonly code: BoundedOverrideAssemblyRejectionCode;
      readonly diagnostics: readonly DiagnosticFact[];
    };

type DataRecord = Readonly<Record<string, unknown>>;

class AssemblyFailure extends Error {
  public constructor(public readonly code: BoundedOverrideAssemblyRejectionCode) {
    super(code);
  }
}

function fail(code: BoundedOverrideAssemblyRejectionCode): never {
  throw new AssemblyFailure(code);
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("BOUNDED_OVERRIDE_ASSEMBLY_EXTRA_FIELD");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("BOUNDED_OVERRIDE_ASSEMBLY_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("BOUNDED_OVERRIDE_ASSEMBLY_EXTRA_FIELD");
  }
}

function parseExactHandle(
  input: unknown,
  ownerDocumentIdentity: string,
  collectionKind: ProjectInputCollectionKind,
  state: "empty" | "current",
): ProjectInputRevisionHandle {
  const record = readRecord(input);
  requireFields(record, [
    "handleVersion",
    "collectionKind",
    "ownerDocumentIdentity",
    "state",
    "projectRevision",
    "revisionIdentity",
    "contentDigest",
  ]);
  const projectRevision = record["projectRevision"];
  if (
    record["handleVersion"] !== 1 ||
    record["collectionKind"] !== collectionKind ||
    record["ownerDocumentIdentity"] !== ownerDocumentIdentity ||
    record["state"] !== state ||
    typeof projectRevision !== "number" ||
    !Number.isSafeInteger(projectRevision) ||
    (state === "empty" ? projectRevision !== 0 : projectRevision < 1)
  ) {
    return fail(
      state === "empty"
        ? "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT"
        : "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
    );
  }
  const identity = deriveProjectInputRevisionIdentity({
    ownerDocumentIdentity,
    collectionKind,
    projectRevision,
  });
  if (!identity.accepted || record["revisionIdentity"] !== identity.value) {
    return fail(
      state === "empty"
        ? "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT"
        : "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
    );
  }
  const contentDigest = parseSha256Digest(record["contentDigest"]);
  if (state === "empty") {
    const empty = deriveEmptyProjectInputContentDigest(collectionKind);
    if (!empty.accepted || contentDigest !== empty.value) {
      return fail("BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT");
    }
  }
  return Object.freeze({
    handleVersion: 1,
    collectionKind,
    ownerDocumentIdentity:
      ownerDocumentIdentity as ProjectInputRevisionHandle["ownerDocumentIdentity"],
    state,
    projectRevision,
    revisionIdentity: identity.value,
    contentDigest,
  });
}

function snapshotFields(snapshot: SourceSnapshot): readonly SourceFieldRecord[] {
  const records = [
    snapshot.sourceProject,
    ...snapshot.explorations,
    ...snapshot.strata,
    ...snapshot.samples,
    ...snapshot.fieldTests,
    ...snapshot.comments,
    ...snapshot.openHoleGroundwaterObservations,
    ...snapshot.lookups,
  ];
  const fields = records.flatMap((record) => [
    ...record.fields,
    ...record.fieldTestColumns.map((column) => column.value),
  ]);
  return Object.freeze(
    fields.sort((left, right) =>
      left.sourceFieldIdentity < right.sourceFieldIdentity
        ? -1
        : left.sourceFieldIdentity > right.sourceFieldIdentity
          ? 1
          : 0,
    ),
  );
}

function makeFact(
  code: string,
  affectedIdentityKind: string,
  affectedIdentity: string,
  inputDigest: Sha256Digest,
): DiagnosticFact {
  const result = createDiagnosticFact({
    factVersion: 1,
    code,
    category: "data",
    affected: { identityKind: affectedIdentityKind, identity: affectedIdentity },
    cause: { causeKey: code.toLowerCase().replaceAll(".", "-"), evidenceClass: "domain-structure" },
    consequence: "conflict",
    input: { revision: boundedOverrideProjectionContractVersion, digest: inputDigest },
    remediationActionIds: ["override.resolve-conflict"],
  });
  if (!result.accepted) return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
  return result.value;
}

function conflict(
  code: BoundedOverrideAssemblyRejectionCode,
  factCode: string,
  target: string,
  inputDigest: Sha256Digest,
  affectedIdentityKind = "SourceFieldIdentity",
): BoundedOverrideAssemblyResult {
  return Object.freeze({
    assembled: false,
    code,
    diagnostics: Object.freeze([makeFact(factCode, affectedIdentityKind, target, inputDigest)]),
  });
}

function assemblyInputDigest(
  snapshot: SourceSnapshot,
  collection: PresentationOverrideCollection | null,
  snapshotEncodingDigest: Sha256Digest,
  presentation: ProjectInputRevisionHandle,
  supplemental: ProjectInputRevisionHandle,
  resolutions: ProjectInputRevisionHandle,
  extensions: ProjectInputRevisionHandle,
): Sha256Digest {
  return sha256CanonicalJson({
    schema: boundedOverrideProjectionContractVersion,
    sourceSnapshotIdentity: snapshot.snapshotIdentity,
    sourceSnapshotLogicalDigest: snapshot.logicalDigest,
    sourceSnapshotEncodingDigest: snapshotEncodingDigest,
    presentationOverrideState: presentation.state,
    presentationOverrideProjectRevision: presentation.projectRevision,
    presentationOverrideRevisionIdentity: presentation.revisionIdentity,
    presentationOverrideContentDigest: presentation.contentDigest,
    presentationOverrideCollectionIdentity: collection?.collectionIdentity ?? null,
    presentationOverrideCollectionRevision: collection?.projectRevision ?? null,
    presentationOverrideCollectionDigest: collection?.logicalDigest ?? null,
    presentationHandle: presentation,
    supplementalSourcesHandle: supplemental,
    sourceResolutionDecisionsHandle: resolutions,
    sourceExtensionBindingsHandle: extensions,
  });
}

function validateOverride(
  item: DisplayValueOverride,
  snapshot: SourceSnapshot,
  field: SourceFieldRecord | undefined,
  inputDigest: Sha256Digest,
): BoundedOverrideAssemblyResult | undefined {
  if (item.targetSourceContextIdentity !== snapshot.sourceContextIdentity) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH",
      "OVERRIDE.CONTEXT.MISMATCH",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  if (field === undefined) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED",
      "OVERRIDE.TARGET.DELETED",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  if (field.sourceEntityIdentity !== item.targetSourceEntityIdentity) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_CONTEXT_MISMATCH",
      "OVERRIDE.ENTITY.MISMATCH",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  const type = displayValueTypeOf(field.value);
  if (!type.accepted || type.value !== item.expectedSourceValueType) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT",
      "OVERRIDE.TYPE.CONFLICT",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  if (canonicalizeJson(field.value.unit) !== canonicalizeJson(item.expectedSourceUnit)) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT",
      "OVERRIDE.UNIT.CONFLICT",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  if (
    canonicalizeJson(field.value.association) !==
      canonicalizeJson(item.replacementValue.association) ||
    canonicalizeJson(field.value.finality) !== canonicalizeJson(item.replacementValue.finality) ||
    canonicalizeJson(field.value.eligibility) !==
      canonicalizeJson(item.replacementValue.eligibility)
  ) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_SEMANTIC_AXIS_CONFLICT",
      "OVERRIDE.SEMANTIC_AXIS.CONFLICT",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  const baseline = digestSourceBaselineValue(field.value);
  if (!baseline.accepted || baseline.value !== item.expectedSourceValueDigest) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE",
      "OVERRIDE.BASELINE.STALE",
      item.targetSourceFieldIdentity,
      inputDigest,
    );
  }
  return undefined;
}

function makeDataset(
  snapshot: SourceSnapshot,
  ownerDocumentIdentity: string,
  collection: PresentationOverrideCollection | null,
  presentation: ProjectInputRevisionHandle,
  supplemental: ProjectInputRevisionHandle,
  resolutions: ProjectInputRevisionHandle,
  extensions: ProjectInputRevisionHandle,
): BoundedOverrideAssemblyResult {
  const snapshotEncoded = encodeSourceSnapshot(snapshot);
  if (!snapshotEncoded.accepted) return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
  const snapshotEncodingDigest = snapshotEncoded.digest;
  const inputDigest = assemblyInputDigest(
    snapshot,
    collection,
    snapshotEncodingDigest,
    presentation,
    supplemental,
    resolutions,
    extensions,
  );
  const fields = snapshotFields(snapshot);
  const byIdentity = new Map(fields.map((field) => [field.sourceFieldIdentity, field]));
  const enabled = new Map<string, DisplayValueOverride>();
  if ((collection?.items.filter((item) => item.enabled).length ?? 0) > 1) {
    return conflict(
      "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_MULTIPLE_OVERRIDES",
      "OVERRIDE.BOUNDED_ASSEMBLER.MULTIPLE_UNSUPPORTED",
      collection?.collectionIdentity ?? presentation.revisionIdentity,
      inputDigest,
      "PresentationOverrideCollectionIdentity",
    );
  }
  for (const item of collection?.items ?? []) {
    if (!item.enabled) continue;
    const failure = validateOverride(
      item,
      snapshot,
      byIdentity.get(item.targetSourceFieldIdentity),
      inputDigest,
    );
    if (failure !== undefined) return failure;
    enabled.set(item.targetSourceFieldIdentity, item);
  }
  const values = Object.freeze(
    fields.map((field) => {
      const item = enabled.get(field.sourceFieldIdentity);
      return Object.freeze({
        sourceFieldIdentity: field.sourceFieldIdentity,
        sourceEntityIdentity: field.sourceEntityIdentity,
        fieldPath: field.fieldPath,
        sourceOriginalValue: field.value,
        effectiveDisplayValue: item?.replacementValue ?? field.value,
        application:
          item === undefined
            ? Object.freeze({ kind: "source" as const })
            : Object.freeze({
                kind: "display-value-override" as const,
                presentationOverrideIdentity: item.presentationOverrideIdentity,
              }),
      });
    }),
  );
  const body = {
    datasetVersion: 1 as const,
    projectionContractVersion: boundedOverrideProjectionContractVersion,
    ownerDocumentIdentity,
    sourceSnapshotIdentity: snapshot.snapshotIdentity,
    sourceSnapshotLogicalDigest: snapshot.logicalDigest,
    sourceSnapshotEncodingDigest: snapshotEncodingDigest,
    sourceContextIdentity: snapshot.sourceContextIdentity,
    sourceProjectIdentity: snapshot.sourceProjectIdentity,
    presentationOverrideState: presentation.state,
    presentationOverrideProjectRevision: presentation.projectRevision,
    presentationOverrideRevisionIdentity: presentation.revisionIdentity,
    presentationOverrideContentDigest: presentation.contentDigest,
    presentationOverrideCollectionIdentity: collection?.collectionIdentity ?? null,
    presentationOverrideCollectionRevision: collection?.projectRevision ?? null,
    presentationOverrideCollectionDigest: collection?.logicalDigest ?? null,
    supplementalSourcesEmptyRevisionIdentity: supplemental.revisionIdentity,
    supplementalSourcesEmptyContentDigest: supplemental.contentDigest,
    sourceResolutionDecisionsEmptyRevisionIdentity: resolutions.revisionIdentity,
    sourceResolutionDecisionsEmptyContentDigest: resolutions.contentDigest,
    sourceExtensionBindingsEmptyRevisionIdentity: extensions.revisionIdentity,
    sourceExtensionBindingsEmptyContentDigest: extensions.contentDigest,
    values,
    diagnostics: Object.freeze([]) as readonly DiagnosticFact[],
  };
  const logicalDigest = sha256CanonicalJson(body);
  const datasetIdentity = boundedOverrideRenderDatasetIdentityCodec.parse(
    `urn:rsrender:bounded-override-render-dataset:${logicalDigest.slice("sha256:".length)}`,
  );
  return Object.freeze({
    assembled: true,
    value: Object.freeze({ ...body, datasetIdentity, logicalDigest }),
  });
}

export function assembleBoundedOverrideRenderDataset(
  input: unknown,
): BoundedOverrideAssemblyResult {
  try {
    const record = readRecord(input);
    requireFields(record, [
      "phase1Project",
      "sourceSnapshot",
      "presentationOverrides",
      "supplementalSourcesHandle",
      "sourceResolutionDecisionsHandle",
      "sourceExtensionBindingsHandle",
    ]);
    const snapshot = decodeSourceSnapshot(record["sourceSnapshot"]);
    if (!snapshot.accepted) return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
    const project = decodePhase1LogProjectAggregate(record["phase1Project"]);
    if (!project.accepted || project.value.phase1Inputs.acceptedSourceSnapshot === null) {
      return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
    }
    const projectSnapshot = encodeSourceSnapshot(project.value.phase1Inputs.acceptedSourceSnapshot);
    const suppliedSnapshot = encodeSourceSnapshot(snapshot.value);
    if (
      !projectSnapshot.accepted ||
      !suppliedSnapshot.accepted ||
      projectSnapshot.canonicalJson !== suppliedSnapshot.canonicalJson
    ) {
      return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
    }
    const presentationInput = readRecord(record["presentationOverrides"]);
    const presentationState = presentationInput["state"];
    if (presentationState === "empty") requireFields(presentationInput, ["state", "handle"]);
    else if (presentationState === "current") {
      requireFields(presentationInput, ["state", "handle", "collection"]);
    } else return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
    let collection: PresentationOverrideCollection | null = null;
    if (presentationState === "current") {
      const decodedCollection = decodePresentationOverrideCollection(
        presentationInput["collection"],
      );
      if (!decodedCollection.accepted) {
        if (
          decodedCollection.code === "PRESENTATION_OVERRIDE_COLLECTION_DUPLICATE_ENABLED_TARGET"
        ) {
          return conflict(
            "BOUNDED_OVERRIDE_ASSEMBLY_DUPLICATE_ENABLED_TARGET",
            "OVERRIDE.TARGET.DUPLICATE_ENABLED",
            snapshot.value.snapshotIdentity,
            sha256CanonicalJson({
              sourceSnapshotIdentity: snapshot.value.snapshotIdentity,
              sourceSnapshotLogicalDigest: snapshot.value.logicalDigest,
              conflictingPresentationOverrideCollection: presentationInput["collection"],
            }),
            "SourceSnapshotIdentity",
          );
        }
        return fail("BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED");
      }
      collection = decodedCollection.value;
    }
    if (
      (collection !== null &&
        project.value.documentIdentity !== collection.ownerDocumentIdentity) ||
      project.value.sourceContextIdentity !== snapshot.value.sourceContextIdentity ||
      project.value.sourceProjectIdentity !== snapshot.value.sourceProjectIdentity
    ) {
      return fail("BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH");
    }
    const presentationHandle = parseExactHandle(
      presentationInput["handle"],
      project.value.documentIdentity,
      "presentation-overrides",
      presentationState,
    );
    if (
      collection !== null &&
      (presentationHandle.projectRevision !== collection.projectRevision ||
        presentationHandle.revisionIdentity !== collection.revisionIdentity ||
        presentationHandle.contentDigest !== collection.logicalDigest)
    ) {
      return fail("BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH");
    }
    const supplemental = parseExactHandle(
      record["supplementalSourcesHandle"],
      project.value.documentIdentity,
      "supplemental-sources",
      "empty",
    );
    const resolutions = parseExactHandle(
      record["sourceResolutionDecisionsHandle"],
      project.value.documentIdentity,
      "source-resolution-decisions",
      "empty",
    );
    const extensions = parseExactHandle(
      record["sourceExtensionBindingsHandle"],
      project.value.documentIdentity,
      "source-extension-bindings",
      "empty",
    );
    for (const [kind, supplied] of [
      ["presentation-overrides", presentationHandle],
      ["supplemental-sources", supplemental],
      ["source-resolution-decisions", resolutions],
      ["source-extension-bindings", extensions],
    ] as const) {
      const owned = getProjectInputRevisionHandle(project.value, kind);
      if (!owned.accepted || canonicalizeJson(owned.value) !== canonicalizeJson(supplied)) {
        return fail(
          kind === "presentation-overrides"
            ? "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH"
            : "BOUNDED_OVERRIDE_ASSEMBLY_UNSUPPORTED_NONEMPTY_INPUT",
        );
      }
    }
    return makeDataset(
      snapshot.value,
      project.value.documentIdentity,
      collection,
      presentationHandle,
      supplemental,
      resolutions,
      extensions,
    );
  } catch (error) {
    return Object.freeze({
      assembled: false,
      code: error instanceof AssemblyFailure ? error.code : "BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED",
      diagnostics: Object.freeze([]),
    });
  }
}
