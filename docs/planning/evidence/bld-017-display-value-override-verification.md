# BLD-017 Display Value Override verification

**Ticket:** BLD-017 / GitHub #61  
**Result:** PASS  
**Profile/grade:** EP-PURE / G1  
**Contracts:** `bld-017-presentation-override-collection-v1`; `bld-017-bounded-override-render-dataset-v1`

Authority is the bounded Override and Render Dataset seam activated by [GitHub #61](https://github.com/blaynesatcentral/RSrender/issues/61#issuecomment-5357998655). This result covers bounded D02, D03, S06, OA-VAL-001, OA-PROV-001, FX-05, FX-08, PI-05, PI-19, and bounded AC-005 only.

## Verified boundary

The domain package owns strict immutable Display Value Override items and Presentation Override collections. An Override binds the exact owner Document, Source Context, Source Entity, Source Field, source value-state digest, value type, unit, item revision, reason, author/time, and override provenance. The source baseline digest excludes retrieval/provenance custody fields while retaining content, association, finality, eligibility, and unit; type remains an explicit separate axis.

The pure next-collection constructor requires new items to start at revision 1, byte-identical items to retain their revision, and edits to advance exactly one revision. It is structural only and exposes no command, reducer, history, or transition API.

The bounded assembler consumes one exact BLD-015 Source Snapshot and the owning BLD-016 Phase 1 project. Presentation input is a strict tagged union: the exact revision-zero empty sentinel with no collection, or one exact positive current handle and collection. Supplemental, Resolution, and Extension-binding inputs must be exact owned empty sentinels. Freeform Annotation, page-range, and Data Track handles are deliberate nondependencies and do not affect dataset bytes or headers.

Zero overrides retain exact source-original and source-effective values. One enabled applicable Override preserves the source original and provenance separately from the effective display value and override provenance. Changed/deleted/retyped/unit Refresh conflicts and context/entity/semantic-axis conflicts fail closed with stable BLD-014 Diagnostic Facts. The bounded seam rejects more than one enabled Override.

## Qualifying result

Pinned Node 24.18.1 (`sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`) produced a final targeted receipt of 14/14 tests passed, zero failed, from `2026-08-20T16:31:19.0300254Z` through `2026-08-20T16:44:39.8175056Z` (800,766.2541 ms; Node test duration 800,428.9182 ms).

Three fresh processes then each executed two identical full repetitions over three seeds x 1,000 cases. Each generated case assembled twice. All 18,000 generated cases, 36,000 assembly evaluations, 180,000 invariant evaluations, and 102 normalized fixed-failure executions agreed:

- normalized repetition digest: `sha256:b91cd6caddf75e7704abb01b86b8aa9b5eadfe0a01f10d3400ee9d01427457ec`;
- process transcript digest: `sha256:983ed58018e310d38bda3908d8e1ad9ac0457747c12e9d2b1dcbafc0830867e0`;
- retained evidence digest: `sha256:83d348f2bc36d4d4f5aa7665a4549c4080ba78c43f08abfb16518d62f7875ef0`;
- physical evidence-file SHA-256: `50afe9edb6502cd6217ac62f02e380286771151cf7418da52c1fe4e8184e22e4`;
- generator window: `2026-08-20T17:03:10.327Z` through `2026-08-20T17:22:23.673Z`.

The retained machine-readable record is `artifacts/bld-017-display-value-override-evidence.json`. It binds source, executed JavaScript, BLD-008/014/015/016 prerequisite evidence, workspace/admission/topology inputs, governing authorities, fixture/oracle/generator revisions, the normalized targeted stdout receipt, privacy scan, custody, rerun triggers, and exact commands. Root integrated verification and dependency/topology gates remain explicitly pending integration-owner execution; this document claims only the bounded EP-PURE result.

## Important negative coverage

The oracle rejects stale/deleted/retyped/unit/context/entity/association/finality/eligibility conflicts, duplicate enabled targets and identities, noncanonical collection order, more than one enabled Override, forged presentation handles, and honestly owned nonempty Supplemental/Resolution/Extension-binding inputs. Hostile boundaries are total and accessor-safe; decoded/projected values are deeply frozen and detached. Diagnostic trees contain no publication, policy, suppression, acknowledgement, severity, or UI keys.

## Rerun

Use the exact commands in the evidence artifact. The primary targeted qualification command is:

```text
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test tests\bld-017-display-value-override.test.mjs
```

Rerun on any Override, baseline digest, provenance, identity/revision, Source Snapshot, Phase 1 ownership handle, conflict Diagnostic, bounded dataset, fixture, oracle, generator, prerequisite, authority, toolchain, locale/time-zone, or retained-hash change. Deletion or loss of retained raw/normalized evidence invalidates this bounded PASS until replacement qualification is recorded.

## Nonclaims

This is not the full D02, D03, S06, or AC-005 implementation. It does not interpret Supplemental Sources, apply Resolution decisions or active Extension bindings, perform Refresh, mutate source truth, create commands/history, persist data, assemble scenes/pages, render PDF, make publication decisions, or implement UI/MVP/production behavior.
