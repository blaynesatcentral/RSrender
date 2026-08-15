# BLD-013 aggregate evidence index verification

BLD-013 validates one closed, canonical, read-only traceability index over the exact retained BLD-008 through BLD-012 evidence-manifest bytes. The validator result is `PASS`; this is an index-integrity result only, not aggregate product acceptance, release readiness, or approval.

## Frozen source inventory

| Ticket  | Source manifest                                       | SHA-256                                                            |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| BLD-008 | `artifacts/bld-008-domain-value-evidence.json`        | `9e37f13664148802273e4da72384bf652b371c7f59c8e482c25062ffd3dc2b71` |
| BLD-009 | `artifacts/bld-009-aggregate-skeleton-evidence.json`  | `a260e4dbb48824f8e68e82cdf42444eb2163e2df85f4601c003a90160a6edcd9` |
| BLD-010 | `artifacts/bld-010-application-service-evidence.json` | `3c701cac4638747579903c26a8f24252dea02e18e7e66d7eb1438d2ac52df616` |
| BLD-011 | `artifacts/bld-011-history-core-evidence.json`        | `88c8b07ffed84911bc4dfe32be4bdd8cd2adc796e491983de213c2f877e3f1d8` |
| BLD-012 | `artifacts/bld-012-application-version-evidence.json` | `1f765ff56f8ea20dbd4ad3ff81bd94eac2fa9a7c5e7319dfe798b1037f774dbb` |

The index inventory digest is `sha256:894c4cba70bad92e2e87134833f6c3d3b8f47483d2ebacb2171265e09279a009`. Every entry links the exact source result, retained-failure array, nonclaims, final trace IDs, oracle, fixture disposition, and contract/schema/implementation revisions through frozen JSON pointers. The reader verifies the raw source bytes before following a pointer.

BLD-008 and BLD-010 have immutable trace-addendum records only for source-missing `OA-GOLD-001` and `OA-REP-001` IDs. Those records cite exact source fields and the final authority. BLD-010 explicitly records `legacy-no-source-fixture-recorded` with zero fixture links: its helper file is not reclassified as fixture identity, revision, or evidence.

## EP-PURE result

- Pinned Node 24.18.1 (`node@24.18.1`, executable SHA-256 `ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`), npm 11.16.0, TypeScript 6.0.3, `en-US`, UTC.
- A forced TypeScript rebuild of `packages/test-support` completed before the qualifying run. The exact executed test-support and contracts `dist` JavaScript and test-support `tsconfig` digests are retained in the machine-readable evidence.
- Qualifying interval: `2026-08-15T04:32:53.2578935Z` through `2026-08-15T04:34:45.4640936Z`; zero warmups. Each fresh process hashed its executing `process.execPath` bytes and rejected unless they matched the admitted executable digest; the path itself was not retained.
- Targeted suite: 15/15 passed.
- Parent property run: three recorded seeds, 1,000 generated mutations per seed, 3,000/3,000 rejected.
- Fresh repetition: three fresh processes, two full repetitions per process, with the same three seeds and 1,000 mutations per seed: 18,000/18,000 rejected.
- Property digest: `sha256:4b69bcc1d4f6d4a8ae6b53d658aaf698dc89de6ba27e4fe00fd84a0b1d957fea`.
- Per-process repetition-one digest: `sha256:b530a9a8a73446b141ff9a971c3840b81e33a0929c51035a5bccb255effaf65c`; repetition-two digest: `sha256:9336666420a9cf57793ea3857be5f46cf79b36019726cabef7493aace3fae8eb`.
- Two-repetition process transcript digest: `sha256:354f09d502ba3435f34373dd1bb2c66e04bfbbe2e2c5440689b05f3a9beba66a`; all fresh processes matched exactly.
- Source-test executions: zero. Source-manifest writes: zero. Aggregate acceptance emissions: zero.

The negative suite covers every Objective Done rejection class, including wrong-but-unique row identity, recomputed changed source/result digests, caller-chosen pointers, invalid Unicode, missing final trace, approximate or empty legacy authority links, invented BLD-010 fixture semantics, and missing retained-failure references.

## Dependency boundary

The only topology delta is the exact internal edge `@rsrender/test-support@0.0.0 -> @rsrender/contracts@0.0.0`, used for the already-admitted canonical JSON and SHA-256 primitives. It remains `PENDING` in `docs/governance/bld-007-workspace-topology-approvals.json` until the issue/evidence sequence permits close-time qualification; this evidence does not claim premature approval. The final candidate lock SHA-256 is `c2dbdacab14b924c5566a5ee12d75ce40fa029fa906f8e84d32f17d6bf51d351`. The external dependency identity set remains exactly 156 with zero added, removed, or changed identities and the same identity-set digest `sha256:d45a5d8ea52899bf68be4ae4e5e92e65909639907258b46f27bf89d9151d98fd`.

Exact rerun commands are:

- pinned Node `node_modules/typescript/bin/tsc -b packages/test-support --pretty false`;
- pinned Node `node_modules/eslint/bin/eslint.js packages/test-support/src/aggregate-evidence-index.ts packages/test-support/src/index.ts tests/helpers/bld-013-index-fixture.mjs tests/helpers/bld-013-property-model.mjs tests/helpers/run-bld-013-vectors.mjs tests/bld-013-aggregate-evidence-index.test.mjs`;
- pinned Node `--test tests/bld-013-aggregate-evidence-index.test.mjs` with `LANG=en-US`, `LC_ALL=en-US`, and `TZ=UTC`;
- after close-time topology qualification, pinned npm `run verify`.

## Nonclaims

- This is not an aggregate acceptance, release-readiness, product-row, production-data, client-data, representative-workflow, typicality, supported-limit, vendor-behavior, or organizational-approval claim.
- It does not rerun, rewrite, normalize away, reinterpret, upgrade, or promote any BLD-008 through BLD-012 result.
- It grants no file, source, network, production, publication, or external-dependency authority.

The machine-readable evidence record is `artifacts/bld-013-aggregate-evidence-index-evidence.json`.
