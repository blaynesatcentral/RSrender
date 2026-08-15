# BLD-007 dependency enforcement verification

Date: 2026-08-14  
Ticket: BLD-007 / GitHub #51  
Implementation result: **PASS**  
Full P07 release row: **BLOCKED** (intentionally outside BLD-007)

## Qualified result

- Pinned runtime: Node 24.18.1 and npm 11.16.0.
- Two clean runs independently reloaded all inputs in fresh pinned processes and produced identical artifacts.
- External graph: exactly 156 BLD-001 identities; zero added, removed, source-changed, or integrity-changed identities.
- Reviewed owned topology: 11 workspace packages, including the closed BLD-009 and BLD-010 internal-only edges, bound to lock SHA-256 `d9474b45cf6b56ec572ea8c81ea8d601a34f701a0ced11f2c164ab26f5a88b4c`.
- Dependency graph: 218 resolved edges.
- Production asset inventory: zero. The tracked/nonignored scan includes repository-root, package-output, and symlink cases while ignored reference go-bys remain outside the production inventory.
- Intentional drift vectors: 28/28 failed closed, including source, integrity, signature, lifecycle, local/runtime notice, Node/npm/toolchain byte, workspace manifest/edge/evidence, artifact baseline, root symlink, and package-output asset drift.
- Privacy scans: PASS; no host/user path, credential-shaped value, client data, or proprietary production asset was retained.

## Exact byte custody

The custody inventory binds the retained Node distribution ZIP, Node executable/license, bundled npm CLI/license/version, Electron release ZIP/executable/package manifest/runtime notices, esbuild tarball/native executable, and every installed `.node`, `.exe`, `.dll`, and `.wasm` byte.

Four exact packages omitted a bundled standalone full license file. Under the accountable internal-only custody approval, BLD-007 binds each exact identity, tarball source/integrity, declared SPDX license, and available manifest author/repository metadata to canonical MIT or BSD-2-Clause text. Every generated section states that it is constructed internal custody, is not upstream notice evidence, and does not approve public/external distribution, sale, assignment, or transfer. Four other gaps use exact admitted sibling or exact-package README license text.

## Retained artifacts

- `artifacts/bld-007-dependency-enforcement-evidence.json` — SHA-256 `4593087cbc5220e326c336866c4cfca3a2aa91e8c75e5c20bcbdf6802cdb0f68`
- `artifacts/bld-007-sbom.spdx.json` — SHA-256 `32c3ef5e8e8740bf21e03a2e9eafc3f9c7ab9f5660b574d6c3b268102696ea9b`
- `artifacts/bld-007-dependency-custody.json` — SHA-256 `367ec31523ede56ce5502a1dd1653f92f1d4f1410deaf08639d1d69f0e1c546b`
- `artifacts/bld-007-asset-inventory.json` — SHA-256 `cf1903cdb540a4cfd4082ebb676d3f3f68aa2e7de62d52d0015ca40c69f2876b`
- `artifacts/bld-007-third-party-notices.txt` — SHA-256 `aa3598f708a52469ef107374babac68817ed1311ff999e3b311f07d502a8e275`

## Commands

```powershell
$env:npm_config_user_agent='npm/11.16.0 node/v24.18.1 win32 x64'
.\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe tooling\enforce-dependency-admission-bld007.mjs --write
.\.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64\node.exe --test .\tests\bld-007-dependency-enforcement.test.mjs
```

The automation enforces prior decisions only. It cannot create a dependency admission, approve a topology ticket, or broaden internal-only authority.
