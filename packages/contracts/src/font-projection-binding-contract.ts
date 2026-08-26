import type { FontFaceStyle } from "./font-catalog-contract.js";

export const fontProjectionBindingSchemaVersion =
  "rsrender.font-projection-binding-catalog.v1" as const;

export interface FontProjectionFamilyBinding {
  readonly familyId: string;
  readonly cssFamilyName: string;
}

export interface FontProjectionFaceBinding {
  readonly faceId: string;
  readonly familyId: string;
  readonly style: FontFaceStyle;
  readonly weight: number;
}

/** Renderer-neutral binding from an authored family identity to an exact face. */
export interface FontProjectionBindingCatalog {
  readonly contractVersion: 1;
  readonly schemaVersion: typeof fontProjectionBindingSchemaVersion;
  readonly kind: "font-projection-binding-catalog";
  readonly families: readonly FontProjectionFamilyBinding[];
  readonly faces: readonly FontProjectionFaceBinding[];
}

export interface FontProjectionFaceResource {
  readonly faceId: string;
  readonly resourceUrl: string;
  readonly format: "truetype" | "opentype" | "woff2";
}

export type FontProjectionBindingRejectionCode =
  | "FONT_PROJECTION_BINDING_MALFORMED"
  | "FONT_PROJECTION_BINDING_DUPLICATE_IDENTITY"
  | "FONT_PROJECTION_BINDING_DUPLICATE_FACE"
  | "FONT_PROJECTION_BINDING_BROKEN_REFERENCE"
  | "FONT_PROJECTION_BINDING_FACE_NOT_FOUND"
  | "FONT_PROJECTION_RESOURCE_MALFORMED"
  | "FONT_PROJECTION_RESOURCE_DUPLICATE_FACE"
  | "FONT_PROJECTION_RESOURCE_FACE_NOT_FOUND";

export type FontProjectionBindingCatalogResult =
  | Readonly<{ readonly accepted: true; readonly value: FontProjectionBindingCatalog }>
  | Readonly<{ readonly accepted: false; readonly code: FontProjectionBindingRejectionCode }>;

export type ExactFontProjectionFaceResolution =
  | Readonly<{
      readonly accepted: true;
      readonly family: FontProjectionFamilyBinding;
      readonly face: FontProjectionFaceBinding;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code: "FONT_PROJECTION_BINDING_FACE_NOT_FOUND";
    }>;

type DataRecord = Readonly<Record<string, unknown>>;

function exactRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== fields.length ||
    keys.some((key) => typeof key !== "string" || !fields.includes(key))
  ) {
    return null;
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor?.enumerable || !("value" in descriptor)) return null;
    result[field] = descriptor.value;
  }
  return result;
}

function exactArray(input: unknown): readonly unknown[] | null {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) return null;
  if (Object.keys(input).length !== input.length) return null;
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) return null;
    values.push(descriptor.value);
  }
  return values;
}

function identifier(input: unknown): string | null {
  return typeof input === "string" &&
    input.length >= 1 &&
    input.length <= 256 &&
    /^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/u.test(input)
    ? input
    : null;
}

function cssFamilyName(input: unknown): string | null {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > 256 ||
    input !== input.trim() ||
    !input.isWellFormed()
  ) {
    return null;
  }
  for (let index = 0; index < input.length; index += 1) {
    const codeUnit = input.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return null;
  }
  return input;
}

export function validateFontProjectionBindingCatalog(
  input: unknown,
): FontProjectionBindingCatalogResult {
  const record = exactRecord(input, [
    "contractVersion",
    "schemaVersion",
    "kind",
    "families",
    "faces",
  ]);
  const inputFamilies = record === null ? null : exactArray(record["families"]);
  const inputFaces = record === null ? null : exactArray(record["faces"]);
  if (
    record === null ||
    record["contractVersion"] !== 1 ||
    record["schemaVersion"] !== fontProjectionBindingSchemaVersion ||
    record["kind"] !== "font-projection-binding-catalog" ||
    inputFamilies === null ||
    inputFaces === null ||
    inputFamilies.length < 1 ||
    inputFamilies.length > 256 ||
    inputFaces.length < 1 ||
    inputFaces.length > 2_048
  ) {
    return Object.freeze({ accepted: false, code: "FONT_PROJECTION_BINDING_MALFORMED" });
  }
  const families: FontProjectionFamilyBinding[] = [];
  for (const inputFamily of inputFamilies) {
    const family = exactRecord(inputFamily, ["familyId", "cssFamilyName"]);
    const familyId = family === null ? null : identifier(family["familyId"]);
    const familyName = family === null ? null : cssFamilyName(family["cssFamilyName"]);
    if (familyId === null || familyName === null) {
      return Object.freeze({ accepted: false, code: "FONT_PROJECTION_BINDING_MALFORMED" });
    }
    families.push(Object.freeze({ familyId, cssFamilyName: familyName }));
  }
  if (new Set(families.map(({ familyId }) => familyId)).size !== families.length) {
    return Object.freeze({
      accepted: false,
      code: "FONT_PROJECTION_BINDING_DUPLICATE_IDENTITY",
    });
  }
  const familyIds = new Set(families.map(({ familyId }) => familyId));
  const faces: FontProjectionFaceBinding[] = [];
  for (const inputFace of inputFaces) {
    const face = exactRecord(inputFace, ["faceId", "familyId", "style", "weight"]);
    const faceId = face === null ? null : identifier(face["faceId"]);
    const familyId = face === null ? null : identifier(face["familyId"]);
    const style = face?.["style"];
    const weight = face?.["weight"];
    if (
      faceId === null ||
      familyId === null ||
      (style !== "normal" && style !== "italic") ||
      !Number.isSafeInteger(weight) ||
      (weight as number) < 1 ||
      (weight as number) > 1_000
    ) {
      return Object.freeze({ accepted: false, code: "FONT_PROJECTION_BINDING_MALFORMED" });
    }
    if (!familyIds.has(familyId)) {
      return Object.freeze({
        accepted: false,
        code: "FONT_PROJECTION_BINDING_BROKEN_REFERENCE",
      });
    }
    faces.push(
      Object.freeze({
        faceId,
        familyId,
        style,
        weight: weight as number,
      }),
    );
  }
  if (new Set(faces.map(({ faceId }) => faceId)).size !== faces.length) {
    return Object.freeze({
      accepted: false,
      code: "FONT_PROJECTION_BINDING_DUPLICATE_IDENTITY",
    });
  }
  if (
    new Set(faces.map(({ familyId, style, weight }) => `${familyId}\u0000${style}\u0000${weight}`))
      .size !== faces.length
  ) {
    return Object.freeze({ accepted: false, code: "FONT_PROJECTION_BINDING_DUPLICATE_FACE" });
  }
  return Object.freeze({
    accepted: true,
    value: Object.freeze({
      contractVersion: 1,
      schemaVersion: fontProjectionBindingSchemaVersion,
      kind: "font-projection-binding-catalog",
      families: Object.freeze(families),
      faces: Object.freeze(faces),
    }),
  });
}

export function resolveExactFontProjectionFace(
  catalog: FontProjectionBindingCatalog,
  familyId: string,
  style: FontFaceStyle,
  weight: number,
): ExactFontProjectionFaceResolution {
  const face = catalog.faces.find(
    (candidate) =>
      candidate.familyId === familyId && candidate.style === style && candidate.weight === weight,
  );
  const family = catalog.families.find((candidate) => candidate.familyId === familyId);
  return face === undefined || family === undefined
    ? Object.freeze({ accepted: false, code: "FONT_PROJECTION_BINDING_FACE_NOT_FOUND" })
    : Object.freeze({ accepted: true, family, face });
}

export const rsrenderFontProjectionBindings: FontProjectionBindingCatalog = Object.freeze({
  contractVersion: 1,
  schemaVersion: fontProjectionBindingSchemaVersion,
  kind: "font-projection-binding-catalog",
  families: Object.freeze([
    Object.freeze({
      familyId: "font.logical.rsrender-sans",
      cssFamilyName: "RSrender Qualified Arial",
    }),
    Object.freeze({ familyId: "font.logical.source-sans-3", cssFamilyName: "Source Sans 3" }),
    Object.freeze({ familyId: "font.logical.source-serif-4", cssFamilyName: "Source Serif 4" }),
    Object.freeze({ familyId: "font.logical.source-code-pro", cssFamilyName: "Source Code Pro" }),
  ]),
  faces: Object.freeze([
    Object.freeze({
      faceId: "font.face.rsrender-sans.regular",
      familyId: "font.logical.rsrender-sans",
      style: "normal",
      weight: 400,
    }),
    Object.freeze({
      faceId: "font.face.rsrender-sans.bold",
      familyId: "font.logical.rsrender-sans",
      style: "normal",
      weight: 700,
    }),
    ...Object.freeze([
      ["source-sans-3", "font.logical.source-sans-3"],
      ["source-serif-4", "font.logical.source-serif-4"],
      ["source-code-pro", "font.logical.source-code-pro"],
    ] as const).flatMap(([faceFamily, familyId]) =>
      Object.freeze([
        Object.freeze({
          faceId: `font.face.${faceFamily}.regular`,
          familyId,
          style: "normal" as const,
          weight: 400,
        }),
        Object.freeze({
          faceId: `font.face.${faceFamily}.italic`,
          familyId,
          style: "italic" as const,
          weight: 400,
        }),
        Object.freeze({
          faceId: `font.face.${faceFamily}.bold`,
          familyId,
          style: "normal" as const,
          weight: 700,
        }),
        Object.freeze({
          faceId: `font.face.${faceFamily}.bold-italic`,
          familyId,
          style: "italic" as const,
          weight: 700,
        }),
      ]),
    ),
  ]),
});

export const rsrenderPublicationFontResources: readonly FontProjectionFaceResource[] =
  Object.freeze([
    Object.freeze({
      faceId: "font.face.rsrender-sans.regular",
      resourceUrl: "rsrender-layout://publication/arial-regular.ttf",
      format: "truetype",
    }),
    Object.freeze({
      faceId: "font.face.rsrender-sans.bold",
      resourceUrl: "rsrender-layout://publication/arial-bold.ttf",
      format: "truetype",
    }),
    ...Object.freeze([
      [
        "source-sans-3",
        "source-sans-3-regular.ttf",
        "source-sans-3-italic.ttf",
        "source-sans-3-bold.ttf",
        "source-sans-3-bold-italic.ttf",
      ],
      [
        "source-serif-4",
        "source-serif-4-regular.ttf",
        "source-serif-4-italic.ttf",
        "source-serif-4-bold.ttf",
        "source-serif-4-bold-italic.ttf",
      ],
      [
        "source-code-pro",
        "source-code-pro-regular.ttf",
        "source-code-pro-italic.ttf",
        "source-code-pro-bold.ttf",
        "source-code-pro-bold-italic.ttf",
      ],
    ] as const).flatMap(([faceFamily, regular, italic, bold, boldItalic]) =>
      Object.freeze([
        Object.freeze({
          faceId: `font.face.${faceFamily}.regular`,
          resourceUrl: `rsrender-layout://publication/${regular}`,
          format: "truetype" as const,
        }),
        Object.freeze({
          faceId: `font.face.${faceFamily}.italic`,
          resourceUrl: `rsrender-layout://publication/${italic}`,
          format: "truetype" as const,
        }),
        Object.freeze({
          faceId: `font.face.${faceFamily}.bold`,
          resourceUrl: `rsrender-layout://publication/${bold}`,
          format: "truetype" as const,
        }),
        Object.freeze({
          faceId: `font.face.${faceFamily}.bold-italic`,
          resourceUrl: `rsrender-layout://publication/${boldItalic}`,
          format: "truetype" as const,
        }),
      ]),
    ),
  ]);

/** Backward-compatible names retained for consumers introduced with the first Arial-only seam. */
export const rsrenderSansFontProjectionBindings = rsrenderFontProjectionBindings;
export const rsrenderSansPublicationFontResources = rsrenderPublicationFontResources;

export function validateFontProjectionFaceResources(
  input: unknown,
  catalog: FontProjectionBindingCatalog,
):
  | Readonly<{ readonly accepted: true; readonly value: readonly FontProjectionFaceResource[] }>
  | Readonly<{ readonly accepted: false; readonly code: FontProjectionBindingRejectionCode }> {
  const inputResources = exactArray(input);
  if (inputResources === null || inputResources.length < 1 || inputResources.length > 2_048) {
    return Object.freeze({ accepted: false, code: "FONT_PROJECTION_RESOURCE_MALFORMED" });
  }
  const resources: FontProjectionFaceResource[] = [];
  for (const inputResource of inputResources) {
    const resource = exactRecord(inputResource, ["faceId", "resourceUrl", "format"]);
    const faceId = resource === null ? null : identifier(resource["faceId"]);
    const resourceUrl = resource?.["resourceUrl"];
    const format = resource?.["format"];
    if (
      faceId === null ||
      typeof resourceUrl !== "string" ||
      !/^rsrender-layout:\/\/publication\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(resourceUrl) ||
      (format !== "truetype" && format !== "opentype" && format !== "woff2")
    ) {
      return Object.freeze({ accepted: false, code: "FONT_PROJECTION_RESOURCE_MALFORMED" });
    }
    if (!catalog.faces.some((face) => face.faceId === faceId)) {
      return Object.freeze({ accepted: false, code: "FONT_PROJECTION_RESOURCE_FACE_NOT_FOUND" });
    }
    resources.push(Object.freeze({ faceId, resourceUrl, format }));
  }
  if (new Set(resources.map(({ faceId }) => faceId)).size !== resources.length) {
    return Object.freeze({ accepted: false, code: "FONT_PROJECTION_RESOURCE_DUPLICATE_FACE" });
  }
  return Object.freeze({ accepted: true, value: Object.freeze(resources) });
}
