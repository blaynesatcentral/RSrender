import assert from "node:assert/strict";

import {
  assembleBoundedOverrideRenderDataset,
  createDisplayValueOverride,
  decodePresentationOverrideCollection,
  digestSourceBaselineValue,
  encodePresentationOverrideCollection,
  encodeSourceSnapshot,
} from "../../packages/domain/dist/index.js";
import { bld015ExplorationNameField } from "./bld-015-fixtures.mjs";
import {
  bld017IterationsPerSeed,
  bld017MinimalPropertySnapshot,
  bld017PropertySeeds,
  makeCollection,
  makeAssemblyInput,
  makeOverrideDraft,
  requireAccepted,
} from "./bld-017-fixtures.mjs";

export function runBld017PropertyModel() {
  const baselineDigest = requireAccepted(
    digestSourceBaselineValue(bld015ExplorationNameField.value),
  );
  const snapshotBefore = encodeSourceSnapshot(bld017MinimalPropertySnapshot);
  let cases = 0;
  const outcomes = Object.create(null);
  for (const seed of bld017PropertySeeds) {
    for (let index = 0; index < bld017IterationsPerSeed; index += 1) {
      const mode = index % 6;
      const changes = {
        localOverrideIdentity: `urn:test:bld-017:property:override:${seed}:${index}`,
        replacementText: `SYNTHETIC-OVERRIDE-${seed}-${index}`,
        authorIdentity: `urn:test:bld-017:property:author:${seed % 17}:${index % 19}`,
        recordedAtUtc: `2026-08-20T${String(10 + (index % 10)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`,
      };
      let draft = makeOverrideDraft(changes);
      let expected = { assembled: true };
      if (mode === 1) {
        draft = makeOverrideDraft({
          ...changes,
          expectedSourceValueDigest: `sha256:${"f".repeat(64)}`,
        });
        expected = { assembled: false, code: "BOUNDED_OVERRIDE_ASSEMBLY_STALE_BASELINE" };
      } else if (mode === 2) {
        draft.expectedSourceValueType = "number";
        draft.replacementValue.content = {
          kind: "value",
          value: index,
          originalRepresentation: String(index),
        };
        expected = { assembled: false, code: "BOUNDED_OVERRIDE_ASSEMBLY_RETYPE_CONFLICT" };
      } else if (mode === 3) {
        draft.expectedSourceUnit = { state: "specified", quantity: "length", symbol: "m" };
        draft.replacementValue.unit = draft.expectedSourceUnit;
        expected = { assembled: false, code: "BOUNDED_OVERRIDE_ASSEMBLY_UNIT_CONFLICT" };
      } else if (mode === 4) {
        const deletedIdentity = `urn:test:bld-017:property:deleted-field:${seed}:${index}`;
        draft.targetSourceFieldIdentity = deletedIdentity;
        draft.replacementValue.provenance.sourceFieldIdentity = deletedIdentity;
        expected = { assembled: false, code: "BOUNDED_OVERRIDE_ASSEMBLY_OVERRIDE_TARGET_DELETED" };
      }
      const item = requireAccepted(createDisplayValueOverride(draft));
      const expectedTargetIdentity =
        mode === 4
          ? `urn:test:bld-017:property:deleted-field:${seed}:${index}`
          : bld015ExplorationNameField.sourceFieldIdentity;
      const collection = makeCollection([item]);
      const encoded = encodePresentationOverrideCollection(collection);
      assert.equal(encoded.accepted, true);
      const decoded = decodePresentationOverrideCollection(JSON.parse(encoded.canonicalJson));
      assert.equal(decoded.accepted, true);

      // Exact target and provenance identity varies without becoming implicit display state.
      assert.equal(item.targetSourceFieldIdentity, expectedTargetIdentity);
      assert.equal(
        item.targetSourceEntityIdentity,
        bld015ExplorationNameField.sourceEntityIdentity,
      );
      assert.equal(
        item.replacementValue.provenance.presentationOverrideIdentity,
        item.presentationOverrideIdentity,
      );
      assert.equal(item.replacementValue.provenance.sourceFieldIdentity, expectedTargetIdentity);

      // Baseline, type, and unit are explicit and unchanged by provenance retrieval time.
      assert.equal(
        item.expectedSourceValueDigest,
        mode === 1 ? `sha256:${"f".repeat(64)}` : baselineDigest,
      );
      assert.equal(item.expectedSourceValueType, mode === 2 ? "number" : "string");
      assert.deepEqual(
        item.expectedSourceUnit,
        mode === 3
          ? { state: "specified", quantity: "length", symbol: "m" }
          : bld015ExplorationNameField.value.unit,
      );

      // Canonical determinism and immutability.
      assert.deepEqual(decoded.value, collection);
      assert.equal(encodePresentationOverrideCollection(decoded.value).digest, encoded.digest);
      assert.equal(Object.isFrozen(decoded.value), true);
      assert.equal(Object.isFrozen(decoded.value.items), true);
      const input = makeAssemblyInput(collection, bld017MinimalPropertySnapshot);
      const outcome = assembleBoundedOverrideRenderDataset(input);
      const repeatedOutcome = assembleBoundedOverrideRenderDataset(input);
      assert.deepEqual(repeatedOutcome, outcome);
      assert.equal(outcome.assembled, expected.assembled);
      if (!expected.assembled) assert.equal(outcome.code, expected.code);
      assert.deepEqual(encodeSourceSnapshot(bld017MinimalPropertySnapshot), snapshotBefore);
      const outcomeKey = expected.assembled ? "assembled" : expected.code;
      outcomes[outcomeKey] = (outcomes[outcomeKey] ?? 0) + 1;
      cases += 1;
    }
  }
  assert.deepEqual(encodeSourceSnapshot(bld017MinimalPropertySnapshot), snapshotBefore);
  return Object.freeze({
    seeds: bld017PropertySeeds,
    cases,
    invariantsPerCase: 10,
    invariantEvaluations: cases * 10,
    outcomes: Object.freeze({ ...outcomes }),
  });
}
