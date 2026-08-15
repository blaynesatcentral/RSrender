import path from "node:path";
import { pathToFileURL } from "node:url";

import { packageEmptyShell } from "./shell-package-bld006.mjs";

export async function packageApplicationVersionShell() {
  const baseline = await packageEmptyShell();
  return Object.freeze({
    schema: "rsrender.bld012.package-result.v0",
    result: baseline.result,
    baseline,
    seam: "one-generated-application-version-query",
  });
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) console.log(JSON.stringify(await packageApplicationVersionShell()));
