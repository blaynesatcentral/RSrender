import {
  canonicalizeJson,
  isSha256Digest,
  sha256Bytes,
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  type BoringLogLayoutJobInput,
  type Sha256Digest,
} from "@rsrender/contracts";
import {
  decodePhase1LogProjectAggregate,
  decodePresentationOverrideCollection,
  type Phase1LogProjectAggregate,
  type PresentationOverrideCollection,
} from "@rsrender/domain";

export const packageBoundary = "@rsrender/package-contract" as const;
export const logProjectPackageContractRevision = "bld-035-log-project-package-v1" as const;
export const multiBoringLogProjectPackageContractRevision =
  "bld-036-multi-boring-log-project-package-v2" as const;
export const logProjectManifestPath = "manifest.json" as const;
export const logProjectDocumentPath = "document/project.json" as const;
export const logProjectOverridesPath = "presentation/overrides.json" as const;
export const maximumLogProjectLogicalBytes = 16 * 1024 * 1024;

export type LogProjectPackageRejectionCode =
  | "LOG_PROJECT_PACKAGE_MALFORMED"
  | "LOG_PROJECT_PACKAGE_UNSUPPORTED_VERSION"
  | "LOG_PROJECT_PACKAGE_PART_SET_INVALID"
  | "LOG_PROJECT_PACKAGE_PART_TOO_LARGE"
  | "LOG_PROJECT_PACKAGE_DIGEST_MISMATCH"
  | "LOG_PROJECT_PACKAGE_DOCUMENT_INVALID"
  | "LOG_PROJECT_PACKAGE_IDENTITY_MISMATCH";

export interface LogProjectPackagePart {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export interface ValidatedLogProjectPackage {
  readonly documentIdentity: string;
  /** Compatibility view of the first Boring Log. */
  readonly layoutJob: BoringLogLayoutJobInput;
  readonly layoutJobs: readonly BoringLogLayoutJobInput[];
  readonly projectAggregate: Phase1LogProjectAggregate;
  readonly presentationOverrideCollections: readonly PresentationOverrideCollection[];
  readonly authoritativeDigest: Sha256Digest;
  readonly parts: readonly LogProjectPackagePart[];
}

export type LogProjectPackageResult =
  | { readonly accepted: true; readonly value: ValidatedLogProjectPackage }
  | { readonly accepted: false; readonly code: LogProjectPackageRejectionCode };

type PartDeclaration = Readonly<{
  path: string;
  role: "log-project" | "presentation-overrides";
  mediaType: "application/vnd.rsrender+json";
  byteLength: number;
  sha256: Sha256Digest;
  authoritative: true;
  schema: string;
}>;

type DataRecord = Readonly<Record<string, unknown>>;
const encoder = new TextEncoder();

function rejected(code: LogProjectPackageRejectionCode): LogProjectPackageResult {
  return Object.freeze({ accepted: false, code });
}

function exactRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== fields.length ||
    keys.some((key) => typeof key !== "string" || !fields.includes(key))
  )
    return null;
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    result[field] = descriptor.value;
  }
  return result;
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

function declaration(
  path: typeof logProjectDocumentPath | typeof logProjectOverridesPath,
  bytes: Uint8Array,
  projectSchema: "rsrender.log-project-authoring.v1" | "rsrender.log-project-authoring.v2",
): PartDeclaration {
  return Object.freeze({
    path,
    role: path === logProjectDocumentPath ? "log-project" : "presentation-overrides",
    mediaType: "application/vnd.rsrender+json",
    byteLength: bytes.byteLength,
    sha256: sha256Bytes(bytes),
    authoritative: true,
    schema:
      path === logProjectDocumentPath ? projectSchema : "rsrender.presentation-overrides-part.v1",
  });
}

function authoritativeDigest(documentIdentity: string, parts: readonly PartDeclaration[]) {
  return sha256CanonicalJson({
    format: "rsrender-constrained-zip",
    formatVersion: 1,
    documentKind: "log-project",
    documentIdentity,
    parts,
  });
}

export function createLogProjectPackageParts(input: unknown): LogProjectPackageResult {
  try {
    const singleRecord = exactRecord(input, [
      "layoutJob",
      "projectAggregate",
      "presentationOverrideCollections",
    ]);
    const multiRecord = exactRecord(input, [
      "layoutJobs",
      "projectAggregate",
      "presentationOverrideCollections",
    ]);
    const record = multiRecord ?? singleRecord;
    if (record === null || !Array.isArray(record["presentationOverrideCollections"])) {
      return rejected("LOG_PROJECT_PACKAGE_MALFORMED");
    }
    const inputLayoutJobs = multiRecord === null ? [record["layoutJob"]] : record["layoutJobs"];
    if (
      !Array.isArray(inputLayoutJobs) ||
      inputLayoutJobs.length < 1 ||
      inputLayoutJobs.length > 64
    ) {
      return rejected("LOG_PROJECT_PACKAGE_DOCUMENT_INVALID");
    }
    const layoutJobs: BoringLogLayoutJobInput[] = [];
    for (const inputLayoutJob of inputLayoutJobs) {
      const layoutJob = validateBoringLogLayoutJobInput(inputLayoutJob);
      if (!layoutJob.accepted) return rejected("LOG_PROJECT_PACKAGE_DOCUMENT_INVALID");
      layoutJobs.push(layoutJob.value);
    }
    const project = decodePhase1LogProjectAggregate(record["projectAggregate"]);
    const collections: PresentationOverrideCollection[] = [];
    for (const inputCollection of record["presentationOverrideCollections"]) {
      const collection = decodePresentationOverrideCollection(inputCollection);
      if (!collection.accepted) return rejected("LOG_PROJECT_PACKAGE_DOCUMENT_INVALID");
      collections.push(collection.value);
    }
    if (!project.accepted || collections.length > 1) {
      return rejected("LOG_PROJECT_PACKAGE_DOCUMENT_INVALID");
    }
    const multi = multiRecord !== null;
    const boringLogIdentities = layoutJobs.map(({ document }) => document.identity.boringLogId);
    const explorationIdentities = layoutJobs.map(({ document }) => document.identity.explorationId);
    if (
      new Set(boringLogIdentities).size !== layoutJobs.length ||
      new Set(explorationIdentities).size !== layoutJobs.length
    ) {
      return rejected("LOG_PROJECT_PACKAGE_IDENTITY_MISMATCH");
    }
    const documentIdentity = multi
      ? project.value.documentIdentity
      : layoutJobs[0]!.document.identity.boringLogId;
    const membershipExplorations = project.value.logSet.memberships.map(
      ({ sourceExplorationIdentity }) => sourceExplorationIdentity,
    );
    if (
      project.value.documentIdentity !== documentIdentity ||
      (multi &&
        (layoutJobs.length < 2 ||
          membershipExplorations.length !== explorationIdentities.length ||
          membershipExplorations.some(
            (identity, index) => identity !== explorationIdentities[index],
          )))
    ) {
      return rejected("LOG_PROJECT_PACKAGE_IDENTITY_MISMATCH");
    }
    const projectSchema = multi
      ? "rsrender.log-project-authoring.v2"
      : "rsrender.log-project-authoring.v1";
    const projectBytes = encoder.encode(
      canonicalizeJson(
        multi
          ? {
              schema: projectSchema,
              documentIdentity,
              layoutJobs,
              projectAggregate: project.value,
            }
          : {
              schema: projectSchema,
              documentIdentity,
              layoutJob: layoutJobs[0],
              projectAggregate: project.value,
            },
      ),
    );
    const overrideBytes = encoder.encode(
      canonicalizeJson({
        schema: "rsrender.presentation-overrides-part.v1",
        documentIdentity,
        collections,
      }),
    );
    const declarations = Object.freeze([
      declaration(logProjectDocumentPath, projectBytes, projectSchema),
      declaration(logProjectOverridesPath, overrideBytes, projectSchema),
    ]);
    const digest = authoritativeDigest(documentIdentity, declarations);
    const manifestBytes = encoder.encode(
      canonicalizeJson({
        schema: "rsrender.package-manifest.v1",
        format: "rsrender-constrained-zip",
        formatVersion: 1,
        documentKind: "log-project",
        documentIdentity,
        packageAuthoritativeDigest: digest,
        parts: declarations,
      }),
    );
    const parts = Object.freeze([
      Object.freeze({ path: logProjectManifestPath, bytes: manifestBytes }),
      Object.freeze({ path: logProjectDocumentPath, bytes: projectBytes }),
      Object.freeze({ path: logProjectOverridesPath, bytes: overrideBytes }),
    ]);
    if (
      parts.reduce((sum, part) => sum + part.bytes.byteLength, 0) > maximumLogProjectLogicalBytes
    ) {
      return rejected("LOG_PROJECT_PACKAGE_PART_TOO_LARGE");
    }
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        documentIdentity,
        layoutJob: layoutJobs[0]!,
        layoutJobs: Object.freeze(layoutJobs),
        projectAggregate: project.value,
        presentationOverrideCollections: Object.freeze(collections),
        authoritativeDigest: digest,
        parts,
      }),
    });
  } catch {
    return rejected("LOG_PROJECT_PACKAGE_MALFORMED");
  }
}

export function decodeLogProjectPackageParts(input: unknown): LogProjectPackageResult {
  try {
    if (!Array.isArray(input) || input.length !== 3) {
      return rejected("LOG_PROJECT_PACKAGE_PART_SET_INVALID");
    }
    const parts = new Map<string, Uint8Array>();
    let total = 0;
    for (const candidate of input) {
      const part = exactRecord(candidate, ["path", "bytes"]);
      if (
        part === null ||
        typeof part["path"] !== "string" ||
        !(part["bytes"] instanceof Uint8Array) ||
        parts.has(part["path"])
      ) {
        return rejected("LOG_PROJECT_PACKAGE_PART_SET_INVALID");
      }
      total += part["bytes"].byteLength;
      parts.set(part["path"], part["bytes"].slice());
    }
    const allowed: readonly string[] = [
      logProjectManifestPath,
      logProjectDocumentPath,
      logProjectOverridesPath,
    ];
    if (
      total > maximumLogProjectLogicalBytes ||
      [...parts.keys()].some((name) => !allowed.includes(name))
    ) {
      return rejected(
        total > maximumLogProjectLogicalBytes
          ? "LOG_PROJECT_PACKAGE_PART_TOO_LARGE"
          : "LOG_PROJECT_PACKAGE_PART_SET_INVALID",
      );
    }
    const manifestRecord = exactRecord(parseJson(parts.get(logProjectManifestPath)!), [
      "schema",
      "format",
      "formatVersion",
      "documentKind",
      "documentIdentity",
      "packageAuthoritativeDigest",
      "parts",
    ]);
    if (
      manifestRecord === null ||
      manifestRecord["schema"] !== "rsrender.package-manifest.v1" ||
      manifestRecord["format"] !== "rsrender-constrained-zip" ||
      manifestRecord["formatVersion"] !== 1 ||
      manifestRecord["documentKind"] !== "log-project" ||
      typeof manifestRecord["documentIdentity"] !== "string" ||
      !isSha256Digest(manifestRecord["packageAuthoritativeDigest"]) ||
      !Array.isArray(manifestRecord["parts"]) ||
      manifestRecord["parts"].length !== 2
    )
      return rejected("LOG_PROJECT_PACKAGE_UNSUPPORTED_VERSION");
    const declarations: PartDeclaration[] = [];
    let declaredProjectSchema:
      "rsrender.log-project-authoring.v1" | "rsrender.log-project-authoring.v2" | null = null;
    for (const candidate of manifestRecord["parts"]) {
      const item = exactRecord(candidate, [
        "path",
        "role",
        "mediaType",
        "byteLength",
        "sha256",
        "authoritative",
        "schema",
      ]);
      if (item === null || typeof item["path"] !== "string")
        return rejected("LOG_PROJECT_PACKAGE_MALFORMED");
      const bytes = parts.get(item["path"]);
      const expectedRole =
        item["path"] === logProjectDocumentPath
          ? "log-project"
          : item["path"] === logProjectOverridesPath
            ? "presentation-overrides"
            : null;
      const projectSchemaAccepted =
        item?.["schema"] === "rsrender.log-project-authoring.v1" ||
        item?.["schema"] === "rsrender.log-project-authoring.v2";
      const expectedSchema =
        expectedRole === "log-project"
          ? projectSchemaAccepted
            ? item?.["schema"]
            : null
          : "rsrender.presentation-overrides-part.v1";
      if (
        bytes === undefined ||
        expectedRole === null ||
        item["role"] !== expectedRole ||
        item["mediaType"] !== "application/vnd.rsrender+json" ||
        item["byteLength"] !== bytes.byteLength ||
        item["sha256"] !== sha256Bytes(bytes) ||
        item["authoritative"] !== true ||
        item["schema"] !== expectedSchema
      )
        return rejected("LOG_PROJECT_PACKAGE_DIGEST_MISMATCH");
      if (expectedRole === "log-project") {
        declaredProjectSchema = expectedSchema as
          "rsrender.log-project-authoring.v1" | "rsrender.log-project-authoring.v2";
      }
      declarations.push(candidate as PartDeclaration);
    }
    declarations.sort((left, right) => left.path.localeCompare(right.path, "en"));
    const documentIdentity = manifestRecord["documentIdentity"];
    if (
      authoritativeDigest(documentIdentity, declarations) !==
      manifestRecord["packageAuthoritativeDigest"]
    ) {
      return rejected("LOG_PROJECT_PACKAGE_DIGEST_MISMATCH");
    }
    const parsedProject = parseJson(parts.get(logProjectDocumentPath)!);
    const parsedProjectRecord =
      typeof parsedProject === "object" && parsedProject !== null && !Array.isArray(parsedProject)
        ? (parsedProject as Record<string, unknown>)
        : null;
    const parsedProjectSchema =
      parsedProjectRecord === null ? null : (parsedProjectRecord["schema"] ?? null);
    if (declaredProjectSchema === null || parsedProjectSchema !== declaredProjectSchema) {
      return rejected("LOG_PROJECT_PACKAGE_DOCUMENT_INVALID");
    }
    const projectPart = exactRecord(
      parsedProject,
      parsedProjectSchema === "rsrender.log-project-authoring.v1"
        ? ["schema", "documentIdentity", "layoutJob", "projectAggregate"]
        : ["schema", "documentIdentity", "layoutJobs", "projectAggregate"],
    );
    const overridesPart = exactRecord(parseJson(parts.get(logProjectOverridesPath)!), [
      "schema",
      "documentIdentity",
      "collections",
    ]);
    if (
      projectPart === null ||
      overridesPart === null ||
      projectPart["schema"] !== parsedProjectSchema ||
      overridesPart["schema"] !== "rsrender.presentation-overrides-part.v1" ||
      projectPart["documentIdentity"] !== documentIdentity ||
      overridesPart["documentIdentity"] !== documentIdentity
    )
      return rejected("LOG_PROJECT_PACKAGE_IDENTITY_MISMATCH");
    const rebuilt = createLogProjectPackageParts({
      ...(parsedProjectSchema === "rsrender.log-project-authoring.v1"
        ? { layoutJob: projectPart["layoutJob"] }
        : { layoutJobs: projectPart["layoutJobs"] }),
      projectAggregate: projectPart["projectAggregate"],
      presentationOverrideCollections: overridesPart["collections"],
    });
    if (
      !rebuilt.accepted ||
      rebuilt.value.authoritativeDigest !== manifestRecord["packageAuthoritativeDigest"]
    ) {
      return rejected("LOG_PROJECT_PACKAGE_DOCUMENT_INVALID");
    }
    return rebuilt;
  } catch {
    return rejected("LOG_PROJECT_PACKAGE_MALFORMED");
  }
}
