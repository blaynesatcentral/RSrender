import {
  canonicalizeJson,
  isSha256Digest,
  sha256CanonicalJson,
  type Sha256Digest,
} from "@rsrender/contracts";

/** Exact invalidation identity for the bounded BLD-014 Diagnostic fact kernel. */
export const diagnosticFactContractRevision = "bld-014-v1" as const;
export const diagnosticFactVersion = 1 as const;

export const DIAGNOSTIC_FACT_CATEGORIES = Object.freeze([
  "source",
  "data",
  "integrity",
  "template",
  "binding",
  "text",
  "layout",
  "font",
  "asset",
  "document",
  "publication",
  "export",
  "security",
  "recovery",
] as const);

export const DIAGNOSTIC_FACT_CONSEQUENCES = Object.freeze([
  "unavailable",
  "ignored",
  "fallback",
  "conflict",
  "candidate-ineligible",
  "render-ineligible",
  "export-policy-input",
] as const);

export type DiagnosticFactCategory = (typeof DIAGNOSTIC_FACT_CATEGORIES)[number];
export type DiagnosticFactConsequence = (typeof DIAGNOSTIC_FACT_CONSEQUENCES)[number];

export type DiagnosticFactRejectionCode =
  | "DIAGNOSTIC_FACT_MALFORMED"
  | "DIAGNOSTIC_FACT_MISSING_FIELD"
  | "DIAGNOSTIC_FACT_EXTRA_FIELD"
  | "DIAGNOSTIC_FACT_WRONG_TYPE"
  | "DIAGNOSTIC_FACT_UNKNOWN_TAG"
  | "DIAGNOSTIC_FACT_UNSUPPORTED_VERSION"
  | "DIAGNOSTIC_FACT_INVALID_ATOM"
  | "DIAGNOSTIC_FACT_UNSAFE_UNICODE"
  | "DIAGNOSTIC_FACT_INVALID_COMBINATION"
  | "DIAGNOSTIC_FACT_IDENTITY_MISMATCH"
  | "DIAGNOSTIC_FACT_ORDER_MISMATCH"
  | "DIAGNOSTIC_FACT_DUPLICATE_IDENTITY";

export interface DiagnosticFactAffectedIdentity {
  readonly identityKind: string;
  readonly identity: string;
  readonly path?: string;
}

export interface DiagnosticFactCause {
  readonly causeKey: string;
  readonly evidenceClass: string;
}

export interface DiagnosticFactInput {
  readonly revision: string;
  readonly digest: Sha256Digest;
}

export type DiagnosticFactOrderingKey = readonly [
  category: DiagnosticFactCategory,
  code: string,
  affectedIdentityKind: string,
  affectedIdentity: string,
  affectedPathOrEmpty: string,
  causeKey: string,
  inputRevision: string,
  inputDigest: Sha256Digest,
  diagnosticIdentity: Sha256Digest,
  factContentDigest: Sha256Digest,
];

export interface DiagnosticFactDraft {
  readonly factVersion: 1;
  readonly code: string;
  readonly category: DiagnosticFactCategory;
  readonly affected: DiagnosticFactAffectedIdentity;
  readonly cause: DiagnosticFactCause;
  readonly consequence: DiagnosticFactConsequence;
  readonly input: DiagnosticFactInput;
  readonly remediationActionIds: readonly string[];
}

export interface DiagnosticFact extends DiagnosticFactDraft {
  /** Digest of exactly code + affected identity/path + cause key + input revision. */
  readonly diagnosticIdentity: Sha256Digest;
  /** Fact ordering only; it is deliberately excluded from Diagnostic Identity. */
  readonly orderingKey: DiagnosticFactOrderingKey;
}

export type DiagnosticFactDecodeResult =
  | { readonly accepted: true; readonly value: DiagnosticFact }
  | { readonly accepted: false; readonly code: DiagnosticFactRejectionCode };

export type DiagnosticFactSetDecodeResult =
  | { readonly accepted: true; readonly value: readonly DiagnosticFact[] }
  | { readonly accepted: false; readonly code: DiagnosticFactRejectionCode };

export type DiagnosticFactEncodeResult =
  | {
      readonly accepted: true;
      readonly value: DiagnosticFact;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: DiagnosticFactRejectionCode };

export type DiagnosticFactSetEncodeResult =
  | {
      readonly accepted: true;
      readonly value: readonly DiagnosticFact[];
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: DiagnosticFactRejectionCode };

export type DiagnosticFactComparisonResult =
  | { readonly accepted: true; readonly order: -1 | 0 | 1 }
  | { readonly accepted: false; readonly code: DiagnosticFactRejectionCode };

type DataRecord = Readonly<Record<string, unknown>>;

class ParseFailure extends Error {
  readonly code: DiagnosticFactRejectionCode;

  constructor(code: DiagnosticFactRejectionCode) {
    super(code);
    this.name = "ParseFailure";
    this.code = code;
  }
}

const ATOM_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:[._:/-][A-Za-z0-9]+)*$/u;
function fail(code: DiagnosticFactRejectionCode): never {
  throw new ParseFailure(code);
}

function hasUnsafeScalar(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069) ||
    codePoint === 0xfeff ||
    (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
    (codePoint & 0xffff) === 0xfffe ||
    (codePoint & 0xffff) === 0xffff
  );
}

function isSafeUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    let codePoint = first;
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (!(second >= 0xdc00 && second <= 0xdfff)) return false;
      codePoint = ((first - 0xd800) << 10) + (second - 0xdc00) + 0x10000;
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      return false;
    }
    if (hasUnsafeScalar(codePoint)) return false;
  }
  return true;
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("DIAGNOSTIC_FACT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("DIAGNOSTIC_FACT_MALFORMED");
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("DIAGNOSTIC_FACT_EXTRA_FIELD");
    if (!isSafeUnicode(key)) return fail("DIAGNOSTIC_FACT_UNSAFE_UNICODE");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("DIAGNOSTIC_FACT_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("DIAGNOSTIC_FACT_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("DIAGNOSTIC_FACT_EXTRA_FIELD");
  }
}

function readArray(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("DIAGNOSTIC_FACT_WRONG_TYPE");
  }
  const allowed = new Set<string>(["length"]);
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("DIAGNOSTIC_FACT_MALFORMED");
    }
    values.push(descriptor.value);
  }
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("DIAGNOSTIC_FACT_EXTRA_FIELD");
  }
  return values;
}

function readSafeText(input: unknown): string {
  if (typeof input !== "string" || input.length === 0) {
    return fail("DIAGNOSTIC_FACT_WRONG_TYPE");
  }
  if (!isSafeUnicode(input)) return fail("DIAGNOSTIC_FACT_UNSAFE_UNICODE");
  return input;
}

function readAtom(input: unknown): string {
  const value = readSafeText(input);
  if (!ATOM_PATTERN.test(value)) return fail("DIAGNOSTIC_FACT_INVALID_ATOM");
  return value;
}

function readCategory(input: unknown): DiagnosticFactCategory {
  const value = readAtom(input);
  if (!(DIAGNOSTIC_FACT_CATEGORIES as readonly string[]).includes(value)) {
    return fail("DIAGNOSTIC_FACT_UNKNOWN_TAG");
  }
  return value as DiagnosticFactCategory;
}

function readConsequence(input: unknown): DiagnosticFactConsequence {
  const value = readAtom(input);
  if (!(DIAGNOSTIC_FACT_CONSEQUENCES as readonly string[]).includes(value)) {
    return fail("DIAGNOSTIC_FACT_UNKNOWN_TAG");
  }
  return value as DiagnosticFactConsequence;
}

function readDigest(input: unknown): Sha256Digest {
  if (!isSha256Digest(input)) return fail("DIAGNOSTIC_FACT_WRONG_TYPE");
  return input;
}

function compareCodeUnits(left: string, right: string): number {
  const commonLength = Math.min(left.length, right.length);
  for (let index = 0; index < commonLength; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

function parseAffected(input: unknown): DiagnosticFactAffectedIdentity {
  const record = readRecord(input);
  const hasPath = Object.hasOwn(record, "path");
  requireFields(
    record,
    hasPath ? ["identityKind", "identity", "path"] : ["identityKind", "identity"],
  );
  const identityKind = readAtom(record["identityKind"]);
  const identity = readSafeText(record["identity"]);
  if (!hasPath) return Object.freeze({ identityKind, identity });
  const path = readSafeText(record["path"]);
  return Object.freeze({ identityKind, identity, path });
}

function parseCause(input: unknown): DiagnosticFactCause {
  const record = readRecord(input);
  requireFields(record, ["causeKey", "evidenceClass"]);
  return Object.freeze({
    causeKey: readAtom(record["causeKey"]),
    evidenceClass: readAtom(record["evidenceClass"]),
  });
}

function parseInput(input: unknown): DiagnosticFactInput {
  const record = readRecord(input);
  requireFields(record, ["revision", "digest"]);
  return Object.freeze({
    revision: readSafeText(record["revision"]),
    digest: readDigest(record["digest"]),
  });
}

function parseRemediationActionIds(
  input: unknown,
  requireCanonicalOrder: boolean,
): readonly string[] {
  const values = readArray(input).map(readAtom);
  if (values.length === 0 || new Set(values).size !== values.length) {
    return fail("DIAGNOSTIC_FACT_INVALID_COMBINATION");
  }
  const sorted = [...values].sort(compareCodeUnits);
  if (requireCanonicalOrder && values.some((value, index) => value !== sorted[index])) {
    return fail("DIAGNOSTIC_FACT_ORDER_MISMATCH");
  }
  return Object.freeze(sorted);
}

function diagnosticIdentityFor(
  code: string,
  affected: DiagnosticFactAffectedIdentity,
  causeKey: string,
  inputRevision: string,
): Sha256Digest {
  const identityBasis = Object.hasOwn(affected, "path")
    ? {
        schema: "rsrender.diagnostic-fact-identity.v1",
        code,
        affected: {
          identityKind: affected.identityKind,
          identity: affected.identity,
          path: affected.path as string,
        },
        causeKey,
        inputRevision,
      }
    : {
        schema: "rsrender.diagnostic-fact-identity.v1",
        code,
        affected: { identityKind: affected.identityKind, identity: affected.identity },
        causeKey,
        inputRevision,
      };
  return sha256CanonicalJson(identityBasis);
}

function orderingKeyFor(
  draft: DiagnosticFactDraft,
  diagnosticIdentity: Sha256Digest,
): DiagnosticFactOrderingKey {
  const factContentDigest = sha256CanonicalJson(draft);
  return Object.freeze([
    draft.category,
    draft.code,
    draft.affected.identityKind,
    draft.affected.identity,
    draft.affected.path ?? "",
    draft.cause.causeKey,
    draft.input.revision,
    draft.input.digest,
    diagnosticIdentity,
    factContentDigest,
  ]);
}

function parseDraft(input: unknown, requireCanonicalActions: boolean): DiagnosticFactDraft {
  const record = readRecord(input);
  requireFields(record, [
    "factVersion",
    "code",
    "category",
    "affected",
    "cause",
    "consequence",
    "input",
    "remediationActionIds",
  ]);
  if (typeof record["factVersion"] !== "number") return fail("DIAGNOSTIC_FACT_WRONG_TYPE");
  if (record["factVersion"] !== diagnosticFactVersion) {
    return fail("DIAGNOSTIC_FACT_UNSUPPORTED_VERSION");
  }
  return Object.freeze({
    factVersion: diagnosticFactVersion,
    code: readAtom(record["code"]),
    category: readCategory(record["category"]),
    affected: parseAffected(record["affected"]),
    cause: parseCause(record["cause"]),
    consequence: readConsequence(record["consequence"]),
    input: parseInput(record["input"]),
    remediationActionIds: parseRemediationActionIds(
      record["remediationActionIds"],
      requireCanonicalActions,
    ),
  });
}

function makeFact(draft: DiagnosticFactDraft): DiagnosticFact {
  const diagnosticIdentity = diagnosticIdentityFor(
    draft.code,
    draft.affected,
    draft.cause.causeKey,
    draft.input.revision,
  );
  return Object.freeze({
    ...draft,
    diagnosticIdentity,
    orderingKey: orderingKeyFor(draft, diagnosticIdentity),
  });
}

function parseOrderingKey(input: unknown): DiagnosticFactOrderingKey {
  const values = readArray(input);
  if (values.length !== 10) return fail("DIAGNOSTIC_FACT_ORDER_MISMATCH");
  return Object.freeze([
    readCategory(values[0]),
    readAtom(values[1]),
    readAtom(values[2]),
    readSafeText(values[3]),
    values[4] === "" ? "" : readSafeText(values[4]),
    readAtom(values[5]),
    readSafeText(values[6]),
    readDigest(values[7]),
    readDigest(values[8]),
    readDigest(values[9]),
  ]);
}

function parseFact(input: unknown): DiagnosticFact {
  const record = readRecord(input);
  requireFields(record, [
    "factVersion",
    "code",
    "category",
    "affected",
    "cause",
    "consequence",
    "input",
    "remediationActionIds",
    "diagnosticIdentity",
    "orderingKey",
  ]);
  const draftInput = {
    factVersion: record["factVersion"],
    code: record["code"],
    category: record["category"],
    affected: record["affected"],
    cause: record["cause"],
    consequence: record["consequence"],
    input: record["input"],
    remediationActionIds: record["remediationActionIds"],
  };
  const expected = makeFact(parseDraft(draftInput, true));
  const suppliedIdentity = readDigest(record["diagnosticIdentity"]);
  if (suppliedIdentity !== expected.diagnosticIdentity) {
    return fail("DIAGNOSTIC_FACT_IDENTITY_MISMATCH");
  }
  const suppliedOrderingKey = parseOrderingKey(record["orderingKey"]);
  if (compareOrderingKeys(suppliedOrderingKey, expected.orderingKey) !== 0) {
    return fail("DIAGNOSTIC_FACT_ORDER_MISMATCH");
  }
  return expected;
}

function rejected(code: DiagnosticFactRejectionCode): Readonly<{
  accepted: false;
  code: DiagnosticFactRejectionCode;
}> {
  return Object.freeze({ accepted: false, code });
}

function normalizeFailure(error: unknown): DiagnosticFactRejectionCode {
  return error instanceof ParseFailure ? error.code : "DIAGNOSTIC_FACT_MALFORMED";
}

function compareOrderingKeys(
  left: DiagnosticFactOrderingKey,
  right: DiagnosticFactOrderingKey,
): number {
  for (let index = 0; index < left.length; index += 1) {
    const result = compareCodeUnits(left[index] ?? "", right[index] ?? "");
    if (result !== 0) return result;
  }
  return 0;
}

function compareValidatedDiagnosticFacts(left: DiagnosticFact, right: DiagnosticFact): -1 | 0 | 1 {
  const result = compareOrderingKeys(left.orderingKey, right.orderingKey);
  return result < 0 ? -1 : result > 0 ? 1 : 0;
}

/** Strict total producer codec. Caller-supplied identity or ordering fields are rejected as extra. */
export function createDiagnosticFact(input: unknown): DiagnosticFactDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: makeFact(parseDraft(input, false)) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

/** Strict total persisted/boundary codec that independently checks derived identity and ordering. */
export function decodeDiagnosticFact(input: unknown): DiagnosticFactDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseFact(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

/** Canonical RFC-8785 encoding and exact digest after full boundary validation. */
export function encodeDiagnosticFact(input: unknown): DiagnosticFactEncodeResult {
  const decoded = decodeDiagnosticFact(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

/** Total, nonthrowing and locale-independent comparison after strict validation of both inputs. */
export function compareDiagnosticFacts(
  left: unknown,
  right: unknown,
): DiagnosticFactComparisonResult {
  const leftDecoded = decodeDiagnosticFact(left);
  if (!leftDecoded.accepted) return leftDecoded;
  const rightDecoded = decodeDiagnosticFact(right);
  if (!rightDecoded.accepted) return rightDecoded;
  return Object.freeze({
    accepted: true,
    order: compareValidatedDiagnosticFacts(leftDecoded.value, rightDecoded.value),
  });
}

/** Strict collection codec: validates, rejects duplicate Diagnostic Identity, then canonicalizes order. */
export function decodeDiagnosticFactSet(input: unknown): DiagnosticFactSetDecodeResult {
  try {
    const values = readArray(input).map(parseFact);
    const identities = new Set<Sha256Digest>();
    for (const value of values) {
      if (identities.has(value.diagnosticIdentity)) {
        return rejected("DIAGNOSTIC_FACT_DUPLICATE_IDENTITY");
      }
      identities.add(value.diagnosticIdentity);
    }
    values.sort(compareValidatedDiagnosticFacts);
    return Object.freeze({ accepted: true, value: Object.freeze(values) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

/** Insertion-order-independent canonical collection encoding and digest. */
export function encodeDiagnosticFactSet(input: unknown): DiagnosticFactSetEncodeResult {
  const decoded = decodeDiagnosticFactSet(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}
