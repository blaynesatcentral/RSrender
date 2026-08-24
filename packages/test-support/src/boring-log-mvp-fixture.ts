import { sha256CanonicalJson } from "@rsrender/contracts";

export const BORING_LOG_MVP_FIXTURE_SCHEMA_VERSION = "rsrender.boring-log-mvp-fixture.v1" as const;
export const BORING_LOG_MVP_TEMPLATE_SCHEMA_VERSION =
  "rsrender.boring-log-mvp-template.v1" as const;
export const BORING_LOG_MVP_ORACLE_SCHEMA_VERSION = "rsrender.boring-log-mvp-oracle.v1" as const;

export const BORING_LOG_MVP_FIXTURE_ID = "mvp-boring-log-test-01@r6" as const;
export const BORING_LOG_MVP_TEMPLATE_ID = "mvp-template-reference-shaped@r5" as const;
export const BORING_LOG_MVP_FIXTURE_DIGEST =
  "sha256:53b34d5efbf52af7f73b968cbf668796f5713aa54a5d40d5cdbff7d5028cac67" as const;
export const BORING_LOG_MVP_TEMPLATE_DIGEST =
  "sha256:a76ee89cbd28b9e11237f46b8910940c5141808607e68d9acc922eef59b8669d" as const;
export const BORING_LOG_MVP_ORACLE_DIGEST =
  "sha256:da03844b964bc133222c4da2b380e4ccc3339dc3a0fcb8c0ab8ae5b5f07df21f" as const;
export const BORING_LOG_MVP_BUNDLE_DIGEST =
  "sha256:09d04fe345a9a01b4374930b1d6a01970f716a8eab8aae7db5a2918d37f0dacf" as const;

const source = (entityId: string, fieldId: string) =>
  Object.freeze({
    provenanceClass: "source" as const,
    sourceContextIdentity: "urn:rsrender:synthetic-context:mvp-r1",
    sourceProjectIdentity: "urn:rsrender:synthetic-project:riverside-r1",
    sourceEntityIdentity: entityId,
    sourceFieldIdentity: fieldId,
    sourceContractRevision: "rsrender.synthetic.render-dataset.v1",
  });

const blowIncrement = (blows: number, penetrationInches = 6) =>
  Object.freeze({ blows, penetrationInches });

const completeBlowIncrements = (first: number, second: number, third: number) =>
  Object.freeze([blowIncrement(first), blowIncrement(second), blowIncrement(third)] as const);

const sample = (
  id: string,
  label: string,
  depthFt: number,
  recoveryPercent: number,
  blowIncrements: readonly ReturnType<typeof blowIncrement>[],
  nValue: number | null,
  refusal = false,
) =>
  Object.freeze({
    id,
    label,
    depthFt,
    symbol: "split-spoon" as const,
    recoveryPercent,
    blowIncrements: Object.freeze([...blowIncrements]),
    nValue,
    refusal,
    provenance: source(id, "sample-observation"),
  });

/**
 * Independently authored repository-safe synthetic renderer input. It is not a
 * transcription of the restricted client go-by and contains no raster asset.
 */
export const boringLogMvpFixture = Object.freeze({
  schemaVersion: BORING_LOG_MVP_FIXTURE_SCHEMA_VERSION,
  fixtureId: BORING_LOG_MVP_FIXTURE_ID,
  fixtureRevision: 6,
  evidenceClass: "synthetic-coverage-only" as const,
  representativeClaimAllowed: false,
  publicationEligibility: "example-dataset-only" as const,
  identity: Object.freeze({
    boringLogId: "urn:rsrender:boring-log:test-01",
    explorationId: "urn:rsrender:exploration:test-01",
    pageId: "urn:rsrender:page:test-01:1",
  }),
  metadata: Object.freeze({
    companyName: "Synthetic Geotechnical Services",
    companyContactSubtitle: "4800 Innovation Way, Salem, OR 97301 · (503) 555-0142",
    documentTitle: "BORING LOG TEST-01",
    sheetLabel: "SHEET 1 OF 1",
    clientName: "Northbank Community Partners",
    projectName: "Riverside Mixed-Use Development",
    projectNumber: "SGS-24057",
    location: "Riverview Drive, Dayton, OR",
    coordinates: "N 44.123456°  W 122.987654°",
    coordinateDatum: "WGS 84",
    groundElevationFt: 182.5,
    elevationDatum: "NAVD 88",
    totalDepthFt: 40,
    completionDepthFt: 40,
    drilledDate: "2025-05-14",
    boringMethod: "Hollow-Stem Auger",
    holeDiameter: "4 in",
    rigDriller: "CME 75 · Synthetic Drilling Crew",
    hammerType: "Automatic 140 lb",
    hammerDrop: "30 in",
    hammerEfficiency: "84%",
    loggedBy: "K. Anderson, E.I.",
    checkedBy: "M. Rivera, P.E.",
    groundwaterSummary: "Not encountered to 40.0 ft.",
    provenance: source("urn:rsrender:exploration:test-01", "metadata"),
  }),
  referenceDepthRange: Object.freeze({ startFt: 0, endFt: 40, terminalInclusive: true }),
  lithologyIntervals: Object.freeze([
    Object.freeze({
      id: "stratum-01",
      depthFromFt: 0,
      depthToFt: 15,
      classification: "SILT (ML)",
      mappedClassificationKey: "ML",
      patternId: "pattern-silt-horizontal-dash",
      materialFillToken: "materialSiltFill",
      description:
        "Medium stiff, moist, brown SILT (ML); low plasticity; trace fine sand; homogeneous; no odor.",
      transitions: Object.freeze([
        Object.freeze({ depthFt: 7.5, text: "Becoming soft, light brown." }),
        Object.freeze({ depthFt: 13.5, text: "Trace organics." }),
      ]),
      boundaryKind: "observed" as const,
      provenance: source("stratum-01", "stratum"),
    }),
    Object.freeze({
      id: "stratum-02",
      depthFromFt: 15,
      depthToFt: 30,
      classification: "GRAVEL WITH SAND (GW)",
      mappedClassificationKey: "GW",
      patternId: "pattern-gravel-dot-ring",
      materialFillToken: "materialGravelFill",
      description:
        "Dense, brown to gray GRAVEL WITH SAND (GW); angular to subrounded gravel up to 1½ in; little silt.",
      transitions: Object.freeze([Object.freeze({ depthFt: 22.5, text: "Becoming very dense." })]),
      boundaryKind: "gradational" as const,
      provenance: source("stratum-02", "stratum"),
    }),
    Object.freeze({
      id: "stratum-03",
      depthFromFt: 30,
      depthToFt: 40,
      classification: "SILT (ML)",
      mappedClassificationKey: "ML",
      patternId: "pattern-silt-blue-dash",
      materialFillToken: "materialSiltFill",
      description:
        "Very stiff, moist, gray with brown mottling SILT (ML); low plasticity; trace fine sand; blocky structure.",
      transitions: Object.freeze([Object.freeze({ depthFt: 34, text: "Trace fine gravel." })]),
      boundaryKind: "observed" as const,
      provenance: source("stratum-03", "stratum"),
    }),
  ]),
  samples: Object.freeze([
    sample("sample-01", "S-1", 1.5, 90, completeBlowIncrements(2, 3, 4), 7),
    sample("sample-02", "S-2", 4, 85, completeBlowIncrements(3, 4, 5), 9),
    sample("sample-03", "S-3", 7, 80, completeBlowIncrements(4, 5, 6), 11),
    sample("sample-04", "S-4", 9.8, 95, completeBlowIncrements(6, 8, 10), 18),
    sample("sample-05", "S-5", 15.8, 95, completeBlowIncrements(7, 9, 12), 21),
    sample(
      "sample-06",
      "S-6",
      18.8,
      90,
      Object.freeze([blowIncrement(16), blowIncrement(50, 4)]),
      null,
      true,
    ),
    sample("sample-07", "S-7", 22, 85, completeBlowIncrements(20, 28, 32), 60),
    sample("sample-08", "S-8", 25, 85, completeBlowIncrements(18, 28, 34), 62),
    sample(
      "sample-09",
      "S-9",
      31.2,
      80,
      Object.freeze([blowIncrement(12), blowIncrement(50, 2)]),
      null,
      true,
    ),
    sample("sample-10", "S-10", 34.5, 95, completeBlowIncrements(7, 10, 13), 23),
  ]),
  dataTrack: Object.freeze({
    id: "track-penetration-moisture",
    depthRange: Object.freeze({ startFt: 0, endFt: 40 }),
    axes: Object.freeze([
      Object.freeze({
        id: "axis-n-value",
        quantity: "spt-n-value",
        unit: "blows-per-foot",
        minimum: 0,
        maximum: 100,
      }),
      Object.freeze({
        id: "axis-water-percent",
        quantity: "water-content-percent",
        unit: "percent",
        minimum: 0,
        maximum: 100,
      }),
    ]),
    layers: Object.freeze([
      Object.freeze({
        id: "layer-n-value",
        kind: "numeric-polyline" as const,
        axisId: "axis-n-value",
        glyph: "filled-square" as const,
        values: Object.freeze([
          ["sample-01", 7],
          ["sample-02", 9],
          ["sample-03", 11],
          ["sample-04", 18],
          ["sample-05", 21],
          ["sample-06", 50],
          ["sample-07", 60],
          ["sample-08", 62],
          ["sample-09", 50],
          ["sample-10", 23],
        ] as const),
        provenance: source("track-penetration-moisture", "spt-n-values"),
      }),
      Object.freeze({
        id: "layer-moisture",
        kind: "numeric-polyline" as const,
        axisId: "axis-water-percent",
        glyph: "open-triangle" as const,
        values: Object.freeze([
          ["sample-01", 18],
          ["sample-02", 26],
          ["sample-03", 32],
          ["sample-04", 49],
          ["sample-05", 86],
          ["sample-09", 37],
          ["sample-10", 49],
        ] as const),
        provenance: source("track-penetration-moisture", "moisture-content"),
      }),
      Object.freeze({
        id: "layer-plasticity-range",
        kind: "numeric-range" as const,
        axisId: "axis-water-percent",
        glyph: "open-circle-range" as const,
        values: Object.freeze([
          ["sample-01", 38, 18],
          ["sample-02", 48, 26],
          ["sample-03", 55, 32],
          ["sample-05", 69, 86],
          ["sample-09", 55, 37],
          ["sample-10", 76, 49],
        ] as const),
        provenance: source("track-penetration-moisture", "plastic-limit-liquid-limit"),
      }),
    ]),
  }),
  remarks: Object.freeze([
    Object.freeze({
      id: "remark-01",
      depthFromFt: 0,
      depthToFt: 5,
      text: "Surface: grass cover. Topsoil 0–6 in. No groundwater encountered.",
    }),
    Object.freeze({
      id: "remark-02",
      depthFromFt: 8,
      depthToFt: 16,
      text: "Boring dry to 15.0 ft.",
    }),
    Object.freeze({
      id: "remark-03",
      depthFromFt: 15,
      depthToFt: 20,
      text: "Gravelly soils begin at 15 ft.",
    }),
    Object.freeze({
      id: "remark-04",
      depthFromFt: 18,
      depthToFt: 25,
      text: "No caving observed. Boring stable.",
    }),
    Object.freeze({
      id: "remark-05",
      depthFromFt: 22.5,
      depthToFt: 29,
      text: "Very dense layer from 22.5 to 28.5 ft.",
    }),
    Object.freeze({
      id: "remark-06",
      depthFromFt: 30,
      depthToFt: 35,
      text: "Slight dampness at 34 ft.",
    }),
    Object.freeze({
      id: "remark-07",
      depthFromFt: 35,
      depthToFt: 40,
      text: "Boring terminated at 40.0 ft. Target depth reached.",
    }),
  ]),
  legend: Object.freeze([
    Object.freeze({ id: "legend-split-spoon", label: "Split spoon (SPT)", symbol: "split-spoon" }),
    Object.freeze({
      id: "legend-silt",
      label: "SILT (ML)",
      symbol: "pattern-silt-horizontal-dash",
    }),
    Object.freeze({
      id: "legend-gravel",
      label: "GRAVEL WITH SAND (GW)",
      symbol: "pattern-gravel-dot-ring",
    }),
    Object.freeze({ id: "legend-observed", label: "Observed contact", symbol: "solid-line" }),
    Object.freeze({ id: "legend-gradational", label: "Gradational", symbol: "dashed-line" }),
    Object.freeze({ id: "legend-n", label: "N, blows/ft", symbol: "filled-square-line" }),
    Object.freeze({ id: "legend-water", label: "Water content, %", symbol: "open-triangle-line" }),
    Object.freeze({ id: "legend-plll", label: "Plastic range PL–LL", symbol: "open-circle-range" }),
    Object.freeze({
      id: "legend-refusal",
      label: "Sampler refusal",
      symbol: "filled-down-triangle",
    }),
    Object.freeze({ id: "legend-groundwater", label: "Groundwater", symbol: "open-down-triangle" }),
  ]),
  notes: Object.freeze([
    "Elevations use an assumed datum of 100.00 ft.",
    "Boring location field-surveyed on 2025-05-14.",
    "No groundwater encountered while drilling to 40.0 ft.",
    "SPT generally follows ASTM D1586.",
    "N sums the final two 6-in. increments.",
    "Soil classification generally follows ASTM D2488.",
    "Boundaries are approximate; transitions may vary.",
    "This log applies only at this location and time.",
  ]),
  approval: Object.freeze({
    heading: "REVIEWED & APPROVED",
    sealPlaceholder: "ENGINEER'S SEAL",
    reviewerName: "J. M. Carter, P.E.",
    reviewedDate: "2025-05-20",
  }),
});

const textStyle = (id: string, sizeMpt: number, weight: number) =>
  Object.freeze({
    id,
    fontFamilyId: "font.logical.rsrender-sans",
    fontSizeMpt: sizeMpt,
    fontWeight: weight,
    lineHeightMpt: Math.round(sizeMpt * 1.25),
    color: "#17202a",
  });

export const boringLogMvpTemplate = Object.freeze({
  schemaVersion: BORING_LOG_MVP_TEMPLATE_SCHEMA_VERSION,
  templateId: BORING_LOG_MVP_TEMPLATE_ID,
  templateRevision: 5,
  physicalUnits: "mpt" as const,
  page: Object.freeze({ widthMpt: 612_000, heightMpt: 792_000, orientation: "portrait" }),
  regions: Object.freeze([
    Object.freeze({
      id: "region-header",
      role: "header",
      xMpt: 24_000,
      yMpt: 14_000,
      widthMpt: 564_000,
      heightMpt: 87_000,
    }),
    Object.freeze({
      id: "region-depth-body",
      role: "depth-body",
      xMpt: 24_000,
      yMpt: 104_000,
      widthMpt: 564_000,
      heightMpt: 566_000,
    }),
    Object.freeze({
      id: "region-footer",
      role: "footer",
      xMpt: 24_000,
      yMpt: 670_000,
      widthMpt: 564_000,
      heightMpt: 108_000,
    }),
  ]),
  depthTransform: Object.freeze({
    regionId: "region-depth-body",
    depthStartFt: 0,
    depthEndFt: 40,
    yStartMpt: 130_000,
    yEndMpt: 611_000,
    mptPerFoot: 12_025,
  }),
  columns: Object.freeze([
    Object.freeze({
      id: "column-elevation",
      role: "elevation-ruler",
      xMpt: 24_000,
      widthMpt: 28_000,
    }),
    Object.freeze({ id: "column-depth", role: "depth-ruler", xMpt: 52_000, widthMpt: 29_000 }),
    Object.freeze({
      id: "column-lithology",
      role: "lithology-pattern",
      xMpt: 81_000,
      widthMpt: 29_000,
    }),
    Object.freeze({
      id: "column-description",
      role: "material-description",
      xMpt: 110_000,
      widthMpt: 186_000,
    }),
    Object.freeze({ id: "column-sample", role: "sample", xMpt: 296_000, widthMpt: 31_000 }),
    Object.freeze({ id: "column-recovery", role: "recovery", xMpt: 327_000, widthMpt: 21_000 }),
    Object.freeze({ id: "column-blows", role: "blows", xMpt: 348_000, widthMpt: 34_000 }),
    Object.freeze({ id: "column-n-value", role: "n-value", xMpt: 382_000, widthMpt: 22_000 }),
    Object.freeze({
      id: "column-data-track",
      role: "penetration-moisture-plasticity",
      xMpt: 404_000,
      widthMpt: 101_000,
    }),
    Object.freeze({ id: "column-remarks", role: "remarks", xMpt: 505_000, widthMpt: 83_000 }),
  ]),
  styles: Object.freeze([
    textStyle("style-title", 16_000, 700),
    textStyle("style-company", 13_000, 700),
    textStyle("style-heading", 7_500, 700),
    textStyle("style-body", 7_000, 400),
    textStyle("style-small", 5_500, 400),
  ]),
  vectorPatterns: Object.freeze([
    Object.freeze({
      id: "pattern-silt-horizontal-dash",
      kind: "horizontal-dash" as const,
      foregroundToken: "ink",
      backgroundToken: "lithologySiltFill",
      spacingMpt: 5_000,
      markSizeMpt: 2_000,
      strokeWidthMpt: 500,
    }),
    Object.freeze({
      id: "pattern-gravel-dot-ring",
      kind: "dot-ring" as const,
      foregroundToken: "ink",
      backgroundToken: "lithologyGravelFill",
      spacingMpt: 6_000,
      markSizeMpt: 1_500,
      strokeWidthMpt: 500,
    }),
    Object.freeze({
      id: "pattern-silt-blue-dash",
      kind: "horizontal-dash" as const,
      foregroundToken: "selection",
      backgroundToken: "lithologySiltFill",
      spacingMpt: 5_000,
      markSizeMpt: 2_000,
      strokeWidthMpt: 500,
    }),
    Object.freeze({
      id: "silt-horizontal-dash",
      kind: "horizontal-dash" as const,
      foregroundToken: "ink",
      backgroundToken: "lithologySiltFill",
      spacingMpt: 5_000,
      markSizeMpt: 2_000,
      strokeWidthMpt: 500,
    }),
    Object.freeze({
      id: "sand-dot-ring",
      kind: "dot-ring" as const,
      foregroundToken: "ink",
      backgroundToken: "lithologyGravelFill",
      spacingMpt: 6_000,
      markSizeMpt: 1_500,
      strokeWidthMpt: 500,
    }),
    Object.freeze({
      id: "gravel-dot-ring",
      kind: "dot-ring" as const,
      foregroundToken: "ink",
      backgroundToken: "lithologyGravelFill",
      spacingMpt: 6_000,
      markSizeMpt: 1_500,
      strokeWidthMpt: 500,
    }),
  ]),
  hierarchy: Object.freeze({
    id: "page-root",
    role: "page",
    children: Object.freeze([
      Object.freeze({
        id: "region-header",
        role: "header",
        children: Object.freeze([
          "header-company",
          "header-title",
          "header-sheet",
          "header-project-metadata",
        ]),
      }),
      Object.freeze({
        id: "region-depth-body",
        role: "depth-body",
        children: Object.freeze([
          "column-elevation",
          "column-depth",
          "column-lithology",
          "column-description",
          "column-sample",
          "column-recovery",
          "column-blows",
          "column-n-value",
          "column-data-track",
          "column-remarks",
        ]),
      }),
      Object.freeze({
        id: "region-footer",
        role: "footer",
        children: Object.freeze(["footer-legend", "footer-notes", "footer-approval"]),
      }),
    ]),
  }),
  bindings: Object.freeze([
    Object.freeze({
      elementId: "header-company",
      path: "metadata.companyName",
      styleId: "style-company",
    }),
    Object.freeze({
      elementId: "header-title",
      path: "metadata.documentTitle",
      styleId: "style-title",
    }),
    Object.freeze({
      elementId: "header-sheet",
      path: "metadata.sheetLabel",
      styleId: "style-small",
    }),
    Object.freeze({
      elementId: "header-project-metadata",
      path: "metadata",
      styleId: "style-small",
    }),
    Object.freeze({
      elementId: "column-elevation",
      path: "metadata.groundElevationFt",
      styleId: "style-small",
    }),
    Object.freeze({
      elementId: "column-depth",
      path: "referenceDepthRange",
      styleId: "style-small",
    }),
    Object.freeze({
      elementId: "column-lithology",
      path: "lithologyIntervals",
      styleId: "style-body",
    }),
    Object.freeze({
      elementId: "column-description",
      path: "lithologyIntervals",
      styleId: "style-body",
    }),
    Object.freeze({ elementId: "column-sample", path: "samples", styleId: "style-body" }),
    Object.freeze({
      elementId: "column-recovery",
      path: "samples.recoveryPercent",
      styleId: "style-body",
    }),
    Object.freeze({
      elementId: "column-blows",
      path: "samples.blowIncrements",
      styleId: "style-body",
    }),
    Object.freeze({ elementId: "column-n-value", path: "samples.nValue", styleId: "style-body" }),
    Object.freeze({ elementId: "column-data-track", path: "dataTrack", styleId: "style-small" }),
    Object.freeze({ elementId: "column-remarks", path: "remarks", styleId: "style-body" }),
    Object.freeze({ elementId: "footer-legend", path: "legend", styleId: "style-small" }),
    Object.freeze({ elementId: "footer-notes", path: "notes", styleId: "style-small" }),
    Object.freeze({ elementId: "footer-approval", path: "approval", styleId: "style-small" }),
  ]),
  visualTokens: Object.freeze({
    pageFill: "#ffffff",
    ink: "#17202a",
    secondaryInk: "#52606d",
    rule: "#7b8794",
    lightRule: "#d8dee6",
    materialSiltFill: "#edf4f3",
    materialGravelFill: "#f6efe7",
    nTrack: "#17202a",
    moistureTrack: "#16736b",
    plasticityTrack: "#55728d",
    lithologySiltFill: "#edf4f3",
    lithologyGravelFill: "#f6efe7",
    selection: "#2f6f9f",
  }),
});

export const boringLogMvpOracle = Object.freeze({
  schemaVersion: BORING_LOG_MVP_ORACLE_SCHEMA_VERSION,
  fixtureId: BORING_LOG_MVP_FIXTURE_ID,
  templateId: BORING_LOG_MVP_TEMPLATE_ID,
  oracleRevision: 3,
  oracleIds: Object.freeze(["OA-PROV-001", "OA-GOLD-001", "OA-REP-001"]),
  requiredSections: Object.freeze(["header", "depth-body", "footer"]),
  requiredColumnRoles: Object.freeze([
    "elevation-ruler",
    "depth-ruler",
    "lithology-pattern",
    "material-description",
    "sample",
    "recovery",
    "blows",
    "n-value",
    "penetration-moisture-plasticity",
    "remarks",
  ]),
  requiredFooterElements: Object.freeze(["footer-legend", "footer-notes", "footer-approval"]),
  expectedCounts: Object.freeze({
    pages: 1,
    lithologyIntervals: 3,
    samples: 10,
    axes: 2,
    dataLayers: 3,
    remarks: 7,
    legendItems: 10,
    notes: 8,
  }),
  geometryAnchors: Object.freeze({
    page: Object.freeze({ widthMpt: 612_000, heightMpt: 792_000 }),
    depth: Object.freeze({ startFt: 0, endFt: 40, yStartMpt: 130_000, yEndMpt: 611_000 }),
    majorVerticalEdgesMpt: Object.freeze([
      24_000, 52_000, 81_000, 110_000, 296_000, 327_000, 348_000, 382_000, 404_000, 505_000,
      588_000,
    ]),
    majorHorizontalEdgesMpt: Object.freeze([
      14_000, 101_000, 104_000, 130_000, 611_000, 670_000, 670_000, 778_000,
    ]),
  }),
  comparisonPolicy: Object.freeze({
    exact: Object.freeze([
      "canonical-input-digests",
      "semantic-identities",
      "node-order",
      "text-source-ranges",
      "mpt-geometry",
      "provenance",
      "overflow-outcomes",
    ]),
    pdfPageEdgeTolerancePt: 0.01,
    vectorCoordinateTolerancePt: 0.02,
    textBaselineTolerancePt: 0.02,
    localGoByRegistrationToleranceMm: 0.25,
    localGoByMajorEdgeToleranceMm: 0.5,
    secondaryRasterMaximumChangedPixelPercent: 0.5,
    secondaryRasterDeltaE00Threshold: 2,
    screenshotAloneSufficient: false,
  }),
  negativeOracles: Object.freeze([
    "no-raster-page",
    "no-image-or-background-reference",
    "no-client-or-restricted-go-by-content",
    "no-dropped-or-duplicated-source-record",
    "no-independent-screen-or-pdf-reflow",
    "no-source-override-provenance-collapse",
    "no-representative-or-release-claim",
  ]),
});

export interface BoringLogMvpFixtureBundle {
  readonly fixture: typeof boringLogMvpFixture;
  readonly template: typeof boringLogMvpTemplate;
  readonly oracle: typeof boringLogMvpOracle;
}

export interface BoringLogMvpFixtureValidation {
  readonly accepted: boolean;
  readonly diagnostics: readonly string[];
  readonly fixtureDigest: string;
  readonly templateDigest: string;
  readonly oracleDigest: string;
  readonly bundleDigest: string;
}

function collectStringsAndKeys(value: unknown, keys: string[], strings: string[]): void {
  if (typeof value === "string") {
    strings.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectStringsAndKeys(child, keys, strings);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      collectStringsAndKeys(child, keys, strings);
    }
  }
}

export function validateBoringLogMvpFixtureBundle(
  bundle: BoringLogMvpFixtureBundle = {
    fixture: boringLogMvpFixture,
    template: boringLogMvpTemplate,
    oracle: boringLogMvpOracle,
  },
): BoringLogMvpFixtureValidation {
  const diagnostics = new Set<string>();
  const { fixture, template, oracle } = bundle;
  if (fixture.fixtureId !== oracle.fixtureId || template.templateId !== oracle.templateId) {
    diagnostics.add("MVP_FIXTURE_IDENTITY_MISMATCH");
  }
  const allGeometry = [
    template.page.widthMpt,
    template.page.heightMpt,
    ...template.regions.flatMap((region) => [
      region.xMpt,
      region.yMpt,
      region.widthMpt,
      region.heightMpt,
    ]),
    ...template.columns.flatMap((column) => [column.xMpt, column.widthMpt]),
    template.depthTransform.yStartMpt,
    template.depthTransform.yEndMpt,
    template.depthTransform.mptPerFoot,
    ...template.styles.flatMap((style) => [style.fontSizeMpt, style.lineHeightMpt]),
  ];
  if (allGeometry.some((value) => !Number.isSafeInteger(value))) {
    diagnostics.add("MVP_FIXTURE_GEOMETRY_NOT_INTEGER_MPT");
  }
  const depthBody = template.regions.find(({ id }) => id === "region-depth-body");
  const firstColumn = template.columns[0];
  const lastColumn = template.columns.at(-1);
  if (
    depthBody === undefined ||
    firstColumn === undefined ||
    lastColumn === undefined ||
    firstColumn.xMpt !== depthBody.xMpt ||
    lastColumn.xMpt + lastColumn.widthMpt !== depthBody.xMpt + depthBody.widthMpt ||
    template.columns.some(
      (column, index) =>
        index > 0 &&
        template.columns[index - 1]!.xMpt + template.columns[index - 1]!.widthMpt !== column.xMpt,
    )
  ) {
    diagnostics.add("MVP_FIXTURE_COLUMN_COVERAGE_INVALID");
  }
  const intervals = fixture.lithologyIntervals;
  if (
    intervals[0]?.depthFromFt !== fixture.referenceDepthRange.startFt ||
    intervals.at(-1)?.depthToFt !== fixture.referenceDepthRange.endFt ||
    intervals.some(
      (interval, index) =>
        interval.depthFromFt >= interval.depthToFt ||
        (index > 0 && intervals[index - 1]!.depthToFt !== interval.depthFromFt),
    )
  ) {
    diagnostics.add("MVP_FIXTURE_DEPTH_COVERAGE_INVALID");
  }
  const sampleIds = new Set(fixture.samples.map(({ id }) => id));
  if (
    sampleIds.size !== fixture.samples.length ||
    fixture.samples.some(
      ({ depthFt }) =>
        depthFt < fixture.referenceDepthRange.startFt ||
        depthFt > fixture.referenceDepthRange.endFt,
    )
  ) {
    diagnostics.add("MVP_FIXTURE_SAMPLE_IDENTITY_OR_DEPTH_INVALID");
  }
  if (
    fixture.samples.some(
      ({ blowIncrements, nValue, refusal }) =>
        blowIncrements.length < 1 ||
        blowIncrements.length > 3 ||
        blowIncrements.some(
          ({ blows, penetrationInches }) =>
            !Number.isSafeInteger(blows) ||
            blows < 0 ||
            !Number.isFinite(penetrationInches) ||
            penetrationInches <= 0 ||
            penetrationInches > 6,
        ) ||
        (refusal ? nValue !== null : !Number.isSafeInteger(nValue) || (nValue ?? -1) < 0),
    )
  ) {
    diagnostics.add("MVP_FIXTURE_SAMPLE_PENETRATION_OUTCOME_INVALID");
  }
  const admittedVisualTokenIds = new Set(Object.keys(template.visualTokens));
  if (
    ["materialSiltFill", "materialGravelFill", "nTrack", "moistureTrack", "plasticityTrack"].some(
      (tokenId) => !admittedVisualTokenIds.has(tokenId),
    ) ||
    fixture.lithologyIntervals.some(
      ({ materialFillToken }) => !admittedVisualTokenIds.has(materialFillToken),
    )
  ) {
    diagnostics.add("MVP_FIXTURE_VISUAL_TOKEN_REFERENCE_INVALID");
  }
  const axisIds = new Set(fixture.dataTrack.axes.map(({ id }) => id));
  if (
    fixture.dataTrack.layers.some(
      (layer) => !axisIds.has(layer.axisId) || layer.values.some(([id]) => !sampleIds.has(id)),
    )
  ) {
    diagnostics.add("MVP_FIXTURE_DATA_TRACK_REFERENCE_INVALID");
  }
  const regionRoles = new Set<string>(template.regions.map(({ role }) => role));
  if (oracle.requiredSections.some((role) => !regionRoles.has(role))) {
    diagnostics.add("MVP_FIXTURE_REQUIRED_SECTION_MISSING");
  }
  const columnRoles = new Set<string>(template.columns.map(({ role }) => role));
  if (oracle.requiredColumnRoles.some((role) => !columnRoles.has(role))) {
    diagnostics.add("MVP_FIXTURE_REQUIRED_COLUMN_MISSING");
  }
  const footer = template.hierarchy.children.find(({ role }) => role === "footer");
  if (
    footer === undefined ||
    oracle.requiredFooterElements.some((elementId) => !footer.children.includes(elementId))
  ) {
    diagnostics.add("MVP_FIXTURE_REQUIRED_FOOTER_ELEMENT_MISSING");
  }
  const counts = oracle.expectedCounts;
  if (
    counts.lithologyIntervals !== fixture.lithologyIntervals.length ||
    counts.samples !== fixture.samples.length ||
    counts.axes !== fixture.dataTrack.axes.length ||
    counts.dataLayers !== fixture.dataTrack.layers.length ||
    counts.remarks !== fixture.remarks.length ||
    counts.legendItems !== fixture.legend.length ||
    counts.notes !== fixture.notes.length
  ) {
    diagnostics.add("MVP_FIXTURE_SEMANTIC_COVERAGE_COUNT_MISMATCH");
  }
  const keys: string[] = [];
  const strings: string[] = [];
  collectStringsAndKeys({ fixture, template }, keys, strings);
  const forbiddenKey =
    /(?:image|raster|bitmap|backgroundimage|reference(?:path|file)|screenshot)/iu;
  const forbiddenString = /(?:<img\b|data:image\/|file:\/\/|\.png\b|\.jpe?g\b)/iu;
  if (
    keys.some((key) => forbiddenKey.test(key)) ||
    strings.some((value) => forbiddenString.test(value))
  ) {
    diagnostics.add("MVP_FIXTURE_RASTER_OR_REFERENCE_SHORTCUT_FORBIDDEN");
  }
  const fixtureDigest = sha256CanonicalJson(fixture);
  const templateDigest = sha256CanonicalJson(template);
  const oracleDigest = sha256CanonicalJson(oracle);
  const bundleDigest = sha256CanonicalJson({ fixtureDigest, templateDigest, oracleDigest });
  if (
    bundle.fixture === boringLogMvpFixture &&
    bundle.template === boringLogMvpTemplate &&
    bundle.oracle === boringLogMvpOracle &&
    (fixtureDigest !== BORING_LOG_MVP_FIXTURE_DIGEST ||
      templateDigest !== BORING_LOG_MVP_TEMPLATE_DIGEST ||
      oracleDigest !== BORING_LOG_MVP_ORACLE_DIGEST ||
      bundleDigest !== BORING_LOG_MVP_BUNDLE_DIGEST)
  ) {
    diagnostics.add("MVP_FIXTURE_FROZEN_DIGEST_MISMATCH");
  }
  return Object.freeze({
    accepted: diagnostics.size === 0,
    diagnostics: Object.freeze([...diagnostics].sort()),
    fixtureDigest,
    templateDigest,
    oracleDigest,
    bundleDigest,
  });
}
