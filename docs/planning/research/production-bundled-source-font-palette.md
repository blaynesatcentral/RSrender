# Production-bundled Source font palette

**Research date:** 2026-08-25  
**Scope:** A small, useful Windows-first font palette that RSrender can bundle and use for deterministic screen/SVG/PDF output.  
**Status:** Primary-source candidate research complete; font binaries are **not downloaded or admitted by this note**.

## Recommendation

Admit twelve **unmodified static TTF** files from the latest stable Adobe upstream releases: Source Sans 3, Source Serif 4, and Source Code Pro, each in Regular, Italic, Bold, and Bold Italic. This gives RSrender a practical sans-serif, serif, and monospaced palette without relying on fonts installed on the user's machine.

The family names shown to users should be the upstream names—`Source Sans 3`, `Source Serif 4`, and `Source Code Pro`. “Qualified” is an admission state, not part of a typeface's name; expose it separately if the UI needs to communicate provenance. Each text occurrence can then select its own family and style while the renderer resolves an exact admitted font-file identity.

This recommendation deliberately starts with the four conventional styles in each family. The releases also contain additional weights, and Source Serif 4 contains multiple optical-size families. Those are legitimate later candidates, but adding all of them immediately would increase package size, test combinations, measurement fixtures, and notice inventory without unlocking a new basic text-style behavior.

## Exact stable upstream releases

As of 2026-08-25, GitHub marks the following releases as latest. All three repositories identify their license as OFL-1.1.

| User-facing family | Exact stable version and tag | Release date | Primary upstream evidence |
| --- | --- | --- | --- |
| Source Sans 3 | version `3.052`, tag `3.052R` | 2023-04-04 | [release record](https://github.com/adobe-fonts/source-sans/releases/tag/3.052R), [tagged TTF directory](https://github.com/adobe-fonts/source-sans/tree/3.052R/TTF), [tagged license](https://github.com/adobe-fonts/source-sans/blob/3.052R/LICENSE.md) |
| Source Serif 4 | version `4.005`, tag `4.005R` | 2023-01-20 | [release record](https://github.com/adobe-fonts/source-serif/releases/tag/4.005R), [tagged TTF directory](https://github.com/adobe-fonts/source-serif/tree/4.005R/TTF), [tagged license](https://github.com/adobe-fonts/source-serif/blob/4.005R/LICENSE.md) |
| Source Code Pro | upright `2.042`, italic `1.062`, variable `1.026`; tag `2.042R-u/1.062R-i/1.026R-vf` | 2023-04-12 | [release record](https://github.com/adobe-fonts/source-code-pro/releases/tag/2.042R-u%2F1.062R-i%2F1.026R-vf), [tagged repository](https://github.com/adobe-fonts/source-code-pro/tree/2.042R-u%2F1.062R-i%2F1.026R-vf), [tagged license](https://github.com/adobe-fonts/source-code-pro/blob/2.042R-u%2F1.062R-i%2F1.026R-vf/LICENSE.md) |

Source Sans 3's release says version 3.052 adds Medium and updates vertical metrics; this is a reason to pin the release rather than resolving a moving branch. Source Code Pro's release says its static instances were recompiled to correspond to the variable-font versions. Source Serif 4's release specifically recommends TTF on Windows because of a Windows CFF2 variable-font problem. Static TTF also avoids introducing variable-axis state into RSrender's first multi-family layout contract. See the three release records above.

## Exact static TTF inputs

The links below are direct, official, tag-pinned upstream downloads. The sizes and Git blob object IDs were read from GitHub's official Contents API on 2026-08-25. A Git blob ID is useful provenance evidence, but it is **not** RSrender's required SHA-256 admission digest. Admission must download each selected file once through the controlled process and independently record its SHA-256.

### Source Sans 3 `3.052R`

| Style | Exact upstream file | Bytes | Upstream Git blob ID |
| --- | --- | ---: | --- |
| Regular | [`SourceSans3-Regular.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-sans/3.052R/TTF/SourceSans3-Regular.ttf) | 431,196 | `c5dd0b88cc8ff4edd7ebdcefee0290df15529657` |
| Italic | [`SourceSans3-It.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-sans/3.052R/TTF/SourceSans3-It.ttf) | 315,812 | `8e0576f246d15c19d445af943f7302dc95a8b18e` |
| Bold | [`SourceSans3-Bold.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-sans/3.052R/TTF/SourceSans3-Bold.ttf) | 428,176 | `85693ccc852fbd7fa4ae9d89d6ccbf6d38f8e0f0` |
| Bold Italic | [`SourceSans3-BoldIt.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-sans/3.052R/TTF/SourceSans3-BoldIt.ttf) | 318,700 | `1a83e3fbdb27dda20c49594e6823eac033c5cc8d` |

### Source Serif 4 `4.005R`

These are the release's base text faces, not its Caption, Small Text, Subhead, or Display optical families.

| Style | Exact upstream file | Bytes | Upstream Git blob ID |
| --- | --- | ---: | --- |
| Regular | [`SourceSerif4-Regular.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-serif/4.005R/TTF/SourceSerif4-Regular.ttf) | 261,868 | `964a2bf8934182485cf4e2348c8443091739334f` |
| Italic | [`SourceSerif4-It.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-serif/4.005R/TTF/SourceSerif4-It.ttf) | 187,808 | `e818087d0c75997a38189f6cf578c468df175062` |
| Bold | [`SourceSerif4-Bold.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-serif/4.005R/TTF/SourceSerif4-Bold.ttf) | 271,568 | `c4159ff2a409d9224dfa97af4e5167817e91e833` |
| Bold Italic | [`SourceSerif4-BoldIt.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-serif/4.005R/TTF/SourceSerif4-BoldIt.ttf) | 191,832 | `40f3863f36edab3fa46a22e16a196f487b3df240` |

### Source Code Pro `2.042R-u/1.062R-i/1.026R-vf`

| Style | Exact upstream file | Bytes | Upstream Git blob ID |
| --- | --- | ---: | --- |
| Regular | [`SourceCodePro-Regular.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-code-pro/2.042R-u/1.062R-i/1.026R-vf/TTF/SourceCodePro-Regular.ttf) | 210,312 | `10c73d7d901cf0dfa8ba03e45e3271d466291520` |
| Italic | [`SourceCodePro-It.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-code-pro/2.042R-u/1.062R-i/1.026R-vf/TTF/SourceCodePro-It.ttf) | 166,548 | `cb86a4e9577f2485045d8519dbc3b248ba002bec` |
| Bold | [`SourceCodePro-Bold.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-code-pro/2.042R-u/1.062R-i/1.026R-vf/TTF/SourceCodePro-Bold.ttf) | 206,804 | `a032f5928a96b420267c95916da0a5958960915a` |
| Bold Italic | [`SourceCodePro-BoldIt.ttf`](https://raw.githubusercontent.com/adobe-fonts/source-code-pro/2.042R-u/1.062R-i/1.026R-vf/TTF/SourceCodePro-BoldIt.ttf) | 169,140 | `6e4bc44d74549fffde84dcad44b3f96b5e082e41` |

The total upstream size of this twelve-file baseline is 3,159,764 bytes before application-package compression.

## License, notices, and reserved name

Each tagged Adobe license declares SIL Open Font License 1.1 and reserves the font name `Source`: Source Sans 3 identifies copyright 2010–2022 Adobe, Source Serif 4 identifies copyright 2014–2023 Adobe, and Source Code Pro identifies copyright 2023 Adobe. See the tagged license links in the release table.

The controlling OFL conditions allow use, copying, embedding, modification, redistribution, and sale of modified or unmodified font copies, subject to its conditions. In particular:

- The font files cannot be sold by themselves.
- Original or modified fonts can be bundled and sold with software if each copy carries the copyright notice and OFL license in an accessible form.
- The fonts remain under OFL 1.1; that requirement does not change the license of documents produced with them.
- A modified font may not use the Reserved Font Name `Source` without Adobe's written permission.
- Adobe's or the authors' names cannot be used to promote or imply endorsement of a modified font, except for factual acknowledgement.

Those requirements are in each family's [tagged Source Sans license](https://github.com/adobe-fonts/source-sans/blob/3.052R/LICENSE.md), [tagged Source Serif license](https://github.com/adobe-fonts/source-serif/blob/4.005R/LICENSE.md), and [tagged Source Code Pro license](https://github.com/adobe-fonts/source-code-pro/blob/2.042R-u%2F1.062R-i%2F1.026R-vf/LICENSE.md).

SIL's first-party FAQ confirms that an OFL font may be included in proprietary and commercial applications without putting the application under OFL, and may be embedded in a document either in full or as a subset without changing the document's license. For an application bundle, SIL recommends including at minimum the copyright statement, license notice, and full license text, and says only the faces actually used need to ship. See [OFL FAQ questions 1.3–1.4, 1.10–1.13, and 1.20](https://openfontlicense.org/ofl-faq/).

### RSrender distribution consequences

For the recommended unmodified static files:

1. Bundle the exact tagged TTF bytes; do not convert, subset, optimize, edit metadata, or rename them during application packaging.
2. Preserve the exact family names in the font files and UI. Since the bytes remain the Original Version, using the reserved word `Source` is allowed.
3. Add the original Adobe copyright statements and the complete OFL 1.1 text to RSrender's packaged Third-Party Notices surface. Keep the fonts separately identified as OFL assets rather than implying that they are covered by RSrender's software license.
4. Acknowledge Adobe only as the font copyright holder; do not present Adobe as endorsing RSrender.
5. Permit full or subset embedding in a generated PDF. Preserve the document's RSrender/customer licensing independently; the OFL does not attach to the PDF document itself.
6. If a later build process converts the TTFs to WOFF/WOFF2 or strips glyphs/tables, treat that as a new modification review. SIL says webfont subsetting is modification and normally requires removal of Reserved Font Names unless the result satisfies its demanding Functional Equivalence rules. Avoid that complexity for this baseline by projecting the original TTF bytes directly. See [OFL FAQ section 2](https://openfontlicense.org/ofl-faq/).

This is a license reading for engineering admission, not legal advice.

## Required admission and qualification evidence

The research makes the twelve files suitable **candidates**, not installed production assets. A production admission should not close until it records:

1. the exact upstream tag and direct URL for every file;
2. locally calculated SHA-256 and byte length for every downloaded TTF;
3. inspected OpenType family/subfamily/full/PostScript names, weight/style values, Unicode coverage, and `OS/2.fsType` embedding flags;
4. the original Adobe copyright statements, complete OFL text, Reserved Font Name `Source`, and packaged notice location;
5. a renderer-owned catalog mapping each user-facing family/style to an exact font byte hash, not to Windows font discovery;
6. deterministic measurement fixtures for all twelve faces and explicit missing-glyph behavior;
7. evidence that SVG screen projection and PDF publication select the same face and resolved text measurements;
8. PDF inspection proving selectable text, expected embedded/subset face identity, Unicode extraction, and no silent system-font substitution;
9. packaged-executable inspection proving all admitted font and notice assets are present and no unadmitted font bytes are included; and
10. interaction evidence that separate text occurrences can independently select all three families and four styles, survive save/load, support Undo/Redo, and export consistently.

## Decision

Proceed with the twelve exact static TTF candidates above. They provide the smallest credible “standard font families” palette for the expanded beta while preserving RSrender's deterministic renderer-neutral text authority. Do not use operating-system enumeration as the production answer: it would make saved documents and exported PDFs depend on the particular workstation. Additional installed fonts can be a separately designed, explicitly non-portable feature later.

## Primary-source index

- [Adobe Source Sans 3 releases](https://github.com/adobe-fonts/source-sans/releases)
- [Adobe Source Sans 3 `3.052R`](https://github.com/adobe-fonts/source-sans/releases/tag/3.052R)
- [Adobe Source Serif 4 releases](https://github.com/adobe-fonts/source-serif/releases)
- [Adobe Source Serif 4 `4.005R`](https://github.com/adobe-fonts/source-serif/releases/tag/4.005R)
- [Adobe Source Code Pro releases](https://github.com/adobe-fonts/source-code-pro/releases)
- [Adobe Source Code Pro `2.042R-u/1.062R-i/1.026R-vf`](https://github.com/adobe-fonts/source-code-pro/releases/tag/2.042R-u%2F1.062R-i%2F1.026R-vf)
- [SIL Open Font License](https://openfontlicense.org/)
- [SIL OFL FAQ](https://openfontlicense.org/ofl-faq/)
