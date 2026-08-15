import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

export const BLD007_POLICY = Object.freeze({
  schema: "rsrender.bld007.enforcement-policy.v0",
  nodeVersion: "v24.18.1",
  npmVersion: "11.16.0",
  admissionState: "ADMITTED_INTERNAL_DEVELOPMENT_AND_TEST",
  bld001ProductionLockSha256: "d88d3e88092ec275d5757592531b5fb57a912c593abb836663007d602064c1af",
  implementationTopologyAuthority:
    "BLD-001 immutable external admission plus reviewed entries in the BLD-007 workspace-topology approval record",
  candidateLockSha256: "4f8952275c39d806dde16d38824fb21049e66535dccd784729e005dd894601c5",
  admissionSha256: "52b01884a18e0cad1cdb92cb64279bacf7982088b41500e2a79b3f0322f9834a",
  authorityPacketSha256: "4f5cda9216ef10ba2a65bb6a53b9a874e12a7f9d505c5e99a3aa19630b7fe815",
  foundationEvidenceSha256: "4bedd86d520def5de02cb5487ec8396abc3d9fd72e13bd2a8801f8029b5e5734",
  productionIdentityCount: 156,
  admittedLicenses: Object.freeze([
    "Apache-2.0",
    "BlueOak-1.0.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "MIT",
  ]),
  admittedScope: Object.freeze([
    "internal development",
    "internal testing",
    "internal deployment",
    "internal Windows binaries",
  ]),
  prohibitedLicensePattern:
    /(?:AGPL|GPL|SSPL|BUSL|Commons-Clause|NonCommercial|NC-|PolyForm|Elastic-License|UNLICENSED)/iu,
  assetExtensions: Object.freeze([
    ".bin",
    ".bmp",
    ".csv",
    ".dll",
    ".dylib",
    ".eot",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".mp3",
    ".mp4",
    ".node",
    ".otf",
    ".pdf",
    ".png",
    ".so",
    ".svg",
    ".tif",
    ".tiff",
    ".ttf",
    ".wasm",
    ".wav",
    ".webm",
    ".webp",
    ".woff",
    ".woff2",
    ".zip",
  ]),
});

export const BLD007_CODES = Object.freeze({
  admissionCount: "BLD007_ADMISSION_COUNT_MISMATCH",
  admissionDigest: "BLD007_ADMISSION_DIGEST_DRIFT",
  admissionMismatch: "BLD007_ADMISSION_STATE_INVALID",
  authorityDigest: "BLD007_AUTHORITY_DIGEST_DRIFT",
  authorityScope: "BLD007_AUTHORITY_SCOPE_INVALID",
  dependencyFlags: "BLD007_DEPENDENCY_FLAG_DRIFT",
  dependencyMissing: "BLD007_DEPENDENCY_MISSING",
  dependencyPath: "BLD007_DEPENDENCY_PATH_DRIFT",
  dependencyUnexpected: "BLD007_DEPENDENCY_UNAPPROVED",
  foundationDigest: "BLD007_FOUNDATION_EVIDENCE_DRIFT",
  graphUnresolved: "BLD007_DEPENDENCY_GRAPH_UNRESOLVED",
  installedMissing: "BLD007_INSTALLED_PACKAGE_MISSING",
  integrityDrift: "BLD007_DEPENDENCY_INTEGRITY_DRIFT",
  inventoryDrift: "BLD007_GENERATED_INVENTORY_DRIFT",
  licenseDrift: "BLD007_INSTALLED_LICENSE_DRIFT",
  licenseMissing: "BLD007_LICENSE_MISSING",
  licenseProhibited: "BLD007_LICENSE_PROHIBITED",
  licenseUnknown: "BLD007_LICENSE_UNKNOWN",
  lifecycleDrift: "BLD007_LIFECYCLE_SCRIPT_DRIFT",
  lockDigest: "BLD007_LOCK_DIGEST_DRIFT",
  manifestLock: "BLD007_PACKAGE_MANIFEST_LOCK_DRIFT",
  noticeTextMissing: "BLD007_NOTICE_TEXT_MISSING",
  nodeVersion: "BLD007_NODE_VERSION_MISMATCH",
  noticeMissing: "BLD007_NOTICE_OBLIGATION_MISSING",
  provenanceMissing: "BLD007_SOURCE_PROVENANCE_MISSING",
  privacyDrift: "BLD007_PRIVACY_VIOLATION",
  sourceDrift: "BLD007_DEPENDENCY_SOURCE_DRIFT",
  toolchainDrift: "BLD007_TOOLCHAIN_DRIFT",
  workspaceDrift: "BLD007_WORKSPACE_TOPOLOGY_DRIFT",
  sanitizedFailure: "BLD007_SANITIZED_INPUT_FAILURE",
  undeclaredAsset: "BLD007_UNDECLARED_ASSET",
  versionDrift: "BLD007_DEPENDENCY_VERSION_DRIFT",
});

const NOTICE_FILE_PATTERN = /^(?:LICENSE|LICENCE|COPYING|NOTICE)(?:[._-].*|$)/iu;
const ROOT_ASSET_DIRECTORIES = Object.freeze([
  "assets",
  "examples",
  "fixtures",
  "public",
  "resources",
]);
const ASSET_DIRECTORY_NAMES = new Set([
  "assets",
  "examples",
  "fixtures",
  "fonts",
  "hatches",
  "icons",
  "images",
  "resources",
  "samples",
]);
const RUNTIME_NOTICE_FILES = Object.freeze([
  "node_modules/electron/dist/LICENSE",
  "node_modules/electron/dist/LICENSES.chromium.html",
]);

const INTERNAL_NOTICE_REMEDIATIONS = Object.freeze({
  "@electron-internal/extract-zip@1.0.5": Object.freeze({
    license: "BSD-2-Clause",
    mode: "constructed-internal-custody",
  }),
  "err-code@2.0.3": Object.freeze({ license: "MIT", mode: "constructed-internal-custody" }),
  "keyv@4.5.4": Object.freeze({ license: "MIT", mode: "constructed-internal-custody" }),
  "natural-compare@1.4.0": Object.freeze({ license: "MIT", mode: "constructed-internal-custody" }),
  "@esbuild/win32-x64@0.28.1": Object.freeze({ sourceIdentity: "esbuild@0.28.1" }),
  "@humanfs/types@0.15.0": Object.freeze({ sourceIdentity: "@humanfs/core@0.19.2" }),
  "esrecurse@4.3.0": Object.freeze({ readme: true }),
  "imurmurhash@0.1.4": Object.freeze({ readme: true }),
});

const CANONICAL_LICENSE_TEXT = Object.freeze({
  MIT: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
  "BSD-2-Clause":
    'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\n2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES.',
});

const EXPECTED_TOOLCHAIN = Object.freeze({
  nodeArchive: "ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765",
  nodeExe: "ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582",
  nodeLicense: "d9c4eeda951d6d08f4aa1316b61aafcf67e6da5f79b18f8edeb56fa6abdc038c",
  npmCli: "3ce7cba6f5128dd5f54c98b6a5036b0f850496878cc2e21044b675fe3c594e3e",
  npmLicense: "af1573a67c9d9051fbf8a9c123a22b7f51ec58cb6a588b4c23bead776dd046ab",
  electronArchive: "ef0709cfa719739acce73de6f9b684304baf38c6454376638a70d34a7cecffe0",
  electronExe: "bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4",
  electronPackage: "c82dc5c216c3fafe62eb199d1593ce7bfe691e01dedb011b43466e3a2a160806",
  esbuildTarball: "eb8ef756f8299d16d5c8b35678606d715ba29923f500db7b37c181310eed40a5",
  esbuildExe: "ec02ee9b14ab332416fedd10614dfb80eed5304d94f67745067c011934a8c3c3",
});

const TOOLCHAIN_BINDINGS = Object.freeze({
  nodeArchive: Object.freeze({
    identity: "node@24.18.1",
    source: "https://nodejs.org/dist/v24.18.1/node-v24.18.1-win-x64.zip",
  }),
  nodeExe: Object.freeze({ identity: "node@24.18.1", derivedFrom: "nodeArchive" }),
  nodeLicense: Object.freeze({ identity: "node@24.18.1", derivedFrom: "nodeArchive" }),
  npmCli: Object.freeze({ identity: "npm@11.16.0", derivedFrom: "nodeArchive" }),
  npmLicense: Object.freeze({ identity: "npm@11.16.0", derivedFrom: "nodeArchive" }),
  electronArchive: Object.freeze({
    identity: "electron@43.4.0",
    source:
      "https://github.com/electron/electron/releases/download/v43.4.0/electron-v43.4.0-win32-x64.zip",
  }),
  electronExe: Object.freeze({ identity: "electron@43.4.0", derivedFrom: "electronArchive" }),
  electronPackage: Object.freeze({
    identity: "electron@43.4.0",
    admissionIdentity: "electron@43.4.0",
  }),
  esbuildTarball: Object.freeze({
    identity: "esbuild@0.28.1",
    admissionIdentity: "esbuild@0.28.1",
  }),
  esbuildExe: Object.freeze({
    identity: "@esbuild/win32-x64@0.28.1",
    admissionIdentity: "@esbuild/win32-x64@0.28.1",
  }),
});

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJsonValue(value) {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, stableJsonValue(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(stableJsonValue(value));
}

export function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function identityFromLockPath(packagePath, version) {
  const name = normalizePath(packagePath).split("node_modules/").at(-1);
  return `${name}@${version}`;
}

function packageNameFromIdentity(identity) {
  const delimiter = identity.lastIndexOf("@");
  return identity.slice(0, delimiter);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function diagnose(diagnostics, code, subject, consequence) {
  const key = `${code}\u0000${subject}`;
  if (!diagnostics.has(key)) {
    diagnostics.set(key, Object.freeze({ code, subject, consequence }));
  }
}

function sortedDiagnostics(diagnostics) {
  return [...diagnostics.values()].sort(
    (left, right) =>
      left.code.localeCompare(right.code) || left.subject.localeCompare(right.subject),
  );
}

function validateManifestLock(packageJson, lock, diagnostics) {
  const root = lock.packages?.[""];
  if (!root) {
    diagnose(
      diagnostics,
      BLD007_CODES.manifestLock,
      "root-package",
      "The lock has no root workspace entry; build and distribution stop.",
    );
    return;
  }
  for (const key of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const declared = packageJson[key] ?? {};
    const locked = root[key] ?? {};
    if (!sameJson(declared, locked)) {
      diagnose(
        diagnostics,
        BLD007_CODES.manifestLock,
        key,
        "The manifest and lock disagree; build and distribution stop.",
      );
    }
  }
  for (const key of ["name", "version", "license"]) {
    if (root[key] !== packageJson[key]) {
      diagnose(
        diagnostics,
        BLD007_CODES.manifestLock,
        key,
        "The manifest and root lock metadata disagree; build and distribution stop.",
      );
    }
  }
  if (
    packageJson.packageManager !== `npm@${BLD007_POLICY.npmVersion}` ||
    packageJson.engines?.node !== BLD007_POLICY.nodeVersion.slice(1) ||
    packageJson.engines?.npm !== BLD007_POLICY.npmVersion
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.toolchainDrift,
      "package-toolchain",
      "The manifest no longer requires the admitted Node/npm toolchain; build and distribution stop.",
    );
  }
}

function validateWorkspaceTopology(lock, localCustody, diagnostics) {
  const locked = Object.entries(lock.packages ?? {})
    .filter(([key]) => normalizePath(key).startsWith("packages/"))
    .sort(([left], [right]) => left.localeCompare(right));
  const observed = [...(localCustody.workspaceManifests ?? [])].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  if (locked.length !== observed.length) {
    diagnose(
      diagnostics,
      BLD007_CODES.workspaceDrift,
      "workspace-count",
      "Workspace topology drifted; build and distribution stop.",
    );
  }
  for (const [packagePath, lockEntry] of locked) {
    const manifest = observed.find((entry) => entry.path === normalizePath(packagePath));
    if (!manifest) {
      diagnose(
        diagnostics,
        BLD007_CODES.workspaceDrift,
        normalizePath(packagePath),
        "A locked workspace manifest is missing; build and distribution stop.",
      );
      continue;
    }
    for (const key of [
      "name",
      "version",
      "license",
      "dependencies",
      "devDependencies",
      "optionalDependencies",
    ]) {
      if (!sameJson(manifest[key] ?? {}, lockEntry[key] ?? {})) {
        diagnose(
          diagnostics,
          BLD007_CODES.workspaceDrift,
          `${manifest.path}:${key}`,
          "Workspace manifest and lock metadata disagree; build and distribution stop.",
        );
      }
    }
    if (manifest.linkTargetValid !== true) {
      diagnose(
        diagnostics,
        BLD007_CODES.workspaceDrift,
        `${manifest.path}:workspace-link`,
        "The installed owned-workspace link is absent or resolves elsewhere; build and distribution stop.",
      );
    }
  }
}

function workspaceTopologySnapshot(lock) {
  return Object.entries(lock.packages ?? {})
    .filter(([key]) => normalizePath(key).startsWith("packages/"))
    .map(([key, entry]) => ({
      path: normalizePath(key),
      identity: `${entry.name}@${entry.version}`,
      dependencies: Object.fromEntries(
        Object.entries(entry.dependencies ?? {}).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      devDependencies: Object.fromEntries(
        Object.entries(entry.devDependencies ?? {}).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      optionalDependencies: Object.fromEntries(
        Object.entries(entry.optionalDependencies ?? {}).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function validateTopologyApproval(input, lockDigest, diagnostics) {
  const approval = input.topologyApproval;
  if (
    approval?.schema !== "rsrender.bld007.workspace-topology-approvals.v0" ||
    approval?.externalIdentityBaselineCount !== BLD007_POLICY.productionIdentityCount
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.workspaceDrift,
      "topology-approval-schema",
      "The workspace topology approval record is missing or invalid; build and distribution stop.",
    );
    return;
  }
  if (
    approval.accountableHumanApproval?.statement !== "i approve the topology" ||
    approval.accountableHumanApproval?.externalGraphAuthority !==
      "none; the BLD-001 exact 156-identity external graph remains fail-closed"
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.workspaceDrift,
      "topology-human-authority",
      "The bounded accountable-human topology approval is absent or broadened; build and distribution stop.",
    );
  }
  if (
    approval.currentLockSha256 !== lockDigest ||
    !sameJson(approval.workspacePackages, workspaceTopologySnapshot(input.lock))
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.workspaceDrift,
      "unrecorded-workspace-topology",
      "The raw lock or owned workspace edges differ from the reviewed topology approval; build and distribution stop.",
    );
  }
  const last = approval.approvals?.at(-1);
  if (
    !last ||
    last.status !== "CLOSED" ||
    last.lockSha256 !== lockDigest ||
    typeof last.ticket !== "string" ||
    typeof last.evidence !== "string"
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.workspaceDrift,
      "topology-approval-authority",
      "The current topology lacks a closed build-ticket evidence reference; build and distribution stop.",
    );
  }
  for (const entry of approval.approvals ?? []) {
    if (!sameJson(entry.externalDelta, { added: 0, removed: 0, changed: 0 })) {
      diagnose(
        diagnostics,
        BLD007_CODES.workspaceDrift,
        `${entry.ticket}:external-delta`,
        "A workspace approval attempts to change the external graph; build and distribution stop.",
      );
    }
    if (
      entry.status === "CLOSED" &&
      input.topologyEvidenceDigests?.[entry.evidence] !== entry.evidenceSha256
    ) {
      diagnose(
        diagnostics,
        BLD007_CODES.workspaceDrift,
        `${entry.ticket}:evidence`,
        "A closed topology approval evidence file is missing or changed; build and distribution stop.",
      );
    }
  }
}

function validateToolchainCustody(localCustody, diagnostics) {
  const observed = new Map((localCustody.toolchain ?? []).map((entry) => [entry.id, entry]));
  for (const [id, expected] of Object.entries(EXPECTED_TOOLCHAIN)) {
    const entry = observed.get(id);
    if (!entry || entry.sha256 !== `sha256:${expected}`) {
      diagnose(
        diagnostics,
        BLD007_CODES.toolchainDrift,
        id,
        "An exact admitted runtime, archive, or native tool byte is absent or changed; build and distribution stop.",
      );
    }
  }
  if ((localCustody.nativeBinaries ?? []).length === 0) {
    diagnose(
      diagnostics,
      BLD007_CODES.toolchainDrift,
      "native-binary-inventory",
      "The native/runtime binary inventory is empty; build and distribution stop.",
    );
  }
  if (localCustody.npmDistributionVersion !== BLD007_POLICY.npmVersion) {
    diagnose(
      diagnostics,
      BLD007_CODES.toolchainDrift,
      "npm-distribution-version",
      "The retained npm distribution version drifted; build and distribution stop.",
    );
  }
}

function collectObservedPackages(lock, diagnostics) {
  const observed = new Map();
  const root = lock.packages?.[""] ?? {};
  const directNames = new Set([
    ...Object.keys(root.dependencies ?? {}),
    ...Object.keys(root.devDependencies ?? {}),
    ...Object.keys(root.optionalDependencies ?? {}),
  ]);

  for (const [rawPath, entry] of Object.entries(lock.packages ?? {})) {
    const packagePath = normalizePath(rawPath);
    if (!packagePath.startsWith("node_modules/") || entry.link) continue;
    if (typeof entry.version !== "string" || entry.version.length === 0) continue;
    const identity = identityFromLockPath(packagePath, entry.version);
    const current = observed.get(identity) ?? {
      identity,
      name: packageNameFromIdentity(identity),
      version: entry.version,
      paths: [],
      entries: [],
    };
    current.paths.push(packagePath);
    current.entries.push(entry);
    observed.set(identity, current);
  }

  for (const current of observed.values()) {
    current.paths.sort((left, right) => left.localeCompare(right));
    current.direct =
      directNames.has(current.name) && current.paths.includes(`node_modules/${current.name}`);
    current.dev = current.entries.every((entry) => Boolean(entry.dev));
    current.optional = current.entries.every((entry) => Boolean(entry.optional));
    current.hasInstallScript = current.entries.some((entry) => Boolean(entry.hasInstallScript));
    current.resolved = current.entries[0]?.resolved ?? null;
    current.integrity = current.entries[0]?.integrity ?? null;
    if (
      current.entries.some(
        (entry) => entry.resolved !== current.resolved || entry.integrity !== current.integrity,
      )
    ) {
      diagnose(
        diagnostics,
        BLD007_CODES.integrityDrift,
        current.identity,
        "One identity resolves to inconsistent sources or hashes; build and distribution stop.",
      );
    }
  }
  return observed;
}

function validateLicense(entry, diagnostics) {
  const license = entry.license;
  if (typeof license !== "string" || license.trim().length === 0) {
    diagnose(
      diagnostics,
      BLD007_CODES.licenseMissing,
      entry.identity,
      "The admitted artifact has no license declaration; build and distribution stop.",
    );
    return;
  }
  if (BLD007_POLICY.prohibitedLicensePattern.test(license)) {
    diagnose(
      diagnostics,
      BLD007_CODES.licenseProhibited,
      entry.identity,
      "A prohibited license classification entered the graph; build and distribution stop.",
    );
  } else if (!BLD007_POLICY.admittedLicenses.includes(license)) {
    diagnose(
      diagnostics,
      BLD007_CODES.licenseUnknown,
      entry.identity,
      "The license is outside the exact BLD-001 admitted set; build and distribution stop.",
    );
  }
  if (typeof entry.noticeObligation !== "string" || entry.noticeObligation.trim().length === 0) {
    diagnose(
      diagnostics,
      BLD007_CODES.noticeMissing,
      entry.identity,
      "The admitted notice obligation is absent; build and distribution stop.",
    );
  }
}

function hasCompleteProvenance(entry) {
  return (
    typeof entry.resolved === "string" &&
    entry.resolved.length > 0 &&
    typeof entry.integrity === "string" &&
    entry.integrity.length > 0 &&
    entry.registryTarball === entry.resolved &&
    entry.registryIntegrity === entry.integrity &&
    Array.isArray(entry.registrySignatures) &&
    entry.registrySignatures.length > 0 &&
    entry.registrySignatures.every(
      (signature) =>
        typeof signature?.sig === "string" &&
        signature.sig.length > 0 &&
        typeof signature?.keyid === "string" &&
        signature.keyid.length > 0,
    )
  );
}

function validateAuthority(admission, diagnostics) {
  if (admission.admissionState !== BLD007_POLICY.admissionState) {
    diagnose(
      diagnostics,
      BLD007_CODES.admissionMismatch,
      "admission-state",
      "Automation cannot create or revive an admission; build and distribution stop.",
    );
  }
  if (
    admission.authority?.entity !== "Central Engineering Services" ||
    !sameJson(admission.authority?.scope ?? [], BLD007_POLICY.admittedScope) ||
    admission.candidateLockSha256 !== BLD007_POLICY.candidateLockSha256
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.authorityScope,
      "authority",
      "The accountable internal-only authority record drifted; build and distribution stop.",
    );
  }
  if (
    admission.noticePolicy?.continuousEnforcementOwner !== "BLD-007" ||
    admission.productionIdentityCount !== BLD007_POLICY.productionIdentityCount ||
    admission.packages?.length !== BLD007_POLICY.productionIdentityCount
  ) {
    diagnose(
      diagnostics,
      BLD007_CODES.admissionCount,
      "admission-inventory",
      "The approved identity or enforcement-owner record drifted; build and distribution stop.",
    );
  }
}

function validateDependencies(admission, observed, localCustody, diagnostics) {
  const admitted = new Map();
  for (const entry of admission.packages ?? []) {
    if (admitted.has(entry.identity)) {
      diagnose(
        diagnostics,
        BLD007_CODES.admissionCount,
        entry.identity,
        "The admission contains a duplicate identity; build and distribution stop.",
      );
      continue;
    }
    admitted.set(entry.identity, entry);
    validateLicense(entry, diagnostics);
    if (entry.admission !== BLD007_POLICY.admissionState || !hasCompleteProvenance(entry)) {
      diagnose(
        diagnostics,
        BLD007_CODES.provenanceMissing,
        entry.identity,
        "The exact artifact lacks its prior admission or source/hash provenance; build and distribution stop.",
      );
    }
  }

  for (const identity of observed.keys()) {
    if (!admitted.has(identity)) {
      diagnose(
        diagnostics,
        BLD007_CODES.dependencyUnexpected,
        identity,
        "An unapproved exact dependency entered the lock; build and distribution stop.",
      );
    }
  }

  for (const [identity, approved] of admitted) {
    const current = observed.get(identity);
    for (const approvedPath of approved.paths ?? []) {
      const normalizedApprovedPath = normalizePath(approvedPath);
      const lockEntry = localCustody.lock.packages?.[normalizedApprovedPath];
      if (!lockEntry || lockEntry.version !== approved.version) {
        diagnose(
          diagnostics,
          BLD007_CODES.versionDrift,
          normalizedApprovedPath,
          "An admitted path changed version or disappeared; build and distribution stop.",
        );
      } else {
        if (lockEntry.integrity !== approved.integrity) {
          diagnose(
            diagnostics,
            BLD007_CODES.integrityDrift,
            normalizedApprovedPath,
            "An admitted artifact hash changed; build and distribution stop.",
          );
        }
        if (lockEntry.resolved !== approved.resolved) {
          diagnose(
            diagnostics,
            BLD007_CODES.sourceDrift,
            normalizedApprovedPath,
            "An admitted artifact source changed; build and distribution stop.",
          );
        }
      }
    }
    if (!current) {
      diagnose(
        diagnostics,
        BLD007_CODES.dependencyMissing,
        identity,
        "An admitted dependency disappeared from the exact graph; build and distribution stop.",
      );
      continue;
    }
    if (!sameJson(current.paths, [...(approved.paths ?? [])].map(normalizePath).sort())) {
      diagnose(
        diagnostics,
        BLD007_CODES.dependencyPath,
        identity,
        "The exact package placement graph changed; build and distribution stop.",
      );
    }
    for (const key of ["direct", "dev", "optional", "hasInstallScript"]) {
      if (current[key] !== Boolean(approved[key])) {
        diagnose(
          diagnostics,
          BLD007_CODES.dependencyFlags,
          `${identity}:${key}`,
          "The admitted package relationship or lifecycle surface changed; build and distribution stop.",
        );
      }
    }
  }

  for (const entry of localCustody.packages ?? []) {
    if (entry.installationState === "required-missing") {
      diagnose(
        diagnostics,
        BLD007_CODES.installedMissing,
        entry.identity,
        "A nonoptional admitted package is not installed; qualifying enforcement stops.",
      );
    }
    for (const installed of entry.installedPaths ?? []) {
      const delimiter = entry.identity.lastIndexOf("@");
      const expectedName = entry.identity.slice(0, delimiter);
      const expectedVersion = entry.identity.slice(delimiter + 1);
      if (
        installed.manifestName !== expectedName ||
        installed.manifestVersion !== expectedVersion
      ) {
        diagnose(
          diagnostics,
          BLD007_CODES.versionDrift,
          entry.identity,
          "The installed package identity differs from the exact lock identity; build and distribution stop.",
        );
      }
      if (installed.manifestLicense !== entry.license) {
        diagnose(
          diagnostics,
          BLD007_CODES.licenseDrift,
          entry.identity,
          "The installed manifest license differs from the admitted declaration; build and distribution stop.",
        );
      }
      if (entry.identity === "esbuild@0.28.1") {
        if (installed.installLifecycleScripts?.postinstall !== "node install.js") {
          diagnose(
            diagnostics,
            BLD007_CODES.lifecycleDrift,
            entry.identity,
            "The one admitted install lifecycle command drifted; build and distribution stop.",
          );
        }
      } else if (Object.keys(installed.installLifecycleScripts ?? {}).length > 0) {
        diagnose(
          diagnostics,
          BLD007_CODES.lifecycleDrift,
          entry.identity,
          "An unapproved install lifecycle command entered the installed graph; build and distribution stop.",
        );
      }
      const noticeFiles = installed.noticeFiles ?? [];
      if (noticeFiles.length === 0) {
        diagnose(
          diagnostics,
          BLD007_CODES.noticeTextMissing,
          entry.identity,
          "No exact retained or explicitly authorized internal-custody license text exists; build and distribution stop.",
        );
      }
    }
  }
  const runtimePaths = new Set((localCustody.runtimeNotices ?? []).map((entry) => entry.path));
  for (const expected of RUNTIME_NOTICE_FILES) {
    if (!runtimePaths.has(expected)) {
      diagnose(
        diagnostics,
        BLD007_CODES.noticeTextMissing,
        expected,
        "A packaged-runtime notice is absent; build and distribution stop.",
      );
    }
  }
}

function resolveDependencyPath(lockPackages, fromPackagePath, dependencyName) {
  let current = fromPackagePath;
  while (true) {
    const candidate = current
      ? `${current}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (Object.hasOwn(lockPackages, candidate)) return candidate;
    if (current === "") return null;
    const nestedIndex = current.lastIndexOf("/node_modules/");
    current = nestedIndex >= 0 ? current.slice(0, nestedIndex) : "";
  }
}

function identityForPackagePath(lockPackages, packagePath) {
  if (packagePath === "") return "rsrender@0.0.0";
  const entry = lockPackages[packagePath];
  if (!entry) return null;
  if (entry.link) {
    const targetPath = normalizePath(entry.resolved ?? "");
    const target = lockPackages[targetPath];
    return target?.name && target?.version ? `${target.name}@${target.version}` : null;
  }
  if (packagePath.startsWith("packages/")) {
    return entry.name && entry.version ? `${entry.name}@${entry.version}` : null;
  }
  return entry.version ? identityFromLockPath(packagePath, entry.version) : null;
}

function buildDependencyEdges(lock, diagnostics) {
  const edges = new Set();
  const entries = lock.packages ?? {};
  for (const [rawPath, entry] of Object.entries(entries)) {
    const packagePath = normalizePath(rawPath);
    const isExternal = packagePath.startsWith("node_modules/") && !entry.link;
    const isWorkspace = packagePath.startsWith("packages/");
    if (packagePath !== "" && !isExternal && !isWorkspace) continue;
    const fromIdentity = identityForPackagePath(entries, packagePath);
    if (!fromIdentity) {
      diagnose(
        diagnostics,
        BLD007_CODES.graphUnresolved,
        packagePath || "root-package",
        "A lock package has no stable graph identity; build and distribution stop.",
      );
      continue;
    }
    const dependencyNames = sortedUnique([
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
    ]);
    for (const dependencyName of dependencyNames) {
      const targetPath = resolveDependencyPath(entries, packagePath, dependencyName);
      if (!targetPath) {
        diagnose(
          diagnostics,
          BLD007_CODES.graphUnresolved,
          `${fromIdentity}->${dependencyName}`,
          "The exact lock dependency edge cannot be resolved; build and distribution stop.",
        );
        continue;
      }
      const targetIdentity = identityForPackagePath(entries, targetPath);
      if (!targetIdentity) {
        diagnose(
          diagnostics,
          BLD007_CODES.graphUnresolved,
          `${fromIdentity}->${dependencyName}`,
          "The exact lock dependency target has no stable identity; build and distribution stop.",
        );
        continue;
      }
      edges.add(`${fromIdentity}\u0000${targetIdentity}`);
    }
  }
  return [...edges]
    .map((edge) => {
      const [from, to] = edge.split("\u0000");
      return { from, to };
    })
    .sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
}

function integrityChecksum(integrity) {
  const match = /^sha512-([A-Za-z0-9+/=]+)$/u.exec(integrity ?? "");
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("hex");
}

function spdxId(identity) {
  return `SPDXRef-Package-${sha256(identity).slice(0, 20)}`;
}

function purl(name, version) {
  const encodedName = name.startsWith("@")
    ? `%40${name.slice(1).split("/").map(encodeURIComponent).join("/")}`
    : encodeURIComponent(name);
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

function buildSpdx(admission, edges, lock, lockDigest) {
  const externalPackages = [...admission.packages]
    .sort((left, right) => left.identity.localeCompare(right.identity))
    .map((entry) => {
      const checksum = integrityChecksum(entry.integrity);
      return {
        SPDXID: spdxId(entry.identity),
        name: entry.name,
        versionInfo: entry.version,
        downloadLocation: entry.resolved,
        filesAnalyzed: false,
        checksums: checksum ? [{ algorithm: "SHA512", checksumValue: checksum }] : [],
        licenseConcluded: "NOASSERTION",
        licenseDeclared: entry.license,
        copyrightText: "NOASSERTION",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceType: "purl",
            referenceLocator: purl(entry.name, entry.version),
          },
        ],
        comment:
          "Exact BLD-001 internal-use admission; automation records but does not grant legal approval.",
      };
    });
  const workspacePackages = Object.entries(lock.packages ?? {})
    .filter(([packagePath]) => normalizePath(packagePath).startsWith("packages/"))
    .map(([packagePath, entry]) => ({
      SPDXID: spdxId(`${entry.name}@${entry.version}`),
      name: entry.name,
      versionInfo: entry.version,
      downloadLocation: "NOASSERTION",
      filesAnalyzed: false,
      licenseConcluded: "NOASSERTION",
      licenseDeclared: "MIT",
      copyrightText: "NOASSERTION",
      comment: `Owned workspace package at ${normalizePath(packagePath)}; not a third-party admission record.`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const rootId = "SPDXRef-Package-RSrender";
  const rootPackage = {
    SPDXID: rootId,
    name: "rsrender",
    versionInfo: "0.0.0",
    downloadLocation: "NOASSERTION",
    filesAnalyzed: false,
    licenseConcluded: "NOASSERTION",
    licenseDeclared: "MIT",
    copyrightText: "NOASSERTION",
    comment: "Owned application workspace; not a third-party admission record.",
  };
  const relationshipIds = new Set(
    [...workspacePackages, ...externalPackages].map((entry) => entry.SPDXID),
  );
  const relationships = [
    {
      spdxElementId: "SPDXRef-DOCUMENT",
      relationshipType: "DESCRIBES",
      relatedSpdxElement: rootId,
    },
    ...workspacePackages.map((entry) => ({
      spdxElementId: rootId,
      relationshipType: "CONTAINS",
      relatedSpdxElement: entry.SPDXID,
    })),
    ...edges
      .filter(
        ({ from, to }) =>
          (from === "rsrender@0.0.0" || relationshipIds.has(spdxId(from))) &&
          relationshipIds.has(spdxId(to)),
      )
      .map(({ from, to }) => ({
        spdxElementId: from === "rsrender@0.0.0" ? rootId : spdxId(from),
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: spdxId(to),
      })),
  ].sort(
    (left, right) =>
      left.spdxElementId.localeCompare(right.spdxElementId) ||
      left.relatedSpdxElement.localeCompare(right.relatedSpdxElement),
  );
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: "RSrender-BLD-007-exact-internal-dependency-snapshot",
    documentNamespace: `https://rsrender.invalid/spdx/bld-007/${lockDigest}`,
    creationInfo: {
      created: "2026-08-14T00:00:00Z",
      creators: ["Tool: RSrender-BLD-007"],
      comment:
        "Deterministic snapshot keyed to the BLD-001 decision date and exact production lock.",
    },
    packages: [rootPackage, ...workspacePackages, ...externalPackages],
    relationships,
  };
}

function buildCustodyInventory(admission, localCustody, edges, inputDigests) {
  const localByIdentity = new Map(
    (localCustody.packages ?? []).map((entry) => [entry.identity, entry]),
  );
  return {
    schema: "rsrender.bld007.dependency-custody.v0",
    admission: BLD007_POLICY.admissionState,
    scope: [...BLD007_POLICY.admittedScope],
    nonScope: ["public publication", "external distribution", "sale", "transfer"],
    toolchain: admission.toolchain,
    exactToolchainCustody: localCustody.toolchain ?? [],
    npmDistributionVersion: localCustody.npmDistributionVersion ?? null,
    toolchainTrees: localCustody.toolchainTrees ?? [],
    nativeBinaries: localCustody.nativeBinaries ?? [],
    inputDigests,
    topologyAuthority: BLD007_POLICY.implementationTopologyAuthority,
    counts: {
      admittedIdentities: admission.packages.length,
      workspacePackageCount: Object.keys(localCustody.lock.packages ?? {}).filter((packagePath) =>
        normalizePath(packagePath).startsWith("packages/"),
      ).length,
      dependencyEdges: edges.length,
      locallyPresentIdentities: [...localByIdentity.values()].filter(
        (entry) => entry.installationState === "present",
      ).length,
      platformOptionalAbsentIdentities: [...localByIdentity.values()].filter(
        (entry) => entry.installationState === "platform-optional-absent",
      ).length,
    },
    packages: [...admission.packages]
      .sort((left, right) => left.identity.localeCompare(right.identity))
      .map((entry) => {
        const local = localByIdentity.get(entry.identity) ?? {
          installationState: "unobserved",
          installedPaths: [],
        };
        return {
          identity: entry.identity,
          paths: [...entry.paths].map(normalizePath).sort(),
          relationship: {
            direct: entry.direct,
            dev: entry.dev,
            optional: entry.optional,
            hasInstallScript: entry.hasInstallScript,
          },
          source: {
            resolved: entry.resolved,
            integrity: entry.integrity,
            repository: entry.repository,
            registryTarball: entry.registryTarball,
            registryIntegrity: entry.registryIntegrity,
            signatureKeyIds: sortedUnique(entry.registrySignatures.map((value) => value.keyid)),
            signatureDigests: entry.registrySignatures
              .map((value) => `sha256:${sha256(value.sig)}`)
              .sort(),
            attestation: entry.registryAttestations,
          },
          license: {
            declared: entry.license,
            concluded: "NOASSERTION",
            noticeObligation: entry.noticeObligation,
          },
          admission: entry.admission,
          installationState: local.installationState,
          installedPaths: (local.installedPaths ?? []).map((installed) => ({
            path: installed.path,
            manifestSha256: installed.manifestSha256,
            manifestName: installed.manifestName,
            manifestVersion: installed.manifestVersion,
            manifestLicense: installed.manifestLicense,
            installLifecycleScripts: installed.installLifecycleScripts,
            noticeFiles: installed.noticeFiles.map(
              ({
                path: noticePath,
                bytes,
                sha256,
                custodyMode,
                sourceIdentity,
                bindingMetadata,
              }) => ({
                path: noticePath,
                bytes,
                sha256,
                custodyMode: custodyMode ?? "exact-installed-package-file",
                sourceIdentity: sourceIdentity ?? null,
                bindingMetadata: bindingMetadata ?? null,
              }),
            ),
          })),
        };
      }),
    workspacePackages: Object.entries(localCustody.lock.packages ?? {})
      .filter(([packagePath]) => normalizePath(packagePath).startsWith("packages/"))
      .map(([packagePath, entry]) => ({
        identity: `${entry.name}@${entry.version}`,
        path: normalizePath(packagePath),
        dependencies: Object.fromEntries(
          Object.entries(entry.dependencies ?? {}).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    graph: edges,
    runtimeNotices: (localCustody.runtimeNotices ?? []).map(
      ({ path: noticePath, bytes, sha256 }) => ({ path: noticePath, bytes, sha256 }),
    ),
    nonclaims: [
      "This inventory enforces the prior internal-only admission; it does not create an admission or legal exception.",
      "License declarations and notice custody do not constitute release, redistribution, sale, or transfer approval.",
      "Absent platform-optional package text is represented explicitly and is not silently described as locally installed.",
    ],
  };
}

function buildAssetInventory(assetPaths) {
  return {
    schema: "rsrender.bld007.asset-inventory.v0",
    admissionBasis: "BLD-001 admitted no production asset, font, fixture, hatch, picture, or icon",
    scanBoundary: {
      sourceRoot: "packages",
      rootAssetDirectories: [...ROOT_ASSET_DIRECTORIES],
      extensions: [...BLD007_POLICY.assetExtensions],
      discovery:
        "git tracked plus nonignored untracked files; package output included; symlinks fail closed",
      exclusions: [
        "docs/**",
        "tests/**",
        "artifacts/**",
        ".wayfinder-tmp/**",
        "ignored go-by references",
      ],
    },
    assets: [...assetPaths].sort((left, right) => left.localeCompare(right)),
    expectedCount: 0,
  };
}

export function buildNoticeBundle(admission, localCustody) {
  const localByIdentity = new Map(
    (localCustody.packages ?? []).map((entry) => [entry.identity, entry]),
  );
  const sections = [
    "RSrender BLD-007 third-party notice custody",
    "",
    "Scope: exact BLD-001 graph admitted for internal development, testing, deployment, and internal Windows binaries only.",
    "This generated bundle records prior declarations and retained text; it does not grant rights or approve external distribution.",
  ];
  for (const entry of [...admission.packages].sort((left, right) =>
    left.identity.localeCompare(right.identity),
  )) {
    const local = localByIdentity.get(entry.identity);
    sections.push(
      "",
      "================================================================================",
      `PACKAGE: ${entry.identity}`,
      `DECLARED LICENSE: ${entry.license}`,
      `SOURCE: ${entry.resolved}`,
      `NOTICE OBLIGATION: ${entry.noticeObligation}`,
      `LOCAL CUSTODY: ${local?.installationState ?? "unobserved"}`,
    );
    const files = (local?.installedPaths ?? []).flatMap((installed) => installed.noticeFiles ?? []);
    if (files.length === 0) {
      sections.push(
        "LICENSE/NOTICE TEXT: no standalone local text in this qualified installation; exact declaration and obligation retained above.",
      );
    } else {
      for (const file of files.sort((left, right) => left.path.localeCompare(right.path))) {
        sections.push(
          "",
          `--- ${file.path} (${file.sha256}) ---`,
          `CUSTODY MODE: ${file.custodyMode ?? "exact-installed-package-file"}`,
          ...(file.sourceIdentity ? [`SOURCE IDENTITY: ${file.sourceIdentity}`] : []),
          file.text,
        );
      }
    }
  }
  for (const runtime of localCustody.runtimeNotices ?? []) {
    sections.push(
      "",
      "================================================================================",
      `PACKAGED RUNTIME NOTICE: ${runtime.path} (${runtime.sha256})`,
      `EXACT RETAINED BYTES: ${runtime.bytes}`,
      "The packaged Electron runtime retains this exact notice file beside the executable; the generated bundle records its path and digest without duplicating the multi-megabyte runtime text.",
    );
  }
  return `${sections.join("\n").replaceAll("\r\n", "\n")}\n`;
}

export function enforceDependencyPolicy(input) {
  const diagnostics = new Map();
  const lockDigest = sha256(input.lockBytes);
  const admissionDigest = sha256(input.admissionBytes);
  const authorityDigest = sha256(input.authorityPacketBytes);
  const foundationDigest = sha256(input.foundationEvidenceBytes);
  if (input.runtimeNodeVersion !== BLD007_POLICY.nodeVersion) {
    diagnose(
      diagnostics,
      BLD007_CODES.nodeVersion,
      "node-runtime",
      "The qualifying enforcement runtime is not the admitted Node version; build and distribution stop.",
    );
  }
  if (input.runtimeNpmVersion !== null && input.runtimeNpmVersion !== BLD007_POLICY.npmVersion) {
    diagnose(
      diagnostics,
      BLD007_CODES.toolchainDrift,
      "npm-runtime",
      "The qualifying enforcement runtime is not the admitted npm version; build and distribution stop.",
    );
  }
  validateTopologyApproval(input, lockDigest, diagnostics);
  if (admissionDigest !== BLD007_POLICY.admissionSha256) {
    diagnose(
      diagnostics,
      BLD007_CODES.admissionDigest,
      "bld-001-internal-dependency-admission.json",
      "The approved admission record drifted; automation cannot approve the replacement.",
    );
  }
  if (authorityDigest !== BLD007_POLICY.authorityPacketSha256) {
    diagnose(
      diagnostics,
      BLD007_CODES.authorityDigest,
      "bld-001-authority-approval-packet.md",
      "The accountable policy record drifted; automation cannot approve the replacement.",
    );
  }
  if (foundationDigest !== BLD007_POLICY.foundationEvidenceSha256) {
    diagnose(
      diagnostics,
      BLD007_CODES.foundationDigest,
      "bld-001-foundation-verification.md",
      "The exact BLD-001 production-lock evidence drifted; build and distribution stop.",
    );
  }
  validateManifestLock(input.packageJson, input.lock, diagnostics);
  validateWorkspaceTopology(input.lock, input.localCustody, diagnostics);
  validateToolchainCustody(input.localCustody, diagnostics);
  validateAuthority(input.admission, diagnostics);
  const observed = collectObservedPackages(input.lock, diagnostics);
  validateDependencies(input.admission, observed, input.localCustody, diagnostics);
  const edges = buildDependencyEdges(input.lock, diagnostics);
  for (const assetPath of input.assetPaths ?? []) {
    diagnose(
      diagnostics,
      BLD007_CODES.undeclaredAsset,
      assetPath,
      "BLD-001 admitted an empty production asset inventory; build and distribution stop.",
    );
  }
  const inputDigests = {
    bld001ProductionLockSha256: BLD007_POLICY.bld001ProductionLockSha256,
    implementationTopologyLockSha256: lockDigest,
    admissionSha256: admissionDigest,
    authorityPacketSha256: authorityDigest,
    foundationEvidenceSha256: foundationDigest,
  };
  const spdx = buildSpdx(input.admission, edges, input.lock, lockDigest);
  const custody = buildCustodyInventory(input.admission, input.localCustody, edges, inputDigests);
  const assets = buildAssetInventory(input.assetPaths ?? []);
  const notices = buildNoticeBundle(input.admission, input.localCustody);
  const artifacts = {
    spdx: prettyJson(spdx),
    custody: prettyJson(custody),
    assets: prettyJson(assets),
    notices,
  };
  const artifactDigests = Object.fromEntries(
    Object.entries(artifacts).map(([name, bytes]) => [name, `sha256:${sha256(bytes)}`]),
  );
  for (const [name, bytes] of Object.entries(artifacts)) {
    if (
      /(?:^|["'\s])[A-Za-z]:[\\/]/u.test(bytes) ||
      /(?:authorization\s*:|bearer\s+[A-Za-z0-9._-]+|api[_-]?key\s*[:=])/iu.test(bytes)
    ) {
      diagnose(
        diagnostics,
        BLD007_CODES.privacyDrift,
        name,
        "Generated evidence contains prohibited host-path or credential-shaped content; evidence publication stops.",
      );
    }
  }
  for (const name of ["spdx", "custody", "assets", "notices"]) {
    const expectedDigest = input.topologyApproval?.expectedArtifactDigests?.[name];
    if (artifactDigests[name] !== expectedDigest) {
      diagnose(
        diagnostics,
        BLD007_CODES.inventoryDrift,
        name,
        "A deterministic SBOM, source/hash, license/notice, or asset inventory drifted from the BLD-007 baseline; build and distribution stop.",
      );
    }
  }
  const resultDiagnostics = sortedDiagnostics(diagnostics);
  return {
    result: resultDiagnostics.length === 0 ? "PASS" : "FAIL",
    diagnostics: resultDiagnostics,
    inventories: { spdx, custody, assets, notices },
    artifacts,
    artifactDigests,
  };
}

export async function scanProductionAssets(root) {
  const extensionSet = new Set(BLD007_POLICY.assetExtensions);
  const listed = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (listed.status !== 0 || listed.error) return ["BLD007_SANITIZED_GIT_ASSET_SCAN_FAILURE"];
  const trackedModes = spawnSync("git", ["ls-files", "-s", "-z"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  const symlinks = new Set();
  if (trackedModes.status === 0) {
    for (const record of trackedModes.stdout.split("\0").filter(Boolean)) {
      const match = /^(\d+) [0-9a-f]+ \d+\t(.+)$/u.exec(record);
      if (match?.[1] === "120000") symlinks.add(normalizePath(match[2]));
    }
  }
  const files = [];
  for (const raw of listed.stdout.split("\0").filter(Boolean)) {
    const relative = normalizePath(raw);
    const parts = relative.split("/");
    if (["docs", "tests", "artifacts", ".wayfinder-tmp", "node_modules"].includes(parts[0]))
      continue;
    const extensionAsset = extensionSet.has(path.extname(relative).toLowerCase());
    const inRootAssetDirectory = ROOT_ASSET_DIRECTORIES.includes(parts[0]);
    const inPackageAssetDirectory =
      parts[0] === "packages" &&
      parts.some((part) => ASSET_DIRECTORY_NAMES.has(part.toLowerCase()));
    const packageOutputAsset = parts[0] === "packages" && parts.includes("dist") && extensionAsset;
    const rootAsset = parts.length === 1 && extensionAsset;
    if (
      extensionAsset ||
      inRootAssetDirectory ||
      inPackageAssetDirectory ||
      packageOutputAsset ||
      rootAsset
    ) {
      let link = symlinks.has(relative);
      try {
        link ||= (await lstat(path.join(root, relative))).isSymbolicLink();
      } catch {
        link = true;
      }
      files.push(link ? `${relative}#symlink` : relative);
    }
  }
  return sortedUnique(files);
}

async function readNoticeFiles(root, packagePath) {
  const absolute = path.join(root, packagePath);
  const entries = await readdir(absolute, { withFileTypes: true });
  const noticeNames = entries
    .filter((entry) => entry.isFile() && NOTICE_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const notices = [];
  for (const name of noticeNames) {
    const bytes = await readFile(path.join(absolute, name));
    notices.push({
      path: normalizePath(path.join(packagePath, name)),
      bytes: bytes.length,
      sha256: `sha256:${sha256(bytes)}`,
      text: bytes.toString("utf8").replaceAll("\r\n", "\n").trimEnd(),
    });
  }
  return notices;
}

function safeAuthor(manifest) {
  const author = manifest.author;
  if (typeof author === "string") return author;
  if (author && typeof author.name === "string") return author.name;
  return "not provided by exact package manifest";
}

async function remediatedNoticeFiles(root, identity, packagePath, manifest, admission) {
  const remediation = INTERNAL_NOTICE_REMEDIATIONS[identity];
  if (!remediation) return [];
  if (remediation.sourceIdentity) {
    const source = admission.packages.find(
      (entry) => entry.identity === remediation.sourceIdentity,
    );
    if (!source) return [];
    const notices = await readNoticeFiles(root, normalizePath(source.paths[0]));
    return notices.map((notice) => ({
      ...notice,
      path: `${packagePath}/INTERNAL-CUSTODY-FROM-${remediation.sourceIdentity}/${path.basename(notice.path)}`,
      custodyMode: "exact-admitted-sibling-license-text",
      sourceIdentity: remediation.sourceIdentity,
    }));
  }
  if (remediation.readme) {
    try {
      const bytes = await readFile(path.join(root, packagePath, "README.md"));
      return [
        {
          path: `${packagePath}/README.md`,
          bytes: bytes.length,
          sha256: `sha256:${sha256(bytes)}`,
          text: bytes.toString("utf8").replaceAll("\r\n", "\n").trimEnd(),
          custodyMode: "exact-package-readme-license-text",
        },
      ];
    } catch {
      return [];
    }
  }
  const licenseText = CANONICAL_LICENSE_TEXT[remediation.license];
  if (!licenseText || manifest.license !== remediation.license) return [];
  const metadata = {
    identity,
    exactTarball: admission.packages.find((entry) => entry.identity === identity)?.resolved ?? null,
    exactIntegrity:
      admission.packages.find((entry) => entry.identity === identity)?.integrity ?? null,
    declaredLicense: manifest.license,
    author: safeAuthor(manifest),
    repository: manifest.repository ?? null,
  };
  const text = [
    "RSrender constructed internal-custody notice",
    `Exact package: ${identity}`,
    `Package-declared SPDX license: ${manifest.license}`,
    `Package author metadata: ${safeAuthor(manifest)}`,
    "The exact upstream package omitted a bundled full license file. This text was constructed under accountable internal-only custody authority from the package-declared SPDX classification and canonical SPDX license text.",
    "This is not upstream notice evidence and does not approve public or external distribution, sale, assignment, or transfer.",
    `Binding metadata SHA-256: ${sha256(canonicalJson(metadata))}`,
    "",
    licenseText,
  ].join("\n");
  return [
    {
      path: `${packagePath}/INTERNAL-CONSTRUCTED-${manifest.license}.txt`,
      bytes: Buffer.byteLength(text),
      sha256: `sha256:${sha256(text)}`,
      text,
      custodyMode: remediation.mode,
      bindingMetadata: metadata,
    },
  ];
}

async function findFileRecursive(directory, fileName) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const candidate = path.join(directory, entry.name);
      if (entry.isFile() && entry.name === fileName) return candidate;
      if (entry.isDirectory()) {
        const found = await findFileRecursive(candidate, fileName);
        if (found) return found;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function hashFileRecord(id, label, absolutePath) {
  try {
    const info = await lstat(absolutePath);
    if (!info.isFile() || info.isSymbolicLink())
      return { id, label, state: "missing-or-link", sha256: null, bytes: 0 };
    const bytes = await readFile(absolutePath);
    return { id, label, state: "present", sha256: `sha256:${sha256(bytes)}`, bytes: bytes.length };
  } catch {
    return { id, label, state: "missing", sha256: null, bytes: 0 };
  }
}

async function collectWorkspaceManifests(root, lock) {
  const records = [];
  let directories;
  try {
    directories = (await readdir(path.join(root, "packages"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [
      { path: "packages", inputFailure: BLD007_CODES.sanitizedFailure, linkTargetValid: false },
    ];
  }
  for (const directory of directories) {
    const packagePath = `packages/${directory}`;
    const entry = lock.packages?.[packagePath] ?? {};
    try {
      const manifest = JSON.parse(
        await readFile(path.join(root, packagePath, "package.json"), "utf8"),
      );
      const linkPath = path.join(root, "node_modules", ...entry.name.split("/"));
      let linkTargetValid = false;
      try {
        linkTargetValid =
          (await realpath(linkPath)).toLowerCase() ===
          (await realpath(path.join(root, packagePath))).toLowerCase();
      } catch {
        linkTargetValid = false;
      }
      records.push({
        path: packagePath,
        name: manifest.name,
        version: manifest.version,
        license: manifest.license,
        dependencies: manifest.dependencies ?? {},
        devDependencies: manifest.devDependencies ?? {},
        optionalDependencies: manifest.optionalDependencies ?? {},
        linkTargetValid,
      });
    } catch {
      records.push({
        path: packagePath,
        inputFailure: BLD007_CODES.sanitizedFailure,
        linkTargetValid: false,
      });
    }
  }
  return records;
}

async function collectToolchainCustody(root, admission) {
  const pinnedRoot = path.join(
    root,
    ".wayfinder-tmp",
    "admission-resolution",
    "toolchain",
    "node-v24.18.1-win-x64",
  );
  const electronCache = await findFileRecursive(
    path.join(process.env.LOCALAPPDATA ?? "", "electron", "Cache"),
    "electron-v43.4.0-win32-x64.zip",
  );
  const esbuildCachePath = path.join(
    process.env.LOCALAPPDATA ?? "",
    "npm-cache",
    "_cacache",
    "content-v2",
    "sha512",
    "1e",
    "b2",
    "6bbd9bf96b2c41ccf7f0a613a837393338822589fce4d0a26b18ad9cf11e3e2caa4cb6960b41e51d8e7c235affcb665907da569993ee30efca62f7d0f857",
  );
  const records = await Promise.all([
    hashFileRecord(
      "nodeArchive",
      "retained Node 24.18.1 official ZIP",
      path.join(root, ".wayfinder-tmp", "admission-resolution", "node-v24.18.1-win-x64.zip"),
    ),
    hashFileRecord("nodeExe", "pinned Node 24.18.1 executable", path.join(pinnedRoot, "node.exe")),
    hashFileRecord("nodeLicense", "pinned Node 24.18.1 license", path.join(pinnedRoot, "LICENSE")),
    hashFileRecord(
      "npmCli",
      "pinned npm 11.16.0 CLI",
      path.join(pinnedRoot, "node_modules", "npm", "bin", "npm-cli.js"),
    ),
    hashFileRecord(
      "npmLicense",
      "pinned npm 11.16.0 license",
      path.join(pinnedRoot, "node_modules", "npm", "LICENSE"),
    ),
    hashFileRecord(
      "electronArchive",
      "Electron 43.4.0 official ZIP cache",
      electronCache ?? "BLD007-MISSING",
    ),
    hashFileRecord(
      "electronExe",
      "installed Electron 43.4.0 executable",
      path.join(root, "node_modules", "electron", "dist", "electron.exe"),
    ),
    hashFileRecord(
      "electronPackage",
      "installed Electron 43.4.0 package source manifest",
      path.join(root, "node_modules", "electron", "package.json"),
    ),
    hashFileRecord("esbuildTarball", "exact npm-cache esbuild 0.28.1 tarball", esbuildCachePath),
    hashFileRecord(
      "esbuildExe",
      "installed esbuild 0.28.1 native executable",
      path.join(root, "node_modules", "@esbuild", "win32-x64", "esbuild.exe"),
    ),
  ]);
  for (const record of records) {
    const binding = TOOLCHAIN_BINDINGS[record.id];
    const admitted = binding?.admissionIdentity
      ? admission.packages.find((entry) => entry.identity === binding.admissionIdentity)
      : null;
    record.binding = {
      ...binding,
      admittedResolved: admitted?.resolved ?? null,
      admittedIntegrity: admitted?.integrity ?? null,
    };
  }
  const nativeBinaries = [];
  const nativeExtensions = new Set([".dll", ".exe", ".node", ".wasm"]);
  const visitNative = async (directory, relative) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const next = normalizePath(path.join(relative, entry.name));
      const info = await lstat(absolute);
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) await visitNative(absolute, next);
      else if (info.isFile() && nativeExtensions.has(path.extname(entry.name).toLowerCase())) {
        const record = await hashFileRecord(next, next, absolute);
        if (record.state === "present") nativeBinaries.push(record);
      }
    }
  };
  await visitNative(path.join(root, "node_modules"), "node_modules");
  nativeBinaries.sort((left, right) => left.label.localeCompare(right.label));
  let npmDistributionVersion;
  try {
    npmDistributionVersion =
      JSON.parse(
        await readFile(path.join(pinnedRoot, "node_modules", "npm", "package.json"), "utf8"),
      ).version ?? null;
  } catch {
    npmDistributionVersion = null;
  }
  return { records, nativeBinaries, npmDistributionVersion };
}

export async function collectLocalCustody(root, admission, lock) {
  const packages = [];
  for (const entry of [...admission.packages].sort((left, right) =>
    left.identity.localeCompare(right.identity),
  )) {
    const installedPaths = [];
    for (const packagePath of [...entry.paths].map(normalizePath).sort()) {
      const manifestPath = path.join(root, packagePath, "package.json");
      try {
        const manifestBytes = await readFile(manifestPath);
        const manifest = JSON.parse(manifestBytes.toString("utf8"));
        let noticeFiles = await readNoticeFiles(root, packagePath);
        if (noticeFiles.length === 0) {
          noticeFiles = await remediatedNoticeFiles(
            root,
            entry.identity,
            packagePath,
            manifest,
            admission,
          );
        }
        installedPaths.push({
          path: packagePath,
          manifestSha256: `sha256:${sha256(manifestBytes)}`,
          manifestName: manifest.name ?? null,
          manifestVersion: manifest.version ?? null,
          manifestLicense: manifest.license ?? null,
          installLifecycleScripts: Object.fromEntries(
            ["preinstall", "install", "postinstall"]
              .filter((name) => typeof manifest.scripts?.[name] === "string")
              .map((name) => [name, manifest.scripts[name]]),
          ),
          noticeFiles,
        });
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    packages.push({
      identity: entry.identity,
      license: entry.license,
      installationState:
        installedPaths.length > 0
          ? "present"
          : entry.optional
            ? "platform-optional-absent"
            : "required-missing",
      installedPaths,
    });
  }
  const runtimeNotices = [];
  for (const noticePath of RUNTIME_NOTICE_FILES) {
    try {
      const bytes = await readFile(path.join(root, noticePath));
      runtimeNotices.push({
        path: noticePath,
        bytes: bytes.length,
        sha256: `sha256:${sha256(bytes)}`,
        text: bytes.toString("utf8").replaceAll("\r\n", "\n").trimEnd(),
      });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const toolchain = await collectToolchainCustody(root, admission);
  return {
    lock,
    packages,
    runtimeNotices,
    toolchain: toolchain.records,
    npmDistributionVersion: toolchain.npmDistributionVersion,
    nativeBinaries: toolchain.nativeBinaries,
    workspaceManifests: await collectWorkspaceManifests(root, lock),
  };
}

export async function loadBld007Inputs(root, runtimeNodeVersion = process.version) {
  const [
    packageBytes,
    lockBytes,
    admissionBytes,
    authorityPacketBytes,
    foundationEvidenceBytes,
    topologyApprovalBytes,
  ] = await Promise.all([
    readFile(path.join(root, "package.json")),
    readFile(path.join(root, "package-lock.json")),
    readFile(path.join(root, "docs/governance/bld-001-internal-dependency-admission.json")),
    readFile(path.join(root, "docs/governance/bld-001-authority-approval-packet.md")),
    readFile(path.join(root, "docs/planning/evidence/bld-001-foundation-verification.md")),
    readFile(path.join(root, "docs/governance/bld-007-workspace-topology-approvals.json")),
  ]);
  const packageJson = JSON.parse(packageBytes.toString("utf8"));
  const lock = JSON.parse(lockBytes.toString("utf8"));
  const admission = JSON.parse(admissionBytes.toString("utf8"));
  const topologyApproval = JSON.parse(topologyApprovalBytes.toString("utf8"));
  const topologyEvidenceDigests = {};
  for (const approval of topologyApproval.approvals ?? []) {
    if (
      approval.status !== "CLOSED" ||
      !/^artifacts\/[A-Za-z0-9._-]+$/u.test(approval.evidence ?? "")
    )
      continue;
    try {
      topologyEvidenceDigests[approval.evidence] = sha256(
        await readFile(path.join(root, approval.evidence)),
      );
    } catch {
      topologyEvidenceDigests[approval.evidence] = null;
    }
  }
  return {
    packageBytes,
    packageJson,
    lockBytes,
    lock,
    admissionBytes,
    admission,
    authorityPacketBytes,
    foundationEvidenceBytes,
    topologyApprovalBytes,
    topologyApproval,
    topologyEvidenceDigests,
    runtimeNodeVersion,
    runtimeNpmVersion: /^npm\/([^\s]+)/u.exec(process.env.npm_config_user_agent ?? "")?.[1] ?? null,
    localCustody: await collectLocalCustody(root, admission, lock),
    assetPaths: await scanProductionAssets(root),
  };
}

export function cloneBld007Input(input) {
  return {
    ...input,
    packageBytes: Buffer.from(input.packageBytes),
    packageJson: globalThis.structuredClone(input.packageJson),
    lockBytes: Buffer.from(input.lockBytes),
    lock: globalThis.structuredClone(input.lock),
    admissionBytes: Buffer.from(input.admissionBytes),
    admission: globalThis.structuredClone(input.admission),
    authorityPacketBytes: Buffer.from(input.authorityPacketBytes),
    foundationEvidenceBytes: Buffer.from(input.foundationEvidenceBytes),
    topologyApprovalBytes: Buffer.from(input.topologyApprovalBytes),
    topologyApproval: globalThis.structuredClone(input.topologyApproval),
    topologyEvidenceDigests: globalThis.structuredClone(input.topologyEvidenceDigests),
    runtimeNpmVersion: input.runtimeNpmVersion,
    localCustody: globalThis.structuredClone(input.localCustody),
    assetPaths: [...input.assetPaths],
  };
}

function refreshLockBytes(input) {
  input.lockBytes = Buffer.from(prettyJson(input.lock), "utf8");
  input.localCustody.lock = input.lock;
}

function refreshAdmissionBytes(input) {
  input.admissionBytes = Buffer.from(prettyJson(input.admission), "utf8");
}

function firstAdmission(input) {
  return input.admission.packages[0];
}

export function applyBld007DriftFixture(cleanInput, fixtureId) {
  const input = cloneBld007Input(cleanInput);
  const first = firstAdmission(input);
  const firstPath = first.paths[0];
  switch (fixtureId) {
    case "new-package":
      input.lock.packages["node_modules/bld007-unapproved-fixture"] = {
        version: "1.0.0",
        resolved:
          "https://registry.npmjs.org/bld007-unapproved-fixture/-/bld007-unapproved-fixture-1.0.0.tgz",
        integrity: `sha512-${Buffer.alloc(64, 7).toString("base64")}`,
        dev: true,
      };
      refreshLockBytes(input);
      break;
    case "changed-version":
      input.lock.packages[firstPath].version = "999.0.0";
      refreshLockBytes(input);
      break;
    case "changed-integrity":
      input.lock.packages[firstPath].integrity = `sha512-${Buffer.alloc(64, 9).toString("base64")}`;
      refreshLockBytes(input);
      break;
    case "changed-source":
      input.lock.packages[firstPath].resolved =
        "https://example.invalid/bld007-source-drift-fixture.tgz";
      refreshLockBytes(input);
      break;
    case "lock-byte-drift":
      input.lockBytes = Buffer.concat([input.lockBytes, Buffer.from(" ", "utf8")]);
      break;
    case "missing-license":
      first.license = null;
      refreshAdmissionBytes(input);
      break;
    case "unknown-license":
      first.license = "LicenseRef-Unknown";
      refreshAdmissionBytes(input);
      break;
    case "prohibited-license":
      first.license = "GPL-3.0-only";
      refreshAdmissionBytes(input);
      break;
    case "missing-notice":
      first.noticeObligation = "";
      refreshAdmissionBytes(input);
      break;
    case "missing-local-notice": {
      const installed = input.localCustody.packages.find((entry) =>
        entry.installedPaths.some((value) => value.noticeFiles.length > 0),
      );
      installed.installedPaths.find((value) => value.noticeFiles.length > 0).noticeFiles = [];
      break;
    }
    case "missing-runtime-notice":
      input.localCustody.runtimeNotices = [];
      break;
    case "lifecycle-drift": {
      const esbuild = input.localCustody.packages.find(
        (entry) => entry.identity === "esbuild@0.28.1",
      );
      esbuild.installedPaths[0].installLifecycleScripts.postinstall = "node changed.js";
      break;
    }
    case "provenance-drift":
      first.registryTarball = "https://example.invalid/different.tgz";
      refreshAdmissionBytes(input);
      break;
    case "signature-drift":
      first.registrySignatures = [];
      refreshAdmissionBytes(input);
      break;
    case "workspace-edge-drift":
      input.lock.packages["packages/application"].dependencies["@rsrender/unapproved-workspace"] =
        "0.0.0";
      refreshLockBytes(input);
      break;
    case "workspace-manifest-drift":
      input.localCustody.workspaceManifests[0].name = "@rsrender/drifted";
      break;
    case "topology-evidence-drift":
      input.topologyEvidenceDigests[input.topologyApproval.approvals[0].evidence] = "0".repeat(64);
      break;
    case "toolchain-archive-missing":
      input.localCustody.toolchain.find((entry) => entry.id === "nodeArchive").sha256 = null;
      break;
    case "external-identity-count-drift":
      input.admission.packages.pop();
      refreshAdmissionBytes(input);
      break;
    case "npm-version-drift":
      input.runtimeNpmVersion = "0.0.0";
      break;
    case "artifact-baseline-drift": {
      const withNotice = input.localCustody.packages.find((entry) =>
        entry.installedPaths.some((installed) => installed.noticeFiles.length > 0),
      );
      withNotice.installedPaths[0].noticeFiles[0].text += "\nfixture drift";
      break;
    }
    case "toolchain-binary-drift":
      input.localCustody.toolchain.find((entry) => entry.id === "electronExe").sha256 =
        `sha256:${"0".repeat(64)}`;
      break;
    case "root-symlink-asset":
      input.assetPaths.push("fixture.pdf#symlink");
      break;
    case "package-output-asset":
      input.assetPaths.push("packages/renderer-ui/dist/unapproved-font.woff2");
      break;
    case "undeclared-asset":
      input.assetPaths.push("packages/renderer-ui/src/assets/bld007-undeclared.svg");
      break;
    case "admission-mismatch":
      input.admission.admissionState = "REVOKED";
      refreshAdmissionBytes(input);
      break;
    case "authority-drift":
      input.authorityPacketBytes = Buffer.concat([
        input.authorityPacketBytes,
        Buffer.from("\nBLD007 fixture drift\n", "utf8"),
      ]);
      break;
    case "node-version-drift":
      input.runtimeNodeVersion = "v0.0.0";
      break;
    default:
      throw new Error(`BLD007_UNKNOWN_DRIFT_FIXTURE:${fixtureId}`);
  }
  return input;
}
