# BLD-024 deterministic boring-log layout and scene verification

**Ticket:** GitHub #68

**Starting commit:** `842c88f`

**Result:** PASS for the bounded BLD-024 pure layout/scene scope

## Delivered production behavior

BLD-024 is the first real structured-data-to-page implementation. `@rsrender/scene` now validates the frozen BLD-022 layout job, produces an exact one-page Page Plan, emits 130 source-ranged text-measurement requests, and consumes Layout Host-owned text results to freeze one renderer-neutral Resolved Page Scene. It does not measure fonts itself and neither screen nor PDF projection is permitted to reflow the resolved result.

The normalized scene contains 88 stable semantic identities and 227 ordered vector/text nodes. It uses one 0–40 ft depth transform from 121,000 to 704,000 mpt for elevation/depth ticks, all three lithology intervals and four transitions, ten sample rows with recovery/blows/N, two Data Track axes, 17 numeric-polyline observations, six plasticity-range observations with both endpoints, seven remarks, ten vector legend entries, eight notes, and four approval lines. Every physical coordinate is a signed integer `mpt`; no input record is dropped or duplicated.

Source provenance is retained on metadata, intervals, samples, and data layers. Effective overrides retain their source-original provenance. Fixture records without an explicit field-level provenance object receive a deterministic structural source reference derived from the fixture's source context rather than being flattened or left ambiguous.

## Text authority and overflow

The engine is deliberately two-phase. Preparation returns Page Plan plus exact text requests. Resolution accepts externally measured face/metrics digests, source ranges, line baselines/advances, logical/ink bounds, and overflow outcomes. It validates and retains those results unchanged in the common scene.

The independently implemented conservative test measurement authority reports eight clipped note outcomes for the current compact footer metrics. Those outcomes are retained as explicit error Diagnostics and `clipped-with-diagnostic`; they are not silently repaired or counted as final visual acceptance. BLD-025/027 must use the admitted Layout Host results and BLD-028 must resolve or deliberately paginate/continue them before the product-owner MVP can pass.

## Determinism and qualification

- Resolved Page Plan digest: `sha256:abe891aa7bf738b2b6ab35c5827817360a2702fa5d791e3ee19dfd670397b7dd`.
- Resolved Page Scene digest: `sha256:e856b7c07b0e76f2d3279d6e17f8c2ac65d60cb6baece853dc43ba45342ca375`.
- Two repetitions in each of three fresh admitted-runtime processes produced one exact transcript: 130 text requests, 88 semantic identities, 227 nodes, and eight explicit conservative-test overflow Diagnostics.
- Focused BLD-024 checks: 8/8 pass.
- Whole repository: 275/275 tests pass under admitted Node 24.18.1 with test-file concurrency fixed at 1.
- Dependency enforcement, formatting, lint, typecheck, package boundaries, architecture boundaries, dependency admission/inventory, and packaging all pass.

## Governed topology seam

The engine consumes BLD-023 runtime/types through the architecture-approved `scene → contracts` direction. Because `@rsrender/scene` previously declared no manifest dependency, BLD-024 admitted exactly one internal workspace edge: `@rsrender/scene@0.0.0 -> @rsrender/contracts@0.0.0`. The BLD-007 topology record, lock digest, SPDX inventory, and custody inventory were updated and passed all 28 drift vectors. The external graph remains exactly 156/156; no external package, font, image, icon, asset, or binary was added.

## Nonclaims

This is headless page generation, not the finished product surface. It does not yet project semantic SVG, show a Canvas, provide the Contents/Properties workflow, route edits through history, project PDF, or prove packaged interaction and visual acceptance. Neither visual reference is an engine input or committed asset. BLD-025 must make this exact scene visible without replacing it with a screenshot, image, background, or browser-owned layout.
