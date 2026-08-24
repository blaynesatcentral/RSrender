import type { BoringLogDepthRange, BoringLogDepthTransformInput, Mpt } from "@rsrender/contracts";

export const boringLogContinuationPagesRevision = "bld-039-continuation-pages-v1" as const;

const maximumContinuationPageCount = 10_000;

function asMpt(value: number): Mpt {
  return value as Mpt;
}

export interface BoringLogContinuationPage {
  readonly pageId: string;
  readonly pageIndex: number;
  readonly pageRole: "single" | "first" | "continuation" | "last";
  readonly depthRange: BoringLogDepthRange;
  readonly depthTransform: BoringLogDepthTransformInput;
  /** First pages are half-open at end; only the final page owns its end depth. */
  readonly finalDepthInclusive: boolean;
}

export type BoringLogContinuationPagesResult =
  | Readonly<{
      accepted: true;
      pages: readonly BoringLogContinuationPage[];
      pageCount: number;
      fixedMptPerFoot: number;
      availablePlotHeightMpt: number;
      requiredPlotHeightMpt: number;
    }>
  | Readonly<{
      accepted: false;
      code: "CONTINUATION_PAGES_ARGUMENT_INVALID" | "CONTINUATION_PAGES_CAPACITY_EXCEEDED";
    }>;

function rejected(
  code: Extract<BoringLogContinuationPagesResult, { readonly accepted: false }>["code"],
): BoringLogContinuationPagesResult {
  return Object.freeze({ accepted: false, code });
}

/**
 * Plans fixed-scale, contiguous depth ownership for one Boring Log. Intermediate
 * page ends are half-open; a value on a boundary belongs to the deeper page.
 */
export function planBoringLogContinuationPages(input: unknown): BoringLogContinuationPagesResult {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return rejected("CONTINUATION_PAGES_ARGUMENT_INVALID");
    }
    const value = input as Readonly<Record<string, unknown>>;
    const expectedKeys = [
      "basePageId",
      "regionId",
      "depthStartFt",
      "depthEndFt",
      "yStartMpt",
      "yEndLimitMpt",
      "mptPerFoot",
    ];
    const basePageId = value["basePageId"];
    const regionId = value["regionId"];
    const depthStartFt = value["depthStartFt"];
    const depthEndFt = value["depthEndFt"];
    const yStartMpt = value["yStartMpt"];
    const yEndLimitMpt = value["yEndLimitMpt"];
    const mptPerFoot = value["mptPerFoot"];
    if (
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      expectedKeys.some((key) => !Object.hasOwn(value, key)) ||
      typeof basePageId !== "string" ||
      basePageId.length < 1 ||
      basePageId.length > 512 ||
      typeof regionId !== "string" ||
      regionId.length < 1 ||
      regionId.length > 512 ||
      typeof depthStartFt !== "number" ||
      !Number.isFinite(depthStartFt) ||
      depthStartFt < 0 ||
      typeof depthEndFt !== "number" ||
      !Number.isFinite(depthEndFt) ||
      depthEndFt <= depthStartFt ||
      typeof yStartMpt !== "number" ||
      typeof yEndLimitMpt !== "number" ||
      !Number.isSafeInteger(yStartMpt) ||
      !Number.isSafeInteger(yEndLimitMpt) ||
      yEndLimitMpt <= yStartMpt ||
      typeof mptPerFoot !== "number" ||
      !Number.isSafeInteger(mptPerFoot) ||
      mptPerFoot <= 0
    ) {
      return rejected("CONTINUATION_PAGES_ARGUMENT_INVALID");
    }
    const availablePlotHeightMpt = yEndLimitMpt - yStartMpt;
    const requiredPlotHeightMpt = Math.ceil((depthEndFt - depthStartFt) * mptPerFoot);
    if (!Number.isSafeInteger(requiredPlotHeightMpt) || requiredPlotHeightMpt <= 0) {
      return rejected("CONTINUATION_PAGES_ARGUMENT_INVALID");
    }
    const pageCount = Math.ceil(requiredPlotHeightMpt / availablePlotHeightMpt);
    if (!Number.isSafeInteger(pageCount) || pageCount > maximumContinuationPageCount) {
      return rejected("CONTINUATION_PAGES_CAPACITY_EXCEEDED");
    }

    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
      const plotStartOffsetMpt = pageIndex * availablePlotHeightMpt;
      const plotHeightMpt = Math.min(
        availablePlotHeightMpt,
        requiredPlotHeightMpt - plotStartOffsetMpt,
      );
      const finalDepthInclusive = pageIndex === pageCount - 1;
      const pageDepthStartFt =
        pageIndex === 0 ? depthStartFt : depthStartFt + plotStartOffsetMpt / mptPerFoot;
      const pageDepthEndFt = finalDepthInclusive
        ? depthEndFt
        : depthStartFt + (plotStartOffsetMpt + plotHeightMpt) / mptPerFoot;
      const pageRole =
        pageCount === 1
          ? "single"
          : pageIndex === 0
            ? "first"
            : finalDepthInclusive
              ? "last"
              : "continuation";
      return Object.freeze({
        pageId: pageIndex === 0 ? basePageId : `${basePageId}:continuation:${pageIndex + 1}`,
        pageIndex,
        pageRole,
        depthRange: Object.freeze({
          startFt: pageDepthStartFt,
          endFt: pageDepthEndFt,
          terminalInclusive: finalDepthInclusive,
        }),
        depthTransform: Object.freeze({
          regionId,
          depthStartFt: pageDepthStartFt,
          depthEndFt: pageDepthEndFt,
          yStartMpt: asMpt(yStartMpt),
          yEndMpt: asMpt(yStartMpt + plotHeightMpt),
          mptPerFoot: asMpt(mptPerFoot),
        }),
        finalDepthInclusive,
      }) satisfies BoringLogContinuationPage;
    });

    return Object.freeze({
      accepted: true,
      pages: Object.freeze(pages),
      pageCount,
      fixedMptPerFoot: mptPerFoot,
      availablePlotHeightMpt,
      requiredPlotHeightMpt,
    });
  } catch {
    return rejected("CONTINUATION_PAGES_ARGUMENT_INVALID");
  }
}
