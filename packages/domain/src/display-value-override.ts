import {
  canonicalizeJson,
  defineOpaqueIdentityCodec,
  parseSha256Digest,
  sha256CanonicalJson,
  type OpaqueIdentity,
  type Sha256Digest,
} from "@rsrender/contracts";

import { documentIdentityCodec, type DocumentIdentity } from "./aggregate-skeleton.js";
import {
  deriveProjectInputRevisionIdentity,
  type ProjectInputRevisionIdentity,
} from "./project-input-revisions.js";
import { sourceContextIdentityCodec } from "./aggregate-skeleton.js";
import {
  sourceEntityIdentityCodec,
  sourceFieldIdentityCodec,
  type SourceEntityIdentity,
  type SourceFieldIdentity,
} from "./source-snapshot.js";
import {
  decodeDomainValueRecord,
  type ContentState,
  type DomainValueRecord,
  type UnitState,
} from "./value-record.js";

export const displayValueOverrideVersion = 1 as const;
export const presentationOverrideCollectionVersion = 1 as const;
export const presentationOverrideContractRevision =
  "bld-017-presentation-override-collection-v1" as const;

export type PresentationOverrideIdentity = OpaqueIdentity<"PresentationOverrideIdentity">;
export type PresentationOverrideCollectionIdentity =
  OpaqueIdentity<"PresentationOverrideCollectionIdentity">;
export type LocalPresentationOverrideIdentity = OpaqueIdentity<"LocalPresentationOverrideIdentity">;

export const presentationOverrideIdentityCodec = defineOpaqueIdentityCodec(
  "PresentationOverrideIdentity",
);
export const presentationOverrideCollectionIdentityCodec = defineOpaqueIdentityCodec(
  "PresentationOverrideCollectionIdentity",
);
export const localPresentationOverrideIdentityCodec = defineOpaqueIdentityCodec(
  "LocalPresentationOverrideIdentity",
);

export type OverrideValueType =
  | "absent"
  | "null"
  | "empty-string"
  | "empty-collection"
  | "zero"
  | "boolean"
  | "number"
  | "string"
  | "not-available"
  | "not-permitted"
  | "malformed";

export type DisplayValueOverrideRejectionCode =
  | "DISPLAY_VALUE_OVERRIDE_MALFORMED"
  | "DISPLAY_VALUE_OVERRIDE_MISSING_FIELD"
  | "DISPLAY_VALUE_OVERRIDE_EXTRA_FIELD"
  | "DISPLAY_VALUE_OVERRIDE_WRONG_TYPE"
  | "DISPLAY_VALUE_OVERRIDE_UNSUPPORTED_VERSION"
  | "DISPLAY_VALUE_OVERRIDE_IDENTITY_MISMATCH"
  | "DISPLAY_VALUE_OVERRIDE_VALUE_TYPE_MISMATCH"
  | "DISPLAY_VALUE_OVERRIDE_UNIT_MISMATCH"
  | "DISPLAY_VALUE_OVERRIDE_PROVENANCE_MISMATCH"
  | "DISPLAY_VALUE_OVERRIDE_REVISION_INVALID"
  | "PRESENTATION_OVERRIDE_COLLECTION_DUPLICATE_ENABLED_TARGET"
  | "PRESENTATION_OVERRIDE_COLLECTION_ORDER_MISMATCH"
  | "PRESENTATION_OVERRIDE_COLLECTION_IDENTITY_MISMATCH"
  | "PRESENTATION_OVERRIDE_COLLECTION_DIGEST_MISMATCH"
  | "PRESENTATION_OVERRIDE_COLLECTION_REVISION_INVALID";

export interface DisplayValueOverride {
  readonly overrideVersion: 1;
  readonly presentationOverrideIdentity: PresentationOverrideIdentity;
  readonly ownerDocumentIdentity: DocumentIdentity;
  readonly localOverrideIdentity: LocalPresentationOverrideIdentity;
  readonly targetSourceContextIdentity: string;
  readonly targetSourceEntityIdentity: SourceEntityIdentity;
  readonly targetSourceFieldIdentity: SourceFieldIdentity;
  readonly expectedSourceValueDigest: Sha256Digest;
  readonly expectedSourceValueType: OverrideValueType;
  readonly expectedSourceUnit: UnitState;
  readonly replacementValue: DomainValueRecord;
  readonly overrideRevision: number;
  readonly enabled: boolean;
  readonly reason: string;
  readonly authorIdentity: string | null;
  readonly recordedAtUtc: string;
}

export interface DisplayValueOverrideDraft {
  readonly overrideVersion: unknown;
  readonly ownerDocumentIdentity: unknown;
  readonly localOverrideIdentity: unknown;
  readonly targetSourceContextIdentity: unknown;
  readonly targetSourceEntityIdentity: unknown;
  readonly targetSourceFieldIdentity: unknown;
  readonly expectedSourceValueDigest: unknown;
  readonly expectedSourceValueType: unknown;
  readonly expectedSourceUnit: unknown;
  readonly replacementValue: unknown;
  readonly overrideRevision: unknown;
  readonly enabled: unknown;
  readonly reason: unknown;
  readonly authorIdentity: unknown;
  readonly recordedAtUtc: unknown;
}

export interface PresentationOverrideCollection {
  readonly collectionVersion: 1;
  readonly collectionIdentity: PresentationOverrideCollectionIdentity;
  readonly ownerDocumentIdentity: DocumentIdentity;
  readonly projectRevision: number;
  readonly revisionIdentity: ProjectInputRevisionIdentity;
  readonly logicalDigest: Sha256Digest;
  readonly items: readonly DisplayValueOverride[];
}

export type DisplayValueOverrideResult<T> =
  | { readonly accepted: true; readonly value: T }
  | { readonly accepted: false; readonly code: DisplayValueOverrideRejectionCode };

export type DisplayValueOverrideEncodeResult<T> =
  | {
      readonly accepted: true;
      readonly value: T;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: DisplayValueOverrideRejectionCode };

type DataRecord = Readonly<Record<string, unknown>>;

class OverrideFailure extends Error {
  public constructor(public readonly code: DisplayValueOverrideRejectionCode) {
    super(code);
  }
}

function fail(code: DisplayValueOverrideRejectionCode): never {
  throw new OverrideFailure(code);
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("DISPLAY_VALUE_OVERRIDE_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("DISPLAY_VALUE_OVERRIDE_MALFORMED");
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("DISPLAY_VALUE_OVERRIDE_EXTRA_FIELD");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("DISPLAY_VALUE_OVERRIDE_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("DISPLAY_VALUE_OVERRIDE_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("DISPLAY_VALUE_OVERRIDE_EXTRA_FIELD");
  }
}

function readArray(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
  }
  const result: unknown[] = [];
  const allowed = new Set<string>(["length"]);
  for (let index = 0; index < input.length; index += 1) {
    allowed.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("DISPLAY_VALUE_OVERRIDE_MALFORMED");
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("DISPLAY_VALUE_OVERRIDE_EXTRA_FIELD");
  }
  return result;
}

function readText(input: unknown, nullable = false): string | null {
  if (nullable && input === null) return null;
  if (typeof input !== "string" || input.length === 0 || !input.isWellFormed()) {
    return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
  }
  return input;
}

function readPositiveInteger(input: unknown, itemRevision = false): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 1 ||
    Object.is(input, -0)
  ) {
    return fail(
      itemRevision
        ? "DISPLAY_VALUE_OVERRIDE_REVISION_INVALID"
        : "PRESENTATION_OVERRIDE_COLLECTION_REVISION_INVALID",
    );
  }
  return input;
}

function readInstant(input: unknown): string {
  const value = readText(input);
  if (
    value === null ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    new Date(value).toISOString() !== value
  ) {
    return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
  }
  return value;
}

function valueType(content: ContentState): OverrideValueType {
  if (content.kind !== "value") return content.kind;
  return typeof content.value as "boolean" | "number" | "string";
}

function readValueType(input: unknown): OverrideValueType {
  const values: readonly OverrideValueType[] = [
    "absent",
    "null",
    "empty-string",
    "empty-collection",
    "zero",
    "boolean",
    "number",
    "string",
    "not-available",
    "not-permitted",
    "malformed",
  ];
  if (typeof input !== "string" || !values.includes(input as OverrideValueType)) {
    return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
  }
  return input as OverrideValueType;
}

function parseUnit(input: unknown): UnitState {
  const record = readRecord(input);
  if (record["state"] === "not-applicable") {
    requireFields(record, ["state"]);
    return Object.freeze({ state: "not-applicable" });
  }
  if (record["state"] === "specified") {
    requireFields(record, ["state", "quantity", "symbol"]);
    return Object.freeze({
      state: "specified",
      quantity: readText(record["quantity"]) as string,
      symbol: readText(record["symbol"]) as string,
    });
  }
  if (record["state"] === "unsupported") {
    requireFields(record, ["state", "originalUnit"]);
    return Object.freeze({
      state: "unsupported",
      originalUnit: readText(record["originalUnit"]) as string,
    });
  }
  return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
}

function itemIdentityFor(
  ownerDocumentIdentity: DocumentIdentity,
  localOverrideIdentity: LocalPresentationOverrideIdentity,
): PresentationOverrideIdentity {
  const digest = sha256CanonicalJson({
    schema: "rsrender.presentation-override-identity.v1",
    ownerDocumentIdentity,
    localOverrideIdentity,
  });
  return presentationOverrideIdentityCodec.parse(
    `urn:rsrender:presentation-override:${digest.slice("sha256:".length)}`,
  );
}

function collectionIdentityFor(
  ownerDocumentIdentity: DocumentIdentity,
): PresentationOverrideCollectionIdentity {
  const digest = sha256CanonicalJson({
    schema: "rsrender.presentation-override-collection-identity.v1",
    ownerDocumentIdentity,
  });
  return presentationOverrideCollectionIdentityCodec.parse(
    `urn:rsrender:presentation-override-collection:${digest.slice("sha256:".length)}`,
  );
}

export function derivePresentationOverrideIdentity(
  input: unknown,
): DisplayValueOverrideResult<PresentationOverrideIdentity> {
  try {
    const record = readRecord(input);
    requireFields(record, ["ownerDocumentIdentity", "localOverrideIdentity"]);
    return Object.freeze({
      accepted: true,
      value: itemIdentityFor(
        documentIdentityCodec.parse(record["ownerDocumentIdentity"]),
        localPresentationOverrideIdentityCodec.parse(record["localOverrideIdentity"]),
      ),
    });
  } catch (error) {
    return rejected(error);
  }
}

export function digestSourceBaselineValue(
  input: unknown,
): DisplayValueOverrideResult<Sha256Digest> {
  const decoded = decodeDomainValueRecord(input);
  return decoded.accepted && decoded.value.provenance.provenanceClass === "source"
    ? Object.freeze({
        accepted: true,
        value: sha256CanonicalJson({
          schema: "rsrender.source-baseline-value.v1",
          content: decoded.value.content,
          association: decoded.value.association,
          finality: decoded.value.finality,
          eligibility: decoded.value.eligibility,
          unit: decoded.value.unit,
        }),
      })
    : Object.freeze({ accepted: false, code: "DISPLAY_VALUE_OVERRIDE_WRONG_TYPE" });
}

function parseReplacementValue(
  input: unknown,
  expected: {
    readonly identity: PresentationOverrideIdentity;
    readonly target: SourceFieldIdentity;
    readonly baselineDigest: Sha256Digest;
    readonly revision: number;
    readonly recordedAtUtc: string;
    readonly valueType: OverrideValueType;
    readonly unit: UnitState;
  },
): DomainValueRecord {
  const decoded = decodeDomainValueRecord(input);
  if (!decoded.accepted) return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
  if (valueType(decoded.value.content) !== expected.valueType) {
    return fail("DISPLAY_VALUE_OVERRIDE_VALUE_TYPE_MISMATCH");
  }
  if (canonicalizeJson(decoded.value.unit) !== canonicalizeJson(expected.unit)) {
    return fail("DISPLAY_VALUE_OVERRIDE_UNIT_MISMATCH");
  }
  const provenance = decoded.value.provenance;
  if (
    provenance.provenanceClass !== "override" ||
    provenance.presentationOverrideIdentity !== expected.identity ||
    provenance.sourceFieldIdentity !== expected.target ||
    provenance.expectedSourceValueDigest !== expected.baselineDigest ||
    provenance.overrideRevision !== expected.revision ||
    provenance.recordedAtUtc !== expected.recordedAtUtc ||
    provenance.basisCodes.length !== 1 ||
    provenance.basisCodes[0] !== "presentation-override" ||
    provenance.transformations.length !== 0
  ) {
    return fail("DISPLAY_VALUE_OVERRIDE_PROVENANCE_MISMATCH");
  }
  return decoded.value;
}

function parseItem(input: unknown, requireIdentity: boolean): DisplayValueOverride {
  const record = readRecord(input);
  const fields = [
    "overrideVersion",
    ...(requireIdentity ? ["presentationOverrideIdentity"] : []),
    "ownerDocumentIdentity",
    "localOverrideIdentity",
    "targetSourceContextIdentity",
    "targetSourceEntityIdentity",
    "targetSourceFieldIdentity",
    "expectedSourceValueDigest",
    "expectedSourceValueType",
    "expectedSourceUnit",
    "replacementValue",
    "overrideRevision",
    "enabled",
    "reason",
    "authorIdentity",
    "recordedAtUtc",
  ];
  requireFields(record, fields);
  if (record["overrideVersion"] !== displayValueOverrideVersion) {
    return fail("DISPLAY_VALUE_OVERRIDE_UNSUPPORTED_VERSION");
  }
  const ownerDocumentIdentity = documentIdentityCodec.parse(record["ownerDocumentIdentity"]);
  const localOverrideIdentity = localPresentationOverrideIdentityCodec.parse(
    record["localOverrideIdentity"],
  );
  const identity = itemIdentityFor(ownerDocumentIdentity, localOverrideIdentity);
  if (
    requireIdentity &&
    presentationOverrideIdentityCodec.parse(record["presentationOverrideIdentity"]) !== identity
  ) {
    return fail("DISPLAY_VALUE_OVERRIDE_IDENTITY_MISMATCH");
  }
  const targetSourceContextIdentity = sourceContextIdentityCodec.parse(
    record["targetSourceContextIdentity"],
  );
  const targetSourceEntityIdentity = sourceEntityIdentityCodec.parse(
    record["targetSourceEntityIdentity"],
  );
  const targetSourceFieldIdentity = sourceFieldIdentityCodec.parse(
    record["targetSourceFieldIdentity"],
  );
  const expectedSourceValueDigest = parseSha256Digest(record["expectedSourceValueDigest"]);
  const expectedSourceValueType = readValueType(record["expectedSourceValueType"]);
  const expectedSourceUnit = parseUnit(record["expectedSourceUnit"]);
  const overrideRevision = readPositiveInteger(record["overrideRevision"], true);
  if (typeof record["enabled"] !== "boolean") return fail("DISPLAY_VALUE_OVERRIDE_WRONG_TYPE");
  const recordedAtUtc = readInstant(record["recordedAtUtc"]);
  const replacementValue = parseReplacementValue(record["replacementValue"], {
    identity,
    target: targetSourceFieldIdentity,
    baselineDigest: expectedSourceValueDigest,
    revision: overrideRevision,
    recordedAtUtc,
    valueType: expectedSourceValueType,
    unit: expectedSourceUnit,
  });
  return Object.freeze({
    overrideVersion: 1,
    presentationOverrideIdentity: identity,
    ownerDocumentIdentity,
    localOverrideIdentity,
    targetSourceContextIdentity,
    targetSourceEntityIdentity,
    targetSourceFieldIdentity,
    expectedSourceValueDigest,
    expectedSourceValueType,
    expectedSourceUnit,
    replacementValue,
    overrideRevision,
    enabled: record["enabled"],
    reason: readText(record["reason"]) as string,
    authorIdentity: readText(record["authorIdentity"], true),
    recordedAtUtc,
  });
}

function rejected(error: unknown): {
  readonly accepted: false;
  readonly code: DisplayValueOverrideRejectionCode;
} {
  return Object.freeze({
    accepted: false,
    code: error instanceof OverrideFailure ? error.code : "DISPLAY_VALUE_OVERRIDE_WRONG_TYPE",
  });
}

export function createDisplayValueOverride(
  input: unknown,
): DisplayValueOverrideResult<DisplayValueOverride> {
  try {
    return Object.freeze({ accepted: true, value: parseItem(input, false) });
  } catch (error) {
    return rejected(error);
  }
}

export function decodeDisplayValueOverride(
  input: unknown,
): DisplayValueOverrideResult<DisplayValueOverride> {
  try {
    return Object.freeze({ accepted: true, value: parseItem(input, true) });
  } catch (error) {
    return rejected(error);
  }
}

export function encodeDisplayValueOverride(
  input: unknown,
): DisplayValueOverrideEncodeResult<DisplayValueOverride> {
  const decoded = decodeDisplayValueOverride(input);
  if (!decoded.accepted) return decoded;
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson: canonicalizeJson(decoded.value),
    digest: sha256CanonicalJson(decoded.value),
  });
}

function parseItems(input: unknown, owner: DocumentIdentity): readonly DisplayValueOverride[] {
  const supplied = readArray(input).map((item) => parseItem(item, true));
  if (supplied.some((item) => item.ownerDocumentIdentity !== owner)) {
    return fail("DISPLAY_VALUE_OVERRIDE_IDENTITY_MISMATCH");
  }
  const enabledTargets = new Set<string>();
  const itemIdentities = new Set<string>();
  for (const item of supplied) {
    if (itemIdentities.has(item.presentationOverrideIdentity)) {
      return fail("DISPLAY_VALUE_OVERRIDE_IDENTITY_MISMATCH");
    }
    itemIdentities.add(item.presentationOverrideIdentity);
    if (item.enabled && enabledTargets.has(item.targetSourceFieldIdentity)) {
      return fail("PRESENTATION_OVERRIDE_COLLECTION_DUPLICATE_ENABLED_TARGET");
    }
    if (item.enabled) enabledTargets.add(item.targetSourceFieldIdentity);
  }
  const sorted = [...supplied].sort((left, right) =>
    left.targetSourceFieldIdentity === right.targetSourceFieldIdentity
      ? left.presentationOverrideIdentity < right.presentationOverrideIdentity
        ? -1
        : left.presentationOverrideIdentity > right.presentationOverrideIdentity
          ? 1
          : 0
      : left.targetSourceFieldIdentity < right.targetSourceFieldIdentity
        ? -1
        : 1,
  );
  if (supplied.some((item, index) => item !== sorted[index])) {
    return fail("PRESENTATION_OVERRIDE_COLLECTION_ORDER_MISMATCH");
  }
  return Object.freeze(supplied);
}

function collectionLogicalDigest(
  ownerDocumentIdentity: DocumentIdentity,
  projectRevision: number,
  items: readonly DisplayValueOverride[],
): Sha256Digest {
  return sha256CanonicalJson({
    schema: presentationOverrideContractRevision,
    ownerDocumentIdentity,
    projectRevision,
    items,
  });
}

function revisionIdentityFor(
  ownerDocumentIdentity: DocumentIdentity,
  projectRevision: number,
): ProjectInputRevisionIdentity {
  const result = deriveProjectInputRevisionIdentity({
    ownerDocumentIdentity,
    collectionKind: "presentation-overrides",
    projectRevision,
  });
  if (!result.accepted) return fail("PRESENTATION_OVERRIDE_COLLECTION_REVISION_INVALID");
  return result.value;
}

function parseCollection(input: unknown, derivedFields: boolean): PresentationOverrideCollection {
  const record = readRecord(input);
  requireFields(record, [
    "collectionVersion",
    ...(derivedFields ? ["collectionIdentity"] : []),
    "ownerDocumentIdentity",
    "projectRevision",
    ...(derivedFields ? ["revisionIdentity", "logicalDigest"] : []),
    "items",
  ]);
  if (record["collectionVersion"] !== presentationOverrideCollectionVersion) {
    return fail("DISPLAY_VALUE_OVERRIDE_UNSUPPORTED_VERSION");
  }
  const ownerDocumentIdentity = documentIdentityCodec.parse(record["ownerDocumentIdentity"]);
  const projectRevision = readPositiveInteger(record["projectRevision"]);
  const items = parseItems(record["items"], ownerDocumentIdentity);
  if (items.some((item) => item.overrideRevision > projectRevision)) {
    return fail("DISPLAY_VALUE_OVERRIDE_REVISION_INVALID");
  }
  const collectionIdentity = collectionIdentityFor(ownerDocumentIdentity);
  const revisionIdentity = revisionIdentityFor(ownerDocumentIdentity, projectRevision);
  const logicalDigest = collectionLogicalDigest(ownerDocumentIdentity, projectRevision, items);
  if (
    derivedFields &&
    presentationOverrideCollectionIdentityCodec.parse(record["collectionIdentity"]) !==
      collectionIdentity
  ) {
    return fail("PRESENTATION_OVERRIDE_COLLECTION_IDENTITY_MISMATCH");
  }
  if (derivedFields && record["revisionIdentity"] !== revisionIdentity) {
    return fail("PRESENTATION_OVERRIDE_COLLECTION_IDENTITY_MISMATCH");
  }
  if (derivedFields && parseSha256Digest(record["logicalDigest"]) !== logicalDigest) {
    return fail("PRESENTATION_OVERRIDE_COLLECTION_DIGEST_MISMATCH");
  }
  return Object.freeze({
    collectionVersion: 1,
    collectionIdentity,
    ownerDocumentIdentity,
    projectRevision,
    revisionIdentity,
    logicalDigest,
    items,
  });
}

export function createPresentationOverrideCollection(
  input: unknown,
): DisplayValueOverrideResult<PresentationOverrideCollection> {
  try {
    return Object.freeze({ accepted: true, value: parseCollection(input, false) });
  } catch (error) {
    return rejected(error);
  }
}

export function decodePresentationOverrideCollection(
  input: unknown,
): DisplayValueOverrideResult<PresentationOverrideCollection> {
  try {
    return Object.freeze({ accepted: true, value: parseCollection(input, true) });
  } catch (error) {
    return rejected(error);
  }
}

export function encodePresentationOverrideCollection(
  input: unknown,
): DisplayValueOverrideEncodeResult<PresentationOverrideCollection> {
  const decoded = decodePresentationOverrideCollection(input);
  if (!decoded.accepted) return decoded;
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson: canonicalizeJson(decoded.value),
    digest: sha256CanonicalJson(decoded.value),
  });
}

export function createNextPresentationOverrideCollection(
  input: unknown,
): DisplayValueOverrideResult<PresentationOverrideCollection> {
  try {
    const record = readRecord(input);
    requireFields(record, ["previousCollection", "items"]);
    const previous = decodePresentationOverrideCollection(record["previousCollection"]);
    if (!previous.accepted) return previous;
    const next = createPresentationOverrideCollection({
      collectionVersion: 1,
      ownerDocumentIdentity: previous.value.ownerDocumentIdentity,
      projectRevision: previous.value.projectRevision + 1,
      items: record["items"],
    });
    if (!next.accepted) return next;
    const previousItems = new Map(
      previous.value.items.map((item) => [item.presentationOverrideIdentity, item]),
    );
    for (const item of next.value.items) {
      const prior = previousItems.get(item.presentationOverrideIdentity);
      if (prior === undefined) {
        if (item.overrideRevision !== 1) {
          return Object.freeze({
            accepted: false,
            code: "DISPLAY_VALUE_OVERRIDE_REVISION_INVALID",
          });
        }
        continue;
      }
      const normalizedCandidate = { ...item, overrideRevision: prior.overrideRevision };
      const changed = canonicalizeJson(normalizedCandidate) !== canonicalizeJson(prior);
      if (
        item.overrideRevision !== (changed ? prior.overrideRevision + 1 : prior.overrideRevision)
      ) {
        return Object.freeze({
          accepted: false,
          code: "DISPLAY_VALUE_OVERRIDE_REVISION_INVALID",
        });
      }
    }
    return next;
  } catch (error) {
    return rejected(error);
  }
}

export function displayValueTypeOf(input: unknown): DisplayValueOverrideResult<OverrideValueType> {
  const decoded = decodeDomainValueRecord(input);
  return decoded.accepted
    ? Object.freeze({ accepted: true, value: valueType(decoded.value.content) })
    : Object.freeze({ accepted: false, code: "DISPLAY_VALUE_OVERRIDE_WRONG_TYPE" });
}
