import type { BoringLogSourceProvenance } from "./boring-log-render-contract.js";
import { isWellFormedUnicode } from "./unicode.js";

export const dynamicTextContractRevision = "bld-056-dynamic-text-v1" as const;
export const dynamicTextCatalogSchemaVersion = "rsrender.dynamic-text-catalog.v1" as const;
export const dynamicTextMaximumCatalogEntries = 512 as const;
export const dynamicTextMaximumSourceLengthUtf16 = 32_768 as const;
export const dynamicTextMaximumTokenOccurrences = 256 as const;
export const dynamicTextMaximumIdentifierLength = 64 as const;

export type DynamicTextValueKind = "text" | "number" | "date" | "boolean";
export type DynamicTextMissingValuePolicy = "error" | "empty";

export interface DynamicTextVariableDefinition {
  /** Stable lower-snake-case token identifier, without the leading `@`. */
  readonly identifier: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly valueKind: DynamicTextValueKind;
  readonly missingValuePolicy: DynamicTextMissingValuePolicy;
  /**
   * Optional inert adapter-owned mapping key. It is data, never a property path or executable
   * expression. A Source Adapter must explicitly map it to an admitted field.
   */
  readonly providerMappingKey: string | null;
  readonly order: number;
}

export interface DynamicTextCatalog {
  readonly schemaVersion: typeof dynamicTextCatalogSchemaVersion;
  readonly definitions: readonly DynamicTextVariableDefinition[];
}

export interface DynamicTextExampleProvenance {
  readonly provenanceClass: "example";
  readonly exampleDatasetIdentity: string;
  readonly fieldIdentity: string;
}

export interface DynamicTextAuthoredProvenance {
  readonly provenanceClass: "document-authored";
  readonly documentIdentity: string;
  readonly fieldIdentity: string;
  readonly authoredRevision: number;
}

export type DynamicTextOriginalProvenance =
  BoringLogSourceProvenance | DynamicTextExampleProvenance | DynamicTextAuthoredProvenance;

export interface DynamicTextEffectiveOverrideProvenance {
  readonly provenanceClass: "effective-override";
  readonly original: DynamicTextOriginalProvenance;
  readonly overrideIdentity: string;
  readonly overrideRevision: number;
  readonly transformation: "replace-display-value";
}

export type DynamicTextEffectiveProvenance =
  DynamicTextOriginalProvenance | DynamicTextEffectiveOverrideProvenance;

export interface DynamicTextValueFact<
  Provenance extends DynamicTextOriginalProvenance | DynamicTextEffectiveProvenance,
> {
  /** Exact deterministic display text supplied by the admitted formatter/assembler. */
  readonly text: string | null;
  readonly provenance: Provenance;
}

export interface DynamicTextVariableValue {
  readonly identifier: string;
  /** The unmodified original value remains available even when an override is effective. */
  readonly original: DynamicTextValueFact<DynamicTextOriginalProvenance> | null;
  readonly effective: DynamicTextValueFact<DynamicTextEffectiveProvenance> | null;
}

export type DynamicTextToken =
  | Readonly<{
      readonly kind: "literal";
      readonly text: string;
      readonly sourceStartUtf16: number;
      readonly sourceEndUtf16: number;
    }>
  | Readonly<{
      readonly kind: "variable";
      readonly identifier: string;
      readonly sourceStartUtf16: number;
      readonly sourceEndUtf16: number;
    }>;

export type DynamicTextContractRejectionCode =
  | "DYNAMIC_TEXT_CATALOG_DUPLICATE_IDENTIFIER"
  | "DYNAMIC_TEXT_CATALOG_EXTRA_FIELD"
  | "DYNAMIC_TEXT_CATALOG_MALFORMED"
  | "DYNAMIC_TEXT_CATALOG_ORDER_DUPLICATE"
  | "DYNAMIC_TEXT_CATALOG_TOO_LARGE"
  | "DYNAMIC_TEXT_CATALOG_UNSUPPORTED_VERSION"
  | "BINDING_TOKEN_MALFORMED"
  | "DYNAMIC_TEXT_SOURCE_TOO_LARGE"
  | "DYNAMIC_TEXT_TOKEN_LIMIT_EXCEEDED"
  | "DYNAMIC_TEXT_RESOLUTION_MALFORMED"
  | "DYNAMIC_TEXT_VALUE_DUPLICATE_IDENTIFIER"
  | "DYNAMIC_TEXT_VALUE_IDENTIFIER_NOT_IN_CATALOG"
  | "DYNAMIC_TEXT_VALUE_MALFORMED";

export type DynamicTextContractResult<Value> =
  | Readonly<{ readonly accepted: true; readonly value: Value }>
  | Readonly<{ readonly accepted: false; readonly code: DynamicTextContractRejectionCode }>;

export interface DynamicTextResolutionDiagnostic {
  readonly code: "BINDING_TARGET_MISSING";
  readonly severity: "error";
  readonly variableIdentifier: string;
  readonly sourceStartUtf16: number;
  readonly sourceEndUtf16: number;
  readonly message: string;
}

export interface DynamicTextResolvedOccurrence {
  readonly identifier: string;
  readonly sourceStartUtf16: number;
  readonly sourceEndUtf16: number;
  readonly resolvedStartUtf16: number;
  readonly resolvedEndUtf16: number;
  readonly substitution: "effective-value" | "empty-by-policy" | "unresolved-token";
  readonly definition: DynamicTextVariableDefinition | null;
  readonly original: DynamicTextValueFact<DynamicTextOriginalProvenance> | null;
  readonly effective: DynamicTextValueFact<DynamicTextEffectiveProvenance> | null;
}

export interface DynamicTextResolution {
  readonly sourceText: string;
  /** The only text this authority permits a downstream text-measurement request to consume. */
  readonly measurementText: string;
  readonly tokens: readonly DynamicTextToken[];
  readonly occurrences: readonly DynamicTextResolvedOccurrence[];
  readonly diagnostics: readonly DynamicTextResolutionDiagnostic[];
}

function resolutionRejected(): DynamicTextContractResult<never> {
  return rejected("DYNAMIC_TEXT_RESOLUTION_MALFORMED");
}

const identifierPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const providerMappingKeyPattern = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const identityPattern = /^\S(?:.*\S)?$/u;

function accepted<Value>(value: Value): DynamicTextContractResult<Value> {
  return Object.freeze({ accepted: true, value });
}

function rejected(code: DynamicTextContractRejectionCode): DynamicTextContractResult<never> {
  return Object.freeze({ accepted: false, code });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasExactFields(record: Record<string, unknown>, fields: readonly string[]): boolean {
  const expected = new Set(fields);
  return (
    Object.keys(record).every((key) => expected.has(key)) &&
    fields.every((field) => Object.hasOwn(record, field))
  );
}

function isBoundedText(input: unknown, maximum = 512): input is string {
  return typeof input === "string" && input.length <= maximum && isWellFormedUnicode(input);
}

export function isDynamicTextVariableIdentifier(input: unknown): input is string {
  return (
    typeof input === "string" &&
    input.length <= dynamicTextMaximumIdentifierLength &&
    identifierPattern.test(input)
  );
}

function readDefinition(input: unknown): DynamicTextVariableDefinition | null {
  if (!isRecord(input)) return null;
  if (
    !hasExactFields(input, [
      "identifier",
      "label",
      "description",
      "category",
      "valueKind",
      "missingValuePolicy",
      "providerMappingKey",
      "order",
    ]) ||
    !isDynamicTextVariableIdentifier(input["identifier"]) ||
    !isBoundedText(input["label"], 128) ||
    input["label"].trim().length === 0 ||
    !isBoundedText(input["description"], 512) ||
    !isBoundedText(input["category"], 64) ||
    input["category"].trim().length === 0 ||
    !(["text", "number", "date", "boolean"] as const).includes(
      input["valueKind"] as DynamicTextValueKind,
    ) ||
    !(["error", "empty"] as const).includes(
      input["missingValuePolicy"] as DynamicTextMissingValuePolicy,
    ) ||
    !(
      input["providerMappingKey"] === null ||
      (typeof input["providerMappingKey"] === "string" &&
        providerMappingKeyPattern.test(input["providerMappingKey"]))
    ) ||
    !Number.isSafeInteger(input["order"]) ||
    Number(input["order"]) < 0 ||
    Number(input["order"]) > 1_000_000
  ) {
    return null;
  }
  return Object.freeze({
    identifier: input["identifier"],
    label: input["label"],
    description: input["description"],
    category: input["category"],
    valueKind: input["valueKind"] as DynamicTextValueKind,
    missingValuePolicy: input["missingValuePolicy"] as DynamicTextMissingValuePolicy,
    providerMappingKey: input["providerMappingKey"],
    order: Number(input["order"]),
  });
}

/** Validates and canonicalizes a menu/catalog. Definitions are ordered by explicit order then ID. */
export function validateDynamicTextCatalog(
  input: unknown,
): DynamicTextContractResult<DynamicTextCatalog> {
  if (!isRecord(input)) return rejected("DYNAMIC_TEXT_CATALOG_MALFORMED");
  if (!hasExactFields(input, ["schemaVersion", "definitions"])) {
    return rejected(
      Object.keys(input).some((key) => !["schemaVersion", "definitions"].includes(key))
        ? "DYNAMIC_TEXT_CATALOG_EXTRA_FIELD"
        : "DYNAMIC_TEXT_CATALOG_MALFORMED",
    );
  }
  if (input["schemaVersion"] !== dynamicTextCatalogSchemaVersion) {
    return rejected("DYNAMIC_TEXT_CATALOG_UNSUPPORTED_VERSION");
  }
  if (!Array.isArray(input["definitions"])) {
    return rejected("DYNAMIC_TEXT_CATALOG_MALFORMED");
  }
  if (input["definitions"].length > dynamicTextMaximumCatalogEntries) {
    return rejected("DYNAMIC_TEXT_CATALOG_TOO_LARGE");
  }
  const definitions: DynamicTextVariableDefinition[] = [];
  const identifiers = new Set<string>();
  const orders = new Set<number>();
  for (const candidate of input["definitions"]) {
    const definition = readDefinition(candidate);
    if (definition === null) return rejected("DYNAMIC_TEXT_CATALOG_MALFORMED");
    if (identifiers.has(definition.identifier)) {
      return rejected("DYNAMIC_TEXT_CATALOG_DUPLICATE_IDENTIFIER");
    }
    if (orders.has(definition.order)) return rejected("DYNAMIC_TEXT_CATALOG_ORDER_DUPLICATE");
    identifiers.add(definition.identifier);
    orders.add(definition.order);
    definitions.push(definition);
  }
  definitions.sort(
    (left, right) => left.order - right.order || left.identifier.localeCompare(right.identifier),
  );
  return accepted(
    Object.freeze({
      schemaVersion: dynamicTextCatalogSchemaVersion,
      definitions: Object.freeze(definitions),
    }),
  );
}

function pushLiteral(
  tokens: DynamicTextToken[],
  text: string,
  sourceStartUtf16: number,
  sourceEndUtf16: number,
): void {
  if (text.length === 0) return;
  const previous = tokens.at(-1);
  if (previous?.kind === "literal" && previous.sourceEndUtf16 === sourceStartUtf16) {
    tokens[tokens.length - 1] = Object.freeze({
      kind: "literal",
      text: previous.text + text,
      sourceStartUtf16: previous.sourceStartUtf16,
      sourceEndUtf16,
    });
    return;
  }
  tokens.push(Object.freeze({ kind: "literal", text, sourceStartUtf16, sourceEndUtf16 }));
}

/**
 * Parses inert `@lower_snake_case` variables. `@@` is the sole escape for a literal at sign.
 * It does not accept paths, calls, interpolation, property access, or expressions.
 */
export function parseDynamicTextTemplate(
  sourceText: unknown,
): DynamicTextContractResult<readonly DynamicTextToken[]> {
  if (typeof sourceText !== "string" || !isWellFormedUnicode(sourceText)) {
    return rejected("BINDING_TOKEN_MALFORMED");
  }
  if (sourceText.length > dynamicTextMaximumSourceLengthUtf16) {
    return rejected("DYNAMIC_TEXT_SOURCE_TOO_LARGE");
  }
  const tokens: DynamicTextToken[] = [];
  let literalStart = 0;
  let index = 0;
  let occurrenceCount = 0;
  while (index < sourceText.length) {
    if (sourceText[index] !== "@") {
      index += 1;
      continue;
    }
    pushLiteral(tokens, sourceText.slice(literalStart, index), literalStart, index);
    if (sourceText[index + 1] === "@") {
      pushLiteral(tokens, "@", index, index + 2);
      index += 2;
      literalStart = index;
      continue;
    }
    let end = index + 1;
    while (end < sourceText.length && /[A-Za-z0-9_]/u.test(sourceText[end]!)) end += 1;
    const identifier = sourceText.slice(index + 1, end);
    if (!isDynamicTextVariableIdentifier(identifier)) {
      return rejected("BINDING_TOKEN_MALFORMED");
    }
    occurrenceCount += 1;
    if (occurrenceCount > dynamicTextMaximumTokenOccurrences) {
      return rejected("DYNAMIC_TEXT_TOKEN_LIMIT_EXCEEDED");
    }
    tokens.push(
      Object.freeze({
        kind: "variable",
        identifier,
        sourceStartUtf16: index,
        sourceEndUtf16: end,
      }),
    );
    index = end;
    literalStart = end;
  }
  pushLiteral(tokens, sourceText.slice(literalStart), literalStart, sourceText.length);
  return accepted(Object.freeze(tokens));
}

function isIdentity(input: unknown): input is string {
  return isBoundedText(input, 512) && identityPattern.test(input);
}

function readOriginalProvenance(input: unknown): DynamicTextOriginalProvenance | null {
  if (!isRecord(input) || typeof input["provenanceClass"] !== "string") return null;
  if (input["provenanceClass"] === "source") {
    if (
      !hasExactFields(input, [
        "provenanceClass",
        "sourceContextIdentity",
        "sourceProjectIdentity",
        "sourceEntityIdentity",
        "sourceFieldIdentity",
        "sourceContractRevision",
      ]) ||
      !isIdentity(input["sourceContextIdentity"]) ||
      !isIdentity(input["sourceProjectIdentity"]) ||
      !isIdentity(input["sourceEntityIdentity"]) ||
      !isIdentity(input["sourceFieldIdentity"]) ||
      !isIdentity(input["sourceContractRevision"])
    )
      return null;
    return Object.freeze({
      provenanceClass: "source",
      sourceContextIdentity: input["sourceContextIdentity"],
      sourceProjectIdentity: input["sourceProjectIdentity"],
      sourceEntityIdentity: input["sourceEntityIdentity"],
      sourceFieldIdentity: input["sourceFieldIdentity"],
      sourceContractRevision: input["sourceContractRevision"],
    });
  }
  if (input["provenanceClass"] === "example") {
    if (
      !hasExactFields(input, ["provenanceClass", "exampleDatasetIdentity", "fieldIdentity"]) ||
      !isIdentity(input["exampleDatasetIdentity"]) ||
      !isIdentity(input["fieldIdentity"])
    )
      return null;
    return Object.freeze({
      provenanceClass: "example",
      exampleDatasetIdentity: input["exampleDatasetIdentity"],
      fieldIdentity: input["fieldIdentity"],
    });
  }
  if (input["provenanceClass"] === "document-authored") {
    if (
      !hasExactFields(input, [
        "provenanceClass",
        "documentIdentity",
        "fieldIdentity",
        "authoredRevision",
      ]) ||
      !isIdentity(input["documentIdentity"]) ||
      !isIdentity(input["fieldIdentity"]) ||
      !Number.isSafeInteger(input["authoredRevision"]) ||
      Number(input["authoredRevision"]) < 0
    )
      return null;
    return Object.freeze({
      provenanceClass: "document-authored",
      documentIdentity: input["documentIdentity"],
      fieldIdentity: input["fieldIdentity"],
      authoredRevision: Number(input["authoredRevision"]),
    });
  }
  return null;
}

function readEffectiveProvenance(input: unknown): DynamicTextEffectiveProvenance | null {
  const original = readOriginalProvenance(input);
  if (original !== null) return original;
  if (
    !isRecord(input) ||
    !hasExactFields(input, [
      "provenanceClass",
      "original",
      "overrideIdentity",
      "overrideRevision",
      "transformation",
    ]) ||
    input["provenanceClass"] !== "effective-override" ||
    !isIdentity(input["overrideIdentity"]) ||
    !Number.isSafeInteger(input["overrideRevision"]) ||
    Number(input["overrideRevision"]) < 1 ||
    input["transformation"] !== "replace-display-value"
  )
    return null;
  const nestedOriginal = readOriginalProvenance(input["original"]);
  if (nestedOriginal === null) return null;
  return Object.freeze({
    provenanceClass: "effective-override",
    original: nestedOriginal,
    overrideIdentity: input["overrideIdentity"],
    overrideRevision: Number(input["overrideRevision"]),
    transformation: "replace-display-value",
  });
}

function originalProvenanceMatches(
  left: DynamicTextOriginalProvenance,
  right: DynamicTextOriginalProvenance,
): boolean {
  if (left.provenanceClass !== right.provenanceClass) return false;
  if (left.provenanceClass === "source" && right.provenanceClass === "source") {
    return (
      left.sourceContextIdentity === right.sourceContextIdentity &&
      left.sourceProjectIdentity === right.sourceProjectIdentity &&
      left.sourceEntityIdentity === right.sourceEntityIdentity &&
      left.sourceFieldIdentity === right.sourceFieldIdentity &&
      left.sourceContractRevision === right.sourceContractRevision
    );
  }
  if (left.provenanceClass === "example" && right.provenanceClass === "example") {
    return (
      left.exampleDatasetIdentity === right.exampleDatasetIdentity &&
      left.fieldIdentity === right.fieldIdentity
    );
  }
  return (
    left.provenanceClass === "document-authored" &&
    right.provenanceClass === "document-authored" &&
    left.documentIdentity === right.documentIdentity &&
    left.fieldIdentity === right.fieldIdentity &&
    left.authoredRevision === right.authoredRevision
  );
}

function readFact<
  Provenance extends DynamicTextOriginalProvenance | DynamicTextEffectiveProvenance,
>(
  input: unknown,
  readProvenance: (value: unknown) => Provenance | null,
): DynamicTextValueFact<Provenance> | null | undefined {
  if (input === null) return null;
  if (!isRecord(input) || !hasExactFields(input, ["text", "provenance"])) return undefined;
  if (!(
    input["text"] === null || isBoundedText(input["text"], dynamicTextMaximumSourceLengthUtf16)
  )) {
    return undefined;
  }
  const provenance = readProvenance(input["provenance"]);
  if (provenance === null) return undefined;
  return Object.freeze({ text: input["text"], provenance });
}

function readValues(
  input: unknown,
): DynamicTextContractResult<readonly DynamicTextVariableValue[]> {
  if (!Array.isArray(input)) return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
  if (input.length > dynamicTextMaximumCatalogEntries) {
    return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
  }
  const identifiers = new Set<string>();
  const values: DynamicTextVariableValue[] = [];
  for (const candidate of input) {
    if (
      !isRecord(candidate) ||
      !hasExactFields(candidate, ["identifier", "original", "effective"]) ||
      !isDynamicTextVariableIdentifier(candidate["identifier"])
    )
      return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
    if (identifiers.has(candidate["identifier"])) {
      return rejected("DYNAMIC_TEXT_VALUE_DUPLICATE_IDENTIFIER");
    }
    const original = readFact(candidate["original"], readOriginalProvenance);
    const effective = readFact(candidate["effective"], readEffectiveProvenance);
    if (original === undefined || effective === undefined) {
      return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
    }
    if (effective !== null) {
      if (original === null) return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
      if (effective.provenance.provenanceClass === "effective-override") {
        if (!originalProvenanceMatches(effective.provenance.original, original.provenance)) {
          return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
        }
      } else if (
        !originalProvenanceMatches(effective.provenance, original.provenance) ||
        effective.text !== original.text
      ) {
        return rejected("DYNAMIC_TEXT_VALUE_MALFORMED");
      }
    }
    identifiers.add(candidate["identifier"]);
    values.push(Object.freeze({ identifier: candidate["identifier"], original, effective }));
  }
  return accepted(Object.freeze(values));
}

/**
 * Revalidates detached Dynamic Text resolution metadata at renderer-neutral boundaries. The
 * measurement string is reconstructed from the authored source and occurrence facts; callers do
 * not trust a renderer-supplied substitution or execute a binding expression.
 */
export function validateDynamicTextResolution(
  input: unknown,
): DynamicTextContractResult<DynamicTextResolution> {
  if (
    !isRecord(input) ||
    !hasExactFields(input, [
      "sourceText",
      "measurementText",
      "tokens",
      "occurrences",
      "diagnostics",
    ]) ||
    typeof input["sourceText"] !== "string" ||
    typeof input["measurementText"] !== "string" ||
    !isWellFormedUnicode(input["measurementText"]) ||
    !Array.isArray(input["tokens"]) ||
    !Array.isArray(input["occurrences"]) ||
    !Array.isArray(input["diagnostics"])
  ) {
    return resolutionRejected();
  }
  const parsed = parseDynamicTextTemplate(input["sourceText"]);
  if (!parsed.accepted || JSON.stringify(parsed.value) !== JSON.stringify(input["tokens"])) {
    return resolutionRejected();
  }
  const variableTokens = parsed.value.filter(
    (token): token is Extract<DynamicTextToken, { readonly kind: "variable" }> =>
      token.kind === "variable",
  );
  if (
    input["occurrences"].length !== variableTokens.length ||
    input["diagnostics"].length > variableTokens.length
  ) {
    return resolutionRejected();
  }

  const reconstructed: string[] = [];
  const occurrences: DynamicTextResolvedOccurrence[] = [];
  const diagnostics: DynamicTextResolutionDiagnostic[] = [];
  const factsByIdentifier = new Map<string, string>();
  const occurrenceInputs = input["occurrences"] as readonly unknown[];
  let variableIndex = 0;
  let resolvedOffset = 0;
  for (const token of parsed.value) {
    if (token.kind === "literal") {
      reconstructed.push(token.text);
      resolvedOffset += token.text.length;
      continue;
    }
    const occurrenceInput = occurrenceInputs[variableIndex];
    variableIndex += 1;
    if (
      !isRecord(occurrenceInput) ||
      !hasExactFields(occurrenceInput, [
        "identifier",
        "sourceStartUtf16",
        "sourceEndUtf16",
        "resolvedStartUtf16",
        "resolvedEndUtf16",
        "substitution",
        "definition",
        "original",
        "effective",
      ]) ||
      occurrenceInput["identifier"] !== token.identifier ||
      occurrenceInput["sourceStartUtf16"] !== token.sourceStartUtf16 ||
      occurrenceInput["sourceEndUtf16"] !== token.sourceEndUtf16 ||
      occurrenceInput["resolvedStartUtf16"] !== resolvedOffset
    ) {
      return resolutionRejected();
    }
    const definition =
      occurrenceInput["definition"] === null ? null : readDefinition(occurrenceInput["definition"]);
    const original = readFact(occurrenceInput["original"], readOriginalProvenance);
    const effective = readFact(occurrenceInput["effective"], readEffectiveProvenance);
    if (
      (occurrenceInput["definition"] !== null && definition === null) ||
      (definition !== null && definition.identifier !== token.identifier) ||
      original === undefined ||
      effective === undefined ||
      (definition === null && (original !== null || effective !== null)) ||
      (effective !== null && original === null)
    ) {
      return resolutionRejected();
    }
    if (effective !== null) {
      if (
        effective.provenance.provenanceClass === "effective-override"
          ? !originalProvenanceMatches(effective.provenance.original, original!.provenance)
          : !originalProvenanceMatches(effective.provenance, original!.provenance) ||
            effective.text !== original!.text
      ) {
        return resolutionRejected();
      }
    }
    const factsIdentity = JSON.stringify({ definition, original, effective });
    const priorFactsIdentity = factsByIdentifier.get(token.identifier);
    if (priorFactsIdentity !== undefined && priorFactsIdentity !== factsIdentity) {
      return resolutionRejected();
    }
    factsByIdentifier.set(token.identifier, factsIdentity);

    let substitutionText: string;
    const substitution = occurrenceInput["substitution"];
    if (substitution === "effective-value") {
      if (definition === null || effective?.text === null || effective?.text === undefined) {
        return resolutionRejected();
      }
      substitutionText = effective.text;
    } else if (substitution === "empty-by-policy") {
      if (
        definition?.missingValuePolicy !== "empty" ||
        (effective !== null && effective.text !== null)
      ) {
        return resolutionRejected();
      }
      substitutionText = "";
    } else if (substitution === "unresolved-token") {
      if (
        (definition !== null && definition.missingValuePolicy !== "error") ||
        (effective !== null && effective.text !== null)
      ) {
        return resolutionRejected();
      }
      substitutionText = `@${token.identifier}`;
      diagnostics.push(
        Object.freeze({
          code: "BINDING_TARGET_MISSING",
          severity: "error",
          variableIdentifier: token.identifier,
          sourceStartUtf16: token.sourceStartUtf16,
          sourceEndUtf16: token.sourceEndUtf16,
          message:
            definition === null
              ? `Dynamic Text variable @${token.identifier} is not in the admitted catalog`
              : `Dynamic Text variable @${token.identifier} has no effective value`,
        }),
      );
    } else {
      return resolutionRejected();
    }
    reconstructed.push(substitutionText);
    const resolvedEndUtf16 = resolvedOffset + substitutionText.length;
    if (occurrenceInput["resolvedEndUtf16"] !== resolvedEndUtf16) {
      return resolutionRejected();
    }
    occurrences.push(
      Object.freeze({
        identifier: token.identifier,
        sourceStartUtf16: token.sourceStartUtf16,
        sourceEndUtf16: token.sourceEndUtf16,
        resolvedStartUtf16: resolvedOffset,
        resolvedEndUtf16,
        substitution,
        definition,
        original,
        effective,
      }),
    );
    resolvedOffset = resolvedEndUtf16;
  }
  const measurementText = reconstructed.join("");
  if (
    measurementText !== input["measurementText"] ||
    JSON.stringify(diagnostics) !== JSON.stringify(input["diagnostics"])
  ) {
    return resolutionRejected();
  }
  return accepted(
    Object.freeze({
      sourceText: input["sourceText"],
      measurementText,
      tokens: parsed.value,
      occurrences: Object.freeze(occurrences),
      diagnostics: Object.freeze(diagnostics),
    }),
  );
}

/**
 * Resolves a template to the exact measurement text. Missing required values stay visible as their
 * inert token and emit a blocking Diagnostic; no property lookup, evaluation, or source mutation occurs.
 */
export function resolveDynamicText(
  sourceText: unknown,
  catalogInput: unknown,
  valuesInput: unknown,
): DynamicTextContractResult<DynamicTextResolution> {
  const parsed = parseDynamicTextTemplate(sourceText);
  if (!parsed.accepted) return parsed;
  const catalog = validateDynamicTextCatalog(catalogInput);
  if (!catalog.accepted) return catalog;
  const values = readValues(valuesInput);
  if (!values.accepted) return values;

  const definitionByIdentifier = new Map(
    catalog.value.definitions.map((definition) => [definition.identifier, definition]),
  );
  if (values.value.some((value) => !definitionByIdentifier.has(value.identifier))) {
    return rejected("DYNAMIC_TEXT_VALUE_IDENTIFIER_NOT_IN_CATALOG");
  }
  const valueByIdentifier = new Map(values.value.map((value) => [value.identifier, value]));
  const measurementParts: string[] = [];
  const occurrences: DynamicTextResolvedOccurrence[] = [];
  const diagnostics: DynamicTextResolutionDiagnostic[] = [];
  let resolvedOffset = 0;
  for (const token of parsed.value) {
    if (token.kind === "literal") {
      measurementParts.push(token.text);
      resolvedOffset += token.text.length;
      continue;
    }
    const definition = definitionByIdentifier.get(token.identifier) ?? null;
    const value = valueByIdentifier.get(token.identifier);
    const effective = value?.effective;
    let text: string;
    let substitution: DynamicTextResolvedOccurrence["substitution"];
    if (
      definition !== null &&
      effective !== null &&
      effective !== undefined &&
      effective.text !== null
    ) {
      text = effective.text;
      substitution = "effective-value";
    } else if (definition?.missingValuePolicy === "empty") {
      text = "";
      substitution = "empty-by-policy";
    } else {
      text = `@${token.identifier}`;
      substitution = "unresolved-token";
      diagnostics.push(
        Object.freeze({
          code: "BINDING_TARGET_MISSING",
          severity: "error",
          variableIdentifier: token.identifier,
          sourceStartUtf16: token.sourceStartUtf16,
          sourceEndUtf16: token.sourceEndUtf16,
          message:
            definition === null
              ? `Dynamic Text variable @${token.identifier} is not in the admitted catalog`
              : `Dynamic Text variable @${token.identifier} has no effective value`,
        }),
      );
    }
    const start = resolvedOffset;
    measurementParts.push(text);
    resolvedOffset += text.length;
    occurrences.push(
      Object.freeze({
        identifier: token.identifier,
        sourceStartUtf16: token.sourceStartUtf16,
        sourceEndUtf16: token.sourceEndUtf16,
        resolvedStartUtf16: start,
        resolvedEndUtf16: resolvedOffset,
        substitution,
        definition,
        original: value?.original ?? null,
        effective: value?.effective ?? null,
      }),
    );
  }
  return accepted(
    Object.freeze({
      sourceText: sourceText as string,
      measurementText: measurementParts.join(""),
      tokens: parsed.value,
      occurrences: Object.freeze(occurrences),
      diagnostics: Object.freeze(diagnostics),
    }),
  );
}
