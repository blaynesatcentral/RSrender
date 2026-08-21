# BLD-025 Boring Log Studio verification

## Outcome

BLD-025 adds the first product-shaped RSrender surface. The packaged application opens a modern command/header area, Contents pane, central page Canvas, Properties/Diagnostics pane, and status/zoom controls. The Canvas projects the validated BLD-024 Resolved Page Scene as semantic SVG.

The retained packaged qualification is `artifacts/bld-025-boring-log-studio-evidence.json`. Two sequential packaged sessions passed and exited with zero remaining application processes.

## Observable product result

- The page contains 227 ordered vector scene nodes and 88 semantic identities.
- The full synthetic boring log is visible: header/project metadata, elevation/depth rulers, lithology patterns and descriptions, sample/recovery/blows/N columns, penetration/moisture/plasticity track, remarks, legend, notes, and approval footer.
- Contents exposes the semantic hierarchy.
- Selecting a lithology item synchronizes the Contents row, three Canvas scene nodes, and the Properties/provenance display.
- Zoom, Fit Page, Actual Size, validation status, and document/ribbon affordances are present.
- Eight conservative deterministic text-overflow results remain explicit in Diagnostics; none is hidden or independently reflowed.

## Authority and negative proof

- `projectBoringLogSceneToSvg` validates the renderer-neutral scene contract before projection.
- SVG geometry uses the scene's integer mpt coordinates, ordering, text line/baseline results, pattern resources, and provenance.
- No `img`, SVG `image`, `canvas`, `picture`, CSS background image, data URL, PNG, JPEG, external generator, or reference-image path participates in the page.
- The synthetic fixture and template generate the Page Plan and scene before packaging; the renderer does not contain a monolithic hand-authored SVG.
- Renderer sandbox, context isolation, exact custom-scheme routes, denied ambient network, denied navigation/windows/downloads/permissions, and the least-capable preload remain enforced.

## Dependency admission

The exact new workspace edge is:

`@rsrender/renderer-ui@0.0.0 -> @rsrender/contracts@0.0.0`

It exists only so the browser projection boundary can validate the Resolved Page Scene. The external dependency delta is zero, and no font or binary asset was added. Exact topology evidence is retained in `artifacts/bld-025-renderer-contract-topology-evidence.json`.

## Qualification commands

Run with the admitted repository-local Node 24.18.1 executable:

```powershell
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\enforce-dependency-admission-bld007.mjs --write
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe node_modules\typescript\bin\tsc -b --pretty false
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test --test-concurrency=1 .\tests\*.test.mjs
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\shell-run-bld025.mjs --record
```

Also run format, lint, package-boundary, architecture, admission-verification, inventory, and package gates.

## Explicit nonclaims

BLD-025 is not the product-owner MVP and must not be described as 100%. Properties are inspect-only, Undo/Redo and PDF export are intentionally disabled in this ticket, the scene is the frozen synthetic example, and the eight text diagnostics remain unresolved. BLD-026 owns shared editing/history interaction; BLD-027 owns Layout Host/PDF projection; BLD-028 owns the integrated packaged MVP qualification.
