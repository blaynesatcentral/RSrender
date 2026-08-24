import type {
  BoringLogDepthTransformInput,
  BoringLogTemplateRegionInput,
} from "@rsrender/contracts";

export const boringLogRegionResizeRevision = "bld-039-region-resize-v1" as const;

export type BoringLogRegionBoundary = "header-depth" | "depth-footer";

export type BoringLogRegionResizeResult =
  | Readonly<{
      accepted: true;
      changed: boolean;
      regions: readonly BoringLogTemplateRegionInput[];
      depthTransform: BoringLogDepthTransformInput | null;
      boundary: BoringLogRegionBoundary;
      originalBoundaryYMpt: number;
      requestedBoundaryYMpt: number;
      effectiveBoundaryYMpt: number;
      clamped: boolean;
      fixedMptPerFoot: number;
      availablePlotHeightMpt: number;
      requiredPlotHeightMpt: number;
      pageCount: number;
      maximumDepthPerPageFt: number;
      repaginationRequired: boolean;
      publicationBlocked: boolean;
    }>
  | Readonly<{
      accepted: false;
      code:
        | "REGION_RESIZE_ARGUMENT_INVALID"
        | "REGION_RESIZE_TOPOLOGY_INVALID"
        | "REGION_RESIZE_CONSTRAINT_INVALID";
    }>;

function rejected(
  code: Extract<BoringLogRegionResizeResult, { readonly accepted: false }>["code"],
): BoringLogRegionResizeResult {
  return Object.freeze({ accepted: false, code });
}

function exactRegion(input: unknown): input is BoringLogTemplateRegionInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as Readonly<Record<string, unknown>>;
  return (
    Reflect.ownKeys(value).length === 6 &&
    typeof value["id"] === "string" &&
    ["header", "depth-body", "footer"].includes(String(value["role"])) &&
    ["xMpt", "yMpt", "widthMpt", "heightMpt"].every(
      (key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0,
    ) &&
    Number(value["widthMpt"]) > 0 &&
    Number(value["heightMpt"]) > 0
  );
}

export function resizeBoringLogPageRegions(
  input: Readonly<{
    readonly pageHeightMpt: number;
    readonly regions: readonly BoringLogTemplateRegionInput[];
    readonly depthTransform: BoringLogDepthTransformInput;
    readonly boundary: BoringLogRegionBoundary;
    readonly requestedBoundaryYMpt: number;
    readonly minimumHeaderHeightMpt: number;
    readonly minimumDepthBodyHeightMpt: number;
    readonly minimumFooterHeightMpt: number;
  }>,
): BoringLogRegionResizeResult {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      !Number.isSafeInteger(input.pageHeightMpt) ||
      input.pageHeightMpt <= 0 ||
      !Array.isArray(input.regions) ||
      input.regions.length !== 3 ||
      !input.regions.every(exactRegion) ||
      !["header-depth", "depth-footer"].includes(input.boundary) ||
      !Number.isSafeInteger(input.requestedBoundaryYMpt)
    ) {
      return rejected("REGION_RESIZE_ARGUMENT_INVALID");
    }
    const [header, depthBody, footer] = ["header", "depth-body", "footer"].map((role) =>
      input.regions.find((region) => region.role === role),
    );
    if (
      header === undefined ||
      depthBody === undefined ||
      footer === undefined ||
      new Set(input.regions.map(({ role }) => role)).size !== 3 ||
      header.yMpt + header.heightMpt > depthBody.yMpt ||
      depthBody.yMpt + depthBody.heightMpt !== footer.yMpt ||
      footer.yMpt + footer.heightMpt > input.pageHeightMpt ||
      input.depthTransform.regionId !== depthBody.id ||
      input.depthTransform.yStartMpt < depthBody.yMpt ||
      input.depthTransform.yStartMpt >= depthBody.yMpt + depthBody.heightMpt
    ) {
      return rejected("REGION_RESIZE_TOPOLOGY_INVALID");
    }
    const minima = [
      input.minimumHeaderHeightMpt,
      input.minimumDepthBodyHeightMpt,
      input.minimumFooterHeightMpt,
    ];
    if (minima.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
      return rejected("REGION_RESIZE_CONSTRAINT_INVALID");
    }
    const headerGapMpt = depthBody.yMpt - (header.yMpt + header.heightMpt);
    const footerEndMpt = footer.yMpt + footer.heightMpt;
    const originalBoundaryYMpt = input.boundary === "header-depth" ? depthBody.yMpt : footer.yMpt;
    const minimumBoundaryYMpt =
      input.boundary === "header-depth"
        ? header.yMpt + input.minimumHeaderHeightMpt + headerGapMpt
        : depthBody.yMpt + input.minimumDepthBodyHeightMpt;
    const maximumBoundaryYMpt =
      input.boundary === "header-depth"
        ? footer.yMpt - input.minimumDepthBodyHeightMpt
        : footerEndMpt - input.minimumFooterHeightMpt;
    if (minimumBoundaryYMpt > maximumBoundaryYMpt) {
      return rejected("REGION_RESIZE_CONSTRAINT_INVALID");
    }
    const effectiveBoundaryYMpt = Math.min(
      maximumBoundaryYMpt,
      Math.max(minimumBoundaryYMpt, input.requestedBoundaryYMpt),
    );
    const regions = input.regions.map((region) => {
      if (input.boundary === "header-depth") {
        if (region.role === "header") {
          return Object.freeze({
            ...region,
            heightMpt: effectiveBoundaryYMpt - headerGapMpt - header.yMpt,
          }) as BoringLogTemplateRegionInput;
        }
        if (region.role === "depth-body") {
          return Object.freeze({
            ...region,
            yMpt: effectiveBoundaryYMpt,
            heightMpt: footer.yMpt - effectiveBoundaryYMpt,
          }) as BoringLogTemplateRegionInput;
        }
      } else {
        if (region.role === "depth-body") {
          return Object.freeze({
            ...region,
            heightMpt: effectiveBoundaryYMpt - depthBody.yMpt,
          }) as BoringLogTemplateRegionInput;
        }
        if (region.role === "footer") {
          return Object.freeze({
            ...region,
            yMpt: effectiveBoundaryYMpt,
            heightMpt: footerEndMpt - effectiveBoundaryYMpt,
          }) as BoringLogTemplateRegionInput;
        }
      }
      return Object.freeze({ ...region });
    });
    const nextDepthBody = regions.find(({ role }) => role === "depth-body")!;
    const topInsetMpt = input.depthTransform.yStartMpt - depthBody.yMpt;
    const yStartMpt = nextDepthBody.yMpt + topInsetMpt;
    const plotEndLimitMpt = nextDepthBody.yMpt + nextDepthBody.heightMpt;
    const availablePlotHeightMpt = Math.max(0, plotEndLimitMpt - yStartMpt);
    const depthSpanFt = input.depthTransform.depthEndFt - input.depthTransform.depthStartFt;
    const requiredPlotHeightMpt = depthSpanFt * input.depthTransform.mptPerFoot;
    const maximumDepthPerPageFt = availablePlotHeightMpt / input.depthTransform.mptPerFoot;
    const pageCount = Math.max(1, Math.ceil(depthSpanFt / maximumDepthPerPageFt));
    const repaginationRequired = availablePlotHeightMpt < requiredPlotHeightMpt;
    const depthTransform = repaginationRequired
      ? null
      : (Object.freeze({
          ...input.depthTransform,
          yStartMpt,
          yEndMpt: yStartMpt + requiredPlotHeightMpt,
        }) as BoringLogDepthTransformInput);
    return Object.freeze({
      accepted: true,
      changed: effectiveBoundaryYMpt !== originalBoundaryYMpt,
      regions: Object.freeze(regions),
      depthTransform,
      boundary: input.boundary,
      originalBoundaryYMpt,
      requestedBoundaryYMpt: input.requestedBoundaryYMpt,
      effectiveBoundaryYMpt,
      clamped: effectiveBoundaryYMpt !== input.requestedBoundaryYMpt,
      fixedMptPerFoot: input.depthTransform.mptPerFoot,
      availablePlotHeightMpt,
      requiredPlotHeightMpt,
      pageCount,
      maximumDepthPerPageFt,
      repaginationRequired,
      publicationBlocked: repaginationRequired,
    });
  } catch {
    return rejected("REGION_RESIZE_ARGUMENT_INVALID");
  }
}
