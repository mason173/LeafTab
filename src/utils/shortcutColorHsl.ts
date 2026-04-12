const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type ShortcutIconHsl = {
  hue: number;
  saturation: number;
  lightness: number;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);

  let hue = 0;
  switch (max) {
    case rn:
      hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
      break;
    case gn:
      hue = (bn - rn) / delta + 2;
      break;
    default:
      hue = (rn - gn) / delta + 4;
      break;
  }

  return {
    hue: (hue / 6) * 360,
    saturation,
    lightness,
  };
};

const hue2rgb = (p: number, q: number, t: number) => {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
};

const parseHexToRgb = (hex: string) => {
  const value = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(value)) return null;
  const base = value.length === 3 || value.length === 4
    ? value.slice(0, 3).split('').map((char) => char + char).join('')
    : value.slice(0, 6);
  const parsed = Number.parseInt(base, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const srgbToLinear = (channel: number) => {
  const normalized = channel / 255;
  if (normalized <= 0.04045) return normalized / 12.92;
  return ((normalized + 0.055) / 1.055) ** 2.4;
};

const getRelativeLuminance = (hex: string) => {
  const rgb = parseHexToRgb(hex);
  if (!rgb) return null;

  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getContrastRatio = (foregroundHex: string, backgroundHex: string) => {
  const foregroundLuminance = getRelativeLuminance(foregroundHex);
  const backgroundLuminance = getRelativeLuminance(backgroundHex);
  if (foregroundLuminance == null || backgroundLuminance == null) return 1;

  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const hexToShortcutIconHsl = (hex: string): ShortcutIconHsl | null => {
  const rgb = parseHexToRgb(hex);
  if (!rgb) return null;

  const converted = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    hue: Math.round(converted.hue),
    saturation: Math.round(converted.saturation * 100),
    lightness: Math.round(converted.lightness * 100),
  };
};

export const shortcutIconHslToHex = ({
  hue,
  saturation,
  lightness,
}: ShortcutIconHsl) => {
  const normalizedHue = ((hue % 360) + 360) % 360 / 360;
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const normalizedLightness = clamp(lightness, 0, 100) / 100;

  if (normalizedSaturation === 0) {
    const gray = Math.round(normalizedLightness * 255);
    const value = gray.toString(16).padStart(2, '0').toUpperCase();
    return `#${value}${value}${value}`;
  }

  const q = normalizedLightness < 0.5
    ? normalizedLightness * (1 + normalizedSaturation)
    : normalizedLightness + normalizedSaturation - normalizedLightness * normalizedSaturation;
  const p = 2 * normalizedLightness - q;
  const r = Math.round(hue2rgb(p, q, normalizedHue + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, normalizedHue) * 255);
  const b = Math.round(hue2rgb(p, q, normalizedHue - 1 / 3) * 255);

  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
};

export const normalizeShortcutIconHsl = (value: ShortcutIconHsl): ShortcutIconHsl => ({
  hue: clamp(Math.round(value.hue), 0, 360),
  saturation: clamp(Math.round(value.saturation), 0, 100),
  lightness: clamp(Math.round(value.lightness), 0, 100),
});

export const getAdaptiveShortcutForegroundColor = (backgroundHex: string) => {
  const backgroundHsl = hexToShortcutIconHsl(backgroundHex);
  if (!backgroundHsl) return '#FFFFFF';

  const isLightBackground = backgroundHsl.lightness >= 58;
  const isNearNeutral = backgroundHsl.saturation <= 8;
  let foregroundHsl: ShortcutIconHsl;

  if (isNearNeutral) {
    foregroundHsl = {
      hue: backgroundHsl.hue,
      saturation: 0,
      lightness: isLightBackground ? 28 : 94,
    };
  } else if (isLightBackground) {
    foregroundHsl = {
      hue: backgroundHsl.hue,
      saturation: clamp(Math.round(backgroundHsl.saturation * 0.72), 18, 72),
      lightness: clamp(Math.round(backgroundHsl.lightness - 46), 18, 36),
    };
  } else {
    foregroundHsl = {
      hue: backgroundHsl.hue,
      saturation: clamp(Math.round(Math.max(backgroundHsl.saturation * 0.24, 12)), 12, 42),
      lightness: clamp(Math.round(92 - backgroundHsl.lightness * 0.08), 84, 96),
    };
  }

  let normalizedForeground = normalizeShortcutIconHsl(foregroundHsl);
  let foregroundHex = shortcutIconHslToHex(normalizedForeground);
  const lightnessStep = isLightBackground ? -4 : 4;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (getContrastRatio(foregroundHex, backgroundHex) >= 4.5) break;

    const nextLightness = clamp(normalizedForeground.lightness + lightnessStep, 0, 100);
    if (nextLightness === normalizedForeground.lightness) break;

    normalizedForeground = {
      ...normalizedForeground,
      lightness: nextLightness,
    };
    foregroundHex = shortcutIconHslToHex(normalizedForeground);
  }

  return foregroundHex;
};
