import {
  createDiagnosticFact,
  decodeDiagnosticFact,
  encodeDiagnosticFact,
  encodeDiagnosticFactSet,
  DIAGNOSTIC_FACT_CATEGORIES,
  DIAGNOSTIC_FACT_CONSEQUENCES,
} from "../../packages/domain/dist/index.js";
import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

import { makeDiagnosticDraft, reorderedRecord } from "./bld-014-fixtures.mjs";

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

function recordFailure(failures, invariant, seed, iteration, detail) {
  failures.push({ invariant, seed, iteration, detail });
}

function accepted(result) {
  return result.accepted ? result.value : undefined;
}

function permutation(values, choice) {
  const orders = [
    [0, 1, 2],
    [2, 0, 1],
    [1, 2, 0],
    [2, 1, 0],
    [0, 2, 1],
    [1, 0, 2],
  ];
  return orders[choice % orders.length].map((index) => values[index]);
}

function identityInvariantVariant(draft, iteration) {
  switch (iteration % 5) {
    case 0:
      return {
        ...draft,
        category:
          DIAGNOSTIC_FACT_CATEGORIES[
            (DIAGNOSTIC_FACT_CATEGORIES.indexOf(draft.category) + 1) %
              DIAGNOSTIC_FACT_CATEGORIES.length
          ],
      };
    case 1:
      return {
        ...draft,
        cause: { ...draft.cause, evidenceClass: `${draft.cause.evidenceClass}_variant` },
      };
    case 2:
      return {
        ...draft,
        consequence:
          DIAGNOSTIC_FACT_CONSEQUENCES[
            (DIAGNOSTIC_FACT_CONSEQUENCES.indexOf(draft.consequence) + 1) %
              DIAGNOSTIC_FACT_CONSEQUENCES.length
          ],
      };
    case 3:
      return {
        ...draft,
        input: { ...draft.input, digest: `sha256:${"f".repeat(64)}` },
      };
    default:
      return {
        ...draft,
        remediationActionIds: [...draft.remediationActionIds, `resolve.variant_${iteration}`],
      };
  }
}

function identitySensitivityVariant(draft, iteration) {
  switch (iteration % 6) {
    case 0:
      return { ...draft, code: `${draft.code}_VARIANT` };
    case 1:
      return {
        ...draft,
        affected: { ...draft.affected, identityKind: `${draft.affected.identityKind}_variant` },
      };
    case 2:
      return {
        ...draft,
        affected: { ...draft.affected, identity: `${draft.affected.identity}:variant` },
      };
    case 3:
      return {
        ...draft,
        affected: { ...draft.affected, path: `${draft.affected.path ?? "/synthetic"}/variant` },
      };
    case 4:
      return {
        ...draft,
        cause: { ...draft.cause, causeKey: `${draft.cause.causeKey}_variant` },
      };
    default:
      return {
        ...draft,
        input: { ...draft.input, revision: `${draft.input.revision}:variant` },
      };
  }
}

export function runBld014PropertyModel(seed, iterations) {
  const random = seededRandom(seed);
  const failures = [];
  let codecCases = 0;
  let identityCases = 0;
  let orderingCases = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const uniqueIndex = (seed >>> 0) * 10_000 + iteration;
    const draft = makeDiagnosticDraft(uniqueIndex, {
      affected: {
        identityKind: "synthetic.entity",
        identity: `synthetic:property:${seed}:${iteration}:α`,
        ...(iteration % 2 === 0 ? { path: `/property/${seed}/${iteration}` } : {}),
      },
      input: {
        revision: `property-revision:${seed}:${iteration}`,
        digest: `sha256:${(random() % 16).toString(16).repeat(64)}`,
      },
    });

    const created = createDiagnosticFact({
      ...reorderedRecord(draft),
      affected: reorderedRecord(draft.affected),
      cause: reorderedRecord(draft.cause),
      input: reorderedRecord(draft.input),
      remediationActionIds: [...draft.remediationActionIds].reverse(),
    });
    const fact = accepted(created);
    if (!fact) {
      recordFailure(failures, "codec", seed, iteration, created.code);
    } else {
      const encoded = encodeDiagnosticFact(fact);
      const decoded = encoded.accepted
        ? decodeDiagnosticFact(JSON.parse(encoded.canonicalJson))
        : encoded;
      if (
        !encoded.accepted ||
        !decoded.accepted ||
        encoded.canonicalJson !==
          (decoded.accepted ? encodeDiagnosticFact(decoded.value).canonicalJson : undefined)
      ) {
        recordFailure(failures, "codec", seed, iteration, "round-trip drift");
      }
    }
    codecCases += 1;

    const stable = createDiagnosticFact(identityInvariantVariant(draft, iteration));
    const changed = createDiagnosticFact(identitySensitivityVariant(draft, iteration));
    if (
      !fact ||
      !stable.accepted ||
      !changed.accepted ||
      stable.value.diagnosticIdentity !== fact.diagnosticIdentity ||
      changed.value.diagnosticIdentity === fact.diagnosticIdentity
    ) {
      recordFailure(failures, "identity", seed, iteration, "identity basis drift");
    }
    identityCases += 1;

    const candidates = [0, 1, 2].map((offset) =>
      createDiagnosticFact(
        makeDiagnosticDraft(uniqueIndex + (offset + 1) * 1_000_000, {
          input: {
            revision: `ordering-revision:${seed}:${iteration}:${offset}`,
            digest: `sha256:${((random() + offset) % 16).toString(16).repeat(64)}`,
          },
        }),
      ),
    );
    if (candidates.some((candidate) => !candidate.accepted)) {
      recordFailure(failures, "ordering", seed, iteration, "generated fact rejected");
    } else {
      const facts = candidates.map((candidate) => candidate.value);
      const first = encodeDiagnosticFactSet(facts);
      const second = encodeDiagnosticFactSet(permutation(facts, random()));
      if (
        !first.accepted ||
        !second.accepted ||
        first.canonicalJson !== second.canonicalJson ||
        first.digest !== second.digest
      ) {
        recordFailure(failures, "ordering", seed, iteration, "insertion-order drift");
      }
    }
    orderingCases += 1;
  }

  const result = Object.freeze({
    seed,
    iterations,
    codecCases,
    identityCases,
    orderingCases,
    failures: Object.freeze(failures),
  });
  return Object.freeze({ ...result, digest: sha256CanonicalJson(result) });
}
