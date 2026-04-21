import { describe, expect, it } from 'vitest';
import {
  buildBlurredWallpaperCacheKey,
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
