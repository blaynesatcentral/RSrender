import {
  createDiagnosticFact,
  DIAGNOSTIC_FACT_CATEGORIES,
  DIAGNOSTIC_FACT_CONSEQUENCES,
} from "../../packages/domain/dist/index.js";

export const bld014FixtureRevision = "bld-014-diagnostic-fact-fixture-v1";
export const bld014OracleRevision = "bld-014-diagnostic-fact-oracle-v1";
export const bld014GeneratorRevision = "bld-014-diagnostic-fact-generator-v1";
export const bld014PropertySeeds = Object.freeze([0x13579bdf, 0x2468ace0, 0x5eedb014]);
export const bld014IterationsPerSeed = 1_000;

export const digest = (character) => `sha256:${character.repeat(64)}`;

export function makeDiagnosticDraft(index = 0, overrides = {}) {
  const sequence = String(index + 1).padStart(4, "0");
  return {
    factVersion: 1,
    code: `SYNTHETIC.DIAGNOSTIC_${sequence}`,
    category: DIAGNOSTIC_FACT_CATEGORIES[index % DIAGNOSTIC_FACT_CATEGORIES.length],
    affected: {
      identityKind: "synthetic.entity",
      identity: `synthetic:entity:${sequence}`,
      ...(index % 2 === 0 ? { path: `/synthetic/value/${sequence}` } : {}),
    },
    cause: {
      causeKey: `synthetic.cause_${sequence}`,
      evidenceClass: `synthetic.evidence_${(index % 5) + 1}`,
    },
    consequence: DIAGNOSTIC_FACT_CONSEQUENCES[index % DIAGNOSTIC_FACT_CONSEQUENCES.length],
    input: {
      revision: `synthetic-revision:${sequence}`,
      digest: digest(((index % 10) + 1).toString(16)),
    },
    remediationActionIds:
      index % 3 === 0
        ? [`review.synthetic_${sequence}`, `inspect.synthetic_${sequence}`]
        : [`inspect.synthetic_${sequence}`],
    ...overrides,
  };
}

export function createFixtureFact(draft) {
  const result = createDiagnosticFact(draft);
  if (!result.accepted) throw new Error(`fixture rejected: ${result.code}`);
  return result.value;
}

export const bld014BoundaryDrafts = Object.freeze(
  DIAGNOSTIC_FACT_CATEGORIES.map((_, index) => makeDiagnosticDraft(index)),
);

export const bld014BoundaryFacts = Object.freeze(bld014BoundaryDrafts.map(createFixtureFact));

export function reorderedRecord(record) {
  return Object.fromEntries(Object.entries(record).reverse());
}
