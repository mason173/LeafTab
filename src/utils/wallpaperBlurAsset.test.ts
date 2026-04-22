import { describe, expect, it } from 'vitest';
import {
  buildBlurredWallpaperCacheKey,
  normalizeWallpaperLighting,
  resolveAverageWallpaperLuminance,
  resolveBlurredWallpaperDimensions,
} from '@/utils/wallpaperBlurAsset';

describe('resolveBlurredWallpaperDimensions', () => {
  it('caps the rendered asset size for large viewports', () => {
    const result = resolveBlurredWallpaperDimensions({
      viewportWidth: 2560,
      viewportHeight: 1440,
    });

    expect(result.outputWidth).toBe(1280);
    expect(result.outputHeight).toBe(720);
    expect(result.sampleWidth).toBeGreaterThanOrEqual(128);
    expect(result.sampleHeight).toBeGreaterThanOrEqual(128);
    expect(result.sampleWidth).toBeLessThan(result.outputWidth);
    expect(result.sampleHeight).toBeLessThan(result.outputHeight);
  });

  it('keeps small viewports above the minimum output edge', () => {
    const result = resolveBlurredWallpaperDimensions({
      viewportWidth: 320,
      viewportHeight: 180,
    });

    expect(result.outputWidth).toBeGreaterThanOrEqual(180);
    expect(result.outputHeight).toBeGreaterThanOrEqual(180);
  });
});

describe('buildBlurredWallpaperCacheKey', () => {
  it('changes when the source changes', () => {
    const first = buildBlurredWallpaperCacheKey({
      src: 'wallpaper-a',
      viewportWidth: 1600,
      viewportHeight: 900,
    });
    const second = buildBlurredWallpaperCacheKey({
      src: 'wallpaper-b',
      viewportWidth: 1600,
      viewportHeight: 900,
    });

    expect(first).not.toBe(second);
  });

  it('reuses the same cache key for viewports that collapse to the same output size', () => {
    const first = buildBlurredWallpaperCacheKey({
      src: 'wallpaper-a',
      viewportWidth: 1600,
      viewportHeight: 900,
    });
    const second = buildBlurredWallpaperCacheKey({
      src: 'wallpaper-a',
      viewportWidth: 1280,
      viewportHeight: 720,
    });

    expect(first).toBe(second);
  });
});

describe('resolveAverageWallpaperLuminance', () => {
  it('returns a brighter luminance for lighter samples', () => {
    const dark = resolveAverageWallpaperLuminance(new Uint8ClampedArray([
      16, 18, 24, 255,
      20, 22, 28, 255,
    ]));
    const light = resolveAverageWallpaperLuminance(new Uint8ClampedArray([
      240, 242, 246, 255,
      248, 250, 252, 255,
    ]));

    expect(light).toBeGreaterThan(dark);
    expect(light).toBeLessThanOrEqual(1);
    expect(dark).toBeGreaterThanOrEqual(0);
  });
});

describe('normalizeWallpaperLighting', () => {
  it('pulls darker and brighter wallpapers closer to a shared brightness band', () => {
    const darkWarmWallpaper = new Uint8ClampedArray([
      46, 34, 18, 255,
      58, 40, 22, 255,
      72, 50, 28, 255,
      86, 62, 34, 255,
    ]);
    const brightWarmWallpaper = new Uint8ClampedArray([
      238, 212, 162, 255,
      246, 220, 170, 255,
      232, 205, 156, 255,
      250, 226, 178, 255,
    ]);

    const beforeDark = resolveAverageWallpaperLuminance(darkWarmWallpaper);
    const beforeBright = resolveAverageWallpaperLuminance(brightWarmWallpaper);
    const afterDark = resolveAverageWallpaperLuminance(normalizeWallpaperLighting(darkWarmWallpaper));
    const afterBright = resolveAverageWallpaperLuminance(normalizeWallpaperLighting(brightWarmWallpaper));

    expect(Math.abs(afterBright - afterDark)).toBeLessThan(Math.abs(beforeBright - beforeDark));
  });

  it('keeps the original warm color tendency after normalization', () => {
    const wallpaper = new Uint8ClampedArray([
      190, 132, 74, 255,
      176, 120, 66, 255,
      164, 110, 58, 255,
      202, 144, 88, 255,
    ]);

    const normalized = normalizeWallpaperLighting(wallpaper);
    expect(normalized[0]).toBeGreaterThan(normalized[1]);
    expect(normalized[1]).toBeGreaterThan(normalized[2]);
    expect(normalized[4]).toBeGreaterThan(normalized[5]);
    expect(normalized[5]).toBeGreaterThan(normalized[6]);
  });
});
