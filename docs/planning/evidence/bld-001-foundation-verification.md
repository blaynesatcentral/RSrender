# BLD-001 foundation verification

Status: **PASS for the bounded BLD-001 internal-development foundation**  
Date: 2026-08-14  
Issue: [GitHub #45](https://github.com/blaynesatcentral/RSrender/issues/45)

## Scope and authority

Central Engineering Services, acting through its administrator with authorized RSLog access, admitted the exact dependency graph for internal development, testing, deployment, and internal Windows binaries. Public publication, external distribution, sale, and transfer are not included in this admission.

The machine-readable per-identity record is [`bld-001-internal-dependency-admission.json`](../../governance/bld-001-internal-dependency-admission.json). The human-readable authority boundary is [`bld-001-authority-approval-packet.md`](../../governance/bld-001-authority-approval-packet.md).

## Qualified environment

| Axis | Observed value |
|---|---|
| Operating system | Microsoft Windows NT 10.0.26200.0 |
| Node.js | 24.18.1 |
| npm | 11.16.0 |
| Electron | 43.4.0, exact production lock |
| Package format library | `@zip.js/zip.js` 2.8.49, exact production lock |
| Lifecycle-script policy | disabled by default; only the reviewed `esbuild` 0.28.1 postinstall is allowlisted |

## Reproducibility results

The following sequence was executed twice from `npm ci` on the same checked-out source and exact lock:

```text
npm ci --ignore-scripts
npm run bootstrap:approved
npm run verify
```

Both runs passed without lock drift. Each `verify` run passed:

- Prettier format check;
- ESLint;
- TypeScript project-reference build/typecheck;
- the valid architecture graph test;
- the deliberately invalid `domain` to Electron import rejection test;
- all eleven package-boundary manifests;
- internal import-direction enforcement;
- exact dependency-admission comparison;
- deterministic dependency inventory; and
- empty-workspace packaging.

The empty-workspace package inventory was also regenerated twice after the clean runs and produced the same SHA-256 digest.

## Deterministic evidence

| Artifact or result | Result |
|---|---|
| Production lock SHA-256 | `d88d3e88092ec275d5757592531b5fb57a912c593abb836663007d602064c1af` |
| Admitted and observed identities | 156 / 156, exact identity/source/integrity match |
| Physically installed packages on the qualified Windows platform | 142 |
| Workspace package entries | 22 lock entries representing 11 workspace packages and links |
| Compiled package outputs | 44 |
| Empty-workspace package inventory SHA-256, repeat 1 | `ffcba10ea56d13066d99eaeb8f78e79ccb6d5865ebaac44600c89d53eaaca4d0` |
| Empty-workspace package inventory SHA-256, repeat 2 | `ffcba10ea56d13066d99eaeb8f78e79ccb6d5865ebaac44600c89d53eaaca4d0` |
| Architecture tests | 2 passed, including the expected invalid-graph rejection |
| Registry-declared license families | 117 MIT; 15 Apache-2.0; 10 BSD-2-Clause; 2 BSD-3-Clause; 7 ISC; 5 BlueOak-1.0.0 |
| Lock-only npm audit at admission | 0 findings |

The generated [`dependency-inventory.json`](../../../artifacts/dependency-inventory.json) records every production lock path, version, registry source, integrity digest, dependency class, optional status, and install-script marker. The admission baseline adds registry license/provenance evidence, the internal-use disposition, and the notice obligation for every exact identity. BLD-007 owns continuous SBOM/notices generation, exact license-text custody, and drift enforcement.

## Bounded conclusion and nonclaims

BLD-001 establishes the production repository foundation and unblocks the subsequent implementation tickets. It does not claim that a product feature, Electron security boundary, source integration, package parser, file operation, layout renderer, PDF output, accessibility behavior, or releasable application is implemented or accepted.

Rerun this evidence whenever the lock, runtime pins, package graph, build configuration, package boundaries, lifecycle-script allowlist, or admitted use scope changes.
