export const LEAFTAB_COMPACT_GRID_METRICS = {
  iconSize: 72,
  titleBlockHeight: 24,
  columnGap: 12,
  rowGap: 20,
  titleFontSize: 12,
  iconCornerRadius: 22,
  largeFolderGridSpan: 2,
  largeFolderHitSlop: 8,
} as const;

export type LeaftabCompactGridMetrics = typeof LEAFTAB_COMPACT_GRID_METRICS;
