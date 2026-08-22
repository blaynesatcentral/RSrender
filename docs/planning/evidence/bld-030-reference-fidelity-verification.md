# BLD-030 packaged reference-fidelity verification

Date: 2026-08-22  
Ticket: BLD-030 / GitHub #74  
Result: PASS for automated fidelity and packaged-operation qualification

## Qualified authority

- The production input is the structured synthetic boring-log document and renderer-neutral template. The supplied client go-by is not packaged, committed, or read at runtime.
- Frozen input revisions are fixture r5, template r4, and oracle r3.
- Fixture digest: `sha256:2ec5d2164bfcf0d4392030aae7b0de5820a6862d8868214299e1fcd912257b31`.
- Template digest: `sha256:aaa790ba0d1a090e63b4b14c14984fc1b2cbfef500b3d214702f2ec608c17c0f`.
- Oracle digest: `sha256:88d6bd591d564decf56d03b741e352fc146efd2490e44a89bcc7e8996d3e1af9`.
- Runtime document-bundle digest: `sha256:2fd06db13cec8919ca3f6555bae86b954e3685160e52445106157175ccad789a`.
- The deterministic test-authority Page Plan digest is `sha256:128e639895effbb9e2470035cdbb67cd838c0faa64d3efc749805dec503d1d04`; the corresponding deterministic scene digest is `sha256:4b6eab1de96738acc7fe2724929f59bf770efbb552f1e45c9e6d25759658ec67`.

## Independent clean-room registration

The normalized oracle has a separate client-content-free reference registration derived from the 2448 x 3168, 288 dpi visual go-by. It is not derived from the RSrender template. The coordinate tolerance is 0.5 mm (1.417 pt).

- Horizontal rule extent: 24.000 to 587.750 pt.
- Internal vertical rules: 52.250, 80.875, 109.875, 295.625, 327.375, 347.500, 382.125, 403.625, and 504.500 pt.
- Major horizontal rules: 101.625, 130.500, 611.250, and 670.375 pt.
- Plot grid: 404.000, 429.250, 454.375, 479.625, and 504.500 pt.

All packaged SVG observations and all PDF-SVG observations fell within the frozen tolerance. The maximum observed screen delta was 0.625 pt. Template/scene self-conformance is checked separately so coordinated template-and-oracle drift cannot satisfy the reference gate.

## Corrected reference semantics

- The page uses the reference-shaped 10-column geometry and 0–100 N axis.
- Headings retain the expected units and grammar: elevation/depth feet, USCS, recovery percent, blows per 6 inches, the shared N/moisture/PL–LL plot, and field notes.
- Refusal samples remain explicit `REF` outcomes and also appear as refusal glyphs in the N track.
- The N track, dashed moisture polyline, open PL endpoints, filled LL endpoints, split-spoon cutouts, water-line legend, and actual horizontal silt pattern are projected consistently on screen and in PDF.
- Material descriptions no longer duplicate their classification token.
- Chromium measurement reports no clipped text, text collision, or ink-outside-frame error for the qualified scene.

## Packaged qualification

The retained executable is:

`C:\frv\RSRender\.tmp\bld-030-reference-fidelity-r8\out\RSrender-win32-x64\RSrender.exe`

Three fresh packaged sessions passed serially. Each session exercised the three-pane Studio, selection synchronization, functional pane controls, zoom/fit/pan, validation, text/style/layout edits, Undo/Redo, and PDF export. Each session then inspected the exported PDF and removed its own temporary profile and exact process tree.

- Electron: 43.4.0.
- Resolved scene: 328 ordered vector nodes and 90 semantic identities.
- Chromium text authority: 135 text elements, 154 resolved lines, two exact embedded Arial face digests, and one stable measurement-set digest.
- Security: sandboxed/context-isolated renderer, no Node globals, no renderer network, no popup/navigation/download capability, and no raster elements.
- Cross-run scene digest, projection digest, screen witness, normalized PDF structure, and cleanup were stable.

The retained PDF is `output/pdf/rsrender-boring-log-mvp.pdf`. It is a one-page 612 x 792 pt tagged PDF with two embedded subset Unicode fonts, zero images, complete expected-text coverage, and vector rules at the same registered coordinates as the screen scene. A Poppler-rendered visual inspection found a clean, readable page with no visible clipping or collision.

Machine-readable evidence is retained at `artifacts/bld-030-reference-fidelity-evidence.json` with evidence digest `sha256:f5b52c908a0ce3ef6ad5eacf1e23af8fd1ff7b63d287efcfe1de7e4d449df018`.

## Verification

- Focused renderer, projection, route, publication, PDF geometry, and reference-fidelity tests: 49/49 PASS.
- Full admitted-runtime repository suite: 317/317 PASS, 0 failed, run serially.
- Formatting, lint, and TypeScript build: PASS.
- Package boundaries: PASS across 11 packages.
- Architecture boundaries: PASS across 11 packages.
- Dependency admission: PASS for all 156 observed identities.
- Dependency inventory: PASS for 156 external packages and 22 workspace package entries.
- Three-run packaged reference qualification: PASS.

## Nonclaims and next product phase

- Synthetic content is used; no client/project data was copied into the repository.
- The original image and generated PNG are not product evidence or rendering inputs.
- BLD-030 qualifies the reference-shaped MVP renderer and publication path. It does not claim the broader program is complete.
- Product-owner feedback has established this vertical slice as the MVP baseline and expanded the next target to a working beta. Save/Open, Exploration switching, per-occurrence text selection and typography, direct move/resize, constrained Log Column dividers, Page Region resizing, guides/snapping, and richer authoring commands remain beta work.
