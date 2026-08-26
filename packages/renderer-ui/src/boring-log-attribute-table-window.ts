export const boringLogAttributeTableCorpusLimits = Object.freeze({
  records: 4_096,
  fieldsPerRecord: 32,
  rows: 131_072,
  virtualizationThreshold: 120,
  rowHeightPx: 27,
  overscanRows: 12,
});

export type BoringLogAttributeTableWindow = Readonly<{
  readonly virtualized: boolean;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly renderedRows: number;
  readonly topSpacerPx: number;
  readonly bottomSpacerPx: number;
}>;

export function resolveBoringLogAttributeTableWindow(input: {
  readonly totalRows: number;
  readonly scrollTopPx: number;
  readonly viewportHeightPx: number;
}): BoringLogAttributeTableWindow {
  if (
    !Number.isSafeInteger(input.totalRows) ||
    input.totalRows < 0 ||
    input.totalRows > boringLogAttributeTableCorpusLimits.rows ||
    !Number.isFinite(input.scrollTopPx) ||
    input.scrollTopPx < 0 ||
    !Number.isFinite(input.viewportHeightPx) ||
    input.viewportHeightPx < 0 ||
    input.viewportHeightPx > 10_000
  ) {
    throw new RangeError("BORING_LOG_ATTRIBUTE_TABLE_WINDOW_INVALID");
  }
  const { rowHeightPx, overscanRows, virtualizationThreshold } =
    boringLogAttributeTableCorpusLimits;
  const virtualized = input.totalRows > virtualizationThreshold;
  if (!virtualized) {
    return Object.freeze({
      virtualized,
      startIndex: 0,
      endIndex: input.totalRows,
      renderedRows: input.totalRows,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
    });
  }
  const visibleCapacity = Math.max(
    1,
    Math.ceil(Math.max(input.viewportHeightPx, rowHeightPx) / rowHeightPx),
  );
  const maximumStart = Math.max(0, input.totalRows - 1);
  const startIndex = Math.min(
    maximumStart,
    Math.max(0, Math.floor(input.scrollTopPx / rowHeightPx) - overscanRows),
  );
  const endIndex = Math.min(input.totalRows, startIndex + visibleCapacity + overscanRows * 2);
  return Object.freeze({
    virtualized,
    startIndex,
    endIndex,
    renderedRows: endIndex - startIndex,
    topSpacerPx: startIndex * rowHeightPx,
    bottomSpacerPx: (input.totalRows - endIndex) * rowHeightPx,
  });
}
