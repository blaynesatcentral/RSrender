# Electron 43 default window-icon preference record

**Status:** text-only provenance for the product owner's non-final visual preference; no icon byte in this directory is an approved durable/public asset or a shippable RSrender asset.

The issue #30 `BrowserWindow` set no custom icon, so Windows displayed the mark embedded in the pinned Electron executable. That third-party mark is not RSrender-authored, is not owned by RSrender, and must not be treated as RSrender branding.

For custody verification only, the locally preserved, Git-ignored review files have these names and hashes:

| Local-only filename | SHA-256 | Review provenance |
|---|---|---|
| `electron-default-candidate.ico` | `81F1B884D119866FCE0F06C46AB28891AB01510C2F09B99DAE8A421BE9DA2D6C` | Unaltered icon extracted from Electron 43.4.0 for the disposable issue #30 review |
| `electron-default-candidate.png` | `E2653D6E0450F0F7FBEB097F3F1A4B48907BD51802C87A64064967608ACC6A47` | Local 32-by-32 review rendering of that ICO |

Those filenames are deliberately excluded by the repository's `.gitignore`. Their presence in a local working directory is not permission to publish, commit, distribute, package, display in a shipped build, or supply them to an implementation agent. The Electron package's code license does not establish permission to adopt its project mark; Electron directs logo use to the OpenJS Foundation Trademark Policy.

The retained product preference is only: a compact, high-contrast desktop icon was preferred in the prototype window. A future candidate must be independently created or properly licensed, pass trademark/brand review, and avoid implying Electron/OpenJS endorsement. No implementer may reconstruct or trace the third-party mark from the hashes or this description.
