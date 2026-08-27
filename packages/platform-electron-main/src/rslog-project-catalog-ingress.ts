import { createHash } from "node:crypto";

export const rsLogProjectCatalogIngressRevision =
  "bld-051-rslog-project-catalog-ingress-v1" as const;
export const maximumRsLogProjectCatalogBytes = 16_777_216 as const;
export const maximumRsLogProjectCatalogEntries = 256 as const;

export type RsLogProjectCatalogEntry = Readonly<{
  id: string;
  title: string;
  jobNumber: string | null;
  clientName: string | null;
  siteLocation: string | null;
  boreholeCount: number;
  isActive: boolean;
  isExample: boolean;
}>;

export type RsLogProjectCatalogIngressResult =
  | Readonly<{
      accepted: true;
      code: "RSLOG_PROJECT_CATALOG_ACCEPTED";
      responseDigest: `sha256:${string}`;
      projects: readonly RsLogProjectCatalogEntry[];
    }>
  | Readonly<{
      accepted: false;
      code:
        | "RSLOG_PROJECT_CATALOG_INPUT_INVALID"
        | "RSLOG_PROJECT_CATALOG_SCHEMA_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_ENTRY_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_IDENTITY_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_TITLE_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_OPTIONAL_TEXT_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_BOREHOLE_COUNT_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_FLAGS_UNADMITTED"
        | "RSLOG_PROJECT_CATALOG_CAPACITY_EXCEEDED"
        | "RSLOG_PROJECT_CATALOG_DUPLICATE_IDENTITY";
    }>;

function plainRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
  }
  return input as Record<string, unknown>;
}

function boundedText(input: unknown, maximumBytes: number): string | null {
  if (typeof input !== "string" || input.length < 1) return null;
  if (new TextEncoder().encode(input).byteLength > maximumBytes) return null;
  for (const character of input) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || codePoint === 127) return null;
  }
  return input;
}

function nullableText(input: unknown, maximumBytes: number): string | null | undefined {
  if (input === null || input === "") return null;
  if (typeof input !== "string") return undefined;
  const normalized = input.replace(/[^\S ]+/gu, " ").trim();
  return normalized.length === 0 ? null : (boundedText(normalized, maximumBytes) ?? undefined);
}

function opaqueIdentity(input: unknown): string | null {
  const value = boundedText(input, 512);
  return value !== null && value.trim().length > 0 ? value : null;
}

function catalogTitle(input: unknown): string | null {
  if (input === "" || (typeof input === "string" && input.trim().length === 0)) {
    return "Untitled RSLog project";
  }
  return boundedText(input, 4_096);
}

function rejected(code: Extract<RsLogProjectCatalogIngressResult, { accepted: false }>["code"]) {
  return Object.freeze({ accepted: false as const, code });
}

export function inspectRsLogProjectCatalog(input: Uint8Array): RsLogProjectCatalogIngressResult {
  if (!(input instanceof Uint8Array) || input.byteLength < 1) {
    return rejected("RSLOG_PROJECT_CATALOG_INPUT_INVALID");
  }
  if (input.byteLength > maximumRsLogProjectCatalogBytes) {
    return rejected("RSLOG_PROJECT_CATALOG_CAPACITY_EXCEEDED");
  }
  const responseDigest = `sha256:${createHash("sha256").update(input).digest("hex")}` as const;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input)) as unknown;
  } catch {
    return rejected("RSLOG_PROJECT_CATALOG_INPUT_INVALID");
  }
  if (!Array.isArray(parsed)) return rejected("RSLOG_PROJECT_CATALOG_SCHEMA_UNADMITTED");
  if (parsed.length < 1 || parsed.length > maximumRsLogProjectCatalogEntries) {
    return rejected("RSLOG_PROJECT_CATALOG_CAPACITY_EXCEEDED");
  }
  const projects: RsLogProjectCatalogEntry[] = [];
  for (const candidate of parsed) {
    const record = plainRecord(candidate);
    if (record === null) return rejected("RSLOG_PROJECT_CATALOG_ENTRY_UNADMITTED");
    const id = opaqueIdentity(record["id"]);
    if (id === null) return rejected("RSLOG_PROJECT_CATALOG_IDENTITY_UNADMITTED");
    const title = catalogTitle(record["title"]);
    if (title === null) return rejected("RSLOG_PROJECT_CATALOG_TITLE_UNADMITTED");
    const jobNumber = nullableText(record?.["jobNo"], 2_048);
    const clientName = nullableText(record?.["clientName"], 4_096);
    const siteLocation = nullableText(record?.["siteLocation"], 8_192);
    if (jobNumber === undefined || clientName === undefined || siteLocation === undefined) {
      return rejected("RSLOG_PROJECT_CATALOG_OPTIONAL_TEXT_UNADMITTED");
    }
    const boreholeCount = record?.["boreholeCount"];
    const isActive = record?.["isActive"];
    const isExample = record?.["isExample"];
    if (!Number.isSafeInteger(boreholeCount) || (boreholeCount as number) < 0) {
      return rejected("RSLOG_PROJECT_CATALOG_BOREHOLE_COUNT_UNADMITTED");
    }
    if (typeof isActive !== "boolean" || typeof isExample !== "boolean") {
      return rejected("RSLOG_PROJECT_CATALOG_FLAGS_UNADMITTED");
    }
    projects.push(
      Object.freeze({
        id,
        title,
        jobNumber,
        clientName,
        siteLocation,
        boreholeCount: boreholeCount as number,
        isActive,
        isExample,
      }),
    );
  }
  if (new Set(projects.map(({ id }) => id)).size !== projects.length) {
    return rejected("RSLOG_PROJECT_CATALOG_DUPLICATE_IDENTITY");
  }
  return Object.freeze({
    accepted: true,
    code: "RSLOG_PROJECT_CATALOG_ACCEPTED",
    responseDigest,
    projects: Object.freeze(projects),
  });
}
