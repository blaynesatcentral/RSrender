export const boringLogPublicationRouteRevision = "bld-044-publication-route-v2" as const;
export const BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL =
  "rsrender:boring-log-publication:bootstrap:v2" as const;
export const BORING_LOG_PUBLICATION_EXPORT_CHANNEL =
  "rsrender:boring-log-publication:export:v2" as const;

export interface BoringLogPublicationIntent {
  readonly expectedWorkingRevision: number;
  readonly orderedBoringLogIdentities: readonly string[];
}

export interface BoringLogPublicationPageManifestEntry {
  readonly packagePageIndex: number;
  readonly boringLogIdentity: string;
  readonly explorationIdentity: string;
  readonly sourceOrdinal: number;
  readonly boringPageIndex: number;
  readonly pageId: string;
  readonly widthMpt: number;
  readonly heightMpt: number;
  readonly sceneInputDigest: string;
}

export type BoringLogPublicationOutcome =
  | Readonly<{
      accepted: true;
      code: "EXPORT_VERIFIED_SUCCESS";
      workingRevision: number;
      packageCandidateDigest: string;
      selectionDigest: string;
      orderedBoringLogIdentities: readonly string[];
      pageManifest: readonly BoringLogPublicationPageManifestEntry[];
      aggregateSceneDigest: string;
      aggregateProjectionDigest: string;
      pdfDigest: string;
      pdfBytes: number;
      pageCount: number;
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
