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
  return input === null ? null : (boundedText(input, maximumBytes) ?? undefined);
}

function guid(input: unknown): string | null {
  const value = boundedText(input, 64);
  return value !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)
    ? value
    : null;
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
    const id = guid(record?.["id"]);
    const title = boundedText(record?.["title"], 4_096);
    const jobNumber = nullableText(record?.["jobNo"], 2_048);
    const clientName = nullableText(record?.["clientName"], 4_096);
    const siteLocation = nullableText(record?.["siteLocation"], 8_192);
    const boreholeCount = record?.["boreholeCount"];
    const isActive = record?.["isActive"];
    const isExample = record?.["isExample"];
    if (
      record === null ||
      id === null ||
      title === null ||
      jobNumber === undefined ||
      clientName === undefined ||
      siteLocation === undefined ||
      !Number.isSafeInteger(boreholeCount) ||
      (boreholeCount as number) < 0 ||
      typeof isActive !== "boolean" ||
      typeof isExample !== "boolean"
    ) {
      return rejected("RSLOG_PROJECT_CATALOG_SCHEMA_UNADMITTED");
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
