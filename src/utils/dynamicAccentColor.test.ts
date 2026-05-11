import { describe, expect, it } from 'vitest';

import {
  ADAPTIVE_NEUTRAL_ACCENT,
  getContrastRatio,
  getWallpaperAccentSlotKey,
  resolveAccentDetailColor,
} from '@/utils/accentColor';
import {
  DYNAMIC_WALLPAPER_OPTIONS,
  resolveDynamicWallpaperAccentPaletteBySrc,
} from '@/components/wallpaper/dynamicWallpapers';
import {
  buildRecommendedAccentPaletteFromHexes,
  resolveAccentColorSelection,
  resolveWallpaperAccentPalette,
} from '@/utils/dynamicAccentColor';

describe('dynamic accent palette', () => {
  it('builds six recommended colors from wallpaper tones', () => {
    const palette = buildRecommendedAccentPaletteFromHexes(['#2f6fed', '#18b777', '#f59e0b']);

    expect(palette).toHaveLength(6);
    expect(new Set(palette).size).toBe(6);
    for (const color of palette) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('resolves wallpaper palette slots against the current wallpaper source', async () => {
    const first = await resolveAccentColorSelection(getWallpaperAccentSlotKey(0), {
      wallpaperMode: 'weather',
      bingWallpaper: '',
      customWallpaper: null,
      weatherCode: 0,
      colorWallpaperId: '',
    }, {
      isDarkTheme: false,
    });
    const second = await resolveAccentColorSelection(getWallpaperAccentSlotKey(1), {
      wallpaperMode: 'weather',
      bingWallpaper: '',
      customWallpaper: null,
      weatherCode: 0,
      colorWallpaperId: '',
    }, {
      isDarkTheme: false,
    });

    expect(first).toMatch(/^#[0-9a-f]{6}$/i);
    expect(second).toMatch(/^#[0-9a-f]{6}$/i);
    expect(second).not.toBe(first);
  });

  it('uses a theme-adaptive neutral fallback for the last swatch', async () => {
    const light = await resolveAccentColorSelection(ADAPTIVE_NEUTRAL_ACCENT, {
      wallpaperMode: 'weather',
      bingWallpaper: '',
      customWallpaper: null,
      weatherCode: 0,
      colorWallpaperId: '',
    }, {
      isDarkTheme: false,
    });
    const dark = await resolveAccentColorSelection(ADAPTIVE_NEUTRAL_ACCENT, {
      wallpaperMode: 'weather',
      bingWallpaper: '',
      customWallpaper: null,
      weatherCode: 0,
      colorWallpaperId: '',
    }, {
      isDarkTheme: true,
    });

    expect(light).toBe('#3f3f46');
    expect(dark).toBe('#ffffff');
  });

  it('uses precomputed palettes for built-in dynamic wallpapers', async () => {
    const dynamicWallpaper = DYNAMIC_WALLPAPER_OPTIONS[0];
    const palette = await resolveWallpaperAccentPalette({
      wallpaperMode: 'dynamic',
      bingWallpaper: '',
      customWallpaper: null,
      weatherCode: 0,
      dynamicWallpaperSrc: dynamicWallpaper.src,
    });

    expect(palette).toEqual(resolveDynamicWallpaperAccentPaletteBySrc(dynamicWallpaper.src));
    expect(palette).toHaveLength(6);
  });

  it('picks a same-family detail color with visible contrast for swatch chrome', () => {
    const mediumBlueDetail = resolveAccentDetailColor('#3b82f6');
    const lightDetail = resolveAccentDetailColor('#ffffff');
    const darkDetail = resolveAccentDetailColor('#3f3f46');

    expect(getContrastRatio(mediumBlueDetail, '#3b82f6')).toBeGreaterThanOrEqual(2.4);
    expect(getContrastRatio(lightDetail, '#ffffff')).toBeGreaterThanOrEqual(2.4);
    expect(getContrastRatio(darkDetail, '#3f3f46')).toBeGreaterThanOrEqual(2.4);
  });
});
