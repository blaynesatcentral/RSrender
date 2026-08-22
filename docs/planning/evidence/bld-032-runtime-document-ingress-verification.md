# BLD-032 runtime document ingress verification

BLD-032 replaces build-time test-fixture injection with a bounded, main-owned runtime document/template ingress. It makes the integrated Boring Log Studio the root packaged shell while preserving the existing command/history, scene, security, and publication authorities.

## User-visible result

- The packaged executable loads `example-data/rsrender-example-boring-log.json` from beside the executable by default.
- The same executable accepts an alternate valid bundle through `--rsrender-boring-log-input=<path>` without rebuilding the executable or `app.asar`.
- The external bundle is structured JSON and can change document metadata, intervals, samples, tests, remarks, legend, notes, approval content, and template inputs subject to the exact runtime contract.
- The packaged production path no longer imports `@rsrender/test-support` and no longer injects `globalThis.__RSRENDER_BORING_LOG_LAYOUT_JOB__` as document truth.
- Root `shell:package` and `shell:test:packaged` now target the integrated Boring Log Studio.

## Runtime authority and rejection behavior

- Main opens the selected file, checks that it is a regular file, enforces the 524,288-byte limit before allocation, performs a bounded read, decodes fatal UTF-8, parses JSON, and applies the exact layout-job validator.
- Main recomputes the document and template canonical SHA-256 digests and rejects stale or forged digest claims.
- The decoder detaches and freezes accepted input. Missing or rejected input fails closed for the production Studio package instead of silently falling back to the old semantic-only editor.
- The editable packaged example is written from production TypeScript authority outside `app.asar`; the repository retains no undeclared production JSON/image asset.

## Qualification

- Full regression: 302/302 PASS using pinned Node 24.18.1 with test concurrency 1.
- Focused BLD-032 tests after final lint correction: 3/3 PASS.
- Formatting, ESLint, and TypeScript build: PASS.
- Package boundaries: 11 packages PASS.
- Architecture boundaries: 11 packages PASS.
- Dependency admission: 156/156 identities PASS; the production asset inventory remains empty.
- Dependency inventory: 156 external packages and 22 workspace entries PASS.
- Integrated packaged qualification: three deterministic default-input runs plus one alternate-input run PASS; all four exercised selection, editing, Undo/Redo, and verified PDF export and exited with zero remaining RSrender processes.
- Default input scene digest: `sha256:b4ffe880560baace7ada04179969114913fc08a3152042bcfa22c52d699edaa5`.
- Alternate input scene digest: `sha256:a370ac458fe2a1aab43c71857af2f37d221c898d267fd8a0af3b4d3a89cba5a2`.
- Packaged executable SHA-256: `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4`.
- Packaged `app.asar` SHA-256: `15b6ae1c86b99e034eef220de72ca157f9ec51bb31738167ecc90f91a2f01009`.

## Nonclaims and remaining work

- This is a runtime-validated read-only Example Dataset ingress, not yet an ADR-0001/0003 Authoritative File or constrained-ZIP Log Project workflow.
- The visible application still lacks complete Open/New/Save and ribbon command workflows. Those controls do not count as operable merely because their visual tab state changes.
- The current text authority remains the pre-BLD-033 approximation. Final collision/fidelity qualification and personal product-owner operation remain open.
- BLD-028 and the umbrella program issue remain open.

Honest checkpoint after BLD-032: **80% overall toward the product-owner MVP and approximately 62% of the operable visible UX**.
