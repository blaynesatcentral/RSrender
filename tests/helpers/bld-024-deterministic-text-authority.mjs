import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
} from "../../packages/test-support/dist/index.js";

function resolveLines(request) {
  const characterAdvanceMpt = Math.max(1, Math.round(request.fontSizeMpt * 0.52));
  const capacity = Math.max(1, Math.floor(request.maximumWidthMpt / characterAdvanceMpt));
  const lines = [];
  let cursor = 0;
  while (cursor < request.text.length && lines.length < request.maximumLines) {
    while (request.text[cursor] === " ") cursor += 1;
    if (cursor >= request.text.length) break;
    let end = Math.min(request.text.length, cursor + capacity);
    if (end < request.text.length) {
      const breakAt = request.text.lastIndexOf(" ", end);
      if (breakAt > cursor) end = breakAt;
    }
    const text = request.text.slice(cursor, end);
    lines.push({
      text,
      sourceStartUtf16: request.sourceStartUtf16 + cursor,
      sourceEndUtf16: request.sourceStartUtf16 + end,
      xMpt: 0,
      baselineMpt:
        (lines.length + 1) * request.lineHeightMpt - Math.round(request.fontSizeMpt * 0.2),
      advanceMpt: text.length * characterAdvanceMpt,
    });
    cursor = end;
  }
  while (request.text[cursor] === " ") cursor += 1;
  if (request.text.length === 0) {
    lines.push({
      text: "",
      sourceStartUtf16: request.sourceStartUtf16,
      sourceEndUtf16: request.sourceStartUtf16,
      xMpt: 0,
      baselineMpt: request.fontSizeMpt,
      advanceMpt: 0,
    });
  }
  return {
    lines,
    overflow: cursor < request.text.length ? "clipped" : "none",
  };
}

export function deterministicTextResults(requests, forcedOverflowIds = new Set()) {
  return requests.map((request) => {
    const resolved = resolveLines(request);
    const overflow = forcedOverflowIds.has(request.measurementId) ? "clipped" : resolved.overflow;
    const widthMpt = Math.max(0, ...resolved.lines.map(({ advanceMpt }) => advanceMpt));
    const heightMpt = resolved.lines.length * request.lineHeightMpt;
    return {
      measurementId: request.measurementId,
      fontFaceDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
      fontMetricsDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
      logicalBounds: { xMpt: 0, yMpt: 0, widthMpt, heightMpt },
      inkBounds: { xMpt: 0, yMpt: 0, widthMpt, heightMpt },
      lines: resolved.lines,
      overflow,
      effectiveFontSizeMpt: request.fontSizeMpt,
      effectiveLineHeightMpt: request.lineHeightMpt,
    };
  });
}
