import { sha256CanonicalJson } from "@rsrender/contracts";
import type {
  BoringLogLayoutJobInput,
  BoringLogLithologyIntervalInput,
  BoringLogSourceProvenance,
  BoringLogValueProvenance,
  BoringLogVectorPatternResource,
} from "@rsrender/contracts";

export const boringLogLithologyAppearanceRevision = "bld-043-lithology-appearance-v1" as const;

export type BoringLogLithologyAppearanceApplication =
  | Readonly<{ kind: "source" }>
  | Readonly<{
      kind: "classification-default" | "interval-override";
      overrideIdentity: string;
      overrideRevision: number;
    }>;

export interface ResolvedBoringLogLithologyAppearance {
  readonly boringLogIdentity: string;
  readonly intervalId: string;
  readonly mappedClassificationKey: string;
  readonly sourceMaterialFillToken: string;
  readonly sourcePatternId: string;
  readonly materialFillToken: string;
  readonly patternId: string;
  /** Exact paint resource used by the interval rect after background composition. */
  readonly patternPaintId: string;
  readonly materialFillApplication: BoringLogLithologyAppearanceApplication;
  readonly patternApplication: BoringLogLithologyAppearanceApplication;
  readonly materialFillProvenance: BoringLogValueProvenance;
  readonly patternProvenance: BoringLogValueProvenance;
}

type AppearanceAuthority = Readonly<{
  materialFillToken: string | null;
  patternId: string | null;
  overrideIdentity: string;
  overrideRevision: number;
}>;

function sourceProvenance(provenance: BoringLogValueProvenance): BoringLogSourceProvenance {
  return provenance.provenanceClass === "source" ? provenance : provenance.original;
}

function application(
  kind: "classification-default" | "interval-override",
  authority: AppearanceAuthority,
): BoringLogLithologyAppearanceApplication {
  return Object.freeze({
    kind,
    overrideIdentity: authority.overrideIdentity,
    overrideRevision: authority.overrideRevision,
  });
}

function provenance(
  source: BoringLogValueProvenance,
  applied: BoringLogLithologyAppearanceApplication,
): BoringLogValueProvenance {
  return applied.kind === "source"
    ? source
    : Object.freeze({
        provenanceClass: "effective-override" as const,
        original: sourceProvenance(source),
        overrideIdentity: applied.overrideIdentity,
        overrideRevision: applied.overrideRevision,
        transformation: "replace-style-token" as const,
      });
}

function compositePatternId(patternId: string, backgroundToken: string): string {
  return `pattern-composite-${sha256CanonicalJson({ patternId, backgroundToken }).slice(
    "sha256:".length,
    "sha256:".length + 32,
  )}`;
}

function resolvedPatternPaintId(
  job: BoringLogLayoutJobInput,
  patternId: string,
  materialFillToken: string,
): string {
  const pattern = job.template.vectorPatterns.find(({ id }) => id === patternId)!;
  const tokens = job.template.visualTokens;
  return tokens[pattern.backgroundToken] === tokens[materialFillToken]
    ? pattern.id
    : compositePatternId(pattern.id, materialFillToken);
}

/** Resolves each visual property independently: interval > classification > source/template. */
export function resolveBoringLogLithologyAppearance(
  job: BoringLogLayoutJobInput,
  interval: BoringLogLithologyIntervalInput,
): ResolvedBoringLogLithologyAppearance {
  const boringLogIdentity = job.document.identity.boringLogId;
  const intervalOverride = job.template.lithologyIntervalAppearanceOverrides?.find(
    (candidate) =>
      candidate.boringLogIdentity === boringLogIdentity && candidate.intervalId === interval.id,
  );
  const classificationDefault = job.template.lithologyClassificationAppearanceDefaults?.find(
    (candidate) => candidate.mappedClassificationKey === interval.mappedClassificationKey,
  );
  const inherited = Object.freeze({ kind: "source" as const });
  const materialFillAuthority =
    intervalOverride?.materialFillToken !== null &&
    intervalOverride?.materialFillToken !== undefined
      ? ({ kind: "interval-override", authority: intervalOverride } as const)
      : classificationDefault?.materialFillToken !== null &&
          classificationDefault?.materialFillToken !== undefined
        ? ({ kind: "classification-default", authority: classificationDefault } as const)
        : null;
  const patternAuthority =
    intervalOverride?.patternId !== null && intervalOverride?.patternId !== undefined
      ? ({ kind: "interval-override", authority: intervalOverride } as const)
      : classificationDefault?.patternId !== null && classificationDefault?.patternId !== undefined
        ? ({ kind: "classification-default", authority: classificationDefault } as const)
        : null;
  const materialFillToken =
    materialFillAuthority?.authority.materialFillToken ?? interval.materialFillToken;
  const patternId = patternAuthority?.authority.patternId ?? interval.patternId;
  const materialFillApplication =
    materialFillAuthority === null
      ? inherited
      : application(materialFillAuthority.kind, materialFillAuthority.authority);
  const patternApplication =
    patternAuthority === null
      ? inherited
      : application(patternAuthority.kind, patternAuthority.authority);
  return Object.freeze({
    boringLogIdentity,
    intervalId: interval.id,
    mappedClassificationKey: interval.mappedClassificationKey,
    sourceMaterialFillToken: interval.materialFillToken,
    sourcePatternId: interval.patternId,
    materialFillToken,
    patternId,
    patternPaintId: resolvedPatternPaintId(job, patternId, materialFillToken),
    materialFillApplication,
    patternApplication,
    materialFillProvenance: provenance(interval.provenance, materialFillApplication),
    patternProvenance: provenance(interval.provenance, patternApplication),
  });
}

export function resolveBoringLogLithologyAppearances(
  job: BoringLogLayoutJobInput,
): readonly ResolvedBoringLogLithologyAppearance[] {
  return Object.freeze(
    job.document.lithologyIntervals.map((interval) =>
      resolveBoringLogLithologyAppearance(job, interval),
    ),
  );
}

/** Returns admitted base resources plus only the required deterministic background composites. */
export function resolveBoringLogLithologyPatternResources(
  job: BoringLogLayoutJobInput,
): readonly BoringLogVectorPatternResource[] {
  const appearances = resolveBoringLogLithologyAppearances(job);
  const requiredBaseIds = new Set([
    ...appearances.map(({ patternId }) => patternId),
    ...job.document.legend
      .map(({ symbol }) => symbol)
      .filter((symbol) => job.template.vectorPatterns.some(({ id }) => id === symbol)),
  ]);
  const admitted = new Map(job.template.vectorPatterns.map((pattern) => [pattern.id, pattern]));
  const resources = new Map(
    job.template.vectorPatterns
      .filter(({ id }) => requiredBaseIds.has(id))
      .map((pattern) => [pattern.id, Object.freeze({ ...pattern })]),
  );
  for (const appearance of appearances) {
    if (resources.has(appearance.patternPaintId)) continue;
    const pattern = admitted.get(appearance.patternId)!;
    resources.set(
      appearance.patternPaintId,
      Object.freeze({
        ...pattern,
        id: appearance.patternPaintId,
        backgroundToken: appearance.materialFillToken,
      }),
    );
  }
  return Object.freeze([...resources.values()]);
}
