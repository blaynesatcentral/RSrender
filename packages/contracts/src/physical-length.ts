import { ContractPrimitiveError } from "./contract-primitive-error.js";

declare const mptBrand: unique symbol;

/** Signed integer thousandths of a PostScript point. */
export type Mpt = number & { readonly [mptBrand]: "Mpt" };

export const MPT_PER_POINT = 1_000 as const;
export const MPT_PER_INCH = 72_000 as const;
export const MPT_ROUNDING_MODE = "half-away-from-zero-v1" as const;
export const PHYSICAL_UNITS = ["mpt", "pt", "in", "mm", "cm"] as const;

export type PhysicalUnit = (typeof PHYSICAL_UNITS)[number];

interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

const mptPerUnit: Readonly<Record<PhysicalUnit, Rational>> = Object.freeze({
  mpt: Object.freeze({ numerator: 1n, denominator: 1n }),
  pt: Object.freeze({ numerator: 1_000n, denominator: 1n }),
  in: Object.freeze({ numerator: 72_000n, denominator: 1n }),
  mm: Object.freeze({ numerator: 360_000n, denominator: 127n }),
  cm: Object.freeze({ numerator: 3_600_000n, denominator: 127n }),
});

const maximumSafeMpt = BigInt(Number.MAX_SAFE_INTEGER);

export function isMpt(input: unknown): input is Mpt {
  return typeof input === "number" && Number.isSafeInteger(input);
}

export function parseMpt(input: unknown): Mpt {
  if (!isMpt(input)) {
    throw new ContractPrimitiveError(
      "MPT_NOT_SAFE_INTEGER",
      "Mpt must be a signed safe integer expressed in thousandths of a PostScript point",
    );
  }
  return (Object.is(input, -0) ? 0 : input) as Mpt;
}

export function isPhysicalUnit(input: unknown): input is PhysicalUnit {
  return typeof input === "string" && Object.hasOwn(mptPerUnit, input);
}

function numberAsDecimalRational(input: number): Rational {
  const text = input.toString();
  const match =
    /^(?<sign>-?)(?<whole>\d+)(?:\.(?<fraction>\d+))?(?:e(?<exponent>[+-]?\d+))?$/u.exec(text);
  if (!match?.groups) {
    throw new ContractPrimitiveError(
      "PHYSICAL_VALUE_NOT_FINITE",
      "Physical value must be a finite number",
    );
  }
  const fraction = match.groups["fraction"] ?? "";
  const exponent = Number.parseInt(match.groups["exponent"] ?? "0", 10) - fraction.length;
  let numerator = BigInt(`${match.groups["whole"]}${fraction}`);
  let denominator = 1n;
  if (exponent >= 0) numerator *= 10n ** BigInt(exponent);
  else denominator = 10n ** BigInt(-exponent);
  if (match.groups["sign"] === "-") numerator = -numerator;
  return { numerator, denominator };
}

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  if (absoluteRemainder * 2n < denominator) return quotient;
  return quotient + (numerator < 0n ? -1n : 1n);
}

/**
 * Converts a finite user-unit number at the command boundary and rounds exactly once to mpt.
 * Decimal conversion uses the number's ECMAScript shortest round-tripping representation;
 * ties use the versioned half-away-from-zero rule.
 */
export function physicalLengthToMpt(input: unknown, unit: unknown): Mpt {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new ContractPrimitiveError(
      "PHYSICAL_VALUE_NOT_FINITE",
      "Physical value must be a finite number",
    );
  }
  if (!isPhysicalUnit(unit)) {
    throw new ContractPrimitiveError(
      "PHYSICAL_UNIT_INVALID",
      "Physical unit must be one of mpt, pt, in, mm, or cm",
    );
  }
  const value = numberAsDecimalRational(input);
  const ratio = mptPerUnit[unit];
  const rounded = roundHalfAwayFromZero(
    value.numerator * ratio.numerator,
    value.denominator * ratio.denominator,
  );
  if (rounded > maximumSafeMpt || rounded < -maximumSafeMpt) {
    throw new ContractPrimitiveError(
      "PHYSICAL_VALUE_OUT_OF_RANGE",
      "Converted physical value exceeds the signed safe-integer mpt range",
    );
  }
  return parseMpt(Number(rounded));
}

/** Converts canonical mpt for display only; this operation never changes canonical geometry. */
export function mptToPhysicalLength(input: unknown, unit: unknown): number {
  const mpt = parseMpt(input);
  if (!isPhysicalUnit(unit)) {
    throw new ContractPrimitiveError(
      "PHYSICAL_UNIT_INVALID",
      "Physical unit must be one of mpt, pt, in, mm, or cm",
    );
  }
  const ratio = mptPerUnit[unit];
  return (mpt * Number(ratio.denominator)) / Number(ratio.numerator);
}
