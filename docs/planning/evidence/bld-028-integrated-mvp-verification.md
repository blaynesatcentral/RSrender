# BLD-028 Integrated boring-log MVP verification

## Automated outcome

The complete packaged vertical slice passed automated qualification in one product-owner build. The retained machine-readable record is `artifacts/bld-028-integrated-mvp-evidence.json`.

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

All three runs retained one exact scene digest and one exact publication-projection digest. The final PDF was rendered with Poppler and visually inspected at original resolution; no header, legend, notes, approval, or column collision remains.

## Product-owner acceptance

Automated qualification is complete, but personal operation is intentionally not inferred. To supply the final MVP acceptance evidence, the product owner must open the launch target and personally verify this short flow:

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

The automated MVP slice is qualified and product-owner-operable. The current honest status is 98% overall and about 95% of the visible UX pending personal operation. This evidence does not claim that personal operation has occurred, PDF/UA conformance, release readiness, persistent project storage, a real-provider adapter, or completion of the broader #44 program.
