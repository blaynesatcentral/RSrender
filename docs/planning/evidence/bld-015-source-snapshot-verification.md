# BLD-015 Source Snapshot verification

**Ticket:** BLD-015 / GitHub #59  
**Result:** PASS  
**Profile/grade:** EP-PURE / G1  
**Fixture:** `FX-01:bld-015-source-original@r1`  
**Contract:** `bld-015-source-snapshot-v1`

Authority is the bounded PI-05, PI-19, D01/D02/D03 source-only, S04, and AC-005 source-baseline subset activated by GitHub #59. AC-003 is explicitly not claimed: template assignment precedence and Effective Template Resolution are outside this ticket.

## Verified boundary

The domain package now exposes a strict immutable Source Snapshot v1 boundary with:

- credential-free Source Context Identity derived from adapter, provider organization, provider account scope, and exact Source Project Identity;
- exact Source Entity and Source Field identities without native-ID coercion;
- closed source-project, exploration, stratum, sample, field-test, comment, open-hole-groundwater, and lookup record families;
- source-only `DomainValueRecord` provenance, exact parent/related identities, nullable source order, family-scoped lookup references, and plural Field Test columns;
- inert Source Extension manifest/observations with explicit absent, present-null, and present-value states and fail-closed depth/node/byte limits;
- exact relationship, interval, groundwater, lookup, ordering, blocked-capability, Diagnostic, logical-digest, and Snapshot-identity validation;
- canonical create/decode/encode boundaries for every public component and the complete Snapshot.

Snapshot Identity is derived from Candidate Identity plus accepted logical digest. `acceptedAtUtc` remains in the canonical Snapshot encoding but is excluded from logical content, so a later acceptance timestamp alone does not change Snapshot logical identity.

## Qualifying result

The pinned Node 24.18.1 executable (`sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`) executed:

- 17 targeted tests: 17 passed, 0 failed;
- three seeds with 1,000 cases for each identity, parent/cardinality, immutability, ordering, and canonical-digest invariant;
- the complete property set twice in each of three fresh processes;
- 18,000 cases per invariant and 90,000 invariant assertions total;
- identical repetition digest `sha256:c8a9cb3b6e92c547596639d46cc3ee8d7b030baf381f0878785bfb9119546828` and process transcript digest `sha256:e6060bed9fbd84ef4f63a253962751b73237ccd2ba287696fc51017f488bce4f` across every fresh execution.

The qualifying run started `2026-08-20T05:59:08.0150629Z`, finished `2026-08-20T06:00:28.8065378Z`, and reported 80,625.8482 ms of Node test duration.

The fixed Snapshot produced:

- Snapshot Identity `urn:rsrender:source-snapshot:sha256:1fefd54bf6d95d8307eba236d74194500680ebf47327038e8c9bad33da0616e8`;
- logical digest `sha256:7eebe9a7511d390da83898ae0b20d506bda9cf9e6a4aeb79fc55e3b206027999`;
- full canonical encoding digest `sha256:d3a397b7a9ceb94c463af6d979fda3f08465dfc49ae93c42718e4528aaefd52f`;
- zero failures and zero positive records across all six #43 evidence-blocked capabilities.

The admitted `SYNTHETIC_REPOSITORY_SAFE` fixture record is version 1 and binds `FX-01:bld-015-source-original@r1`, fixture source digest `sha256:20908ab9930184a80327859d7f36f1fe7f57f3c179a0b090aee0a3459257dbd7`, and the Snapshot Identity/logical digest above. It was authored solely for internal domain qualification and contains no client, vendor, credential, restricted go-by, or third-party content. Its eight source records comprise one record in each admitted family, with 18 fields, one Field Test column, one lookup reference, one extension manifest entry/observation, zero source/canonical Diagnostics, and six blocked-capability declarations.

The editor-facing Exploration name retains exact entity identity `urn:rsrender:source-entity:sha256:d662df5b0e48dc55bf30803530a67340f41e6df76c5da5e0d2de8acae414d589`, field identity `urn:rsrender:source-field:sha256:81458a2bcdb24c126b5a50c359b020070473590fb2dd8034708b95bdd35023f1`, path `mapped:/name`, source-original value and representation `SYNTHETIC-EXPLORATION-001`, eligible/not-applicable axis states and unit, and complete source provenance through mapping rule `synthetic.mapped:/name` v1.

The retained machine-readable result is `artifacts/bld-015-source-snapshot-evidence.json`.

## Important negative coverage

The fixed oracle covers exact `"01"` versus `"1"` native identity, duplicate/wrong-kind/cross-context/missing-parent relations, disallowed fields, unresolved lookup retention, negative/reversed/zero/overlapping/gapped/out-of-range/incompatible-unit intervals, mixed-unit interleaving that preserves same-unit gap and overlap detection, nullable Sample ends, groundwater status/depth/elevation combinations, plural Field Test columns and raw digests, runtime-only and bounded extensions, forged derived fields/digests/order, hostile JavaScript structures, and post-create mutation.

No repair, unit conversion, fuzzy matching, numeric ID coercion, source-order invention, N/N60 calculation, `blowCounts` fallback, stale-record merge, or elevation derivation occurs.

## Rerun

Use the admitted pinned Node executable and repository dependencies from PowerShell:

```text
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\typescript\bin\tsc -b packages\domain --force --pretty false
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\prettier\bin\prettier.cjs --check packages/domain/src/source-snapshot.ts packages/domain/src/index.ts tests/bld-015-source-snapshot.test.mjs tests/helpers/bld-015-fixtures.mjs tests/helpers/bld-015-property-model.mjs tests/helpers/run-bld-015-vectors.mjs tests/helpers/run-bld-015-evidence.mjs artifacts/bld-015-source-snapshot-evidence.json docs/planning/evidence/bld-015-source-snapshot-verification.md
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\eslint\bin\eslint.js packages/domain/src/source-snapshot.ts packages/domain/src/index.ts tests/bld-015-source-snapshot.test.mjs tests/helpers/bld-015-fixtures.mjs tests/helpers/bld-015-property-model.mjs tests/helpers/run-bld-015-vectors.mjs tests/helpers/run-bld-015-evidence.mjs
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test tests\bld-015-source-snapshot.test.mjs
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tests\helpers\run-bld-015-evidence.mjs
```

After integration-owner coordination, run `& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\npm.cmd run verify`. The exact tool versions are Node 24.18.1 (`sha256:ac51903c...`), npm 11.16.0, and TypeScript 6.0.3.

## Evidence custody and validity

The qualifying run has no warmups or exclusions: the reported Node test duration includes fixed vectors, inline properties, child-process startup, and all six repetitions. PASS requires 17/17 tests, zero retained failures, exact admitted Node bytes/en-US/UTC in all three fresh children, at least 1,000 cases per each of three seeds for each invariant in both repetitions, and identical normalized repetition/process transcript digests.

The RSrender domain/source acceptance owner owns acceptance; the domain evidence owner owns custody. The implementation agent executed the run, with the independent adversarial reviewer and integration owner observing/reconciling it under the #59 claim and standing internal-development authorization. Raw fixed/vector definitions and failure capture remain in the test/fixture/vector helper paths; normalized repetitions, transcript digests, failures, timing, and hashes remain in the machine-readable evidence. Retain the entire bound set until a recorded replacement rerun supersedes it. Deletion or loss invalidates this PASS and downstream citations.

Rerun on any source/contract/identity/relationship/value/provenance/extension/Diagnostic/ordering/unit/canonicalization change; any fixture/admission/oracle/generator/prerequisite/hash/toolchain/locale/time-zone change; any governing authority or #43 inventory change; or introduction of an excluded behavior. The exact trigger list and retained locations are in the machine-readable evidence.

## Nonclaims

This result does not implement or approve AC-003, a vendor DTO, Source Adapter, Candidate, Refresh, Supplemental Source, Override, Annotation, Render Dataset, renderer, binding, UI, file, persistence, network, or publication behavior. AC-005 is bounded to retained source-baseline identity/value/state/type/unit/provenance only. It does not activate positive #43-blocked source shapes or assign Diagnostic severity/suppression/publication policy. It is not an MVP, release, vendor-authority, performance, security, privacy, or production acceptance result.
