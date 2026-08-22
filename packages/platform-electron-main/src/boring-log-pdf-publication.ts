import { createHash, randomBytes } from "node:crypto";
import { link, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

import type { ResolvedBoringLogPageScene } from "@rsrender/contracts";
import {
  projectBoringLogSceneForPublication,
  type BoringLogPublicationProjection,
} from "@rsrender/layout-host";

import type { BoringLogPublicationOutcome } from "./boring-log-publication-route-contract.js";

export const boringLogPdfPublicationRevision = "bld-027-pdf-publication-v1" as const;
export const maximumBoringLogPdfBytes = 52_428_800 as const;

export interface BoringLogPdfRenderRequest {
  readonly projection: BoringLogPublicationProjection;
}

export interface BoringLogPdfPublicationInput {
  readonly scene: ResolvedBoringLogPageScene;
  readonly workingRevision: number;
  readonly expectedWorkingRevision: number;
  readonly expectedSceneInputDigest: string;
  readonly chooseDestination: () => Promise<string | null>;
  readonly renderPdf: (request: BoringLogPdfRenderRequest) => Promise<Uint8Array>;
}

function rejected(
  code: Exclude<BoringLogPublicationOutcome, { readonly accepted: true }>["code"],
): BoringLogPublicationOutcome {
  return Object.freeze({ accepted: false, code });
}

function pdfDigest(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function validBoringLogPdfEnvelope(bytes: unknown): bytes is Uint8Array {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength < 1_024 ||
    bytes.byteLength > maximumBoringLogPdfBytes
  ) {
    return false;
  }
  const start = Buffer.from(bytes.subarray(0, Math.min(bytes.byteLength, 16))).toString("ascii");
  const tail = Buffer.from(bytes.subarray(Math.max(0, bytes.byteLength - 2_048))).toString("ascii");
  return start.startsWith("%PDF-") && tail.includes("%%EOF");
}

function validCreateNewDestination(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 1_024 &&
    path.isAbsolute(value) &&
    path.extname(value).toLocaleLowerCase() === ".pdf"
  );
}

async function stagedCreateNew(
  destinationPath: string,
  bytes: Uint8Array,
): Promise<
  | { readonly accepted: true; readonly reopened: Uint8Array }
  | {
      readonly accepted: false;
      readonly code:
        "EXPORT_DESTINATION_EXISTS" | "EXPORT_DESTINATION_FAILED" | "EXPORT_FINAL_VERIFY_FAILED";
    }
> {
  const directory = path.dirname(destinationPath);
  const stagePath = path.join(
    directory,
    `.${path.basename(destinationPath)}.rsrender-${randomBytes(12).toString("hex")}.tmp`,
  );
  let stageCreated = false;
  let destinationCreated = false;
  try {
    const handle = await open(stagePath, "wx", 0o600);
    stageCreated = true;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const staged = await readFile(stagePath);
    if (
      staged.byteLength !== bytes.byteLength ||
      pdfDigest(staged) !== pdfDigest(bytes) ||
      !validBoringLogPdfEnvelope(staged)
    ) {
      return Object.freeze({ accepted: false, code: "EXPORT_FINAL_VERIFY_FAILED" });
    }
    try {
      await link(stagePath, destinationPath);
      destinationCreated = true;
    } catch (error) {
      return Object.freeze({
        accepted: false,
        code:
          error instanceof Error && "code" in error && error.code === "EEXIST"
            ? "EXPORT_DESTINATION_EXISTS"
            : "EXPORT_DESTINATION_FAILED",
      });
    }
    const reopened = await readFile(destinationPath);
    if (
      reopened.byteLength !== bytes.byteLength ||
      pdfDigest(reopened) !== pdfDigest(bytes) ||
      !validBoringLogPdfEnvelope(reopened)
    ) {
      return Object.freeze({ accepted: false, code: "EXPORT_FINAL_VERIFY_FAILED" });
    }
    return Object.freeze({ accepted: true, reopened });
  } catch {
    return Object.freeze({ accepted: false, code: "EXPORT_DESTINATION_FAILED" });
  } finally {
    if (stageCreated) await unlink(stagePath).catch(() => undefined);
    if (destinationCreated) {
      const reopened = await readFile(destinationPath).catch(() => null);
      if (
        reopened === null ||
        reopened.byteLength !== bytes.byteLength ||
        pdfDigest(reopened) !== pdfDigest(bytes)
      ) {
        await unlink(destinationPath).catch(() => undefined);
      }
    }
  }
}

export async function publishBoringLogPdf(
  input: BoringLogPdfPublicationInput,
): Promise<BoringLogPublicationOutcome> {
  if (
    !Number.isSafeInteger(input.workingRevision) ||
    input.workingRevision < 0 ||
    input.workingRevision !== input.expectedWorkingRevision ||
    input.scene.inputDigest !== input.expectedSceneInputDigest
  ) {
    return rejected("EXPORT_STALE_SCENE");
  }
  if (input.scene.diagnostics.some(({ severity }) => severity === "error")) {
    return rejected("EXPORT_PREFLIGHT_BLOCKED");
  }
  const projected = projectBoringLogSceneForPublication(input.scene);
  if (!projected.accepted) return rejected("EXPORT_PROJECTION_REJECTED");
  let destinationPath: string | null;
  try {
    destinationPath = await input.chooseDestination();
  } catch {
    return rejected("EXPORT_DESTINATION_FAILED");
  }
  if (destinationPath === null) return rejected("EXPORT_CANCELLED");
  if (!validCreateNewDestination(destinationPath)) {
    return rejected("EXPORT_DESTINATION_FAILED");
  }
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await input.renderPdf({ projection: projected.projection });
  } catch {
    return rejected("EXPORT_LAYOUT_HOST_FAILED");
  }
  if (!validBoringLogPdfEnvelope(pdfBytes)) return rejected("EXPORT_PDF_ENVELOPE_INVALID");
  const committed = await stagedCreateNew(destinationPath, pdfBytes);
  if (!committed.accepted) return rejected(committed.code);
  const page = input.scene.pages[0];
  if (page === undefined) return rejected("EXPORT_PROJECTION_REJECTED");
  const pageSizes: readonly [Readonly<{ widthMpt: number; heightMpt: number }>] = [
    Object.freeze({ widthMpt: page.widthMpt, heightMpt: page.heightMpt }),
  ];
  return Object.freeze({
    accepted: true,
    code: "EXPORT_VERIFIED_SUCCESS",
    workingRevision: input.workingRevision,
    sceneInputDigest: input.scene.inputDigest,
    sceneDigest: projected.projection.manifest.sceneDigest,
    projectionDigest: projected.projection.projectionDigest,
    pdfDigest: pdfDigest(committed.reopened),
    pdfBytes: committed.reopened.byteLength,
    pageCount: 1,
    pageSizes: Object.freeze(pageSizes),
    destinationPath,
    taggedPdfTarget: true,
    vectorTextTarget: true,
  });
}
