# Sanitized Example Dataset and golden-log corpus specification

**Issue:** #16  
**Status:** Accepted decision-complete corpus contract; product-owner confirmation recorded in closed GitHub #16  
**Scope:** Non-production planning fixtures and semantic oracles for offline template design, prototypes, and later acceptance tests  
**Non-claim:** This specification contains no client data, production response, representative workload measurement, completed user research, or proof that an undocumented RSLog surface is authorized or stable.

## 1. Decision summary

RSrender will use a versioned, entirely synthetic baseline corpus. Each corpus fixture is an independently admissible bundle containing explicit provenance, stable synthetic identity, input layers, expected semantic outcomes, negative oracles, and rights metadata. A fixture may exercise only the semantic layer its evidence supports.

The initial registry contains fourteen fixture families, `FX-01` through `FX-14`. `FX-08A` and `FX-08B` are separate accepted-before and staged-after artifacts within the single `FX-08` Refresh family. The registry covers all 39 atomic edge cases in the provisional workflow report, including separate save and export failures.

The corpus deliberately does **not** call any scenario, parameter, workload band, text sample, template combination, or edge frequency representative. The product owner accepted that uncertainty when closing #10. Later approved evidence may add a representative label by a new corpus revision; it may not rewrite the provenance of an earlier synthetic revision.

Three input-layer classes prevent false evidence:

| Layer class | What it can establish | What it cannot establish |
|---|---|---|
| `source-snapshot-synthetic` | Source Snapshot validation, collection-state, identity, provenance, and source-to-domain rules already supported by observed value-free shapes | Network, authentication, permission, route stability, or unobserved wire shapes |
| `render-dataset-synthetic` | Renderer, pagination, layout, diagnostic, interaction, and publication behavior against the versioned renderer-facing contract | Source Adapter mapping or availability of any RSLog field/route |
| `adapter-replay-approved` | Exact mapping for a separately approved, value-free, immutable adapter replay | Tenant-wide availability, write authority, or semantics beyond the captured contract version |

No `adapter-replay-approved` artifact enters the baseline until its exact candidate passes the admission gates in section 5.

### #10 receipt and restriction

| Receipt field | #16 value |
|---|---|
| Upstream disposition | #10 closed by [product-owner explicit uncertainty acceptance](https://github.com/blaynesatcentral/RSrender/issues/10#issuecomment-5295124868), not by representative evidence. |
| Sanitized evidence release | None. #16 receives no interview/session/artifact/metadata finding and must not imply one exists. |
| Permitted input | The provisional 39-edge/14-family taxonomy, source-backed invariants, and the explicit uncertainty restrictions. |
| Representative-label permission | `false` for every v1 fixture, generator vector, workload value, frequency, priority, workflow, and usability claim. |
| Review trigger | A later exact privacy-approved evidence release may propose a new corpus revision; it never retroactively changes v1 provenance. |
| Non-substitution rule | Closing #10 does not satisfy RV-03 metadata evidence, RV-05 moderated-task evidence, source-contract evidence, prototype proof, policy authority, or rights review. |

## 2. Normative vocabulary

Product terms use [the RSrender ubiquitous language](../../../CONTEXT.md). Test-only terms below do not redefine the product domain.

| Term | Meaning |
|---|---|
| **Corpus Fixture** | One immutable, independently admissible bundle of synthetic inputs and expected outcomes. |
| **Fixture Family** | A stable scenario identity such as `FX-06`; revisions and parameter cases remain members of the family. |
| **Semantic Oracle** | One atomic, observable expected outcome plus its forbidden outcome and current evidence/decision owner. |
| **Golden Artifact** | A canonical expected representation used to compare one semantic layer, such as a Diagnostic ledger or resolved page scene. |
| **Admission Record** | The machine-readable proof that a fixture and every included asset passed provenance, privacy, rights, integrity, and layer-eligibility checks. |
| **Synthetic Stress Band** | A deterministic generator parameter set used to explore scale; it is not a representative minimum, typical, high, or maximum workload. |

Oracle ownership state is one of:

- `decided` — an accepted product/domain invariant may be asserted;
- `representative-evidence-supported` — later approved representative evidence supports the assertion;
- `representative-unresolved` — #10's accepted uncertainty remains material;
- `evidence-gated` — the durable specification settles the behavior but the named live gate must still measure or approve the positive outcome;
- `source-evidence-blocked` — a populated/authorized source contract is missing;
- `policy-owned` — an organizational or product authority must decide;
- `accepted-uncertainty` — the product owner accepted the named gap with an explicit restriction;
- `explicitly-deferred` — the behavior is outside the current phase; or
- `out-of-scope` — the corpus must not exercise or imply the behavior.

Only `decided` and `representative-evidence-supported` oracles may be unconditional positive golden outcomes. Other states may assert safe negative invariants, blocked behavior, and required Diagnostics while leaving the positive result unresolved.

## 3. Corpus organization and identity

The logical corpus version is `rsrender.golden-log-corpus.v1`. Its future materialization should use one directory per immutable fixture revision:

```text
testdata/golden-log-corpus/v1/
  corpus-manifest.json
  fx-01-smoke-short/r1/
    fixture-manifest.json
    admission.json
    inputs/
    expected/
    assets/
```

These names describe logical part roles and traceability, not required filesystem paths, filenames, archive entries, schema libraries, or a Log Project/Log Template package envelope. ADR 0003 and the final architecture select the constrained ZIP carrier, parser boundary, migration direction, and logical/physical separation; #37/#42 retain packaged-process and resource-bound evidence.

Fixture IDs are lowercase ASCII `fx-NN-name`; revisions are positive integers. Synthetic entity identities use:

```text
urn:rsrender:fixture:<fixture-id>:<entity-kind>:<zero-padded-ordinal>
```

They never contain names, employee numbers, client/project identifiers, production source IDs, timestamps, paths, or hashes of prohibited content. Display labels are deliberate generic labels such as `Exploration 001`; they are not copied or transformed from production labels.

All time values are fixed, explicit ISO-8601 UTC values in the year 2000 unless the scenario tests ordering or missing time. All units are explicit. Baseline depth fixtures use metres; paired unit cases may use feet but never infer a unit from magnitude. Coordinates are absent unless a scenario explicitly tests coordinate-state handling, in which case they are generated values with a declared fictional coordinate system.

Generated multiplicity uses the UTF-8 seed string `rsrender-corpus-v1` plus fixture ID, revision, parameter-set ID, and counter. The future generator must pin a language-independent byte derivation and record its algorithm/version before any generated output becomes golden. Until that algorithm is selected, hand-authored deterministic fixtures may use only explicit values stored in the fixture itself.

## 4. Required fixture manifest

Every fixture manifest contains these fields. “Required” means present even when its controlled value is `not_applicable`, `unknown`, or an empty list.

| Field | Required contract |
|---|---|
| `corpusVersion` | Exact logical corpus version. |
| `fixtureId`, `fixtureRevision`, `familyId` | Stable identity; `FX-08A/B` use `familyId: FX-08`. |
| `title`, `purpose` | Non-identifying scenario description and the behavior under test. |
| `originClass` | `independently-authored-synthetic`, `deterministic-generator-output`, `approved-open-licensed-asset`, `restricted-approved-exception`, or `rejected`; production-derived is rejected by default. |
| `layerClass` | One of the three classes in section 1. |
| `oracleStatus` | Aggregate readiness plus per-oracle states; never use one aggregate state to hide a blocked atom. |
| `sourceContract` | Adapter/mapping identifier, capture reference/hash where applicable, schema version, and explicit `synthetic`/`approved-replay` origin. |
| `identityRules` | ID namespace, parent/child rules, ordering keys, duplicate-ID intent. |
| `unitContext` | Depth, length, pressure, percentage, elevation, coordinate, and time-zone units or explicit `not_applicable`. |
| `collectionManifest` | Every requested collection with `required`/`optional`, `success`/`empty`/`failed`, record count, pagination state, and deliberate failure category. |
| `valueStates` | Inventory of deliberate absent, `null`, empty string, empty array, numeric zero, `not_available`, `not_permitted`, and malformed cases. |
| `inputParts` | Each Source Snapshot, Supplemental Source, Presentation Override, Example Dataset, template, and injected-fault part with media type, semantic layer, size, and digest. |
| `expectedArtifacts` | Every golden artifact with semantic layer, format/version, digest, and owning oracle IDs. |
| `diagnostics` | Stable expected code, severity when decided, affected entity/field, cause, consequence, suppression eligibility state, and owner. |
| `workloadParameters` | Exact synthetic parameter values and `representativeLabelAllowed: false` unless a later approved revision proves otherwise. |
| `privacy` | Synthetic-generation declaration, prohibited-data scan state, mosaic-risk review, and non-identifying approval reference. |
| `rights` | Per-asset origin, author/producer, license/SPDX expression where applicable, embedding/redistribution/modification state, digest, and approval reference. |
| `distributionClass` | Each intended act decided separately: repository, internal test, editable template/project, generated PDF, product bundle, commercial distribution, and buyer transfer. |
| `integrityClass` | `expected-valid`, `expected-diagnostic`, `expected-safe-rejection`, or `stress-only`. |
| `admissionDisposition` | `admitted-canonical`, `admitted-stress-only`, `restricted-test-only`, `pending`, `quarantined`, or `rejected`. |
| `determinism` | Canonicalization, hash algorithm, generator version/seed, environment-sensitive inputs, and byte/semantic determinism claims. |
| `dependencies` | Upstream evidence and downstream tickets that own unresolved outcomes. |
| `limitations` | Named claims the fixture must not support. |

Canonical logical hashes use UTF-8 JSON Canonicalization Scheme semantics and algorithm-qualified SHA-256 digests. The application package may encode its own versioned physical inventory under ADR 0003, but it must preserve equivalent stable logical identity. A digest proves integrity of admitted bytes, not safety, rights, or semantic correctness.

### Collection-result envelope

Every source-shaped collection/detail input uses the same explicit envelope:

| Field | Contract |
|---|---|
| `fetchResultId` | Stable synthetic identity of this exact request/result case. |
| `resourceKind` | Controlled source-family/detail kind. |
| `required` | Boolean fixed by the fixture; it does not establish final product optionality. |
| `state` | Exactly `success`, `empty`, or `failed`. |
| `records` | Non-empty only for `success`; explicitly empty for `empty`; absent for `failed`. |
| `failureClass` | Required for `failed`: authentication, authorization, not-found-context, throttle, transport, server, cancellation, decode, schema, relationship, validation, or unsupported-contract. |
| `routeEvidenceState` | `documented`, `published-observable`, `approved-replay`, `synthetic-shape`, or `not-applicable`; never implies permission. |
| `pagination` | Requested/returned pages, advertised/observed counts, exhaustion state, and reconciliation result. |
| `retrieval` | Fixed synthetic timestamps for synthetic cases; redacted route/method/attempt/status metadata only where admissible. |
| `schema` | Declared/observed schema reference plus adapter/mapping version. |
| `provenance` | Input artifact ID and canonical digest; no credential, tenant secret, or production identifier. |
| `diagnosticRefs` | Exact Diagnostics caused by failure, ambiguity, or retained unsupported content. |

`empty` means a successful, explicit absence and is never inferred from a missing part. A required `failed` envelope makes the staged Source Snapshot candidate ineligible; the prior accepted snapshot remains usable and visibly stale. Optional acceptance follows the final product/source capability contract; an unclassified collection remains unavailable and diagnosed until #43 admits its authorized semantics.

## 5. Admission, privacy, provenance, and rights gates

Every gate must pass for the exact candidate revision. A content change creates a new candidate and invalidates the prior admission record.

| Gate | Pass condition | Failure result |
|---|---|---|
| A1 Synthetic origin | Every data value is generated from an approved synthetic recipe or explicitly authored as non-production test content. | Reject. |
| A2 Prohibited-content scan | No client/participant identity, coordinate, project number, meaningful production prose/value, filename/path, source/tenant ID, credential, token, raw response, recording, or transform/hash of prohibited content. | Reject and route through the approved incident process; this specification grants no deletion authority. |
| A3 Mosaic review | Human review evaluates the whole fixture, names, totals, assets, links, and repository context for small-firm re-identification risk. | Reject or reduce detail. |
| A4 Layer eligibility | The evidence supports the declared `layerClass`; normalized data is not mislabeled as adapter evidence. | Downgrade the layer or reject. |
| A5 Provenance completeness | Producer, recipe/tool version, input classes, creation/review controls, and all transformation steps are recorded without identifying people. | Reject. |
| A6 Asset rights | Every included font/image/hatch/icon has explicit embedding, modification, and redistribution permission for the intended repository/product use. | Omit the bytes and exercise the unavailable-asset Diagnostic instead. |
| A7 Non-executable content | No script, macro, remote reference, active content, credential, or ambient filesystem/network dependency. | Reject. |
| A8 Integrity/resource bounds | All declared parts hash correctly and meet independent/aggregate parser bounds. | Reject non-silently. |
| A9 Deterministic rebuild | Rebuilding in the pinned environment reproduces the declared semantic artifacts; byte-level claims are made only where proven. | Keep as non-golden input or route to the owning prototype. |
| A10 Derivative release | The exact fixture and every derivative expected artifact have an approved repository/distribution state. | Restricted only; do not commit or distribute. |

Baseline assets use RSrender-authored geometric primitives and text. Positive proprietary hatch/vendor-symbol fixtures are forbidden. Until #43 supplies approved font provenance/rights and the final acceptance strategy's font/renderer rows have admissible evidence, font-sensitive fixtures declare logical font roles and an unresolved font asset; they may assert overflow detection and missing-font Diagnostics but not exact glyph metrics or pagination.

No restricted #10 evidence, session ID, participant-linked row, or approved-production artifact is an input to this corpus. A later derivative based on approved aggregate evidence must independently pass A1–A10; #10 approval is not inherited.

Production-derived fixtures are rejected from the canonical corpus by default. A restricted exception requires separate employer/client/privacy/rights approval, proof that a synthetic fixture cannot answer the question, irreversible de-identification review, and a distribution boundary that prevents it from becoming an Example Dataset, public fixture, golden publication, or commercial asset.

The product owner's #29 GO and #10 closure authorize planning progression; neither establishes ownership, embedding, modification, redistribution, sublicensing, commercial-sale, or buyer-transfer rights for any asset or derivative.

### Admission dispositions

| Disposition | Meaning |
|---|---|
| `admitted-canonical` | All applicable privacy, provenance, rights, layer, determinism, integrity, semantic-oracle, and named-distribution gates pass. |
| `admitted-stress-only` | Independently synthetic input is valid only for the named stress test and cannot support representative or undecided product semantics. |
| `restricted-test-only` | Separately authorized non-public artifact; never a canonical/public/commercial fixture and never proof of portability or redistribution. |
| `pending` | A finite owner/evidence/rights/oracle question remains; the artifact cannot be golden truth. |
| `quarantined` | Unexpected or potentially prohibited content is isolated under approved handling; no corpus use is allowed. |
| `rejected` | A mandatory gate failed; rejection grants no deletion authority. |

Hostile/malformed package fixtures live in a separately labeled expected-safe-rejection corpus governed by ADR 0003, the final architecture, and acceptance P01–P09; #37/#42 retain packaged-process and resource-limit evidence. They contain only the minimum inert synthetic bytes needed for the test, are never canonical examples, and are never extracted to a user-selected location. Valid golden fixtures cannot be reused as hostile payload carriers.

## 6. Golden artifact types

| Artifact | Semantic layer | Required comparison |
|---|---|---|
| `source-validation.json` | Source Snapshot | Collection states, parent/identity integrity, value-state preservation, provenance, and candidate acceptance eligibility. |
| `render-dataset.json` | Render Dataset | Canonical domain projection only where the mapping is `decided`; otherwise a fixture input, not an adapter golden. |
| `diagnostics.json` | Cross-layer | Stable code, affected identity/field/page, cause, consequence, suppression state, and deterministic ordering. |
| `refresh-diff.json` | Refresh | Created/changed/deleted/unchanged/failed and override-conflict sets by stable identity. |
| `pagination.json` | Page model | Page/range ownership and no-drop/no-duplicate assertions under the final domain/product pagination convention and acceptance L03–L06. |
| `scene.json` | Resolved page scene | Physical geometry, paint order, text layout result, shared-axis ownership, and asset/font resolution under the final domain/product/architecture contracts; #30/#42/#43 retain scale, limits, and rights/source evidence. |
| `interaction.json` | Layout interaction | Command sequence, ordered selection/Key Element, effective lock/visibility, focus, announcements, undo/redo, and final semantic state. |
| `package-validation.json` | Document/package | Manifest/integrity/migration/open/save/recovery outcomes governed by ADR 0003, final architecture/acceptance, and live #36/#37/#42 evidence. |
| `pdf-semantic.json` | Publication | Page boxes, selectable text inventory, font/embed state, links/tags when required, and Diagnostic/publication gate outcome. |
| `visual-reference.*` | Visual projection | Raster/vector comparison only after renderer/font/color environment is pinned; never the sole semantic oracle. |

Golden comparisons must identify fixture revision, oracle ID, artifact layer, producer version, and comparison tolerance. A broad screenshot approval cannot substitute for source fidelity, text measurement, accessibility, or publication semantics.

## 7. Fixture-family registry

| Family | Required synthetic inputs | Unconditional oracle | Evidence limitation / controlling authority |
|---|---|---|---|
| FX-01 `smoke-short` | One project, one shallow Exploration, simple strata, sample, comment, and one independently authored synthetic hatch with an admitted rights record; all required collections successful or deliberately empty | Stable identity/parentage; no false missing/failed state; synthetic hatch reference resolves only to the admitted asset; one complete render input with no deliberately induced Diagnostic | Template composition and page-fit semantics are settled by final UX/product/acceptance; #30/#42 retain scale/limit evidence; not representative |
| FX-02 `boundary-pages` | Point/intervals on and across explicit page ranges; first/continuation/last Template Variants | Every source record remains traceable and appears in exactly one semantic ownership result; invalid ranges are non-silent | Boundary convention and gap/overlap consequences are settled by final domain/product/acceptance |
| FX-03 `long-dense` | Coincident strata, samples, field tests, comments, water, and interim points across many deterministic pages | No silent source omission; stable identity and ordering; affected entities receive Diagnostics when a decided constraint fails | Collision/page behavior is settled by final UX/product/acceptance; #30 owns performance evidence and #43 owns populated interim source evidence |
| FX-04 `sparse-missing` | Deep sparse intervals; `empty` collections; absent/null/empty-string/empty-array/zero; unresolved lookup ID | True depth/value states and unresolved ID are preserved; `empty` never becomes `failed`; zero never becomes missing | Depth-break/unused-space behavior is settled by final UX/product/acceptance |
| FX-05 `malformed-relations` | Reversed/out-of-depth intervals, overlaps/gaps, duplicate IDs, orphan children, malformed structured text/classification | No silent repair or reparenting; raw representation/hash retained; invalid geometry isolated and diagnosed | Per-field consequences and styled-text subset are settled by final domain/product specifications |
| FX-06 `text-overflow` | Multiline/long/unbroken/combining/RTL text, mixed runs, shrink-minimum, missing/substituted font states | Every unresolved overflow/font state is explicit; no silent clip; one authoritative measurement result is referenced | Minimums/policy order are settled by final UX/product; #30/#42 retain metrics/limit evidence and #43 owns exact font rights/provenance |
| FX-07 `mixed-template` | Log Set, group, and Exploration Template Assignments; missing library entry; same ID/different digest | Most-specific assignment wins; effective origin is visible; exact Embedded Template Representation remains usable offline; no name substitution | Actual template inventory/grouping remains `representative-unresolved`; package identity follows ADR 0003/final architecture |
| FX-08 `refresh-pair` | Separate `FX-08A` accepted-before and `FX-08B` staged-after snapshots with add/change/delete/unchanged/null-to-absent, required failure, and Presentation Override conflict | Diff is staged; required failure rejects the whole candidate; prior snapshot remains usable/stale; acceptance is atomic; source and override stay separate | Optional-collection policy is settled by final source/product contracts; #34/#40 retain large-diff usability/accessibility evidence |
| FX-09 `groundwater` | Separate drilling/short-term/long-term/piezometer families; dry/measured/not-measured/missing/zero; missing collar elevation | Families and states are not flattened; zero/dry/missing remain distinct; no elevation is invented | Positive populated piezometer/drilling-detail source shapes remain source-evidence-blocked under #43; renderer-only cases permitted |
| FX-10 `spt-custom` | Field-test schema/column metadata, inert raw configurable payload, partial/refusal blows, supplied N/N60, unknown columns, conflicting sample fallback | Raw/hash and unknown columns survive; typed field-test source outranks fallback; no silent recalculation | Explicit binding/format behavior is settled by final domain/product specs; populated metadata/formula semantics remain source-evidence-blocked under #43 |
| FX-11 `interims` | Point depth, parent stratum, duplicate/boundary points, typed value union, list/detail success/empty/failure | Interim stays a point and retains parent/type/raw value; successful absence differs from failed detail; required-detail failure is non-silent | Positive source-shaped item cases remain source-evidence-blocked under #43; renderer-only shapes permitted |
| FX-12 `lab-supplemental` | Adapter-neutral Supplemental Source results for MC/PL/LL with blank/zero/populated/nonfinal/duplicate/unit/unmatched/ambiguous states and independent provenance | No zero coercion; measurements remain independent; ambiguity/nonfinal/unmatched states diagnose; Supplemental Source never becomes primary source truth | Shared-axis behavior is settled by final domain/product specs; vendor schema/status/unit/precedence/derivation remain source-evidence-blocked under #43 |
| FX-13 `export-recovery` | Immutable multi-page revision, warning/error/suppression states, injected save/export failures/cancellation, Recovery Candidate | Export uses one revision; errors block; warning handling is explicit; no apparently valid partial final output; recovery never overwrites the Authoritative File silently | Policy/PDF/package behavior is settled by final specs; #36–#40/#42 retain storage, process, approval, deployment, accessibility, and resource evidence |
| FX-14 `workload-generator` | Parameterized counts for projects, Explorations, pages, records, elements, groups, templates, assets, text lengths, and operation sequences | Same admitted generator version/seed/parameters reproduce the same semantic input; every output is labeled synthetic stress | #30/#42 own measured thresholds/limits; workload representativeness remains `representative-unresolved` |

### FX-08 pair contract

`FX-08A` and `FX-08B` are separately addressable immutable artifacts. Their pair manifest records the accepted-before and staged-after artifact digests, shared identity namespace, created/changed/deleted/unchanged identity sets, null/absent transitions, collection outcome changes, Presentation Override target conflicts, and expected candidate disposition. Unchanged and changed records reuse their stable IDs; additions receive new synthetic IDs; deletions exist only in `FX-08A`. Display labels never establish identity.

The pair's negative oracle forbids source mutation before acceptance, collection-level partial merge, failure-to-empty coercion, display-name matching, automatic override retargeting, or loss of the prior accepted snapshot on cancel/failure.

### FX-12 normalized Supplemental Source record

The baseline laboratory case uses an adapter-neutral corpus record, not an RSLog DTO or an asserted vendor-file/import format:

| Field | Fixture contract |
|---|---|
| `supplementalRecordId` | Stable synthetic record identity. |
| `sampleTargetId` | Stable synthetic sample identity or an explicit unmatched/ambiguous target state. |
| `testKind` | `moisture-content`, `plastic-limit`, or `liquid-limit`; each is independent. |
| `valueState` | `populated`, `blank`, `zero`, `invalid`, `not-available`, or `ambiguous`. |
| `value`, `unit` | Explicit scalar and stated unit when populated/zero; no implicit fraction/percent conversion. |
| `resultStatus` | Synthetic controlled value such as `final`, `nonfinal`, or `unknown`; it is not claimed to match RSLog/vendor terminology. |
| `sourceArtifactId`, `sourceRowIdentity`, `parserVersion` | Corpus provenance without a machine path or production filename. |
| `diagnosticRefs` | Duplicate, unit, status, target, or parsing Diagnostics. |

Any physical Supplemental Source file schema, field vocabulary, status mapping, precedence rule, plausibility range, or derived plasticity-index formula remains source-evidence-blocked under #43 and cannot be inferred from this normalized fixture. Final domain/product policy controls safe handling once evidence is admitted.

## 8. Atomic edge-case crosswalk

Each row supplies at least one corpus home. “Assert now” is the safe semantic invariant; the final positive behavior may remain with the named owner.

The decided atom on each row has the stable ID `ORC-<EC-ID>-D01`; each unresolved positive atom has `ORC-<EC-ID>-P01`. If a row is later split, append `D02`/`P02` without renumbering existing atoms. Oracle revisions change only when preconditions, operation, observable outcome, negative oracle, semantic layer, or owner changes. Tests cite the full oracle ID and revision, not merely the edge or fixture family.

| Edge ID | Fixture family | Assert now | Remaining evidence or controlling authority |
|---|---|---|---|
| EC-SHORT-01 | FX-01 | Source depth and unused range are preserved; no false overflow state | Settled by final UX/product page and overflow contracts |
| EC-SHORT-02 | FX-02 | No record is dropped or duplicated | Settled by final domain/product boundary convention and acceptance L03–L06 |
| EC-LONG-01 | FX-03 | Ordered ranges remain traceable and contiguous when the input says so | Settled by final domain/product Page Plan contract |
| EC-LONG-02 | FX-02 | Explicit ranges are retained; reversed ranges fail non-silently | Settled by final product Diagnostic/page-range policy |
| EC-SPARSE-01 | FX-04 | True depth geometry is not silently compressed | Settled by final UX/product depth/page contract |
| EC-SPARSE-02 | FX-04 | Successful `empty` stays distinct from `failed` | Settled by final source/UX state presentation contract |
| EC-DENSE-01 | FX-03 | No source entity is silently omitted | Settled by final product continuation/integrity policy; #30/#42 retain scale/limit evidence |
| EC-DENSE-02 | FX-14 | Stable semantic state under exact synthetic parameter set | Performance thresholds / #30 |
| EC-MISS-01 | FX-04 | Absent, null, empty string/array, and zero remain distinguishable | Settled by final domain/product value-state and binding contracts |
| EC-MISS-02 | FX-08 | Required failure rejects candidate and retains prior snapshot | Settled by ADR 0005 and final product Refresh policy |
| EC-MISS-03 | FX-04 | Unresolved ID is retained and diagnosed; no substitution | Positive hatch/lookup resolution remains source/rights-evidence-blocked under #43 |
| EC-MAL-01 | FX-05 | Raw invalid value survives; no silent repair | Settled by final product Diagnostic policy |
| EC-MAL-02 | FX-05 | Duplicate/orphan/coverage anomaly is explicit | Settled by final domain/product relationship policy |
| EC-MAL-03 | FX-05 | Malformed content is inert, retained by safe raw/hash rule, and diagnosed | Settled by final domain/architecture inert-content boundary |
| EC-OVRFL-01 | FX-06 | Overflow is measured and explicit; no silent clip | Fit order/severity settled by final UX/product/acceptance; #43 owns exact font corpus rights |
| EC-OVRFL-02 | FX-06 | Missing/substituted font invalidates prior layout proof and diagnoses | Exact admitted font stack/rights remains #43; metrics evidence remains #30/#42 |
| EC-OVRFL-03 | FX-06 | Shrink never passes its declared minimum | Settled by final UX/product overflow and publication policy |
| EC-PAGE-01 | FX-02 | Crossing content is not lost or duplicated | Settled by final UX/product continuation convention |
| EC-PAGE-02 | FX-02 | Invalid/reversed range blocks silently invalid output | Settled by final domain/product discontinuity and Diagnostic policy |
| EC-TMPL-01 | FX-07 | More-specific Template Assignment wins deterministically | Real grouping practice / accepted uncertainty |
| EC-TMPL-02 | FX-07 | Exact Embedded Template Representation wins over missing/changed library entry | Settled by final lifecycle/UX/product and ADR 0003 package contract |
| EC-REFR-01 | FX-08 | Complete semantic diff stages before atomic acceptance | Interaction settled by final UX/product; #34/#40 retain large-diff accessibility/usability evidence |
| EC-REFR-02 | FX-08 | Failure categories never become empty data; prior snapshot remains usable | Session-only auth behavior settled by ADR 0004; #43 retains supported-vendor integration evidence |
| EC-OVRD-01 | FX-08 | Override and original source value/provenance remain distinct | Settled by final domain/UX/product override contract |
| EC-OVRD-02 | FX-08 | Changed/deleted/retyped target creates explicit conflict | Settled by final UX/product conflict contract |
| EC-OVRD-03 | FX-05 | Invalid pasted type/unit/rich text fails safely without source mutation | Settled by final UX/product paste and override contract |
| EC-GW-01 | FX-09 | Observation families remain separate | Positive source DTO remains source-evidence-blocked under #43 |
| EC-GW-02 | FX-09 | Dry, not measured, missing, zero, and value remain distinct | Exact source enums remain source-evidence-blocked under #43 |
| EC-GW-03 | FX-09 | No elevation without sourced/valid derivation inputs | Positive piezometer shape remains source-evidence-blocked under #43 |
| EC-SPT-01 | FX-10 | Schema metadata governs custom columns; raw/hash retained | Populated metadata evolution remains source-evidence-blocked under #43 |
| EC-SPT-02 | FX-10 | Typed field test outranks sample fallback; no silent formula | No-invention/formula policy settled by final domain/product; exact source notation remains #43 |
| EC-INT-01 | FX-11 | Interim remains a point with parent and deterministic identity/order | Positive combinations remain source-evidence-blocked under #43 |
| EC-INT-02 | FX-11 | Successful absence differs from failed detail | Safe required-detail handling is settled by final source/product policy; positive per-type source semantics remain #43 |
| EC-LAB-01 | FX-12 | Unavailable/blank/zero/populated remain distinct | Validated Supplemental Source schema remains source-evidence-blocked under #43 |
| EC-LAB-02 | FX-12 | Duplicate/status/unit ambiguity is explicit; no silent choice | Safe ambiguity behavior is settled by final domain/product; exact precedence/status/unit mapping remains #43 |
| EC-LAB-03 | FX-12 | Data layers do not duplicate depth/interval ownership | Settled by final domain/product shared-axis contract and acceptance L07 |
| EC-COMM-01 | FX-03, FX-06 | Source range/text survive and overflow/collision is non-silent | Settled by final domain/UX/product continuation and text policy; #30/#42/#43 retain scale/limits/font evidence |
| EC-SAVE-01 | FX-13 | Last verified Authoritative File is never silently replaced by an unverified save | Settled by lifecycle/architecture/package contract; #36/#37 retain storage/process proof |
| EC-EXPORT-01 | FX-13 | One immutable revision; failure/cancel leaves no apparently valid partial final Log Document | Settled by final product/architecture/acceptance; #36/#34/#40/#42 retain destination/accessibility/resource proof |

### Mandatory cross-cutting oracle atoms

| Oracle ID | Layer | Observable outcome | Negative oracle | State / owner |
|---|---|---|---|---|
| OA-ID-001 | Source/domain | Exact stable source ID determines Project, Exploration, and entity identity. | No display-name, filename, order, or fuzzy identity substitution. | `decided` / #16 |
| OA-COL-001 | Source Snapshot | Every requested collection is explicitly `success`, `empty`, or `failed` with required/optional state. | No missing envelope, failure-to-empty coercion, or partial required candidate acceptance. | `decided` / source research, ADR 0005, final product |
| OA-VAL-001 | Source/domain | Absent, null, empty string, empty array, numeric zero, unavailable, not permitted, and malformed remain distinguishable. | No truthiness/default coercion that changes state. | `decided` / this corpus and final domain/product |
| OA-PROV-001 | Cross-layer | Every mapped or derived value traces to its input identity, field, mapping/oracle version, and transformation. | No flattened Supplemental Source, Presentation Override, or derived value masquerading as Source Data. | `decided` / this corpus and final domain model |
| OA-DIAG-001 | Cross-layer | A Diagnostic names stable code, affected identity/field/page, cause, consequence, and current policy state. | No silent failure or invented severity/suppression eligibility. | `decided` / final product §§11–12 |
| OA-ASSET-001 | Asset | Missing/unapproved asset remains explicit and uses only an approved neutral fallback. | No vendor-asset reconstruction, name-based substitution, or rights inference. | `decided` negative invariant / final domain/product/architecture; positive rights #43 |
| OA-GOLD-001 | Golden evidence | Every comparison names fixture revision, oracle revision, semantic layer, producer/environment, and tolerance. | No screenshot-only proof for source, text, accessibility, package, or publication semantics. | `decided` / this corpus and final acceptance strategy |
| OA-REP-001 | All | Every v1 scenario and scale vector is labeled synthetic coverage/stress only. | No representative, typical, percentile, frequency, or supported-limit inference. | `accepted-uncertainty` restriction / #10/#16 |
| OA-SEP-001 | Lifecycle/publication | Save and export use separate faults and proof: save protects the Authoritative File; export protects immutable publication/final-path integrity. | No combined generic I/O success/failure oracle. | `decided` / lifecycle specification and this corpus |

## 9. Source-shape availability and allowed fixture level

| Source family | Baseline allowed level | Restriction |
|---|---|---|
| Project, Exploration, strata, samples, comments, boring details, drill runs | `source-snapshot-synthetic` and `render-dataset-synthetic` | Shapes are value-free evidence, not stability or non-null guarantees. |
| SPT/field tests | Both synthetic levels using explicit column metadata and retained inert raw/hash | Do not claim one universal vendor payload schema or formula. |
| Open-hole groundwater summary families | Both synthetic levels for evidenced fields | `drillingGroundwaterLevels` inner positive shape remains blocked. |
| Piezometer/installations/measurements | `render-dataset-synthetic`; source-level empty/failure only | No positive source-shaped item until an authorized populated capture exists. |
| Interims | `render-dataset-synthetic`; source-level empty/failure/list-detail control only | No positive source-shaped item claim until populated value-free capture. |
| Hatch/soil-symbol lookup | Source-level metadata/unresolved ID plus renderer neutral fallback | No vendor binary asset or positive redistribution claim. |
| Laboratory MC/PL/LL | Adapter-neutral `render-dataset-synthetic` Supplemental Source only | No RSLog route/workbook permission, populated DTO, unit, status, or precedence claim. |

## 10. Synthetic stress generator contract

FX-14 exposes parameters, never workload labels:

| Parameter | Meaning |
|---|---|
| `projectCount` | Independent logical projects generated for lifecycle/package tests. |
| `explorationsPerProject` | Explorations in each Log Set. |
| `pagesPerExploration` | Explicit/generated Reference Depth Range count. |
| `strataPerExploration`, `samplesPerExploration`, `testsPerExploration`, `commentsPerExploration`, `waterRecordsPerExploration`, `interimsPerExploration` | Per-family record multiplicity. |
| `elementsPerPage`, `groupDepth`, `templateCount`, `assignmentCount` | Layout/tree/template scale. |
| `textLengthCodePoints`, `textRunCount`, `assetCount`, `assetBytes` | Typography and resource scale. |
| `refreshChangeRatio`, `refreshDeleteRatio`, `overrideConflictCount` | Refresh comparison stress. |
| `operationCount`, `undoDepth`, `concurrentDocumentCount` | Interaction/lifecycle stress. |

Every parameter set has a stable ID and exact values. Names use `synthetic-small`, `synthetic-medium`, `synthetic-large`, or `synthetic-extreme` only as ordinal stress labels local to that generator revision. They must not be presented as user population bands, acceptance thresholds, or real-world maxima.

## 11. Prototype and acceptance handoff

Every prototype/golden test cites:

1. fixture ID and revision;
2. exact parameter-set ID, if generated;
3. semantic oracle ID/revision;
4. input layer and golden artifact layer;
5. oracle ownership state;
6. expected observable and forbidden outcome;
7. comparison method/tolerance;
8. environment identity where font, GPU, OS, locale, display, PDF, filesystem, or assistive technology matters; and
9. the durable controlling specification and any live evidence gate for a non-pass positive outcome.

Downstream admission rules:

- Final domain, UX, product, architecture, lifecycle, recovery, and acceptance specifications own page/text/overflow, shared-axis/Data Layer, source/Refresh, package/migration, publication, and policy semantics.
- #30 owns production-scale DOM/SVG correctness, interaction, and performance evidence.
- #34/#40 own controlled accessibility outcomes; synthetic ARIA inspection is not screen-reader evidence.
- #36/#37/#39 own storage, packaged-process, and deployment/update mechanics evidence.
- #38 owns organizational recovery approval/attestation against the settled policy.
- #42 owns package/layout/PDF resource-limit evidence.
- #43 owns authorized positive source/auth/asset evidence and rights; blocked positive shapes stay absent until promoted.

A downstream ticket may extend a fixture with a new admitted revision. It may not mutate an existing fixture in place, broaden its evidence claim, or convert a blocked oracle into a positive golden result without the owning evidence/decision.

## 12. Completion checklist

#16 closed after all of the following were confirmed:

- [x] Product owner confirmed this corpus contract and its accepted representative-evidence restriction.
- [x] Closed #16 no longer treated closed #10 as a blocker.
- [x] FX-01 through FX-14, including separate FX-08A/B artifacts, are registered.
- [x] All 39 atomic `EC-*` rows trace to at least one fixture and safe oracle.
- [x] Every positive oracle is `decided`/supported or routed to one explicit live evidence gate.
- [x] Source-shaped, Render Dataset, and adapter-replay evidence layers remain distinct.
- [x] Piezometer, interim, hatch-binary, and laboratory positive source gaps are not invented.
- [x] Synthetic stress parameters cannot be mistaken for representative workload bands.
- [x] A1–A10 define exact-candidate admission and derivative-release review.
- [x] Every future prototype/golden test can cite an exact scenario and expected semantic outcome without relying on prose inference.

This specification defines the corpus and its admission/oracle contract. It does not create production fixture bytes, choose the physical application package, implement a generator, implement a renderer, or close the downstream evidence gaps.

## Sources

- [RSLog read contract and restricted-evidence public handoff](../research/rslog-read-contract-rsagent-evidence.md)
- [Laboratory/index-test access](../research/rslog-laboratory-index-test-access.md)
- [Provisional workflow and 39 atomic edge cases](../research/internal-boring-log-workflow-edge-cases.md)
- [Representative-validation protocol](../research/internal-workflow-representative-validation-protocol.md)
- [Representative-validation operations runbook](../research/internal-workflow-validation-operations-runbook.md)
- [Empty synthesis and #10-to-#16 handoff contract](../research/internal-workflow-validation-synthesis-template.md)
- [Project/template package and migration strategy](../research/project-template-package-migration-strategy.md)
- [Prototype decision synthesis](prototype-decisions-layout-lifecycle.md)
- [Lifecycle conflict state/command specification](lifecycle-conflict-state-command-specification.md)
- GitHub issues #8, #10, and #16, current through 2026-08-14
