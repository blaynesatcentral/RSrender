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
  half: "left" | "right",
): Mpt {
  const halfWidth = Math.floor(column.widthMpt / 2);
  const xStart = column.xMpt + (half === "left" ? 3_000 : halfWidth + 3_000);
  const width = halfWidth - 6_000;
  return asMpt(xStart + Math.round(((value - axisMinimum) / (axisMaximum - axisMinimum)) * width));
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
      strokeToken: "ink",
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
    const style = styleById(job, styleId);
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
      maximumWidthMpt: frame.widthMpt,
      maximumLines,
      wrapPolicy,
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
      styleId,
      content,
      frame,
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
    rect(header.xMpt + 8_000, header.yMpt + 7_000, 215_000, 18_000),
    "style-company",
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
    rect(header.xMpt + 225_000, header.yMpt + 5_000, 230_000, 22_000),
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
    rect(header.xMpt + 465_000, header.yMpt + 8_000, 105_000, 12_000),
    "style-small",
    metadataProvenance,
    1,
    "no-wrap",
  );
  const metadataLines = [
    `PROJECT: ${metadata.projectName}  |  NO. ${metadata.projectNumber}`,
    `LOCATION: ${metadata.location}  |  ${metadata.coordinates}`,
    `ELEVATION: ${metadata.groundElevationFt.toFixed(1)} ft  |  DRILLED: ${metadata.drilledDate}`,
    `METHOD: ${metadata.boringMethod}  |  HAMMER: ${metadata.hammerType}, ${metadata.hammerDrop}  |  LOGGED BY: ${metadata.loggedBy}`,
  ];
  metadataLines.forEach((content, index) =>
    addText(
      `node:header-project-metadata:${index + 1}`,
      "header-project-metadata",
      "node:region-header",
      "project-metadata-line",
      content,
      rect(header.xMpt + 8_000, header.yMpt + 31_000 + index * 10_000, 562_000, 9_000),
      "style-small",
      metadataProvenance,
      1,
      "no-wrap",
    ),
  );

  const depthBody = job.template.regions.find(({ role }) => role === "depth-body")!;
  const depthGroupId = "node:region-depth-body";
  const columnLabels: Readonly<Record<string, string>> = {
    "elevation-ruler": "ELEV.",
    "depth-ruler": "DEPTH",
    "lithology-pattern": "LITH.",
    "material-description": "MATERIAL DESCRIPTION",
    sample: "SAMPLE",
    recovery: "REC.",
    blows: "BLOWS",
    "n-value": "N",
    "penetration-moisture-plasticity": "PENETRATION / WATER / PLASTICITY",
    remarks: "REMARKS",
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
      "style-heading",
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
  for (let depthFt = 0; depthFt <= job.document.referenceDepthRange.endFt; depthFt += 5) {
    const y = depthToYMpt(job, depthFt);
    const elevation = metadata.groundElevationFt - depthFt;
    addLine(
      `node:depth-tick:${depthFt}`,
      "column-depth",
      depthGroupId,
      "depth-major-tick",
      elevationColumn.xMpt,
      y,
      depthColumn.xMpt + depthColumn.widthMpt,
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
      `${interval.classification} — ${interval.description}`,
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
    const cells: readonly [string, BoringLogColumnInput, string][] = [
      [sample.label, sampleColumn, "sample-label"],
      [`${sample.recoveryPercent}%`, recoveryColumn, "sample-recovery"],
      [sample.blowsPerSixInches.join("/"), blowsColumn, "sample-blows"],
      [String(sample.nValue), nColumn, "sample-n-value"],
    ];
    cells.forEach(([content, column, role], index) =>
      addText(
        `node:sample:${sample.id}:cell:${index + 1}`,
        `sample:${sample.id}`,
        depthGroupId,
        role,
        content,
        rect(column.xMpt + 1_000, y - 4_500, column.widthMpt - 2_000, 9_000),
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
    const half = index === 0 ? "left" : "right";
    const xMin = valueToXMpt(trackColumn, axis.minimum, axis.maximum, axis.minimum, half);
    const xMax = valueToXMpt(trackColumn, axis.minimum, axis.maximum, axis.maximum, half);
    addLine(
      `node:data-axis:${axis.id}:minimum`,
      `data-axis:${axis.id}`,
      depthGroupId,
      "data-axis-minimum",
      xMin,
      job.template.depthTransform.yStartMpt,
      xMin,
      job.template.depthTransform.yEndMpt,
      "lightRule",
    );
    addLine(
      `node:data-axis:${axis.id}:maximum`,
      `data-axis:${axis.id}`,
      depthGroupId,
      "data-axis-maximum",
      xMax,
      job.template.depthTransform.yStartMpt,
      xMax,
      job.template.depthTransform.yEndMpt,
      "lightRule",
    );
    addText(
      `node:data-axis:${axis.id}:label`,
      `data-axis:${axis.id}`,
      depthGroupId,
      "data-axis-label",
      index === 0
        ? `N (${axis.unit}) ${axis.minimum}–${axis.maximum}`
        : `Water content (%) ${axis.minimum}–${axis.maximum}`,
      rect(
        trackColumn.xMpt + index * Math.floor(trackColumn.widthMpt / 2) + 1_000,
        depthBody.yMpt + 13_000,
        Math.floor(trackColumn.widthMpt / 2) - 2_000,
        10_000,
      ),
      "style-small",
      null,
      1,
      "no-wrap",
    );
  });
  const sampleById = new Map(job.document.samples.map((sample) => [sample.id, sample]));
  for (const layer of job.document.dataTrack.layers) {
    const axis = axesById.get(layer.axisId)!;
    const axisIndex = job.document.dataTrack.axes.findIndex(({ id }) => id === axis.id);
    const half = axisIndex === 0 ? "left" : "right";
    if (layer.kind === "numeric-polyline") {
      const points = layer.values.map(([sampleId, value]) => {
        const sample = sampleById.get(sampleId)!;
        return {
          xMpt: valueToXMpt(trackColumn, axis.minimum, axis.maximum, value, half),
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
          layer.id === "layer-n-value" ? "selection" : "secondaryInk",
          layer.provenance,
        );
      }
      layer.values.forEach(([sampleId, value], index) => {
        const point = points[index]!;
        if (layer.glyph === "filled-square") {
          addRect(
            `node:data-layer:${layer.id}:point:${sampleId}`,
            `data-layer:${layer.id}:${sampleId}`,
            depthGroupId,
            "data-point-filled-square",
            rect(point.xMpt - 1_500, point.yMpt - 1_500, 3_000, 3_000),
            "selection",
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
            "secondaryInk",
            layer.provenance,
          );
        }
        addText(
          `node:data-layer:${layer.id}:value:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-point-value",
          String(value),
          rect(point.xMpt + 2_000, point.yMpt - 4_000, 16_000, 8_000),
          "style-small",
          layer.provenance,
          1,
          "no-wrap",
        );
      });
    } else {
      for (const [sampleId, first, second] of layer.values) {
        const sample = sampleById.get(sampleId)!;
        const y = depthToYMpt(job, sample.depthFt);
        const firstX = valueToXMpt(trackColumn, axis.minimum, axis.maximum, first, half);
        const secondX = valueToXMpt(trackColumn, axis.minimum, axis.maximum, second, half);
        addLine(
          `node:data-layer:${layer.id}:range:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-range",
          Math.min(firstX, secondX),
          y,
          Math.max(firstX, secondX),
          y,
          "secondaryInk",
          layer.provenance,
        );
        addCircle(
          `node:data-layer:${layer.id}:first:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-range-endpoint",
          firstX,
          y,
          1_750,
          "pageFill",
          layer.provenance,
        );
        addCircle(
          `node:data-layer:${layer.id}:second:${sampleId}`,
          `data-layer:${layer.id}:${sampleId}`,
          depthGroupId,
          "data-range-endpoint",
          secondX,
          y,
          1_750,
          "pageFill",
          layer.provenance,
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
      "style-body",
      sourceFor(job, remark.id, "text"),
      Math.max(1, Math.floor((yTo - yFrom - 4_000) / 9_375)),
    );
  }

  const footer = job.template.regions.find(({ role }) => role === "footer")!;
  const footerGroupId = "node:region-footer";
  const legendColumnOffsetsMpt = [0, 76_000, 152_000, 246_000, 322_000] as const;
  job.document.legend.forEach((item, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = footer.xMpt + 3_000 + legendColumnOffsetsMpt[column]!;
    const y = footer.yMpt + 3_000 + row * 9_000;
    addCircle(
      `node:legend:${item.id}:symbol`,
      `legend:${item.id}`,
      footerGroupId,
      "legend-symbol",
      x + 2_500,
      y + 3_500,
      1_500,
      item.symbol.includes("filled") ? "ink" : "pageFill",
      sourceFor(job, item.id, "symbol"),
    );
    addText(
      `node:legend:${item.id}:label`,
      `legend:${item.id}`,
      footerGroupId,
      "legend-label",
      item.label,
      rect(x + 6_000, y, 67_000, 8_000),
      "style-small",
      sourceFor(job, item.id, "label"),
      1,
      "no-wrap",
    );
  });
  job.document.notes.forEach((note, index) => {
    const column = index >= 4 ? 1 : 0;
    const row = index % 4;
    addText(
      `node:note:${index + 1}`,
      `note:${index + 1}`,
      footerGroupId,
      "publication-note",
      `${index + 1}. ${note}`,
      rect(
        footer.xMpt + 3_000 + column * 191_000,
        footer.yMpt + 24_000 + row * 9_000,
        186_000,
        8_000,
      ),
      "style-small",
      sourceFor(job, `note-${index + 1}`, "text"),
      1,
      "no-wrap",
    );
  });
  const approval = job.document.approval;
  const approvalLines = [
    approval.heading,
    approval.sealPlaceholder,
    approval.reviewerName,
    approval.reviewedDate,
  ];
  approvalLines.forEach((content, index) =>
    addText(
      `node:approval:${index + 1}`,
      "footer-approval",
      footerGroupId,
      "approval-line",
      content,
      rect(footer.xMpt + 390_000, footer.yMpt + 25_000 + index * 9_000, 188_000, 8_000),
      index === 0 ? "style-heading" : "style-small",
      sourceFor(job, "approval", `line-${index + 1}`),
      1,
      "no-wrap",
    ),
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
        ...new Set(
          prepared.value.job.document.lithologyIntervals.map(({ patternId }) => patternId),
        ),
      ].map((patternId) => ({
        id: patternId,
        kind: patternId.includes("gravel") ? ("dot-ring" as const) : ("line-hatch" as const),
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
