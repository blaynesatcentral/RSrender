# BLD-027 Boring Log PDF verification

## Outcome

BLD-027 adds main-owned PDF publication to the packaged Boring Log Studio. The screen and PDF projections consume the same validated renderer-neutral Resolved Page Scene and resolved text outcomes. The retained two-run qualification is `artifacts/bld-027-boring-log-pdf-evidence.json`; its final user-visible output is `output/pdf/rsrender-boring-log-mvp.pdf`.

## Observable product result

- Export PDF is available from the packaged application after its initial structured scene loads.
- A capability-bound preload route asks Electron main to publish the exact active document revision and scene digest.
- Main opens a fresh, hidden, sandboxed Layout Host, projects the scene as fixed non-wrapping semantic SVG, and uses Electron `printToPDF` with the scene's Letter page size.
- Publication stages a sibling temporary file, flushes it, commits a create-new destination, reopens the result, and verifies its digest before reporting success.
- Two sequential packaged sessions exported independently and exited with zero remaining RSrender processes and zero stderr output.

## Normalized PDF evidence

The final 117,995-byte PDF passed repository-owned Poppler inspection with:

- one 612 by 792 point page and exact Media, Crop, Bleed, Trim, and Art boxes;
- a tagged target, no encryption, no JavaScript, and PDF 1.4;
- two embedded, subset, Unicode Arial faces;
- zero images, 273 vector paths, 1,968 vector uses, and all 227 expected scene nodes represented;
- 105 of 105 expected unique text tokens, valid representative reading order, and selectable text;
- no `pdfinfo`, `pdffonts`, `pdfimages`, or `pdftotext` warnings;
- exact scene and projection digests embedded in document metadata.

The final Poppler-rendered page was inspected at original resolution. Header, rulers, lithology, material intervals, samples, recovery, blows, N values, data plots, remarks, legend, notes, sheet count, and approval footer are legible without overlap.

## Shared-scene and authority proof

- Layout remains integer-mpt and renderer-neutral until the publication projection converts exact mpt values to three-decimal PDF points.
- The publication projection accepts only a validated resolved scene and emits no image, Canvas, script, external resource, or wrapping layout authority.
- The renderer cannot choose a destination, write a file, or invoke Electron PDF APIs directly.
- The route requires exact capability, origin, window, frame, generation, sequence, document, revision, scene, and arguments.
- Source-original versus effective override provenance survives screen edits before the same rebuilt scene is exported.

## Synthetic fixture revision

Packaged cross-projection inspection exposed header, sheet-count, footer-note, and legend-spacing defects in the original synthetic fixture presentation. `mvp-boring-log-test-01@r2` supersedes only that synthetic visual content and acceptance oracle; it does not alter or claim evidence about client data. The original client design render remains read-only and is not committed or embedded. The external AI-generated PNG is not used as product evidence or rendering input.

## Qualification commands

Run with the admitted repository-local Node 24.18.1 executable:

```powershell
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test --test-concurrency=1 .\tests\*.test.mjs
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\shell-run-bld027.mjs --record
& .\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\enforce-dependency-admission-bld007.mjs --write
```

Also run format, lint, TypeScript build, package-boundary, architecture, admission-verification, inventory, and package gates.

## Explicit nonclaims

BLD-027 does not claim PDF/UA conformance, qualified-destination durability, Replace Existing semantics, release readiness, or product-owner acceptance. It completes the PDF vertical slice; BLD-028 still owns final integrated packaged MVP qualification. The product-owner MVP remains below 100% until that complete flow is personally operable and accepted.
