import {
  canonicalizeJson,
  defineOpaqueIdentityCodec,
  parseSha256Digest,
  sha256CanonicalJson,
} from "@rsrender/contracts";
import type { OpaqueIdentity, OpaqueIdentityCodec, Sha256Digest } from "@rsrender/contracts";

export const aggregateSkeletonVersion = 1 as const;

export type DocumentIdentity = OpaqueIdentity<"DocumentIdentity">;
export type TemplateIdentity = OpaqueIdentity<"TemplateIdentity">;
export type SourceContextIdentity = OpaqueIdentity<"SourceContextIdentity">;
export type SourceProjectIdentity = OpaqueIdentity<"SourceProjectIdentity">;
export type SourceExplorationIdentity = OpaqueIdentity<"SourceExplorationIdentity">;
export type LogSetIdentity = OpaqueIdentity<"LogSetIdentity">;
export type ExplorationMembershipIdentity = OpaqueIdentity<"ExplorationMembershipIdentity">;
export type BoringLogIdentity = OpaqueIdentity<"BoringLogIdentity">;
export type ExplorationGroupIdentity = OpaqueIdentity<"ExplorationGroupIdentity">;
export type LocalGroupIdentity = OpaqueIdentity<"LocalGroupIdentity">;
export type TemplateAssignmentIdentity = OpaqueIdentity<"TemplateAssignmentIdentity">;
export type LocalAssignmentIdentity = OpaqueIdentity<"LocalAssignmentIdentity">;
export type EmbeddedTemplateRepresentationIdentity =
  OpaqueIdentity<"EmbeddedTemplateRepresentationIdentity">;
export type SeparationOperationIdentity = OpaqueIdentity<"SeparationOperationIdentity">;

export const documentIdentityCodec = defineOpaqueIdentityCodec("DocumentIdentity");
export const templateIdentityCodec = defineOpaqueIdentityCodec("TemplateIdentity");
export const sourceContextIdentityCodec = defineOpaqueIdentityCodec("SourceContextIdentity");
export const sourceProjectIdentityCodec = defineOpaqueIdentityCodec("SourceProjectIdentity");
export const sourceExplorationIdentityCodec = defineOpaqueIdentityCodec(
  "SourceExplorationIdentity",
);
export const logSetIdentityCodec = defineOpaqueIdentityCodec("LogSetIdentity");
export const explorationMembershipIdentityCodec = defineOpaqueIdentityCodec(
  "ExplorationMembershipIdentity",
);
export const boringLogIdentityCodec = defineOpaqueIdentityCodec("BoringLogIdentity");
export const explorationGroupIdentityCodec = defineOpaqueIdentityCodec("ExplorationGroupIdentity");
export const localGroupIdentityCodec = defineOpaqueIdentityCodec("LocalGroupIdentity");
export const templateAssignmentIdentityCodec = defineOpaqueIdentityCodec(
  "TemplateAssignmentIdentity",
);
export const localAssignmentIdentityCodec = defineOpaqueIdentityCodec("LocalAssignmentIdentity");
export const embeddedTemplateRepresentationIdentityCodec = defineOpaqueIdentityCodec(
  "EmbeddedTemplateRepresentationIdentity",
);
export const separationOperationIdentityCodec = defineOpaqueIdentityCodec(
  "SeparationOperationIdentity",
);

export type AggregateRejectionCode =
  | "AGGREGATE_EXTRA_FIELD"
  | "AGGREGATE_MALFORMED"
  | "AGGREGATE_MISSING_FIELD"
  | "AGGREGATE_UNKNOWN_TAG"
  | "AGGREGATE_UNSUPPORTED_VERSION"
  | "AGGREGATE_WRONG_TYPE"
  | "ASSIGNMENT_IDENTITY_DUPLICATE"
  | "ASSIGNMENT_IDENTITY_MISMATCH"
  | "ASSIGNMENT_SCOPE_ORPHANED"
  | "ETR_DIVERGENCE_INVALID"
  | "ETR_DUPLICATE_IDENTITY"
  | "ETR_DUPLICATE_TEMPLATE_DIGEST"
  | "ETR_IDENTITY_MISMATCH"
  | "ETR_REPLACEMENT_INVALID"
  | "GROUP_CYCLE"
  | "GROUP_DUPLICATE_IDENTITY"
  | "GROUP_IDENTITY_MISMATCH"
  | "GROUP_PARENT_ORPHANED"
  | "LOG_SET_IDENTITY_MISMATCH"
  | "MEMBERSHIP_DUPLICATE_EXPLORATION"
  | "MEMBERSHIP_DUPLICATE_IDENTITY"
  | "MEMBERSHIP_GROUP_ORPHANED"
  | "MEMBERSHIP_IDENTITY_MISMATCH"
  | "TEMPLATE_ASSIGNMENT_AMBIGUOUS"
  | "TEMPLATE_ASSIGNMENT_ETR_ORPHANED"
  | "TEMPLATE_ASSIGNMENT_MISSING";

export interface LogTemplateAggregate {
  readonly aggregateVersion: typeof aggregateSkeletonVersion;
  readonly aggregateKind: "log-template";
  readonly documentIdentity: DocumentIdentity;
  readonly templateIdentity: TemplateIdentity;
  readonly currentContentDigest: Sha256Digest;
}

export interface ExplorationMembership {
  readonly membershipIdentity: ExplorationMembershipIdentity;
  readonly sourceExplorationIdentity: SourceExplorationIdentity;
  readonly groupIdentity: ExplorationGroupIdentity | null;
}

export interface ExplorationGroup {
  readonly groupIdentity: ExplorationGroupIdentity;
  readonly localGroupIdentity: LocalGroupIdentity;
  readonly parentGroupIdentity: ExplorationGroupIdentity | null;
}

export type TemplateAssignmentScope =
  | { readonly kind: "log-set"; readonly targetIdentity: LogSetIdentity }
  | { readonly kind: "group"; readonly targetIdentity: ExplorationGroupIdentity }
  | { readonly kind: "exploration"; readonly targetIdentity: ExplorationMembershipIdentity };

export interface TemplateAssignment {
  readonly assignmentIdentity: TemplateAssignmentIdentity;
  readonly localAssignmentIdentity: LocalAssignmentIdentity;
  readonly scope: TemplateAssignmentScope;
  readonly embeddedTemplateRepresentationIdentity: EmbeddedTemplateRepresentationIdentity;
}

export type EmbeddedTemplateRepresentationOrigin =
  | { readonly kind: "admitted-template" }
  | {
      readonly kind: "separate-template";
      readonly separationOperationIdentity: SeparationOperationIdentity;
    };

export interface EmbeddedTemplateRepresentation {
  readonly embeddedTemplateRepresentationIdentity: EmbeddedTemplateRepresentationIdentity;
  readonly admittedTemplateIdentity: TemplateIdentity;
  readonly effectiveContentDigest: Sha256Digest;
  readonly origin: EmbeddedTemplateRepresentationOrigin;
}

export interface LogSetComposition {
  readonly logSetIdentity: LogSetIdentity;
  readonly memberships: readonly ExplorationMembership[];
  readonly groups: readonly ExplorationGroup[];
  readonly embeddedTemplateRepresentations: readonly EmbeddedTemplateRepresentation[];
  readonly templateAssignments: readonly TemplateAssignment[];
}

export interface LogProjectAggregate {
  readonly aggregateVersion: typeof aggregateSkeletonVersion;
  readonly aggregateKind: "log-project";
  readonly documentIdentity: DocumentIdentity;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly sourceProjectIdentity: SourceProjectIdentity;
  readonly logSet: LogSetComposition;
}

export type AggregateDecodeResult<T> =
  | { readonly accepted: true; readonly value: T }
  | { readonly accepted: false; readonly code: AggregateRejectionCode };

export type AggregateEncodeResult =
  | { readonly accepted: true; readonly json: string }
  | { readonly accepted: false; readonly code: AggregateRejectionCode };

export interface EffectiveTemplateAssignment {
  readonly membershipIdentity: ExplorationMembershipIdentity;
  readonly boringLogIdentity: BoringLogIdentity;
  readonly assignmentIdentity: TemplateAssignmentIdentity;
  readonly embeddedTemplateRepresentationIdentity: EmbeddedTemplateRepresentationIdentity;
  readonly origin: "exploration" | "group" | "log-set";
  readonly originTargetIdentity:
    ExplorationMembershipIdentity | ExplorationGroupIdentity | LogSetIdentity;
  readonly inherited: boolean;
}

export type EffectiveAssignmentResult =
  | { readonly resolved: true; readonly value: EffectiveTemplateAssignment }
  | {
      readonly resolved: false;
      readonly code: AggregateRejectionCode;
      readonly membershipIdentity?: ExplorationMembershipIdentity;
    };

export type CompleteAssignmentEvaluationResult =
  | { readonly complete: true; readonly assignments: readonly EffectiveTemplateAssignment[] }
  | {
      readonly complete: false;
      readonly code: AggregateRejectionCode;
      readonly membershipIdentity?: ExplorationMembershipIdentity;
    };

class AggregateFailure extends Error {
  readonly code: AggregateRejectionCode;

  constructor(code: AggregateRejectionCode) {
    super(code);
    this.name = "AggregateFailure";
    this.code = code;
  }
}

type DataRecord = Readonly<Record<string, unknown>>;

function fail(code: AggregateRejectionCode): never {
  throw new AggregateFailure(code);
}

function readRecord(value: unknown): DataRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("AGGREGATE_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return fail("AGGREGATE_MALFORMED");
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return fail("AGGREGATE_EXTRA_FIELD");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("AGGREGATE_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("AGGREGATE_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("AGGREGATE_EXTRA_FIELD");
  }
}

function readArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return fail("AGGREGATE_WRONG_TYPE");
  }
  const allowed = new Set<string>(["length"]);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("AGGREGATE_MALFORMED");
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("AGGREGATE_EXTRA_FIELD");
  }
  return result;
}

function readTag(record: DataRecord, field: string): string {
  const value = record[field];
  if (typeof value !== "string") return fail("AGGREGATE_WRONG_TYPE");
  return value;
}

function readIdentity<Kind extends string>(
  value: unknown,
  codec: OpaqueIdentityCodec<Kind>,
): OpaqueIdentity<Kind> {
  try {
    return codec.parse(value);
  } catch {
    return fail("AGGREGATE_WRONG_TYPE");
  }
}

function readDigest(value: unknown): Sha256Digest {
  try {
    return parseSha256Digest(value);
  } catch {
    return fail("AGGREGATE_WRONG_TYPE");
  }
}

function readVersion(value: unknown): typeof aggregateSkeletonVersion {
  if (typeof value !== "number") return fail("AGGREGATE_WRONG_TYPE");
  if (value !== aggregateSkeletonVersion) return fail("AGGREGATE_UNSUPPORTED_VERSION");
  return aggregateSkeletonVersion;
}

function derivedIdentity<Kind extends string>(
  kind: string,
  components: DataRecord,
  codec: OpaqueIdentityCodec<Kind>,
): OpaqueIdentity<Kind> {
  const digest = sha256CanonicalJson({ kind, ...components });
  return codec.parse(`urn:rsrender:${kind}:${digest.slice("sha256:".length)}`);
}

export function deriveLogSetIdentity(documentIdentity: DocumentIdentity): LogSetIdentity {
  return derivedIdentity("log-set", { documentIdentity }, logSetIdentityCodec);
}

export function deriveExplorationMembershipIdentity(
  documentIdentity: DocumentIdentity,
  sourceExplorationIdentity: SourceExplorationIdentity,
): ExplorationMembershipIdentity {
  return derivedIdentity(
    "exploration-membership",
    { documentIdentity, sourceExplorationIdentity },
    explorationMembershipIdentityCodec,
  );
}

export function deriveBoringLogIdentity(
  documentIdentity: DocumentIdentity,
  membershipIdentity: ExplorationMembershipIdentity,
): BoringLogIdentity {
  return derivedIdentity(
    "boring-log",
    { documentIdentity, membershipIdentity },
    boringLogIdentityCodec,
  );
}

export function deriveExplorationGroupIdentity(
  documentIdentity: DocumentIdentity,
  localGroupIdentity: LocalGroupIdentity,
): ExplorationGroupIdentity {
  return derivedIdentity(
    "exploration-group",
    { documentIdentity, localGroupIdentity },
    explorationGroupIdentityCodec,
  );
}

export function deriveEmbeddedTemplateRepresentationIdentity(
  documentIdentity: DocumentIdentity,
  admittedTemplateIdentity: TemplateIdentity,
  effectiveContentDigest: Sha256Digest,
): EmbeddedTemplateRepresentationIdentity {
  return derivedIdentity(
    "embedded-template-representation",
    { documentIdentity, admittedTemplateIdentity, effectiveContentDigest },
    embeddedTemplateRepresentationIdentityCodec,
  );
}

export function deriveTemplateAssignmentIdentity(
  documentIdentity: DocumentIdentity,
  localAssignmentIdentity: LocalAssignmentIdentity,
  scope: TemplateAssignmentScope,
): TemplateAssignmentIdentity {
  return derivedIdentity(
    "template-assignment",
    {
      documentIdentity,
      localAssignmentIdentity,
      scopeKind: scope.kind,
      scopeTargetIdentity: scope.targetIdentity,
    },
    templateAssignmentIdentityCodec,
  );
}

function parseMembership(
  value: unknown,
  documentIdentity: DocumentIdentity,
): ExplorationMembership {
  const record = readRecord(value);
  requireFields(record, ["membershipIdentity", "sourceExplorationIdentity", "groupIdentity"]);
  const membershipIdentity = readIdentity(
    record["membershipIdentity"],
    explorationMembershipIdentityCodec,
  );
  const sourceExplorationIdentity = readIdentity(
    record["sourceExplorationIdentity"],
    sourceExplorationIdentityCodec,
  );
  const groupIdentity =
    record["groupIdentity"] === null
      ? null
      : readIdentity(record["groupIdentity"], explorationGroupIdentityCodec);
  if (
    membershipIdentity !==
    deriveExplorationMembershipIdentity(documentIdentity, sourceExplorationIdentity)
  ) {
    return fail("MEMBERSHIP_IDENTITY_MISMATCH");
  }
  return Object.freeze({ membershipIdentity, sourceExplorationIdentity, groupIdentity });
}

function parseGroup(value: unknown, documentIdentity: DocumentIdentity): ExplorationGroup {
  const record = readRecord(value);
  requireFields(record, ["groupIdentity", "localGroupIdentity", "parentGroupIdentity"]);
  const groupIdentity = readIdentity(record["groupIdentity"], explorationGroupIdentityCodec);
  const localGroupIdentity = readIdentity(record["localGroupIdentity"], localGroupIdentityCodec);
  const parentGroupIdentity =
    record["parentGroupIdentity"] === null
      ? null
      : readIdentity(record["parentGroupIdentity"], explorationGroupIdentityCodec);
  if (groupIdentity !== deriveExplorationGroupIdentity(documentIdentity, localGroupIdentity)) {
    return fail("GROUP_IDENTITY_MISMATCH");
  }
  return Object.freeze({ groupIdentity, localGroupIdentity, parentGroupIdentity });
}

function parseOrigin(value: unknown): EmbeddedTemplateRepresentationOrigin {
  const record = readRecord(value);
  if (!Object.hasOwn(record, "kind")) return fail("AGGREGATE_MISSING_FIELD");
  const kind = readTag(record, "kind");
  if (kind === "admitted-template") {
    requireFields(record, ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind === "separate-template") {
    requireFields(record, ["kind", "separationOperationIdentity"]);
    return Object.freeze({
      kind,
      separationOperationIdentity: readIdentity(
        record["separationOperationIdentity"],
        separationOperationIdentityCodec,
      ),
    });
  }
  return fail("AGGREGATE_UNKNOWN_TAG");
}

function parseEmbeddedTemplateRepresentation(
  value: unknown,
  documentIdentity: DocumentIdentity,
): EmbeddedTemplateRepresentation {
  const record = readRecord(value);
  requireFields(record, [
    "embeddedTemplateRepresentationIdentity",
    "admittedTemplateIdentity",
    "effectiveContentDigest",
    "origin",
  ]);
  const embeddedTemplateRepresentationIdentity = readIdentity(
    record["embeddedTemplateRepresentationIdentity"],
    embeddedTemplateRepresentationIdentityCodec,
  );
  const admittedTemplateIdentity = readIdentity(
    record["admittedTemplateIdentity"],
    templateIdentityCodec,
  );
  const effectiveContentDigest = readDigest(record["effectiveContentDigest"]);
  if (
    embeddedTemplateRepresentationIdentity !==
    deriveEmbeddedTemplateRepresentationIdentity(
      documentIdentity,
      admittedTemplateIdentity,
      effectiveContentDigest,
    )
  ) {
    return fail("ETR_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    embeddedTemplateRepresentationIdentity,
    admittedTemplateIdentity,
    effectiveContentDigest,
    origin: parseOrigin(record["origin"]),
  });
}

function parseScope(value: unknown): TemplateAssignmentScope {
  const record = readRecord(value);
  requireFields(record, ["kind", "targetIdentity"]);
  const kind = readTag(record, "kind");
  if (kind === "log-set") {
    return Object.freeze({
      kind,
      targetIdentity: readIdentity(record["targetIdentity"], logSetIdentityCodec),
    });
  }
  if (kind === "group") {
    return Object.freeze({
      kind,
      targetIdentity: readIdentity(record["targetIdentity"], explorationGroupIdentityCodec),
    });
  }
  if (kind === "exploration") {
    return Object.freeze({
      kind,
      targetIdentity: readIdentity(record["targetIdentity"], explorationMembershipIdentityCodec),
    });
  }
  return fail("AGGREGATE_UNKNOWN_TAG");
}

function parseAssignment(value: unknown, documentIdentity: DocumentIdentity): TemplateAssignment {
  const record = readRecord(value);
  requireFields(record, [
    "assignmentIdentity",
    "localAssignmentIdentity",
    "scope",
    "embeddedTemplateRepresentationIdentity",
  ]);
  const assignmentIdentity = readIdentity(
    record["assignmentIdentity"],
    templateAssignmentIdentityCodec,
  );
  const localAssignmentIdentity = readIdentity(
    record["localAssignmentIdentity"],
    localAssignmentIdentityCodec,
  );
  const scope = parseScope(record["scope"]);
  if (
    assignmentIdentity !==
    deriveTemplateAssignmentIdentity(documentIdentity, localAssignmentIdentity, scope)
  ) {
    return fail("ASSIGNMENT_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    assignmentIdentity,
    localAssignmentIdentity,
    scope,
    embeddedTemplateRepresentationIdentity: readIdentity(
      record["embeddedTemplateRepresentationIdentity"],
      embeddedTemplateRepresentationIdentityCodec,
    ),
  });
}

function assertUnique<T>(
  values: readonly T[],
  identity: (value: T) => string,
  code: AggregateRejectionCode,
): void {
  const identities = new Set<string>();
  for (const value of values) {
    const key = identity(value);
    if (identities.has(key)) return fail(code);
    identities.add(key);
  }
}

function assertGroupIntegrity(groups: readonly ExplorationGroup[]): void {
  const groupMap = new Map(groups.map((group) => [group.groupIdentity, group]));
  for (const group of groups) {
    if (group.parentGroupIdentity !== null && !groupMap.has(group.parentGroupIdentity)) {
      return fail("GROUP_PARENT_ORPHANED");
    }
    const visited = new Set<ExplorationGroupIdentity>();
    let current: ExplorationGroup | undefined = group;
    while (current !== undefined && current.parentGroupIdentity !== null) {
      if (visited.has(current.groupIdentity)) return fail("GROUP_CYCLE");
      visited.add(current.groupIdentity);
      current = groupMap.get(current.parentGroupIdentity);
    }
  }
}

function scopeKey(scope: TemplateAssignmentScope): string {
  return `${scope.kind}\u0000${scope.targetIdentity}`;
}

function parseLogSet(value: unknown, documentIdentity: DocumentIdentity): LogSetComposition {
  const record = readRecord(value);
  requireFields(record, [
    "logSetIdentity",
    "memberships",
    "groups",
    "embeddedTemplateRepresentations",
    "templateAssignments",
  ]);
  const logSetIdentity = readIdentity(record["logSetIdentity"], logSetIdentityCodec);
  if (logSetIdentity !== deriveLogSetIdentity(documentIdentity)) {
    return fail("LOG_SET_IDENTITY_MISMATCH");
  }
  const groups = Object.freeze(
    readArray(record["groups"]).map((group) => parseGroup(group, documentIdentity)),
  );
  const memberships = Object.freeze(
    readArray(record["memberships"]).map((membership) =>
      parseMembership(membership, documentIdentity),
    ),
  );
  const embeddedTemplateRepresentations = Object.freeze(
    readArray(record["embeddedTemplateRepresentations"]).map((etr) =>
      parseEmbeddedTemplateRepresentation(etr, documentIdentity),
    ),
  );
  const templateAssignments = Object.freeze(
    readArray(record["templateAssignments"]).map((assignment) =>
      parseAssignment(assignment, documentIdentity),
    ),
  );

  assertUnique(groups, (group) => group.groupIdentity, "GROUP_DUPLICATE_IDENTITY");
  assertUnique(
    memberships,
    (membership) => membership.membershipIdentity,
    "MEMBERSHIP_DUPLICATE_IDENTITY",
  );
  assertUnique(
    memberships,
    (membership) => membership.sourceExplorationIdentity,
    "MEMBERSHIP_DUPLICATE_EXPLORATION",
  );
  assertUnique(
    embeddedTemplateRepresentations,
    (etr) => etr.embeddedTemplateRepresentationIdentity,
    "ETR_DUPLICATE_IDENTITY",
  );
  assertUnique(
    embeddedTemplateRepresentations,
    (etr) => `${etr.admittedTemplateIdentity}\u0000${etr.effectiveContentDigest}`,
    "ETR_DUPLICATE_TEMPLATE_DIGEST",
  );
  assertUnique(
    templateAssignments,
    (assignment) => assignment.assignmentIdentity,
    "ASSIGNMENT_IDENTITY_DUPLICATE",
  );
  assertUnique(
    templateAssignments,
    (assignment) => scopeKey(assignment.scope),
    "TEMPLATE_ASSIGNMENT_AMBIGUOUS",
  );
  assertGroupIntegrity(groups);

  const groupIdentities = new Set(groups.map((group) => group.groupIdentity));
  const membershipIdentities = new Set(
    memberships.map((membership) => membership.membershipIdentity),
  );
  const etrIdentities = new Set(
    embeddedTemplateRepresentations.map((etr) => etr.embeddedTemplateRepresentationIdentity),
  );
  for (const membership of memberships) {
    if (membership.groupIdentity !== null && !groupIdentities.has(membership.groupIdentity)) {
      return fail("MEMBERSHIP_GROUP_ORPHANED");
    }
  }
  for (const assignment of templateAssignments) {
    if (!etrIdentities.has(assignment.embeddedTemplateRepresentationIdentity)) {
      return fail("TEMPLATE_ASSIGNMENT_ETR_ORPHANED");
    }
    const scopeExists =
      (assignment.scope.kind === "log-set" && assignment.scope.targetIdentity === logSetIdentity) ||
      (assignment.scope.kind === "group" && groupIdentities.has(assignment.scope.targetIdentity)) ||
      (assignment.scope.kind === "exploration" &&
        membershipIdentities.has(assignment.scope.targetIdentity));
    if (!scopeExists) return fail("ASSIGNMENT_SCOPE_ORPHANED");
  }
  return Object.freeze({
    logSetIdentity,
    memberships,
    groups,
    embeddedTemplateRepresentations,
    templateAssignments,
  });
}

function decodeTemplateUnchecked(input: unknown): LogTemplateAggregate {
  const record = readRecord(input);
  requireFields(record, [
    "aggregateVersion",
    "aggregateKind",
    "documentIdentity",
    "templateIdentity",
    "currentContentDigest",
  ]);
  readVersion(record["aggregateVersion"]);
  if (readTag(record, "aggregateKind") !== "log-template") return fail("AGGREGATE_UNKNOWN_TAG");
  return Object.freeze({
    aggregateVersion: aggregateSkeletonVersion,
    aggregateKind: "log-template" as const,
    documentIdentity: readIdentity(record["documentIdentity"], documentIdentityCodec),
    templateIdentity: readIdentity(record["templateIdentity"], templateIdentityCodec),
    currentContentDigest: readDigest(record["currentContentDigest"]),
  });
}

function decodeProjectUnchecked(input: unknown): LogProjectAggregate {
  const record = readRecord(input);
  requireFields(record, [
    "aggregateVersion",
    "aggregateKind",
    "documentIdentity",
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "logSet",
  ]);
  readVersion(record["aggregateVersion"]);
  if (readTag(record, "aggregateKind") !== "log-project") return fail("AGGREGATE_UNKNOWN_TAG");
  const documentIdentity = readIdentity(record["documentIdentity"], documentIdentityCodec);
  return Object.freeze({
    aggregateVersion: aggregateSkeletonVersion,
    aggregateKind: "log-project" as const,
    documentIdentity,
    sourceContextIdentity: readIdentity(
      record["sourceContextIdentity"],
      sourceContextIdentityCodec,
    ),
    sourceProjectIdentity: readIdentity(
      record["sourceProjectIdentity"],
      sourceProjectIdentityCodec,
    ),
    logSet: parseLogSet(record["logSet"], documentIdentity),
  });
}

function rejected<T>(code: AggregateRejectionCode): AggregateDecodeResult<T> {
  return Object.freeze({ accepted: false, code });
}

export function decodeLogTemplateAggregate(
  input: unknown,
): AggregateDecodeResult<LogTemplateAggregate> {
  try {
    return Object.freeze({ accepted: true, value: decodeTemplateUnchecked(input) });
  } catch (error) {
    return rejected(error instanceof AggregateFailure ? error.code : "AGGREGATE_MALFORMED");
  }
}

export function decodeLogProjectAggregate(
  input: unknown,
): AggregateDecodeResult<LogProjectAggregate> {
  try {
    return Object.freeze({ accepted: true, value: decodeProjectUnchecked(input) });
  } catch (error) {
    return rejected(error instanceof AggregateFailure ? error.code : "AGGREGATE_MALFORMED");
  }
}

function encodeDecoded<T>(decoded: AggregateDecodeResult<T>): AggregateEncodeResult {
  if (!decoded.accepted) return decoded;
  try {
    return Object.freeze({ accepted: true, json: canonicalizeJson(decoded.value as never) });
  } catch {
    return Object.freeze({ accepted: false, code: "AGGREGATE_MALFORMED" });
  }
}

export function encodeLogTemplateAggregate(input: unknown): AggregateEncodeResult {
  return encodeDecoded(decodeLogTemplateAggregate(input));
}

export function encodeLogProjectAggregate(input: unknown): AggregateEncodeResult {
  return encodeDecoded(decodeLogProjectAggregate(input));
}

export function createEmptyLogTemplate(input: {
  readonly documentIdentity: unknown;
  readonly templateIdentity: unknown;
  readonly currentContentDigest: unknown;
}): AggregateDecodeResult<LogTemplateAggregate> {
  return decodeLogTemplateAggregate({
    aggregateVersion: aggregateSkeletonVersion,
    aggregateKind: "log-template",
    documentIdentity: input.documentIdentity,
    templateIdentity: input.templateIdentity,
    currentContentDigest: input.currentContentDigest,
  });
}

export function createEmptyLogProject(input: {
  readonly documentIdentity: unknown;
  readonly sourceContextIdentity: unknown;
  readonly sourceProjectIdentity: unknown;
}): AggregateDecodeResult<LogProjectAggregate> {
  try {
    const documentIdentity = documentIdentityCodec.parse(input.documentIdentity);
    return decodeLogProjectAggregate({
      aggregateVersion: aggregateSkeletonVersion,
      aggregateKind: "log-project",
      documentIdentity,
      sourceContextIdentity: input.sourceContextIdentity,
      sourceProjectIdentity: input.sourceProjectIdentity,
      logSet: {
        logSetIdentity: deriveLogSetIdentity(documentIdentity),
        memberships: [],
        groups: [],
        embeddedTemplateRepresentations: [],
        templateAssignments: [],
      },
    });
  } catch {
    return rejected("AGGREGATE_WRONG_TYPE");
  }
}

function resolutionFailure(
  code: AggregateRejectionCode,
  membershipIdentity?: ExplorationMembershipIdentity,
): EffectiveAssignmentResult {
  return Object.freeze(
    membershipIdentity === undefined
      ? { resolved: false, code }
      : { resolved: false, code, membershipIdentity },
  );
}

function assignmentAtScope(
  assignments: readonly TemplateAssignment[],
  scopeKind: TemplateAssignmentScope["kind"],
  targetIdentity: string,
  membershipIdentity: ExplorationMembershipIdentity,
): TemplateAssignment | EffectiveAssignmentResult | undefined {
  const matches = assignments.filter(
    (assignment) =>
      assignment.scope.kind === scopeKind && assignment.scope.targetIdentity === targetIdentity,
  );
  if (matches.length > 1) {
    return resolutionFailure("TEMPLATE_ASSIGNMENT_AMBIGUOUS", membershipIdentity);
  }
  return matches[0];
}

export function resolveEffectiveTemplateAssignment(
  input: unknown,
  requestedMembershipIdentity: unknown,
): EffectiveAssignmentResult {
  const decoded = decodeLogProjectAggregate(input);
  if (!decoded.accepted) return resolutionFailure(decoded.code);
  let membershipIdentity: ExplorationMembershipIdentity;
  try {
    membershipIdentity = explorationMembershipIdentityCodec.parse(requestedMembershipIdentity);
  } catch {
    return resolutionFailure("AGGREGATE_WRONG_TYPE");
  }
  const project = decoded.value;
  const membership = project.logSet.memberships.find(
    (candidate) => candidate.membershipIdentity === membershipIdentity,
  );
  if (membership === undefined) return resolutionFailure("ASSIGNMENT_SCOPE_ORPHANED");
  const groupMap = new Map(project.logSet.groups.map((group) => [group.groupIdentity, group]));
  const candidates: {
    readonly assignment: TemplateAssignment | EffectiveAssignmentResult | undefined;
    readonly origin: EffectiveTemplateAssignment["origin"];
    readonly targetIdentity: EffectiveTemplateAssignment["originTargetIdentity"];
  }[] = [
    {
      assignment: assignmentAtScope(
        project.logSet.templateAssignments,
        "exploration",
        membershipIdentity,
        membershipIdentity,
      ),
      origin: "exploration",
      targetIdentity: membershipIdentity,
    },
  ];
  let groupIdentity = membership.groupIdentity;
  while (groupIdentity !== null) {
    candidates.push({
      assignment: assignmentAtScope(
        project.logSet.templateAssignments,
        "group",
        groupIdentity,
        membershipIdentity,
      ),
      origin: "group",
      targetIdentity: groupIdentity,
    });
    groupIdentity = groupMap.get(groupIdentity)?.parentGroupIdentity ?? null;
  }
  candidates.push({
    assignment: assignmentAtScope(
      project.logSet.templateAssignments,
      "log-set",
      project.logSet.logSetIdentity,
      membershipIdentity,
    ),
    origin: "log-set",
    targetIdentity: project.logSet.logSetIdentity,
  });
  for (const candidate of candidates) {
    if (candidate.assignment === undefined) continue;
    if ("resolved" in candidate.assignment) return candidate.assignment;
    return Object.freeze({
      resolved: true,
      value: Object.freeze({
        membershipIdentity,
        boringLogIdentity: deriveBoringLogIdentity(project.documentIdentity, membershipIdentity),
        assignmentIdentity: candidate.assignment.assignmentIdentity,
        embeddedTemplateRepresentationIdentity:
          candidate.assignment.embeddedTemplateRepresentationIdentity,
        origin: candidate.origin,
        originTargetIdentity: candidate.targetIdentity,
        inherited: candidate.origin !== "exploration",
      }),
    });
  }
  return resolutionFailure("TEMPLATE_ASSIGNMENT_MISSING", membershipIdentity);
}

export function evaluateCompleteTemplateAssignments(
  input: unknown,
): CompleteAssignmentEvaluationResult {
  const decoded = decodeLogProjectAggregate(input);
  if (!decoded.accepted) return Object.freeze({ complete: false, code: decoded.code });
  const assignments: EffectiveTemplateAssignment[] = [];
  for (const membership of decoded.value.logSet.memberships) {
    const result = resolveEffectiveTemplateAssignment(decoded.value, membership.membershipIdentity);
    if (!result.resolved) {
      return Object.freeze({
        complete: false,
        code: result.code,
        membershipIdentity: membership.membershipIdentity,
      });
    }
    assignments.push(result.value);
  }
  return Object.freeze({ complete: true, assignments: Object.freeze(assignments) });
}

function rewriteProject(
  project: LogProjectAggregate,
  embeddedTemplateRepresentations: readonly EmbeddedTemplateRepresentation[],
  templateAssignments: readonly TemplateAssignment[],
): AggregateDecodeResult<LogProjectAggregate> {
  return decodeLogProjectAggregate({
    ...project,
    logSet: {
      ...project.logSet,
      embeddedTemplateRepresentations,
      templateAssignments,
    },
  });
}

export function replaceSharedEmbeddedTemplateRepresentation(
  input: unknown,
  replacement: {
    readonly sourceEmbeddedTemplateRepresentationIdentity: unknown;
    readonly newEffectiveContentDigest: unknown;
  },
): AggregateDecodeResult<LogProjectAggregate> {
  const decoded = decodeLogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  try {
    const sourceIdentity = embeddedTemplateRepresentationIdentityCodec.parse(
      replacement.sourceEmbeddedTemplateRepresentationIdentity,
    );
    const newDigest = parseSha256Digest(replacement.newEffectiveContentDigest);
    const source = decoded.value.logSet.embeddedTemplateRepresentations.find(
      (etr) => etr.embeddedTemplateRepresentationIdentity === sourceIdentity,
    );
    if (source === undefined) return rejected("ETR_REPLACEMENT_INVALID");
    const newIdentity = deriveEmbeddedTemplateRepresentationIdentity(
      decoded.value.documentIdentity,
      source.admittedTemplateIdentity,
      newDigest,
    );
    if (newIdentity === sourceIdentity) return decoded;
    const existing = decoded.value.logSet.embeddedTemplateRepresentations.find(
      (etr) => etr.embeddedTemplateRepresentationIdentity === newIdentity,
    );
    const replacementEtr =
      existing ??
      Object.freeze({
        embeddedTemplateRepresentationIdentity: newIdentity,
        admittedTemplateIdentity: source.admittedTemplateIdentity,
        effectiveContentDigest: newDigest,
        origin: source.origin,
      });
    const etrs = decoded.value.logSet.embeddedTemplateRepresentations
      .filter((etr) => etr.embeddedTemplateRepresentationIdentity !== sourceIdentity)
      .concat(existing === undefined ? [replacementEtr] : []);
    const assignments = decoded.value.logSet.templateAssignments.map((assignment) =>
      assignment.embeddedTemplateRepresentationIdentity === sourceIdentity
        ? Object.freeze({
            ...assignment,
            embeddedTemplateRepresentationIdentity: newIdentity,
          })
        : assignment,
    );
    return rewriteProject(decoded.value, etrs, assignments);
  } catch {
    return rejected("ETR_REPLACEMENT_INVALID");
  }
}

export function divergeEmbeddedTemplateRepresentation(
  input: unknown,
  divergence: {
    readonly sourceEmbeddedTemplateRepresentationIdentity: unknown;
    readonly newAdmittedTemplateIdentity: unknown;
    readonly newEffectiveContentDigest: unknown;
    readonly separationOperationIdentity: unknown;
    readonly assignmentIdentitiesToReassign: readonly unknown[];
  },
): AggregateDecodeResult<LogProjectAggregate> {
  const decoded = decodeLogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  try {
    const sourceIdentity = embeddedTemplateRepresentationIdentityCodec.parse(
      divergence.sourceEmbeddedTemplateRepresentationIdentity,
    );
    const newTemplateIdentity = templateIdentityCodec.parse(divergence.newAdmittedTemplateIdentity);
    const newDigest = parseSha256Digest(divergence.newEffectiveContentDigest);
    const separationOperationIdentity = separationOperationIdentityCodec.parse(
      divergence.separationOperationIdentity,
    );
    const source = decoded.value.logSet.embeddedTemplateRepresentations.find(
      (etr) => etr.embeddedTemplateRepresentationIdentity === sourceIdentity,
    );
    if (source === undefined || source.admittedTemplateIdentity === newTemplateIdentity) {
      return rejected("ETR_DIVERGENCE_INVALID");
    }
    const assignmentIdentities = divergence.assignmentIdentitiesToReassign.map((identity) =>
      templateAssignmentIdentityCodec.parse(identity),
    );
    if (
      assignmentIdentities.length === 0 ||
      new Set(assignmentIdentities).size !== assignmentIdentities.length
    ) {
      return rejected("ETR_DIVERGENCE_INVALID");
    }
    const assignmentsById = new Map(
      decoded.value.logSet.templateAssignments.map((assignment) => [
        assignment.assignmentIdentity,
        assignment,
      ]),
    );
    if (
      assignmentIdentities.some(
        (identity) =>
          assignmentsById.get(identity)?.embeddedTemplateRepresentationIdentity !== sourceIdentity,
      )
    ) {
      return rejected("ETR_DIVERGENCE_INVALID");
    }
    const newIdentity = deriveEmbeddedTemplateRepresentationIdentity(
      decoded.value.documentIdentity,
      newTemplateIdentity,
      newDigest,
    );
    if (
      decoded.value.logSet.embeddedTemplateRepresentations.some(
        (etr) => etr.embeddedTemplateRepresentationIdentity === newIdentity,
      )
    ) {
      return rejected("ETR_DIVERGENCE_INVALID");
    }
    const selected = new Set(assignmentIdentities);
    const assignments = decoded.value.logSet.templateAssignments.map((assignment) =>
      selected.has(assignment.assignmentIdentity)
        ? Object.freeze({
            ...assignment,
            embeddedTemplateRepresentationIdentity: newIdentity,
          })
        : assignment,
    );
    const sourceStillReferenced = assignments.some(
      (assignment) => assignment.embeddedTemplateRepresentationIdentity === sourceIdentity,
    );
    const newEtr: EmbeddedTemplateRepresentation = Object.freeze({
      embeddedTemplateRepresentationIdentity: newIdentity,
      admittedTemplateIdentity: newTemplateIdentity,
      effectiveContentDigest: newDigest,
      origin: Object.freeze({ kind: "separate-template", separationOperationIdentity }),
    });
    const etrs = decoded.value.logSet.embeddedTemplateRepresentations
      .filter(
        (etr) =>
          etr.embeddedTemplateRepresentationIdentity !== sourceIdentity || sourceStillReferenced,
      )
      .concat(newEtr);
    return rewriteProject(decoded.value, etrs, assignments);
  } catch {
    return rejected("ETR_DIVERGENCE_INVALID");
  }
}
