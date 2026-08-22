import { isMpt, type Mpt } from "./physical-length.js";
import type { BoringLogTextStyleInput } from "./boring-log-render-contract.js";

export const boringLogTextOccurrenceStyleOverrideSchemaVersion =
  "rsrender.boring-log-text-occurrence-style-override.v1" as const;

export type BoringLogTextOccurrenceStyle = Readonly<Omit<BoringLogTextStyleInput, "id">>;

export interface BoringLogTextOccurrenceStyleOverride {
  readonly contractVersion: 1;
  readonly schemaVersion: typeof boringLogTextOccurrenceStyleOverrideSchemaVersion;
  readonly kind: "boring-log.text-occurrence-style-override";
  readonly ownerDocumentIdentity: string;
  readonly boringLogIdentity: string;
  readonly overrideIdentity: string;
  readonly overrideRevision: number;
  readonly scope: "occurrence";
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
  readonly baseStyleId: string;
  readonly style: BoringLogTextOccurrenceStyle;
  readonly locked: boolean;
}

export type BoringLogTextOccurrenceStyleOverrideRejectionCode =
  | "BORING_LOG_TEXT_STYLE_OVERRIDE_MALFORMED"
  | "BORING_LOG_TEXT_STYLE_OVERRIDE_EXTRA_FIELD"
  | "BORING_LOG_TEXT_STYLE_OVERRIDE_MISSING_FIELD"
  | "BORING_LOG_TEXT_STYLE_OVERRIDE_WRONG_TYPE"
  | "BORING_LOG_TEXT_STYLE_OVERRIDE_UNSUPPORTED_VERSION";

export type BoringLogTextOccurrenceStyleOverrideResult =
  | { readonly accepted: true; readonly value: BoringLogTextOccurrenceStyleOverride }
  | {
      readonly accepted: false;
      readonly code: BoringLogTextOccurrenceStyleOverrideRejectionCode;
    };

class OverrideFailure extends Error {
  public constructor(public readonly code: BoringLogTextOccurrenceStyleOverrideRejectionCode) {
    super(code);
  }
}

function fail(code: BoringLogTextOccurrenceStyleOverrideRejectionCode): never {
  throw new OverrideFailure(code);
}

function record(input: unknown, fields: readonly string[]): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_MALFORMED");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string" || !fields.includes(key))) {
    return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_EXTRA_FIELD");
  }
  if (fields.some((field) => !Object.hasOwn(input, field))) {
    return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_MISSING_FIELD");
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_MALFORMED");
    }
  }
  return input as Readonly<Record<string, unknown>>;
}

function text(input: unknown): string {
  if (typeof input !== "string" || input.length < 1 || input.length > 512) {
    return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_WRONG_TYPE");
  }
  return input;
}

function positiveMpt(input: unknown): Mpt {
  if (!isMpt(input) || input <= 0) return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_WRONG_TYPE");
  return input;
}

export function validateBoringLogTextOccurrenceStyleOverride(
  input: unknown,
): BoringLogTextOccurrenceStyleOverrideResult {
  try {
    const value = record(input, [
      "contractVersion",
      "schemaVersion",
      "kind",
      "ownerDocumentIdentity",
      "boringLogIdentity",
      "overrideIdentity",
      "overrideRevision",
      "scope",
      "occurrenceNodeId",
      "semanticId",
      "baseStyleId",
      "style",
      "locked",
    ]);
    if (
      value["contractVersion"] !== 1 ||
      value["schemaVersion"] !== boringLogTextOccurrenceStyleOverrideSchemaVersion ||
      value["kind"] !== "boring-log.text-occurrence-style-override" ||
      value["scope"] !== "occurrence"
    ) {
      return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_UNSUPPORTED_VERSION");
    }
    if (
      !Number.isSafeInteger(value["overrideRevision"]) ||
      (value["overrideRevision"] as number) < 1 ||
      typeof value["locked"] !== "boolean"
    ) {
      return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_WRONG_TYPE");
    }
    const style = record(value["style"], [
      "fontFamilyId",
      "fontSizeMpt",
      "fontWeight",
      "lineHeightMpt",
      "color",
    ]);
    if (
      !Number.isSafeInteger(style["fontWeight"]) ||
      (style["fontWeight"] as number) < 1 ||
      (style["fontWeight"] as number) > 1_000
    ) {
      return fail("BORING_LOG_TEXT_STYLE_OVERRIDE_WRONG_TYPE");
    }
    const result: BoringLogTextOccurrenceStyleOverride = Object.freeze({
      contractVersion: 1,
      schemaVersion: boringLogTextOccurrenceStyleOverrideSchemaVersion,
      kind: "boring-log.text-occurrence-style-override",
      ownerDocumentIdentity: text(value["ownerDocumentIdentity"]),
      boringLogIdentity: text(value["boringLogIdentity"]),
      overrideIdentity: text(value["overrideIdentity"]),
      overrideRevision: value["overrideRevision"] as number,
      scope: "occurrence",
      occurrenceNodeId: text(value["occurrenceNodeId"]),
      semanticId: text(value["semanticId"]),
      baseStyleId: text(value["baseStyleId"]),
      style: Object.freeze({
        fontFamilyId: text(style["fontFamilyId"]),
        fontSizeMpt: positiveMpt(style["fontSizeMpt"]),
        fontWeight: style["fontWeight"] as number,
        lineHeightMpt: positiveMpt(style["lineHeightMpt"]),
        color: text(style["color"]),
      }),
      locked: value["locked"],
    });
    return Object.freeze({ accepted: true, value: result });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code:
        error instanceof OverrideFailure ? error.code : "BORING_LOG_TEXT_STYLE_OVERRIDE_MALFORMED",
    });
  }
}
