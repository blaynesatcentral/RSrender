import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

async function command(executable, args) {
  const result = await execute(executable, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  return Object.freeze({ stdout: result.stdout, stderr: result.stderr });
}

function field(source, name) {
  return source.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"))?.[1]?.trim() ?? null;
}

function numberField(source, name) {
  const value = field(source, name);
  return value === null ? null : Number.parseInt(value, 10);
}

function fontRows(output) {
  return output
    .split(/\r?\n/u)
    .filter((line) => /\s+(?:yes|no)\s+(?:yes|no)\s+(?:yes|no)\s+\d+\s+\d+\s*$/u.test(line))
    .map((line) => {
      const columns = line.trim().split(/\s+/u);
      return Object.freeze({
        name: columns[0],
        embedded: columns.at(-5),
        subset: columns.at(-4),
        unicode: columns.at(-3),
      });
    });
}

function imageRows(output) {
  return output.split(/\r?\n/u).filter((line) => /^\s*\d+\s+\d+\s+\w+/u.test(line));
}

function pageSizes(output) {
  return Object.freeze(
    [...output.matchAll(/^Page\s+\d+\s+size:\s+(\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) pts/gmu)].map(
      (match) => Object.freeze([Number(match[1]), Number(match[2])]),
    ),
  );
}

export async function inspectBoringLogPdfPackage({
  pdfPath,
  expectedOrderedTitles,
  expectedPageSizesPoints,
  expectedProjectionDigest,
}) {
  const absolutePdfPath = path.resolve(pdfPath);
  const [bytes, summary, fonts, images, text] = await Promise.all([
    readFile(absolutePdfPath),
    command("pdfinfo.exe", ["-box", absolutePdfPath]),
    command("pdffonts.exe", [absolutePdfPath]),
    command("pdfimages.exe", ["-list", absolutePdfPath]),
    command("pdftotext.exe", ["-layout", "-enc", "UTF-8", absolutePdfPath, "-"]),
  ]);
  const pageCount = numberField(summary.stdout, "Pages");
  const info =
    pageCount === null
      ? summary
      : await command("pdfinfo.exe", ["-box", "-f", "1", "-l", String(pageCount), absolutePdfPath]);
  const observedPageSizes = pageSizes(info.stdout);
  const observedTitleIndexes = expectedOrderedTitles.map((title) => text.stdout.indexOf(title));
  const fontInventory = fontRows(fonts.stdout);
  const imageInventory = imageRows(images.stdout);
  const warnings = [summary.stderr, info.stderr, fonts.stderr, images.stderr, text.stderr].filter(
    (warning) => warning.trim().length > 0,
  );
  const result = Object.freeze({
    schema: "rsrender.bld044.normalized-pdf-package-inspection.v1",
    result: "PASS",
    pdfSha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    pdfBytes: bytes.byteLength,
    title: field(summary.stdout, "Title"),
    pageCount,
    pageSizesPoints: observedPageSizes,
    tagged: field(summary.stdout, "Tagged") === "yes",
    encrypted: field(summary.stdout, "Encrypted") === "yes",
    javascript: field(summary.stdout, "JavaScript") === "yes",
    fonts: Object.freeze(fontInventory),
    images: imageInventory.length,
    extractedCharacters: text.stdout.length,
    orderedTitleIndexes: Object.freeze(observedTitleIndexes),
    toolWarnings: Object.freeze(warnings),
  });
  if (
    result.pageCount !== expectedPageSizesPoints.length ||
    JSON.stringify(result.pageSizesPoints) !== JSON.stringify(expectedPageSizesPoints) ||
    result.tagged !== true ||
    result.encrypted !== false ||
    result.javascript !== false ||
    result.title === null ||
    !result.title.includes(expectedProjectionDigest) ||
    result.fonts.length < 1 ||
    result.fonts.some(
      ({ embedded, subset, unicode }) =>
        embedded !== "yes" || subset !== "yes" || unicode !== "yes",
    ) ||
    result.images !== 0 ||
    result.orderedTitleIndexes.some((index) => index < 0) ||
    result.orderedTitleIndexes.some(
      (index, position) => position > 0 && index <= result.orderedTitleIndexes[position - 1],
    ) ||
    result.toolWarnings.length > 0
  ) {
    throw new Error(`BLD044_NORMALIZED_PDF_PACKAGE_INSPECTION_FAILED:${JSON.stringify(result)}`);
  }
  return result;
}
