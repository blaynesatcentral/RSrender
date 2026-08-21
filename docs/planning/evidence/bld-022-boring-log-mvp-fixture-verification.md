# BLD-022 structured boring-log fixture verification

**Ticket:** GitHub #66

**Starting commit:** `1606a9e`

**Result:** PASS for the bounded BLD-022 fixture/template/oracle scope

## Delivered production input seam

BLD-022 freezes one independently authored synthetic Example Dataset, renderer-neutral template input, and semantic/geometry comparison oracle. The bundle contains the complete first-page boring-log information architecture: metadata header, elevation/depth rulers, lithology and material-description intervals, ten samples with recovery/blows/N, one shared-axis Data Track, remarks, legend, notes, and approval footer.

All physical template values are signed integer thousandths of a point (`mpt`). The page is 612,000 × 792,000 mpt. Ten contiguous semantic columns tile the complete Depth Body, and the depth transform maps 0–40 ft to the exact authored body range. Stable IDs, source provenance, fixture/template/oracle revisions, and canonical SHA-256 digests are frozen for BLD-023 and later consumers.

## Qualification

- Focused BLD-022 checks: 7/7 pass.
- Determinism: two repetitions in each of three fresh admitted-runtime processes produce one exact vector transcript.
- Whole repository: 260/260 tests pass under admitted Node 24.18.1 with test-file concurrency fixed at 1 to protect workstation memory.
- Dependency admission, formatting, lint, typecheck, package boundaries, architecture boundaries, dependency inventory, and package inventory all pass.
- Negative cases reject non-integer geometry, incomplete depth/column coverage, duplicate/broken data references, missing semantic coverage, and raster/image/background/reference shortcuts.

The structured bundle digests are:

- Fixture: `sha256:29ffb8de0b85de50ed3403a78a35fc8530dbf3c5d4d41006756fd3ce65aa98b7`
- Template: `sha256:1f48e1a67a2b7b08db8f9f73b4afe95fca34223bf7dfa1c478fb736ad4fec775`
- Oracle: `sha256:5de09ce17a4acdba2496d4b64783f0a537e2a3712416179e8f10fd21707b9782`
- Bundle: `sha256:176f1513cd3b621d41400fe0ae745b4029da575c195f53b97a0cbbe83dfbc380`

## Privacy and reference boundary

Neither visual reference is a renderer input, page asset, test fixture, CSS background, or committed artifact. The synthetic PNG remains ignored and local; the original client go-by remains read-only outside the repository. No client/project values or derived excerpts were committed. The oracle uses the already accepted semantic and physical/PDF comparison policy; bounded visual comparison remains secondary and downstream.

## Nonclaims

This is synthetic G1 input/oracle evidence. It is not a renderer, Page Plan, Resolved Page Scene, SVG, PDF, packaged workflow, accessibility, performance, representative-data, release, or MVP pass. It unlocks BLD-023 without changing dependencies, lockfile, topology, manifests, fonts, images, icons, or binary assets.
