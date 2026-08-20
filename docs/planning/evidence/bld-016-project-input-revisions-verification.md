# BLD-016 Phase 1 Project Input Revision verification

**Ticket:** BLD-016 / GitHub #60  
**Result:** PASS  
**Profile/grade:** EP-PURE / G1  
**Contract:** `bld-016-project-input-revisions-v1`

Authority is the bounded Log Project ownership expansion activated by [GitHub #60](https://github.com/blaynesatcentral/RSrender/issues/60#issuecomment-5356571829). The closed BLD-009 aggregate remains version 1 and byte-compatible; the additive Phase 1 Log Project is version 2.

## Verified boundary

The domain package owns zero or one complete BLD-015 Source Snapshot plus exactly seven ordered revision handles for Supplemental Sources, Presentation Overrides, Freeform Annotations, Source Resolution Decisions, Source Extension Bindings, Page Range Configuration, and Data Track Configuration. An empty handle is explicit revision 0 with a derived identity and canonical empty-content digest. A current handle requires a positive revision, derived identity, and valid supplied content digest.

Incomplete authoring remains structurally valid. Stable BLD-014 Diagnostic Facts make absent Snapshot, missing assignment, and unavailable source membership prerequisites explicit; evaluation and publication prerequisites remain unavailable until structurally complete. Snapshot membership uses only the exact BLD-015 exploration `providerNativeIdentity` basis used by BLD-009 `SourceExplorationIdentity`—never display name, depth, order, or Source Entity Identity inference.

The v2 compatibility view and Phase 1 assignment/ETR wrappers preserve frozen BLD-009 identities, canonical v1 bytes, assignment precedence, replacement/divergence results, and `phase1Inputs` bytes. BLD-016 exposes no handle transition, replacement, reducer, command, or history API.

## Qualifying result

Pinned Node 24.18.1 (`sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582`) produced a final targeted receipt of 11/11 tests passed, zero failed, from `2026-08-20T14:31:54.1599503Z` through `2026-08-20T14:34:53.2802909Z` (178,925.5339 ms).

Three fresh processes each executed two full repetitions over three seeds × 1,000 cases. All 18,000 generated cases and 126,000 invariant evaluations agreed:

- normalized repetition digest: `sha256:43b24e667e1e126fb7df201879066af6579aa3d4ff61207d44903f052000d5a3`;
- process transcript digest: `sha256:20a51fc4c54bc71866e8a0d65d1f8b8d2e6e6984a6c4f401abb81dfc1f6f609c`;
- retained evidence digest: `sha256:b758b5934614dfa14a43e89cc8ab3e963589d0bf6d50fdcbffa930b6ba59a4e6`;
- final generator window: `2026-08-20T14:52:44.032Z` through `2026-08-20T14:56:53.438Z`.

The retained machine-readable record is `artifacts/bld-016-project-input-revisions-evidence.json`. It binds source, executed JavaScript, BLD-009/013/014/015 prerequisite evidence, governing authorities, fixture/oracle/generator revisions, privacy scan, custody, rerun triggers, and exact commands.

## Important negative coverage

The oracle rejects missing, duplicate-empty, duplicate-current, unknown, reordered, wrong-owner, forged identity/digest/state/revision, malformed digest, sparse array, and nested/top-level extra-field inputs. It also rejects Snapshot context/project/digest mismatches and preserves exact BLD-009 cycle/orphan codes. Hostile null-prototype, accessor, symbol, sparse, and lone-surrogate inputs are total and do not execute accessors; decoded values are deeply frozen and detached from caller mutation.

## Rerun

Use the exact commands in the evidence artifact. The primary qualification command is:

```text
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'; & .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test tests\bld-016-project-input-revisions.test.mjs
```

Rerun on any aggregate, handle, identity, Snapshot ownership, availability Diagnostic, rejection, canonicalization, compatibility, fixture, oracle, generator, prerequisite, authority, toolchain, locale/time-zone, or retained-hash change. Deletion or loss of retained raw/normalized evidence invalidates this bounded PASS until replacement qualification is recorded.

## Nonclaims

Revision handles are immutable opaque references only. The empty revision-zero sentinel has a derived Project Collection Revision identity/digest for explicit empty ownership, but is not a positive current collection payload or transition event. This ticket implements no concrete Supplemental Source, Override, Annotation, Resolution, Extension-binding, page-range, or Data Track behavior; no assembler, persistence, scene, renderer, publication decision, UI, MVP, release, or production acceptance is claimed.
