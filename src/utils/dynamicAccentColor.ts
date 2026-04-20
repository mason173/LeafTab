import { DEFAULT_COLOR_WALLPAPER_ID, getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
import {
  ADAPTIVE_NEUTRAL_ACCENT,
  DEFAULT_ACCENT_COLOR,
  getWallpaperAccentSlotIndex,
  isHexAccentColor,
  resolveAdaptiveNeutralAccent,
  resolveLegacyNamedAccentColor,
} from '@/utils/accentColor';
import type { WallpaperMode } from '@/wallpaper/types';

type DynamicAccentInput = {
  wallpaperMode: WallpaperMode;
  bingWallpaper: string;
  customWallpaper: string | null;
  weatherCode: number;
  colorWallpaperId?: string;
};

type ResolveDynamicAccentOptions = {
  forceImageResample?: boolean;
};

type ResolveAccentColorOptions = ResolveDynamicAccentOptions & {
  isDarkTheme: boolean;
};

const imageAccentPaletteCache = new Map<string, string[]>();

type WeatherTheme = 'sunny' | 'cloudy' | 'foggy' | 'rainy' | 'snowy' | 'thunderstorm';

// Tuned to match the visual palette of local weather videos in WallpaperSelector.
const WEATHER_THEME_ACCENT: Record<WeatherTheme, string> = {
  sunny: '#5AAAF5',
  cloudy: '#8A98A8',
  foggy: '#9AA8AE',
  rainy: '#596E85',
  snowy: '#8FAFD1',
  thunderstorm: '#46506F',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  h /= 6;
  return { h, s, l };
};

const hslToHex = (h: number, s: number, l: number) => {
  if (s === 0) {
    const gray = Math.round(l * 255);
    const v = gray.toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const normalizeHue = (value: number) => {
  const normalized = value % 1;
  return normalized < 0 ? normalized + 1 : normalized;
};

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const int = Number.parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const resolveForeground = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.36 ? '#111827' : '#ffffff';
};

const resolveWeatherTheme = (weatherCode: number): WeatherTheme => {
  if ([0, 1].includes(weatherCode)) return 'sunny';
  if ([2, 3].includes(weatherCode)) return 'cloudy';
  if ([45, 48].includes(weatherCode)) return 'foggy';
  if ([95, 96, 99].includes(weatherCode)) return 'thunderstorm';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snowy';
  return 'rainy';
};

const resolveWeatherAccent = (weatherCode: number) => {
  const theme = resolveWeatherTheme(weatherCode);
  return WEATHER_THEME_ACCENT[theme] || '#4f86c6';
};

const resolveSourceImage = (input: DynamicAccentInput) => {
  if (input.wallpaperMode === 'custom') return input.customWallpaper || '';
  if (input.wallpaperMode === 'bing') return input.bingWallpaper || '';
  return '';
};

const resolveColorAccent = (colorWallpaperId?: string) => {
  const gradient = getColorWallpaperGradient(colorWallpaperId || DEFAULT_COLOR_WALLPAPER_ID);
  const matches = gradient.match(/#[0-9a-fA-F]{6}/g);
  if (!matches || matches.length === 0) return '#8fa3c7';
  return matches[Math.floor(matches.length / 2)];
};

const FALLBACK_IMAGE_ACCENT = '#3b82f6';
export const DEFAULT_WALLPAPER_ACCENT_PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#7c3aed', '#ec4899', '#0ea5e9'];
const REMOTE_URL_PATTERN = /^https?:\/\//i;

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('read blob failed'));
  reader.readAsDataURL(blob);
});

type AccentBucket = {
  hueVectorX: number;
  hueVectorY: number;
  satWeightedSum: number;
  lightWeightedSum: number;
  weight: number;
};

type AccentCandidate = {
  h: number;
  s: number;
  l: number;
  weight: number;
  score: number;
};

const loadImage = (src: string, options?: { crossOrigin?: 'anonymous'; referrerPolicy?: ReferrerPolicy }) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (options?.crossOrigin) img.crossOrigin = options.crossOrigin;
    if (options?.referrerPolicy) img.referrerPolicy = options.referrerPolicy;
    const timeout = window.setTimeout(() => reject(new Error('image-load-timeout')), 8000);
    img.onload = () => {
      window.clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('image-load-failed'));
    };
    img.src = src;
  });
};

const buildAccentCandidatesFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): AccentCandidate[] => {
  if (!data.length || width <= 0 || height <= 0) return [];

  const buckets = new Map<number, AccentBucket>();
  let totalWeight = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3];
      if (alpha < 220) continue;

      const { h, s, l } = rgbToHsl(data[offset], data[offset + 1], data[offset + 2]);
      if (s < 0.08 || l < 0.08 || l > 0.92) continue;

      const dx = width > 1 ? (x / (width - 1)) * 2 - 1 : 0;
      const dy = height > 1 ? (y / (height - 1)) * 2 - 1 : 0;
      const radialDistance = Math.sqrt(dx * dx + dy * dy);
      const spatialWeight = clamp(1.08 - radialDistance * 0.18, 0.82, 1.08);
      const saturationWeight = 0.6 + clamp((s - 0.08) / 0.72, 0, 1) * 0.4;
      const lightWeight = 0.65 + clamp(1 - Math.abs(l - 0.56) / 0.34, 0, 1) * 0.35;
      const weight = spatialWeight * saturationWeight * lightWeight;
      if (weight <= 0) continue;

      const bucketIndex = Math.round(normalizeHue(h) * 23) % 24;
      const bucket = buckets.get(bucketIndex) || {
        hueVectorX: 0,
        hueVectorY: 0,
        satWeightedSum: 0,
        lightWeightedSum: 0,
        weight: 0,
      };
      const angle = normalizeHue(h) * Math.PI * 2;
      bucket.hueVectorX += Math.cos(angle) * weight;
      bucket.hueVectorY += Math.sin(angle) * weight;
      bucket.satWeightedSum += s * weight;
      bucket.lightWeightedSum += l * weight;
      bucket.weight += weight;
      buckets.set(bucketIndex, bucket);
      totalWeight += weight;
    }
  }

  if (!buckets.size || totalWeight <= 0) return [];

  const candidates: AccentCandidate[] = [];

  for (const bucket of buckets.values()) {
    const avgSat = bucket.satWeightedSum / bucket.weight;
    const avgLight = bucket.lightWeightedSum / bucket.weight;
    const prominence = bucket.weight / totalWeight;
    const vividness = clamp((avgSat - 0.12) / 0.6, 0, 1);
    const lightBalance = clamp(1 - Math.abs(avgLight - 0.56) / 0.24, 0, 1);
    const score = prominence * 0.68 + vividness * 0.2 + lightBalance * 0.12;
    candidates.push({
      h: normalizeHue(Math.atan2(bucket.hueVectorY, bucket.hueVectorX) / (Math.PI * 2)),
      s: avgSat,
      l: avgLight,
      weight: prominence,
      score,
    });
  }

  return candidates.sort((left, right) => right.score - left.score);
};

const buildAccentCandidateFromHex = (hex: string, weight: number): AccentCandidate => {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const prominence = clamp(weight, 0.15, 1);
  const vividness = clamp((s - 0.12) / 0.6, 0, 1);
  const lightBalance = clamp(1 - Math.abs(l - 0.56) / 0.24, 0, 1);
  return {
    h,
    s,
    l,
    weight: prominence,
    score: prominence * 0.68 + vividness * 0.2 + lightBalance * 0.12,
  };
};

const getHueDistance = (left: number, right: number) => {
  const delta = Math.abs(left - right) % 1;
  return delta > 0.5 ? 1 - delta : delta;
};

const tuneCandidateToHex = (
  candidate: AccentCandidate,
  variant: { hueShift: number; saturationDelta: number; lightnessDelta: number },
) => {
  const saturationFloor = variant.lightnessDelta > 0 ? 0.34 : 0.42;
  const lightnessFloor = variant.lightnessDelta < 0 ? 0.34 : 0.42;
  const lightnessCeiling = variant.lightnessDelta > 0 ? 0.72 : 0.64;
  const tunedHue = normalizeHue(candidate.h + variant.hueShift);
  const tunedSaturation = clamp(
    candidate.s < 0.46
      ? candidate.s + variant.saturationDelta + 0.12
      : candidate.s + variant.saturationDelta + 0.04,
    saturationFloor,
    0.82,
  );
  const tunedLightness = clamp(
    candidate.l < 0.5
      ? candidate.l + variant.lightnessDelta + 0.06
      : candidate.l + variant.lightnessDelta - 0.02,
    lightnessFloor,
    lightnessCeiling,
  );
  return hslToHex(tunedHue, tunedSaturation, tunedLightness);
};

const buildRecommendedAccentPaletteFromCandidates = (
  candidates: AccentCandidate[],
  count = DEFAULT_WALLPAPER_ACCENT_PALETTE.length,
): string[] => {
  if (!candidates.length) return DEFAULT_WALLPAPER_ACCENT_PALETTE.slice(0, count);

  const distinctSeeds: AccentCandidate[] = [];
  for (const candidate of candidates) {
    const alreadyCovered = distinctSeeds.some((seed) => getHueDistance(seed.h, candidate.h) < 0.08);
    if (alreadyCovered) continue;
    distinctSeeds.push(candidate);
    if (distinctSeeds.length >= 3) break;
  }

  const strongest = candidates[0];
  const seeds = distinctSeeds.length ? distinctSeeds : [strongest];
  const palette: string[] = [];
  const variantRounds = [
    [
      { hueShift: 0, saturationDelta: 0.06, lightnessDelta: 0 },
      { hueShift: 0, saturationDelta: 0.03, lightnessDelta: 0 },
      { hueShift: 0, saturationDelta: 0.04, lightnessDelta: 0 },
    ],
    [
      { hueShift: 0.008, saturationDelta: -0.02, lightnessDelta: 0.1 },
      { hueShift: -0.01, saturationDelta: -0.04, lightnessDelta: 0.09 },
      { hueShift: 0.012, saturationDelta: -0.03, lightnessDelta: 0.08 },
    ],
    [
      { hueShift: -0.012, saturationDelta: 0.02, lightnessDelta: -0.08 },
      { hueShift: 0.014, saturationDelta: 0.03, lightnessDelta: -0.07 },
      { hueShift: -0.016, saturationDelta: 0.01, lightnessDelta: -0.09 },
    ],
  ];

  for (let roundIndex = 0; roundIndex < variantRounds.length && palette.length < count; roundIndex += 1) {
    for (let seedIndex = 0; seedIndex < seeds.length && palette.length < count; seedIndex += 1) {
      const seed = seeds[seedIndex] || strongest;
      const roundVariants = variantRounds[roundIndex];
      const variant = roundVariants[Math.min(seedIndex, roundVariants.length - 1)];
      const hex = tuneCandidateToHex(seed, variant);
      if (!palette.includes(hex)) palette.push(hex);
    }
  }

  let fallbackShift = 0;
  while (palette.length < count) {
    const hex = tuneCandidateToHex(strongest, {
      hueShift: round(fallbackShift % 2 === 0 ? fallbackShift * 0.018 : -fallbackShift * 0.018),
      saturationDelta: fallbackShift % 3 === 0 ? 0.04 : -0.01,
      lightnessDelta: fallbackShift % 2 === 0 ? 0.07 : -0.06,
    });
    if (!palette.includes(hex)) palette.push(hex);
    fallbackShift += 1;
  }

  return palette.slice(0, count);
};

export const buildRecommendedAccentPaletteFromHexes = (
  hexes: string[],
  count = DEFAULT_WALLPAPER_ACCENT_PALETTE.length,
): string[] => {
  const candidates = hexes
    .map((hex, index) => buildAccentCandidateFromHex(hex, Math.max(0.24, 1 - index * 0.16)))
    .sort((left, right) => right.score - left.score);
  return buildRecommendedAccentPaletteFromCandidates(candidates, count);
};

export const sampleAccentPaletteFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string[] => {
  const candidates = buildAccentCandidatesFromImageData(data, width, height);
  return buildRecommendedAccentPaletteFromCandidates(candidates);
};

export const sampleAccentFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string => sampleAccentPaletteFromImageData(data, width, height)[0] || FALLBACK_IMAGE_ACCENT;

const sampleAccentPaletteFromImage = (img: HTMLImageElement): string[] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas-context-unavailable');
  const sampleWidth = 64;
  const sampleHeight = 64;
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  return sampleAccentPaletteFromImageData(imageData.data, sampleWidth, sampleHeight);
};

const resolveImageAccentPalette = async (
  imageUrl: string,
  options?: ResolveDynamicAccentOptions,
): Promise<string[]> => {
  if (!imageUrl) return DEFAULT_WALLPAPER_ACCENT_PALETTE;
  if (!options?.forceImageResample && imageAccentPaletteCache.has(imageUrl)) {
    return imageAccentPaletteCache.get(imageUrl)!;
  }

  const trySample = async (src: string, fromRemote: boolean) => {
    const image = await loadImage(
      src,
      fromRemote ? { crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' } : undefined,
    );
    return sampleAccentPaletteFromImage(image);
  };

  try {
    const isRemote = REMOTE_URL_PATTERN.test(imageUrl);
    const palette = await trySample(imageUrl, isRemote);
    imageAccentPaletteCache.set(imageUrl, palette);
    return palette;
  } catch {
    try {
      // Fallback path for cross-origin image sampling failures:
      // fetch image bytes first, then sample from a local data URL.
      if (REMOTE_URL_PATTERN.test(imageUrl)) {
        const response = await fetch(imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          if (blob instanceof Blob && blob.size > 0) {
            const dataUrl = await blobToDataUrl(blob);
            const palette = await trySample(dataUrl, false);
            imageAccentPaletteCache.set(imageUrl, palette);
            return palette;
          }
        }
      }
    } catch {
      // Ignore and use fallback.
    }
  }

  imageAccentPaletteCache.set(imageUrl, DEFAULT_WALLPAPER_ACCENT_PALETTE);
  return DEFAULT_WALLPAPER_ACCENT_PALETTE;
};

export const resolveDynamicAccentColor = async (
  input: DynamicAccentInput,
  options?: ResolveDynamicAccentOptions,
) => {
  return resolveAccentColorSelection('dynamic', input, {
    ...options,
    isDarkTheme: false,
  });
};

export const resolveWallpaperAccentPalette = async (
  input: DynamicAccentInput,
  options?: ResolveDynamicAccentOptions,
) => {
  if (input.wallpaperMode === 'weather') {
    return buildRecommendedAccentPaletteFromHexes([resolveWeatherAccent(input.weatherCode)]);
  }
  if (input.wallpaperMode === 'color') {
    const gradient = getColorWallpaperGradient(input.colorWallpaperId || DEFAULT_COLOR_WALLPAPER_ID);
    const matches = gradient.match(/#[0-9a-fA-F]{6}/g) || [resolveColorAccent(input.colorWallpaperId)];
    return buildRecommendedAccentPaletteFromHexes(matches);
  }
  const source = resolveSourceImage(input);
  return resolveImageAccentPalette(source, options);
};

export const resolveAccentColorSelection = async (
  selection: string,
  input: DynamicAccentInput,
  options: ResolveAccentColorOptions,
) => {
  const normalizedSelection = selection.trim() || DEFAULT_ACCENT_COLOR;
  const wallpaperSlotIndex = getWallpaperAccentSlotIndex(normalizedSelection);
  if (wallpaperSlotIndex !== null || normalizedSelection === 'dynamic' || normalizedSelection === DEFAULT_ACCENT_COLOR) {
    const palette = await resolveWallpaperAccentPalette(input, options);
    const slotIndex = wallpaperSlotIndex ?? 0;
    return palette[slotIndex] || palette[0] || DEFAULT_WALLPAPER_ACCENT_PALETTE[0];
  }
  if (normalizedSelection === ADAPTIVE_NEUTRAL_ACCENT) {
    return resolveAdaptiveNeutralAccent(options.isDarkTheme);
  }
  if (isHexAccentColor(normalizedSelection)) {
    return normalizedSelection;
  }
  const legacyColor = resolveLegacyNamedAccentColor(normalizedSelection, options.isDarkTheme);
  if (legacyColor) return legacyColor;
  const palette = await resolveWallpaperAccentPalette(input, options);
  return palette[0] || DEFAULT_WALLPAPER_ACCENT_PALETTE[0];
};

export const applyDynamicAccentColor = (hex: string) => {
  const root = document.documentElement;
  const { r, g, b } = hexToRgb(hex);
  root.style.setProperty('--primary', hex);
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--primary-foreground', resolveForeground(hex));
  root.style.setProperty('--tint-rgb', `${r} ${g} ${b}`);
};

export const clearDynamicAccentColor = () => {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--tint-rgb');
};
