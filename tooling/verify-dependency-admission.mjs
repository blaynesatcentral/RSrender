import { readFile } from "node:fs/promises";

function identityFromLockPath(packagePath, version) {
  const name = packagePath.replaceAll("\\", "/").split("node_modules/").at(-1);
  return `${name}@${version}`;
}

const [lock, baseline] = await Promise.all([
  readFile("package-lock.json", "utf8").then(JSON.parse),
  readFile("docs/governance/bld-001-internal-dependency-admission.json", "utf8").then(JSON.parse),
]);

if (baseline.admissionState !== "ADMITTED_INTERNAL_DEVELOPMENT_AND_TEST") {
  throw new Error("DEPENDENCY_BASELINE_NOT_ADMITTED_FOR_INTERNAL_DEVELOPMENT");
}

const admittedByIdentity = new Map(baseline.packages.map((entry) => [entry.identity, entry]));
const observed = new Map();

for (const [packagePath, entry] of Object.entries(lock.packages)) {
  if (!packagePath.startsWith("node_modules/") || entry.link) continue;
  const identity = identityFromLockPath(packagePath, entry.version);
  const prior = observed.get(identity);
  if (prior && (prior.integrity !== entry.integrity || prior.resolved !== entry.resolved)) {
    throw new Error(`DEPENDENCY_IDENTITY_COLLISION:${identity}`);
  }
  observed.set(identity, { integrity: entry.integrity, resolved: entry.resolved });
}

const unexpected = [...observed.keys()].filter((identity) => !admittedByIdentity.has(identity));
const missing = [...admittedByIdentity.keys()].filter((identity) => !observed.has(identity));
const mismatched = [...observed.entries()]
  .filter(([identity, entry]) => {
    const admitted = admittedByIdentity.get(identity);
    return (
      admitted && (admitted.integrity !== entry.integrity || admitted.resolved !== entry.resolved)
    );
  })
  .map(([identity]) => identity);

if (unexpected.length || missing.length || mismatched.length) {
  throw new Error(
    `DEPENDENCY_ADMISSION_MISMATCH:${JSON.stringify({ unexpected, missing, mismatched })}`,
  );
}

console.log(
  JSON.stringify({
    result: "PASS",
    admission: baseline.admissionState,
    admittedIdentityCount: admittedByIdentity.size,
    observedIdentityCount: observed.size,
  }),
);
