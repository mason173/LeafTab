type WallpaperMode = 'bing' | 'weather' | 'custom';

type DynamicAccentInput = {
  wallpaperMode: WallpaperMode;
  bingWallpaper: string;
  customWallpaper: string | null;
  weatherCode: number;
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

const resolveImageAccent = (imageUrl: string): Promise<string> => {
  if (!imageUrl) return Promise.resolve('#3b82f6');
  if (imageAccentCache.has(imageUrl)) return Promise.resolve(imageAccentCache.get(imageUrl)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve('#3b82f6');
        return;
      }
      const sampleWidth = 48;
      const sampleHeight = 48;
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
      const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
      let bestHue = 0.58;
      let bestSat = 0.72;
      let bestLight = 0.55;
      let bestScore = -1;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 220) continue;
        const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        if (s < 0.15 || l < 0.08 || l > 0.92) continue;
        const score = s * 0.78 + (1 - Math.abs(l - 0.52)) * 0.22;
        if (score > bestScore) {
          bestScore = score;
          bestHue = h;
          bestSat = s;
          bestLight = l;
        }
      }
      const saturated = clamp(Math.max(0.58, bestSat), 0.58, 0.82);
      const light = clamp(bestLight < 0.5 ? bestLight + 0.06 : bestLight - 0.02, 0.45, 0.62);
      const accent = hslToHex(bestHue, saturated, light);
      imageAccentCache.set(imageUrl, accent);
      resolve(accent);
    };
    img.onerror = () => resolve('#3b82f6');
    img.src = imageUrl;
  });
};

export const resolveDynamicAccentColor = async (input: DynamicAccentInput) => {
  if (input.wallpaperMode === 'weather') return resolveWeatherAccent(input.weatherCode);
  const source = resolveSourceImage(input);
  return resolveImageAccent(source);
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
