import { ContractPrimitiveError } from "./contract-primitive-error.js";
import { assertWellFormedUnicode, utf8Bytes } from "./unicode.js";

export type CanonicalJsonPrimitive = boolean | null | number | string;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

function canonicalize(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ContractPrimitiveError(
        "CANONICAL_JSON_UNSUPPORTED",
        "Canonical JSON numbers must be finite IEEE-754 values",
      );
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === "string") {
    assertWellFormedUnicode(value, "CANONICAL_JSON_INVALID_UNICODE", "Canonical JSON string");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    throw new ContractPrimitiveError(
      "CANONICAL_JSON_UNSUPPORTED",
      "Canonical JSON accepts only null, booleans, finite numbers, strings, arrays, and plain objects",
    );
  }
  if (ancestors.has(value)) {
    throw new ContractPrimitiveError("CANONICAL_JSON_CYCLE", "Canonical JSON must be acyclic");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      const allowedKeys = new Set<string>(["length"]);
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const key = String(index);
        allowedKeys.add(key);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor) {
          throw new ContractPrimitiveError(
            "CANONICAL_JSON_SPARSE_ARRAY",
            "Canonical JSON arrays must not contain holes",
          );
        }
        if (!("value" in descriptor) || !descriptor.enumerable) {
          throw new ContractPrimitiveError(
            "CANONICAL_JSON_ACCESSOR",
            "Canonical JSON array entries must be enumerable data properties",
          );
        }
        items.push(canonicalize(descriptor.value, ancestors));
      }
      if (ownKeys.some((key) => typeof key !== "string" || !allowedKeys.has(key))) {
        throw new ContractPrimitiveError(
          "CANONICAL_JSON_UNSUPPORTED",
          "Canonical JSON arrays must not carry symbol or non-index properties",
        );
      }
      return `[${items.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ContractPrimitiveError(
        "CANONICAL_JSON_UNSUPPORTED",
        "Canonical JSON objects must have Object.prototype or a null prototype",
      );
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol")) {
      throw new ContractPrimitiveError(
        "CANONICAL_JSON_UNSUPPORTED",
        "Canonical JSON objects must not contain symbol properties",
      );
    }
    const stringKeys = keys as string[];
    for (const key of stringKeys) {
      assertWellFormedUnicode(key, "CANONICAL_JSON_INVALID_UNICODE", "Canonical JSON object key");
    }
    stringKeys.sort();
    const members: string[] = [];
    for (const key of stringKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new ContractPrimitiveError(
          "CANONICAL_JSON_ACCESSOR",
          "Canonical JSON object members must be enumerable data properties",
        );
      }
      members.push(`${JSON.stringify(key)}:${canonicalize(descriptor.value, ancestors)}`);
    }
    return `{${members.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

/** RFC 8785 JSON Canonicalization Scheme semantics over admitted in-memory JSON values. */
export function canonicalizeJson(value: unknown): string {
  return canonicalize(value, new Set<object>());
}

export function canonicalJsonUtf8Bytes(value: unknown): Uint8Array {
  return utf8Bytes(canonicalizeJson(value));
}
