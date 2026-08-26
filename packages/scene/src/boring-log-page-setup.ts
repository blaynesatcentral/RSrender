import type {
  BoringLogColumnInput,
  BoringLogDepthTransformInput,
  BoringLogTemplateInput,
  BoringLogTemplateRegionInput,
  Mpt,
} from "@rsrender/contracts";

export const boringLogPageSetupRevision = "bld-049-page-setup-v1" as const;

export const boringLogPaperPresetsMpt = Object.freeze({
  letter: Object.freeze({ widthMpt: 612_000, heightMpt: 792_000 }),
  a4: Object.freeze({ widthMpt: 595_276, heightMpt: 841_890 }),
});

export type BoringLogPageSetupInput = Readonly<{
  readonly paperPreset: "letter" | "a4" | "custom";
  readonly orientation: "portrait" | "landscape";
  readonly widthMpt: number;
  readonly heightMpt: number;
  readonly marginsMpt: Readonly<{
    readonly topMpt: number;
    readonly rightMpt: number;
    readonly bottomMpt: number;
    readonly leftMpt: number;
  }>;
}>;

export type BoringLogPageSetupResult =
  | Readonly<{
      readonly accepted: true;
      readonly changed: boolean;
      readonly page: BoringLogTemplateInput["page"];
      readonly regions: readonly BoringLogTemplateRegionInput[];
      readonly columns: readonly BoringLogColumnInput[];
      readonly depthTransform: BoringLogDepthTransformInput;
      readonly pagination: BoringLogTemplateInput["pagination"] | undefined;
      readonly pageCount: number;
      readonly repaginationRequired: boolean;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code:
        | "PAGE_SETUP_ARGUMENT_INVALID"
        | "PAGE_SETUP_PRESET_MISMATCH"
        | "PAGE_SETUP_MARGIN_INVALID"
        | "PAGE_SETUP_TOPOLOGY_INVALID"
        | "PAGE_SETUP_CONTENT_TOO_SMALL";
    }>;

function asMpt(value: number): Mpt {
  return value as Mpt;
}

function rejected(
  code: Extract<BoringLogPageSetupResult, { readonly accepted: false }>["code"],
): BoringLogPageSetupResult {
  return Object.freeze({ accepted: false, code });
}

function pageDimensions(input: BoringLogPageSetupInput): Readonly<{
  widthMpt: number;
  heightMpt: number;
}> | null {
  if (input.paperPreset === "custom") {
    return Object.freeze({ widthMpt: input.widthMpt, heightMpt: input.heightMpt });
  }
  const portrait = boringLogPaperPresetsMpt[input.paperPreset];
  return input.orientation === "portrait"
    ? portrait
    : Object.freeze({ widthMpt: portrait.heightMpt, heightMpt: portrait.widthMpt });
}

export function applyBoringLogPageSetup(
  template: BoringLogTemplateInput,
  input: BoringLogPageSetupInput,
): BoringLogPageSetupResult {
  try {
    if (
      typeof template !== "object" ||
      template === null ||
      typeof input !== "object" ||
      input === null ||
      !["letter", "a4", "custom"].includes(input.paperPreset) ||
      !["portrait", "landscape"].includes(input.orientation) ||
      !Number.isSafeInteger(input.widthMpt) ||
      !Number.isSafeInteger(input.heightMpt) ||
      input.widthMpt < 216_000 ||
      input.heightMpt < 216_000 ||
      input.widthMpt > 2_000_000 ||
      input.heightMpt > 2_000_000 ||
      typeof input.marginsMpt !== "object" ||
      input.marginsMpt === null ||
      Object.values(input.marginsMpt).some((value) => !Number.isSafeInteger(value) || value < 0)
    ) {
      return rejected("PAGE_SETUP_ARGUMENT_INVALID");
    }
    const dimensions = pageDimensions(input);
    if (dimensions === null) return rejected("PAGE_SETUP_ARGUMENT_INVALID");
    if (
      input.paperPreset !== "custom" &&
      (input.widthMpt !== dimensions.widthMpt || input.heightMpt !== dimensions.heightMpt)
    ) {
      return rejected("PAGE_SETUP_PRESET_MISMATCH");
    }
    if (
      (input.orientation === "portrait" && dimensions.widthMpt > dimensions.heightMpt) ||
      (input.orientation === "landscape" && dimensions.widthMpt < dimensions.heightMpt)
    ) {
      return rejected("PAGE_SETUP_ARGUMENT_INVALID");
    }
    const { topMpt, rightMpt, bottomMpt, leftMpt } = input.marginsMpt;
    const contentWidthMpt = dimensions.widthMpt - leftMpt - rightMpt;
    const contentHeightMpt = dimensions.heightMpt - topMpt - bottomMpt;
    if (contentWidthMpt <= 0 || contentHeightMpt <= 0) {
      return rejected("PAGE_SETUP_MARGIN_INVALID");
    }
    if (contentWidthMpt < 144_000 || contentHeightMpt < 216_000) {
      return rejected("PAGE_SETUP_CONTENT_TOO_SMALL");
    }
    const header = template.regions.find(({ role }) => role === "header");
    const depthBody = template.regions.find(({ role }) => role === "depth-body");
    const footer = template.regions.find(({ role }) => role === "footer");
    if (
      template.regions.length !== 3 ||
      header === undefined ||
      depthBody === undefined ||
      footer === undefined ||
      template.depthTransform.regionId !== depthBody.id ||
      depthBody.widthMpt <= 0 ||
      template.columns.length < 2 ||
      template.columns[0]?.xMpt !== depthBody.xMpt ||
      template.columns.at(-1)!.xMpt + template.columns.at(-1)!.widthMpt !==
        depthBody.xMpt + depthBody.widthMpt ||
      template.columns.some(
        (column, index) =>
          index > 0 &&
          column.xMpt !== template.columns[index - 1]!.xMpt + template.columns[index - 1]!.widthMpt,
      )
    ) {
      return rejected("PAGE_SETUP_TOPOLOGY_INVALID");
    }
    if (contentWidthMpt < depthBody.widthMpt) {
      return rejected("PAGE_SETUP_CONTENT_TOO_SMALL");
    }
    const headerGapMpt = depthBody.yMpt - (header.yMpt + header.heightMpt);
    const depthInsetMpt = template.depthTransform.yStartMpt - depthBody.yMpt;
    const nextHeaderYMpt = topMpt;
    const nextDepthYMpt = nextHeaderYMpt + header.heightMpt + headerGapMpt;
    const nextFooterYMpt = dimensions.heightMpt - bottomMpt - footer.heightMpt;
    const nextDepthHeightMpt = nextFooterYMpt - nextDepthYMpt;
    if (
      headerGapMpt < 0 ||
      depthInsetMpt < 0 ||
      nextDepthHeightMpt < 72_000 ||
      depthInsetMpt >= nextDepthHeightMpt
    ) {
      return rejected("PAGE_SETUP_CONTENT_TOO_SMALL");
    }
    const regions = Object.freeze(
      template.regions.map((region) => {
        const vertical =
          region.role === "header"
            ? { yMpt: nextHeaderYMpt, heightMpt: region.heightMpt }
            : region.role === "depth-body"
              ? { yMpt: nextDepthYMpt, heightMpt: nextDepthHeightMpt }
              : { yMpt: nextFooterYMpt, heightMpt: region.heightMpt };
        return Object.freeze({
          ...region,
          xMpt: asMpt(leftMpt),
          widthMpt: asMpt(contentWidthMpt),
          yMpt: asMpt(vertical.yMpt),
          heightMpt: asMpt(vertical.heightMpt),
        });
      }),
    );
    const oldWidthMpt = depthBody.widthMpt;
    const protectedRoles = new Set([
      "depth-ruler",
      "material-description",
      "sample",
      "penetration-moisture-plasticity",
      "remarks",
    ]);
    const protectedColumns = template.columns.filter(({ role }) => protectedRoles.has(role));
    const protectedWidthMpt = protectedColumns.reduce((total, { widthMpt }) => total + widthMpt, 0);
    const preserveComplexColumnWidths =
      contentWidthMpt < oldWidthMpt &&
      protectedColumns.length === protectedRoles.size &&
      protectedWidthMpt + (template.columns.length - protectedColumns.length) * 4_000 <=
        contentWidthMpt;
    const scalableOldWidthMpt = preserveComplexColumnWidths
      ? oldWidthMpt - protectedWidthMpt
      : oldWidthMpt;
    const scalableNewWidthMpt = preserveComplexColumnWidths
      ? contentWidthMpt - protectedWidthMpt
      : contentWidthMpt;
    let nextColumnXMpt = leftMpt;
    const columns = Object.freeze(
      template.columns.map((column, index) => {
        const xMpt = nextColumnXMpt;
        const widthMpt =
          index === template.columns.length - 1
            ? leftMpt + contentWidthMpt - xMpt
            : preserveComplexColumnWidths && protectedRoles.has(column.role)
              ? column.widthMpt
              : Math.round((column.widthMpt * scalableNewWidthMpt) / scalableOldWidthMpt);
        const adjusted = Object.freeze({
          ...column,
          xMpt: asMpt(xMpt),
          widthMpt: asMpt(widthMpt),
        });
        nextColumnXMpt += widthMpt;
        return adjusted;
      }),
    );
    if (columns.some(({ widthMpt }) => widthMpt < 4_000)) {
      return rejected("PAGE_SETUP_CONTENT_TOO_SMALL");
    }
    const yStartMpt = nextDepthYMpt + depthInsetMpt;
    const requiredHeightMpt =
      (template.depthTransform.depthEndFt - template.depthTransform.depthStartFt) *
      template.depthTransform.mptPerFoot;
    const yEndMpt = yStartMpt + requiredHeightMpt;
    const yEndLimitMpt = nextDepthYMpt + nextDepthHeightMpt;
    const repaginationRequired = yEndMpt > yEndLimitMpt;
    const availableHeightMpt = yEndLimitMpt - yStartMpt;
    if (availableHeightMpt <= 0) return rejected("PAGE_SETUP_CONTENT_TOO_SMALL");
    const depthSpanFt = template.depthTransform.depthEndFt - template.depthTransform.depthStartFt;
    const pageCount = Math.max(
      1,
      Math.ceil(depthSpanFt / (availableHeightMpt / template.depthTransform.mptPerFoot)),
    );
    const page = Object.freeze({
      widthMpt: asMpt(dimensions.widthMpt),
      heightMpt: asMpt(dimensions.heightMpt),
      orientation: input.orientation,
      paperPreset: input.paperPreset,
      marginsMpt: Object.freeze({
        topMpt: asMpt(input.marginsMpt.topMpt),
        rightMpt: asMpt(input.marginsMpt.rightMpt),
        bottomMpt: asMpt(input.marginsMpt.bottomMpt),
        leftMpt: asMpt(input.marginsMpt.leftMpt),
      }),
    }) as BoringLogTemplateInput["page"];
    const depthTransform = Object.freeze({
      ...template.depthTransform,
      yStartMpt: asMpt(yStartMpt),
      yEndMpt: asMpt(yEndMpt),
    });
    const pagination = repaginationRequired
      ? (Object.freeze({
          policy: "fixed-scale-continuation-v1" as const,
          yEndLimitMpt: asMpt(yEndLimitMpt),
        }) as NonNullable<BoringLogTemplateInput["pagination"]>)
      : undefined;
    const changed =
      JSON.stringify({
        page: template.page,
        regions: template.regions,
        columns: template.columns,
        depthTransform: template.depthTransform,
        pagination: template.pagination,
      }) !== JSON.stringify({ page, regions, columns, depthTransform, pagination });
    return Object.freeze({
      accepted: true,
      changed,
      page,
      regions,
      columns,
      depthTransform,
      pagination,
      pageCount,
      repaginationRequired,
    });
  } catch {
    return rejected("PAGE_SETUP_ARGUMENT_INVALID");
  }
}
