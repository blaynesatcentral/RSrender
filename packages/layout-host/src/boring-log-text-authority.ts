import { sha256CanonicalJson } from "@rsrender/contracts";
import type {
  BoringLogResolvedTextLine,
  BoringLogTextMeasurementRequest,
  BoringLogTextMeasurementResult,
  Mpt,
} from "@rsrender/contracts";

export const boringLogTextAuthorityRevision = "bld-037-layout-host-text-fit-v1" as const;

export type BoringLogTextAuthorityResult =
  | {
      readonly accepted: true;
      readonly results: readonly BoringLogTextMeasurementResult[];
    }
  | {
      readonly accepted: false;
      readonly code: "BORING_LOG_TEXT_REQUESTS_INVALID";
    };

const faceDigest = sha256CanonicalJson({
  authority: boringLogTextAuthorityRevision,
  family: "rsrender-boring-log-sans-v1",
  source: "admitted-system-sans-metrics",
});

const metricsDigest = sha256CanonicalJson({
  authority: boringLogTextAuthorityRevision,
  advanceEm: 0.52,
  descentEm: 0.2,
  wrap: "utf16-word-v1",
});

function mpt(value: number): Mpt {
  return value as Mpt;
}

function runtimeArray(input: unknown): boolean {
  return Array.isArray(input);
}

function validRequest(request: BoringLogTextMeasurementRequest): boolean {
  return (
    typeof request.measurementId === "string" &&
    request.measurementId.length > 0 &&
    typeof request.text === "string" &&
    request.sourceStartUtf16 >= 0 &&
    request.sourceEndUtf16 - request.sourceStartUtf16 === request.text.length &&
    Number.isSafeInteger(request.fontSizeMpt) &&
    request.fontSizeMpt > 0 &&
    Number.isSafeInteger(request.lineHeightMpt) &&
    request.lineHeightMpt > 0 &&
    Number.isSafeInteger(request.maximumWidthMpt) &&
    request.maximumWidthMpt > 0 &&
    Number.isSafeInteger(request.maximumHeightMpt) &&
    request.maximumHeightMpt > 0 &&
    Number.isSafeInteger(request.maximumLines) &&
    request.maximumLines > 0 &&
    (request.wrapPolicy === "word-v1" || request.wrapPolicy === "no-wrap") &&
    (request.overflowPolicy === "clip-with-diagnostic" ||
      request.overflowPolicy === "shrink-to-minimum") &&
    Number.isSafeInteger(request.minimumFontSizeMpt) &&
    request.minimumFontSizeMpt > 0 &&
    request.minimumFontSizeMpt <= request.fontSizeMpt
  );
}

function scaledLineHeight(request: BoringLogTextMeasurementRequest, fontSizeMpt: number): number {
  return Math.max(
    fontSizeMpt,
    Math.round((request.lineHeightMpt * fontSizeMpt) / request.fontSizeMpt),
  );
}

function resolveLinesAtSize(
  request: BoringLogTextMeasurementRequest,
  fontSizeMpt: number,
): Readonly<{
  readonly lines: readonly BoringLogResolvedTextLine[];
  readonly overflow: "none" | "clipped";
  readonly lineHeightMpt: number;
}> {
  const lineHeightMpt = scaledLineHeight(request, fontSizeMpt);
  const maximumLines =
    request.overflowPolicy === "shrink-to-minimum"
      ? Math.min(
          request.maximumLines,
          Math.max(1, Math.floor(request.maximumHeightMpt / lineHeightMpt)),
        )
      : request.maximumLines;
  const characterAdvanceMpt = Math.max(1, Math.round(fontSizeMpt * 0.52));
  const capacity = Math.max(1, Math.floor(request.maximumWidthMpt / characterAdvanceMpt));
  const lines: BoringLogResolvedTextLine[] = [];
  let cursor = 0;
  while (cursor < request.text.length && lines.length < maximumLines) {
    while (request.text[cursor] === " ") cursor += 1;
    if (cursor >= request.text.length) break;
    let end =
      request.wrapPolicy === "no-wrap"
        ? request.text.length
        : Math.min(request.text.length, cursor + capacity);
    if (request.wrapPolicy === "word-v1" && end < request.text.length) {
      const breakAt = request.text.lastIndexOf(" ", end);
      if (breakAt > cursor) end = breakAt;
    }
    const text = request.text.slice(cursor, end);
    lines.push(
      Object.freeze({
        text,
        sourceStartUtf16: request.sourceStartUtf16 + cursor,
        sourceEndUtf16: request.sourceStartUtf16 + end,
        xMpt: mpt(0),
        baselineMpt: mpt(
          lines.length * lineHeightMpt + lineHeightMpt - Math.round(fontSizeMpt * 0.2),
        ),
        advanceMpt: mpt(text.length * characterAdvanceMpt),
      }),
    );
    cursor = end;
  }
  while (request.text[cursor] === " ") cursor += 1;
  if (request.text.length === 0) {
    lines.push(
      Object.freeze({
        text: "",
        sourceStartUtf16: request.sourceStartUtf16,
        sourceEndUtf16: request.sourceStartUtf16,
        xMpt: mpt(0),
        baselineMpt: mpt(fontSizeMpt),
        advanceMpt: mpt(0),
      }),
    );
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    overflow:
      cursor < request.text.length ||
      lines.some(({ advanceMpt }) => advanceMpt > request.maximumWidthMpt)
        ? "clipped"
        : "none",
    lineHeightMpt,
  });
}

function resolveLines(request: BoringLogTextMeasurementRequest): Readonly<{
  readonly lines: readonly BoringLogResolvedTextLine[];
  readonly overflow: "none" | "clipped";
  readonly effectiveFontSizeMpt: number;
  readonly effectiveLineHeightMpt: number;
}> {
  const authored = resolveLinesAtSize(request, request.fontSizeMpt);
  if (authored.overflow === "none" || request.overflowPolicy === "clip-with-diagnostic") {
    return Object.freeze({
      ...authored,
      effectiveFontSizeMpt: request.fontSizeMpt,
      effectiveLineHeightMpt: authored.lineHeightMpt,
    });
  }
  let low: number = request.minimumFontSizeMpt;
  let high: number = request.fontSizeMpt - 1;
  let best: ReturnType<typeof resolveLinesAtSize> | undefined;
  let bestSize: number = request.minimumFontSizeMpt;
  while (low <= high) {
    const candidateSize = Math.floor((low + high) / 2);
    const candidate = resolveLinesAtSize(request, candidateSize);
    if (candidate.overflow === "none") {
      best = candidate;
      bestSize = candidateSize;
      low = candidateSize + 1;
    } else {
      high = candidateSize - 1;
    }
  }
  const resolved = best ?? resolveLinesAtSize(request, request.minimumFontSizeMpt);
  return Object.freeze({
    ...resolved,
    effectiveFontSizeMpt: best === undefined ? request.minimumFontSizeMpt : bestSize,
    effectiveLineHeightMpt: resolved.lineHeightMpt,
  });
}

export function measureBoringLogTextRequests(
  requests: readonly BoringLogTextMeasurementRequest[],
): BoringLogTextAuthorityResult {
  try {
    if (!runtimeArray(requests) || requests.length > 4_096) {
      throw new Error("REQUESTS");
    }
    const identities = new Set<string>();
    const results = requests.map((request) => {
      if (!validRequest(request) || identities.has(request.measurementId)) {
        throw new Error("REQUEST");
      }
      identities.add(request.measurementId);
      const resolved = resolveLines(request);
      const widthMpt = Math.max(0, ...resolved.lines.map(({ advanceMpt }) => advanceMpt));
      const heightMpt = resolved.lines.length * resolved.effectiveLineHeightMpt;
      return Object.freeze({
        measurementId: request.measurementId,
        fontFaceDigest: faceDigest,
        fontMetricsDigest: metricsDigest,
        logicalBounds: Object.freeze({
          xMpt: mpt(0),
          yMpt: mpt(0),
          widthMpt: mpt(widthMpt),
          heightMpt: mpt(heightMpt),
        }),
        inkBounds: Object.freeze({
          xMpt: mpt(0),
          yMpt: mpt(0),
          widthMpt: mpt(widthMpt),
          heightMpt: mpt(heightMpt),
        }),
        lines: resolved.lines,
        overflow: resolved.overflow,
        effectiveFontSizeMpt: mpt(resolved.effectiveFontSizeMpt),
        effectiveLineHeightMpt: mpt(resolved.effectiveLineHeightMpt),
      });
    });
    return Object.freeze({ accepted: true, results: Object.freeze(results) });
  } catch {
    return Object.freeze({ accepted: false, code: "BORING_LOG_TEXT_REQUESTS_INVALID" });
  }
}
