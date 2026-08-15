import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import { writeAggregateEvidenceIndex } from "../../packages/test-support/dist/index.js";
import { bld013IndexDraft, clone } from "./bld-013-index-fixture.mjs";

export const propertySeeds = Object.freeze([0x13579bdf, 0x2468ace0, 0x5eed1301]);
export const iterationsPerSeed = 1000;

function nextRandom(state) {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function mutate(draft, kind, salt) {
  const entryIndex = salt % draft.entries.length;
  const entry = draft.entries[entryIndex];
  const fixtureEntry = draft.entries.find(({ fixtureLinks }) => fixtureLinks.length > 0);
  const qualifiedWrong = `sha256:${String(salt).padStart(64, "0").slice(-64)}`;
  switch (kind) {
    case 0:
      draft.entries.pop();
      break;
    case 1:
      draft.entries[1].ticketId = "BLD-008";
      break;
    case 2:
      draft.entries[1].entryId = draft.entries[0].entryId;
      break;
    case 3:
      entry.sourceManifest.digest = qualifiedWrong;
      entry.sourceManifest.manifestIdentity = `${entry.sourceManifest.path}@${qualifiedWrong}`;
      break;
    case 4:
      entry.sourceManifest.schema = "rsrender.bld-evidence.future";
      break;
    case 5:
      entry.sourceManifest.resultState =
        entry.sourceManifest.resultState === "PASS" ? "FAIL" : "PASS";
      break;
    case 6:
      entry.sourceManifest.resultState = "UNKNOWN";
      break;
    case 7:
      draft.entries[1].requirementLinks = draft.entries[1].requirementLinks.filter(
        ({ requirementId }) => requirementId !== "OA-GOLD-001",
      );
      break;
    case 8:
      draft.entries[0].authorityLinks.pop();
      break;
    case 9:
      draft.entries[1].authorityLinks = [clone(draft.entries[0].authorityLinks[0])];
      break;
    case 10:
      fixtureEntry.fixtureLinks[0].digest = qualifiedWrong;
      break;
    case 11:
      fixtureEntry.fixtureLinks[0].fixtureRevision += `-forged-${salt}`;
      break;
    case 12:
      entry.oracleLink.version += `-forged-${salt}`;
      entry.oracleLink.oracleId = entry.oracleLink.version;
      break;
    case 13:
      entry.revisionLinks[0].revision += `-forged-${salt}`;
      break;
    case 14:
      entry.sourceManifest.failuresDigest = qualifiedWrong;
      break;
    case 15:
      entry.sourceManifest.nonclaimsDigest = qualifiedWrong;
      break;
    case 16:
      entry.sourceManifest.failuresPointer = `/missing/${salt}`;
      break;
    case 17:
      entry.sourceManifest.path = `artifacts/not-selected-${salt}.json`;
      entry.sourceManifest.manifestIdentity = `${entry.sourceManifest.path}@${entry.sourceManifest.digest}`;
      break;
    case 18:
      draft.nonclaims.pop();
      break;
    default:
      entry.unexpected = salt;
      break;
  }
}

export async function runBld013PropertyModel() {
  const { draft: baseline, source } = await bld013IndexDraft();
  const seedResults = [];
  for (const seed of propertySeeds) {
    let state = seed;
    const diagnosticCounts = new Map();
    for (let iteration = 0; iteration < iterationsPerSeed; iteration += 1) {
      state = nextRandom(state);
      const draft = clone(baseline);
      const kind = state % 20;
      mutate(draft, kind, iteration + 1);
      const result = await writeAggregateEvidenceIndex(draft, source);
      if (result.ok) throw new Error(`BLD-013 property mutation ${kind} was accepted`);
      for (const { code } of result.diagnostics) {
        diagnosticCounts.set(code, (diagnosticCounts.get(code) ?? 0) + 1);
      }
    }
    seedResults.push({
      seed,
      iterations: iterationsPerSeed,
      diagnosticCounts: Object.fromEntries(
        [...diagnosticCounts].sort(([a], [b]) => a.localeCompare(b)),
      ),
    });
  }
  const result = {
    seeds: propertySeeds,
    iterationsPerSeed,
    totalRejectedMutations: propertySeeds.length * iterationsPerSeed,
    seedResults,
  };
  return Object.freeze({ ...result, digest: sha256CanonicalJson(result) });
}
