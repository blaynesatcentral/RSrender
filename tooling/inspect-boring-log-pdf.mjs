import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function command(executable, args) {
  const result = await execute(executable, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
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

function box(source, name) {
  const match = source.match(
    new RegExp(
      `^${name}:\\s+(-?\\d+(?:\\.\\d+)?)\\s+(-?\\d+(?:\\.\\d+)?)\\s+(-?\\d+(?:\\.\\d+)?)\\s+(-?\\d+(?:\\.\\d+)?)$`,
      "mu",
    ),
  );
  return match === null ? null : match.slice(1).map(Number);
}

function tokens(value) {
  return value.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+(?:[.-][\p{L}\p{N}]+)*/gu) ?? [];
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

export async function inspectBoringLogPdf({
  pdfPath,
  expectedSceneDigest,
  expectedProjectionDigest,
  expectedText,
  expectedSceneNodes,
  renderPrefix,
}) {
  const absolutePdfPath = path.resolve(pdfPath);
  const [bytes, info, fonts, images, text] = await Promise.all([
    readFile(absolutePdfPath),
    command("pdfinfo.exe", ["-box", absolutePdfPath]),
    command("pdffonts.exe", [absolutePdfPath]),
    command("pdfimages.exe", ["-list", absolutePdfPath]),
    command("pdftotext.exe", ["-layout", "-enc", "UTF-8", absolutePdfPath, "-"]),
  ]);
  const pageSize = info.stdout.match(/Page size:\s+(\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) pts/iu);
  const title = field(info.stdout, "Title");
  const fontInventory = fontRows(fonts.stdout);
  const imageInventory = imageRows(images.stdout);
  const expectedTokens = new Set(expectedText.flatMap(tokens).filter((token) => token.length >= 2));
  const observedTokens = new Set(tokens(text.stdout));
  const covered = [...expectedTokens].filter((token) => observedTokens.has(token));
  const textCoverage = expectedTokens.size === 0 ? 0 : covered.length / expectedTokens.size;
  const svgPath = `${path.resolve(renderPrefix)}-vector.svg`;
  const pngPrefix = path.resolve(renderPrefix);
  await rm(svgPath, { force: true });
  await command("pdftocairo.exe", ["-f", "1", "-l", "1", "-svg", absolutePdfPath, svgPath]);
  const vectorSvg = await readFile(svgPath, "utf8");
  await command("pdftoppm.exe", [
    "-f",
    "1",
    "-singlefile",
    "-png",
    "-r",
    "144",
    absolutePdfPath,
    pngPrefix,
  ]);
  await rm(svgPath, { force: true });
  const result = Object.freeze({
    schema: "rsrender.bld027.normalized-pdf-inspection.v1",
    result: "PASS",
    pdfSha256: sha256(bytes),
    pdfBytes: bytes.byteLength,
    title,
    pageCount: numberField(info.stdout, "Pages"),
    pageSizePoints: pageSize === null ? null : [Number(pageSize[1]), Number(pageSize[2])],
    boxes: Object.freeze({
      media: box(info.stdout, "MediaBox"),
      crop: box(info.stdout, "CropBox"),
      bleed: box(info.stdout, "BleedBox"),
      trim: box(info.stdout, "TrimBox"),
      art: box(info.stdout, "ArtBox"),
    }),
    tagged: field(info.stdout, "Tagged") === "yes",
    encrypted: field(info.stdout, "Encrypted") === "yes",
    javascript: field(info.stdout, "JavaScript") === "yes",
    pdfVersion: field(info.stdout, "PDF version"),
    fonts: Object.freeze(fontInventory),
    images: imageInventory.length,
    vectorInventory: Object.freeze({
      expectedSceneNodes,
      paths: (vectorSvg.match(/<path\b/gu) ?? []).length,
      uses: (vectorSvg.match(/<use\b/gu) ?? []).length,
      clips: (vectorSvg.match(/<clipPath\b/gu) ?? []).length,
      opacityDeclarations: (vectorSvg.match(/(?:opacity|fill-opacity|stroke-opacity)=/gu) ?? [])
        .length,
    }),
    text: Object.freeze({
      expectedUniqueTokens: expectedTokens.size,
      coveredUniqueTokens: covered.length,
      coverage: textCoverage,
      extractedCharacters: text.stdout.length,
      representativeOrder: Object.freeze([
        text.stdout.indexOf("Synthetic Geotechnical Services"),
        text.stdout.indexOf("BORING LOG TEST-01"),
        text.stdout.indexOf("CLIENT"),
        text.stdout.indexOf("MATERIAL DESCRIPTION"),
        text.stdout.indexOf("REVIEWED & APPROVED"),
        text.stdout.indexOf("Split spoon (SPT)"),
      ]),
    }),
    toolWarnings: Object.freeze({
      pdfinfo: info.stderr.trim(),
      pdffonts: fonts.stderr.trim(),
      pdfimages: images.stderr.trim(),
      pdftotext: text.stderr.trim(),
    }),
    renderedPng: `${pngPrefix}.png`,
  });
  const expectedBox = [0, 0, 612, 792];
  const order = result.text.representativeOrder;
  const warnings = Object.values(result.toolWarnings).filter((value) => value.length > 0);
  if (
    result.pageCount !== 1 ||
    JSON.stringify(result.pageSizePoints) !== JSON.stringify([612, 792]) ||
    Object.values(result.boxes).some(
      (value) => JSON.stringify(value) !== JSON.stringify(expectedBox),
    ) ||
    result.tagged !== true ||
    result.encrypted !== false ||
    result.javascript !== false ||
    title === null ||
    !title.includes(expectedSceneDigest) ||
    !title.includes(expectedProjectionDigest) ||
    result.fonts.length < 1 ||
    result.fonts.some(
      ({ embedded, subset, unicode }) =>
        embedded !== "yes" || subset !== "yes" || unicode !== "yes",
    ) ||
    result.images !== 0 ||
    result.vectorInventory.paths < 25 ||
    result.text.coverage < 0.95 ||
    order.some((value) => value < 0) ||
    order.some((value, index) => index > 0 && value <= order[index - 1]) ||
    warnings.length > 0
  ) {
    throw new Error(`BLD027_NORMALIZED_PDF_INSPECTION_FAILED:${JSON.stringify(result)}`);
  }
  return result;
}
