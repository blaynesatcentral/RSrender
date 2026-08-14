# Deterministic layout, typography, canvas, and PDF technology options

**Wayfinder ticket:** #11

**Research date:** 2026-08-13

**Scope:** TypeScript/Electron, Windows-first, offline-capable RSrender. This is a bounded technology investigation, not a production architecture decision and not an implementation plan.

## Executive result

The defensible architecture boundary is clearer than the winning implementation:

1. A **renderer-neutral Log Document scene** must own physical geometry, depth mapping, pagination decisions, overflow outcomes, semantic reading order, and stable element IDs. Coordinates should be quantized physical units, not browser pixels or canvas object properties.
2. A **single text-layout authority** must decide font face, glyph run, advances, line breaks, ink/logical bounds, and consumed source ranges. Calling two different engines with the same text and rectangle is not a shared layout core.
3. Canvas or SVG is a **projection and interaction surface**, never the saved Log Template or the authoritative layout model. PDF generation consumes the same resolved scene, not a serialization of mutable UI objects.
4. Fonts used for reproducible export must be identified by bytes/hash and checked for embedding and subsetting rights. A family name or reliance on whatever Windows happens to resolve is insufficient.
5. PDF accessibility is a separate semantic output contract. Selectable text does not prove correct Unicode extraction, and tagged output does not prove PDF/UA conformance or useful reading order.

Five candidate families merit prototype evidence:

- Chromium DOM/SVG plus Electron `printToPDF`;
- a TypeScript physical scene plus PDFKit/fontkit;
- a TypeScript physical scene plus CanvasKit/SkParagraph preview and a native Skia PDF bridge;
- a TypeScript physical scene compiled to Typst;
- a TypeScript physical scene sent to a Pango/Cairo native sidecar.

No candidate is selected here. Typst and Pango/Cairo have the strongest documented integrated typesetting surfaces; Chromium has the lowest integration cost and best UI-accessibility seam; PDFKit has the simplest TypeScript-native PDF path but an incomplete documented international text contract; Skia has the strongest prospect for shared preview/PDF drawing but the highest native-bridge and accessibility burden. Tickets #17–#19 must decide with fixtures and inspected artifacts.

## Evidence rules and version baseline

Only current first-party specifications, project documentation, source repositories, and release records were used. “Supports PDF,” “supports Unicode,” and demo performance claims are treated as hypotheses until exercised with RSrender fixtures. All links were accessed 2026-08-13.

| Surface | Baseline visible during research | Maintenance signal | License evidence |
|---|---|---|---|
| Electron/Chromium | Electron 43 stable line; Electron's schedule places 44 stable on 2026-08-25, so the exact prototype patch must be pinned | Electron publishes a release schedule tied to Chromium and Node versions and supported lines ([schedule](https://releases.electronjs.org/schedule), [stable releases](https://releases.electronjs.org/?channel=stable)) | MIT ([repository](https://github.com/electron/electron), [license](https://github.com/electron/electron/blob/main/LICENSE)) |
| PDFKit/fontkit | PDFKit 0.19.1 | 0.19.1 is the latest tagged release in the official repository ([releases](https://github.com/foliojs/pdfkit/releases)) | Both MIT ([PDFKit](https://github.com/foliojs/pdfkit), [fontkit](https://github.com/foliojs/fontkit)) |
| CanvasKit/Skia | `canvaskit-wasm` 0.41.1; native Skia is rolling rather than semantically released | Current CanvasKit package and Skia source/docs are active; API churn is visible in the official changelog ([package](https://www.npmjs.com/package/canvaskit-wasm), [changelog](https://github.com/google/skia/blob/main/modules/canvaskit/CHANGELOG.md)) | BSD-3-Clause ([repository](https://github.com/google/skia)) |
| Typst | 0.15.1, released 2026-07-17 | Active compiler and documented migration changes; 0.15 changed baselines, PDF behavior, and determinism-relevant details, so pinning is mandatory ([0.15.0](https://typst.app/docs/changelog/0.15.0/), [0.15.1](https://typst.app/docs/changelog/0.15.1/)) | Apache-2.0 ([repository](https://github.com/typst/typst)) |
| Pango/Cairo | Current generated Pango docs report 1.57/1.58 surfaces; Cairo 1.18.4 is the latest news item | Both are long-lived native libraries; the exact Windows build and all transitive binaries must be pinned ([Pango](https://docs.gtk.org/Pango/), [Cairo](https://www.cairographics.org/)) | Pango LGPL-2.1-or-later; Cairo LGPL-2.1 or MPL-1.1 at distributor option ([Pango](https://docs.gtk.org/Pango/), [Cairo](https://www.cairographics.org/)) |
| Konva/Fabric UI façades | Konva 10.3.0; Fabric 7.2.0 | Both have 2026 releases ([Konva changelog](https://github.com/konvajs/konva/blob/master/CHANGELOG.md), [Fabric releases](https://github.com/fabricjs/fabric.js/releases)) | Both MIT ([Konva package](https://github.com/konvajs/konva/blob/master/package.json), [Fabric repository](https://github.com/fabricjs/fabric.js)) |

Version recency is not a quality score. Rolling Chromium and Skia updates are also reproducibility risks; a mature native library is also a packaging and licensing obligation.

## Required shared contract

The following is the minimum architecture-neutral contract that tickets #17–#19 should exercise.

### Physical scene

- Canonical page and element geometry uses an integer unit such as `1/1000 pt` (72,000 units/inch). Conversion to CSS px is only a view transform. CSS defines `1in = 96px` and `1pt = 1/72in`, but for screens it normally anchors to the reference pixel, whereas print should anchor physical units; therefore a CSS `mm` on screen is not proof of physical output ([CSS Values and Units §6.2](https://www.w3.org/TR/css-values-4/#absolute-lengths)).
- Every resolved page records width, height, margins, Header, Depth Body, Footer, Reference Depth Range, and page index. The backend must accept arbitrary positive page dimensions, not just named paper sizes.
- Each scene node has stable identity, parent, render order, local transform, clip, opacity, style reference, semantic role, and source/provenance reference where applicable.
- Depth is domain geometry. A single `depthToY` mapping per page/Depth Body is shared by strata, samples, interval bars, and every Data Track layer.
- Floating-point backend calls are derived from quantized values. Backend-returned measurements are normalized and quantized before pagination or overflow decisions.

### Text layout result

A successful measurement returns more than width and height:

```text
font-byte hash + face index + variation axes
Unicode/script/language/direction and feature set
glyph ids, clusters, advances and offsets
line source ranges and baselines
logical and ink bounds
consumed source range and remaining source range
missing-glyph/fallback decisions
overflow state and applied policy
engine name/version/Unicode-data version
```

HarfBuzz alone cannot provide this paragraph contract. Its manual says it shapes a same-style run on one notional infinite line and does not perform bidi resolution, font fallback, line breaking, hyphenation, or justification; it suggests ICU break iterators for break opportunities ([HarfBuzz limitations](https://harfbuzz.github.io/what-harfbuzz-doesnt-do.html)). A custom HarfBuzz option therefore means building and maintaining itemization, bidi, fallback, paragraph breaking, and pagination above it, not merely calling `hb_shape`.

### Semantic publication result

- Visual z-order and logical reading order are separate explicit sequences.
- Text remains text with a valid Unicode mapping unless an acknowledged effect forces outlining/rasterization; any such loss is a diagnostic.
- Decorative content is marked as artifact; meaningful graphics carry alternative text; language, title, headings, tables/lists where present, and reading order are explicit.
- A generated `tagged` flag is not acceptance. The artifact must be inspected and validated, and a screen-reader reading-order smoke test remains necessary.

## End-to-end candidate matrix

Legend: **D** documented capability; **H** hypothesis requiring prototype; **Gap** documented absence or a missing public contract.

| Candidate | Shared deterministic core | Typography | Canvas/UI and accessibility seam | Vector PDF and semantics | Worker/headless | Principal risk / disposition |
|---|---|---|---|---|---|---|
| **A. Chromium DOM/SVG + Electron `printToPDF`** | **H.** The RSrender scene can emit fixed SVG/HTML geometry, but Chromium remains the text and print layout authority. Pin Electron, fonts, locale, scale, and CSS. | **D:** CSS defines cluster-aware family fallback and shaping-aware support; installed font sets are explicitly platform-dependent ([CSS Fonts §5](https://www.w3.org/TR/css-fonts-4/#font-matching-algorithm)). Browser measurement and print must be shown to agree. | **D:** DOM/SVG offers native focus and accessibility-tree seams; SVG text supports selection ([SVG 2 text](https://www.w3.org/TR/SVG2/text.html)). **H:** thousands of depth elements remain responsive. | **D:** custom dimensions, margins, CSS page preference, and a tagged-PDF switch exist. **Gap:** tagged PDF is experimental and may not meet PDF/UA/WCAG ([Electron `printToPDF`](https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptions)). Vector/text retention and clipping fidelity are **H**. | Hidden `BrowserWindow` is possible; `printToPDF` is a main-process WebContents operation, not a pure Node worker. Electron utility processes can host CPU-heavy Node work but not substitute for WebContents ([process model](https://www.electronjs.org/docs/latest/tutorial/process-model)). | Lowest integration cost and best accessibility seam. High upgrade sensitivity and danger of letting browser reflow silently become product pagination. **Prototype.** |
| **B. TS physical scene + PDFKit/fontkit; DOM/SVG or canvas preview** | **H.** Strong only if RSrender lays out text once and both projections consume resolved glyph/line geometry. If preview uses Chromium text while PDFKit wraps independently, it fails the shared-core requirement. | **D:** PDFKit measures/wraps/clips text and embeds common font formats; fontkit supplies OpenType/AAT substitution, positioning, metrics, and subsetting ([PDFKit text](https://pdfkit.org/docs/text.html), [fontkit](https://github.com/foliojs/fontkit)). **Gap:** reviewed current docs do not establish bidi, language-aware line breaking, or automatic multi-font fallback; the long-open RTL request is contrary evidence, not a definitive current test ([issue #219](https://github.com/foliojs/pdfkit/issues/219)). | UI choice independent. DOM/SVG can be semantic; a canvas façade needs a parallel semantic tree. | **D:** physical points/custom page arrays, paths, clipping, transparency, PNG/JPEG, embedded fonts, and explicit structure trees/marked content are documented ([pages](https://pdfkit.org/docs/getting_started.html#adding-pages), [vectors](https://pdfkit.org/docs/vector.html), [images](https://pdfkit.org/docs/images.html), [accessibility](https://pdfkit.org/docs/accessibility.html)). **Gap:** core supports SVG *path data*, not arbitrary SVG documents. PDF/UA checklist support is not proof of conformance. | Node/browser streaming fits an Electron utility process. | Best TypeScript-native controlled-PDF candidate. International text, fallback, full-SVG ingestion, and preview/PDF parity are high-risk. **Prototype only with resolved glyph runs; reject PDFKit-owned wrapping as default.** |
| **C. TS physical scene + CanvasKit/SkParagraph preview + native Skia PDF bridge** | **H, strongest theoretical sharing.** SkParagraph and SkCanvas can exist in web Skia and native Skia, but version/build/font parity and serialization across the bridge must be proven. CanvasKit does not document exposing the native SkPDF document API. | **D:** CanvasKit documents Paragraph shaping and wrapping with an explicit `FontMgr` ([quickstart](https://skia.org/docs/user/modules/quickstart/)); its Canvas2D emulation `measureText` is explicitly width-only and unshaped, so only Paragraph APIs qualify ([package](https://www.npmjs.com/package/canvaskit-wasm)). Fallback behavior and exact Unicode-data pinning remain **H**. | Hardware-accelerated canvas and worker demo exist ([CanvasKit module](https://docs.skia.org/docs/user/modules/canvaskit/), [worker demo](https://demos.skia.org/demo/web_worker/)). Canvas has no per-object native semantic tree; HTML requires one-to-one focusable fallback regions for keyboard access ([HTML canvas](https://html.spec.whatwg.org/multipage/canvas.html)). | **D native:** SkPDF uses the same SkCanvas drawing API, accepts arbitrary page sizes, has metadata, HarfBuzz subsetting, and an optional structure tree ([SkDocument](https://api.skia.org/classSkDocument.html), [SkPDF metadata](https://api.skia.org/structSkPDF_1_1Metadata.html)). **Caveat:** filters and some operations rasterize or convert text to paths, losing text-as-text ([SkPDF limitations](https://skia.org/docs/user/sample/pdf/)). Tagged/PDF-UA quality is **H**. | CanvasKit can use Chromium OffscreenCanvas workers; native PDF requires a compiled bridge/sidecar. SkPDF supports an executor, but threaded output changes internal object order even when rendering is equivalent ([SkPDF metadata](https://api.skia.org/structSkPDF_1_1Metadata.html)). | Potentially excellent parity and performance, but largest build/bridge/memory-management burden and weak canvas accessibility. **Prototype only if native work is acceptable.** |
| **D. TS physical scene -> generated Typst 0.15 source/data -> Typst CLI** | **H.** Treat Typst as a deterministic typesetting/PDF backend, not as the Log Template model. RSrender must generate escaped, fixed-layout input and recover measured outcomes/diagnostics without depending on undocumented internals. | **D:** ordered font fallback, explicit project-font priority, direction/language/features, variable fonts, hyphenation, optimized line breaking, and text measurement are documented ([text](https://typst.app/docs/reference/text/text/), [paragraph](https://typst.app/docs/reference/model/par/), [layout/measure](https://typst.app/docs/reference/layout/layout/)). 0.15 states floating calculations are cross-platform deterministic, but also changed baselines—pinning remains required ([0.15.0](https://typst.app/docs/changelog/0.15.0/)). | Not a direct-manipulation canvas. Use DOM/SVG/canvas separately and compare against Typst-resolved geometry. SVG export converts glyphs to paths, so it is visually stable but not text-selectable/accessibility-preserving ([SVG export](https://typst.app/docs/reference/svg/)). | **D:** custom page sizes/margins, vector PDF, PNG/JPEG/GIF/SVG/PDF/WebP images, tagged PDF by default, and opt-in PDF/UA-1 checks ([page](https://typst.app/docs/reference/layout/page/), [images](https://typst.app/docs/tutorial/writing-in-typst/), [PDF](https://typst.app/docs/reference/pdf/)). **H:** RSrender's arbitrary positioned semantic order and dense track graphics map cleanly without reflow surprises. | Official CLI is naturally isolated in an Electron utility process/sidecar. A stable official TypeScript library API was not found; use of community WASM wrappers would be a separate candidate and supply-chain decision. | Strongest documented accessible-PDF option and a useful independent oracle. Serializer/measurement round-trip and dual preview engine are major risks. **Prototype.** |
| **E. TS physical scene -> Pango/Cairo native sidecar** | **H, technically coherent.** PangoLayout can measure and draw to Cairo screen/image/PDF surfaces; the RSrender scene remains authoritative. Exact Windows font discovery must be controlled. | **D:** Pango itemizes, chooses fonts, shapes through HarfBuzz, breaks lines, justifies, wraps, exposes logical/ink extents and unknown-glyph counts, and defaults fallback on ([pipeline](https://docs.gtk.org/Pango/pango_rendering.html), [Layout](https://docs.gtk.org/Pango/class.Layout.html)). | Cairo can rasterize previews, but integrating a high-performance interactive Electron canvas and a complete semantic overlay is application work. No native DOM seam. | **D:** Cairo PDF is multi-page vector output with per-page physical size, paths, images, clipping/compositing, metadata, outlines, and document-structure tags ([PDF surface](https://www.cairographics.org/manual/cairo-PDF-Surfaces.html), [tags](https://www.cairographics.org/manual/cairo-Tags-and-Links.html)). PangoCairo can embed original text with shaped glyphs for PDF extraction ([show glyph item](https://docs.gtk.org/PangoCairo/func.show_glyph_item.html)). PDF/UA conformance and rich alt/reading-order behavior are **H**. | Native sidecar/utility process. Windows DLL packaging, ABI, crash isolation, and updates are product obligations. | Complete international text pipeline with mature vector output, but native distribution and LGPL/MPL compliance are materially more complex. **Prototype only if simpler candidates fail.** |

## Typography and font-control comparison

| Concern | Chromium | PDFKit/fontkit | CanvasKit/SkParagraph | Typst | Pango/Cairo |
|---|---|---|---|---|---|
| Complex shaping | Documented through CSS user-agent shaping model; exact Chromium result is versioned behavior | fontkit documents GSUB/GPOS/AAT shaping; bidi not established | Paragraph shaping documented | Documented direction/script/features and current Unicode shaping | Full itemize/shape pipeline documented |
| Line breaking/wrapping | CSS Text/Chromium; must pin engine | PDFKit wrapping documented; language algorithm not specified | Paragraph layout documented; exact rules/version need fixture | Greedy/optimized paragraph breaking and hyphenation controls documented | PangoLayout performs line breaking/wrap/justify |
| Font fallback | CSS ordered families plus platform-installed fallback; platform set explicitly undefined | No complete automatic fallback contract found; caller can split runs | Explicit supplied FontMgr; fallback selection must be tested | Ordered family list and project/system/embedded priority documented | Enabled by default and selected during itemization; system discovery must be constrained |
| Measure once / draw twice | Possible only if both preview and print use same pinned DOM and computed layout | Requires custom resolved runs; otherwise preview/PDF drift | Plausible with identical native/web Skia build and fonts | Typst can own final measurement, but UI preview is a second engine unless driven by exported/resolved frames | Plausible if PangoLayout result feeds preview and PDF |
| Embedding/subsetting | Chromium print implementation owns behavior; must inspect | Embedded common formats; fontkit subsetting | SkPDF exposes HarfBuzz subsetter | PDF output embeds as required by selected standard; inspect actual subset | Cairo owns PDF font subsets; inspect actual output |
| Missing glyph diagnostics | DOM inspection plus explicit font probes needed | fontkit coverage can be queried; policy is application work | FontMgr/Paragraph behavior needs explicit probe | Deterministic supplied font list; diagnostics still need application mapping | Pango exposes unknown glyph count |
| Reproducibility lever | Pin Electron, font bytes, CSS, locale, DPR/scale | Pin JS packages, font bytes, custom break/fallback code | Pin CanvasKit and native Skia commit/build plus font bytes | Pin Typst binary, inputs, font paths, ignore system fonts | Pin DLLs, Fontconfig/Windows font configuration, font bytes |

### Mandatory font license gate

Software licenses do not grant rights to fonts. OpenType `OS/2.fsType` records embedding permissions, including Restricted, Preview & Print, Editable, No Subsetting, and Bitmap-only flags. The specification says embedding applications must not embed a font that is not licensed and must not alter its restrictions ([OpenType `fsType`](https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype)). The font `name` table may contain a license description and URL, but those metadata fields are not a substitute for retained license records ([OpenType `name`](https://learn.microsoft.com/en-us/typography/opentype/spec/name)).

Therefore every font entering an export must produce one of these outcomes:

1. **Allowed and reproducible:** approved font bytes are bundled or embedded with recorded license, hash, face, and allowed subset mode.
2. **Allowed only from the licensed workstation:** use is permitted for local rendering/document embedding, with `fsType` honored and no font-file redistribution; record hash and warn that another machine may not reproduce without the bytes.
3. **Embedding prohibited or ambiguous:** block export with that face, offer an approved substitution, and report geometry changes; never silently outline as a licensing workaround.

The engine must be tested for `fsType`; documentation reviewed here does not prove that each candidate enforces it automatically.

## Interactive surface candidates for ticket #18

The interaction surface can be chosen separately from the PDF backend, but it cannot own domain state.

| Surface | Useful evidence | Architectural use | Rejection boundary |
|---|---|---|---|
| DOM + SVG | SVG retains DOM identity and selectable text; CSS transforms and focusable HTML controls integrate with Chromium accessibility | Strong baseline for pages, selection outlines, guides, handles, overlays, and a semantic mirror with relatively little duplication | Reject if the #18 stress fixture misses frame/interaction latency targets or SVG text geometry cannot match the chosen layout authority |
| Raw HTML Canvas 2D | Fast immediate-mode raster target available everywhere in Electron | Possible projection for dense static depths/track graphics | Reject as sole interaction/accessibility tree. The HTML standard requires one-to-one focusable fallback regions for interactive canvas regions ([HTML canvas](https://html.spec.whatwg.org/multipage/canvas.html)) |
| Konva 10.3 | Transformer supports multi-node resize/rotate and rotation snapping; selection is implementable, Node rendering exists ([Transformer](https://konvajs.org/api/Konva.Transformer.html), [selection demo](https://konvajs.org/docs/select_and_transform/Basic_demo.html)) | Viable throwaway UI façade for handles, hit testing, drag, and layered redraw | Never save Konva JSON or accept its `scaleX/scaleY` resize semantics as the Log Template contract. PDF export is third-party and canvas-first ([FAQ](https://konvajs.org/docs/faq.html)); text metrics and a11y remain external |
| Fabric 7 | Provides object selection/interactions, reorder, viewport, JSON/SVG export ([core concepts](https://fabricjs.com/docs/core-concepts/)) | Alternative rapid interaction façade if it materially reduces #18 effort | Never use Fabric serialization as project state. Its docs say SVG round-trip is not 1:1, and Node depends on node-canvas/jsdom with their limitations ([core concepts](https://fabricjs.com/docs/core-concepts/), [repository](https://github.com/fabricjs/fabric.js)) |
| CanvasKit | Hardware-accelerated Skia canvas, Paragraph API, Chromium worker path | Valuable when dense tracks or glyph-heavy pages exceed DOM/SVG budget and when Skia is a serious PDF contender | Requires explicit semantic DOM/accessibility mirror and manual WASM lifecycle; the quickstart warns JS GC does not release Skia WASM objects ([quickstart](https://skia.org/docs/user/modules/quickstart/)) |

## PDF capability comparison

| Requirement | Chromium print | PDFKit | Native SkPDF | Typst | Cairo |
|---|---|---|---|---|---|
| Arbitrary page size | **D** inches object | **D** point array | **D** `beginPage(width,height)` | **D** length width/height | **D** point width/height per page |
| Vector paths, clip, opacity | **H** expected from print pipeline; inspect | **D** | **D**, with documented effect fallbacks | **D** | **D** |
| PNG/JPEG | **D/H** browser content support; PDF encoding inspect | **D** | **D**, encoder callbacks now relevant | **D** | **D** image surfaces/MIME paths; exact retention inspect |
| Arbitrary SVG input | **D/H** Chromium renders SVG; PDF preservation inspect | **Gap:** SVG path syntax only, not full documents | **H:** parse/raster path is client work | **D** | **H:** requires librsvg or preprocessing, adding dependencies/licenses |
| Selectable/extractable Unicode text | **H** inspect | **H** inspect clusters/bidi | **H**; effects can lose text-as-text | **D/H** designed as real tagged text; inspect | **D/H** with text-glyph cluster APIs; inspect |
| Font subset/embed | **H** implementation-owned | **D** | **D** HarfBuzz subsetter API | **D/H** standards enforce embedding where required | **D/H** backend-owned |
| Tagged PDF | **D experimental** | **D explicit structure APIs** | **D structure tree API** | **D default tags** | **D structure tags** |
| PDF/UA assurance | **Gap:** Electron warns experimental output may not conform | **H:** author must satisfy checklist | **H:** no reviewed conformance claim | **D:** PDF/UA-1 mode and checks, still validate independently | **H:** no reviewed conformance claim |
| Logical order independent of z-order | **H** DOM order/CSS paint interaction | **D/H** author supplies structure and natural write order | **D/H** explicit tree and node IDs | **D/H** semantic source order; arbitrary positioned pages need proof | **D/H** explicit structure tags/content refs |

## Rejections and licensing flags

### Reject as production authority without further prototype

- **HTML canvas bitmap -> image-in-PDF.** It loses selectable text, semantic structure, and scalable line/shape quality; higher DPI only makes a larger raster.
- **Konva or Fabric saved JSON as the Log Template.** Their object transforms, serialization, text measurement, and SVG conversions are library behavior, not RSrender domain behavior. Fabric explicitly says SVG import/export is not 1:1; Konva Transformer resizes with scale rather than changing width/height.
- **Two independent text layout engines.** A Chromium-preview/PDFKit-export stack that asks each engine to wrap the same string independently fails before visual comparison; overflow and pagination can diverge even if a screenshot looks close.
- **`pdf-lib` as the primary renderer.** The official feature surface is valuable for editing existing PDFs, forms, drawing, font embedding, and SVG paths, but does not document a paragraph/shaping/fallback/tagged-PDF system needed here ([repository](https://github.com/Hopding/pdf-lib)). Its latest tagged version remains 1.17.1 in the official release list ([releases](https://github.com/Hopding/pdf-lib/releases)). Keep it only for bounded post-processing if a future requirement proves it necessary.
- **Raw HarfBuzz as “the text engine.”** It is a shaper component, not paragraph layout, bidi, fallback, or pagination.
- **Typst SVG as the accessible interactive scene.** Typst intentionally outlines glyphs in SVG for visual consistency, so text cannot be extracted or read by assistive technology ([Typst SVG](https://typst.app/docs/reference/svg/)). It can still be a visual oracle or non-interactive preview layer.
- **CanvasKit-only PDF plan.** The reviewed CanvasKit JS surface documents raster/GPU surfaces and pictures, not the native SkPDF document API. Choosing Skia PDF means accepting and evaluating a native bridge/sidecar.

### License and distribution flags

| Flag | Consequence before architecture approval |
|---|---|
| Font licenses and `fsType` | Build an allowlist, hash inventory, embedding/subsetting gate, attribution store, and substitution/error UX. This is independent of renderer license. |
| Chromium/Electron third-party notices | Electron is MIT but ships Chromium and many third-party components; preserve Electron's generated license/notice obligations in installers and commercial diligence. |
| Skia/CanvasKit | BSD-3-Clause is permissive, but a custom native build carries its complete dependency/notice inventory. Pinning a Skia commit becomes an update program. |
| Typst | Apache-2.0 requires NOTICE/license handling and patent-license compliance; embedded fonts and any generated templates/assets retain separate licenses. |
| Pango/Cairo | Pango LGPL-2.1-or-later and Cairo LGPL-2.1/MPL-1.1 require counsel-approved dynamic-linking/source-offer or MPL file-level compliance strategy plus notices. Windows DLL dependencies must be audited individually. |
| PDFKit/fontkit/Konva/Fabric | MIT notices are straightforward, but transitive dependencies and fonts still require automated SBOM/license review. |
| Golden/validation tooling | Playwright is test-only. If veraPDF is bundled rather than run only in CI, its GPLv3+/MPLv2 dual license and Java runtime/package obligations need review ([veraPDF repository](https://github.com/veraPDF/veraPDF-library)). |

This is an engineering flag list, not legal advice. Commercial transfer to Rocscience requires a recorded dependency and font bill of materials, not merely a list of top-level licenses.

## Golden-test strategy

Pixel screenshots alone are not a determinism contract. Playwright warns that screenshots vary with OS, browser, settings, hardware, power source, and headless mode ([visual comparisons](https://playwright.dev/docs/test-snapshots)). Use four layers:

1. **Semantic layout golden:** normalized JSON of pages, depth ranges, node transforms/clips, resolved styles, text lines, glyph clusters/advances, consumed ranges, overflow diagnostics, and reading order. This must be byte-stable for a pinned engine/font set.
2. **PDF structural golden:** page boxes, content operators or normalized object graph, embedded-font hashes/subsets, Unicode extraction, images, clips, transparency, tags, alt text, metadata, and logical order. Strip allowed volatile IDs/timestamps explicitly; never broadly ignore diffs.
3. **Controlled raster golden:** rasterize canvas and PDF in one pinned Windows CI image at fixed scale/color settings; compare at strict thresholds and review diffs. A raster match cannot waive semantic failures.
4. **Standards and assistive checks:** validate requested PDF standard with a pinned validator, inspect the tag tree, copy/extract multilingual text, and conduct NVDA/Acrobat or equivalent reading-order smoke tests. veraPDF 1.30.2's official release record includes current PDF/UA fixes, demonstrating why the validator itself must be versioned ([release](https://github.com/veraPDF/veraPDF-library/releases)).

## Throwaway prototype hypotheses

These are deliberately falsifiable. They do not authorize product implementation.

### Ticket #17 — Deterministic page scene, text overflow, and depth pagination

**Hypothesis 17-A:** One renderer family can be made the sole text-layout authority while a TypeScript physical scene owns page/depth/pagination policy, and that combination can produce equivalent preview and vector-PDF geometry without independent reflow.

Run a three-way bake-off, not five full applications:

- **A:** pinned Electron DOM/SVG + `printToPDF`;
- **B:** resolved TS scene + PDFKit/fontkit, with the preview drawing the *resolved* lines/runs rather than wrapping again;
- **D:** TS scene -> pinned Typst 0.15.1, using Typst measurements/output as the authority.

Escalate only the best failing case to Skia or Pango/Cairo if all three fail a mandatory condition. This bounds prototype cost while preserving the native escape hatches.

**Fixture:** Letter, A4, and one nonstandard page; portrait/landscape; Header/Depth Body/Footer; 2/5/10 ft per page Reference Depth Ranges; Latin engineering text plus combining marks, degree/diameter/plus-minus symbols, bidi sample, CJK sample, long unbroken token, explicit newlines, and missing glyph; pinned embeddable font set with hashes; rotated text; transparency; clipped SVG; PNG/JPEG; shared-axis track; manual depth break; Template Variant changing width/font.

Exercise `wrap`, `clip`, `shrink-to-minimum`, `grow-height`, `grow-width`, `warn-only`, `continue`, and `fail-export` policies. Store authored and effective font sizes, consumed source ranges, and every warning.

**Pass only if all are true:**

- repeated runs on the same pinned Windows image produce byte-identical semantic-layout goldens;
- preview and PDF page/node boxes agree within `0.01 pt` after normalization, while glyph advances and line baselines agree within `0.02 pt` (no cumulative tolerance by line);
- page count, Reference Depth Ranges, manual breaks, consumed source ranges, and overflow diagnostics are identical across repeated runs and Template Variant toggles;
- every non-artifact text string is selectable and extracts to the expected Unicode sequence; missing glyphs are explicit failures/warnings according to policy;
- PDF remains vector for lines/shapes/text except an explicitly diagnosed unsupported effect;
- arbitrary page size, clips, transparency, images/SVG, and font embedding/subsetting pass structural inspection and license gate;
- PDF semantic order is the authored publication order, not accidental z-order.

**Falsifiers:** any backend rewraps independently; font fallback changes without a recorded font identity; a library upgrade changes pagination without a migration/golden diff; shrink/continue loses or duplicates source characters; or accessible text requires outlining.

### Ticket #18 — Layout canvas, Contents tree, precision editing, and accessibility

**Hypothesis 18-A:** DOM/SVG can meet RSrender interaction latency and precision needs while retaining the clearest accessibility seam. **Hypothesis 18-B:** if it cannot, a Konva or CanvasKit projection can meet latency only when paired with a synchronized semantic DOM/tree; the canvas library still cannot own document state.

Build the same interaction adapter over one immutable scene/command model, first with DOM/SVG and only then with Konva if the stress gate fails. CanvasKit enters only if glyph/track density, not ordinary object count, is the measured bottleneck.

**Fixture:** 20 pages represented in the navigator, one active page with 2,000 visible primitives, 250 selectable catalog items, 8 nested groups, inherited lock/visibility, 50 text items with live overrun status, 4 overlapping hit targets, and a 12-item multi-selection with a designated Key Element.

**Measured commands:** select/toggle/range/marquee; overlap cycle; move/resize/rotate; snap and temporary bypass; keyboard nudge; exact-property commit/cancel; reorder/reparent; inherited lock/visibility; Key Element align/distribute; undo/redo; zoom/pan; mixed property display.

**Pass only if all are true on the firm's minimum supported Windows hardware:**

- pointer-drag feedback sustains 60 Hz at the 95th percentile with no committed geometry derived from screen pixels;
- single command preview-to-paint latency is at most 50 ms p95 and tree/canvas selection synchronization at most 100 ms p95;
- every gesture commits one command with quantized physical geometry, and cancel commits none;
- tree and canvas expose one selection order and one Key Element, producing the same alignment result through pointer, menu, and keyboard routes;
- all required tasks are keyboard-completable, focus never enters invisible/locked descendants, and selection/lock/visibility/reparent/validation changes are announced through a stable semantic DOM or ARIA live region;
- 200% UI text scaling and Windows display scaling do not mutate Log Template page geometry;
- visual, semantic-layout, and accessibility-tree snapshots are stable in the pinned environment.

**Falsifiers:** façade serialization leaks into saved state; canvas object scale becomes authored width/height; selection differs between tree and canvas; hidden fallback DOM is stale; focus is represented only by painted pixels; or worker rendering adds more interaction latency than it removes.

### Ticket #19 — Shared-axis Data Track for N-values, moisture, PL, and LL

**Hypothesis 19-A:** the renderer-neutral scene can express a Data Track as one depth geometry plus ordered data layers and one or more compatible numeric-axis definitions, with backend-independent clipping and pagination. No specialized chart package or duplicated interval/axis objects are required.

Run the #19 scene through every #17 finalist. Do not let a chart library calculate depth or page breaks.

**Fixture:** N-values as points/line, moisture points/line, PL–LL range, optional separate numeric axis, shared numeric axis when units/scales are compatible, missing laboratory values, values outside domain, coincident values, dense overlaps, reversed visibility/order, locked layer, interval spanning a page boundary, manual Reference Depth Range break, and a nonuniform source sampling interval.

**Pass only if all are true:**

- each page uses the exact same `depthToY` function for axes, grid, N-values, moisture, PL, LL, strata, samples, and interval bars;
- a shared numeric axis is emitted once per configured axis, never once per layer; incompatible units/scales require an explicit separate-axis assignment or diagnostic;
- layer visibility and order change paint only, not shared depth geometry or unrelated pagination;
- page clipping splits strokes/ranges deterministically without duplicating or losing boundary observations; the semantic golden records source observation IDs on both clipped fragments where continuity requires it;
- missing values create no invented zero; out-of-range values follow one explicit clip/marker/warn policy; overlapping values remain individually inspectable/identifiable;
- normalized scene geometry is identical across #17 finalists; PDF and preview coordinates meet the #17 tolerances;
- the 2,000-primitive #18 stress page with all Data Track layers enabled remains within the #18 latency budget.

**Falsifiers:** a layer owns a duplicate depth axis/interval bar; hiding one layer shifts another; chart-library autoscaling silently changes a configured domain; page clipping changes source identity; or one backend needs a different domain model.

## Decision frontier after prototypes

The initial evidence-backed frontier is:

1. Run #17 with Chromium, PDFKit/fontkit, and Typst as bounded finalists.
2. Run #18 first on DOM/SVG with an immutable scene/command adapter; invoke Konva, then CanvasKit, only on measured failure.
3. Run #19 through the same scene and every surviving #17 renderer; do not introduce a separate chart authority.
4. If no finalist satisfies Unicode, accessibility, and geometry together, prototype **one** native fallback: Skia when preview/PDF parity and performance dominate, Pango/Cairo when international paragraph layout dominates.
5. Select production architecture only after recording fixture results, pinned versions/builds, packaging cost, license/SBOM findings, PDF structural inspection, and accessible reading-order results.

Documentation alone leaves these material facts unresolved: exact preview/PDF text parity, backend fallback selection, `fsType` enforcement, full-SVG vector preservation, PDF/UA conformance, canvas accessibility synchronization, dense-page latency, and native Windows packaging cost. Those are the intended outputs of #17–#19, not details for an implementation agent to invent.
