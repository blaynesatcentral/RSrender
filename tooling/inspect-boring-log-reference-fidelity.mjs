import {
  sha256CanonicalJson,
  validateResolvedBoringLogPageScene,
} from "../packages/contracts/dist/index.js";

const dataSemanticPrefixes = Object.freeze(["lithology:", "sample:", "remark:", "data-layer:"]);

// Client-content-free registration measured from the supplied 2448 x 3168 JPEG at 288 dpi.
// Four source pixels equal one PDF point. Values are rule centers; tolerance includes JPEG
// quantization and the oracle's declared 0.5 mm registration allowance.
export const BORING_LOG_REFERENCE_REGISTRATION = Object.freeze({
  schema: "rsrender.bld030.clean-room-reference-registration.v1",
  sourceGeometry: Object.freeze({ widthPx: 2448, heightPx: 3168, dpi: 288 }),
  tolerancePt: 1.417,
  outerHorizontalRuleXPt: Object.freeze([24, 587.75]),
  internalVerticalRuleXPt: Object.freeze([
    52.25, 80.875, 109.875, 295.625, 327.375, 347.5, 382.125, 403.625, 504.5,
  ]),
  majorHorizontalRuleYPt: Object.freeze([101.625, 130.5, 611.25, 670.375]),
  plotGridXPt: Object.freeze([404, 429.25, 454.375, 479.625, 504.5]),
});

function compareRegistration(actual, expected, tolerance, code, diagnostics, deltas) {
  if (actual.length !== expected.length) {
    diagnostics.add(`${code}_COUNT_MISMATCH`);
    return;
  }
  actual.forEach((value, index) => {
    if (!Number.isSafeInteger(value) || typeof expected[index] !== "number") {
      diagnostics.add(`${code}_VALUE_INVALID:${index}`);
      return;
    }
    const actualPt = value / 1_000;
    const deltaPt = actualPt - expected[index];
    deltas.push(Object.freeze({ code, index, expectedPt: expected[index], actualPt, deltaPt }));
    if (Math.abs(deltaPt) > tolerance) diagnostics.add(`${code}_OUTSIDE_TOLERANCE:${index}`);
  });
}

function sortedCounts(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function nodeCoordinates(node) {
  if (node.kind === "group" || node.kind === "rect" || node.kind === "text") {
    return [
      node.bounds?.xMpt ?? node.frame.xMpt,
      node.bounds?.yMpt ?? node.frame.yMpt,
      (node.bounds?.xMpt ?? node.frame.xMpt) + (node.bounds?.widthMpt ?? node.frame.widthMpt),
      (node.bounds?.yMpt ?? node.frame.yMpt) + (node.bounds?.heightMpt ?? node.frame.heightMpt),
    ];
  }
  if (node.kind === "line") {
    return [node.from.xMpt, node.from.yMpt, node.to.xMpt, node.to.yMpt];
  }
  if (node.kind === "path") return node.points.flatMap(({ xMpt, yMpt }) => [xMpt, yMpt]);
  return [
    node.center.xMpt - node.radiusMpt,
    node.center.yMpt - node.radiusMpt,
    node.center.xMpt + node.radiusMpt,
    node.center.yMpt + node.radiusMpt,
  ];
}

export function inspectBoringLogReferenceFidelity({ scene, oracle }) {
  const diagnostics = new Set();
  const registrationDeltas = [];
  const validated = validateResolvedBoringLogPageScene(scene);
  if (!validated.accepted) {
    return Object.freeze({
      schema: "rsrender.bld030.reference-fidelity-inspection.v1",
      result: "FAIL",
      diagnostics: Object.freeze([`SCENE_CONTRACT_REJECTED:${validated.code}`]),
    });
  }
  const page = scene.pages[0];
  const plannedPage = scene.pagePlan.pages[0];
  if (
    scene.pages.length !== oracle.expectedCounts.pages ||
    page === undefined ||
    plannedPage === undefined
  ) {
    diagnostics.add("REFERENCE_PAGE_COUNT_MISMATCH");
  }
  if (page === undefined || plannedPage === undefined) {
    return Object.freeze({
      schema: "rsrender.bld030.reference-fidelity-inspection.v1",
      result: "FAIL",
      diagnostics: Object.freeze([...diagnostics].sort()),
    });
  }
  const nodes = page.nodes;
  const roles = sortedCounts(nodes.map(({ role }) => role));
  const semanticFirstOrder = [];
  const seenSemanticIds = new Set();
  for (const node of nodes) {
    if (!seenSemanticIds.has(node.semanticId)) {
      seenSemanticIds.add(node.semanticId);
      semanticFirstOrder.push(node.semanticId);
    }
  }
  if (
    page.widthMpt !== oracle.geometryAnchors.page.widthMpt ||
    page.heightMpt !== oracle.geometryAnchors.page.heightMpt
  ) {
    diagnostics.add("REFERENCE_PAGE_GEOMETRY_MISMATCH");
  }
  if (!nodes.every(({ order }, index) => order === index))
    diagnostics.add("REFERENCE_NODE_ORDER_MISMATCH");
  if (JSON.stringify(page.semanticOrder) !== JSON.stringify(semanticFirstOrder)) {
    diagnostics.add("REFERENCE_SEMANTIC_ORDER_MISMATCH");
  }
  const columns = plannedPage.columns;
  const verticalEdges =
    columns.length === 0
      ? []
      : [...columns.map(({ xMpt }) => xMpt), columns.at(-1).xMpt + columns.at(-1).widthMpt];
  if (
    JSON.stringify(verticalEdges) !== JSON.stringify(oracle.geometryAnchors.majorVerticalEdgesMpt)
  ) {
    diagnostics.add("REFERENCE_MAJOR_VERTICAL_EDGES_MISMATCH");
  }
  compareRegistration(
    [verticalEdges[0], verticalEdges.at(-1)],
    BORING_LOG_REFERENCE_REGISTRATION.outerHorizontalRuleXPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "REFERENCE_OUTER_X",
    diagnostics,
    registrationDeltas,
  );
  compareRegistration(
    verticalEdges.slice(1, -1),
    BORING_LOG_REFERENCE_REGISTRATION.internalVerticalRuleXPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "REFERENCE_INTERNAL_X",
    diagnostics,
    registrationDeltas,
  );
  const regions = plannedPage.regions;
  const regionByRole = new Map(regions.map((region) => [region.role, region]));
  const header = regionByRole.get("header");
  const body = regionByRole.get("depth-body");
  const footer = regionByRole.get("footer");
  const horizontalEdges =
    header && body && footer
      ? [
          header.yMpt,
          header.yMpt + header.heightMpt,
          body.yMpt,
          plannedPage.depthTransform.yStartMpt,
          plannedPage.depthTransform.yEndMpt,
          body.yMpt + body.heightMpt,
          footer.yMpt,
          footer.yMpt + footer.heightMpt,
        ]
      : [];
  if (
    JSON.stringify(horizontalEdges) !==
    JSON.stringify(oracle.geometryAnchors.majorHorizontalEdgesMpt)
  ) {
    diagnostics.add("REFERENCE_MAJOR_HORIZONTAL_EDGES_MISMATCH");
  }
  compareRegistration(
    [horizontalEdges[1], horizontalEdges[3], horizontalEdges[4], horizontalEdges[5]],
    BORING_LOG_REFERENCE_REGISTRATION.majorHorizontalRuleYPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "REFERENCE_MAJOR_Y",
    diagnostics,
    registrationDeltas,
  );
  const plotGridXMpt = nodes
    .filter(({ role, kind }) => role === "data-axis-grid" && kind === "line")
    .map(({ from }) => from.xMpt)
    .sort((left, right) => left - right);
  compareRegistration(
    plotGridXMpt,
    BORING_LOG_REFERENCE_REGISTRATION.plotGridXPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "REFERENCE_PLOT_GRID_X",
    diagnostics,
    registrationDeltas,
  );
  if (
    plannedPage.depthRange.startFt !== oracle.geometryAnchors.depth.startFt ||
    plannedPage.depthRange.endFt !== oracle.geometryAnchors.depth.endFt ||
    plannedPage.depthTransform.yStartMpt !== oracle.geometryAnchors.depth.yStartMpt ||
    plannedPage.depthTransform.yEndMpt !== oracle.geometryAnchors.depth.yEndMpt
  ) {
    diagnostics.add("REFERENCE_DEPTH_TRANSFORM_MISMATCH");
  }
  const columnRoles = new Set(columns.map(({ role }) => role));
  if (oracle.requiredColumnRoles.some((role) => !columnRoles.has(role))) {
    diagnostics.add("REFERENCE_COLUMN_ROLE_MISSING");
  }
  const sceneRoles = new Set(nodes.map(({ role }) => role));
  for (const role of [
    "company-name",
    "document-title",
    "project-metadata-label",
    "project-metadata-value",
    "lithology-pattern-interval",
    "material-description-interval",
    "sample-symbol-split-spoon",
    "sample-recovery",
    "sample-blows",
    "sample-n-value",
    "data-polyline",
    "data-range",
    "remark-interval",
    "legend-label",
    "publication-note",
    "approval-seal-box",
    "approval-signature-line",
  ]) {
    if (!sceneRoles.has(role)) diagnostics.add(`REFERENCE_ROLE_MISSING:${role}`);
  }
  const headings = Object.fromEntries(
    nodes
      .filter(({ role, kind }) => role === "log-column-heading" && kind === "text")
      .map(({ semanticId, content }) => [semanticId, content]),
  );
  const requiredHeadings = Object.freeze({
    "column-elevation": "ELEV\nFT",
    "column-depth": "DEPTH\nFT",
    "column-lithology": "USCS",
    "column-description": "MATERIAL DESCRIPTION",
    "column-sample": "SAMPLE",
    "column-recovery": "REC\n%",
    "column-blows": "BLOWS\n/6 IN",
    "column-n-value": "N",
    "column-data-track": "PENETRATION N · MOISTURE W% · PL–LL",
    "column-remarks": "REMARKS & FIELD NOTES",
  });
  if (JSON.stringify(headings) !== JSON.stringify(requiredHeadings)) {
    diagnostics.add("REFERENCE_COLUMN_HEADING_GRAMMAR_MISMATCH");
  }
  const plotTickLabels = nodes
    .filter(({ role, kind }) => role === "data-axis-grid-label" && kind === "text")
    .map(({ content }) => Number(content));
  if (JSON.stringify(plotTickLabels) !== JSON.stringify([0, 25, 50, 75, 100])) {
    diagnostics.add("REFERENCE_PLOT_TICK_GRAMMAR_MISMATCH");
  }
  const refusalNodes = nodes.filter(({ role }) => role === "sample-refusal-glyph");
  if (
    refusalNodes.length !== 2 ||
    refusalNodes.some(({ semanticId }) => !semanticId.startsWith("data-layer:layer-n-value:"))
  ) {
    diagnostics.add("REFERENCE_REFUSAL_PLOT_COVERAGE_MISMATCH");
  }
  const moistureLine = nodes.find(
    ({ role, semanticId, kind }) =>
      role === "data-polyline" && semanticId === "data-layer:layer-moisture" && kind === "path",
  );
  if (moistureLine === undefined || moistureLine.dashMpt.length === 0) {
    diagnostics.add("REFERENCE_MOISTURE_DASH_MISSING");
  }
  if (
    roles["data-range-endpoint-pl-open"] !== 6 ||
    roles["data-range-endpoint-ll-filled"] !== 6 ||
    roles["legend-symbol-pl-open"] !== 1 ||
    roles["legend-symbol-ll-filled"] !== 1
  ) {
    diagnostics.add("REFERENCE_PL_LL_SYMBOL_GRAMMAR_MISMATCH");
  }
  if (
    roles["legend-symbol-split-spoon-cutout"] !== 2 ||
    roles["legend-symbol-moisture-line"] !== 1 ||
    roles["legend-symbol-moisture-open-triangle"] !== 1
  ) {
    diagnostics.add("REFERENCE_LEGEND_BODY_SYMBOL_PARITY_MISMATCH");
  }
  if (
    scene.resources.patterns.filter(({ kind }) => kind === "horizontal-dash").length !== 2 ||
    nodes
      .filter(({ role, kind }) => role === "material-description-interval" && kind === "text")
      .some(({ content }) => content.includes(" — "))
  ) {
    diagnostics.add("REFERENCE_LITHOLOGY_GRAMMAR_MISMATCH");
  }
  const expected = oracle.expectedCounts;
  const countChecks = [
    [roles["lithology-pattern-interval"], expected.lithologyIntervals, "LITHOLOGY"],
    [roles["sample-label"], expected.samples, "SAMPLES"],
    [roles["remark-interval"], expected.remarks, "REMARKS"],
    [roles["legend-label"], expected.legendItems, "LEGEND"],
    [roles["publication-note"], expected.notes, "NOTES"],
  ];
  for (const [actual, expectedCount, label] of countChecks) {
    if (actual !== expectedCount) diagnostics.add(`REFERENCE_${label}_COUNT_MISMATCH`);
  }
  const plotLayerIds = new Set(
    nodes
      .filter(({ semanticId }) => semanticId.startsWith("data-layer:"))
      .map(({ semanticId }) => semanticId.replace(/:sample-[0-9]+$/u, "")),
  );
  if (plotLayerIds.size !== expected.dataLayers)
    diagnostics.add("REFERENCE_DATA_LAYER_COUNT_MISMATCH");
  const axisIds = new Set(
    nodes
      .filter(({ semanticId }) => semanticId.startsWith("data-axis:"))
      .map(({ semanticId }) => semanticId),
  );
  if (axisIds.size !== expected.axes) diagnostics.add("REFERENCE_AXIS_COUNT_MISMATCH");
  if (
    scene.resources.patterns.length < 2 ||
    new Set(scene.resources.patterns.map(({ kind }) => kind)).size < 2
  ) {
    diagnostics.add("REFERENCE_LITHOLOGY_PATTERN_VARIETY_MISSING");
  }
  const textNodes = nodes.filter(({ kind }) => kind === "text");
  const requests = new Map(scene.textRequests.map((request) => [request.measurementId, request]));
  const results = new Map(scene.textResults.map((result) => [result.measurementId, result]));
  if (
    textNodes.some(({ measurementId, content }) => {
      const request = requests.get(measurementId);
      const result = results.get(measurementId);
      return (
        request === undefined ||
        result === undefined ||
        request.text !== content ||
        result.overflow !== "none"
      );
    })
  ) {
    diagnostics.add("REFERENCE_TEXT_AUTHORITY_MISMATCH");
  }
  if (scene.diagnostics.some(({ severity }) => severity === "error")) {
    diagnostics.add("REFERENCE_SCENE_ERROR_DIAGNOSTIC");
  }
  if (nodes.some((node) => nodeCoordinates(node).some((value) => !Number.isSafeInteger(value)))) {
    diagnostics.add("REFERENCE_NON_INTEGER_GEOMETRY");
  }
  if (
    nodes.some((node) => {
      const coordinates = nodeCoordinates(node);
      for (let index = 0; index < coordinates.length; index += 2) {
        const x = coordinates[index];
        const y = coordinates[index + 1];
        if (x < 0 || x > page.widthMpt || y < 0 || y > page.heightMpt) return true;
      }
      return false;
    })
  ) {
    diagnostics.add("REFERENCE_NODE_OUTSIDE_PAGE");
  }
  const dataNodes = nodes.filter(({ semanticId }) =>
    dataSemanticPrefixes.some((prefix) => semanticId.startsWith(prefix)),
  );
  if (dataNodes.some(({ provenance }) => provenance === null)) {
    diagnostics.add("REFERENCE_DATA_PROVENANCE_MISSING");
  }
  const provenanceCounts = sortedCounts(
    nodes.map(({ provenance }) => provenance?.provenanceClass ?? "structural-null"),
  );
  const normalizedRegistration = Object.freeze({
    verticalEdgesPermille: Object.freeze(
      verticalEdges.map((edge) => Math.round((edge * 1_000_000) / page.widthMpt)),
    ),
    horizontalEdgesPermille: Object.freeze(
      horizontalEdges.map((edge) => Math.round((edge * 1_000_000) / page.heightMpt)),
    ),
  });
  const summary = Object.freeze({
    page: Object.freeze({ widthMpt: page.widthMpt, heightMpt: page.heightMpt }),
    nodeCount: nodes.length,
    semanticCount: page.semanticOrder.length,
    roleCounts: Object.freeze(roles),
    headings: Object.freeze(headings),
    provenanceCounts: Object.freeze(provenanceCounts),
    textRequestCount: scene.textRequests.length,
    textLineCount: scene.textResults.reduce((total, result) => total + result.lines.length, 0),
    verticalEdgesMpt: Object.freeze(verticalEdges),
    horizontalEdgesMpt: Object.freeze(horizontalEdges),
    normalizedRegistration,
    referenceRegistration: Object.freeze({
      registrationRevision: BORING_LOG_REFERENCE_REGISTRATION.schema,
      tolerancePt: BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
      deltas: Object.freeze(registrationDeltas),
    }),
    nodeOrderDigest: sha256CanonicalJson(
      nodes.map(({ id, order, parentId }) => ({ id, order, parentId })),
    ),
    semanticOrderDigest: sha256CanonicalJson(page.semanticOrder),
    textSourceRangeDigest: sha256CanonicalJson(
      scene.textResults.map(({ measurementId, lines }) => ({
        measurementId,
        lines: lines.map(({ sourceStartUtf16, sourceEndUtf16 }) => ({
          sourceStartUtf16,
          sourceEndUtf16,
        })),
      })),
    ),
  });
  return Object.freeze({
    schema: "rsrender.bld030.reference-fidelity-inspection.v1",
    result: diagnostics.size === 0 ? "PASS" : "FAIL",
    diagnostics: Object.freeze([...diagnostics].sort()),
    oracleDigest: sha256CanonicalJson(oracle),
    sceneInputDigest: scene.inputDigest,
    summary,
  });
}

export function inspectPackagedBoringLogReferenceWitness({ witness, oracle, sceneInputDigest }) {
  const diagnostics = new Set();
  const registrationDeltas = [];
  if (typeof witness !== "object" || witness === null || Array.isArray(witness)) {
    return Object.freeze({
      schema: "rsrender.bld030.packaged-reference-witness.v1",
      result: "FAIL",
      diagnostics: Object.freeze(["PACKAGED_REFERENCE_WITNESS_MALFORMED"]),
    });
  }
  const columns = Array.isArray(witness.columns) ? witness.columns : [];
  const regions = Array.isArray(witness.regions) ? witness.regions : [];
  const roles = typeof witness.roles === "object" && witness.roles !== null ? witness.roles : {};
  const provenance =
    typeof witness.provenance === "object" && witness.provenance !== null ? witness.provenance : {};
  const verticalEdges =
    columns.length === 0
      ? []
      : [...columns.map(({ xMpt }) => xMpt), columns.at(-1).xMpt + columns.at(-1).widthMpt];
  if (
    witness.viewBox !==
    `0 0 ${oracle.geometryAnchors.page.widthMpt} ${oracle.geometryAnchors.page.heightMpt}`
  ) {
    diagnostics.add("PACKAGED_REFERENCE_PAGE_GEOMETRY_MISMATCH");
  }
  if (
    JSON.stringify(verticalEdges) !== JSON.stringify(oracle.geometryAnchors.majorVerticalEdgesMpt)
  ) {
    diagnostics.add("PACKAGED_REFERENCE_VERTICAL_EDGES_MISMATCH");
  }
  compareRegistration(
    [verticalEdges[0], verticalEdges.at(-1)],
    BORING_LOG_REFERENCE_REGISTRATION.outerHorizontalRuleXPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "PACKAGED_REFERENCE_OUTER_X",
    diagnostics,
    registrationDeltas,
  );
  compareRegistration(
    verticalEdges.slice(1, -1),
    BORING_LOG_REFERENCE_REGISTRATION.internalVerticalRuleXPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "PACKAGED_REFERENCE_INTERNAL_X",
    diagnostics,
    registrationDeltas,
  );
  const regionMap = new Map(regions.map(({ semanticId, bounds }) => [semanticId, bounds]));
  const header = regionMap.get("region-header");
  const body = regionMap.get("region-depth-body");
  const footer = regionMap.get("region-footer");
  const depthY = Array.isArray(witness.depthMajorYMpt) ? witness.depthMajorYMpt : [];
  const horizontalEdges =
    header && body && footer && depthY.length > 1
      ? [
          header.yMpt,
          header.yMpt + header.heightMpt,
          body.yMpt,
          depthY[0],
          depthY.at(-1),
          body.yMpt + body.heightMpt,
          footer.yMpt,
          footer.yMpt + footer.heightMpt,
        ]
      : [];
  if (
    JSON.stringify(horizontalEdges) !==
    JSON.stringify(oracle.geometryAnchors.majorHorizontalEdgesMpt)
  ) {
    diagnostics.add("PACKAGED_REFERENCE_HORIZONTAL_EDGES_MISMATCH");
  }
  compareRegistration(
    [horizontalEdges[1], horizontalEdges[3], horizontalEdges[4], horizontalEdges[5]],
    BORING_LOG_REFERENCE_REGISTRATION.majorHorizontalRuleYPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "PACKAGED_REFERENCE_MAJOR_Y",
    diagnostics,
    registrationDeltas,
  );
  const plotGridXMpt = Array.isArray(witness.plotGridXMpt) ? witness.plotGridXMpt : [];
  compareRegistration(
    plotGridXMpt,
    BORING_LOG_REFERENCE_REGISTRATION.plotGridXPt,
    BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
    "PACKAGED_REFERENCE_PLOT_GRID_X",
    diagnostics,
    registrationDeltas,
  );
  for (const [role, expected] of [
    ["lithology-pattern-interval", oracle.expectedCounts.lithologyIntervals],
    ["sample-label", oracle.expectedCounts.samples],
    ["remark-interval", oracle.expectedCounts.remarks],
    ["legend-label", oracle.expectedCounts.legendItems],
    ["publication-note", oracle.expectedCounts.notes],
    ["sample-symbol-split-spoon", oracle.expectedCounts.samples],
  ]) {
    if (roles[role] !== expected) diagnostics.add(`PACKAGED_REFERENCE_ROLE_COUNT_MISMATCH:${role}`);
  }
  if (roles["data-polyline"] !== 2 || roles["data-range"] !== 6) {
    diagnostics.add("PACKAGED_REFERENCE_PLOT_LAYER_MISMATCH");
  }
  if (
    witness.patternCount !== 3 ||
    witness.lineHatchPatternCount !== 2 ||
    witness.dotRingPatternCount !== 1
  ) {
    diagnostics.add("PACKAGED_REFERENCE_PATTERN_MISMATCH");
  }
  if (provenance.source !== 228 || provenance.computed !== 100) {
    diagnostics.add("PACKAGED_REFERENCE_PROVENANCE_MISMATCH");
  }
  const requiredHeadings = {
    "column-elevation": "ELEV FT",
    "column-depth": "DEPTH FT",
    "column-lithology": "USCS",
    "column-description": "MATERIAL DESCRIPTION",
    "column-sample": "SAMPLE",
    "column-recovery": "REC %",
    "column-blows": "BLOWS /6 IN",
    "column-n-value": "N",
    "column-data-track": "PENETRATION N · MOISTURE W% · PL–LL",
    "column-remarks": "REMARKS & FIELD NOTES",
  };
  if (JSON.stringify(witness.headings) !== JSON.stringify(requiredHeadings)) {
    diagnostics.add("PACKAGED_REFERENCE_COLUMN_HEADING_GRAMMAR_MISMATCH");
  }
  if (JSON.stringify(witness.plotTickLabels) !== JSON.stringify([0, 25, 50, 75, 100])) {
    diagnostics.add("PACKAGED_REFERENCE_PLOT_TICK_GRAMMAR_MISMATCH");
  }
  if (
    !Array.isArray(witness.refusalSemanticIds) ||
    witness.refusalSemanticIds.length !== 2 ||
    witness.refusalSemanticIds.some(
      (semanticId) =>
        typeof semanticId !== "string" || !semanticId.startsWith("data-layer:layer-n-value:"),
    ) ||
    witness.moistureDashMpt !== "3000 2000"
  ) {
    diagnostics.add("PACKAGED_REFERENCE_PLOT_SYMBOL_GRAMMAR_MISMATCH");
  }
  const textSourceRanges = Array.isArray(witness.textSourceRanges) ? witness.textSourceRanges : [];
  if (
    textSourceRanges.length < 125 ||
    new Set(textSourceRanges.map(({ measurementId }) => measurementId)).size !==
      textSourceRanges.length ||
    textSourceRanges.some(
      ({ measurementId, ranges }) =>
        typeof measurementId !== "string" ||
        !Array.isArray(ranges) ||
        ranges.length < 1 ||
        ranges.some(
          (range) =>
            !Array.isArray(range) ||
            range.length !== 2 ||
            !Number.isSafeInteger(range[0]) ||
            !Number.isSafeInteger(range[1]) ||
            range[0] < 0 ||
            range[1] < range[0],
        ),
    )
  ) {
    diagnostics.add("PACKAGED_REFERENCE_TEXT_RANGE_MISMATCH");
  }
  const summary = Object.freeze({
    sceneInputDigest,
    oracleDigest: sha256CanonicalJson(oracle),
    verticalEdgesMpt: Object.freeze(verticalEdges),
    horizontalEdgesMpt: Object.freeze(horizontalEdges),
    roleCounts: Object.freeze({ ...roles }),
    provenanceCounts: Object.freeze({ ...provenance }),
    headings: Object.freeze({ ...(witness.headings ?? {}) }),
    patternCounts: Object.freeze({
      total: witness.patternCount,
      lineHatch: witness.lineHatchPatternCount,
      dotRing: witness.dotRingPatternCount,
    }),
    textElementCount: textSourceRanges.length,
    textSourceRangeDigest: sha256CanonicalJson(textSourceRanges),
    referenceRegistration: Object.freeze({
      registrationRevision: BORING_LOG_REFERENCE_REGISTRATION.schema,
      tolerancePt: BORING_LOG_REFERENCE_REGISTRATION.tolerancePt,
      deltas: Object.freeze(registrationDeltas),
    }),
  });
  return Object.freeze({
    schema: "rsrender.bld030.packaged-reference-witness.v1",
    result: diagnostics.size === 0 ? "PASS" : "FAIL",
    diagnostics: Object.freeze([...diagnostics].sort()),
    summary,
  });
}
