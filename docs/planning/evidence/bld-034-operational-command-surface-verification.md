# BLD-034 operational command surface verification

BLD-034 removes the packaged Studio's active-looking dead controls and binds every retained static command to an observable, bounded action without widening the renderer's authority.

## User-visible result

- A declarative renderer registry owns all 27 static Studio command buttons. Startup fails if a static button is present without an owned command binding; dynamically created Contents controls are stamped when bound.
- Select and Pan are genuine mutually exclusive Canvas tools. Select gates semantic SVG selection; Pan pointer-drags the independently scrollable Canvas.
- Fit Page derives its zoom from the current Canvas viewport and untransformed page size, floors it to an admitted 10% step, and clamps it to the supported 40%-160% range. Actual remains exactly 100%.
- Contents options expand or collapse the whole semantic hierarchy. Drawing order shows the complete hierarchy; Source shows the source-backed or overridden elements with their retained ancestors.
- Properties options expand or collapse all property disclosures. Element and Diagnostics tabs retain their existing bounded behavior and independent scrolling.
- Validate refetches the current working revision through `rsrenderStudio.getProjection`, refreshes the scene and Diagnostics, exposes an exact PASS/error result, and focuses the visible result.
- The title and status bar display the exact projection-owned clean/dirty state. No save state is inferred by the renderer.
- The conventional but unimplemented Canvas close `×` was removed. New/Open/Save/Close controls remain absent until their lifecycle authorities exist.

## Packaged evidence

`artifacts/bld-028-integrated-mvp-evidence.json` records three fresh default-input runs and one alternate structured-input run against the final package:

- all 27 registered commands were owned;
- Drawing order displayed 61 rows and Source displayed 56 retained source-backed/hierarchical rows;
- both whole-Contents and whole-Properties collapse/expand commands produced exact state deltas;
- Pan prevented selection changes and produced a measured 120-pixel Canvas scroll delta;
- Fit Page computed 40% at 1100x600 and 60% at 1400x900 from the measured viewport/page ratios; Actual plus one Zoom Out produced exact manual 90% state;
- Validate returned `VALIDATION_PASS`, opened Diagnostics, and retained the current authoritative revision;
- dirty-state evidence was exact: clean at working/durable revision 0/0, dirty after Apply at 1/0, dirty after Undo at 2/0, and dirty after Redo at 3/0;
- selection, text/style/layout edits, Undo/Redo, same-scene verified PDF export, alternate structured input, normalized PDF inspection, and zero-raster assertions continued to pass;
- every exact executable run exited, removed its profile, and left zero RSrender processes.

Final package identities:

- launch target: `.tmp/bld-028-integrated-mvp-r3/out/RSrender-win32-x64/RSrender.exe`;
- executable SHA-256: `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4`;
- `app.asar` SHA-256: `10feb509d0090e0c2af63de346a007385ded605c74ab7e30d70c95bb689e462a`;
- renderer SHA-256: `350813a1c3f57bf816b78134bb2d099df59743591b33c2731509d04a94289b94`.

## Qualification

- Full regression: 309/309 PASS using pinned Node 24.18.1 with test concurrency 1.
- Focused Studio/command tests: 13/13 PASS.
- Formatting, ESLint, and TypeScript build: PASS.
- Package boundaries: 11 packages PASS.
- Architecture boundaries: 11 packages PASS.
- Dependency admission: 156/156 identities PASS; no dependency, font, asset, manifest, lockfile, or topology change.
- Dependency inventory: 156 external packages and 22 workspace entries PASS.
- Package output: 44 files PASS.
- Integrated package: three deterministic default runs plus one alternate-input run PASS with exact process cleanup.

## Nonclaims and remaining work

- This ticket does not invent unverified New/Open/Save/Save As/Close persistence or lifecycle commands.
- BLD-030 still owns final reference-fidelity and normalized geometry comparison. The product owner still needs to personally complete the packaged flow before BLD-028 can close.
- BLD-028 and the umbrella program issue remain open.

Honest checkpoint after BLD-034: **92% overall toward the product-owner MVP and approximately 85% of the operable visible UX**.
