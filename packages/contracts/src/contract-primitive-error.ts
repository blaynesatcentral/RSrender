export type ContractPrimitiveErrorCode =
  | "CANONICAL_JSON_ACCESSOR"
  | "CANONICAL_JSON_CYCLE"
  | "CANONICAL_JSON_INVALID_UNICODE"
  | "CANONICAL_JSON_SPARSE_ARRAY"
  | "CANONICAL_JSON_UNSUPPORTED"
  | "DIGEST_INVALID"
  | "IDENTITY_EMPTY"
  | "IDENTITY_INVALID_UNICODE"
  | "IDENTITY_KIND_INVALID"
  | "IDENTITY_NOT_STRING"
  | "MPT_NOT_SAFE_INTEGER"
  | "PHYSICAL_UNIT_INVALID"
  | "PHYSICAL_VALUE_NOT_FINITE"
  | "PHYSICAL_VALUE_OUT_OF_RANGE"
  | "SHA256_INPUT_INVALID"
  | "UTF8_INVALID_UNICODE";

/** A stable, nonsecret failure raised by the primitive contract boundary. */
export class ContractPrimitiveError extends TypeError {
  public readonly code: ContractPrimitiveErrorCode;

  public constructor(code: ContractPrimitiveErrorCode, message: string) {
    super(message);
    this.name = "ContractPrimitiveError";
    this.code = code;
  }
}
