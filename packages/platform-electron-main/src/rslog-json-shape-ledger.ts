import { createHash } from "node:crypto";

export const rsLogJsonShapeLedgerRevision = "bld-051-json-shape-ledger-v1" as const;
export const maximumRsLogJsonShapePaths = 4_096 as const;
export const maximumRsLogJsonShapeNodes = 250_000 as const;
export const maximumRsLogJsonShapeDepth = 12 as const;

export type RsLogJsonValueKind = "null" | "boolean" | "number" | "string" | "array" | "object";

export type RsLogJsonShapeObservation = Readonly<{
  path: string;
  kinds: readonly RsLogJsonValueKind[];
  observations: number;
  nulls: number;
  minimumArrayLength: number | null;
  maximumArrayLength: number | null;
}>;

export type RsLogJsonShapeLedger = Readonly<{
  schema: "rsrender.rslog-json-shape-ledger.v1";
  admitted: false;
  byteLength: number;
  sourceDigest: `sha256:${string}`;
  shapeDigest: `sha256:${string}`;
  rootKind: RsLogJsonValueKind;
  nodeCount: number;
  paths: readonly RsLogJsonShapeObservation[];
}>;

export type RsLogJsonShapeLedgerResult =
  | Readonly<{ inspected: true; ledger: RsLogJsonShapeLedger }>
  | Readonly<{
      inspected: false;
      code:
        | "RSLOG_SCHEMA_LEDGER_INPUT_INVALID"
        | "RSLOG_SCHEMA_LEDGER_UTF8_INVALID"
        | "RSLOG_SCHEMA_LEDGER_JSON_INVALID"
        | "RSLOG_SCHEMA_LEDGER_LIMIT_EXCEEDED";
    }>;

type MutableObservation = {
  kinds: Set<RsLogJsonValueKind>;
  observations: number;
  nulls: number;
  minimumArrayLength: number | null;
  maximumArrayLength: number | null;
};

class LedgerLimitFailure extends Error {}

function kindOf(value: unknown): RsLogJsonValueKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  throw new LedgerLimitFailure();
}

function pointerSegment(input: string): string {
  return input.replaceAll("~", "~0").replaceAll("/", "~1");
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function inspectRsLogJsonShape(input: unknown): RsLogJsonShapeLedgerResult {
  if (!(input instanceof Uint8Array) || input.byteLength < 1) {
    return Object.freeze({ inspected: false, code: "RSLOG_SCHEMA_LEDGER_INPUT_INVALID" });
  }
  const bytes = new Uint8Array(input);
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return Object.freeze({ inspected: false, code: "RSLOG_SCHEMA_LEDGER_UTF8_INVALID" });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    return Object.freeze({ inspected: false, code: "RSLOG_SCHEMA_LEDGER_JSON_INVALID" });
  }
  const observations = new Map<string, MutableObservation>();
  let nodeCount = 0;
  const visit = (value: unknown, path: string, depth: number): void => {
    nodeCount += 1;
    if (
      nodeCount > maximumRsLogJsonShapeNodes ||
      depth > maximumRsLogJsonShapeDepth ||
      (!observations.has(path) && observations.size >= maximumRsLogJsonShapePaths)
    ) {
      throw new LedgerLimitFailure();
    }
    const kind = kindOf(value);
    const observation = observations.get(path) ?? {
      kinds: new Set<RsLogJsonValueKind>(),
      observations: 0,
      nulls: 0,
      minimumArrayLength: null,
      maximumArrayLength: null,
    };
    observation.kinds.add(kind);
    observation.observations += 1;
    if (kind === "null") observation.nulls += 1;
    if (kind === "array") {
      const length = (value as unknown[]).length;
      observation.minimumArrayLength =
        observation.minimumArrayLength === null
          ? length
          : Math.min(observation.minimumArrayLength, length);
      observation.maximumArrayLength =
        observation.maximumArrayLength === null
          ? length
          : Math.max(observation.maximumArrayLength, length);
    }
    observations.set(path, observation);
    if (Array.isArray(value)) {
      for (const item of value) visit(item, `${path}/[]`, depth + 1);
      return;
    }
    if (kind === "object") {
      const record = value as Record<string, unknown>;
      const prototype = Object.getPrototypeOf(record) as unknown;
      if (prototype !== Object.prototype && prototype !== null) throw new LedgerLimitFailure();
      for (const key of Object.keys(record).sort(compareCodeUnits)) {
        const descriptor = Object.getOwnPropertyDescriptor(record, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new LedgerLimitFailure();
        }
        visit(descriptor.value, `${path}/${pointerSegment(key)}`, depth + 1);
      }
    }
  };
  try {
    visit(parsed, "", 0);
  } catch {
    return Object.freeze({ inspected: false, code: "RSLOG_SCHEMA_LEDGER_LIMIT_EXCEEDED" });
  }
  const paths = Object.freeze(
    [...observations.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([path, observation]) =>
        Object.freeze({
          path,
          kinds: Object.freeze([...observation.kinds].sort(compareCodeUnits)),
          observations: observation.observations,
          nulls: observation.nulls,
          minimumArrayLength: observation.minimumArrayLength,
          maximumArrayLength: observation.maximumArrayLength,
        }),
      ),
  );
  const sourceDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}` as const;
  const shapeBasis = JSON.stringify({
    schema: "rsrender.rslog-json-shape-ledger.v1",
    rootKind: kindOf(parsed),
    nodeCount,
    paths,
  });
  return Object.freeze({
    inspected: true,
    ledger: Object.freeze({
      schema: "rsrender.rslog-json-shape-ledger.v1",
      admitted: false,
      byteLength: bytes.byteLength,
      sourceDigest,
      shapeDigest: `sha256:${createHash("sha256").update(shapeBasis, "utf8").digest("hex")}`,
      rootKind: kindOf(parsed),
      nodeCount,
      paths,
    }),
  });
}
