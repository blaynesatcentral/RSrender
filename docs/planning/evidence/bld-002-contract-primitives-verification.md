# BLD-002 contract-primitives verification

Status: **PASS for the bounded BLD-002 primitive-contract seam**  
Date: 2026-08-14  
Issue: [GitHub #46](https://github.com/blaynesatcentral/RSrender/issues/46)  
Contract revision: `bld-002-v1`

## Scope and trace

This evidence covers the pure `@rsrender/contracts` primitives required by BLD-002:

- exact non-empty opaque string identities with no coercion, normalization, or name/depth/path inference;
- signed safe-integer thousandths of a PostScript point (`mpt`);
- explicit `mpt`, point, inch, millimetre, and centimetre page-unit conversion with one versioned `half-away-from-zero-v1` rounding boundary on conversion into `mpt`;
- RFC 8785 JSON Canonicalization Scheme behavior over admitted in-memory JSON scalar structures; and
- lowercase algorithm-qualified `sha256:<64-hex>` digests over exact bytes, well-formed UTF-8 text, and canonical JSON.

Trace anchors are product invariants `PI-02` and `PI-19`, architecture §§4–6, domain-model §§4 and 6, and the bounded primitive foundations of acceptance rows `D01`/`D02` plus corpus oracle `OA-ID-001`. Full aggregate/cardinality and orthogonal content/association/finality/eligibility behavior is not part of this ticket and is not represented as passing.

## Qualified pure environment

| Axis                                                | Observed value                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Platform                                            | Windows x64, sanitized                                             |
| Node.js                                             | 24.18.1, admitted BLD-001 toolchain                                |
| npm                                                 | 11.16.0                                                            |
| TypeScript                                          | 6.0.3, exact production lock                                       |
| Locale                                              | `en-US`                                                            |
| Time zone                                           | `UTC`                                                              |
| Production lock SHA-256                             | `d88d3e88092ec275d5757592531b5fb57a912c593abb836663007d602064c1af` |
| Checked-out baseline before uncommitted ticket work | `e7be6be36ee2420252da29ff23788964fa421e22`                         |

The suite uses repository-safe independently authored synthetic values only. It contains no production/client data, credential, internal path, proprietary asset, or vendor response.

## Verification results

| Verification                                     | Result                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scoped BLD-002 tests under admitted Node 24.18.1 | **11/11 PASS**                                                                                                                                                                                                                                                                                                  |
| Property cases                                   | **15,000 PASS**: five invariants × 3 recorded seeds × 1,000 cases                                                                                                                                                                                                                                               |
| Recorded seeds                                   | `0x00202608`, `0x14519001`, `0x7fffffc5`                                                                                                                                                                                                                                                                        |
| Fresh-process determinism                        | **6/6 identical**: 3 fresh processes × 2 repetitions                                                                                                                                                                                                                                                            |
| SHA-256 independent oracle                       | Standard empty/`abc`/quick-fox/Unicode/million-`a` vectors, 15 padding-boundary vectors, and 3,000 generated byte vectors match Node's independent SHA-256 implementation                                                                                                                                       |
| Canonical JSON                                   | JCS number form, escaping, UTF-16 property ordering, insertion-order independence, canonical round trip, and exact canonical digest pass                                                                                                                                                                        |
| Invalid input                                    | Numeric identity coercion, empty/ill-formed identity, unsafe/noninteger `mpt`, nonfinite/out-of-range unit input, unknown unit, non-I-JSON value, sparse/extended array, accessor/hidden/symbol member, cycle, malformed/unqualified/uppercase digest, and invalid SHA input reject with stable primitive codes |
| Scoped TypeScript                                | **PASS** under the repository's strict compiler rules                                                                                                                                                                                                                                                           |
| Scoped ESLint                                    | **PASS**                                                                                                                                                                                                                                                                                                        |
| Scoped Prettier check                            | **PASS**                                                                                                                                                                                                                                                                                                        |
| Architecture boundary check                      | **PASS**, 11 packages; no platform/privilege import from `contracts`                                                                                                                                                                                                                                            |
| Root TypeScript build                            | **PASS** under Node 24.18.1/npm 11.16.0                                                                                                                                                                                                                                                                         |
| Root tests                                       | **28/28 PASS** at this evidence cut                                                                                                                                                                                                                                                                             |
| Root package-boundary check                      | **PASS**, 11 packages                                                                                                                                                                                                                                                                                           |
| Root format check                                | **PASS**                                                                                                                                                                                                                                                                                                        |

The deterministic cross-process vector canonicalized to:

```json
{
  "contractRevision": "bld-002-v1",
  "explorationIdentity": "urn:rsrender:fixture:fx-01:exploration:000001",
  "page": { "heightMpt": 792000, "widthMpt": 612000 },
  "states": [null, false, true, 0, "synthetic"]
}
```

Its algorithm-qualified digest was `sha256:899c25ef250fffbcd5bbad2cebd1fdb8182abf97e8344b270be34f8aa61d043d`; the explicit `25.4 mm` page-unit vector resolved to exactly `72000 mpt`.

## Evidence inventory

| Repository-safe file                                                      | SHA-256                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/contracts/src/canonical-json.ts`                                | `39fcd7f0b57230a537c53ac15ca24851737e559f3b98b1d916428913840b8a7f` |
| `packages/contracts/src/contract-primitive-error.ts`                      | `6c2efb50781179187185412a75912995ef2337c7132fe1040d628036157acac3` |
| `packages/contracts/src/identity.ts`                                      | `d35038068b4d5beb7ed90fa20e92b04795335e4933e124e96386665ce8b0b5fd` |
| `packages/contracts/src/index.ts` (shared export surface at evidence cut) | `281b48df4bf7685667e6e217b5093839812a90e896f98018b908d4414248be79` |
| `packages/contracts/src/physical-length.ts`                               | `c2278362d5c9c794a97f41234f93e8862787e52206bc60aca78a1e952f1b7dc2` |
| `packages/contracts/src/sha256.ts`                                        | `45b0b19c6905e06cbe2eac1b5ef43a82922fbc0c51ad85a24041507315a9e9ff` |
| `packages/contracts/src/unicode.ts`                                       | `0315aa9e1b49f8135d3a82cccc3134aa37579dd1d373798ac2d49ff4b24353b3` |
| `tests/bld-002-contract-primitives.test.mjs`                              | `310d837e9ba73c32a42be5e3e29166936d474f3792be38090202399f15d1e5fb` |
| `tests/fixtures/bld-002/cross-process.mjs`                                | `7f6d63f77e5b4923661f9fd7b179cb66b52dc6b75010dfa8f89f52e1a429090a` |

Generated `dist` output is ignored and reproducible from the exact source/lock; it is not evidence authority.

## Commands

The final qualifying run used the admitted repo-local Node/npm toolchain, explicit `TZ=UTC`, and `LANG=en-US`:

```text
npm run typecheck
node --test tests/bld-002-contract-primitives.test.mjs
npm test
npm run architecture:check
npm run package:check
npm run format:check
```

Scoped Prettier and ESLint were also run over the BLD-002 source, export surface, test, and cross-process fixture.

## Integration limitation at evidence cut

Repository-wide ESLint was not green because concurrently developed BLD-004/BLD-006 files and a generated BLD-006 staging directory had unrelated global/type-aware lint findings. Every BLD-002-owned file passed scoped ESLint, and the root typecheck, all 28 root tests, architecture check, package-boundary check, and root format check passed. Closure should follow an integration-owner confirmation that the unrelated root-lint findings have been resolved or dispositioned; BLD-002 code must not be changed to mask another ticket's failures.

## Bounded conclusion and nonclaims

The BLD-002 primitive seam is directly verified and contains no Electron, DOM, filesystem, network, ZIP, UI, aggregate, persistence, source-adapter, provenance, value-state, or product behavior. It does not claim full `D01` or `D02`, product/release acceptance, supported depth-unit conversion, package hashing policy, publication behavior, security qualification, rights approval beyond BLD-001's existing admission, or workload representativeness.

Rerun this evidence after any primitive API/revision, identity rule, physical unit/ratio/rounding rule, canonical JSON rule, UTF-8 encoder, SHA-256 implementation, compiler/runtime/lock, test vector/generator/seed, or architecture-boundary change.
