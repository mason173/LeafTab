import { getTimeFontScale, loadGoogleFont } from '@/utils/googleFonts';

const MEASURE_TEXT = '0123456789';
const REFERENCE_TIME_FONT_FAMILY = 'Pacifico';
const MEASURE_FONT_SIZE_PX = 100;

type RawDigitMetrics = {
  heightPx: number;
  widthPx: number;
};

export type RenderedTimeDigitMetrics = {
  digitHeightEm: number;
  digitWidthEm: number;
  digitTranslateEm: number;
};

const rawMetricsCache = new Map<string, RawDigitMetrics>();
const measuredScaleCache = new Map<string, number>();
const measuredScalePromiseCache = new Map<string, Promise<number>>();

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createMeasureContext() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  return canvas.getContext('2d');
}

function normalizeFontWeight(fontWeight: string | number | null | undefined) {
  const numeric = Number(fontWeight);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return 400;
}

function buildCanvasFont(fontFamily: string, fontWeight: number, fontSizePx: number) {
  return `${fontWeight} ${fontSizePx}px ${fontFamily}`;
}

function measureRawDigitMetricsSync(
  fontFamily: string,
  fontWeight = 400,
  fontSizePx = MEASURE_FONT_SIZE_PX,
): RawDigitMetrics {
  const cacheKey = `${fontFamily}__${fontWeight}__${fontSizePx}`;
  const cached = rawMetricsCache.get(cacheKey);
  if (cached) return cached;

  const context = createMeasureContext();
  if (!context) {
    const fallback = { heightPx: fontSizePx, widthPx: fontSizePx * 0.62 };
    rawMetricsCache.set(cacheKey, fallback);
    return fallback;
  }

  context.font = buildCanvasFont(fontFamily, fontWeight, fontSizePx);

  let maxHeight = 0;
  let maxWidth = 0;

  for (const glyph of MEASURE_TEXT) {
    const metrics = context.measureText(glyph);
    const ascent = metrics.actualBoundingBoxAscent || metrics.fontBoundingBoxAscent || fontSizePx * 0.8;
    const descent = metrics.actualBoundingBoxDescent || metrics.fontBoundingBoxDescent || fontSizePx * 0.2;
    maxHeight = Math.max(maxHeight, ascent + descent);
    maxWidth = Math.max(maxWidth, metrics.width || fontSizePx * 0.62);
  }

  const resolved = {
    heightPx: maxHeight || fontSizePx,
    widthPx: maxWidth || fontSizePx * 0.62,
  };

  rawMetricsCache.set(cacheKey, resolved);
  return resolved;
}

function clearRawMetricsCacheForFamily(fontFamily: string) {
  const prefix = `${fontFamily}__`;
  for (const key of rawMetricsCache.keys()) {
    if (key.startsWith(prefix)) {
      rawMetricsCache.delete(key);
    }
  }
}

async function ensureFontLoaded(fontFamily: string, fontWeight = 400) {
  if (typeof document === 'undefined') return;
  const trimmed = fontFamily.trim();
  if (!trimmed) return;

  loadGoogleFont(trimmed);

  if (!('fonts' in document)) return;

  const descriptor = buildCanvasFont(trimmed, fontWeight, MEASURE_FONT_SIZE_PX);
  try {
    await document.fonts.load(descriptor, MEASURE_TEXT);
    await document.fonts.ready;
  } catch {
    // Ignore and fall back to current available metrics.
  }
}

export async function getMeasuredTimeFontScale(
  fontFamily: string,
  fontWeight = 400,
  options: { forceRecompute?: boolean } = {},
) {
  const trimmed = fontFamily.trim();
  if (!trimmed) return 1;
  const { forceRecompute = false } = options;

  if (forceRecompute) {
    measuredScaleCache.delete(trimmed);
    measuredScalePromiseCache.delete(trimmed);
    clearRawMetricsCacheForFamily(trimmed);
    clearRawMetricsCacheForFamily(REFERENCE_TIME_FONT_FAMILY);
  }

  const cached = measuredScaleCache.get(trimmed);
  if (cached !== undefined && !forceRecompute) return cached;

  const inflight = measuredScalePromiseCache.get(trimmed);
  if (inflight && !forceRecompute) return inflight;

  const task = (async () => {
    const fallbackScale = getTimeFontScale(trimmed);

    if (typeof document === 'undefined') {
      measuredScaleCache.set(trimmed, fallbackScale);
      return fallbackScale;
    }

    await Promise.all([
      ensureFontLoaded(REFERENCE_TIME_FONT_FAMILY, fontWeight),
      ensureFontLoaded(trimmed, fontWeight),
    ]);

    clearRawMetricsCacheForFamily(trimmed);
    clearRawMetricsCacheForFamily(REFERENCE_TIME_FONT_FAMILY);

    const referenceMetrics = measureRawDigitMetricsSync(REFERENCE_TIME_FONT_FAMILY, fontWeight);
    const targetMetrics = measureRawDigitMetricsSync(trimmed, fontWeight);

    const resolved = clampNumber(
      referenceMetrics.heightPx / Math.max(1, targetMetrics.heightPx),
      0.8,
      1.18,
    );

    measuredScaleCache.set(trimmed, resolved);
    measuredScalePromiseCache.delete(trimmed);
    return resolved;
  })();

  measuredScalePromiseCache.set(trimmed, task);
  return task;
}

export function readMeasuredTimeFontScale(fontFamily: string) {
  const trimmed = fontFamily.trim();
  if (!trimmed) return undefined;
  return measuredScaleCache.get(trimmed);
}

export async function prepareTimeFont(fontFamily: string, fontWeight = 400) {
  const trimmed = fontFamily.trim();
  if (!trimmed) return 1;

  await ensureFontLoaded(trimmed, fontWeight);
  return getMeasuredTimeFontScale(trimmed, fontWeight, { forceRecompute: true });
}

export function readRenderedTimeDigitMetrics(element: HTMLElement): RenderedTimeDigitMetrics {
  const style = window.getComputedStyle(element);
  const fontSizePx = Number.parseFloat(style.fontSize) || 16;
  const fontWeight = normalizeFontWeight(style.fontWeight);
  const fontFamily = style.fontFamily || 'sans-serif';
  const rawMetrics = measureRawDigitMetricsSync(fontFamily, fontWeight, fontSizePx);

  const overscanPx = Math.max(1, fontSizePx * 0.08);
  const digitHeightEm = clampNumber((rawMetrics.heightPx + overscanPx * 2) / fontSizePx, 1, 1.32);
  const digitWidthEm = clampNumber((rawMetrics.widthPx + fontSizePx * 0.04) / fontSizePx, 0.58, 0.92);

  return {
    digitHeightEm,
    digitWidthEm,
    digitTranslateEm: digitHeightEm,
  };
}
