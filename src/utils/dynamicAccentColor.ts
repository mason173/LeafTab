import { DEFAULT_COLOR_WALLPAPER_ID, getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
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

const imageAccentCache = new Map<string, string>();

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

export const sampleAccentFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string => {
  if (!data.length || width <= 0 || height <= 0) return FALLBACK_IMAGE_ACCENT;

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

  if (!buckets.size || totalWeight <= 0) return FALLBACK_IMAGE_ACCENT;

  let bestHue = 0.58;
  let bestSat = 0.68;
  let bestLight = 0.54;
  let bestScore = -1;

  for (const bucket of buckets.values()) {
    const avgSat = bucket.satWeightedSum / bucket.weight;
    const avgLight = bucket.lightWeightedSum / bucket.weight;
    const prominence = bucket.weight / totalWeight;
    const vividness = clamp((avgSat - 0.12) / 0.6, 0, 1);
    const lightBalance = clamp(1 - Math.abs(avgLight - 0.56) / 0.24, 0, 1);
    const score = prominence * 0.68 + vividness * 0.2 + lightBalance * 0.12;

    if (score > bestScore) {
      bestScore = score;
      bestHue = normalizeHue(Math.atan2(bucket.hueVectorY, bucket.hueVectorX) / (Math.PI * 2));
      bestSat = avgSat;
      bestLight = avgLight;
    }
  }

  const tunedSaturation = clamp(bestSat < 0.46 ? bestSat + 0.16 : bestSat + 0.08, 0.46, 0.76);
  const tunedLightness = clamp(bestLight < 0.5 ? bestLight + 0.05 : bestLight - 0.03, 0.44, 0.6);
  return hslToHex(bestHue, tunedSaturation, tunedLightness);
};

const sampleAccentFromImage = (img: HTMLImageElement): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas-context-unavailable');
  const sampleWidth = 64;
  const sampleHeight = 64;
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  return sampleAccentFromImageData(imageData.data, sampleWidth, sampleHeight);
};

const resolveImageAccent = async (
  imageUrl: string,
  options?: ResolveDynamicAccentOptions,
): Promise<string> => {
  if (!imageUrl) return FALLBACK_IMAGE_ACCENT;
  if (!options?.forceImageResample && imageAccentCache.has(imageUrl)) {
    return imageAccentCache.get(imageUrl)!;
  }

  const trySample = async (src: string, fromRemote: boolean) => {
    const image = await loadImage(
      src,
      fromRemote ? { crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' } : undefined,
    );
    return sampleAccentFromImage(image);
  };

  try {
    const isRemote = REMOTE_URL_PATTERN.test(imageUrl);
    const accent = await trySample(imageUrl, isRemote);
    imageAccentCache.set(imageUrl, accent);
    return accent;
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
            const accent = await trySample(dataUrl, false);
            imageAccentCache.set(imageUrl, accent);
            return accent;
          }
        }
      }
    } catch {
      // Ignore and use fallback.
    }
  }

  imageAccentCache.set(imageUrl, FALLBACK_IMAGE_ACCENT);
  return FALLBACK_IMAGE_ACCENT;
};

export const resolveDynamicAccentColor = async (
  input: DynamicAccentInput,
  options?: ResolveDynamicAccentOptions,
) => {
  if (input.wallpaperMode === 'weather') return resolveWeatherAccent(input.weatherCode);
  if (input.wallpaperMode === 'color') return resolveColorAccent(input.colorWallpaperId);
  const source = resolveSourceImage(input);
  return resolveImageAccent(source, options);
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
