export function strictCoverageTextResults(requests) {
  return requests.map((request) => ({
    measurementId: request.measurementId,
    fontFaceDigest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    fontMetricsDigest: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    logicalBounds: { xMpt: 0, yMpt: 0, widthMpt: 0, heightMpt: request.lineHeightMpt },
    inkBounds: { xMpt: 0, yMpt: 0, widthMpt: 0, heightMpt: 0 },
    lines: [
      {
        text: request.text,
        sourceStartUtf16: request.sourceStartUtf16,
        sourceEndUtf16: request.sourceEndUtf16,
        xMpt: 0,
        baselineMpt: request.fontSizeMpt,
        advanceMpt: 0,
      },
    ],
    overflow: "none",
    effectiveFontSizeMpt: request.fontSizeMpt,
    effectiveLineHeightMpt: request.lineHeightMpt,
  }));
}
