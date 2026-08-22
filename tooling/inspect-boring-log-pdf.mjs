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

const vectorRulePolicy = Object.freeze({
  axisTolerancePoints: 0.02,
  horizontalMinimumSpanRatio: 0.75,
  verticalMinimumSpanRatio: 0.55,
});

function svgAttributes(element) {
  return Object.fromEntries(
    [...element.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/gu)].map((match) => [
      match[1],
      match[2] ?? match[3],
    ]),
  );
}

function svgMatrix(transform) {
  if (transform === undefined) return [1, 0, 0, 1, 0, 0];
  const match = transform.match(
    /^matrix\(\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*\)$/u,
  );
  return match === null ? null : match.slice(1).map(Number);
}

function transformedPoint([x, y], [a, b, c, d, e, f]) {
  return [a * x + c * y + e, b * x + d * y + f];
}

function linearPathSegments(data, matrix) {
  if (/[AaCcQqSsTt]/u.test(data)) return null;
  const pathTokens =
    data.match(/[MmLlHhVvZz]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][-+]?\d+)?/gu) ?? [];
  const segments = [];
  let index = 0;
  let commandName = null;
  let current = [0, 0];
  let subpathStart = [0, 0];

  function numeric(count) {
    if (index + count > pathTokens.length) return null;
    const values = pathTokens.slice(index, index + count);
    if (values.some((value) => /^[A-Za-z]$/u.test(value))) return null;
    index += count;
    return values.map(Number);
  }

  function lineTo(target) {
    segments.push([transformedPoint(current, matrix), transformedPoint(target, matrix)]);
    current = target;
  }

  while (index < pathTokens.length) {
    if (/^[A-Za-z]$/u.test(pathTokens[index])) {
      commandName = pathTokens[index];
      index += 1;
      if (commandName === "Z" || commandName === "z") {
        lineTo(subpathStart);
        commandName = null;
        continue;
      }
    }
    if (commandName === null) return null;
    const relative = commandName === commandName.toLocaleLowerCase("en-US");
    if (commandName === "M" || commandName === "m" || commandName === "L" || commandName === "l") {
      const values = numeric(2);
      if (values === null) return null;
      const target = relative ? [current[0] + values[0], current[1] + values[1]] : values;
      if (commandName === "M" || commandName === "m") {
        current = target;
        subpathStart = target;
        commandName = relative ? "l" : "L";
      } else {
        lineTo(target);
      }
      continue;
    }
    if (commandName === "H" || commandName === "h") {
      const values = numeric(1);
      if (values === null) return null;
      lineTo([relative ? current[0] + values[0] : values[0], current[1]]);
      continue;
    }
    if (commandName === "V" || commandName === "v") {
      const values = numeric(1);
      if (values === null) return null;
      lineTo([current[0], relative ? current[1] + values[0] : values[0]]);
      continue;
    }
    return null;
  }
  return segments;
}

function roundedPoint(value) {
  return Math.round(value * 1_000) / 1_000;
}

function normalizedRuleGroups(segments, axisSize, minimumSpan, orientation) {
  const candidates = segments
    .map(([from, to]) => {
      const horizontal = Math.abs(from[1] - to[1]) <= vectorRulePolicy.axisTolerancePoints;
      const vertical = Math.abs(from[0] - to[0]) <= vectorRulePolicy.axisTolerancePoints;
      if (
        (orientation === "horizontal" && !horizontal) ||
        (orientation === "vertical" && !vertical)
      ) {
        return null;
      }
      const position = orientation === "horizontal" ? (from[1] + to[1]) / 2 : (from[0] + to[0]) / 2;
      const start =
        orientation === "horizontal" ? Math.min(from[0], to[0]) : Math.min(from[1], to[1]);
      const end =
        orientation === "horizontal" ? Math.max(from[0], to[0]) : Math.max(from[1], to[1]);
      return end - start >= minimumSpan ? { position, start, end } : null;
    })
    .filter((candidate) => candidate !== null)
    .sort((left, right) => left.position - right.position || left.start - right.start);
  const groups = [];
  for (const candidate of candidates) {
    let group = groups.at(-1);
    if (
      group === undefined ||
      Math.abs(candidate.position - group.positionTotal / group.segmentCount) >
        vectorRulePolicy.axisTolerancePoints
    ) {
      group = {
        positionTotal: 0,
        segmentCount: 0,
        spanStart: candidate.start,
        spanEnd: candidate.end,
        maximumSpan: 0,
      };
      groups.push(group);
    }
    group.positionTotal += candidate.position;
    group.segmentCount += 1;
    group.spanStart = Math.min(group.spanStart, candidate.start);
    group.spanEnd = Math.max(group.spanEnd, candidate.end);
    group.maximumSpan = Math.max(group.maximumSpan, candidate.end - candidate.start);
  }
  return Object.freeze(
    groups.map((group) => {
      const position = group.positionTotal / group.segmentCount;
      return Object.freeze({
        coordinatePoints: roundedPoint(position),
        coordinateMpt: Math.round(position * 1_000),
        coordinatePermillion: Math.round((position * 1_000_000) / axisSize),
        spanStartPoints: roundedPoint(group.spanStart),
        spanEndPoints: roundedPoint(group.spanEnd),
        maximumSpanPoints: roundedPoint(group.maximumSpan),
        segmentCount: group.segmentCount,
      });
    }),
  );
}

export function normalizeMajorPdfRuleCoordinates(vectorSvg, pageSizePoints) {
  const [pageWidth, pageHeight] = pageSizePoints ?? [];
  if (!(pageWidth > 0) || !(pageHeight > 0)) {
    return Object.freeze({
      result: "UNAVAILABLE",
      reason: "PDF_PAGE_SIZE_UNAVAILABLE",
      policy: vectorRulePolicy,
      horizontalRules: Object.freeze([]),
      verticalRules: Object.freeze([]),
    });
  }
  const segments = [];
  let strokedPathCount = 0;
  let linearPathCount = 0;
  let unsupportedTransformPathCount = 0;
  let curvedPathCount = 0;
  for (const element of vectorSvg.match(/<path\b[^>]*>/gu) ?? []) {
    const attributes = svgAttributes(element);
    if (
      attributes.stroke === undefined ||
      attributes.stroke === "none" ||
      Number(attributes["stroke-opacity"] ?? 1) <= 0 ||
      Number(attributes["stroke-width"] ?? 1) <= 0 ||
      attributes.d === undefined
    ) {
      continue;
    }
    strokedPathCount += 1;
    const matrix = svgMatrix(attributes.transform);
    if (matrix === null) {
      unsupportedTransformPathCount += 1;
      continue;
    }
    const pathSegments = linearPathSegments(attributes.d, matrix);
    if (pathSegments === null) {
      curvedPathCount += 1;
      continue;
    }
    linearPathCount += 1;
    segments.push(...pathSegments);
  }
  const horizontalRules = normalizedRuleGroups(
    segments,
    pageHeight,
    pageWidth * vectorRulePolicy.horizontalMinimumSpanRatio,
    "horizontal",
  );
  const verticalRules = normalizedRuleGroups(
    segments,
    pageWidth,
    pageHeight * vectorRulePolicy.verticalMinimumSpanRatio,
    "vertical",
  );
  return Object.freeze({
    result: "AVAILABLE",
    coordinateSpace: "pdf-points-top-left",
    policy: vectorRulePolicy,
    sourceInventory: Object.freeze({
      strokedPathCount,
      linearPathCount,
      curvedPathCount,
      unsupportedTransformPathCount,
      linearSegmentCount: segments.length,
    }),
    horizontalRules,
    verticalRules,
    horizontalCoordinatesMpt: Object.freeze(
      horizontalRules.map(({ coordinateMpt }) => coordinateMpt),
    ),
    verticalCoordinatesMpt: Object.freeze(verticalRules.map(({ coordinateMpt }) => coordinateMpt)),
    horizontalCoordinatesPermillion: Object.freeze(
      horizontalRules.map(({ coordinatePermillion }) => coordinatePermillion),
    ),
    verticalCoordinatesPermillion: Object.freeze(
      verticalRules.map(({ coordinatePermillion }) => coordinatePermillion),
    ),
  });
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
  const pageSizePoints = pageSize === null ? null : [Number(pageSize[1]), Number(pageSize[2])];
  const vectorGeometry = normalizeMajorPdfRuleCoordinates(vectorSvg, pageSizePoints);
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
    pageSizePoints,
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
    vectorGeometry,
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
