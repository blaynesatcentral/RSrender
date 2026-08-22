# BLD-033 qualified Layout Host text verification

BLD-033 replaces the production boring-log character-width approximation with Chromium-owned text measurement and makes those exact measured lines authoritative for both the Studio SVG and PDF projection.

## User-visible result

- The packaged Studio renders its first page only after main receives bounded text evidence from a hidden, sandboxed Chromium Layout Host.
- Screen and PDF paint the same frozen resolved text lines. PDF export does not remeasure or independently reflow text.
- Exact local Arial regular and bold bytes are served to measurement, screen, and publication through private application routes. The measured scene records both face digests and the engine/font/locale/calibration metrics digest.
- Text ink outside its assigned frame and positive-area text collisions are deterministic scene errors. Any scene error blocks publication before choosing or writing a destination.
- The package bootstrap no longer embeds an arithmetic scene; production and package paths contain no call to `measureBoringLogTextRequests`.

## Authority and bounds

- Main bounds measurement input and result payloads to 1 MiB, permits at most 4,096 requests and 1,000 resolved lines, and applies a 15-second outer timeout to host load, font load, and measurement execution.
- Each accepted result is bound to the exact request order and complete contiguous UTF-16 source range. Missing, reordered, duplicated, or gapped results reject.
- The projection cache is bounded to eight entries by working revision and exact request digest. Publication consumes the exact accepted cached projection for that working revision and scene digest.
- The qualified Windows font digests are:
  - regular: `sha256:b3658eadae55e682b5f69eb64c439c1ecc8f196c0bb8d4756d145d13bc86476a`
  - bold: `sha256:e8f4e3baf6cc35fed6fcce3a540e8b39e8f6cda1d22a28f2ec8f526fef7a43f5`
- The admitted Electron 43.4.0 / Chromium / locale / calibration / font environment produced metrics digest `sha256:619f9f597bd97983eaeff845967b5419d1a8ffbe5117154e29b37ac677194ad6` in every packaged run.

## Packaged evidence

`artifacts/bld-028-integrated-mvp-evidence.json` records three fresh default-input runs and one alternate structured-input run against the final package:

- 319 vector scene nodes, 154 resolved text lines, and 154 positive text advances;
- zero raster nodes, zero clipped text outcomes, and zero error diagnostics;
- stable default scene digest `sha256:808de243a416458488a3b21eb87426db6a5f397eb6b848180a10ff3cd936d187` and projection digest `sha256:2374bbcf82670473b8c7651e0444b96af8e8b70e6119a6ec3354e42a1e7d1b77`;
- alternate input changed the initial scene digest to `sha256:980a5b4afc45dfcb86385e1a61288e67719932297c13aa036db33c2fe2dd73ca` without rebuilding the executable or `app.asar`;
- every PDF retained the exact frozen scene/projection digests, embedded subsetted Unicode Arial regular and bold fonts, complete token coverage, vector structure, and zero images;
- every exact executable run exited cleanly, removed its temporary profile, and left zero RSrender processes;
- packaged executable SHA-256 `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4`;
- packaged `app.asar` SHA-256 `90a01be30080e6a41929a323fb098b0a72644dbe6bd1d92eee922b135d7963cb`.

The final generated PDF was also rendered to PNG and visually inspected at original resolution. Its header, depth body, lithology, samples, plots, remarks, legend, notes, and approval footer are legible without text overlap or clipping.

## Qualification

- Full regression: 306/306 PASS using pinned Node 24.18.1 with test concurrency 1. After the final non-rendering template-revision consistency correction, its affected fixture/layout/ingress slice passed 18/18 and the complete packaged qualification was regenerated.
- Formatting, ESLint, and TypeScript build: PASS.
- Package boundaries: 11 packages PASS.
- Architecture boundaries: 11 packages PASS.
- Dependency admission: 156/156 identities PASS; no dependency, lockfile, font asset, manifest, or topology change.
- Dependency inventory: 156 external packages and 22 workspace entries PASS.
- Package output: 44 files PASS.
- Integrated packaged qualification: three deterministic default runs plus one alternate-input run PASS, including selection, text/style/layout edits, Undo/Redo, PDF publication, normalized PDF inspection, and exact process cleanup.

## Nonclaims and remaining work

- This qualifies the known local Windows Arial endpoints used by this MVP package. It is not a font redistribution or font-rights claim.
- Deliberate layout edits that make text exceed a frame now produce an error and block PDF export; they are not silently shrunk or clipped.
- BLD-034 still must make the visible command surface operational and honest. BLD-030 still owns final reference-fidelity qualification, and the product owner has not yet personally completed the full flow.
- BLD-028 and the umbrella program issue remain open.

Honest checkpoint after BLD-033: **88% overall toward the product-owner MVP and approximately 68% of the operable visible UX**.
