# BLD-028 Integrated boring-log vertical-slice verification

> **Superseded completion claim (2026-08-21):** Product-owner operation rejected the
> earlier MVP-complete interpretation. The packaged slice proved important plumbing,
> but its ribbon tabs and disclosure controls were decorative, the inspector could not
> be traversed reliably, the product input was a build-time test fixture, the text
> measurement authority was approximate, and the output was not yet close enough to
> the supplied design render. BLD-028 remains open and now depends on BLD-029 through
> BLD-033.

## Automated outcome

The packaged vertical slice passed its bounded automated qualification in one product-owner build. The retained machine-readable record is `artifacts/bld-028-integrated-mvp-evidence.json`. This proves the tested structured fixture, scene, interaction subset, and publication path; it does not prove the product-owner MVP.

Launch target:

```text
.tmp/bld-028-integrated-mvp/out/RSrender-win32-x64/RSrender.exe
```

Retained generated PDF:

```text
output/pdf/rsrender-boring-log-mvp.pdf
```

## Three fresh packaged sessions

Exactly three sessions used fresh memory-only profiles against the same packaged executable. Every session proved:

- a modern three-pane Contents, Canvas, and Properties workspace;
- one semantic SVG page with 227 scene nodes, 88 semantic identities, 63 Contents rows, and zero raster elements;
- synchronized Contents, Canvas, and Properties selection;
- source-original versus effective-override provenance;
- meaningful text, style, and integer-mpt layout edits;
- Undo and Redo through main-owned command/history authority;
- PDF export of the active edited scene through main-owned publication;
- one normalized Letter PDF with 105/105 expected text tokens, two embedded/subset/Unicode fonts, zero images, and zero Poppler warnings;
- zero stderr, a removed fresh profile, and zero remaining RSrender processes.

All three runs retained one exact scene digest and one exact publication-projection digest. The final PDF was rendered with Poppler and inspected at original resolution. Later side-by-side inspection against the supplied design render found a material-description/sample-row collision and material header, ruler, symbol, plot, legend, footer, and typography fidelity gaps. The normalized PDF inspector did not test those conditions.

## Product-owner acceptance

Product-owner operation on 2026-08-21 rejected the earlier acceptance candidate because core visible controls did not work. BLD-031 corrects tabs, disclosures, and pane scrolling. BLD-029, BLD-032, and BLD-033 remain required before the final BLD-030 acceptance flow is run.

The eventual acceptance flow remains:

1. Confirm the Contents tree, boring-log Canvas, Properties/Diagnostics pane, selection status, zoom, and document commands are usable.
2. Select a material-description interval in Contents and confirm the corresponding Canvas geometry and Properties item are selected.
3. Edit the material description, apply it, then use Undo and Redo.
4. Select Lithology and change its pattern style; select Material Description and change the description-column width.
5. Choose Export PDF, select a new filename, and inspect the resulting boring log.
6. Report acceptance or the exact observed defect. Do not claim 100% when a defect remains.

## Qualification commands

Run with the admitted repository-local Node 24.18.1 executable:

```powershell
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\shell-run-bld028.mjs --record
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test --test-concurrency=1 .\tests\*.test.mjs
```

Also run format, lint, TypeScript build, package-boundary, architecture, dependency-admission, inventory, and package gates.

## Claims and nonclaims

The bounded automated vertical slice is qualified. It is not the product-owner MVP and is not evidence that close reference fidelity, production document/template ingress, qualified Chromium text measurement, or personal acceptance is complete. After the product-owner defect report and the independent code/output audit, the honest status is 65% overall and about 50% operable UX after BLD-031. This evidence also does not claim PDF/UA conformance, release readiness, persistent project storage, a real-provider adapter, or completion of the broader #44 program.
