# BLD-001 dependency-admission candidates

**Research status:** complete as a read-only candidate dossier on 2026-08-14.  
**Admission status:** **NOT APPROVED** for every item in this document.  
**Authority required:** an accountable employer/rights authority must record the disposition of every exact version and its resolved dependency tree before any package manifest, lockfile, download, installation, build, packaging run, or distribution-bearing implementation write.

This is primary-source research, not legal advice, a security assessment, a dependency lock, or implementation authority. It implements the admission-first boundary in the final architecture, ADR 0003, and BLD-001 without changing that boundary.

## 1. Bounded recommendation

The smallest credible BLD-001 toolchain found is:

| Role | Exact candidate | Intended use | Proposed placement | Current disposition |
|---|---|---|---|---|
| Development runtime | Node.js `24.18.1` LTS | Run npm, TypeScript, build, test, lint, format, and packaging commands | External toolchain pin; not an npm dependency | **NOT APPROVED** |
| Package manager | npm `11.16.0` | Exact lock/install command behavior; this version is bundled with Node 24.18.1 | External toolchain pin; do not add a second npm package to the workspace | **NOT APPROVED** |
| Desktop runtime | `electron@43.4.0` | Architecture-pinned Electron runtime and type declarations | Exact `devDependency`; packaged binary input | **NOT APPROVED** |
| ZIP implementation | `@zip.js/zip.js@2.8.49` | Architecture-pinned ZIP primitive behind RSrender's owned constrained-envelope boundary | Exact production `dependency` | **NOT APPROVED** |
| Type checker/compiler | `typescript@6.0.3` | Strict TypeScript checking and JavaScript emission where bundling is unnecessary | Exact `devDependency` | **NOT APPROVED** |
| Node declarations | `@types/node@24.13.3` | Node 24 API declarations made explicit under TypeScript 6's empty default `types` set | Exact `devDependency` | **NOT APPROVED** |
| Bundler | `esbuild@0.28.1` | Bundle Electron main/preload/renderer entry points without adopting a UI or meta-framework | Exact `devDependency` | **NOT APPROVED** |
| App packager | `@electron/packager@20.0.4` | Produce a host-platform Electron application folder for BLD-001/BLD-006 package smoke tests; not an installer | Exact `devDependency` | **NOT APPROVED** |
| Test runner | Node `node:test` from `24.18.1` | Unit, property-style, boundary, and deliberately invalid import-fixture tests | Built into the pinned Node runtime; no package | **NOT APPROVED** |
| JavaScript/TypeScript linter | `eslint@10.8.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.65.0` | Flat-config linting for JavaScript and TypeScript, including owned package-direction rules/checks | Exact `devDependencies` | **NOT APPROVED** |
| Formatter | `prettier@3.9.6` | Deterministic formatting check/write commands | Exact `devDependency` | **NOT APPROVED** |

No React, Vite, Electron Forge, installer maker, Vitest/Jest, monorepo orchestrator, dependency-cruiser, license scanner, SBOM generator, or update/signing package is proposed for BLD-001. Node's test runner avoids a test-framework tree. An owned import-graph check over TypeScript source/project references can exercise the BLD-001 dependency-direction fixture without another dependency; BLD-007 later owns continuous SBOM/license/provenance enforcement.

TypeScript `7.0.2` was deliberately not proposed even though npm marked it latest during this investigation. The current `typescript-eslint@8.65.0` contract supports TypeScript `>=4.8.4 <6.1.0`; `6.0.3` is the latest TypeScript 6 servicing release and stays inside that declared range. See the [typescript-eslint dependency policy](https://typescript-eslint.io/users/dependency-versions/) and [exact package contract](https://github.com/typescript-eslint/typescript-eslint/blob/v8.65.0/packages/typescript-eslint/package.json).

## 2. Exact provenance and integrity ledger

Integrity strings below were read from first-party release pages or the official npm registry on 2026-08-14. They identify candidates; they were **not** verified against downloaded artifacts because downloads and installs are outside this research scope. npm documents that registry `dist.integrity` is the package artifact's Subresource Integrity value and that a lockfile records resolved artifacts and integrity ([package-lock documentation](https://docs.npmjs.com/cli/v7/configuring-npm/package-lock-json/)).

### 2.1 Node.js 24.18.1 and npm 11.16.0

- Upstream: Node.js project, [24.18.1 LTS release](https://nodejs.org/en/blog/release/v24.18.1), [source license and bundled third-party notices](https://github.com/nodejs/node/blob/v24.18.1/LICENSE).
- Node upstream license form: MIT for Node.js plus the third-party license notices contained in the versioned `LICENSE`; the composite notice file requires accountable review, not just the headline identifier.
- Official Windows x64 release artifact proposed for the current Windows-only architecture: `node-v24.18.1-win-x64.zip`.
- Official SHA-256: `ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765`.
- The official release identifies npm `11.16.0` as the bundled npm version.
- npm upstream: npm CLI, [repository](https://github.com/npm/cli), [official registry version](https://www.npmjs.com/package/npm/v/11.16.0).
- npm upstream-declared license: `Artistic-2.0`.
- npm registry tarball: `https://registry.npmjs.org/npm/-/npm-11.16.0.tgz`.
- npm registry SRI: `sha512-A74XL8OxmcegZDMWPkWb5bEQppg8HdYwW3rBD2sPoS4UQHVajfaxBkqyzLeJ3wR0kZ+5xoTjItxXaF7eIXUsyw==`.
- npm has a large bundled/direct dependency and notice surface. The exact contents shipped inside the selected Node archive, rather than a separately installed npm tarball, must be inventoried.

### 2.2 Electron 43.4.0

- Upstream: Electron project, [signed release record and release notes](https://github.com/electron/electron/releases/tag/v43.4.0), [versioned MIT license](https://github.com/electron/electron/blob/v43.4.0/LICENSE), [official installation/download behavior](https://www.electronjs.org/docs/latest/tutorial/installation).
- Release commit shown by GitHub: `154ee91`; GitHub reports a verified release signature.
- Upstream-declared package license: `MIT`.
- npm registry tarball: `https://registry.npmjs.org/electron/-/electron-43.4.0.tgz`.
- npm registry SRI: `sha512-3qxGF0CeQbiox5oWV1JlbWGQ1VerbmDhTFqW4sJ8h7uqTHniFYPObXJcDna0DMh32et0fFyKzz0YY8lJv3t5jg==`.
- Official Windows x64 binary SHA-256 from the release's `SHASUMS256.txt`: `ef0709cfa719739acce73de6f9b684304baf38c6454376638a70d34a7cecffe0` for `electron-v43.4.0-win32-x64.zip`.
- Official Windows ARM64 binary SHA-256: `cec4e502e5db33b432adcf1278072fb14b9edeb88403e0952e4b864bdf51b0ef` for `electron-v43.4.0-win32-arm64.zip`; ARM64 is inventory evidence, not a v0.9 support decision.
- Registry engine floor: Node `>=22.12.0`, satisfied by the proposed Node 24.18.1.
- Registry-declared direct dependencies are ranged, not exact: `@types/node ^24.9.0`, `@electron/get ^5.0.0`, and `@electron-internal/extract-zip ^1.0.1`. The actual lock must resolve and admit every transitive version.
- The npm package runs a binary download path; official documentation says installation contacts Electron's GitHub release artifacts through `@electron/get`. Admission therefore covers both the npm tarball and the exact downloaded Electron binary/checksum.
- The packaged runtime includes Chromium/Node and their third-party notice surface. Preserve and review Electron's `LICENSE` and `LICENSES.chromium.html`; MIT alone is not a complete distribution notice inventory.
- Security remains time-sensitive. Electron states that app vendors must update Electron to receive fixes and recommends the latest stable line ([sandbox/security maintenance guidance](https://www.electronjs.org/docs/latest/tutorial/sandbox)). Pin changes still require the architecture's recorded decision process.

### 2.3 @zip.js/zip.js 2.8.49

- Upstream: zip.js project, [repository, documentation, and BSD-3-Clause declaration](https://github.com/gildas-lormeau/zip.js), [official npm version](https://www.npmjs.com/package/%40zip.js%2Fzip.js/v/2.8.49).
- Upstream-declared license: `BSD-3-Clause`.
- npm registry tarball: `https://registry.npmjs.org/@zip.js/zip.js/-/zip.js-2.8.49.tgz`.
- npm registry SRI: `sha512-TY3fKR/IQqPJqrOQAohvW6kv7Qd1aehzU7M7hbqhNNKxVP8uKSMO+aUlBwtdWzTCd62E0YOB+HHW9N0hMihrWw==`.
- Registry engine floor: Node `>=18.0.0`; no registry-declared direct, optional, or peer dependencies.
- The registry exposes an [npm/Sigstore SLSA provenance attestation](https://registry.npmjs.org/-/npm/v1/attestations/@zip.js%2fzip.js@2.8.49) for this exact version. Its existence is not proof that the package is safe; npm explicitly says provenance links source/build information but does not guarantee absence of malicious code ([npm provenance limitations](https://docs.npmjs.com/generating-provenance-statements/)).
- Intended use is only as a primitive under ADR 0003's bounded physical preflight and container-neutral logical validator. Encryption, arbitrary extraction, undeclared entries, native decoder handoff, and direct renderer/main use remain forbidden regardless of library capability.

### 2.4 TypeScript 6.0.3 and @types/node 24.13.3

- TypeScript upstream: Microsoft, [6.0 release rationale](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), [6.0.3 release record](https://github.com/microsoft/TypeScript/releases/tag/v6.0.3), [official npm package](https://www.npmjs.com/package/typescript/v/6.0.3).
- TypeScript upstream-declared license: `Apache-2.0`.
- TypeScript registry SRI: `sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==`.
- TypeScript has no registry-declared direct dependencies and declares Node `>=14.17`.
- Node declarations upstream: DefinitelyTyped, [versioned npm record](https://www.npmjs.com/package/%40types%2Fnode/v/24.13.3), [source tree](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node).
- `@types/node` upstream-declared license: `MIT`.
- `@types/node` registry SRI: `sha512-Dh8vAsV36ig5wa9OX4pXvMc9D3Veibfw2wix0CUwYODLD8nkj9UsLjASr49nPg+2eKzxhBV+v7L8pXvT4e639Q==`.
- Its declared dependency is `undici-types ~7.18.0`; the exact resolution, license, notices, and advisories remain unknown until admission generates a candidate lock.

### 2.5 esbuild 0.28.1

- Upstream: esbuild project, [repository](https://github.com/evanw/esbuild), [official npm version](https://www.npmjs.com/package/esbuild/v/0.28.1).
- Upstream-declared license: `MIT`.
- npm registry SRI: `sha512-HrJrvZv5ayxBzPfwphOoNzkzOIIlifzk0KJrGK2c8R4+LKpMtpYLQeUdjnwjWv/LZlkH2laZk+4w78pi99D4Vw==`.
- Registry engine floor: Node `>=18`.
- The package selects one of 26 exact `@esbuild/*@0.28.1` platform packages through optional dependencies and uses install-time native-binary handling. The host-specific package, install script behavior, binary origin, license, registry signature, and checksum must be admitted; it is not enough to approve only `esbuild`.
- The registry exposes an [npm/Sigstore provenance attestation](https://registry.npmjs.org/-/npm/v1/attestations/esbuild@0.28.1) for this exact version, subject to npm's stated limitations.

### 2.6 @electron/packager 20.0.4

- Upstream: Electron Packager, [official package documentation](https://www.npmjs.com/package/%40electron%2Fpackager/v/20.0.4), [source repository](https://github.com/electron/packager). Electron's packaging documentation recommends Forge generally but also documents manual packaging; BLD-001 needs only an application folder, not makers/installers ([Electron packaging overview](https://www.electronjs.org/docs/latest/tutorial/application-distribution/)).
- Upstream-declared license: `BSD-2-Clause`.
- npm registry SRI: `sha512-61iD4rkg0cofTn5z9xN4sdhtMR+l7G1i/X5/CmN74ZywOW1tUW+qa/J/w5itxidMemAQJjKLb9YYMHFxsbnk7A==`.
- Registry engine floor: Node `>=22.12.0`, satisfied by Node 24.18.1.
- Registry metadata declares 17 ranged direct dependencies, including Electron-owned archive, download, signing, notarization, universal-app, and Windows resource/signing packages. This is the largest avoidable candidate tree in the set. Admission may reject it and require an owned manual BLD-001 packaging harness using official Electron binaries; that alternative must itself be specified and verified rather than silently improvised.
- No installer maker, code signer, updater, publisher, or production distribution action is intended. Signing/notarization packages pulled transitively are not authorized for use merely because Packager declares them.
- The registry exposes an [npm/Sigstore provenance attestation](https://registry.npmjs.org/-/npm/v1/attestations/@electron%2fpackager@20.0.4) for this exact version, subject to npm's stated limitations.

### 2.7 Node test runner

- Upstream: Node.js `node:test`, [Node 24.18.1 test-runner API](https://nodejs.org/docs/v24.18.1/api/test.html).
- License, artifact integrity, and notices are inherited from the exact Node distribution above; there is no additional npm package.
- Intended use is deterministic tests compiled to JavaScript before execution. Property-style coverage can use owned deterministic generators and seeds until a demonstrated need justifies another dependency.

### 2.8 ESLint 10.8.0, @eslint/js 10.0.1, and typescript-eslint 8.65.0

- ESLint upstream: OpenJS/ESLint, [10.8.0 immutable release](https://github.com/eslint/eslint/releases/tag/v10.8.0), [official npm version](https://www.npmjs.com/package/eslint/v/10.8.0).
- `eslint` and `@eslint/js` upstream-declared license: `MIT`.
- `eslint` registry SRI: `sha512-nuKKvN+oIBO0koN7Tm7dlkmnkc21mtt0QJLwAKzjLq14y6lRTdVG36MZHJ8eQHwdJMwZbQNMlPOYedMq/oVJvQ==`.
- `@eslint/js` registry SRI: `sha512-zeR9k5pd4gxjZ0abRoIaxdc7I3nDktoXZk2qOv9gCNWx3mVwEn32VRhyLaRsDiJjTs0xq/T8mfPtyuXu7GWBcA==`.
- Both declare Node `^20.19.0 || ^22.13.0 || >=24`; `@eslint/js` peers on `eslint ^10.0.0`, satisfied by the proposed exact versions.
- ESLint declares 30 ranged direct dependencies plus an optional `jiti` peer. Exact transitive licenses/notices/advisories remain unknown.
- TypeScript integration upstream: [typescript-eslint package](https://www.npmjs.com/package/typescript-eslint/v/8.65.0), [exact source package contract](https://github.com/typescript-eslint/typescript-eslint/blob/v8.65.0/packages/typescript-eslint/package.json).
- typescript-eslint upstream-declared license: `MIT`.
- Registry SRI: `sha512-/ggrHAwyjENDusvyxbuqxAC2dTnZg/Z8F+fgQtYIz+L6n/9HfSlEZcFGV/NsMNa6CkGk0xUjUAFwC0vHOflvIA==`.
- It declares four exact `8.65.0` packages and peers on ESLint `^8.57.0 || ^9.0.0 || ^10.0.0` and TypeScript `>=4.8.4 <6.1.0`; the proposed versions satisfy those ranges.
- The registry exposes an [npm/Sigstore provenance attestation](https://registry.npmjs.org/-/npm/v1/attestations/typescript-eslint@8.65.0) for `typescript-eslint@8.65.0`, subject to npm's stated limitations.

### 2.9 Prettier 3.9.6

- Upstream: Prettier, [3.9.6 release](https://github.com/prettier/prettier/releases/tag/3.9.6), [official npm version](https://www.npmjs.com/package/prettier/v/3.9.6).
- Upstream-declared license: `MIT`.
- npm registry SRI: `sha512-OpN0zzVdiaiAhxpuuj5efpIS4sY9j7bY6uR5mnj5yPzGkdkjNKSJeUThPb60Jw29QuAZgA4o+/iB49kFiaBX6g==`.
- Registry engine floor: Node `>=14`; no registry-declared direct, optional, or peer dependencies.
- No plug-ins are proposed. Adding a formatter plug-in would require a separate exact admission record.

## 3. Registry-signature and provenance observations

Official registry metadata exposed at least one ECDSA registry signature for every npm package listed above. This dossier records presence only; it did not download the packages or run verification. npm requires an installed dependency tree for `npm audit signatures` and explains that the command checks registry signatures and available provenance attestations ([verification procedure](https://docs.npmjs.com/verifying-registry-signatures/)).

The registry exposed SLSA provenance-attestation URLs for `@zip.js/zip.js@2.8.49`, `esbuild@0.28.1`, `@electron/packager@20.0.4`, and `typescript-eslint@8.65.0`. It did not expose such a URL in the queried metadata for Electron, TypeScript, `@types/node`, ESLint, `@eslint/js`, Prettier, or npm. Absence in this query is an unresolved evidence gap, not evidence of tampering; presence is not a safety or license approval.

## 4. Unknowns that block admission

No candidate may move from **NOT APPROVED** until the accountable authority receives and disposes at least these items:

1. A candidate `package-lock.json` generated only inside an authorized admission sandbox, with every direct, transitive, optional, bundled, and platform package resolved exactly and compared against this direct-candidate list.
2. An SPDX/SBOM-style inventory of the actual Node archive, Electron npm tarball and downloaded binary, resolved npm tree, esbuild host binary, and packaged application output.
3. Every license text, copyright/attribution requirement, notice file, source-offer or redistribution condition, and compatibility question for internal use, later commercial licensing/transfer, and the contemplated buyer transaction. Headline SPDX identifiers are insufficient.
4. Review of install/postinstall/download scripts, network destinations, executable/native artifacts, package-manager lifecycle-script policy, cache behavior, and whether scripts can be disabled or separately verified.
5. Verification of npm registry signatures and available provenance attestations; comparison of every resolved SRI/checksum; and validation of Electron and Node release checksums before execution.
6. A time-stamped vulnerability/advisory review of the complete resolved tree and bundled Chromium/Node components. No `npm audit`, OSV/GitHub advisory review, Electron support-window review, malware review, or binary scan was performed here.
7. A repeatable source-to-package correspondence assessment where provenance is absent or incomplete. Registry SRI proves artifact identity, not equivalence to a reviewed source tag or benign behavior.
8. Confirmation that Electron 43.4.0 remains the accountable architecture pin after security review. A newer release does not silently replace it; an out-of-support or vulnerable pin does not silently remain admissible.
9. An explicit decision on `@electron/packager`: admit its substantial tree, replace it with an owned manual packaging harness, or defer packaging. No alternative is approved by this dossier.
10. An exact host/architecture support decision. Windows x64 is the only v0.9 architecture currently implied by the product roadmap; the presence of ARM64 artifacts does not admit ARM64 support.

The actual installed tree is currently nonexistent, so transitive package counts, notice contents, security status, and deterministic repeat-install behavior are all **unknown** rather than clean.

## 5. Required accountable disposition record

The authority's admission record should contain one row per direct candidate and one row per resolved transitive/bundled/native artifact with:

- exact name/version/artifact filename and ecosystem role;
- source repository/tag/commit where available, registry/tarball/release URL, SRI/checksum, and signature/provenance verification result;
- declared license plus retained license/notice paths and reviewed obligations;
- intended runtime, development, test, build, packaging, or host-only use;
- install scripts, network/download behavior, native/executable content, and security/advisory disposition;
- internal-use, redistribution, commercial-transfer, and buyer-transfer disposition;
- approver identity, authority basis, decision date, expiry/review trigger, and any conditions;
- final state `APPROVED`, `REJECTED`, or `REQUIRES EXCEPTION`.

Until that record exists and every admitted artifact is `APPROVED`, BLD-001 remains at its pre-install gate. This dossier does not authorize creating `package.json`, a lockfile, `node_modules`, build output, an Electron download cache, or packaged binaries.
