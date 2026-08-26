# Bundled production fonts

RSrender distributes the unmodified static TrueType faces in this directory under the SIL Open Font License 1.1. The adjacent `LICENSE-*.md` files retain each upstream license.

| Family | Upstream release | Exact source |
| --- | --- | --- |
| Source Sans 3 | `3.052R` | `github.com/adobe-fonts/source-sans/releases/tag/3.052R` |
| Source Serif 4 | `4.005R` | `github.com/adobe-fonts/source-serif/releases/tag/4.005R` |
| Source Code Pro | `2.042R-u/1.062R-i/1.026R-vf` | `github.com/adobe-fonts/source-code-pro/releases/tag/2.042R-u/1.062R-i/1.026R-vf` |

Only the unmodified Regular, Italic, Bold, and Bold Italic static TTF files are packaged. Exact byte, metric-table, glyph-coverage, name-table, weight, and embedding-rights evidence is recorded in `artifacts/bld-042-source-font-inspection.json`. Runtime admission data lives in `src/shipped-font-inventory.ts`; the application rejects any file whose SHA-256 digest differs from that inventory.

The Source family names are shown as their upstream names. RSrender does not modify these binaries, synthesize missing styles, or claim the Source names for modified derivatives.
