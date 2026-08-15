import { canonicalizeJson, sha256Utf8 } from "../../packages/contracts/dist/index.js";

import {
  historyCore,
  initialHistoryDigest,
  makeHistoryMutation,
  makeHistoryRedo,
  makeHistoryUndo,
} from "./bld-011-fixtures.mjs";

export const historyPropertySeeds = Object.freeze([0x13579bdf, 0x2468ace0, 0x5eed1234]);
export const historyPropertyIterationsPerSeed = 1_000;

function invariant(condition, code) {
  if (!condition) throw new Error(`BLD011_PROPERTY_INVARIANT:${code}`);
}

export async function runHistoryPropertyModel() {
  const finalStates = [];
  for (const seed of historyPropertySeeds) {
    let state = seed >>> 0;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state >>> 0;
    };
    const core = historyCore();
    const model = [initialHistoryDigest];
    let cursor = 0;
    let workingRevision = 0;
    let committedOperations = 0;
    let rejectedOperations = 0;
    for (let index = 0; index < historyPropertyIterationsPerSeed; index += 1) {
      const choice = random() % 3;
      let result;
      if (choice === 0) {
        const digest = sha256Utf8(`seed:${seed}:step:${index}`);
        result = await core.execute(
          makeHistoryMutation({
            requestId: `urn:test:bld-011:property:${seed}:${index}`,
            expectedWorkingRevision: workingRevision,
            newContentDigest: digest,
          }),
        );
        model.splice(cursor + 1);
        model.push(digest);
        cursor += 1;
        workingRevision += 1;
        invariant(result.kind === "history.committed", "MUTATION_MUST_COMMIT");
      } else if (choice === 1) {
        result = await core.execute(
          makeHistoryUndo({
            requestId: `urn:test:bld-011:property:${seed}:${index}`,
            expectedWorkingRevision: workingRevision,
          }),
        );
        if (cursor > 0) {
          cursor -= 1;
          workingRevision += 1;
          invariant(result.kind === "history.committed", "UNDO_MUST_COMMIT");
        } else {
          invariant(result.kind === "history.rejected", "EMPTY_UNDO_MUST_REJECT");
        }
      } else {
        result = await core.execute(
          makeHistoryRedo({
            requestId: `urn:test:bld-011:property:${seed}:${index}`,
            expectedWorkingRevision: workingRevision,
          }),
        );
        if (cursor < model.length - 1) {
          cursor += 1;
          workingRevision += 1;
          invariant(result.kind === "history.committed", "REDO_MUST_COMMIT");
        } else {
          invariant(result.kind === "history.rejected", "EMPTY_REDO_MUST_REJECT");
        }
      }
      if (result.kind === "history.committed") committedOperations += 1;
      else rejectedOperations += 1;
      const snapshot = core.inspect();
      invariant(snapshot.workingRevision === workingRevision, "WORKING_REVISION");
      invariant(snapshot.durableRevision === 0, "DURABLE_REVISION");
      invariant(snapshot.historyCursor === cursor, "HISTORY_CURSOR");
      invariant(snapshot.historyLength === model.length - 1, "HISTORY_LENGTH");
      invariant(snapshot.aggregate.currentContentDigest === model[cursor], "AGGREGATE_AT_CURSOR");
      invariant(snapshot.dirty === (workingRevision !== 0), "DIRTY_REVISION_IDENTITY");
    }
    const snapshot = core.inspect();
    finalStates.push({
      seed,
      iterations: historyPropertyIterationsPerSeed,
      committedOperations,
      rejectedOperations,
      workingRevision: snapshot.workingRevision,
      durableRevision: snapshot.durableRevision,
      historyCursor: snapshot.historyCursor,
      historyLength: snapshot.historyLength,
      aggregateDigest: snapshot.aggregateDigest,
      contentDigest: snapshot.aggregate.currentContentDigest,
      dirty: snapshot.dirty,
    });
  }
  const result = Object.freeze({
    result: "PASS",
    seeds: historyPropertySeeds,
    iterationsPerSeed: historyPropertyIterationsPerSeed,
    generatedOperations: historyPropertySeeds.length * historyPropertyIterationsPerSeed,
    invariantEvaluations: Object.freeze({
      workingRevisionMonotonicity: historyPropertySeeds.length * historyPropertyIterationsPerSeed,
      durableRevisionRemainsUnchangedWithoutSave:
        historyPropertySeeds.length * historyPropertyIterationsPerSeed,
      historyCursorMatchesAppliedBranch:
        historyPropertySeeds.length * historyPropertyIterationsPerSeed,
      historyLengthMatchesCurrentBranch:
        historyPropertySeeds.length * historyPropertyIterationsPerSeed,
      aggregateExactlyMatchesModeledCursorState:
        historyPropertySeeds.length * historyPropertyIterationsPerSeed,
      dirtyExactlyMatchesRevisionIdentityInequality:
        historyPropertySeeds.length * historyPropertyIterationsPerSeed,
    }),
    finalStates: Object.freeze(finalStates),
  });
  return Object.freeze({
    ...result,
    digest: sha256Utf8(canonicalizeJson(result)),
  });
}
