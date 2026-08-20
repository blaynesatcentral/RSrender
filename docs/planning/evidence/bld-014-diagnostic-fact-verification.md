# BLD-014 Diagnostic fact kernel verification

## Result

`PASS` for the bounded D06 Diagnostic fact kernel activated by [GitHub #58](https://github.com/blaynesatcentral/RSrender/issues/58). This result covers immutable structure, exact derived identity, strict runtime codecs, canonical encoding/digest, duplicate detection, deterministic ordering, and remediation action IDs under `EP-PURE / G1`.

It is not full D06, Diagnostic policy, AC-011/AC-012, accessibility, publication, MVP, release, or production acceptance. The machine-readable evidence is [`artifacts/bld-014-diagnostic-fact-evidence.json`](../../../artifacts/bld-014-diagnostic-fact-evidence.json), SHA-256 `ebbc0c0a82e09e83033222257dcbc78a7b9952360050612b064d80c456d8e477`.

## Contract boundary

The versioned fact preserves:

- stable rule code and one of the fourteen normative category atoms;
- affected exact identity kind, identity, and optional path;
- independently addressable cause key and evidence class;
- one of the seven domain consequence atoms;
- exact input revision and algorithm-qualified SHA-256 digest;
- one or more unique canonical remediation action IDs;
- derived Diagnostic Identity and deterministic ordering key.

Diagnostic Identity is the digest of only the domain model section 4.1 basis: code, affected exact identity/path, cause key, and input revision. Category, evidence class, consequence, input digest, remediation actions, ordering, message copy, and policy state do not alter it. The full ordering key ends with a canonical draft-content digest, so distinct validated facts have a deterministic locale-independent total order while exact duplicates compare equal.

`createDiagnosticFact` accepts only producer fields and derives identity/order. `decodeDiagnosticFact` accepts the full boundary form and independently recomputes both derived fields. Fact-set decoding validates every fact, rejects duplicate Diagnostic Identity, and then sorts; canonical fact-set JSON and digest are insertion-order independent. Public comparison validates both unknown inputs and returns a nonthrowing result union.

The live ticket deliberately narrows domain model section 13. Current policy state and suppressibility owner are therefore absent along with severity, suppression, acknowledgment, blocking scope, publication reachability, UI wording/order, and accessibility announcement copy. Negative vectors name those fields only to prove strict rejection.

## Qualifying execution

The exact admitted `node@24.18.1` executable was checked inside every fresh runner before any result was emitted. Its digest was `sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`; no executable path was retained.

| Evidence                     | Result                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| Targeted tests               | 13/13 PASS, 0 failures                                                    |
| Qualifying interval          | 2026-08-20T04:24:08.1558251Z–2026-08-20T04:26:49.7480305Z                 |
| Fresh processes              | 3                                                                         |
| Full repetitions per process | 2                                                                         |
| Recorded seeds               | `324508639`, `610839776`, `1592635412`                                    |
| Cases per seed per invariant | 1,000                                                                     |
| Fresh codec cases            | 18,000                                                                    |
| Fresh identity cases         | 18,000                                                                    |
| Fresh ordering cases         | 18,000                                                                    |
| Total fresh generated cases  | 54,000                                                                    |
| Normalized repetition digest | `sha256:1ae6cc529350f0ef96d101e843ff1e315b9df63d96dd118206427db8e3097ac3` |
| Process transcript digest    | `sha256:9a9a1567548a418a09d09549afbea6273116d1fb4cb032e2dbf13dbbc7000a8a` |
| Fixed set digest             | `sha256:a0b8398400b8428d3ed7f1670abf7dad75944bc3a9b799388ab9b772e90497bc` |

All six full property executions produced the same normalized digest and no retained failure. The property model separately counted codec, identity, and ordering invariants; it did not reuse one generated assertion to inflate multiple repetition claims.

## Adversarial coverage

The fixed suite rejects missing, extra, wrong-type, unknown-tag, unsupported-version, unsafe-Unicode, hostile-prototype, symbol, hidden, accessor, sparse-array, array-extra, forged-identity, malformed-order, duplicate-identity, zero-action, duplicate-action, and caller-supplied-derived-field inputs with stable nonsecret codes. Accessor tests verify getters do not run at root, nested, ordering-key, comparator, or fact-set boundaries.

Additional compatibility and exactness vectors prove:

- greater-than-2,048-character affected identity, path, input revision, and remediation action ID round-trip without adding a cap to BLD-002/008 identities;
- accepted results are recursively detached and frozen before caller inputs can mutate;
- Diagnostic Identity changes for every exact identity-basis axis and remains stable for every excluded fact axis;
- code-unit ordering reaches the affected-identity branch using `a`, U+00E9, and U+1D11E after equal earlier fields;
- remediation action order and fact-set insertion order canonicalize identically across fresh processes.

The privacy scan found no host user path, authorization header, bearer-like token, private-key header, or assigned password-like value in any owned source, test, or helper file. Rejections return only a stable code and do not echo hostile input.

## Frozen source and evidence inputs

| Artifact                                   | SHA-256                                                            |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `packages/domain/src/diagnostic-fact.ts`   | `23d3c7871e240773bfc2a781b3086079a665a0ae4216bf84ba4b272657d34f1e` |
| `packages/domain/src/index.ts`             | `4e5dac36c7e4b68b51b26f9e2bbd2aaffdcec02affeb835b121adc98891187fa` |
| `tests/bld-014-diagnostic-fact.test.mjs`   | `cedefa821031accb843e5a9b391ec2ca9d14337cbc3c17f0395eb3e1c84b1978` |
| `tests/helpers/bld-014-fixtures.mjs`       | `cf64bd313c417feda50dd62ad0685550c40a24a248eeb9eb82c0784175dc23a7` |
| `tests/helpers/bld-014-property-model.mjs` | `a9783e91914143a06db8f1aec48de913ec3ee3c7e73c71fbe16460409f46b5ec` |
| `tests/helpers/run-bld-014-vectors.mjs`    | `2ac29f81a66688d6fe13023cec4af564184f510ae97056284a4d694a78c76715` |
| `packages/domain/dist/diagnostic-fact.js`  | `0f52cdbc39e9b095529977a8c2d14770755a7e5a9d9e185f42620c0073c8ebac` |
| `packages/domain/dist/index.js`            | `24e8f50e9391881149ab14d5202ee5d199c6648cfa8ed36849ef231e196d2db8` |
| `package-lock.json`                        | `c2dbdacab14b924c5566a5ee12d75ce40fa029fa906f8e84d32f17d6bf51d351` |

No package manifest, lock, external 156-identity dependency graph, asset, or workspace topology edge changed.

## Rerun

With the admitted Node directory first on `PATH`, `LANG=en-US`, `LC_ALL=en-US`, and `TZ=UTC`:

```text
node node_modules/typescript/bin/tsc -b packages/domain --force --pretty false
node node_modules/prettier/bin/prettier.cjs --check packages/domain/src/diagnostic-fact.ts packages/domain/src/index.ts tests/bld-014-diagnostic-fact.test.mjs tests/helpers/bld-014-fixtures.mjs tests/helpers/bld-014-property-model.mjs tests/helpers/run-bld-014-vectors.mjs
node node_modules/eslint/bin/eslint.js packages/domain/src/diagnostic-fact.ts packages/domain/src/index.ts tests/bld-014-diagnostic-fact.test.mjs tests/helpers/bld-014-fixtures.mjs tests/helpers/bld-014-property-model.mjs tests/helpers/run-bld-014-vectors.mjs
node --test tests/bld-014-diagnostic-fact.test.mjs
```

After close-time integration and topology qualification, run `npm run verify` with the same admitted toolchain.

Rerun after any retained contract, identity, category, consequence, ordering, codec, Unicode, canonical JSON, digest, fixture, oracle, generator, source, export, executed JavaScript, lock, toolchain, locale, authority, or nonclaim boundary changes.
