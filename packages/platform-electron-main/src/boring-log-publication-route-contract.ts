export const boringLogPublicationRouteRevision = "bld-027-publication-route-v1" as const;
export const BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL =
  "rsrender:boring-log-publication:bootstrap:v1" as const;
export const BORING_LOG_PUBLICATION_EXPORT_CHANNEL =
  "rsrender:boring-log-publication:export:v1" as const;

export type BoringLogPublicationOutcome =
  | Readonly<{
      accepted: true;
      code: "EXPORT_VERIFIED_SUCCESS";
      workingRevision: number;
      sceneInputDigest: string;
      sceneDigest: string;
      projectionDigest: string;
      pdfDigest: string;
      pdfBytes: number;
      pageCount: 1;
      pageSizes: readonly [Readonly<{ widthMpt: number; heightMpt: number }>];
      destinationPath: string;
      taggedPdfTarget: true;
      vectorTextTarget: true;
    }>
  | Readonly<{
      accepted: false;
      code:
        | "EXPORT_CANCELLED"
        | "EXPORT_STALE_SCENE"
        | "EXPORT_PREFLIGHT_BLOCKED"
        | "EXPORT_PROJECTION_REJECTED"
        | "EXPORT_LAYOUT_HOST_FAILED"
        | "EXPORT_PDF_ENVELOPE_INVALID"
        | "EXPORT_DESTINATION_EXISTS"
        | "EXPORT_DESTINATION_FAILED"
        | "EXPORT_FINAL_VERIFY_FAILED";
    }>;
