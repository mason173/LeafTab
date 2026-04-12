import { describe, expect, it } from 'vitest';
import {
  getAdaptiveShortcutForegroundColor,
  hexToShortcutIconHsl,
  normalizeShortcutIconHsl,
  shortcutIconHslToHex,
} from '@/utils/shortcutColorHsl';

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  const parsed = Number.parseInt(value, 16);
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

const getContrastRatio = (foregroundHex: string, backgroundHex: string) => {
  const foreground = hexToRgb(foregroundHex);
  const background = hexToRgb(backgroundHex);
  const foregroundLuminance = (
    0.2126 * srgbToLinear(foreground.r)
    + 0.7152 * srgbToLinear(foreground.g)
    + 0.0722 * srgbToLinear(foreground.b)
  );
  const backgroundLuminance = (
    0.2126 * srgbToLinear(background.r)
    + 0.7152 * srgbToLinear(background.g)
    + 0.0722 * srgbToLinear(background.b)
  );
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('shortcutColorHsl', () => {
  it('converts hex colors into editable HSL slider values', () => {
    expect(hexToShortcutIconHsl('#F4E300')).toEqual({
      hue: 56,
      saturation: 100,
      lightness: 48,
    });
    expect(hexToShortcutIconHsl('#12ab90ff')).toEqual({
      hue: 169,
      saturation: 81,
      lightness: 37,
    });
  });

  it('converts slider values back into uppercase hex', () => {
    expect(shortcutIconHslToHex({
      hue: 210,
      saturation: 70,
      lightness: 56,
    })).toBe('#408FDD');
  });

  it('clamps slider values into the supported ranges', () => {
    expect(normalizeShortcutIconHsl({
      hue: 420,
      saturation: -10,
      lightness: 120,
    })).toEqual({
      hue: 360,
      saturation: 0,
      lightness: 100,
    });
  });

  it('derives a darker tinted foreground for light backgrounds', () => {
    const background = '#FFF2A8';
    const foreground = getAdaptiveShortcutForegroundColor(background);
    const backgroundHsl = hexToShortcutIconHsl(background);
    const foregroundHsl = hexToShortcutIconHsl(foreground);

    expect(backgroundHsl).not.toBeNull();
    expect(foregroundHsl).not.toBeNull();
    expect(foregroundHsl?.lightness).toBeLessThan(backgroundHsl?.lightness ?? 100);
    expect(Math.abs((foregroundHsl?.hue ?? 0) - (backgroundHsl?.hue ?? 0))).toBeLessThanOrEqual(2);
    expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('derives a brighter tinted foreground for dark backgrounds', () => {
    const background = '#8F5A00';
    const foreground = getAdaptiveShortcutForegroundColor(background);
    const backgroundHsl = hexToShortcutIconHsl(background);
    const foregroundHsl = hexToShortcutIconHsl(foreground);

    expect(backgroundHsl).not.toBeNull();
    expect(foregroundHsl).not.toBeNull();
    expect(foregroundHsl?.lightness).toBeGreaterThan(backgroundHsl?.lightness ?? 0);
    expect(foregroundHsl?.saturation).toBeLessThan(backgroundHsl?.saturation ?? 100);
    expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
