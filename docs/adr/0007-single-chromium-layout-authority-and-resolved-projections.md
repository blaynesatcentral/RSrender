---
status: accepted
---

# Use one Chromium layout authority and resolved DOM/SVG projections

RSrender v0.9 will keep page planning and scene geometry in a renderer-neutral TypeScript engine while one sandboxed Chromium Layout Host, under an exactly pinned Electron/font/locale configuration, owns text shaping, line breaking, measurement, and consumed source ranges. The visible semantic HTML/SVG canvas consumes the resulting Resolved Page Scene. PDF publication projects the same fixed, non-wrapping lines and geometry through the Layout Host and Electron `webContents.printToPDF`; it may not ask Chromium, another PDF library, or print CSS to independently wrap or paginate the source content.

The renderer-neutral Page Plan and Resolved Page Scene own physical page geometry in integer thousandths of a point, Template Variant and Reference Depth Range identity, page/depth ownership, text source ranges, logical and ink bounds, effective font identity, overflow outcome, semantic reading order, and Diagnostics. DOM/SVG and PDF are disposable projections, never document truth. A changed Electron, font, locale, measurement-input, or scene digest invalidates cached measurements and requires remeasurement before publication.

## Consequences

- Electron 43.4.0 is the current development-qualification pin because the #17 prototype directly exercised its DOM measurement and `printToPDF` path. An Electron/Chromium or font change reruns semantic, inspected-PDF, accessibility, and performance qualification.
- Raw browser reflow, an independently wrapping PDF engine, pixel-round-tripped geometry, and a screenshot-only golden are rejected. The #17 four-point box-model calibration failure demonstrates why nominally identical text and rectangles are insufficient.
- The sandboxed Layout Host owns derived measurement only. It cannot mutate a Log Project/Log Template, choose product pagination or overflow policy, access source transport/files, or publish output. A host crash invalidates derived caches while main-owned lifecycle and dirty state survive.
- Semantic HTML plus SVG is the selected v0.9 screen projection. If #30 proves it cannot meet the accepted minimum-endpoint envelope, a replacement projection must retain the same scene, measurement, command, and semantic-alternative contracts.
- PDFKit/fontkit and Typst are rejected as primary v0.9 layout/PDF authorities in their tested forms. Typst may remain an independent later PDF/UA oracle; no second runtime layout engine is implied.
- Custom/mixed page-size preservation, selectable/vector output, font embedding/subsetting, tagging/PDF-UA, reading order, and exact tolerances remain #25/#26 release qualification. Enabling the tagged-PDF option is not evidence that the returned PDF is conforming.
- Exact font identity/digest and embedding rights are required. Missing or substituted fonts invalidate fit evidence and produce a Diagnostic rather than a silent fallback claim.
- Keyboard, screen-reader, forced-colour, and scaling acceptance remains #34/#40; DOM/SVG supplies a semantic seam but is not itself accessibility proof.

The complete component and contract consequences are normative in the [RSrender architecture specification](../planning/specifications/rsrender-architecture.md). Evidence: [deterministic layout/typography/canvas/PDF research](../planning/research/deterministic-layout-typography-canvas-pdf-options.md), [issue #17](https://github.com/blaynesatcentral/RSrender/issues/17), [issue #18](https://github.com/blaynesatcentral/RSrender/issues/18), and [issue #19](https://github.com/blaynesatcentral/RSrender/issues/19).
