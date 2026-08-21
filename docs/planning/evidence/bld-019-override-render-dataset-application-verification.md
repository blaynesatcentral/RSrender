# BLD-019 Override and Render Dataset Application Verification

## Result

**PASS** for the bounded BLD-019/#63 early Override and Render Dataset Application Core subset: `set-display-value`, Undo, Redo, and one Render Dataset projection query/refetch path.

Authority: [GitHub #63 activation](https://github.com/blaynesatcentral/RSrender/issues/63#issuecomment-5359649241).

This is bounded D03, D04, S06, OA-PROV-001, PI-05, PI-20, FX-05, FX-08, and AC-005 evidence. It is not full D03, D04, S06, AC-005, packaged UI, MVP, or release acceptance.

## Delivered boundary

The contracts package admits only the closed set-display-value command, Undo, Redo, and projection query/result/event shapes. It validates exact identity, revision, content, type, unit, provenance, Diagnostic, ordering, relation, and digest axes. The public application facade has exactly four frozen own callable properties: `setDisplayValue`, `undo`, `redo`, and `getProjection`. It exposes no generic dispatcher or Refresh surface.

Every projected value now carries `sourceBaselineValueDigest`, derived with the frozen BLD-017 `rsrender.source-baseline-value.v1` basis over exactly content, association, finality, eligibility, and unit. Source provenance and the effective display value are excluded. The same independently recomputed digest is bound through projection, query result, command result, event, and replica state, and is directly usable as the set-display-value command's expected source digest.

The application service preserves the accepted Source Snapshot bytes, preflights replay and Override semantics, stages the immutable collection store and complete wrapper state before the BLD-018 prepared commit, and publishes one synchronous state reference or no authoritative change. Query reassembly is pure. Undo and Redo use revision-based dirty semantics. The strict projection replica replaces complete projections and discards for refetch on every admitted mismatch; it never patches partial state.

## Qualification receipts

The admitted Node 24.18.1 executable (`sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`) ran under `en-US` and UTC.

- Current focused suite: **19/19 PASS**, zero failures, `2026-08-20T21:02:03.331Z` through `2026-08-20T21:03:48.687Z`; duration 105,356 ms; stdout digest `sha256:3041cb36364b85f84d7dcc37915248d0b8014562afea1b46c2c32557e6a09184`; empty stderr.
- Outer qualification: three sequential fresh processes, two complete repetitions each, `2026-08-20T21:03:48.696Z` through `2026-08-20T21:11:05.443Z`; duration 436,747 ms; no warmups or exclusions.
- Fresh-process durations: 198,094 ms, 135,633 ms, and 102,932 ms. Every process exited zero with empty stderr and the same stdout digest `sha256:961d691bc1142849c9085cc9003efb060fe49ba20afe0ed37f070fdee22e63d9`.
- Property workload: three fixed seeds x 1,000 substantive cases x six invariants in every repetition. Six complete repetitions retain 18,000 cases per invariant.
- Invariants: command precondition, replay/revision, baseline, projection replica, atomicity, and source immutability.
- Fixed transcript digest: `sha256:8e6410ab3f52494e58db1e24340b3ccbebd2adb5e83fb7105f7d4061e9d19d48`.
- Normalized repetition digest: `sha256:f470b7de01b3ac08af9e61662ed75dc3f125e17164b3fbbc0774efffd14c4cec`.
- Cross-process transcript digest: `sha256:e6acf38044dae93512b7d26d2b4c3a69b9e8059b8a73f0b338b8504df09309d2`.

## Adversarial and fixed coverage

The retained vectors fail closed on hostile prototypes and proxies, accessors, symbols, extra fields, sparse and extra-property arrays, unsafe bidi Unicode, unsafe field paths and timestamps, caller mutation, forged identities and digests, impossible Domain Value axes, noncanonical ordering, request reuse drift, wrong document or owner, stale revisions, stale baseline, type or unit mismatch, invalid rationale, target and retarget conflicts, capacity exhaustion, empty Undo/Redo, unsupported current inputs, and minimum-revision failure. They also prove each of the five baseline axes changes `sourceBaselineValueDigest`, provenance-only change does not, omission or wrong-valid substitution is rejected in every admitted carrier, and stale retained replica states are discarded unchanged before a successful full refetch.

The fixed transcript proves exact set-to-query, repeated-query, Undo-to-query, and Redo-to-query authority correspondence; source context, source project, Snapshot identity, logical digest, and encoding digest continuity; collection and Render Dataset equality; no state/history change on rejected operations; all reachable replica discard classes; discard input immutability; and full-refetch equality with authority.

Lifecycle-, storage-, Refresh-, callback-, Electron-, IPC-, scene-, PDF-, and publication-shaped data remains absent or inert. No generic command, reducer, script, plugin, or event dispatcher is admitted.

## Integrated qualification

The unchanged amended bytes subsequently passed the complete admitted root verification workflow on Node 24.18.1, `en-US`, and UTC. The monolithic `npm run verify` exited zero: dependency enforcement, formatting, lint, typecheck, **236/236 tests with zero failures**, package boundaries **11/11**, architecture boundaries **11/11**, dependency admission **156/156**, dependency inventory (**156 external identities, 22 workspace entries**, lock digest `c2dbdacab14b924c5566a5ee12d75ce40fa029fa906f8e84d32f17d6bf51d351`), and **44/44** package outputs all passed. Unlike earlier integrated runs, no timeout-only serial requalification was required.

Post-build reconciliation preserved the amended normalized artifact physical and canonical digests and all 66 unique retained hashes. The root workflow changed no manifest, lock, topology, or unrelated source byte.

## Evidence and custody

The normalized artifact is `artifacts/bld-019-override-render-dataset-application-evidence.json`:

- canonical evidence digest: `sha256:9bb35400241b656ce2bb06491daef9f6e3f87fbb09935209afe9b6ec0e95c86f`;
- artifact file SHA-256: `8dbb6a73c8ce035d20f9339685d7d827c342bd12e093d056eb24d27c32054911`;
- this amendment supersedes artifact file SHA-256 `8f1152c346ab65cad5cd1c04e67972f54f84ec0b681713b5c3c330a000926b7e` and canonical digest `sha256:f61910a2bf436ce40cab494a98fc7902e93f417d0a3d7bea16facecd509c0867`;
- classification: `SYNTHETIC_REPOSITORY_SAFE`;
- privacy scan: PASS, zero static or runtime prohibited matches, no client data, credentials, host-user paths, or rejection input echoes;
- retained-hash reconciliation: 69 references across 66 unique files, 69 matches, zero mismatches.

The artifact binds the exact source, fixture, test, generator, oracle, executed JavaScript, BLD-003/010/013/014/015/016/017/018 prerequisite, authority, package/workspace, dependency-admission, and topology/custody hashes. The subsequent root verification receipt above closes the integrated dependency-admission, package-boundary, architecture-boundary, and workspace gates.

The qualification ran against the exact pre-BLD-020 application package index and emitted output. No BLD-020 synthetic-session source, export, or executed output is retained by this artifact; downstream BLD-020 remains outside the amended #63 evidence boundary.

## Rerun commands

```powershell
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\typescript\bin\tsc -b packages\contracts packages\domain packages\application --force --pretty false
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\prettier\bin\prettier.cjs --check packages/contracts/src/override-render-dataset-application-contract.ts packages/contracts/src/index.ts packages/application/src/in-memory-override-render-dataset-service.ts packages/application/src/override-render-dataset-projection-replica.ts packages/application/src/index.ts tests/bld-019-override-render-dataset-application.test.mjs tests/helpers/bld-019-fixtures.mjs tests/helpers/bld-019-property-model.mjs tests/helpers/run-bld-019-vectors.mjs tests/helpers/run-bld-019-evidence.mjs artifacts/bld-019-override-render-dataset-application-evidence.json docs/planning/evidence/bld-019-override-render-dataset-application-verification.md
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\eslint\bin\eslint.js packages/contracts/src/override-render-dataset-application-contract.ts packages/contracts/src/index.ts packages/application/src/in-memory-override-render-dataset-service.ts packages/application/src/override-render-dataset-projection-replica.ts packages/application/src/index.ts tests/bld-019-override-render-dataset-application.test.mjs tests/helpers/bld-019-fixtures.mjs tests/helpers/bld-019-property-model.mjs tests/helpers/run-bld-019-vectors.mjs tests/helpers/run-bld-019-evidence.mjs
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test tests\bld-019-override-render-dataset-application.test.mjs
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tests\helpers\run-bld-019-evidence.mjs
```

After integration-owner coordination, run the admitted npm `verify` workflow for the full repository receipt.

## Nonclaims

BLD-019 implements no full command registry, generic dispatcher, Refresh, annotation, Supplemental/Resolution/extension commands, Data Track behavior, filesystem/storage, source transport/authentication, Electron/preload, menu/keyboard UI, scene, PDF, publication, performance, production, security, privacy, packaged UI, MVP, or release acceptance.
