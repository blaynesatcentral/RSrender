import { ContractPrimitiveError } from "./contract-primitive-error.js";
import { isWellFormedUnicode } from "./unicode.js";

declare const opaqueIdentityBrand: unique symbol;

/** An exact opaque string whose kind is distinguished only at the TypeScript boundary. */
export type OpaqueIdentity<Kind extends string> = string & {
  readonly [opaqueIdentityBrand]: Kind;
};

export interface OpaqueIdentityCodec<Kind extends string> {
  readonly kind: Kind;
  readonly parse: (input: unknown) => OpaqueIdentity<Kind>;
  readonly is: (input: unknown) => input is OpaqueIdentity<Kind>;
  readonly format: (identity: OpaqueIdentity<Kind>) => string;
}

function validateIdentity(input: unknown): input is string {
  return typeof input === "string" && input.length > 0 && isWellFormedUnicode(input);
}

export function parseOpaqueIdentity<Kind extends string>(input: unknown): OpaqueIdentity<Kind> {
  if (typeof input !== "string") {
    throw new ContractPrimitiveError(
      "IDENTITY_NOT_STRING",
      "Opaque identity must be supplied as a string without coercion",
    );
  }
  if (input.length === 0) {
    throw new ContractPrimitiveError("IDENTITY_EMPTY", "Opaque identity must not be empty");
  }
  if (!isWellFormedUnicode(input)) {
    throw new ContractPrimitiveError(
      "IDENTITY_INVALID_UNICODE",
      "Opaque identity must contain only Unicode scalar values",
    );
  }
  return input as OpaqueIdentity<Kind>;
}

export function defineOpaqueIdentityCodec<const Kind extends string>(
  kind: Kind,
): OpaqueIdentityCodec<Kind> {
  if (kind.length === 0 || !isWellFormedUnicode(kind)) {
    throw new ContractPrimitiveError(
      "IDENTITY_KIND_INVALID",
      "Opaque identity codec kind must be a non-empty well-formed string",
    );
  }
  return Object.freeze({
    kind,
    parse: (input: unknown) => parseOpaqueIdentity<Kind>(input),
    is: (input: unknown): input is OpaqueIdentity<Kind> => validateIdentity(input),
    format: (identity: OpaqueIdentity<Kind>): string => parseOpaqueIdentity<Kind>(identity),
  });
}
