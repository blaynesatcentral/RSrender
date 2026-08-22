import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";

import {
  decodeLogProjectPackageParts,
  maximumLogProjectLogicalBytes,
  type LogProjectPackagePart,
  type LogProjectPackageResult,
} from "@rsrender/package-contract";

export const packageBoundary = "@rsrender/platform-zipjs" as const;
export const logProjectZipAdapterRevision = "bld-035-zip-adapter-v1" as const;
export const maximumLogProjectZipBytes = 16 * 1024 * 1024;
const fixedTimestamp = new Date("2000-01-01T00:00:00.000Z");

export type LogProjectZipResult =
  | { readonly accepted: true; readonly bytes: Uint8Array }
  | {
      readonly accepted: false;
      readonly code:
        | "LOG_PROJECT_ZIP_INPUT_INVALID"
        | "LOG_PROJECT_ZIP_TOO_LARGE"
        | "LOG_PROJECT_ZIP_PHYSICAL_INVALID"
        | "LOG_PROJECT_ZIP_LOGICAL_INVALID";
    };

function zipRejected(
  code: Exclude<LogProjectZipResult, { accepted: true }>["code"],
): LogProjectZipResult {
  return Object.freeze({ accepted: false, code });
}

export async function writeLogProjectZip(parts: unknown): Promise<LogProjectZipResult> {
  if (!Array.isArray(parts) || parts.length !== 3)
    return zipRejected("LOG_PROJECT_ZIP_INPUT_INVALID");
  let logicalBytes = 0;
  for (const candidate of parts as readonly LogProjectPackagePart[]) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      typeof candidate.path !== "string" ||
      !(candidate.bytes instanceof Uint8Array)
    )
      return zipRejected("LOG_PROJECT_ZIP_INPUT_INVALID");
    logicalBytes += candidate.bytes.byteLength;
  }
  if (logicalBytes > maximumLogProjectLogicalBytes) return zipRejected("LOG_PROJECT_ZIP_TOO_LARGE");
  try {
    const sink = new Uint8ArrayWriter();
    const writer = new ZipWriter(sink, { useWebWorkers: false });
    for (const part of parts as readonly LogProjectPackagePart[]) {
      await writer.add(part.path, new Uint8ArrayReader(part.bytes), {
        level: 0,
        lastModDate: fixedTimestamp,
        useWebWorkers: false,
      });
    }
    const bytes = await writer.close();
    if (bytes.byteLength > maximumLogProjectZipBytes)
      return zipRejected("LOG_PROJECT_ZIP_TOO_LARGE");
    return Object.freeze({ accepted: true, bytes: bytes.slice() });
  } catch {
    return zipRejected("LOG_PROJECT_ZIP_PHYSICAL_INVALID");
  }
}

export async function readLogProjectZip(
  input: unknown,
): Promise<LogProjectPackageResult | LogProjectZipResult> {
  if (!(input instanceof Uint8Array)) return zipRejected("LOG_PROJECT_ZIP_INPUT_INVALID");
  if (input.byteLength === 0 || input.byteLength > maximumLogProjectZipBytes) {
    return zipRejected("LOG_PROJECT_ZIP_TOO_LARGE");
  }
  const reader = new ZipReader(new Uint8ArrayReader(input.slice()), {
    useWebWorkers: false,
    checkSignature: true,
  });
  try {
    const entries = await reader.getEntries();
    if (entries.length !== 3) return zipRejected("LOG_PROJECT_ZIP_PHYSICAL_INVALID");
    const names = new Set<string>();
    const parts: LogProjectPackagePart[] = [];
    let total = 0;
    for (const entry of entries) {
      if (
        entry.directory ||
        entry.encrypted ||
        entry.executable ||
        entry.zip64 ||
        !entry.filenameUTF8 ||
        names.has(entry.filename) ||
        (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) ||
        entry.uncompressedSize < 1 ||
        entry.uncompressedSize > maximumLogProjectLogicalBytes ||
        entry.compressedSize < 1
      )
        return zipRejected("LOG_PROJECT_ZIP_PHYSICAL_INVALID");
      names.add(entry.filename);
      total += entry.uncompressedSize;
      if (total > maximumLogProjectLogicalBytes) return zipRejected("LOG_PROJECT_ZIP_TOO_LARGE");
      const bytes = await entry.getData(new Uint8ArrayWriter(), {
        useWebWorkers: false,
        checkSignature: true,
      });
      if (bytes.byteLength !== entry.uncompressedSize)
        return zipRejected("LOG_PROJECT_ZIP_PHYSICAL_INVALID");
      parts.push(Object.freeze({ path: entry.filename, bytes }));
    }
    const logical = decodeLogProjectPackageParts(parts);
    return logical.accepted ? logical : zipRejected("LOG_PROJECT_ZIP_LOGICAL_INVALID");
  } catch {
    return zipRejected("LOG_PROJECT_ZIP_PHYSICAL_INVALID");
  } finally {
    await reader.close().catch(() => undefined);
  }
}
