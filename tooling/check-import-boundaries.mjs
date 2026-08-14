import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { internalImportRules, packageNames, purePackages } from "./workspace-model.mjs";

const importPatterns = [
  /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu,
  /import\s*\(\s*["']([^"']+)["']\s*\)/gu,
  /require\s*\(\s*["']([^"']+)["']\s*\)/gu,
];

const forbiddenPureImports = [
  "electron",
  "@zip.js/zip.js",
  "node:child_process",
  "node:fs",
  "node:fs/promises",
  "node:http",
  "node:https",
  "node:net",
  "node:tls",
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(fullPath)));
    else if (/\.(?:cts|mts|ts|tsx)$/u.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function importsFrom(source) {
  const imports = [];
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) imports.push(match[1]);
  }
  return imports;
}

export async function checkImportBoundaries(packagesRoot) {
  const violations = [];
  for (const packageName of packageNames) {
    const sourceRoot = path.join(packagesRoot, packageName, "src");
    let files;
    try {
      files = await sourceFiles(sourceRoot);
    } catch {
      violations.push({ packageName, file: sourceRoot, code: "SOURCE_ROOT_MISSING" });
      continue;
    }
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const specifier of importsFrom(source)) {
        if (specifier.startsWith("@rsrender/")) {
          const target = specifier.slice("@rsrender/".length).split("/")[0];
          if (!internalImportRules[packageName].includes(target)) {
            violations.push({
              packageName,
              file: path.relative(packagesRoot, file).replaceAll("\\", "/"),
              code: "INTERNAL_DIRECTION_VIOLATION",
              specifier,
            });
          }
        }
        if (
          purePackages.includes(packageName) &&
          forbiddenPureImports.some(
            (forbidden) => specifier === forbidden || specifier.startsWith(`${forbidden}/`),
          )
        ) {
          violations.push({
            packageName,
            file: path.relative(packagesRoot, file).replaceAll("\\", "/"),
            code: "PURE_PACKAGE_PRIVILEGE_IMPORT",
            specifier,
          });
        }
      }
    }
  }
  return violations;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const packagesRoot = path.resolve(process.argv[2] ?? "packages");
  const violations = await checkImportBoundaries(packagesRoot);
  if (violations.length > 0) {
    console.error(JSON.stringify({ result: "FAIL", violations }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ result: "PASS", packageCount: packageNames.length }));
  }
}
