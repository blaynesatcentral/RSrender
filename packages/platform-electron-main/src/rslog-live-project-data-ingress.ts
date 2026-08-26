import { createHash } from "node:crypto";

import type {
  RsLogProjectDataBorehole,
  RsLogProjectDataBoringMethod,
  RsLogProjectDataComment,
  RsLogProjectDataDocument,
  RsLogProjectDataSample,
  RsLogProjectDataStratigraphy,
} from "./rslog-project-data-ingress.js";
import {
  maximumRsLogBoreholeCollectionItems,
  maximumRsLogProjectBoreholes,
} from "./rslog-project-data-ingress.js";
import type { RsLogProjectCatalogEntry } from "./rslog-project-catalog-ingress.js";

export const rsLogLiveProjectDataIngressRevision = "bld-051-live-project-data-ingress-v1" as const;

type JsonRecord = Record<string, unknown>;

export type RsLogLiveBoreholeCatalogEntry = Readonly<{
  id: string;
  projectId: string;
  name: string;
  depth: number;
  elevation: number | null;
  latitude: number | null;
  longitude: number | null;
  easting: number | null;
  northing: number | null;
  startDate: string | null;
  endDate: string | null;
  loggedBy: string | null;
  reviewedBy: string | null;
  contractorName: string | null;
  equipment: string | null;
  holeDrillBitSize: string | null;
  groundwaterDepth: number | null;
  groundwaterNotes: string | null;
}>;

export type RsLogLiveBoreholeCatalogResult =
  | Readonly<{
      accepted: true;
      code: "RSLOG_LIVE_BOREHOLE_CATALOG_ACCEPTED";
      responseDigest: `sha256:${string}`;
      boreholes: readonly RsLogLiveBoreholeCatalogEntry[];
    }>
  | Readonly<{
      accepted: false;
      code:
        | "RSLOG_LIVE_BOREHOLE_CATALOG_INPUT_INVALID"
        | "RSLOG_LIVE_BOREHOLE_CATALOG_SCHEMA_UNADMITTED"
        | "RSLOG_LIVE_BOREHOLE_CATALOG_CAPACITY_EXCEEDED"
        | "RSLOG_LIVE_BOREHOLE_CATALOG_DUPLICATE_IDENTITY";
    }>;

export type RsLogLiveRsGeoResponse = Readonly<{
  boreholeId: string;
  body: Uint8Array;
}>;

export type RsLogLiveProjectDataIngressResult =
  | Readonly<{
      accepted: true;
      code: "RSLOG_LIVE_PROJECT_DATA_ACCEPTED";
      value: RsLogProjectDataDocument;
      warnings: readonly string[];
    }>
  | Readonly<{
      accepted: false;
      code:
        | "RSLOG_LIVE_PROJECT_DATA_INPUT_INVALID"
        | "RSLOG_LIVE_PROJECT_DATA_SCHEMA_UNADMITTED"
        | "RSLOG_LIVE_PROJECT_DATA_VERSION_UNSUPPORTED"
        | "RSLOG_LIVE_PROJECT_DATA_PROJECT_MISMATCH"
        | "RSLOG_LIVE_PROJECT_DATA_BOREHOLE_MISMATCH"
        | "RSLOG_LIVE_PROJECT_DATA_CAPACITY_EXCEEDED"
        | "RSLOG_LIVE_PROJECT_DATA_TOP_ELEVATION_MISSING";
      diagnosticPath: string;
    }>;

function rejectedCatalog(
  code: Extract<RsLogLiveBoreholeCatalogResult, { accepted: false }>["code"],
): RsLogLiveBoreholeCatalogResult {
  return Object.freeze({ accepted: false, code });
}

function rejectedProject(
  code: Extract<RsLogLiveProjectDataIngressResult, { accepted: false }>["code"],
  diagnosticPath: string,
): RsLogLiveProjectDataIngressResult {
  return Object.freeze({ accepted: false, code, diagnosticPath });
}

function plainRecord(input: unknown): JsonRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
  }
  return input as JsonRecord;
}

function decodeJson(input: Uint8Array): unknown {
  if (!(input instanceof Uint8Array) || input.byteLength < 1) return null;
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input)) as unknown;
  } catch {
    return null;
  }
}

function boundedText(input: unknown, maximumBytes = 8_192): string | null {
  if (typeof input !== "string" || input.length < 1) return null;
  if (new TextEncoder().encode(input).byteLength > maximumBytes) return null;
  for (const character of input) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 8 || (codePoint >= 11 && codePoint <= 31) || codePoint === 127) return null;
  }
  return input;
}

function nullableText(input: unknown): string | null {
  return input === undefined || input === null || input === "" ? null : boundedText(input);
}

const richTextBreakElements = new Set(["br", "div", "li", "p", "section", "td", "th", "tr"]);

function decodeHtmlEntity(entity: string): string {
  const named: Readonly<Record<string, string>> = Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  });
  const lower = entity.toLowerCase();
  if (Object.hasOwn(named, lower)) return named[lower]!;
  const numeric = /^#(?:(?<decimal>[0-9]+)|x(?<hex>[0-9a-f]+))$/iu.exec(entity);
  const codePoint =
    numeric?.groups?.["decimal"] !== undefined
      ? Number.parseInt(numeric.groups["decimal"], 10)
      : numeric?.groups?.["hex"] !== undefined
        ? Number.parseInt(numeric.groups["hex"], 16)
        : Number.NaN;
  return Number.isSafeInteger(codePoint) &&
    codePoint > 0 &&
    codePoint <= 0x10ffff &&
    !(codePoint >= 0xd800 && codePoint <= 0xdfff)
    ? String.fromCodePoint(codePoint)
    : `&${entity};`;
}

/** Converts bounded provider-authored HTML fragments to inert renderer plain text. */
export function normalizeRsLogRichText(input: unknown): string | null {
  const source = nullableText(input);
  if (source === null) return null;
  let result = "";
  for (let index = 0; index < source.length; index += 1) {
    if (source.startsWith("<!--", index)) {
      const commentEnd = source.indexOf("-->", index + 4);
      index = commentEnd < 0 ? source.length : commentEnd + 2;
      continue;
    }
    if (source[index] !== "<" || !/[A-Za-z/!?]/u.test(source[index + 1] ?? "")) {
      result += source[index];
      continue;
    }
    let quote: '"' | "'" | null = null;
    let tagEnd = index + 1;
    for (; tagEnd < source.length; tagEnd += 1) {
      const character = source[tagEnd];
      if ((character === '"' || character === "'") && quote === null) quote = character;
      else if (character === quote) quote = null;
      else if (character === ">" && quote === null) break;
    }
    if (tagEnd >= source.length) {
      result += source[index];
      continue;
    }
    const tag = source.slice(index + 1, tagEnd);
    const match = /^\s*(?<closing>\/)?\s*(?<name>[A-Za-z][A-Za-z0-9:-]*)/u.exec(tag);
    if (match === null) {
      result += source.slice(index, tagEnd + 1);
      index = tagEnd;
      continue;
    }
    const tagName = match.groups?.["name"]?.toLowerCase() ?? "";
    if (match.groups?.["closing"] === undefined && ["script", "style"].includes(tagName)) {
      const closeStart = source.toLowerCase().indexOf(`</${tagName}`, tagEnd + 1);
      if (closeStart < 0) return result.trim() || null;
      index = closeStart - 1;
      continue;
    }
    if (richTextBreakElements.has(tagName)) result += "\n";
    index = tagEnd;
  }
  const decoded = result.replaceAll(/&(?<entity>#(?:[0-9]+|x[0-9a-f]+)|[a-z]+);/giu, (...args) => {
    const groups = args.at(-1) as { entity?: string } | undefined;
    return groups?.entity === undefined ? String(args[0]) : decodeHtmlEntity(groups.entity);
  });
  const normalizedText = decoded
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll(/[^\S\n]+/gu, " ")
    .replaceAll(/ *\n */gu, "\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();
  return normalizedText.length > 0 ? normalizedText : null;
}

function finiteNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim().length > 0) {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function guid(input: unknown): string | null {
  const value = boundedText(input, 64);
  return value !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)
    ? value
    : null;
}

function digest(input: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(input).digest("hex")}`;
}

/** Admits the observed tenant borehole roster without retaining unknown provider fields. */
export function inspectRsLogLiveBoreholeCatalog(
  input: Uint8Array,
  expectedProjectId: string,
): RsLogLiveBoreholeCatalogResult {
  const parsed = decodeJson(input);
  if (parsed === null) return rejectedCatalog("RSLOG_LIVE_BOREHOLE_CATALOG_INPUT_INVALID");
  if (!Array.isArray(parsed)) {
    return rejectedCatalog("RSLOG_LIVE_BOREHOLE_CATALOG_SCHEMA_UNADMITTED");
  }
  if (parsed.length < 1 || parsed.length > maximumRsLogProjectBoreholes) {
    return rejectedCatalog("RSLOG_LIVE_BOREHOLE_CATALOG_CAPACITY_EXCEEDED");
  }
  const boreholes: RsLogLiveBoreholeCatalogEntry[] = [];
  for (const candidate of parsed) {
    const record = plainRecord(candidate);
    const id = guid(record?.["id"]);
    const projectId = guid(record?.["projectId"]);
    const name = boundedText(record?.["name"], 4_096);
    const depth = finiteNumber(record?.["depth"]);
    if (
      record === null ||
      id === null ||
      projectId === null ||
      projectId.toLowerCase() !== expectedProjectId.toLowerCase() ||
      name === null ||
      depth === null ||
      depth <= 0
    ) {
      return rejectedCatalog("RSLOG_LIVE_BOREHOLE_CATALOG_SCHEMA_UNADMITTED");
    }
    boreholes.push(
      Object.freeze({
        id,
        projectId,
        name,
        depth,
        elevation: finiteNumber(record["elevation"]),
        latitude: finiteNumber(record["lat"] ?? record["latitude"]),
        longitude: finiteNumber(record["long"] ?? record["longitude"]),
        easting: finiteNumber(record["easting"] ?? record["x"]),
        northing: finiteNumber(record["northing"] ?? record["y"]),
        startDate: nullableText(record["startDate"]),
        endDate: nullableText(record["endDate"]),
        loggedBy: nullableText(record["loggedBy"]),
        reviewedBy: nullableText(record["reviewedBy"]),
        contractorName: nullableText(record["drillingContractor"]),
        equipment: nullableText(record["equipment"]),
        holeDrillBitSize: nullableText(record["size"]),
        groundwaterDepth: finiteNumber(record["groundwaterLevel"] ?? record["depthToWater"]),
        groundwaterNotes: normalizeRsLogRichText(
          record["groundWaterNotes"] ?? record["terminationNotes"],
        ),
      }),
    );
  }
  if (new Set(boreholes.map(({ id }) => id.toLowerCase())).size !== boreholes.length) {
    return rejectedCatalog("RSLOG_LIVE_BOREHOLE_CATALOG_DUPLICATE_IDENTITY");
  }
  return Object.freeze({
    accepted: true,
    code: "RSLOG_LIVE_BOREHOLE_CATALOG_ACCEPTED",
    responseDigest: digest(input),
    boreholes: Object.freeze(boreholes),
  });
}

type Dataset = Readonly<{
  rows: readonly JsonRecord[];
  columnNames: ReadonlyMap<string, string>;
}>;

function normalized(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "");
}

function decodeDataset(input: unknown, path: string): Dataset | null {
  const record = plainRecord(input);
  if (record === null || !Array.isArray(record["columns"]) || !Array.isArray(record["rows"])) {
    return null;
  }
  if (
    record["columns"].length > 512 ||
    record["rows"].length > maximumRsLogBoreholeCollectionItems
  ) {
    return null;
  }
  const columnNames = new Map<string, string>();
  for (const [index, candidate] of record["columns"].entries()) {
    const column = plainRecord(candidate);
    const id = boundedText(column?.["id"], 512);
    const header = boundedText(column?.["header"], 2_048);
    const dataType = boundedText(column?.["dataType"], 128);
    if (column === null || id === null || header === null || dataType === null) return null;
    const idKey = normalized(id);
    if (idKey.length < 1) return null;
    if (!columnNames.has(idKey)) columnNames.set(idKey, id);
    const headerKey = normalized(header);
    if (headerKey.length > 0 && !columnNames.has(headerKey)) columnNames.set(headerKey, id);
    void index;
  }
  const rows: JsonRecord[] = [];
  for (const candidate of record["rows"]) {
    const row = plainRecord(candidate);
    if (row === null || Object.keys(row).length > 512) return null;
    for (const key of Object.keys(row)) {
      if (boundedText(key, 512) === null) return null;
    }
    rows.push(row);
  }
  void path;
  return Object.freeze({ rows: Object.freeze(rows), columnNames });
}

function decodeGroupedDataset(input: unknown, groupKey: string, path: string): Dataset | null {
  const record = plainRecord(input);
  const groups = record?.[groupKey];
  if (!Array.isArray(groups) || groups.length > 128) return null;
  const rows: JsonRecord[] = [];
  const columnNames = new Map<string, string>();
  for (const [index, candidate] of groups.entries()) {
    const decoded = decodeDataset(candidate, `${path}.${groupKey}[${String(index)}]`);
    if (decoded === null) return null;
    if (rows.length + decoded.rows.length > maximumRsLogBoreholeCollectionItems) return null;
    for (const row of decoded.rows) rows.push(row);
    for (const [key, sourceId] of decoded.columnNames) {
      if (!columnNames.has(key)) columnNames.set(key, sourceId);
    }
  }
  return Object.freeze({ rows: Object.freeze(rows), columnNames });
}

function value(dataset: Dataset | undefined, row: JsonRecord, aliases: readonly string[]): unknown {
  if (dataset === undefined) return undefined;
  for (const alias of aliases) {
    const sourceId = dataset.columnNames.get(normalized(alias));
    if (sourceId !== undefined && Object.hasOwn(row, sourceId)) return row[sourceId];
  }
  return undefined;
}

function textValue(dataset: Dataset | undefined, row: JsonRecord, aliases: readonly string[]) {
  return nullableText(value(dataset, row, aliases));
}

function numberValue(dataset: Dataset | undefined, row: JsonRecord, aliases: readonly string[]) {
  return finiteNumber(value(dataset, row, aliases));
}

function scalarTextValue(
  dataset: Dataset | undefined,
  row: JsonRecord,
  aliases: readonly string[],
): string | null {
  const candidate = value(dataset, row, aliases);
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? String(candidate)
    : nullableText(candidate);
}

function booleanValue(
  dataset: Dataset | undefined,
  row: JsonRecord,
  aliases: readonly string[],
): boolean | null {
  const candidate = value(dataset, row, aliases);
  if (typeof candidate === "boolean") return candidate;
  if (typeof candidate !== "string") return null;
  const normalizedCandidate = normalized(candidate);
  if (["true", "yes", "y", "ref", "refusal"].includes(normalizedCandidate)) return true;
  if (["false", "no", "n"].includes(normalizedCandidate)) return false;
  return null;
}

function structuredBlowCountNotation(dataset: Dataset, row: JsonRecord): string | null {
  const tokens: string[] = [];
  let encounteredGap = false;
  for (let index = 1; index <= 4; index += 1) {
    const blows = numberValue(dataset, row, [`N${String(index)}`, `blows${String(index)}`]);
    const penetration = numberValue(dataset, row, [
      `P${String(index)}`,
      `penetration${String(index)}`,
    ]);
    if (blows === null) {
      if (tokens.length > 0) encounteredGap = true;
      continue;
    }
    if (encounteredGap || !Number.isSafeInteger(blows) || blows < 0) return null;
    tokens.push(
      penetration === null || penetration === 6
        ? String(blows)
        : `${String(blows)}/${String(penetration)}"`,
    );
  }
  return tokens.length > 0 ? tokens.join("-") : null;
}

function rowIdentity(
  boreholeId: string,
  kind: string,
  dataset: Dataset,
  row: JsonRecord,
  index: number,
): string {
  return (
    textValue(dataset, row, ["id", `${kind}Id`, "recordId"]) ??
    `urn:rsrender:source:rslog-live:${boreholeId}:${kind}:${String(index + 1)}`
  );
}

function rowsFor(datasets: ReadonlyMap<string, Dataset>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const found = datasets.get(normalized(alias));
    if (found !== undefined) return found;
  }
  return undefined;
}

function parseRsGeo(
  response: RsLogLiveRsGeoResponse,
  expectedProjectId: string,
):
  | Readonly<{ accepted: true; datasets: ReadonlyMap<string, Dataset>; byteLength: number }>
  | Readonly<{
      accepted: false;
      code: Extract<RsLogLiveProjectDataIngressResult, { accepted: false }>["code"];
      diagnosticPath: string;
    }> {
  const root = plainRecord(decodeJson(response.body));
  if (root === null) {
    return Object.freeze({
      accepted: false,
      code: "RSLOG_LIVE_PROJECT_DATA_INPUT_INVALID",
      diagnosticPath: "rsgeoResponse",
    });
  }
  if (root["exportSchemaVersion"] !== 1) {
    return Object.freeze({
      accepted: false,
      code: "RSLOG_LIVE_PROJECT_DATA_VERSION_UNSUPPORTED",
      diagnosticPath: "rsgeoResponse.exportSchemaVersion",
    });
  }
  const project = plainRecord(root["project"]);
  const projectId = guid(project?.["id"]);
  if (projectId === null || projectId.toLowerCase() !== expectedProjectId.toLowerCase()) {
    return Object.freeze({
      accepted: false,
      code: "RSLOG_LIVE_PROJECT_DATA_PROJECT_MISMATCH",
      diagnosticPath: "rsgeoResponse.project.id",
    });
  }
  const sourceDatasets = plainRecord(root["datasets"]);
  if (sourceDatasets === null) {
    return Object.freeze({
      accepted: false,
      code: "RSLOG_LIVE_PROJECT_DATA_SCHEMA_UNADMITTED",
      diagnosticPath: "rsgeoResponse.datasets",
    });
  }
  const allowed = new Set([
    "collar",
    "samples",
    "drillruns",
    "stratigraphy",
    "boringdetails",
    "piezometers",
    "discontinuities",
    "labresults",
    "survey",
  ]);
  const datasets = new Map<string, Dataset>();
  for (const [name, candidate] of Object.entries(sourceDatasets)) {
    const key = normalized(name);
    if (!allowed.has(key)) {
      return Object.freeze({
        accepted: false,
        code: "RSLOG_LIVE_PROJECT_DATA_SCHEMA_UNADMITTED",
        diagnosticPath: `rsgeoResponse.datasets.${name}`,
      });
    }
    const dataset =
      key === "samples"
        ? (decodeDataset(candidate, `datasets.${name}`) ??
          decodeGroupedDataset(candidate, "bySampleType", `datasets.${name}`))
        : decodeDataset(candidate, `datasets.${name}`);
    if (dataset === null) {
      return Object.freeze({
        accepted: false,
        code: "RSLOG_LIVE_PROJECT_DATA_SCHEMA_UNADMITTED",
        diagnosticPath: `rsgeoResponse.datasets.${name}`,
      });
    }
    datasets.set(key, dataset);
  }
  return Object.freeze({ accepted: true, datasets, byteLength: response.body.byteLength });
}

function stratigraphyFrom(
  borehole: RsLogLiveBoreholeCatalogEntry,
  datasets: ReadonlyMap<string, Dataset>,
): readonly RsLogProjectDataStratigraphy[] {
  const dataset = rowsFor(datasets, ["stratigraphy"]);
  if (dataset === undefined) return Object.freeze([]);
  const result: RsLogProjectDataStratigraphy[] = [];
  for (const [index, row] of dataset.rows.entries()) {
    const fromDepth = numberValue(dataset, row, ["fromDepth", "depthFrom", "topDepth", "from"]);
    const toDepth = numberValue(dataset, row, ["toDepth", "depthTo", "bottomDepth", "to"]);
    if (
      fromDepth === null ||
      toDepth === null ||
      fromDepth < 0 ||
      toDepth <= fromDepth ||
      toDepth > borehole.depth
    ) {
      continue;
    }
    result.push(
      Object.freeze({
        identity: rowIdentity(borehole.id, "stratigraphy", dataset, row, index),
        fromDepth,
        toDepth,
        title: normalizeRsLogRichText(
          value(dataset, row, ["title", "layerTitle", "material", "lithology"]),
        ),
        description: normalizeRsLogRichText(
          value(dataset, row, [
            "description",
            "layerDescription",
            "materialDescription",
            "soilDescription",
          ]),
        ),
        soilSymbol: textValue(dataset, row, [
          "soilSymbol",
          "logSymbol",
          "uscs",
          "classification",
          "classificationCode",
        ]),
        foregroundColor: textValue(dataset, row, ["foreColor", "foregroundColor"]),
        backgroundColor: textValue(dataset, row, ["materialColor", "backColor", "backgroundColor"]),
      }),
    );
  }
  return Object.freeze(result);
}

function samplesFrom(
  borehole: RsLogLiveBoreholeCatalogEntry,
  datasets: ReadonlyMap<string, Dataset>,
): readonly RsLogProjectDataSample[] {
  const dataset = rowsFor(datasets, ["samples"]);
  if (dataset === undefined) return Object.freeze([]);
  const result: RsLogProjectDataSample[] = [];
  for (const [index, row] of dataset.rows.entries()) {
    const fromDepth = numberValue(dataset, row, ["fromDepth", "depthFrom", "topDepth", "depth"]);
    const toDepth = numberValue(dataset, row, ["toDepth", "depthTo", "bottomDepth", "to"]);
    if (
      fromDepth === null ||
      fromDepth < 0 ||
      fromDepth > borehole.depth ||
      (toDepth !== null && (toDepth <= fromDepth || toDepth > borehole.depth))
    ) {
      continue;
    }
    const explicitBlows = scalarTextValue(dataset, row, [
      "blowCounts",
      "blows",
      "reportingValue",
      "generatedValue",
    ]);
    result.push(
      Object.freeze({
        identity: rowIdentity(borehole.id, "sample", dataset, row, index),
        fromDepth,
        toDepth,
        number: textValue(dataset, row, ["number", "sampleNumber", "sampleNo"]),
        typeName: textValue(dataset, row, [
          "typeName",
          "sampleTypeTitle",
          "sampleType",
          "samplerType",
        ]),
        recoveryPercent: numberValue(dataset, row, [
          "recoveryPercent",
          "recovery",
          "sampleRecovery",
        ]),
        blowCounts: explicitBlows ?? structuredBlowCountNotation(dataset, row),
        nValue: numberValue(dataset, row, ["nValue", "N-Value", "sptNValue", "finalN"]),
        n60: numberValue(dataset, row, ["n60", "N60 Value", "sptN60"]),
        refusal: booleanValue(dataset, row, ["refusal", "isRefusal", "refused"]),
        moistureContent: numberValue(dataset, row, ["moistureContent", "waterContent"]),
        moistureW: numberValue(dataset, row, ["moistureW", "naturalMoisture"]),
        liquidLimit: numberValue(dataset, row, ["liquidLimit", "ll"]),
        plasticLimit: numberValue(dataset, row, ["plasticLimit", "pl"]),
        plasticIndex: numberValue(dataset, row, ["plasticIndex", "pi"]),
      }),
    );
  }
  return Object.freeze(result);
}

function commentsFrom(
  borehole: RsLogLiveBoreholeCatalogEntry,
  datasets: ReadonlyMap<string, Dataset>,
): readonly RsLogProjectDataComment[] {
  const dataset = rowsFor(datasets, ["boringDetails"]);
  if (dataset === undefined) return Object.freeze([]);
  const result: RsLogProjectDataComment[] = [];
  for (const [index, row] of dataset.rows.entries()) {
    const depth = numberValue(dataset, row, ["depth", "fromDepth", "depthFrom"]);
    const description = normalizeRsLogRichText(
      value(dataset, row, ["description", "notes", "comment", "remarks"]),
    );
    if (depth === null || depth < 0 || depth > borehole.depth || description === null) continue;
    result.push(
      Object.freeze({
        identity: rowIdentity(borehole.id, "comment", dataset, row, index),
        depth,
        description,
      }),
    );
  }
  return Object.freeze(result);
}

function methodsFrom(
  borehole: RsLogLiveBoreholeCatalogEntry,
  datasets: ReadonlyMap<string, Dataset>,
): readonly RsLogProjectDataBoringMethod[] {
  const dataset = rowsFor(datasets, ["boringDetails", "drillRuns"]);
  if (dataset === undefined) return Object.freeze([]);
  const result: RsLogProjectDataBoringMethod[] = [];
  for (const [index, row] of dataset.rows.entries()) {
    const fromDepth = numberValue(dataset, row, ["fromDepth", "depthFrom", "topDepth", "from"]);
    const toDepth = numberValue(dataset, row, ["toDepth", "depthTo", "bottomDepth", "to"]);
    if (
      fromDepth === null ||
      toDepth === null ||
      fromDepth < 0 ||
      toDepth <= fromDepth ||
      toDepth > borehole.depth
    ) {
      continue;
    }
    result.push(
      Object.freeze({
        identity: rowIdentity(borehole.id, "drill-run", dataset, row, index),
        fromDepth,
        toDepth,
        drillMethod: textValue(dataset, row, ["drillMethod", "method"]),
        drillRigModel: textValue(dataset, row, [
          "drillRigModel",
          "drillRig",
          "rigModel",
          "equipment",
        ]),
        holeDiameter: numberValue(dataset, row, ["holeDiameter", "diameter"]),
        date: textValue(dataset, row, ["date", "startDate"]),
        notes: normalizeRsLogRichText(value(dataset, row, ["notes", "description"])),
      }),
    );
  }
  return Object.freeze(result);
}

function collarValues(datasets: ReadonlyMap<string, Dataset>): Readonly<{
  depth: number | null;
  elevation: number | null;
  latitude: number | null;
  longitude: number | null;
  easting: number | null;
  northing: number | null;
}> {
  const dataset = rowsFor(datasets, ["collar"]);
  const row = dataset?.rows[0];
  return Object.freeze({
    depth: row === undefined ? null : numberValue(dataset, row, ["depth", "totalDepth"]),
    elevation: row === undefined ? null : numberValue(dataset, row, ["elevation", "rl"]),
    latitude: row === undefined ? null : numberValue(dataset, row, ["latitude", "lat"]),
    longitude: row === undefined ? null : numberValue(dataset, row, ["longitude", "long", "lon"]),
    easting: row === undefined ? null : numberValue(dataset, row, ["easting", "x"]),
    northing: row === undefined ? null : numberValue(dataset, row, ["northing", "y"]),
  });
}

/**
 * Maps selected, per-provider-GUID RSGeo responses into the renderer-facing source document.
 * Each response is scoped by the request GUID, so human `holeId` values are never used as identity.
 */
export function inspectRsLogLiveProjectData(
  input: Readonly<{
    project: RsLogProjectCatalogEntry;
    projectBody: Uint8Array;
    boreholes: readonly RsLogLiveBoreholeCatalogEntry[];
    rsgeoResponses: readonly RsLogLiveRsGeoResponse[];
  }>,
): RsLogLiveProjectDataIngressResult {
  const projectRecord = plainRecord(decodeJson(input.projectBody));
  if (projectRecord === null) {
    return rejectedProject("RSLOG_LIVE_PROJECT_DATA_INPUT_INVALID", "project");
  }
  const projectId = guid(projectRecord["id"]);
  if (projectId === null || projectId.toLowerCase() !== input.project.id.toLowerCase()) {
    return rejectedProject("RSLOG_LIVE_PROJECT_DATA_PROJECT_MISMATCH", "project.id");
  }
  if (
    input.boreholes.length < 1 ||
    input.boreholes.length > maximumRsLogProjectBoreholes ||
    input.rsgeoResponses.length !== input.boreholes.length
  ) {
    return rejectedProject("RSLOG_LIVE_PROJECT_DATA_CAPACITY_EXCEEDED", "boreholes");
  }
  const responseById = new Map(
    input.rsgeoResponses.map((response) => [response.boreholeId, response]),
  );
  if (responseById.size !== input.rsgeoResponses.length) {
    return rejectedProject("RSLOG_LIVE_PROJECT_DATA_BOREHOLE_MISMATCH", "rsgeoResponses");
  }
  const warnings = new Set<string>();
  const boreholes: RsLogProjectDataBorehole[] = [];
  let byteLength = input.projectBody.byteLength;
  const combined = createHash("sha256").update(input.projectBody);
  for (const borehole of input.boreholes) {
    const response = responseById.get(borehole.id);
    if (response === undefined) {
      return rejectedProject(
        "RSLOG_LIVE_PROJECT_DATA_BOREHOLE_MISMATCH",
        "rsgeoResponses.selectedExploration",
      );
    }
    const parsed = parseRsGeo(response, input.project.id);
    if (!parsed.accepted) return rejectedProject(parsed.code, parsed.diagnosticPath);
    byteLength += parsed.byteLength;
    combined.update(response.body);
    const collar = collarValues(parsed.datasets);
    const depth = collar.depth ?? borehole.depth;
    const elevation = collar.elevation ?? borehole.elevation;
    const sourceBorehole = Object.freeze({
      ...borehole,
      identity: borehole.id,
      depth,
      elevation,
      latitude: collar.latitude ?? borehole.latitude,
      longitude: collar.longitude ?? borehole.longitude,
      easting: collar.easting ?? borehole.easting,
      northing: collar.northing ?? borehole.northing,
      drillerName: null,
      stratigraphy: stratigraphyFrom({ ...borehole, depth }, parsed.datasets),
      samples: samplesFrom({ ...borehole, depth }, parsed.datasets),
      comments: commentsFrom({ ...borehole, depth }, parsed.datasets),
      boringMethods: methodsFrom({ ...borehole, depth }, parsed.datasets),
    });
    if (sourceBorehole.stratigraphy.length === 0) warnings.add("RSLOG_LIVE_STRATIGRAPHY_EMPTY");
    if (sourceBorehole.samples.length === 0) warnings.add("RSLOG_LIVE_SAMPLES_EMPTY");
    if (sourceBorehole.elevation === null) warnings.add("RSLOG_TOP_ELEVATION_PLACEHOLDER");
    boreholes.push(sourceBorehole);
  }
  const sourceDigest = `sha256:${combined.digest("hex")}` as const;
  return Object.freeze({
    accepted: true,
    code: "RSLOG_LIVE_PROJECT_DATA_ACCEPTED",
    warnings: Object.freeze([...warnings].sort()),
    value: Object.freeze({
      schemaVersion: "rslog.live-rsgeo.v1",
      sourceDigest,
      byteLength,
      project: Object.freeze({
        identity: input.project.id,
        title: boundedText(projectRecord["title"], 4_096) ?? input.project.title,
        number: nullableText(projectRecord["jobNo"]) ?? input.project.jobNumber,
        clientName: nullableText(projectRecord["clientName"]) ?? input.project.clientName,
        address: nullableText(projectRecord["siteLocation"]) ?? input.project.siteLocation,
        unitSystem: nullableText(projectRecord["unitSystemTitle"]) ?? "Source units",
        coordinateSystem:
          nullableText(projectRecord["coordinateSystemTitle"]) ?? "Source coordinate system",
      }),
      boreholes: Object.freeze(boreholes),
    }),
  });
}
