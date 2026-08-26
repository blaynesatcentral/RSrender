import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  type BoringLogLayoutJobInput,
  type BoringLogSourceProvenance,
  type BoringLogTemplateInput,
  type BoringLogVectorPatternResource,
  type Mpt,
} from "@rsrender/contracts";

import type {
  RsLogProjectDataBorehole,
  RsLogProjectDataDocument,
  RsLogProjectDataSample,
  RsLogProjectDataStratigraphy,
} from "./rslog-project-data-ingress.js";

export const rsLogProjectDataLayoutJobRevision =
  "bld-051-rslog-project-data-layout-job-v1" as const;

export type RsLogProjectDataLayoutJobFailureCode =
  "RSLOG_PROJECT_DATA_LAYOUT_TEMPLATE_INVALID" | "RSLOG_PROJECT_DATA_LAYOUT_DOCUMENT_INVALID";

export type RsLogProjectDataLayoutJobResult =
  | Readonly<{
      accepted: true;
      code: "RSLOG_PROJECT_DATA_LAYOUT_ACCEPTED";
      layoutJobs: readonly BoringLogLayoutJobInput[];
      warnings: readonly string[];
    }>
  | Readonly<{
      accepted: false;
      code: RsLogProjectDataLayoutJobFailureCode;
      boringIdentity: string | null;
      diagnosticCode: string;
    }>;

const neutralForeground = "#52606d";
const neutralBackground = "#f4f5f6";

function validColor(input: string | null, fallback: string): string {
  return input !== null && /^#[0-9a-f]{6}$/iu.test(input) ? input : fallback;
}

function mappedClassificationKey(input: string | null, ordinal: number): string {
  const normalized = input
    ?.trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, 64);
  return normalized !== undefined && /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/u.test(normalized)
    ? normalized
    : `UNMAPPED-${String(ordinal + 1)}`;
}

function sourceProvenance(
  source: RsLogProjectDataDocument,
  entityIdentity: string,
  fieldIdentity: string,
): BoringLogSourceProvenance {
  const sourceKind =
    source.schemaVersion === "rslog.live-rsgeo.v1" ? "rslog-live" : "rslog-project-json";
  return Object.freeze({
    provenanceClass: "source",
    sourceContextIdentity: `urn:rsrender:source-context:${sourceKind}:${source.sourceDigest.slice("sha256:".length)}`,
    sourceProjectIdentity: source.project.identity,
    sourceEntityIdentity: entityIdentity,
    sourceFieldIdentity: fieldIdentity,
    sourceContractRevision: source.schemaVersion,
  });
}

function coordinateText(borehole: RsLogProjectDataBorehole): string {
  if (borehole.easting !== null && borehole.northing !== null) {
    return `${String(borehole.easting)}, ${String(borehole.northing)}`;
  }
  if (borehole.latitude !== null && borehole.longitude !== null) {
    return `${String(borehole.latitude)}, ${String(borehole.longitude)}`;
  }
  return "Not recorded";
}

function blowObservation(input: string | null): Readonly<{
  increments: readonly Readonly<{ blows: number; penetrationInches: number }>[];
  refusal: boolean;
}> {
  if (input === null) return Object.freeze({ increments: Object.freeze([]), refusal: false });
  const explicitRefusal = /\b(?:ref|refusal)\b/iu.test(input);
  const cleaned = input.replaceAll(/\b(?:ref|refusal)\b[:\s-]*/giu, "").trim();
  const tokens = cleaned.split(/\s*[-,#;\n]\s*/u).filter((token) => token.length > 0);
  if (tokens.length < 1 || tokens.length > 4) {
    return Object.freeze({ increments: Object.freeze([]), refusal: explicitRefusal });
  }
  const increments: { blows: number; penetrationInches: number }[] = [];
  for (const token of tokens) {
    const match =
      /^(?<blows>[0-9]+)(?:\s*\/\s*(?<inches>[0-9]+(?:\.[0-9]+)?)\s*(?:"|″|in(?:ch(?:es)?)?)?)?$/iu.exec(
        token,
      );
    const blows = Number(match?.groups?.["blows"]);
    const penetrationInches = Number(match?.groups?.["inches"] ?? 6);
    if (
      !Number.isSafeInteger(blows) ||
      blows < 0 ||
      blows > 1_000 ||
      !Number.isFinite(penetrationInches) ||
      penetrationInches <= 0 ||
      penetrationInches > 6
    ) {
      return Object.freeze({ increments: Object.freeze([]), refusal: explicitRefusal });
    }
    increments.push(Object.freeze({ blows, penetrationInches }));
  }
  const partialPenetrationRefusal = increments.some(
    ({ blows, penetrationInches }) => blows >= 50 && penetrationInches < 6,
  );
  return Object.freeze({
    increments: Object.freeze(increments),
    refusal: explicitRefusal || partialPenetrationRefusal,
  });
}

function resolvedSampleNValue(
  sample: RsLogProjectDataSample,
  observed = blowObservation(sample.blowCounts),
): Readonly<{ value: number | null; source: "explicit" | "standard-n2-plus-n3" | "missing" }> {
  if (Number.isSafeInteger(sample.nValue) && sample.nValue !== null && sample.nValue >= 0) {
    return Object.freeze({ value: sample.nValue, source: "explicit" });
  }
  if (sample.refusal ?? observed.refusal) {
    return Object.freeze({ value: null, source: "missing" });
  }
  const standardDrive = observed.increments.slice(0, 3);
  if (
    standardDrive.length >= 3 &&
    standardDrive.every(({ penetrationInches }) => penetrationInches === 6)
  ) {
    return Object.freeze({
      value: standardDrive[1]!.blows + standardDrive[2]!.blows,
      source: "standard-n2-plus-n3",
    });
  }
  return Object.freeze({ value: null, source: "missing" });
}

function materialDescription(stratum: RsLogProjectDataStratigraphy): string {
  return stratum.description ?? stratum.title ?? stratum.soilSymbol ?? "No description recorded";
}

function sourceTemplate(
  base: BoringLogTemplateInput,
  borehole: RsLogProjectDataBorehole,
): BoringLogTemplateInput {
  const sourceKind = base.templateId.includes(":rslog-live") ? "rslog-live" : "rslog-source";
  const orderedStratigraphy = [...borehole.stratigraphy].sort(
    (left, right) => left.fromDepth - right.fromDepth || left.toDepth - right.toDepth,
  );
  const depthTransform = {
    ...base.depthTransform,
    depthStartFt: 0,
    depthEndFt: borehole.depth,
    yEndMpt: Math.round(
      base.depthTransform.yStartMpt + borehole.depth * base.depthTransform.mptPerFoot,
    ) as Mpt,
  };
  const depthBody = base.regions.find(({ role }) => role === "depth-body")!;
  const yEndLimitMpt = (depthBody.yMpt + depthBody.heightMpt) as Mpt;
  const visualTokens: Record<string, string> = { ...base.visualTokens };
  const vectorPatterns: BoringLogVectorPatternResource[] = [];
  for (const [index, stratum] of orderedStratigraphy.entries()) {
    const foregroundToken = `rslog-lithology-foreground-${String(index + 1)}`;
    const backgroundToken = `rslog-lithology-background-${String(index + 1)}`;
    visualTokens[foregroundToken] = validColor(stratum.foregroundColor, neutralForeground);
    visualTokens[backgroundToken] = validColor(stratum.backgroundColor, neutralBackground);
    vectorPatterns.push(
      Object.freeze({
        id: `pattern-rslog-neutral-${String(index + 1)}`,
        kind: "line-hatch",
        foregroundToken,
        backgroundToken,
        spacingMpt: 5_000 as Mpt,
        markSizeMpt: 2_500 as Mpt,
        strokeWidthMpt: 450 as Mpt,
      }),
    );
  }
  const { pagination: priorPagination, ...baseWithoutPagination } = structuredClone(base);
  void priorPagination;
  return {
    ...baseWithoutPagination,
    templateId: `${base.templateId}:${sourceKind}`,
    depthTransform,
    ...(depthTransform.yEndMpt > yEndLimitMpt
      ? { pagination: { policy: "fixed-scale-continuation-v1", yEndLimitMpt } as const }
      : {}),
    vectorPatterns: Object.freeze(vectorPatterns),
    lithologyClassificationAppearanceDefaults: Object.freeze([]),
    lithologyIntervalAppearanceOverrides: Object.freeze([]),
    dataLayerSymbologyOverrides: Object.freeze([]),
    visualTokens: Object.freeze(visualTokens),
  };
}

function dataLayers(source: RsLogProjectDataDocument, borehole: RsLogProjectDataBorehole) {
  const nGraphMaximum = 100;
  const nValues = borehole.samples.flatMap((sample) => {
    const observed = blowObservation(sample.blowCounts);
    const refusal = sample.refusal ?? observed.refusal;
    const nValue = resolvedSampleNValue(sample, observed).value;
    return nValue === null && !refusal
      ? []
      : [[sample.identity, Math.min(nValue ?? nGraphMaximum, nGraphMaximum)] as const];
  });
  const moisture = borehole.samples
    .map((sample) => [sample.identity, sample.moistureW ?? sample.moistureContent] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null);
  const plasticity = borehole.samples
    .map((sample) => [sample.identity, sample.liquidLimit, sample.plasticLimit] as const)
    .filter(
      (entry): entry is readonly [string, number, number] => entry[1] !== null && entry[2] !== null,
    );
  const provenance = sourceProvenance(source, borehole.identity, "Samples.LabTests.IndexTests");
  return Object.freeze([
    ...(nValues.length === 0
      ? []
      : [
          Object.freeze({
            id: "layer-n-value",
            kind: "numeric-polyline" as const,
            axisId: "axis-n-value",
            glyph: "filled-square",
            values: Object.freeze(nValues),
            provenance: sourceProvenance(source, borehole.identity, "Samples.SPT.NValue"),
          }),
        ]),
    ...(moisture.length === 0
      ? []
      : [
          Object.freeze({
            id: "layer-moisture",
            kind: "numeric-polyline" as const,
            axisId: "axis-water-percent",
            glyph: "open-triangle" as const,
            values: Object.freeze(moisture),
            provenance,
          }),
        ]),
    ...(plasticity.length === 0
      ? []
      : [
          Object.freeze({
            id: "layer-plasticity-range",
            kind: "numeric-range" as const,
            axisId: "axis-water-percent",
            glyph: "open-circle-range" as const,
            values: Object.freeze(plasticity),
            provenance,
          }),
        ]),
  ]);
}

function sampleInput(source: RsLogProjectDataDocument, sample: RsLogProjectDataSample) {
  const observed = blowObservation(sample.blowCounts);
  const nValue = resolvedSampleNValue(sample, observed).value;
  return Object.freeze({
    id: sample.identity,
    label: sample.number ?? "",
    depthFt: sample.fromDepth,
    symbol: sample.typeName ?? "sample",
    recoveryPercent: sample.recoveryPercent,
    blowIncrements: observed.increments,
    nValue,
    refusal: sample.refusal ?? observed.refusal,
    provenance: sourceProvenance(source, sample.identity, "Sample"),
  });
}

function createDocument(
  source: RsLogProjectDataDocument,
  borehole: RsLogProjectDataBorehole,
  base: BoringLogLayoutJobInput,
) {
  const displayedGroundElevationFt = borehole.elevation ?? 0;
  const orderedStratigraphy = [...borehole.stratigraphy].sort(
    (left, right) => left.fromDepth - right.fromDepth || left.toDepth - right.toDepth,
  );
  const orderedSamples = [...borehole.samples].sort(
    (left, right) => left.fromDepth - right.fromDepth,
  );
  const layers = dataLayers(source, borehole);
  const remarks = [...borehole.comments]
    .sort((left, right) => left.depth - right.depth)
    .map((comment, index, comments) => {
      const nextDepth = comments[index + 1]?.depth ?? borehole.depth;
      const from =
        comment.depth >= borehole.depth ? Math.max(0, borehole.depth - 0.01) : comment.depth;
      const to = Math.min(borehole.depth, Math.max(from + 0.01, Math.min(nextDepth, from + 2)));
      return Object.freeze({
        id: comment.identity,
        depthFromFt: from,
        depthToFt: to,
        text: comment.description ?? "",
      });
    });
  const firstMethod = borehole.boringMethods[0] ?? null;
  const lithologyLegend = new Map<string, { id: string; label: string; symbol: string }>();
  for (const [index, stratum] of orderedStratigraphy.entries()) {
    const classification = mappedClassificationKey(stratum.soilSymbol, index);
    if (!lithologyLegend.has(classification)) {
      lithologyLegend.set(
        classification,
        Object.freeze({
          id: `legend-lithology-${String(index + 1)}`,
          label: stratum.soilSymbol ?? stratum.title ?? `Unmapped lithology ${String(index + 1)}`,
          symbol: `pattern-rslog-neutral-${String(index + 1)}`,
        }),
      );
    }
  }
  const legend = [
    Object.freeze({ id: "legend-sample", label: "Sample", symbol: "split-spoon" }),
    ...lithologyLegend.values(),
    Object.freeze({ id: "legend-observed", label: "Observed contact", symbol: "solid-line" }),
    ...(layers.some(({ id }) => id === "layer-moisture")
      ? [
          Object.freeze({
            id: "legend-water",
            label: "Water content, %",
            symbol: "open-triangle-line",
          }),
        ]
      : []),
    ...(layers.some(({ id }) => id === "layer-n-value")
      ? [Object.freeze({ id: "legend-n-value", label: "N, blows/ft", symbol: "filled-square" })]
      : []),
    ...(layers.some(({ id }) => id === "layer-plasticity-range")
      ? [
          Object.freeze({
            id: "legend-plll",
            label: "Plastic range PL-LL",
            symbol: "open-circle-range",
          }),
        ]
      : []),
    ...(borehole.groundwaterDepth === null
      ? []
      : [
          Object.freeze({
            id: "legend-groundwater",
            label: "Groundwater",
            symbol: "open-down-triangle",
          }),
        ]),
  ];
  const boringLogId = `urn:rsrender:boring-log:${borehole.identity}`;
  return {
    schemaVersion: "rsrender.boring-log-source-document.v1" as const,
    fixtureId: `${source.project.identity}:${borehole.identity}`,
    fixtureRevision: 1,
    evidenceClass: "source-project-data" as const,
    representativeClaimAllowed: true,
    publicationEligibility: "source-project-data" as const,
    identity: Object.freeze({
      boringLogId,
      explorationId: borehole.identity,
      pageId: `${boringLogId}:page:1`,
    }),
    metadata: Object.freeze({
      companyName: "RSrender",
      companyContactSubtitle: "Boring Log Publication",
      documentTitle: `BORING ${borehole.name}`,
      sheetLabel: "SHEET 1",
      clientName: source.project.clientName ?? "Not recorded",
      projectName: source.project.title,
      projectNumber: source.project.number ?? "Not recorded",
      location: source.project.address ?? "Not recorded",
      coordinates: coordinateText(borehole),
      coordinateDatum: source.project.coordinateSystem,
      groundElevationFt: displayedGroundElevationFt,
      elevationDatum: source.project.coordinateSystem,
      totalDepthFt: borehole.depth,
      completionDepthFt: borehole.depth,
      drilledDate: borehole.startDate ?? firstMethod?.date ?? "Not recorded",
      boringMethod: firstMethod?.drillMethod ?? "Not recorded",
      holeDiameter:
        borehole.holeDrillBitSize ??
        (firstMethod?.holeDiameter === null || firstMethod === null
          ? "Not recorded"
          : String(firstMethod.holeDiameter)),
      rigDriller:
        [firstMethod?.drillRigModel ?? borehole.equipment, borehole.drillerName]
          .filter((value): value is string => value !== null && value !== undefined)
          .join(" / ") || "Not recorded",
      hammerType: "Not recorded",
      hammerDrop: "Not recorded",
      hammerEfficiency: "Not recorded",
      loggedBy: borehole.loggedBy ?? "Not recorded",
      checkedBy: borehole.reviewedBy ?? "Not recorded",
      groundwaterSummary:
        borehole.groundwaterDepth === null
          ? (borehole.groundwaterNotes ?? "Not recorded")
          : `${String(borehole.groundwaterDepth)} ft${borehole.groundwaterNotes === null ? "" : ` - ${borehole.groundwaterNotes}`}`,
      provenance: sourceProvenance(source, borehole.identity, "Borehole.Metadata"),
    }),
    referenceDepthRange: Object.freeze({
      startFt: 0,
      endFt: borehole.depth,
      terminalInclusive: true,
    }),
    lithologyIntervals: Object.freeze(
      orderedStratigraphy.map((stratum, index) =>
        Object.freeze({
          id: stratum.identity,
          depthFromFt: stratum.fromDepth,
          depthToFt: stratum.toDepth,
          classification: stratum.title ?? stratum.soilSymbol ?? "Unclassified",
          mappedClassificationKey: mappedClassificationKey(stratum.soilSymbol, index),
          patternId: `pattern-rslog-neutral-${String(index + 1)}`,
          materialFillToken: `rslog-lithology-background-${String(index + 1)}`,
          description: materialDescription(stratum),
          transitions: Object.freeze([]),
          boundaryKind: "observed" as const,
          provenance: sourceProvenance(source, stratum.identity, "Stratigraphy"),
        }),
      ),
    ),
    samples: Object.freeze(orderedSamples.map((sample) => sampleInput(source, sample))),
    dataTrack: Object.freeze({
      id: "track-penetration-moisture",
      depthRange: Object.freeze({ startFt: 0, endFt: borehole.depth }),
      axes: Object.freeze([
        ...(layers.some(({ id }) => id === "layer-n-value")
          ? [
              Object.freeze({
                id: "axis-n-value",
                quantity: "spt-n-value" as const,
                unit: "blows-per-foot" as const,
                minimum: 0,
                maximum: 100,
              }),
            ]
          : []),
        Object.freeze({
          id: "axis-water-percent",
          quantity: "water-content-percent",
          unit: "percent",
          minimum: 0,
          maximum: 100,
        }),
      ]),
      layers,
    }),
    remarks: Object.freeze(remarks),
    legend: Object.freeze(legend),
    notes: Object.freeze([
      source.schemaVersion === "rslog.live-rsgeo.v1"
        ? "Imported from the authorized RSLog live API."
        : "Imported from RSLog Project JSON v3.",
      ...(borehole.elevation === null
        ? [
            "Top elevation was not recorded by the source. The displayed 0 ft placeholder must be replaced in Data before publication.",
          ]
        : []),
      `Source unit system: ${source.project.unitSystem}.`,
      ...(layers.some(({ id }) => id === "layer-n-value")
        ? ["N graph display is capped at the configured 100 blows/ft axis maximum."]
        : []),
      "Neutral hatches indicate unavailable RSLog pattern mappings.",
    ]),
    approval: Object.freeze({
      heading: "REVIEWED & APPROVED",
      sealPlaceholder: base.document.approval.sealPlaceholder,
      reviewerName: borehole.reviewedBy ?? "Not recorded",
      reviewedDate: borehole.endDate ?? "Not recorded",
    }),
  };
}

export function createRsLogProjectDataLayoutJobs(
  input: Readonly<{
    source: RsLogProjectDataDocument;
    templateJob: BoringLogLayoutJobInput;
  }>,
): RsLogProjectDataLayoutJobResult {
  const validatedTemplateJob = validateBoringLogLayoutJobInput(input.templateJob);
  if (!validatedTemplateJob.accepted) {
    return Object.freeze({
      accepted: false,
      code: "RSLOG_PROJECT_DATA_LAYOUT_TEMPLATE_INVALID",
      boringIdentity: null,
      diagnosticCode: validatedTemplateJob.code,
    });
  }
  const layoutJobs: BoringLogLayoutJobInput[] = [];
  const warnings = new Set<string>();
  for (const borehole of input.source.boreholes) {
    const document = createDocument(input.source, borehole, validatedTemplateJob.value);
    const template = sourceTemplate(validatedTemplateJob.value.template, borehole);
    const candidate = validateBoringLogLayoutJobInput({
      contractVersion: 1,
      schemaVersion: "rsrender.boring-log-layout-job.v1",
      kind: "boring-log.layout-job",
      jobId: `job:${input.source.schemaVersion === "rslog.live-rsgeo.v1" ? "rslog-live" : "rslog-project-json"}:${borehole.identity}@r1`,
      inputRevision: 1,
      fixtureDigest: sha256CanonicalJson(document),
      templateDigest: sha256CanonicalJson(template),
      document,
      template,
    });
    if (!candidate.accepted) {
      return Object.freeze({
        accepted: false,
        code: "RSLOG_PROJECT_DATA_LAYOUT_DOCUMENT_INVALID",
        boringIdentity: borehole.identity,
        diagnosticCode: candidate.code,
      });
    }
    if (borehole.stratigraphy.length > 0) warnings.add("RSLOG_HATCH_PATTERN_FALLBACK");
    if (borehole.elevation === null) warnings.add("RSLOG_TOP_ELEVATION_PLACEHOLDER");
    if (
      borehole.samples.some(
        (sample) => resolvedSampleNValue(sample).source === "standard-n2-plus-n3",
      )
    ) {
      warnings.add("RSLOG_N_VALUE_DERIVED_FROM_STANDARD_INCREMENTS");
    }
    if (
      borehole.samples.some(
        (sample) =>
          sample.blowCounts !== null &&
          sample.nValue === null &&
          !(sample.refusal ?? blowObservation(sample.blowCounts).refusal) &&
          resolvedSampleNValue(sample).source === "missing",
      )
    ) {
      warnings.add("RSLOG_N_VALUE_NOT_INFERRED");
    }
    layoutJobs.push(candidate.value);
  }
  return Object.freeze({
    accepted: true,
    code: "RSLOG_PROJECT_DATA_LAYOUT_ACCEPTED",
    layoutJobs: Object.freeze(layoutJobs),
    warnings: Object.freeze([...warnings].sort()),
  });
}
