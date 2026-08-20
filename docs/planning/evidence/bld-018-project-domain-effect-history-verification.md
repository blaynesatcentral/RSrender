# BLD-018 Project Domain Effect and History Verification

## Result

**PASS** for the bounded BLD-018/#62 EP-PURE seam: strict declarative `Phase1LogProjectAggregate` effects compose through the single existing in-memory history authority with exact replay, prepared-state, revision, event, capacity, Undo/Redo, branch, and immutable capture behavior.

Authority: [GitHub #62 activation](https://github.com/blaynesatcentral/RSrender/issues/62#issuecomment-5357998665).

This is bounded D04, pure E03, PI-20, and AC-001 seam evidence. It is not full D04, E03, or AC-001 acceptance.

## Delivered boundary

The closed effect contract retains canonical inert source-command bytes, derives and verifies their SHA-256 digest, derives a conventional effect URN from the complete logical effect, and independently verifies canonical before/after aggregate bytes, exact digests, forward/inverse replacement payloads, affected identities, invalidations, and inert event-result bytes.

The application layer decodes every aggregate direction with the frozen BLD-016 codec before mutation. Preparation is read-only. Commit synchronously rechecks the opaque prepared state and publishes one immutable next-state reference containing the aggregate, one history entry, one event, and one replay result, or retains a semantic rejection in replay without changing aggregate/history/event/revision authority. Full effect replay binds `effectIdentity`; the separately named source-command lookup is deliberately digest-only for BLD-019 pre-reducer use.

Only mode-specific facades are returned. The Phase 1 facade has no legacy generic `execute`, query, storage, lifecycle, or publication surface; raw state-machine functions are not package runtime exports. Type-only DTO and prepared-token exports add no runtime capability.

## Qualification receipts

The admitted Node 24.18.1 executable (`sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`) ran under `en-US` and UTC.

- Current focused suite: **22/22 PASS**, zero failures, `2026-08-20T16:52:34.758Z` through `2026-08-20T16:59:06.484Z`; stdout digest `sha256:22f6b8e1ab88f683b79f98bec0ecf720eed0893db9afb33168bdd09b3added06`.
- Frozen BLD-010/011 compatibility: **28/28 PASS**, zero failures, `2026-08-20T16:59:06.487Z` through `2026-08-20T16:59:26.226Z`; stdout digest `sha256:55da6b26fee901beaec421be3c9e87a7cb1f0c7278d80f524702ad511cde5239`.
- Outer qualification: three fresh processes, two complete repetitions each, `2026-08-20T16:59:26.226Z` through `2026-08-20T17:02:52.229Z`, with no warmups or exclusions.
- Property workload: three seeds × 1,000 public-core operations × five named invariants per repetition; six full repetitions retained 18,000 generated cases and 90,000 invariant evaluations.
- Fixed public-core transcript digest: `sha256:11bb9c41674ad8baa969e5e61ab99f5e0e79c02a4b9bd6517436471a59815ed4`.
- Normalized repetition digest: `sha256:9d8415c27a57db40b3d07c663defe32310ccc77cace320ff72039804ede1b284`.
- Cross-process transcript digest: `sha256:a7c2290b8a73bd1a4c73f907e40e88b436385135b03f88129473699d0a70fd0f`.

The five generated invariants are atomicity, full-effect replay, monotonic revision/event sequencing, bounded-capacity upper bounds with no eviction, and the Undo/Redo/branch model. Capacity exhaustion itself is covered by fixed per-axis vectors; it is not claimed as 3,000 generated exhaustion cases per repetition.

## Adversarial and fixed coverage

The retained vectors fail closed on hostile prototypes, accessors, symbols, hidden/extra fields, sparse/extra-property arrays, malformed Unicode, caller mutation, forged digests/identities, noncanonical JSON, invalid inverse direction, non-Phase1 aggregate bytes, wrong document/owner/revision/before state, request reuse drift, prepared-token/state mismatch, each capacity, and empty Undo/Redo boundaries.

The normalized fixed transcript asserts exact authority deltas for commit, exact replay, reuse mismatch, retained stale rejection, Undo, Redo, abandoned-branch replacement, contract-invalid inverse nonretention, semantic invalid-aggregate retention, capacity retention, immutable capture, and public same-revision one-commit/one-stale concurrency. It retains declarative command/history/event identities and digests while omitting raw inert event payload bytes.

Lifecycle, storage, Refresh, callback-looking, Save, and publication-shaped canonical JSON is retained only as inert metadata and is never dispatched. Runtime facade vectors prove cross-mode methods and generic lifecycle/storage/source/publication capabilities are absent.

## Evidence and custody

The normalized artifact is `artifacts/bld-018-project-domain-effect-history-evidence.json`:

- canonical evidence digest: `sha256:ae6f9db34bbb907b82b4b4d4f3c9ec895aba78ee44f6a675ee3eb8a397df27f7`;
- artifact file SHA-256: `0ec56f9c3e914ed33a99ef93ac33515dea028ee1c75f1794c8c0a0c371a5ecbf`;
- classification: `SYNTHETIC_REPOSITORY_SAFE`;
- privacy scan: PASS, zero prohibited matches, no client data, credentials, host-user paths, or rejection input echoes.

The artifact binds the exact source/test/generator/executed-JavaScript hashes, BLD-010/011/013/016 prerequisites, frozen BLD-011 implementation/index baselines, current generalized authority hashes, package/workspace manifests, BLD-001 admission authority, and BLD-007 topology/enforcement/custody records. Final integrated 156/156 dependency admission, package-boundary, architecture-boundary, and workspace verification remains pending the integration owner's root `verify` receipt.

## Rerun commands

```powershell
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\typescript\bin\tsc -b packages\contracts packages\domain packages\application --force --pretty false
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\prettier\bin\prettier.cjs --check packages/contracts/src/project-domain-effect-contract.ts packages/contracts/src/index.ts packages/application/src/project-domain-effect-state.ts packages/application/src/in-memory-history-core.ts packages/application/src/index.ts tests/bld-018-project-domain-effect-history.test.mjs tests/helpers/bld-018-property-model.mjs tests/helpers/run-bld-018-vectors.mjs tests/helpers/run-bld-018-evidence.mjs artifacts/bld-018-project-domain-effect-history-evidence.json docs/planning/evidence/bld-018-project-domain-effect-history-verification.md
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\eslint\bin\eslint.js packages/contracts/src/project-domain-effect-contract.ts packages/contracts/src/index.ts packages/application/src/project-domain-effect-state.ts packages/application/src/in-memory-history-core.ts packages/application/src/index.ts tests/bld-018-project-domain-effect-history.test.mjs tests/helpers/bld-018-property-model.mjs tests/helpers/run-bld-018-vectors.mjs tests/helpers/run-bld-018-evidence.mjs
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test tests\bld-018-project-domain-effect-history.test.mjs
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tests\helpers\run-bld-018-evidence.mjs
```

After integration-owner coordination, run the admitted npm `verify` workflow for the full repository receipt.

## Nonclaims

BLD-018 implements no Override or Refresh command semantics, source retrieval, filesystem/storage, Save or durable-revision advancement, lifecycle, workspace, recovery, Electron, IPC, renderer, UI, publication, generic callback/reducer/plugin/script/event dispatcher, or production/performance/security/MVP acceptance.
