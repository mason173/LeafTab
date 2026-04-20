import type { ShortcutIconAppearance } from '@/types';

export const SHORTCUT_ICON_APPEARANCE_KEY = 'shortcutIconAppearance';
export const SHORTCUT_ICON_CORNER_RADIUS_KEY = 'shortcutIconCornerRadius';
export const SHORTCUT_ICON_SCALE_KEY = 'shortcutIconScale';

export const DEFAULT_SHORTCUT_ICON_APPEARANCE: ShortcutIconAppearance = 'colorful';
export const MIN_SHORTCUT_ICON_CORNER_RADIUS = 0;
export const MAX_SHORTCUT_ICON_CORNER_RADIUS = 50;
export const DEFAULT_SHORTCUT_ICON_CORNER_RADIUS = 34;
export const MIN_SHORTCUT_ICON_SCALE = 80;
export const MAX_SHORTCUT_ICON_SCALE = 120;
export const DEFAULT_SHORTCUT_ICON_SCALE = 100;
const SHORTCUT_ICON_SMOOTH_CLIP_PATH_STEPS = 120;
const SHORTCUT_ICON_SMOOTH_MIN_EXPONENT = 2;
const SHORTCUT_ICON_SMOOTH_MAX_EXPONENT = 100;
const SHORTCUT_ICON_SMOOTH_DIAGONAL_COSINE = Math.SQRT1_2;
const SHORTCUT_ICON_SMOOTH_MAX_DIAGONAL_INSET = 1 - SHORTCUT_ICON_SMOOTH_DIAGONAL_COSINE;
const shortcutIconSmoothClipPathCache = new Map<number, string>();
const shortcutIconSmoothSvgPathDataCache = new Map<number, string>();
const shortcutIconSmoothExponentCache = new Map<number, number>();
let shortcutIconSmoothClipPathSupport: boolean | null = null;

export const normalizeShortcutIconAppearance = (value: unknown): ShortcutIconAppearance => {
  return value === 'monochrome' || value === 'accent'
    ? value
    : DEFAULT_SHORTCUT_ICON_APPEARANCE;
};

export const clampShortcutIconCornerRadius = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SHORTCUT_ICON_CORNER_RADIUS;
  return Math.max(
    MIN_SHORTCUT_ICON_CORNER_RADIUS,
    Math.min(MAX_SHORTCUT_ICON_CORNER_RADIUS, Math.round(numeric)),
  );
};

export const getShortcutIconBorderRadius = (cornerRadius: unknown) => {
  return `${clampShortcutIconCornerRadius(cornerRadius)}%`;
};

function getShortcutIconSmoothDiagonalInsetRatio(exponent: number) {
  return (
    1 - Math.pow(SHORTCUT_ICON_SMOOTH_DIAGONAL_COSINE, 2 / exponent)
  ) / SHORTCUT_ICON_SMOOTH_MAX_DIAGONAL_INSET;
}

export const getShortcutIconSmoothExponent = (cornerRadius: unknown) => {
  const normalizedCornerRadius = clampShortcutIconCornerRadius(cornerRadius);
  const cached = shortcutIconSmoothExponentCache.get(normalizedCornerRadius);
  if (cached != null) return cached;

  const targetRatio = normalizedCornerRadius / MAX_SHORTCUT_ICON_CORNER_RADIUS;
  let low = SHORTCUT_ICON_SMOOTH_MIN_EXPONENT;
  let high = SHORTCUT_ICON_SMOOTH_MAX_EXPONENT;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const mid = (low + high) / 2;
    const insetRatio = getShortcutIconSmoothDiagonalInsetRatio(mid);
    if (insetRatio < targetRatio) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const exponent = targetRatio <= 0
    ? SHORTCUT_ICON_SMOOTH_MAX_EXPONENT
    : targetRatio >= 1
      ? SHORTCUT_ICON_SMOOTH_MIN_EXPONENT
      : (low + high) / 2;

  shortcutIconSmoothExponentCache.set(normalizedCornerRadius, exponent);
  return exponent;
};

export const getShortcutIconSmoothClipPath = (cornerRadius: unknown) => {
  const normalizedCornerRadius = clampShortcutIconCornerRadius(cornerRadius);
  const cached = shortcutIconSmoothClipPathCache.get(normalizedCornerRadius);
  if (cached) return cached;

  const exponent = getShortcutIconSmoothExponent(normalizedCornerRadius);
  const points: string[] = [];

  for (let step = 0; step < SHORTCUT_ICON_SMOOTH_CLIP_PATH_STEPS; step += 1) {
    const angle = (step / SHORTCUT_ICON_SMOOTH_CLIP_PATH_STEPS) * Math.PI * 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x = Math.sign(cosAngle) * Math.pow(Math.abs(cosAngle), 2 / exponent) * 50 + 50;
    const y = Math.sign(sinAngle) * Math.pow(Math.abs(sinAngle), 2 / exponent) * 50 + 50;
    points.push(`${x.toFixed(3)}% ${y.toFixed(3)}%`);
  }

  const clipPath = `polygon(${points.join(', ')})`;
  shortcutIconSmoothClipPathCache.set(normalizedCornerRadius, clipPath);
  return clipPath;
};

export const getShortcutIconSmoothSvgPathData = (cornerRadius: unknown) => {
  const normalizedCornerRadius = clampShortcutIconCornerRadius(cornerRadius);
  const cached = shortcutIconSmoothSvgPathDataCache.get(normalizedCornerRadius);
  if (cached) return cached;

  const exponent = getShortcutIconSmoothExponent(normalizedCornerRadius);
  const points: string[] = [];

  for (let step = 0; step < SHORTCUT_ICON_SMOOTH_CLIP_PATH_STEPS; step += 1) {
    const angle = (step / SHORTCUT_ICON_SMOOTH_CLIP_PATH_STEPS) * Math.PI * 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x = Math.sign(cosAngle) * Math.pow(Math.abs(cosAngle), 2 / exponent) * 50 + 50;
    const y = Math.sign(sinAngle) * Math.pow(Math.abs(sinAngle), 2 / exponent) * 50 + 50;
    points.push(`${x.toFixed(3)} ${y.toFixed(3)}`);
  }

  const [firstPoint, ...restPoints] = points;
  const pathData = `M ${firstPoint} L ${restPoints.join(' L ')} Z`;
  shortcutIconSmoothSvgPathDataCache.set(normalizedCornerRadius, pathData);
  return pathData;
};

export const getShortcutIconSmoothClipPathStyles = (cornerRadius: unknown) => {
  if (shortcutIconSmoothClipPathSupport == null) {
    const polygonProbe = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    shortcutIconSmoothClipPathSupport = typeof CSS !== 'undefined'
      && typeof CSS.supports === 'function'
      && (CSS.supports('clip-path', polygonProbe) || CSS.supports('-webkit-clip-path', polygonProbe));
  }

  if (!shortcutIconSmoothClipPathSupport) {
    return {
      borderRadius: getShortcutIconBorderRadius(cornerRadius),
    } as const;
  }

  const clipPath = getShortcutIconSmoothClipPath(cornerRadius);
  return {
    WebkitClipPath: clipPath,
    clipPath,
  } as const;
};

export const clampShortcutIconScale = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SHORTCUT_ICON_SCALE;
  return Math.max(
    MIN_SHORTCUT_ICON_SCALE,
    Math.min(MAX_SHORTCUT_ICON_SCALE, Math.round(numeric)),
  );
};

export const scaleShortcutIconSize = (baseSize: number, scale: unknown) => {
  const normalizedScale = clampShortcutIconScale(scale);
  return Math.max(16, Math.round(baseSize * normalizedScale / 100));
};
