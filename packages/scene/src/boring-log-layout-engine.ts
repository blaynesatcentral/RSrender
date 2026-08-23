import {
  boringLogPagePlanSchemaVersion,
  boringLogRenderContractVersion,
  resolvedBoringLogPageSceneSchemaVersion,
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  validateBoringLogPagePlan,
  validateResolvedBoringLogPageScene,
} from "@rsrender/contracts";
import type {
  BoringLogColumnInput,
  BoringLogLayoutJobInput,
  BoringLogPagePlan,
  BoringLogRenderDiagnostic,
  BoringLogSceneNode,
  BoringLogSourceProvenance,
  BoringLogTextMeasurementRequest,
  BoringLogValueProvenance,
  Mpt,
  MptRect,
  ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

export const boringLogLayoutEngineRevision = "bld-024-v1" as const;

export type BoringLogLayoutEngineRejectionCode =
  | "BORING_LOG_LAYOUT_INPUT_REJECTED"
  | "BORING_LOG_LAYOUT_PLAN_REJECTED"
  | "BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH"
  | "BORING_LOG_LAYOUT_SCENE_REJECTED";

export type BoringLogLayoutEngineResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | {
      readonly accepted: false;
      readonly code: BoringLogLayoutEngineRejectionCode;
      readonly contractCode: string;
    };

export interface BoringLogLayoutPreparation {
  readonly job: BoringLogLayoutJobInput;
  readonly pagePlan: BoringLogPagePlan;
  readonly textRequests: readonly BoringLogTextMeasurementRequest[];
}

type MutableGroupNode = Extract<BoringLogSceneNode, { readonly kind: "group" }> & {
  childIds: string[];
};

interface DraftScene {
  readonly nodes: readonly BoringLogSceneNode[];
  readonly textRequests: readonly BoringLogTextMeasurementRequest[];
  readonly semanticOrder: readonly string[];
}

function accepted<Value>(value: Value): BoringLogLayoutEngineResult<Value> {
  return Object.freeze({ accepted: true, value });
}

function rejected(
  code: BoringLogLayoutEngineRejectionCode,
  contractCode: string,
): BoringLogLayoutEngineResult<never> {
  return Object.freeze({ accepted: false, code, contractCode });
}

function asMpt(value: number): Mpt {
  return value as Mpt;
}

function rect(xMpt: number, yMpt: number, widthMpt: number, heightMpt: number): MptRect {
  return Object.freeze({
    xMpt: asMpt(xMpt),
    yMpt: asMpt(yMpt),
    widthMpt: asMpt(Math.max(0, widthMpt)),
    heightMpt: asMpt(Math.max(0, heightMpt)),
  });
}

function sourceFor(
  job: BoringLogLayoutJobInput,
  entityIdentity: string,
  fieldIdentity: string,
): BoringLogSourceProvenance {
  const metadataSource =
    job.document.metadata.provenance.provenanceClass === "source"
      ? job.document.metadata.provenance
      : job.document.metadata.provenance.original;
  return Object.freeze({
    provenanceClass: "source",
    sourceContextIdentity: metadataSource.sourceContextIdentity,
    sourceProjectIdentity: metadataSource.sourceProjectIdentity,
    sourceEntityIdentity: entityIdentity,
    sourceFieldIdentity: fieldIdentity,
    sourceContractRevision: metadataSource.sourceContractRevision,
  });
}

function columnByRole(job: BoringLogLayoutJobInput, role: string): BoringLogColumnInput {
  const column = job.template.columns.find((candidate) => candidate.role === role);
  if (!column) throw new Error(`missing-column:${role}`);
  return column;
}

function styleById(job: BoringLogLayoutJobInput, styleId: string) {
  const style = job.template.styles.find((candidate) => candidate.id === styleId);
  if (!style) throw new Error(`missing-style:${styleId}`);
  return style;
}

function depthToYMpt(job: BoringLogLayoutJobInput, depthFt: number): Mpt {
  const transform = job.template.depthTransform;
  if (depthFt <= transform.depthStartFt) return transform.yStartMpt;
  if (depthFt >= transform.depthEndFt) return transform.yEndMpt;
  return asMpt(
    transform.yStartMpt + Math.round((depthFt - transform.depthStartFt) * transform.mptPerFoot),
  );
}

function valueToXMpt(
  column: BoringLogColumnInput,
  axisMinimum: number,
  axisMaximum: number,
  value: number,
): Mpt {
  const xStart = column.xMpt;
  const width = column.widthMpt;
  return asMpt(xStart + Math.round(((value - axisMinimum) / (axisMaximum - axisMinimum)) * width));
}

function formatBlowIncrements(
  increments: readonly { readonly blows: number; readonly penetrationInches: number }[],
): string {
  return increments
    .map(({ blows, penetrationInches }) =>
      penetrationInches === 6 ? String(blows) : `${String(blows)}/${String(penetrationInches)}"`,
    )
    .join("-");
}

function buildDraft(job: BoringLogLayoutJobInput): DraftScene {
  const nodes: BoringLogSceneNode[] = [];
  const groups = new Map<string, MutableGroupNode>();
  const textRequests: BoringLogTextMeasurementRequest[] = [];

  const append = (node: BoringLogSceneNode): void => {
    nodes.push(node);
    if (node.parentId !== null) {
      const parent = groups.get(node.parentId);
      if (!parent) throw new Error(`missing-parent:${node.parentId}`);
      parent.childIds.push(node.id);
    }
  };

  const addGroup = (
    id: string,
    semanticId: string,
    parentId: string | null,
    role: string,
    bounds: MptRect,
  ): void => {
    const group: MutableGroupNode = {
      id,
      kind: "group",
      semanticId,
      parentId,
      role,
      order: nodes.length,
      provenance: null,
      bounds,
      childIds: [],
    };
    groups.set(id, group);
    append(group);
  };

  const addRect = (
    id: string,
    semanticId: string,
    parentId: string,
    role: string,
    bounds: MptRect,
    fillToken: string | null,
    strokeToken: string | null,
    provenance: BoringLogValueProvenance | null = null,
    strokeWidthMpt = 500,
  ): void =>
    append({
      id,
      kind: "rect",
      semanticId,
      parentId,
      role,
      order: nodes.length,
      provenance,
      bounds,
      fillToken,
      strokeToken,
      strokeWidthMpt: asMpt(strokeWidthMpt),
    });

  const addLine = (
    id: string,
    semanticId: string,
    parentId: string,
    role: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeToken = "rule",
    provenance: BoringLogValueProvenance | null = null,
    dashMpt: readonly Mpt[] = [],
  ): void =>
    append({
      id,
      kind: "line",
      semanticId,
      parentId,
      role,
      order: nodes.length,
      provenance,
      from: { xMpt: asMpt(x1), yMpt: asMpt(y1) },
      to: { xMpt: asMpt(x2), yMpt: asMpt(y2) },
      strokeToken,
      strokeWidthMpt: asMpt(500),
      dashMpt,
    });

  const addPath = (
    id: string,
    semanticId: string,
    parentId: string,
    role: string,
    points: readonly { readonly xMpt: Mpt; readonly yMpt: Mpt }[],
    closed: boolean,
    fillToken: string | null,
    strokeToken: string | null,
    provenance: BoringLogValueProvenance | null,
    dashMpt: readonly Mpt[] = [],
  ): void =>
    append({
      id,
      kind: "path",
      semanticId,
      parentId,
      role,
      order: nodes.length,
      provenance,
      points,
      closed,
      fillToken,
      strokeToken,
      strokeWidthMpt: asMpt(650),
      dashMpt,
    });

  const addCircle = (
    id: string,
    semanticId: string,
    parentId: string,
    role: string,
    x: number,
    y: number,
    radius: number,
    fillToken: string | null,
    provenance: BoringLogValueProvenance | null,
    strokeToken = "ink",
  ): void =>
    append({
      id,
      kind: "circle",
      semanticId,
      parentId,
      role,
      order: nodes.length,
      provenance,
      center: { xMpt: asMpt(x), yMpt: asMpt(y) },
      radiusMpt: asMpt(radius),
      fillToken,
      strokeToken,
      strokeWidthMpt: asMpt(500),
    });

  const addText = (
    id: string,
    semanticId: string,
    parentId: string,
    role: string,
    content: string,
    frame: MptRect,
    styleId: string,
    provenance: BoringLogValueProvenance | null,
    maximumLines: number,
    wrapPolicy: "word-v1" | "no-wrap" = "word-v1",
  ): void => {
    const occurrenceStyle = job.template.bindings.find(
      (binding) =>
        binding.elementId === id && binding.path === "presentation.text-occurrence-style",
    );
    const occurrenceLayoutBinding = job.template.bindings.find(
      (binding) =>
        binding.elementId === id && binding.path === "presentation.text-occurrence-layout",
    );
    const occurrenceLayout = job.template.occurrenceLayouts?.find(
      ({ id: layoutId }) => layoutId === occurrenceLayoutBinding?.styleId,
    );
    const effectiveStyleId = occurrenceStyle?.styleId ?? styleId;
    const style = styleById(job, effectiveStyleId);
    const effectiveFrame = occurrenceLayout?.frame ?? frame;
    const horizontalPadding =
      (occurrenceLayout?.paddingMpt.leftMpt ?? 0) + (occurrenceLayout?.paddingMpt.rightMpt ?? 0);
    const verticalPadding =
      (occurrenceLayout?.paddingMpt.topMpt ?? 0) + (occurrenceLayout?.paddingMpt.bottomMpt ?? 0);
    const maximumHeightMpt = asMpt(effectiveFrame.heightMpt - verticalPadding);
    const minimumFontSizeMpt =
      occurrenceLayout?.overflowPolicy === "shrink-to-minimum"
        ? (occurrenceLayout.minimumFontSizeMpt ?? style.fontSizeMpt)
        : style.fontSizeMpt;
    const minimumLineHeightMpt = Math.max(
      minimumFontSizeMpt,
      Math.round((style.lineHeightMpt * minimumFontSizeMpt) / style.fontSizeMpt),
    );
    const effectiveMaximumLines =
      occurrenceLayout === undefined
        ? maximumLines
        : Math.max(
            1,
            Math.floor(
              maximumHeightMpt /
                (occurrenceLayout.overflowPolicy === "shrink-to-minimum"
                  ? minimumLineHeightMpt
                  : style.lineHeightMpt),
            ),
          );
    const measurementId = `measure:${id}`;
    textRequests.push({
      measurementId,
      text: content,
      sourceIdentity: semanticId,
      sourceStartUtf16: 0,
      sourceEndUtf16: content.length,
      fontFamilyId: style.fontFamilyId,
      fontSizeMpt: style.fontSizeMpt,
      fontWeight: style.fontWeight,
      lineHeightMpt: style.lineHeightMpt,
      maximumWidthMpt: asMpt(effectiveFrame.widthMpt - horizontalPadding),
      maximumHeightMpt,
      maximumLines: effectiveMaximumLines,
      wrapPolicy: occurrenceLayout?.wrapPolicy ?? wrapPolicy,
      overflowPolicy: occurrenceLayout?.overflowPolicy ?? "clip-with-diagnostic",
      minimumFontSizeMpt,
    });
    append({
      id,
      kind: "text",
      semanticId,
      parentId,
      role,
      order: nodes.length,
      provenance,
      measurementId,
      styleId: effectiveStyleId,
      content,
      frame: effectiveFrame,
      ...(occurrenceLayout === undefined
        ? {}
        : {
            presentation: {
              frameAnchor: occurrenceLayout.frameAnchor ?? "top-left",
              paddingMpt: occurrenceLayout.paddingMpt,
              horizontalAlignment: occurrenceLayout.horizontalAlignment,
              verticalAlignment: occurrenceLayout.verticalAlignment,
              wrapPolicy: occurrenceLayout.wrapPolicy,
              overflowPolicy: occurrenceLayout.overflowPolicy,
              ...(occurrenceLayout.minimumFontSizeMpt === undefined
                ? {}
                : { minimumFontSizeMpt: occurrenceLayout.minimumFontSizeMpt }),
              rotationMilliDegrees: occurrenceLayout.rotationMilliDegrees,
              positionMode: occurrenceLayout.positionMode,
              locked: occurrenceLayout.locked,
            },
          }),
    });
  };

  const page = job.template.page;
  addGroup(
    "node:page-root",
    job.template.hierarchy.id,
    null,
    "page",
    rect(0, 0, page.widthMpt, page.heightMpt),
  );

  for (const region of job.template.regions) {
    addGroup(
      `node:${region.id}`,
      region.id,
      "node:page-root",
      region.role,
      rect(region.xMpt, region.yMpt, region.widthMpt, region.heightMpt),
    );
    addRect(
      `node:${region.id}:frame`,
      region.id,
      `node:${region.id}`,
      "region-frame",
      rect(region.xMpt, region.yMpt, region.widthMpt, region.heightMpt),
      "pageFill",
      "rule",
    );
  }

  const header = job.template.regions.find(({ role }) => role === "header")!;
  const metadata = job.document.metadata;
  const metadataProvenance = metadata.provenance;
  addText(
    "node:header-company",
    "header-company",
    "node:region-header",
    "company-name",
    metadata.companyName,
    rect(header.xMpt + 8_000, header.yMpt + 5_000, 250_000, 15_000),
    "style-company",
    metadataProvenance,
    1,
    "no-wrap",
  );
  addText(
    "node:header-company-subtitle",
    "header-company",
    "node:region-header",
    "company-subtitle",
    metadata.companyContactSubtitle,
    rect(header.xMpt + 8_000, header.yMpt + 20_000, 270_000, 8_000),
    "style-small",
    metadataProvenance,
    1,
    "no-wrap",
  );
  addText(
    "node:header-title",
    "header-title",
    "node:region-header",
    "document-title",
    metadata.documentTitle,
    rect(header.xMpt + 300_000, header.yMpt + 3_000, 270_000, 22_000),
    "style-title",
    metadataProvenance,
    1,
    "no-wrap",
  );
  addText(
    "node:header-sheet",
    "header-sheet",
    "node:region-header",
    "sheet-label",
    metadata.sheetLabel,
    rect(header.xMpt + 455_000, header.yMpt + 23_000, 115_000, 8_000),
    "style-small",
    metadataProvenance,
    1,
    "no-wrap",
  );
  addLine(
    "node:header-title-rule",
    "header-project-metadata",
    "node:region-header",
    "header-title-rule",
    header.xMpt,
    header.yMpt + 33_000,
    header.xMpt + header.widthMpt,
    header.yMpt + 33_000,
    "rule",
  );
  const metadataCells = [
    ["CLIENT", metadata.clientName, 0, 118_000],
    [
      "PROJECT · NO.",
      `${metadata.projectName} · ${metadata.projectNumber} · ${metadata.location}`,
      118_000,
      142_000,
    ],
    [
      "COORDINATES · DATUM",
      `${metadata.coordinates} · ${metadata.coordinateDatum}`,
      260_000,
      118_000,
    ],
    [
      "GROUND ELEVATION",
      `${metadata.groundElevationFt.toFixed(1)} ft · ${metadata.elevationDatum}`,
      378_000,
      92_000,
    ],
    [
      "DRILLED · TOTAL DEPTH",
      `${metadata.drilledDate} · ${metadata.totalDepthFt.toFixed(1)} ft`,
      470_000,
      112_000,
    ],
    ["METHOD · HOLE DIA.", `${metadata.boringMethod} · ${metadata.holeDiameter}`, 0, 118_000],
    ["RIG · DRILLER", metadata.rigDriller, 118_000, 142_000],
    [
      "HAMMER · EFFICIENCY",
      `${metadata.hammerType}, ${metadata.hammerDrop} · ${metadata.hammerEfficiency}`,
      260_000,
      118_000,
    ],
    ["LOGGED · CHECKED", `${metadata.loggedBy} · ${metadata.checkedBy}`, 378_000, 92_000],
    ["GROUNDWATER", metadata.groundwaterSummary, 470_000, 112_000],
  ] as const;
  metadataCells.forEach(([label, value, xOffset, width], index) => {
    const row = index < 5 ? 0 : 1;
    const y = header.yMpt + 36_000 + row * 23_000;
    if (xOffset > 0) {
      addLine(
        `node:header-metadata-divider:${index + 1}`,
        "header-project-metadata",
        "node:region-header",
        "header-metadata-divider",
        header.xMpt + xOffset,
        y,
        header.xMpt + xOffset,
        y + 20_000,
        "lightRule",
      );
    }
    addText(
      `node:header-project-metadata:${index + 1}:label`,
      "header-project-metadata",
      "node:region-header",
      "project-metadata-label",
      label,
      rect(header.xMpt + xOffset + 3_000, y, width - 6_000, 7_000),
      "style-small",
      metadataProvenance,
      1,
      "no-wrap",
    );
    addText(
      `node:header-project-metadata:${index + 1}:value`,
      "header-project-metadata",
      "node:region-header",
      "project-metadata-value",
      value,
      rect(header.xMpt + xOffset + 3_000, y + 7_000, width - 6_000, 13_000),
      "style-small",
      metadataProvenance,
      2,
    );
  });

  const depthBody = job.template.regions.find(({ role }) => role === "depth-body")!;
  const depthGroupId = "node:region-depth-body";
  const columnLabels: Readonly<Record<string, string>> = {
    "elevation-ruler": "ELEV\nFT",
    "depth-ruler": "DEPTH\nFT",
    "lithology-pattern": "USCS",
    "material-description": "MATERIAL DESCRIPTION",
    sample: "SAMPLE",
    recovery: "REC\n%",
    blows: "BLOWS\n/6 IN",
    "n-value": "N",
    "penetration-moisture-plasticity": "PENETRATION N · MOISTURE W% · PL–LL",
    remarks: "REMARKS & FIELD NOTES",
  };
  for (const column of job.template.columns) {
    addRect(
      `node:${column.id}:frame`,
      column.id,
      depthGroupId,
      "log-column-frame",
      rect(column.xMpt, depthBody.yMpt, column.widthMpt, depthBody.heightMpt),
      null,
      "rule",
    );
    addText(
      `node:${column.id}:heading`,
      column.id,
      depthGroupId,
      "log-column-heading",
      columnLabels[column.role] ?? column.role.toUpperCase(),
      rect(column.xMpt + 1_000, depthBody.yMpt + 3_000, column.widthMpt - 2_000, 21_000),
      column.role === "penetration-moisture-plasticity" || column.role === "sample"
        ? "style-small"
        : "style-heading",
      null,
      2,
    );
  }
  addLine(
    "node:depth-body-heading-rule",
    "region-depth-body",
    depthGroupId,
    "column-heading-rule",
    depthBody.xMpt,
    job.template.depthTransform.yStartMpt,
    depthBody.xMpt + depthBody.widthMpt,
    job.template.depthTransform.yStartMpt,
  );

  const elevationColumn = columnByRole(job, "elevation-ruler");
  const depthColumn = columnByRole(job, "depth-ruler");
  const depthSpineX = depthColumn.xMpt + depthColumn.widthMpt - 4_000;
  addLine(
    "node:depth-spine",
    "column-depth",
    depthGroupId,
    "depth-spine",
    depthSpineX,
    job.template.depthTransform.yStartMpt,
    depthSpineX,
    job.template.depthTransform.yEndMpt,
    "ink",
  );
  for (let depthFt = 0; depthFt <= job.document.referenceDepthRange.endFt; depthFt += 1) {
    const y = depthToYMpt(job, depthFt);
    const major = depthFt % 5 === 0;
    addLine(
      `node:depth-tick:${depthFt}`,
      "column-depth",
      depthGroupId,
      major ? "depth-major-tick" : "depth-minor-tick",
      depthSpineX - (major ? 8_000 : 4_000),
      y,
      depthSpineX,
      y,
      major ? "ink" : "rule",
    );
    if (!major) continue;
    const elevation = metadata.groundElevationFt - depthFt;
    addLine(
      `node:depth-grid:${depthFt}`,
      "column-depth",
      depthGroupId,
      "depth-major-grid",
      depthColumn.xMpt + depthColumn.widthMpt,
      y,
      depthBody.xMpt + depthBody.widthMpt,
      y,
      "lightRule",
    );
    addText(
      `node:elevation-label:${depthFt}`,
      "column-elevation",
      depthGroupId,
      "elevation-label",
      elevation.toFixed(1),
      rect(elevationColumn.xMpt + 1_000, y - 4_000, elevationColumn.widthMpt - 2_000, 8_000),
      "style-small",
      metadataProvenance,
      1,
      "no-wrap",
    );
    addText(
      `node:depth-label:${depthFt}`,
      "column-depth",
      depthGroupId,
      "depth-label",
      depthFt.toFixed(0),
      rect(depthColumn.xMpt + 1_000, y - 4_000, depthColumn.widthMpt - 2_000, 8_000),
      "style-small",
      sourceFor(job, job.document.identity.boringLogId, "reference-depth-range"),
      1,
      "no-wrap",
    );
  }

  const lithologyColumn = columnByRole(job, "lithology-pattern");
  const descriptionColumn = columnByRole(job, "material-description");
  for (const interval of job.document.lithologyIntervals) {
    const yFrom = depthToYMpt(job, interval.depthFromFt);
    const yTo = depthToYMpt(job, interval.depthToFt);
    addRect(
      `node:lithology:${interval.id}:description-fill`,
      `lithology:${interval.id}`,
      depthGroupId,
      "material-description-fill",
      rect(descriptionColumn.xMpt, yFrom, descriptionColumn.widthMpt, yTo - yFrom),
      interval.materialFillToken,
      null,
      interval.provenance,
    );
    addRect(
      `node:lithology:${interval.id}:pattern`,
      `lithology:${interval.id}`,
      depthGroupId,
      "lithology-pattern-interval",
      rect(lithologyColumn.xMpt, yFrom, lithologyColumn.widthMpt, yTo - yFrom),
      interval.patternId,
      "rule",
      interval.provenance,
    );
    addText(
      `node:lithology:${interval.id}:description`,
      `lithology:${interval.id}`,
      depthGroupId,
      "material-description-interval",
      interval.description,
      rect(
        descriptionColumn.xMpt + 3_000,
        yFrom + 3_000,
        descriptionColumn.widthMpt - 6_000,
        Math.max(8_000, yTo - yFrom - 6_000),
      ),
      "style-body",
      interval.provenance,
      Math.max(1, Math.floor((yTo - yFrom - 6_000) / 9_375)),
    );
    interval.transitions.forEach((transition, index) => {
      const transitionY = depthToYMpt(job, transition.depthFt);
      addLine(
        `node:lithology:${interval.id}:transition:${index + 1}:rule`,
        `lithology:${interval.id}:transition:${index + 1}`,
        depthGroupId,
        "material-transition-rule",
        descriptionColumn.xMpt,
        transitionY,
        descriptionColumn.xMpt + descriptionColumn.widthMpt,
        transitionY,
        "lightRule",
        interval.provenance,
        [asMpt(2_000), asMpt(1_000)],
      );
      addText(
        `node:lithology:${interval.id}:transition:${index + 1}:text`,
        `lithology:${interval.id}:transition:${index + 1}`,
        depthGroupId,
        "material-transition-text",
        transition.text,
        rect(
          descriptionColumn.xMpt + 4_000,
          transitionY + 1_000,
          descriptionColumn.widthMpt - 8_000,
          9_000,
        ),
        "style-small",
        interval.provenance,
        1,
      );
    });
    if (interval.depthToFt < job.document.referenceDepthRange.endFt) {
      addLine(
        `node:lithology:${interval.id}:boundary`,
        `lithology:${interval.id}`,
        depthGroupId,
        "material-boundary",
        lithologyColumn.xMpt,
        yTo,
        descriptionColumn.xMpt + descriptionColumn.widthMpt,
        yTo,
        "ink",
        interval.provenance,
        interval.boundaryKind === "gradational" ? [asMpt(3_000), asMpt(2_000)] : [],
      );
    }
  }

  addText(
    "node:log-completion-note",
    `lithology:${job.document.lithologyIntervals.at(-1)!.id}`,
    depthGroupId,
    "log-completion-note",
    `— Boring completed at ${metadata.completionDepthFt.toFixed(1)} ft. End of log.`,
    rect(
      descriptionColumn.xMpt + 4_000,
      job.template.depthTransform.yEndMpt + 10_000,
      descriptionColumn.widthMpt - 8_000,
      Math.max(
        8_000,
        depthBody.yMpt + depthBody.heightMpt - job.template.depthTransform.yEndMpt - 14_000,
      ),
    ),
    "style-small",
    metadataProvenance,
    2,
  );

  const sampleColumn = columnByRole(job, "sample");
  const recoveryColumn = columnByRole(job, "recovery");
  const blowsColumn = columnByRole(job, "blows");
  const nColumn = columnByRole(job, "n-value");
  for (const sample of job.document.samples) {
    const y = depthToYMpt(job, sample.depthFt);
    addLine(
      `node:sample:${sample.id}:row`,
      `sample:${sample.id}`,
      depthGroupId,
      "sample-depth-row",
      sampleColumn.xMpt,
      y,
      nColumn.xMpt + nColumn.widthMpt,
      y,
      "lightRule",
      sample.provenance,
    );
    const samplerX = sampleColumn.xMpt + 4_000;
    if (sample.symbol === "split-spoon") {
      addRect(
        `node:sample:${sample.id}:sampler`,
        `sample:${sample.id}`,
        depthGroupId,
        "sample-symbol-split-spoon",
        rect(samplerX, y - 5_000, 7_000, 10_000),
        "ink",
        "ink",
        sample.provenance,
      );
      addPath(
        `node:sample:${sample.id}:sampler-upper`,
        `sample:${sample.id}`,
        depthGroupId,
        "sample-symbol-split-spoon-cutout",
        [
          { xMpt: asMpt(samplerX + 1_000), yMpt: asMpt(y - 3_500) },
          { xMpt: asMpt(samplerX + 6_000), yMpt: asMpt(y - 3_500) },
          { xMpt: asMpt(samplerX + 3_500), yMpt: asMpt(y - 500) },
        ],
        true,
        "pageFill",
        null,
        sample.provenance,
      );
      addPath(
        `node:sample:${sample.id}:sampler-lower`,
        `sample:${sample.id}`,
        depthGroupId,
        "sample-symbol-split-spoon-cutout",
        [
          { xMpt: asMpt(samplerX + 1_000), yMpt: asMpt(y + 3_500) },
          { xMpt: asMpt(samplerX + 6_000), yMpt: asMpt(y + 3_500) },
          { xMpt: asMpt(samplerX + 3_500), yMpt: asMpt(y + 500) },
        ],
        true,
        "pageFill",
        null,
        sample.provenance,
      );
    }
    const cells: readonly [string, BoringLogColumnInput, string][] = [
      [sample.label, sampleColumn, "sample-label"],
      [`${sample.recoveryPercent}%`, recoveryColumn, "sample-recovery"],
      [formatBlowIncrements(sample.blowIncrements), blowsColumn, "sample-blows"],
      [sample.nValue === null ? "REF" : String(sample.nValue), nColumn, "sample-n-value"],
    ];
    cells.forEach(([content, column, role], index) =>
      addText(
        `node:sample:${sample.id}:cell:${index + 1}`,
        `sample:${sample.id}`,
        depthGroupId,
        role,
        content,
        rect(
          column.xMpt + (index === 0 ? 13_000 : 1_000),
          y - 4_500,
          column.widthMpt - (index === 0 ? 14_000 : 2_000),
          9_000,
        ),
        "style-body",
        sample.provenance,
        1,
        "no-wrap",
      ),
    );
  }

  const trackColumn = columnByRole(job, "penetration-moisture-plasticity");
  const axesById = new Map(job.document.dataTrack.axes.map((axis) => [axis.id, axis]));
  job.document.dataTrack.axes.forEach((axis, index) => {
    if (index > 0) {
      addLine(
        `node:data-axis:${axis.id}:authority`,
        `data-axis:${axis.id}`,
        depthGroupId,
        "data-axis-authority",
        trackColumn.xMpt,
        job.template.depthTransform.yStartMpt,
        trackColumn.xMpt + trackColumn.widthMpt,
        job.template.depthTransform.yStartMpt,
        "lightRule",
      );
    }
    if (index === 0) {
      for (let tick = axis.minimum; tick <= axis.maximum; tick += 25) {
        const x = valueToXMpt(trackColumn, axis.minimum, axis.maximum, tick);
        const labelWidthMpt = 14_000;
        const labelXMpt = Math.min(
          Math.max(x - labelWidthMpt / 2, trackColumn.xMpt),
          trackColumn.xMpt + trackColumn.widthMpt - labelWidthMpt,
        );
        addLine(
          `node:data-axis:grid:${tick}`,
          `data-axis:${axis.id}`,
          depthGroupId,
          "data-axis-grid",
          x,
          job.template.depthTransform.yStartMpt,
          x,
          job.template.depthTransform.yEndMpt,
          "lightRule",
        );
        addText(
          `node:data-axis:grid-label:${tick}`,
          `data-axis:${axis.id}`,
          depthGroupId,
          "data-axis-grid-label",
          String(tick),
          rect(labelXMpt, depthBody.yMpt + 15_000, labelWidthMpt, 7_000),
          "style-small",
          null,
          1,
          "no-wrap",
        );
      }
    }
  });
  const sampleById = new Map(job.document.samples.map((sample) => [sample.id, sample]));
  for (const layer of job.document.dataTrack.layers) {
    const axis = axesById.get(layer.axisId)!;
    if (layer.kind === "numeric-polyline") {
      const points = layer.values.map(([sampleId, value]) => {
        const sample = sampleById.get(sampleId)!;
        return {
          xMpt: valueToXMpt(trackColumn, axis.minimum, axis.maximum, value),
          yMpt: depthToYMpt(job, sample.depthFt),
        };
      });
      if (points.length >= 2) {
        addPath(
          `node:data-layer:${layer.id}:line`,
          `data-layer:${layer.id}`,
          depthGroupId,
          "data-polyline",
          points,
          false,
          null,
          layer.id === "layer-n-value" ? "nTrack" : "moistureTrack",
          layer.provenance,
          layer.id === "layer-moisture" ? [asMpt(3_000), asMpt(2_000)] : [],
        );
      }
      layer.values.forEach(([sampleId], index) => {
        const point = points[index]!;
        const sample = sampleById.get(sampleId)!;
        if (layer.id === "layer-n-value" && sample.refusal) {
          addPath(
            `node:data-layer:${layer.id}:point:${sampleId}`,
            `data-layer:${layer.id}:${sampleId}`,
            depthGroupId,
            "sample-refusal-glyph",
            [
              { xMpt: asMpt(point.xMpt - 2_000), yMpt: asMpt(point.yMpt - 2_500) },
              { xMpt: asMpt(point.xMpt + 1_500), yMpt: point.yMpt },
              { xMpt: asMpt(point.xMpt - 2_000), yMpt: asMpt(point.yMpt + 2_500) },
            ],
            false,
            null,
            "nTrack",
            layer.provenance,
          );
        } else if (layer.glyph === "filled-square") {
          addRect(
            `node:data-layer:${layer.id}:point:${sampleId}`,
            `data-layer:${layer.id}:${sampleId}`,
            depthGroupId,
            "data-point-filled-square",
            rect(point.xMpt - 1_500, point.yMpt - 1_500, 3_000, 3_000),
            "nTrack",
            "ink",
            layer.provenance,
          );
        } else {
          addPath(
            `node:data-layer:${layer.id}:point:${sampleId}`,
            `data-layer:${layer.id}:${sampleId}`,
            depthGroupId,
            "data-point-open-triangle",
            [
              { xMpt: point.xMpt, yMpt: asMpt(point.yMpt - 2_000) },
              { xMpt: asMpt(point.xMpt - 2_000), yMpt: asMpt(point.yMpt + 1_500) },
              { xMpt: asMpt(point.xMpt + 2_000), yMpt: asMpt(point.yMpt + 1_500) },
            ],
            true,
            "pageFill",
            "moistureTrack",
            layer.provenance,
          );
        }
      });
    } else {
      for (const [sampleId, first, second] of layer.values) {
        const sample = sampleById.get(sampleId)!;
        const y = depthToYMpt(job, sample.depthFt);
        const firstX = valueToXMpt(trackColumn, axis.minimum, axis.maximum, first);
        const secondX = valueToXMpt(trackColumn, axis.minimum, axis.maximum, second);
        addLine(
          `node:data-layer:${layer.id}:range:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-range",
          Math.min(firstX, secondX),
          y,
          Math.max(firstX, secondX),
          y,
          "plasticityTrack",
          layer.provenance,
        );
        addCircle(
          `node:data-layer:${layer.id}:first:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-range-endpoint-pl-open",
          firstX,
          y,
          1_750,
          "pageFill",
          layer.provenance,
          "plasticityTrack",
        );
        addCircle(
          `node:data-layer:${layer.id}:second:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-range-endpoint-ll-filled",
          secondX,
          y,
          1_750,
          "plasticityTrack",
          layer.provenance,
          "plasticityTrack",
        );
      }
    }
  }

  const remarksColumn = columnByRole(job, "remarks");
  for (const remark of job.document.remarks) {
    const yFrom = depthToYMpt(job, remark.depthFromFt);
    const yTo = depthToYMpt(job, remark.depthToFt);
    addText(
      `node:remark:${remark.id}`,
      `remark:${remark.id}`,
      depthGroupId,
      "remark-interval",
      remark.text,
      rect(
        remarksColumn.xMpt + 2_000,
        yFrom + 2_000,
        remarksColumn.widthMpt - 4_000,
        yTo - yFrom - 4_000,
      ),
      "style-small",
      sourceFor(job, remark.id, "text"),
      Math.max(1, Math.floor((yTo - yFrom - 4_000) / 9_375)),
    );
  }

  const footer = job.template.regions.find(({ role }) => role === "footer")!;
  const footerGroupId = "node:region-footer";
  const legendWidthMpt = 182_000;
  const notesWidthMpt = 258_000;
  const approvalX = footer.xMpt + legendWidthMpt + notesWidthMpt;
  addLine(
    "node:footer-legend-notes-divider",
    "footer-legend",
    footerGroupId,
    "footer-divider",
    footer.xMpt + legendWidthMpt,
    footer.yMpt,
    footer.xMpt + legendWidthMpt,
    footer.yMpt + footer.heightMpt,
    "lightRule",
  );
  addLine(
    "node:footer-notes-approval-divider",
    "footer-approval",
    footerGroupId,
    "footer-divider",
    approvalX,
    footer.yMpt,
    approvalX,
    footer.yMpt + footer.heightMpt,
    "lightRule",
  );
  addText(
    "node:footer-legend-heading",
    "footer-legend",
    footerGroupId,
    "footer-heading",
    "LEGEND — FULL KEY ON LEGEND SHEET",
    rect(footer.xMpt + 3_000, footer.yMpt + 3_000, legendWidthMpt - 6_000, 8_000),
    "style-heading",
    null,
    1,
    "no-wrap",
  );
  addText(
    "node:footer-notes-heading",
    "footer-notes",
    footerGroupId,
    "footer-heading",
    "NOTES",
    rect(footer.xMpt + legendWidthMpt + 5_000, footer.yMpt + 3_000, 90_000, 8_000),
    "style-heading",
    null,
    1,
    "no-wrap",
  );
  job.document.legend.forEach((item, index) => {
    const column = Math.floor(index / 5);
    const row = index % 5;
    const x = footer.xMpt + 3_000 + column * 89_000;
    const y = footer.yMpt + 14_000 + row * 15_000;
    const symbolProvenance = sourceFor(job, item.id, "symbol");
    const symbolId = `node:legend:${item.id}:symbol`;
    if (item.symbol === "split-spoon") {
      addRect(
        symbolId,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-split-spoon",
        rect(x, y, 6_000, 10_000),
        "ink",
        "ink",
        symbolProvenance,
      );
      addPath(
        `${symbolId}:upper`,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-split-spoon-cutout",
        [
          { xMpt: asMpt(x + 1_000), yMpt: asMpt(y + 1_500) },
          { xMpt: asMpt(x + 5_000), yMpt: asMpt(y + 1_500) },
          { xMpt: asMpt(x + 3_000), yMpt: asMpt(y + 4_250) },
        ],
        true,
        "pageFill",
        null,
        symbolProvenance,
      );
      addPath(
        `${symbolId}:lower`,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-split-spoon-cutout",
        [
          { xMpt: asMpt(x + 1_000), yMpt: asMpt(y + 8_500) },
          { xMpt: asMpt(x + 5_000), yMpt: asMpt(y + 8_500) },
          { xMpt: asMpt(x + 3_000), yMpt: asMpt(y + 5_750) },
        ],
        true,
        "pageFill",
        null,
        symbolProvenance,
      );
    } else if (item.symbol.startsWith("pattern-")) {
      addRect(
        symbolId,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-pattern",
        rect(x, y + 1_000, 10_000, 8_000),
        item.symbol,
        "rule",
        symbolProvenance,
      );
    } else if (item.symbol === "open-circle-range") {
      addLine(
        symbolId,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-plasticity-range",
        x + 1_000,
        y + 5_000,
        x + 9_000,
        y + 5_000,
        "plasticityTrack",
        symbolProvenance,
      );
      addCircle(
        `${symbolId}:first`,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-pl-open",
        x + 1_000,
        y + 5_000,
        1_500,
        "pageFill",
        symbolProvenance,
        "plasticityTrack",
      );
      addCircle(
        `${symbolId}:second`,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-ll-filled",
        x + 9_000,
        y + 5_000,
        1_500,
        "plasticityTrack",
        symbolProvenance,
        "plasticityTrack",
      );
    } else if (item.symbol === "open-triangle-line") {
      addLine(
        symbolId,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-moisture-line",
        x,
        y + 5_000,
        x + 10_000,
        y + 5_000,
        "moistureTrack",
        symbolProvenance,
        [asMpt(3_000), asMpt(2_000)],
      );
      addPath(
        `${symbolId}:point`,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-moisture-open-triangle",
        [
          { xMpt: asMpt(x + 5_000), yMpt: asMpt(y + 1_000) },
          { xMpt: asMpt(x + 1_500), yMpt: asMpt(y + 8_000) },
          { xMpt: asMpt(x + 8_500), yMpt: asMpt(y + 8_000) },
        ],
        true,
        "pageFill",
        "moistureTrack",
        symbolProvenance,
      );
    } else if (item.symbol.includes("line") && !item.symbol.includes("triangle")) {
      addLine(
        symbolId,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-line",
        x,
        y + 5_000,
        x + 10_000,
        y + 5_000,
        "ink",
        symbolProvenance,
        item.symbol === "dashed-line" ? [asMpt(2_000), asMpt(1_000)] : [],
      );
      if (item.symbol === "filled-square-line") {
        addRect(
          `${symbolId}:point`,
          `legend:${item.id}`,
          footerGroupId,
          "legend-symbol-filled-square",
          rect(x + 3_500, y + 3_500, 3_000, 3_000),
          "nTrack",
          "nTrack",
          symbolProvenance,
        );
      }
    } else {
      const downward = item.symbol.includes("down-triangle");
      const open = item.symbol.startsWith("open-");
      addPath(
        symbolId,
        `legend:${item.id}`,
        footerGroupId,
        "legend-symbol-triangle",
        downward
          ? [
              { xMpt: asMpt(x), yMpt: asMpt(y + 2_000) },
              { xMpt: asMpt(x + 10_000), yMpt: asMpt(y + 2_000) },
              { xMpt: asMpt(x + 5_000), yMpt: asMpt(y + 9_000) },
            ]
          : [
              { xMpt: asMpt(x + 5_000), yMpt: asMpt(y + 1_000) },
              { xMpt: asMpt(x), yMpt: asMpt(y + 9_000) },
              { xMpt: asMpt(x + 10_000), yMpt: asMpt(y + 9_000) },
            ],
        true,
        open ? "pageFill" : "ink",
        item.symbol === "open-triangle-line" ? "moistureTrack" : "ink",
        symbolProvenance,
      );
    }
    addText(
      `node:legend:${item.id}:label`,
      `legend:${item.id}`,
      footerGroupId,
      "legend-label",
      item.label,
      rect(x + 13_000, y, 73_000, 11_000),
      "style-small",
      sourceFor(job, item.id, "label"),
      1,
      "no-wrap",
    );
  });
  job.document.notes.forEach((note, index) => {
    const column = index >= 4 ? 1 : 0;
    const row = index % 4;
    const columnWidth = Math.floor((notesWidthMpt - 10_000) / 2);
    addText(
      `node:note:${index + 1}`,
      `note:${index + 1}`,
      footerGroupId,
      "publication-note",
      `${index + 1}. ${note}`,
      rect(
        footer.xMpt + legendWidthMpt + 5_000 + column * columnWidth,
        footer.yMpt + 14_000 + row * 20_000,
        columnWidth - 5_000,
        18_000,
      ),
      "style-small",
      sourceFor(job, `note-${index + 1}`, "text"),
      2,
    );
  });
  const approval = job.document.approval;
  addText(
    "node:approval:heading",
    "footer-approval",
    footerGroupId,
    "approval-heading",
    approval.heading,
    rect(
      approvalX + 7_000,
      footer.yMpt + 3_000,
      footer.xMpt + footer.widthMpt - approvalX - 14_000,
      8_000,
    ),
    "style-heading",
    sourceFor(job, "approval", "heading"),
    1,
    "no-wrap",
  );
  addRect(
    "node:approval:seal-box",
    "footer-approval",
    footerGroupId,
    "approval-seal-box",
    rect(
      approvalX + 7_000,
      footer.yMpt + 15_000,
      footer.xMpt + footer.widthMpt - approvalX - 14_000,
      45_000,
    ),
    null,
    "rule",
    sourceFor(job, "approval", "seal"),
  );
  addText(
    "node:approval:seal-label",
    "footer-approval",
    footerGroupId,
    "approval-seal-label",
    approval.sealPlaceholder,
    rect(
      approvalX + 12_000,
      footer.yMpt + 33_000,
      footer.xMpt + footer.widthMpt - approvalX - 24_000,
      9_000,
    ),
    "style-small",
    sourceFor(job, "approval", "seal"),
    1,
    "no-wrap",
  );
  addLine(
    "node:approval:signature-line",
    "footer-approval",
    footerGroupId,
    "approval-signature-line",
    approvalX + 7_000,
    footer.yMpt + 72_000,
    footer.xMpt + footer.widthMpt - 7_000,
    footer.yMpt + 72_000,
    "rule",
  );
  addText(
    "node:approval:signature",
    "footer-approval",
    footerGroupId,
    "approval-signature",
    `${approval.reviewerName} · ${approval.reviewedDate}`,
    rect(
      approvalX + 7_000,
      footer.yMpt + 75_000,
      footer.xMpt + footer.widthMpt - approvalX - 14_000,
      16_000,
    ),
    "style-small",
    sourceFor(job, "approval", "reviewer"),
    2,
  );

  const semanticOrder = nodes
    .map(({ semanticId }) => semanticId)
    .filter((semanticId, index, all) => all.indexOf(semanticId) === index);
  return { nodes, textRequests, semanticOrder };
}

function createPagePlan(job: BoringLogLayoutJobInput, draft: DraftScene): BoringLogPagePlan {
  const inputDigest = sha256CanonicalJson(job);
  return {
    contractVersion: boringLogRenderContractVersion,
    schemaVersion: boringLogPagePlanSchemaVersion,
    kind: "boring-log.page-plan",
    jobId: job.jobId,
    inputDigest,
    pages: [
      {
        pageId: job.document.identity.pageId,
        pageIndex: 0,
        widthMpt: job.template.page.widthMpt,
        heightMpt: job.template.page.heightMpt,
        depthRange: job.document.referenceDepthRange,
        depthTransform: job.template.depthTransform,
        regions: job.template.regions,
        columns: job.template.columns,
        semanticOrder: draft.semanticOrder,
      },
    ],
    overflow: "none",
    diagnostics: [],
  };
}

/** Pure phase one: validates inputs and freezes the exact Page Plan and text-measurement requests. */
export function prepareBoringLogLayout(
  input: unknown,
): BoringLogLayoutEngineResult<BoringLogLayoutPreparation> {
  const jobResult = validateBoringLogLayoutJobInput(input);
  if (!jobResult.accepted) {
    return rejected("BORING_LOG_LAYOUT_INPUT_REJECTED", jobResult.code);
  }
  try {
    const draft = buildDraft(jobResult.value);
    const planResult = validateBoringLogPagePlan(createPagePlan(jobResult.value, draft));
    if (!planResult.accepted) {
      return rejected("BORING_LOG_LAYOUT_PLAN_REJECTED", planResult.code);
    }
    return accepted(
      Object.freeze({
        job: jobResult.value,
        pagePlan: planResult.value,
        textRequests: Object.freeze(
          draft.textRequests.map((request) => Object.freeze({ ...request })),
        ),
      }),
    );
  } catch {
    return rejected("BORING_LOG_LAYOUT_PLAN_REJECTED", "BORING_LOG_LAYOUT_INTERNAL_INVARIANT");
  }
}

/** Pure phase two: consumes Layout Host text authority and resolves the common screen/PDF scene. */
export function resolveBoringLogPageScene(
  preparationInput: unknown,
  textResultsInput: unknown,
): BoringLogLayoutEngineResult<ResolvedBoringLogPageScene> {
  try {
    if (
      typeof preparationInput !== "object" ||
      preparationInput === null ||
      Array.isArray(preparationInput) ||
      !Array.isArray(textResultsInput)
    ) {
      return rejected("BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH", "PREPARATION_MALFORMED");
    }
    const prototype = Object.getPrototypeOf(preparationInput) as unknown;
    const keys = Reflect.ownKeys(preparationInput);
    if (
      (prototype !== Object.prototype && prototype !== null) ||
      keys.length !== 3 ||
      keys.some(
        (key) => typeof key !== "string" || !["job", "pagePlan", "textRequests"].includes(key),
      )
    ) {
      return rejected("BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH", "PREPARATION_MALFORMED");
    }
    const preparationRecord = preparationInput as Record<string, unknown>;
    for (const key of ["job", "pagePlan", "textRequests"]) {
      const descriptor = Object.getOwnPropertyDescriptor(preparationInput, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return rejected("BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH", "PREPARATION_MALFORMED");
      }
    }
    const prepared = prepareBoringLogLayout(preparationRecord["job"]);
    if (!prepared.accepted) return prepared;
    const suppliedPagePlan = validateBoringLogPagePlan(preparationRecord["pagePlan"]);
    if (
      !suppliedPagePlan.accepted ||
      sha256CanonicalJson(suppliedPagePlan.value) !==
        sha256CanonicalJson(prepared.value.pagePlan) ||
      sha256CanonicalJson(preparationRecord["textRequests"]) !==
        sha256CanonicalJson(prepared.value.textRequests)
    ) {
      return rejected("BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH", "PREPARATION_DRIFT");
    }
    const draft = buildDraft(prepared.value.job);
    const resources = {
      visualTokens: prepared.value.job.template.visualTokens,
      textStyles: prepared.value.job.template.styles,
      patterns: [
        ...new Set([
          ...prepared.value.job.document.lithologyIntervals.map(({ patternId }) => patternId),
          ...prepared.value.job.document.legend
            .map(({ symbol }) => symbol)
            .filter((symbol) => symbol.startsWith("pattern-")),
        ]),
      ].map((patternId) => ({
        id: patternId,
        kind: patternId.includes("gravel") ? ("dot-ring" as const) : ("horizontal-dash" as const),
        foregroundToken: patternId.includes("blue") ? "selection" : "ink",
        backgroundToken: patternId.includes("gravel") ? "lithologyGravelFill" : "lithologySiltFill",
        spacingMpt: asMpt(patternId.includes("gravel") ? 6_000 : 5_000),
        markSizeMpt: asMpt(patternId.includes("gravel") ? 1_500 : 2_000),
        strokeWidthMpt: asMpt(500),
      })),
    };
    const pages = [
      {
        pageId: prepared.value.job.document.identity.pageId,
        widthMpt: prepared.value.job.template.page.widthMpt,
        heightMpt: prepared.value.job.template.page.heightMpt,
        rootNodeId: "node:page-root",
        semanticOrder: draft.semanticOrder,
        nodes: draft.nodes,
      },
    ];
    const provisionalScene = validateResolvedBoringLogPageScene({
      contractVersion: boringLogRenderContractVersion,
      schemaVersion: resolvedBoringLogPageSceneSchemaVersion,
      kind: "boring-log.resolved-page-scene",
      jobId: prepared.value.job.jobId,
      inputDigest: prepared.value.pagePlan.inputDigest,
      pagePlan: prepared.value.pagePlan,
      textRequests: prepared.value.textRequests,
      textResults: textResultsInput,
      resources,
      pages,
      diagnostics: [],
    });
    if (!provisionalScene.accepted) {
      return rejected("BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH", provisionalScene.code);
    }
    const textResults = provisionalScene.value.textResults;
    const diagnostics: BoringLogRenderDiagnostic[] = textResults
      .filter(({ overflow }) => overflow !== "none")
      .map(({ measurementId, overflow }) => ({
        code: "BORING_LOG_TEXT_OVERFLOW",
        severity: overflow === "continued" ? "warning" : "error",
        message: `Text measurement ${measurementId} resolved with ${overflow}`,
        semanticId:
          prepared.value.textRequests.find((request) => request.measurementId === measurementId)
            ?.sourceIdentity ?? null,
      }));
    const pagePlan: BoringLogPagePlan = {
      ...prepared.value.pagePlan,
      overflow:
        diagnostics.length === 0
          ? "none"
          : textResults.some(({ overflow }) => overflow === "continued")
            ? "continued"
            : "clipped-with-diagnostic",
      diagnostics,
    };
    const scene: ResolvedBoringLogPageScene = {
      contractVersion: boringLogRenderContractVersion,
      schemaVersion: resolvedBoringLogPageSceneSchemaVersion,
      kind: "boring-log.resolved-page-scene",
      jobId: prepared.value.job.jobId,
      inputDigest: prepared.value.pagePlan.inputDigest,
      pagePlan,
      textRequests: prepared.value.textRequests,
      textResults,
      resources,
      pages,
      diagnostics,
    };
    const sceneResult = validateResolvedBoringLogPageScene(scene);
    if (!sceneResult.accepted) {
      return rejected("BORING_LOG_LAYOUT_SCENE_REJECTED", sceneResult.code);
    }
    return accepted(sceneResult.value);
  } catch {
    return rejected("BORING_LOG_LAYOUT_SCENE_REJECTED", "BORING_LOG_LAYOUT_INTERNAL_INVARIANT");
  }
}
