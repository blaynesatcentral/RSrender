import {
  createSourceRecord,
  deriveSourceEntityIdentity,
  encodeSourceRecord,
} from "../../packages/domain/dist/index.js";
import { bld015SourceContextIdentity, makeBld015SnapshotDraft } from "./bld-015-fixtures.mjs";

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
}

export function runBld015PropertyModel(seed, iterations) {
  const next = rng(seed);
  const failures = [];
  const counters = {
    identityCases: 0,
    parentCardinalityCases: 0,
    immutabilityCases: 0,
    orderingCases: 0,
    canonicalDigestCases: 0,
  };
  const stableDraft = makeBld015SnapshotDraft();
  const stableRecord = stableDraft.samples[0];
  const stableEncoded = encodeSourceRecord(stableRecord);
  if (!stableEncoded.accepted) throw new Error(stableEncoded.code);
  for (let index = 0; index < iterations; index += 1) {
    try {
      const native = `urn:test:bld-015:property:sample:${seed}:${next()}`;
      const first = deriveSourceEntityIdentity({
        sourceContextIdentity: bld015SourceContextIdentity,
        entityKind: "sample",
        providerNativeIdentity: native,
      });
      const repeated = deriveSourceEntityIdentity({
        sourceContextIdentity: bld015SourceContextIdentity,
        entityKind: "sample",
        providerNativeIdentity: native,
      });
      const otherKind = deriveSourceEntityIdentity({
        sourceContextIdentity: bld015SourceContextIdentity,
        entityKind: "stratum",
        providerNativeIdentity: native,
      });
      if (
        !first.accepted ||
        !repeated.accepted ||
        !otherKind.accepted ||
        first.value !== repeated.value ||
        first.value === otherKind.value
      ) {
        throw new Error("identity invariant");
      }
      counters.identityCases += 1;

      const parentResult = createSourceRecord({
        recordVersion: 1,
        entityKind: stableRecord.entityKind,
        sourceContextIdentity: stableRecord.sourceContextIdentity,
        providerNativeIdentity: stableRecord.providerNativeIdentity,
        parentEntityIdentity: null,
        relatedEntityIdentity: stableRecord.relatedEntityIdentity,
        sourceOrder: stableRecord.sourceOrder,
        fields: stableRecord.fields,
        lookupReferences: stableRecord.lookupReferences,
        fieldTestColumns: stableRecord.fieldTestColumns,
        extensionObservations: stableRecord.extensionObservations,
      });
      if (parentResult.accepted || parentResult.code !== "SOURCE_SNAPSHOT_INVALID_RELATIONSHIP") {
        throw new Error("parent/cardinality invariant");
      }
      counters.parentCardinalityCases += 1;

      const mutableFields = [...stableRecord.fields].reverse();
      const mutableReferences = [...stableRecord.lookupReferences];
      const recordDraft = {
        recordVersion: 1,
        entityKind: stableRecord.entityKind,
        sourceContextIdentity: stableRecord.sourceContextIdentity,
        providerNativeIdentity: stableRecord.providerNativeIdentity,
        parentEntityIdentity: stableRecord.parentEntityIdentity,
        relatedEntityIdentity: stableRecord.relatedEntityIdentity,
        sourceOrder: stableRecord.sourceOrder,
        fields: mutableFields,
        lookupReferences: mutableReferences,
        fieldTestColumns: stableRecord.fieldTestColumns,
        extensionObservations: stableRecord.extensionObservations,
      };
      const created = createSourceRecord(recordDraft);
      if (!created.accepted) throw new Error(`valid create ${created.code}`);
      if (created.value.logicalDigest !== stableRecord.logicalDigest) {
        throw new Error("ordering invariant");
      }
      counters.orderingCases += 1;

      const before = encodeSourceRecord(created.value);
      if (!before.accepted) throw new Error(before.code);
      mutableFields.reverse();
      mutableFields.push({ private: true });
      mutableReferences.push({ private: true });
      recordDraft.providerNativeIdentity = "private-mutated-identity";
      const after = encodeSourceRecord(created.value);
      if (!after.accepted || after.canonicalJson !== before.canonicalJson) {
        throw new Error("immutability invariant");
      }
      counters.immutabilityCases += 1;

      if (
        before.digest !== stableEncoded.digest ||
        before.canonicalJson !== stableEncoded.canonicalJson
      ) {
        throw new Error("canonical digest invariant");
      }
      counters.canonicalDigestCases += 1;
    } catch (error) {
      failures.push({ index, message: error instanceof Error ? error.message : "unknown" });
      break;
    }
  }
  return Object.freeze({ seed, iterations, ...counters, failures: Object.freeze(failures) });
}
