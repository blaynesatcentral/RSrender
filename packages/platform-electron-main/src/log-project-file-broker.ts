import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  fsyncSync,
} from "node:fs";
import path from "node:path";

import {
  createLogProjectPackageParts,
  type ValidatedLogProjectPackage,
} from "@rsrender/package-contract";
import {
  readLogProjectZip,
  writeLogProjectZip,
  maximumLogProjectZipBytes,
} from "@rsrender/platform-zipjs";

export const logProjectFileBrokerRevision = "bld-035-verified-file-broker-v1" as const;

export interface LogProjectFileBaseline {
  readonly size: number;
  readonly mtimeMs: number;
  readonly birthtimeMs: number;
}

export interface OpenedLogProjectFile {
  readonly project: ValidatedLogProjectPackage;
  readonly displayPath: string;
  readonly authoritativePath: string | null;
  readonly baseline: LogProjectFileBaseline | null;
  readonly readOnly: boolean;
  readonly storageStatus: "supported-local-fixed-ntfs" | "unsupported-read-only";
}

export type LogProjectFileResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | {
      readonly accepted: false;
      readonly code:
        | "PROJECT_PATH_INVALID"
        | "PROJECT_STORAGE_UNSUPPORTED"
        | "PROJECT_FILE_UNAVAILABLE"
        | "PROJECT_FILE_TOO_LARGE"
        | "PROJECT_PACKAGE_INVALID"
        | "PROJECT_EXTERNAL_CONFLICT"
        | "PROJECT_SAVE_BUSY"
        | "PROJECT_SAVE_PRE_REPLACEMENT_FAILED"
        | "PROJECT_SAVE_POST_REPLACEMENT_UNCERTAIN";
    };

function rejected<Value>(
  code: Exclude<LogProjectFileResult<Value>, { accepted: true }>["code"],
): LogProjectFileResult<Value> {
  return Object.freeze({ accepted: false, code });
}

function boundedRead(filePath: string): Uint8Array | null {
  const descriptor = openSync(filePath, "r");
  try {
    const details = fstatSync(descriptor);
    if (!details.isFile() || details.size < 1 || details.size > maximumLogProjectZipBytes)
      return null;
    const bytes = new Uint8Array(details.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = readSync(descriptor, bytes, offset, bytes.byteLength - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    return offset === bytes.byteLength ? bytes : null;
  } finally {
    closeSync(descriptor);
  }
}

function baseline(filePath: string): LogProjectFileBaseline | null {
  if (!existsSync(filePath)) return null;
  const details = statSync(filePath);
  return Object.freeze({
    size: details.size,
    mtimeMs: details.mtimeMs,
    birthtimeMs: details.birthtimeMs,
  });
}

export function captureLogProjectFileBaseline(inputPath: string): LogProjectFileBaseline | null {
  const target = validatedTarget(inputPath);
  return target === null ? null : baseline(target);
}

function sameBaseline(
  left: LogProjectFileBaseline | null,
  right: LogProjectFileBaseline | null,
): boolean {
  return left === null
    ? right === null
    : right !== null &&
        left.size === right.size &&
        left.mtimeMs === right.mtimeMs &&
        left.birthtimeMs === right.birthtimeMs;
}

function validatedTarget(input: string): string | null {
  const hasControlCharacter = [...input].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || code === 127;
  });
  if (
    typeof input !== "string" ||
    input.length < 4 ||
    input.length > 1024 ||
    hasControlCharacter ||
    !path.isAbsolute(input) ||
    !/^[a-z]:\\/iu.test(input) ||
    path.extname(input).toLowerCase() !== ".rsrender"
  )
    return null;
  const resolved = path.resolve(input);
  const parent = path.dirname(resolved);
  if (!existsSync(parent)) return null;
  const realParent = realpathSync.native(parent);
  if (path.parse(realParent).root.toLowerCase() !== path.parse(resolved).root.toLowerCase())
    return null;
  let cursor = realParent;
  for (;;) {
    if (lstatSync(cursor).isSymbolicLink()) return null;
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  if (existsSync(resolved) && lstatSync(resolved).isSymbolicLink()) return null;
  return resolved;
}

function supportedStorage(filePath: string): boolean {
  const drive = path.parse(filePath).root.slice(0, 1).toUpperCase();
  if (!/^[A-Z]$/u.test(drive)) return false;
  try {
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-Volume -DriveLetter '${drive}' | Select-Object DriveType,FileSystemType | ConvertTo-Json -Compress`,
      ],
      { encoding: "utf8", timeout: 10_000, windowsHide: true, maxBuffer: 16_384 },
    );
    const value = JSON.parse(output) as { DriveType?: unknown; FileSystemType?: unknown };
    return value.DriveType === "Fixed" && value.FileSystemType === "NTFS";
  } catch {
    return false;
  }
}

export async function openLogProjectFile(
  inputPath: string,
): Promise<LogProjectFileResult<OpenedLogProjectFile>> {
  let target: string | null;
  try {
    target = validatedTarget(inputPath);
  } catch {
    target = null;
  }
  if (target === null || !existsSync(target)) return rejected("PROJECT_PATH_INVALID");
  let bytes: Uint8Array | null;
  try {
    bytes = boundedRead(target);
  } catch {
    return rejected("PROJECT_FILE_UNAVAILABLE");
  }
  if (bytes === null) return rejected("PROJECT_FILE_TOO_LARGE");
  const decoded = await readLogProjectZip(bytes);
  bytes.fill(0);
  if (!decoded.accepted || !("value" in decoded)) return rejected("PROJECT_PACKAGE_INVALID");
  const supported = supportedStorage(target);
  return Object.freeze({
    accepted: true,
    value: Object.freeze({
      project: decoded.value,
      displayPath: target,
      authoritativePath: supported ? target : null,
      baseline: supported ? baseline(target) : null,
      readOnly: !supported,
      storageStatus: supported ? "supported-local-fixed-ntfs" : "unsupported-read-only",
    }),
  });
}

export async function saveLogProjectFile(input: {
  readonly targetPath: string;
  readonly expectedBaseline: LogProjectFileBaseline | null;
  readonly replaceExisting: boolean;
  readonly layoutJob: unknown;
  readonly projectAggregate: unknown;
  readonly presentationOverrideCollections: unknown;
}): Promise<
  LogProjectFileResult<{
    readonly baseline: LogProjectFileBaseline;
    readonly authoritativeDigest: string;
  }>
> {
  let target: string | null;
  try {
    target = validatedTarget(input.targetPath);
  } catch {
    target = null;
  }
  if (target === null) return rejected("PROJECT_PATH_INVALID");
  if (!supportedStorage(target)) return rejected("PROJECT_STORAGE_UNSUPPORTED");
  const logical = createLogProjectPackageParts({
    layoutJob: input.layoutJob,
    projectAggregate: input.projectAggregate,
    presentationOverrideCollections: input.presentationOverrideCollections,
  });
  if (!logical.accepted) return rejected("PROJECT_PACKAGE_INVALID");
  const encoded = await writeLogProjectZip(logical.value.parts);
  if (!encoded.accepted) return rejected("PROJECT_PACKAGE_INVALID");
  const suffix = randomBytes(16).toString("hex");
  const targetDigest = createHash("sha256")
    .update(target.toLowerCase(), "utf8")
    .digest("hex")
    .slice(0, 24);
  const lockPath = path.join(path.dirname(target), `.rsrender-${targetDigest}.save.lock`);
  const candidatePath = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${suffix}.candidate`,
  );
  const backupPath = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${suffix}.previous`,
  );
  let lockDescriptor: number | null = null;
  let candidateExists = false;
  let backupExists = false;
  try {
    try {
      lockDescriptor = openSync(lockPath, "wx", 0o600);
    } catch {
      return rejected("PROJECT_SAVE_BUSY");
    }
    const current = baseline(target);
    if (
      !sameBaseline(input.expectedBaseline, current) ||
      (!input.replaceExisting && current !== null)
    ) {
      return rejected("PROJECT_EXTERNAL_CONFLICT");
    }
    const candidateDescriptor = openSync(candidatePath, "wx", 0o600);
    candidateExists = true;
    try {
      writeFileSync(candidateDescriptor, encoded.bytes);
      fsyncSync(candidateDescriptor);
    } finally {
      closeSync(candidateDescriptor);
    }
    const candidateDecoded = await readLogProjectZip(boundedRead(candidatePath)!);
    if (
      !candidateDecoded.accepted ||
      !("value" in candidateDecoded) ||
      candidateDecoded.value.authoritativeDigest !== logical.value.authoritativeDigest
    ) {
      return rejected("PROJECT_SAVE_PRE_REPLACEMENT_FAILED");
    }
    if (current !== null) {
      renameSync(target, backupPath);
      backupExists = true;
    }
    try {
      renameSync(candidatePath, target);
      candidateExists = false;
    } catch {
      if (backupExists) {
        renameSync(backupPath, target);
        backupExists = false;
      }
      return rejected("PROJECT_SAVE_PRE_REPLACEMENT_FAILED");
    }
    const committedBytes = boundedRead(target);
    const committed = committedBytes === null ? null : await readLogProjectZip(committedBytes);
    if (
      !committed?.accepted ||
      !("value" in committed) ||
      committed.value.authoritativeDigest !== logical.value.authoritativeDigest
    ) {
      return rejected("PROJECT_SAVE_POST_REPLACEMENT_UNCERTAIN");
    }
    if (backupExists) {
      unlinkSync(backupPath);
      backupExists = false;
    }
    const verifiedBaseline = baseline(target);
    if (verifiedBaseline === null) return rejected("PROJECT_SAVE_POST_REPLACEMENT_UNCERTAIN");
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        baseline: verifiedBaseline,
        authoritativeDigest: logical.value.authoritativeDigest,
      }),
    });
  } catch {
    return rejected("PROJECT_SAVE_PRE_REPLACEMENT_FAILED");
  } finally {
    encoded.bytes.fill(0);
    if (candidateExists && existsSync(candidatePath)) {
      try {
        unlinkSync(candidatePath);
      } catch {
        /* retained by OS failure */
      }
    }
    if (lockDescriptor !== null) {
      try {
        closeSync(lockDescriptor);
      } catch {
        /* already closed */
      }
    }
    if (existsSync(lockPath)) {
      try {
        unlinkSync(lockPath);
      } catch {
        /* stale lock remains visible */
      }
    }
    if (backupExists && existsSync(backupPath) && !existsSync(target)) {
      try {
        renameSync(backupPath, target);
      } catch {
        /* uncertain outcome */
      }
    }
  }
}
