export const semanticEditorRevision = "bld-021-semantic-editor-v1" as const;
export const semanticEditorMaximumStringUtf8Bytes = 16_384;

export type DataRecord = Readonly<Record<string, unknown>>;

export type SemanticEditorValidation =
  | Readonly<{ accepted: false; code: string; message: string; focusId: string }>
  | Readonly<{
      accepted: true;
      replacementContent: DataRecord;
      reason: string;
    }>;

export type SemanticEditorTargetValidation =
  Readonly<{ accepted: true }> | Readonly<{ accepted: false; code: string; message: string }>;

export function validateTargetSelection(
  selectedCount: number,
  eligibilityState: unknown,
): SemanticEditorTargetValidation {
  if (selectedCount !== 1) {
    return Object.freeze({
      accepted: false,
      code: "TARGET_COUNT_INVALID",
      message: "Select exactly one eligible field.",
    });
  }
  if (eligibilityState !== "eligible") {
    return Object.freeze({
      accepted: false,
      code: "TARGET_INELIGIBLE",
      message: "The selected field is not eligible for a Display Value Override.",
    });
  }
  return Object.freeze({ accepted: true });
}

export function dataRecord(input: unknown): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  return input as DataRecord;
}

export function utf8Bytes(input: string): number {
  return new TextEncoder().encode(input).byteLength;
}

export function contentText(input: unknown): string {
  const content = dataRecord(input);
  if (content === null || typeof content["kind"] !== "string") return "Malformed";
  switch (content["kind"]) {
    case "absent":
      return "Absent";
    case "null":
      return "Null";
    case "empty-string":
      return "Empty string";
    case "empty-collection":
      return "Empty collection";
    case "zero":
      return "0";
    case "value":
      return String(content["value"]);
    case "not-available":
      return `Not available (${String(content["statusCode"])})`;
    case "not-permitted":
      return `Not permitted (${String(content["denialCode"])})`;
    case "malformed":
      return `Malformed (${String(content["safeRawRepresentation"])})`;
    default:
      return "Malformed";
  }
}

export function unitText(input: unknown): string {
  const unit = dataRecord(input);
  if (unit === null) return "Malformed";
  if (unit["state"] === "not-applicable") return "Not applicable";
  if (unit["state"] === "specified") {
    return `${String(unit["quantity"])} — ${String(unit["symbol"])}`;
  }
  if (unit["state"] === "unsupported") return `Unsupported (${String(unit["originalUnit"])})`;
  return "Malformed";
}

export function provenanceText(input: unknown): string {
  const provenance = dataRecord(input);
  if (provenance?.["provenanceClass"] === "source") return "Source original";
  if (provenance?.["provenanceClass"] === "override") {
    return `Display Value Override revision ${String(provenance["overrideRevision"])}`;
  }
  return "Unknown provenance";
}

export function validateReplacement(
  valueType: unknown,
  replacement: string,
  reasonInput: string,
): SemanticEditorValidation {
  const reason = reasonInput.trim();
  if (replacement.length === 0) {
    return Object.freeze({
      accepted: false,
      code: "VALUE_REQUIRED",
      message: "Enter a replacement display value.",
      focusId: "override-value",
    });
  }
  if (utf8Bytes(replacement) > semanticEditorMaximumStringUtf8Bytes) {
    return Object.freeze({
      accepted: false,
      code: "VALUE_TOO_LONG",
      message: `Replacement values must be at most ${semanticEditorMaximumStringUtf8Bytes.toLocaleString("en-US")} UTF-8 bytes.`,
      focusId: "override-value",
    });
  }
  if (reason.length === 0) {
    return Object.freeze({
      accepted: false,
      code: "RATIONALE_REQUIRED",
      message: "Explain why this display value should be overridden.",
      focusId: "override-reason",
    });
  }
  if (utf8Bytes(reason) > semanticEditorMaximumStringUtf8Bytes) {
    return Object.freeze({
      accepted: false,
      code: "RATIONALE_TOO_LONG",
      message: `Rationale must be at most ${semanticEditorMaximumStringUtf8Bytes.toLocaleString("en-US")} UTF-8 bytes.`,
      focusId: "override-reason",
    });
  }
  let replacementContent: DataRecord;
  if (valueType === "string" || valueType === "empty-string") {
    replacementContent = Object.freeze({
      kind: "value",
      value: replacement,
      originalRepresentation: replacement,
    });
  } else if (valueType === "number" || valueType === "zero") {
    const numberValue = Number(replacement);
    if (!Number.isFinite(numberValue)) {
      return Object.freeze({
        accepted: false,
        code: "VALUE_TYPE_INVALID",
        message: "Enter a finite number for this field.",
        focusId: "override-value",
      });
    }
    replacementContent =
      numberValue === 0
        ? Object.freeze({ kind: "zero", value: 0, originalRepresentation: replacement })
        : Object.freeze({ kind: "value", value: numberValue, originalRepresentation: replacement });
  } else if (valueType === "boolean") {
    const normalized = replacement.toLocaleLowerCase("en-US");
    if (normalized !== "true" && normalized !== "false") {
      return Object.freeze({
        accepted: false,
        code: "VALUE_TYPE_INVALID",
        message: "Enter true or false for this field.",
        focusId: "override-value",
      });
    }
    replacementContent = Object.freeze({
      kind: "value",
      value: normalized === "true",
      originalRepresentation: replacement,
    });
  } else {
    return Object.freeze({
      accepted: false,
      code: "VALUE_TYPE_INELIGIBLE",
      message: `Fields with value type ${String(valueType)} cannot be edited here.`,
      focusId: "override-value",
    });
  }
  return Object.freeze({ accepted: true, replacementContent, reason });
}
