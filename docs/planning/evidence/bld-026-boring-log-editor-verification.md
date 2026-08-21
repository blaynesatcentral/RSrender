# BLD-026 Boring Log Editor verification

## Outcome

BLD-026 turns the BLD-025 inspection shell into a structured boring-log editor. Contents, Canvas, and Properties share one semantic selection, supported edits route through the existing main-owned command/history authority, and every accepted change rebuilds the renderer-neutral scene.

The retained packaged qualification is `artifacts/bld-026-boring-log-editor-evidence.json`. Two sequential packaged sessions passed and exited with zero remaining application processes.

## Observable product result

- The structured source snapshot contains project, exploration, three strata, ten samples, seven remarks, lookup data, and template properties.
- Twenty-four eligible bindings expose project/title text, three material descriptions, ten recovery values, seven remarks, lithology pattern style, and description-column width.
- Accepted text, value, style, and layout edits visibly reproject the same 227-node, 88-semantic-identity scene.
- Undo and Redo restore exact prior and next projections with one chronological history boundary per accepted command.
- Properties distinguishes immutable source-original data from the current effective value and override provenance.
- Style changes alter all three lithology interval patterns through an admitted choice; layout changes move the description boundary and dependent columns using integer mpt geometry.

## Authority and negative proof

- The renderer receives a validated projection and cannot mutate domain state or history directly.
- The Electron main process maps effective structured values into the layout job, requests deterministic text measurements from Layout Host, and invokes the pure scene engine.
- Command capability, origin, frame, window, generation, and sequence checks remain exact and fail closed.
- Source-original values remain immutable; clearing or undoing an override restores the source-derived projection.
- No raster image, background image, Canvas screenshot, generated image, reference file, or monolithic hand-authored SVG participates in rendering.

## Dependency admission

The exact new workspace edges are:

```text
@rsrender/layout-host@0.0.0 -> @rsrender/contracts@0.0.0
@rsrender/platform-electron-main@0.0.0 -> @rsrender/layout-host@0.0.0
@rsrender/platform-electron-main@0.0.0 -> @rsrender/scene@0.0.0
```

They establish deterministic text and scene composition authorities without adding an external dependency, font, or binary asset. Exact topology evidence is retained in `artifacts/bld-026-renderer-authority-topology-evidence.json`.

## Qualification commands

Run with the admitted repository-local Node 24.18.1 executable:

```powershell
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\enforce-dependency-admission-bld007.mjs --write
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\typescript\bin\tsc -b --pretty false
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test --test-concurrency=1 .\tests\*.test.mjs
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\shell-run-bld026.mjs --record
```

Also run format, lint, package-boundary, architecture, admission-verification, inventory, and package gates.

## Explicit nonclaims

BLD-026 is not the product-owner MVP and must not be described as 100%. It does not export PDF. BLD-027 owns Layout Host/PDF projection and normalized PDF inspection; BLD-028 owns the integrated packaged MVP qualification.
