import { createHash } from "node:crypto";

export const rsLogProjectDataIngressRevision = "bld-051-rslog-project-data-ingress-v2" as const;
export const maximumRsLogProjectDataBytes = 16_777_216 as const;
export const maximumRsLogProjectBoreholes = 64 as const;
export const maximumRsLogBoreholeCollectionItems = 4_096 as const;

export type RsLogProjectDataIngressRejectionCode =
  | "RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE"
  | "RSLOG_PROJECT_DATA_INPUT_EMPTY"
  | "RSLOG_PROJECT_DATA_INPUT_TOO_LARGE"
  | "RSLOG_PROJECT_DATA_INPUT_INVALID_UTF8"
  | "RSLOG_PROJECT_DATA_INPUT_INVALID_JSON"
  | "RSLOG_PROJECT_DATA_TOP_LEVEL_UNSUPPORTED"
  | "RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED"
  | "RSLOG_PROJECT_DATA_VERSION_UNSUPPORTED"
  | "RSLOG_PROJECT_DATA_SCHEMA_MALFORMED"
  | "RSLOG_PROJECT_DATA_CAPACITY_EXCEEDED"
  | "RSLOG_PROJECT_DATA_DUPLICATE_IDENTITY";

export interface RsLogProjectDataStratigraphy {
  readonly identity: string;
  readonly fromDepth: number;
  readonly toDepth: number;
  readonly title: string | null;
  readonly description: string | null;
  readonly soilSymbol: string | null;
  readonly foregroundColor: string | null;
  readonly backgroundColor: string | null;
}

export interface RsLogProjectDataSample {
  readonly identity: string;
  readonly fromDepth: number;
  readonly toDepth: number | null;
  readonly number: string | null;
  readonly typeName: string | null;
  readonly recoveryPercent: number | null;
  readonly blowCounts: string | null;
  readonly nValue: number | null;
  readonly n60: number | null;
  readonly refusal: boolean | null;
  readonly moistureContent: number | null;
  readonly moistureW: number | null;
  readonly liquidLimit: number | null;
  readonly plasticLimit: number | null;
  readonly plasticIndex: number | null;
}

export interface RsLogProjectDataComment {
  readonly identity: string;
  readonly depth: number;
  readonly description: string | null;
}

export interface RsLogProjectDataBoringMethod {
  readonly identity: string;
  readonly fromDepth: number;
  readonly toDepth: number;
  readonly drillMethod: string | null;
  readonly drillRigModel: string | null;
  readonly holeDiameter: number | null;
  readonly date: string | null;
  readonly notes: string | null;
}

export interface RsLogProjectDataBorehole {
  readonly identity: string;
  readonly name: string;
  readonly depth: number;
  readonly elevation: number | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly easting: number | null;
  readonly northing: number | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly loggedBy: string | null;
  readonly reviewedBy: string | null;
  readonly drillerName: string | null;
  readonly contractorName: string | null;
  readonly equipment: string | null;
  readonly holeDrillBitSize: string | null;
  readonly groundwaterDepth: number | null;
  readonly groundwaterNotes: string | null;
  readonly stratigraphy: readonly RsLogProjectDataStratigraphy[];
  readonly samples: readonly RsLogProjectDataSample[];
  readonly comments: readonly RsLogProjectDataComment[];
  readonly boringMethods: readonly RsLogProjectDataBoringMethod[];
}

export interface RsLogProjectDataDocument {
  readonly schemaVersion: "rslog.project-json.v3" | "rslog.live-rsgeo.v1";
  readonly sourceDigest: `sha256:${string}`;
  readonly byteLength: number;
  readonly project: Readonly<{
    identity: string;
    title: string;
    number: string | null;
    clientName: string | null;
    address: string | null;
    unitSystem: string;
    coordinateSystem: string;
  }>;
  readonly boreholes: readonly RsLogProjectDataBorehole[];
}

export type RsLogProjectDataIngressResult =
  | Readonly<{
      accepted: true;
      code: "RSLOG_PROJECT_DATA_ACCEPTED";
      value: RsLogProjectDataDocument;
    }>
  | Readonly<{
      accepted: false;
      code: RsLogProjectDataIngressRejectionCode;
      byteLength?: number;
      sourceDigest?: `sha256:${string}`;
      topLevelKind?: "object" | "array";
      topLevelKeys?: readonly string[];
      diagnosticPath?: string;
    }>;

type RsLogProjectDataRejectionEvidence = Readonly<{
  byteLength?: number;
  sourceDigest?: `sha256:${string}`;
  topLevelKind?: "object" | "array";
  topLevelKeys?: readonly string[];
  diagnosticPath?: string;
}>;

type JsonRecord = Readonly<Record<string, unknown>>;

class RsLogProjectDataFailure extends Error {
  constructor(
    readonly code: RsLogProjectDataIngressRejectionCode,
    readonly diagnosticPath: string,
  ) {
    super(`${code}:${diagnosticPath}`);
    this.name = "RsLogProjectDataFailure";
  }
}

function rejected(
  code: RsLogProjectDataIngressRejectionCode,
  evidence: RsLogProjectDataRejectionEvidence = {},
): RsLogProjectDataIngressResult {
  return Object.freeze({ accepted: false, code, ...evidence });
}

function fail(code: RsLogProjectDataIngressRejectionCode, path: string): never {
  throw new RsLogProjectDataFailure(code, path);
}

function record(input: unknown, path: string): JsonRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", path);
  }
  return input as JsonRecord;
}

function member(input: JsonRecord, key: string): unknown {
  return Object.hasOwn(input, key) ? input[key] : undefined;
}

function requiredText(input: JsonRecord, key: string, path: string): string {
  const value = member(input, key);
  if (typeof value !== "string" || value.length < 1 || value.length > 8_192) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.${key}`);
  }
  return value;
}

function optionalText(input: JsonRecord, key: string, path: string): string | null {
  const value = member(input, key);
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 8_192) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.${key}`);
  }
  return value;
}

function requiredNumber(input: JsonRecord, key: string, path: string): number {
  const value = member(input, key);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.${key}`);
  }
  return value;
}

function optionalNumber(input: JsonRecord, key: string, path: string): number | null {
  const value = member(input, key);
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.${key}`);
  }
  return value;
}

function optionalBoolean(input: JsonRecord, key: string, path: string): boolean | null {
  const value = member(input, key);
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.${key}`);
  }
  return value;
}

function optionalRecord(input: JsonRecord, key: string, path: string): JsonRecord | null {
  const value = member(input, key);
  if (value === undefined || value === null) return null;
  return record(value, `${path}.${key}`);
}

function collection(input: JsonRecord, key: string, path: string): readonly unknown[] {
  const value = member(input, key);
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.${key}`);
  }
  if (value.length > maximumRsLogBoreholeCollectionItems) {
    return fail("RSLOG_PROJECT_DATA_CAPACITY_EXCEEDED", `${path}.${key}`);
  }
  return value;
}

function entityIdentity(
  input: JsonRecord,
  fallback: string,
  observed: Set<string>,
  path: string,
): string {
  const identity = optionalText(input, "Id", path) ?? fallback;
  if (identity.length > 512) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.Id`);
  }
  if (observed.has(identity)) {
    return fail("RSLOG_PROJECT_DATA_DUPLICATE_IDENTITY", `${path}.Id`);
  }
  observed.add(identity);
  return identity;
}

function active(input: JsonRecord, path: string): boolean {
  return optionalBoolean(input, "IsActive", path) ?? true;
}

function bytesFrom(input: unknown): Uint8Array | null {
  if (typeof input === "string") return new TextEncoder().encode(input);
  return input instanceof Uint8Array ? new Uint8Array(input) : null;
}

function decodeStratigraphy(
  input: JsonRecord,
  path: string,
  fallbackIdentity: string,
  observed: Set<string>,
  boreholeDepth: number,
): RsLogProjectDataStratigraphy | null {
  if (!active(input, path)) return null;
  const fromDepth = requiredNumber(input, "FromDepth", path);
  const toDepth = requiredNumber(input, "ToDepth", path);
  if (fromDepth < 0 || toDepth <= fromDepth || toDepth > boreholeDepth) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.FromDepth/ToDepth`);
  }
  const general = optionalRecord(input, "General", path);
  return Object.freeze({
    identity: entityIdentity(input, fallbackIdentity, observed, path),
    fromDepth,
    toDepth,
    title: optionalText(input, "Title", path),
    description: optionalText(input, "Description", path),
    soilSymbol: optionalText(input, "SoilSymbol", path),
    foregroundColor:
      general === null
        ? optionalText(input, "ForeColor", path)
        : (optionalText(general, "ForeColor", `${path}.General`) ??
          optionalText(input, "ForeColor", path)),
    backgroundColor:
      general === null
        ? optionalText(input, "BackColor", path)
        : (optionalText(general, "BackColor", `${path}.General`) ??
          optionalText(input, "BackColor", path)),
  });
}

function indexTests(input: JsonRecord, path: string): JsonRecord | null {
  const labTests = optionalRecord(input, "LabTests", path);
  if (labTests === null) return null;
  const value = member(labTests, "IndexTests");
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length > maximumRsLogBoreholeCollectionItems) {
      return fail("RSLOG_PROJECT_DATA_CAPACITY_EXCEEDED", `${path}.LabTests.IndexTests`);
    }
    return record(value[0], `${path}.LabTests.IndexTests[0]`);
  }
  return record(value, `${path}.LabTests.IndexTests`);
}

function decodeSample(
  input: JsonRecord,
  path: string,
  fallbackIdentity: string,
  observed: Set<string>,
  boreholeDepth: number,
): RsLogProjectDataSample | null {
  if (!active(input, path)) return null;
  const fromDepth = requiredNumber(input, "FromDepth", path);
  const toDepth = optionalNumber(input, "ToDepth", path);
  if (
    fromDepth < 0 ||
    fromDepth > boreholeDepth ||
    (toDepth !== null && (toDepth <= fromDepth || toDepth > boreholeDepth))
  ) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.FromDepth/ToDepth`);
  }
  const recoveryPercent = optionalNumber(input, "RecoveryPercent", path);
  const moistureContent = optionalNumber(input, "MoistureContent", path);
  if (
    (recoveryPercent !== null && (recoveryPercent < 0 || recoveryPercent > 100)) ||
    (moistureContent !== null && moistureContent < 0)
  ) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", path);
  }
  const tests = indexTests(input, path);
  return Object.freeze({
    identity: entityIdentity(input, fallbackIdentity, observed, path),
    fromDepth,
    toDepth,
    number: optionalText(input, "Number", path),
    typeName: optionalText(input, "TypeName", path),
    recoveryPercent,
    blowCounts: optionalText(input, "BlowCounts", path),
    nValue: optionalNumber(input, "NValue", path),
    n60: optionalNumber(input, "N60", path),
    refusal: optionalBoolean(input, "Refusal", path),
    moistureContent,
    moistureW:
      tests === null ? null : optionalNumber(tests, "MoistureW", `${path}.LabTests.IndexTests`),
    liquidLimit:
      tests === null ? null : optionalNumber(tests, "LiquidLimit", `${path}.LabTests.IndexTests`),
    plasticLimit:
      tests === null ? null : optionalNumber(tests, "PlasticLimit", `${path}.LabTests.IndexTests`),
    plasticIndex:
      tests === null ? null : optionalNumber(tests, "PlasticIndex", `${path}.LabTests.IndexTests`),
  });
}

function decodeComment(
  input: JsonRecord,
  path: string,
  fallbackIdentity: string,
  observed: Set<string>,
  boreholeDepth: number,
): RsLogProjectDataComment | null {
  if (!active(input, path)) return null;
  const depth = requiredNumber(input, "Depth", path);
  if (depth < 0 || depth > boreholeDepth) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.Depth`);
  }
  return Object.freeze({
    identity: entityIdentity(input, fallbackIdentity, observed, path),
    depth,
    description: optionalText(input, "Description", path),
  });
}

function decodeBoringMethod(
  input: JsonRecord,
  path: string,
  fallbackIdentity: string,
  observed: Set<string>,
  boreholeDepth: number,
): RsLogProjectDataBoringMethod | null {
  if (!active(input, path)) return null;
  const fromDepth = requiredNumber(input, "FromDepth", path);
  const toDepth = requiredNumber(input, "ToDepth", path);
  if (fromDepth < 0 || toDepth <= fromDepth || toDepth > boreholeDepth) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.FromDepth/ToDepth`);
  }
  return Object.freeze({
    identity: entityIdentity(input, fallbackIdentity, observed, path),
    fromDepth,
    toDepth,
    drillMethod: optionalText(input, "DrillMethod", path),
    drillRigModel: optionalText(input, "DrillRigModel", path),
    holeDiameter: optionalNumber(input, "HoleDiameter", path),
    date: optionalText(input, "Date", path),
    notes: optionalText(input, "Notes", path),
  });
}

function decodeBorehole(
  input: JsonRecord,
  path: string,
  fallbackIdentity: string,
  observedBoreholes: Set<string>,
): RsLogProjectDataBorehole | null {
  if (!active(input, path)) return null;
  const depth = requiredNumber(input, "Depth", path);
  if (depth <= 0) return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", `${path}.Depth`);
  const identity = entityIdentity(input, fallbackIdentity, observedBoreholes, path);
  const collectionIdentity = (kind: string, index: number): string =>
    `${identity}:${kind}:${String(index + 1)}`;
  const stratigraphyIdentities = new Set<string>();
  const sampleIdentities = new Set<string>();
  const commentIdentities = new Set<string>();
  const boringMethodIdentities = new Set<string>();
  const stratigraphy = collection(input, "Stratigraphy", path)
    .map((candidate, index) =>
      decodeStratigraphy(
        record(candidate, `${path}.Stratigraphy[${String(index)}]`),
        `${path}.Stratigraphy[${String(index)}]`,
        collectionIdentity("stratigraphy", index),
        stratigraphyIdentities,
        depth,
      ),
    )
    .filter((candidate): candidate is RsLogProjectDataStratigraphy => candidate !== null);
  const samples = collection(input, "Samples", path)
    .map((candidate, index) =>
      decodeSample(
        record(candidate, `${path}.Samples[${String(index)}]`),
        `${path}.Samples[${String(index)}]`,
        collectionIdentity("sample", index),
        sampleIdentities,
        depth,
      ),
    )
    .filter((candidate): candidate is RsLogProjectDataSample => candidate !== null);
  const comments = collection(input, "Comments", path)
    .map((candidate, index) =>
      decodeComment(
        record(candidate, `${path}.Comments[${String(index)}]`),
        `${path}.Comments[${String(index)}]`,
        collectionIdentity("comment", index),
        commentIdentities,
        depth,
      ),
    )
    .filter((candidate): candidate is RsLogProjectDataComment => candidate !== null);
  const boringMethods = collection(input, "BoringMethods", path)
    .map((candidate, index) =>
      decodeBoringMethod(
        record(candidate, `${path}.BoringMethods[${String(index)}]`),
        `${path}.BoringMethods[${String(index)}]`,
        collectionIdentity("boring-method", index),
        boringMethodIdentities,
        depth,
      ),
    )
    .filter((candidate): candidate is RsLogProjectDataBoringMethod => candidate !== null);
  const groundwater = optionalRecord(input, "DrillingGroundwaterLevels", path);
  return Object.freeze({
    identity,
    name: requiredText(input, "Name", path),
    depth,
    elevation: optionalNumber(input, "Elevation", path),
    latitude: optionalNumber(input, "Latitude", path),
    longitude: optionalNumber(input, "Longitude", path),
    easting: optionalNumber(input, "Easting", path),
    northing: optionalNumber(input, "Northing", path),
    startDate: optionalText(input, "StartDate", path),
    endDate: optionalText(input, "EndDate", path),
    loggedBy: optionalText(input, "LoggedBy", path),
    reviewedBy: optionalText(input, "ReviewedBy", path),
    drillerName: optionalText(input, "DrillerName", path),
    contractorName: optionalText(input, "ContractorName", path),
    equipment: optionalText(input, "Equipment", path),
    holeDrillBitSize: optionalText(input, "HoleDrillBitSize", path),
    groundwaterDepth:
      groundwater === null
        ? null
        : optionalNumber(groundwater, "GroundwaterDepth", `${path}.DrillingGroundwaterLevels`),
    groundwaterNotes:
      groundwater === null
        ? null
        : optionalText(groundwater, "GroundwaterNotes", `${path}.DrillingGroundwaterLevels`),
    stratigraphy: Object.freeze(stratigraphy),
    samples: Object.freeze(samples),
    comments: Object.freeze(comments),
    boringMethods: Object.freeze(boringMethods),
  });
}

function decodeVersionThreeProject(
  input: JsonRecord,
  sourceDigest: `sha256:${string}`,
  byteLength: number,
): RsLogProjectDataDocument {
  const properties = record(member(input, "Properties"), "$.Properties");
  const fileVersion = requiredText(properties, "FileVersion", "$.Properties");
  if (fileVersion !== "v3") {
    return fail("RSLOG_PROJECT_DATA_VERSION_UNSUPPORTED", "$.Properties.FileVersion");
  }
  const project = record(member(input, "Project"), "$.Project");
  const boreholeInputs = member(input, "Boreholes");
  if (!Array.isArray(boreholeInputs)) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", "$.Boreholes");
  }
  if (boreholeInputs.length < 1 || boreholeInputs.length > maximumRsLogProjectBoreholes) {
    return fail("RSLOG_PROJECT_DATA_CAPACITY_EXCEEDED", "$.Boreholes");
  }
  const sourceHex = sourceDigest.slice("sha256:".length);
  const projectIdentity =
    optionalText(project, "Id", "$.Project") ??
    `urn:rsrender:source:rslog-project-json:${sourceHex}:project`;
  if (projectIdentity.length > 512) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", "$.Project.Id");
  }
  const observedBoreholes = new Set<string>();
  const boreholes = boreholeInputs
    .map((candidate, index) =>
      decodeBorehole(
        record(candidate, `$.Boreholes[${String(index)}]`),
        `$.Boreholes[${String(index)}]`,
        `urn:rsrender:source:rslog-project-json:${sourceHex}:borehole:${String(index + 1)}`,
        observedBoreholes,
      ),
    )
    .filter((candidate): candidate is RsLogProjectDataBorehole => candidate !== null);
  if (boreholes.length < 1) {
    return fail("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", "$.Boreholes");
  }
  return Object.freeze({
    schemaVersion: "rslog.project-json.v3",
    sourceDigest,
    byteLength,
    project: Object.freeze({
      identity: projectIdentity,
      title: requiredText(project, "Title", "$.Project"),
      number: optionalText(project, "Number", "$.Project"),
      clientName: optionalText(project, "ClientName", "$.Project"),
      address: optionalText(project, "Address", "$.Project"),
      unitSystem: requiredText(project, "UnitSystem", "$.Project"),
      coordinateSystem: requiredText(project, "CoordinateSystem", "$.Project"),
    }),
    boreholes: Object.freeze(boreholes),
  });
}

/**
 * Bounded local-file ingress for the documented RSLog Project JSON v3 exchange format.
 * Only documented, renderer-relevant fields are projected. Unknown vendor fields remain inert
 * and no N-value, unit conversion, or missing interval is inferred.
 */
export function inspectRsLogProjectDataJson(input: unknown): RsLogProjectDataIngressResult {
  try {
    const bytes = bytesFrom(input);
    if (bytes === null) return rejected("RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE");
    if (bytes.byteLength === 0) return rejected("RSLOG_PROJECT_DATA_INPUT_EMPTY");
    if (bytes.byteLength > maximumRsLogProjectDataBytes) {
      return rejected("RSLOG_PROJECT_DATA_INPUT_TOO_LARGE");
    }
    const evidence = Object.freeze({
      byteLength: bytes.byteLength,
      sourceDigest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` as const,
    });
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return rejected("RSLOG_PROJECT_DATA_INPUT_INVALID_UTF8", evidence);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(source) as unknown;
    } catch {
      return rejected("RSLOG_PROJECT_DATA_INPUT_INVALID_JSON", evidence);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return rejected("RSLOG_PROJECT_DATA_TOP_LEVEL_UNSUPPORTED", evidence);
    }
    const topLevelKind = "object" as const;
    const topLevelKeys = Object.freeze(Object.keys(parsed).sort().slice(0, 128));
    const root = parsed as JsonRecord;
    if (
      !Object.hasOwn(root, "Properties") ||
      !Object.hasOwn(root, "Project") ||
      !Object.hasOwn(root, "Boreholes")
    ) {
      return rejected("RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED", {
        ...evidence,
        topLevelKind,
        topLevelKeys,
      });
    }
    try {
      return Object.freeze({
        accepted: true,
        code: "RSLOG_PROJECT_DATA_ACCEPTED",
        value: decodeVersionThreeProject(root, evidence.sourceDigest, evidence.byteLength),
      });
    } catch (error) {
      if (error instanceof RsLogProjectDataFailure) {
        return rejected(error.code, {
          ...evidence,
          topLevelKind,
          topLevelKeys,
          diagnosticPath: error.diagnosticPath,
        });
      }
      return rejected("RSLOG_PROJECT_DATA_SCHEMA_MALFORMED", {
        ...evidence,
        topLevelKind,
        topLevelKeys,
      });
    }
  } catch {
    return rejected("RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE");
  }
}
