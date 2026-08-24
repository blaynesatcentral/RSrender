import { isSha256Digest, type Sha256Digest } from "./sha256.js";

export const fontCatalogSchemaVersion = "rsrender.font-catalog.v1" as const;

export const fontFaceStyles = ["normal", "italic"] as const;
export type FontFaceStyle = (typeof fontFaceStyles)[number];

export const fontSourceClasses = [
  "application-shipped",
  "local-installed",
  "package-embedded",
] as const;
export type FontSourceClass = (typeof fontSourceClasses)[number];

export const fontRightsDispositions = ["permitted", "prohibited", "unverified"] as const;
export type FontRightsDisposition = (typeof fontRightsDispositions)[number];

export interface FontRightsDispositionSet {
  readonly commercialUse: FontRightsDisposition;
  readonly embedding: FontRightsDisposition;
  readonly subsetting: FontRightsDisposition;
  readonly redistribution: FontRightsDisposition;
  readonly buyerTransfer: FontRightsDisposition;
}

export const fontAvailabilityDiagnosticCodes = [
  "FONT_FACE_UNAVAILABLE",
  "FONT_BYTES_UNAVAILABLE",
  "FONT_BYTE_DIGEST_MISMATCH",
  "FONT_METRICS_IDENTITY_MISMATCH",
  "FONT_GLYPH_COVERAGE_IDENTITY_MISMATCH",
  "FONT_SOURCE_NOT_ADMITTED",
] as const;
export type FontAvailabilityDiagnosticCode = (typeof fontAvailabilityDiagnosticCodes)[number];

export interface FontAvailabilityDiagnostic {
  readonly code: FontAvailabilityDiagnosticCode;
  readonly reason: string;
}

export type FontAvailability =
  | {
      readonly state: "available";
      readonly blockingDiagnostic: null;
    }
  | {
      readonly state: "unavailable";
      readonly blockingDiagnostic: FontAvailabilityDiagnostic;
    };

export interface FontFamilyCatalogEntry {
  readonly familyId: string;
  readonly familyName: string;
  readonly faceIds: readonly string[];
}

export interface FontFaceCatalogEntry {
  readonly faceId: string;
  readonly familyId: string;
  readonly style: FontFaceStyle;
  readonly weight: number;
  readonly sourceClass: FontSourceClass;
  readonly byteDigest: Sha256Digest;
  readonly metricsDigest: Sha256Digest;
  readonly glyphCoverageDigest: Sha256Digest;
  readonly rights: FontRightsDispositionSet;
  readonly availability: FontAvailability;
}

export interface FontCatalog {
  readonly contractVersion: 1;
  readonly schemaVersion: typeof fontCatalogSchemaVersion;
  readonly kind: "font-catalog";
  readonly catalogId: string;
  readonly catalogRevision: number;
  readonly families: readonly FontFamilyCatalogEntry[];
  readonly faces: readonly FontFaceCatalogEntry[];
}

export type FontCatalogRejectionCode =
  | "FONT_CATALOG_MALFORMED"
  | "FONT_CATALOG_EXTRA_FIELD"
  | "FONT_CATALOG_MISSING_FIELD"
  | "FONT_CATALOG_WRONG_TYPE"
  | "FONT_CATALOG_UNSUPPORTED_VERSION"
  | "FONT_CATALOG_DUPLICATE_IDENTITY"
  | "FONT_CATALOG_DUPLICATE_FACE"
  | "FONT_CATALOG_BROKEN_REFERENCE"
  | "FONT_CATALOG_NONCANONICAL_ORDER";

export type FontCatalogResult =
  | { readonly accepted: true; readonly value: FontCatalog }
  | { readonly accepted: false; readonly code: FontCatalogRejectionCode };

export type ExactFontFaceResolution =
  | { readonly accepted: true; readonly face: FontFaceCatalogEntry }
  | {
      readonly accepted: false;
      readonly code: "FONT_FACE_NOT_FOUND" | "FONT_FACE_UNAVAILABLE";
      readonly diagnostic: Readonly<{ code: string; reason: string }>;
    };

export type FontPublicationEligibilityCode =
  | "FONT_PUBLICATION_FACE_UNAVAILABLE"
  | "FONT_PUBLICATION_COMMERCIAL_USE_NOT_PERMITTED"
  | "FONT_PUBLICATION_EMBEDDING_NOT_PERMITTED"
  | "FONT_PUBLICATION_SUBSETTING_NOT_PERMITTED";

export type FontPublicationEligibility =
  | {
      readonly accepted: true;
      readonly faceId: string;
      readonly byteDigest: Sha256Digest;
      readonly metricsDigest: Sha256Digest;
      readonly glyphCoverageDigest: Sha256Digest;
    }
  | {
      readonly accepted: false;
      readonly code: FontPublicationEligibilityCode;
      readonly reason: string;
    };

class FontCatalogFailure extends Error {
  public constructor(public readonly code: FontCatalogRejectionCode) {
    super(code);
  }
}

function fail(code: FontCatalogRejectionCode): never {
  throw new FontCatalogFailure(code);
}

function record(input: unknown, fields: readonly string[]): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("FONT_CATALOG_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("FONT_CATALOG_MALFORMED");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string" || !fields.includes(key))) {
    return fail("FONT_CATALOG_EXTRA_FIELD");
  }
  if (fields.some((field) => !Object.hasOwn(input, field))) {
    return fail("FONT_CATALOG_MISSING_FIELD");
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("FONT_CATALOG_MALFORMED");
    }
  }
  return input as Readonly<Record<string, unknown>>;
}

function array(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("FONT_CATALOG_WRONG_TYPE");
  }
  if (Object.keys(input).length !== input.length) {
    return fail("FONT_CATALOG_MALFORMED");
  }
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("FONT_CATALOG_MALFORMED");
    }
  }
  return input;
}

function identifier(input: unknown): string {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > 256 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/u.test(input)
  ) {
    return fail("FONT_CATALOG_WRONG_TYPE");
  }
  return input;
}

function displayText(input: unknown, maximumLength = 256): string {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > maximumLength ||
    input !== input.trim() ||
    !input.isWellFormed()
  ) {
    return fail("FONT_CATALOG_WRONG_TYPE");
  }
  return input;
}

function member<const T extends readonly string[]>(input: unknown, values: T): T[number] {
  if (typeof input !== "string" || !values.includes(input)) {
    return fail("FONT_CATALOG_WRONG_TYPE");
  }
  return input;
}

function digest(input: unknown): Sha256Digest {
  if (!isSha256Digest(input)) return fail("FONT_CATALOG_WRONG_TYPE");
  return input;
}

function decodeRights(input: unknown): FontRightsDispositionSet {
  const value = record(input, [
    "commercialUse",
    "embedding",
    "subsetting",
    "redistribution",
    "buyerTransfer",
  ]);
  return Object.freeze({
    commercialUse: member(value["commercialUse"], fontRightsDispositions),
    embedding: member(value["embedding"], fontRightsDispositions),
    subsetting: member(value["subsetting"], fontRightsDispositions),
    redistribution: member(value["redistribution"], fontRightsDispositions),
    buyerTransfer: member(value["buyerTransfer"], fontRightsDispositions),
  });
}

function decodeAvailability(input: unknown): FontAvailability {
  const value = record(input, ["state", "blockingDiagnostic"]);
  if (value["state"] === "available") {
    if (value["blockingDiagnostic"] !== null) return fail("FONT_CATALOG_WRONG_TYPE");
    return Object.freeze({ state: "available", blockingDiagnostic: null });
  }
  if (value["state"] !== "unavailable") return fail("FONT_CATALOG_WRONG_TYPE");
  const diagnostic = record(value["blockingDiagnostic"], ["code", "reason"]);
  return Object.freeze({
    state: "unavailable",
    blockingDiagnostic: Object.freeze({
      code: member(diagnostic["code"], fontAvailabilityDiagnosticCodes),
      reason: displayText(diagnostic["reason"], 1_024),
    }),
  });
}

function decodeFamily(input: unknown): FontFamilyCatalogEntry {
  const value = record(input, ["familyId", "familyName", "faceIds"]);
  const faceIds = array(value["faceIds"]).map(identifier);
  if (faceIds.length < 1 || faceIds.length > 64 || new Set(faceIds).size !== faceIds.length) {
    return fail("FONT_CATALOG_DUPLICATE_IDENTITY");
  }
  return Object.freeze({
    familyId: identifier(value["familyId"]),
    familyName: displayText(value["familyName"]),
    faceIds: Object.freeze(faceIds),
  });
}

function decodeFace(input: unknown): FontFaceCatalogEntry {
  const value = record(input, [
    "faceId",
    "familyId",
    "style",
    "weight",
    "sourceClass",
    "byteDigest",
    "metricsDigest",
    "glyphCoverageDigest",
    "rights",
    "availability",
  ]);
  if (
    !Number.isSafeInteger(value["weight"]) ||
    (value["weight"] as number) < 1 ||
    (value["weight"] as number) > 1_000
  ) {
    return fail("FONT_CATALOG_WRONG_TYPE");
  }
  return Object.freeze({
    faceId: identifier(value["faceId"]),
    familyId: identifier(value["familyId"]),
    style: member(value["style"], fontFaceStyles),
    weight: value["weight"] as number,
    sourceClass: member(value["sourceClass"], fontSourceClasses),
    byteDigest: digest(value["byteDigest"]),
    metricsDigest: digest(value["metricsDigest"]),
    glyphCoverageDigest: digest(value["glyphCoverageDigest"]),
    rights: decodeRights(value["rights"]),
    availability: decodeAvailability(value["availability"]),
  });
}

function cloneFace(face: FontFaceCatalogEntry): FontFaceCatalogEntry {
  return Object.freeze({
    ...face,
    rights: Object.freeze({ ...face.rights }),
    availability:
      face.availability.state === "available"
        ? Object.freeze({ state: "available", blockingDiagnostic: null })
        : Object.freeze({
            state: "unavailable",
            blockingDiagnostic: Object.freeze({ ...face.availability.blockingDiagnostic }),
          }),
  });
}

export function validateFontCatalog(input: unknown): FontCatalogResult {
  try {
    const value = record(input, [
      "contractVersion",
      "schemaVersion",
      "kind",
      "catalogId",
      "catalogRevision",
      "families",
      "faces",
    ]);
    if (
      value["contractVersion"] !== 1 ||
      value["schemaVersion"] !== fontCatalogSchemaVersion ||
      value["kind"] !== "font-catalog"
    ) {
      return fail("FONT_CATALOG_UNSUPPORTED_VERSION");
    }
    if (
      !Number.isSafeInteger(value["catalogRevision"]) ||
      (value["catalogRevision"] as number) < 1
    ) {
      return fail("FONT_CATALOG_WRONG_TYPE");
    }
    const families = array(value["families"]).map(decodeFamily);
    const faces = array(value["faces"]).map(decodeFace);
    if (families.length < 1 || families.length > 256 || faces.length < 1 || faces.length > 2_048) {
      return fail("FONT_CATALOG_WRONG_TYPE");
    }
    if (
      new Set(families.map(({ familyId }) => familyId)).size !== families.length ||
      new Set(faces.map(({ faceId }) => faceId)).size !== faces.length
    ) {
      return fail("FONT_CATALOG_DUPLICATE_IDENTITY");
    }
    const faceById = new Map(faces.map((face) => [face.faceId, face]));
    const listedFaceIds: string[] = [];
    for (const family of families) {
      for (const faceId of family.faceIds) {
        const face = faceById.get(faceId);
        if (!face || face.familyId !== family.familyId) {
          return fail("FONT_CATALOG_BROKEN_REFERENCE");
        }
        listedFaceIds.push(faceId);
      }
    }
    if (
      listedFaceIds.length !== faces.length ||
      new Set(listedFaceIds).size !== faces.length ||
      faces.some((face) => !families.some((family) => family.familyId === face.familyId))
    ) {
      return fail("FONT_CATALOG_BROKEN_REFERENCE");
    }
    const faceSignatures = faces.map(
      ({ familyId, style, weight }) => `${familyId}\u0000${style}\u0000${weight}`,
    );
    if (new Set(faceSignatures).size !== faceSignatures.length) {
      return fail("FONT_CATALOG_DUPLICATE_FACE");
    }
    for (const family of families) {
      const canonicalFaceIds = faces
        .filter((face) => face.familyId === family.familyId)
        .map(({ faceId }) => faceId);
      if (family.faceIds.some((faceId, index) => faceId !== canonicalFaceIds[index])) {
        return fail("FONT_CATALOG_NONCANONICAL_ORDER");
      }
    }
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        contractVersion: 1,
        schemaVersion: fontCatalogSchemaVersion,
        kind: "font-catalog",
        catalogId: identifier(value["catalogId"]),
        catalogRevision: value["catalogRevision"] as number,
        families: Object.freeze(families),
        faces: Object.freeze(faces),
      }),
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof FontCatalogFailure ? error.code : "FONT_CATALOG_MALFORMED",
    });
  }
}

export function resolveExactFontFace(
  catalog: FontCatalog,
  familyId: string,
  style: FontFaceStyle,
  weight: number,
): ExactFontFaceResolution {
  const face = catalog.faces.find(
    (candidate) =>
      candidate.familyId === familyId && candidate.style === style && candidate.weight === weight,
  );
  if (!face) {
    return Object.freeze({
      accepted: false,
      code: "FONT_FACE_NOT_FOUND",
      diagnostic: Object.freeze({
        code: "FONT_FACE_NOT_FOUND",
        reason: `No admitted exact ${style} weight ${weight} face exists for family ${familyId}.`,
      }),
    });
  }
  if (face.availability.state === "unavailable") {
    return Object.freeze({
      accepted: false,
      code: "FONT_FACE_UNAVAILABLE",
      diagnostic: Object.freeze({ ...face.availability.blockingDiagnostic }),
    });
  }
  return Object.freeze({ accepted: true, face: cloneFace(face) });
}

export function evaluateFontPublicationEligibility(
  face: FontFaceCatalogEntry,
  policy: Readonly<{ requireSubsetting: boolean }>,
): FontPublicationEligibility {
  if (face.availability.state === "unavailable") {
    return Object.freeze({
      accepted: false,
      code: "FONT_PUBLICATION_FACE_UNAVAILABLE",
      reason: face.availability.blockingDiagnostic.reason,
    });
  }
  if (face.rights.commercialUse !== "permitted") {
    return Object.freeze({
      accepted: false,
      code: "FONT_PUBLICATION_COMMERCIAL_USE_NOT_PERMITTED",
      reason: `Commercial-use disposition is ${face.rights.commercialUse} for face ${face.faceId}.`,
    });
  }
  if (face.rights.embedding !== "permitted") {
    return Object.freeze({
      accepted: false,
      code: "FONT_PUBLICATION_EMBEDDING_NOT_PERMITTED",
      reason: `PDF embedding disposition is ${face.rights.embedding} for face ${face.faceId}.`,
    });
  }
  if (policy.requireSubsetting && face.rights.subsetting !== "permitted") {
    return Object.freeze({
      accepted: false,
      code: "FONT_PUBLICATION_SUBSETTING_NOT_PERMITTED",
      reason: `Required PDF subsetting disposition is ${face.rights.subsetting} for face ${face.faceId}.`,
    });
  }
  return Object.freeze({
    accepted: true,
    faceId: face.faceId,
    byteDigest: face.byteDigest,
    metricsDigest: face.metricsDigest,
    glyphCoverageDigest: face.glyphCoverageDigest,
  });
}
