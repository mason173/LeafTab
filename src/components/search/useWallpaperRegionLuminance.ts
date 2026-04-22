import { useEffect, useState } from 'react';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { useLiveViewportRect } from '@/hooks/useLiveViewportRect';

const REGION_SAMPLE_SIZE_PX = 24;

const imagePromiseCache = new Map<string, Promise<HTMLImageElement | null>>();

export type WallpaperRegionLuminance = {
  average: number;
  p15: number;
  p85: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function srgbChannelToLinear(channel: number) {
  const normalized = clamp01(channel / 255);
  if (normalized <= 0.04045) return normalized / 12.92;
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function resolveRelativeLuminance(red: number, green: number, blue: number) {
  return (
    (0.2126 * srgbChannelToLinear(red))
    + (0.7152 * srgbChannelToLinear(green))
    + (0.0722 * srgbChannelToLinear(blue))
  );
}

function resolvePercentile(sortedValues: Float32Array, percentile: number) {
  if (!sortedValues.length) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.round((sortedValues.length - 1) * clamp01(percentile))),
  );
  return sortedValues[index];
}

function resolveLuminanceStats(pixelData: Uint8ClampedArray | Uint8Array): WallpaperRegionLuminance | null {
  if (!pixelData.length) return null;

  const sampleCount = Math.floor(pixelData.length / 4);
  if (sampleCount <= 0) return null;

  const luminanceSamples = new Float32Array(sampleCount);
  let luminanceSum = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const offset = sampleIndex * 4;
    const luminance = resolveRelativeLuminance(
      pixelData[offset],
      pixelData[offset + 1],
      pixelData[offset + 2],
    );
    luminanceSamples[sampleIndex] = luminance;
    luminanceSum += luminance;
  }

  const sortedLuminanceSamples = Float32Array.from(luminanceSamples).sort();
  return {
    average: clamp01(luminanceSum / sampleCount),
    p15: clamp01(resolvePercentile(sortedLuminanceSamples, 0.15)),
    p85: clamp01(resolvePercentile(sortedLuminanceSamples, 0.85)),
  };
}

function loadImage(src: string) {
  const cached = imagePromiseCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

  imagePromiseCache.set(src, promise);
  return promise;
}

export function useWallpaperRegionLuminance(surfaceNode: HTMLElement | null, enabled = true) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const viewportRect = useLiveViewportRect(surfaceNode, enabled && Boolean(wallpaperBackdrop?.blurredWallpaperSrc));
  const [luminance, setLuminance] = useState<WallpaperRegionLuminance | null>(() => {
    const fallback = wallpaperBackdrop?.blurredWallpaperAverageLuminance;
    if (typeof fallback !== 'number' || !Number.isFinite(fallback)) return null;
    const safeFallback = clamp01(fallback);
    return {
      average: safeFallback,
      p15: safeFallback,
      p85: safeFallback,
    };
  });

  useEffect(() => {
    let disposed = false;

    if (!enabled) {
      setLuminance(null);
      return () => {
        disposed = true;
      };
    }

    const fallbackLuminance = wallpaperBackdrop?.blurredWallpaperAverageLuminance;
    const fallbackStats = typeof fallbackLuminance === 'number' && Number.isFinite(fallbackLuminance)
      ? {
          average: clamp01(fallbackLuminance),
          p15: clamp01(fallbackLuminance),
          p85: clamp01(fallbackLuminance),
        }
      : null;
    const imageSrc = wallpaperBackdrop?.blurredWallpaperSrc;

    if (!imageSrc || !viewportRect || typeof document === 'undefined' || typeof window === 'undefined') {
      setLuminance(fallbackStats);
      return () => {
        disposed = true;
      };
    }

    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const clippedLeft = Math.min(viewportWidth, Math.max(0, viewportRect.left));
    const clippedTop = Math.min(viewportHeight, Math.max(0, viewportRect.top));
    const clippedRight = Math.min(viewportWidth, Math.max(clippedLeft + 1, viewportRect.left + viewportRect.width));
    const clippedBottom = Math.min(viewportHeight, Math.max(clippedTop + 1, viewportRect.top + viewportRect.height));

    loadImage(imageSrc).then((image) => {
      if (disposed) return;
      if (!image) {
        setLuminance(fallbackStats);
        return;
      }

      const normalizedLeft = clamp01(clippedLeft / viewportWidth);
      const normalizedTop = clamp01(clippedTop / viewportHeight);
      const normalizedRight = clamp01(clippedRight / viewportWidth);
      const normalizedBottom = clamp01(clippedBottom / viewportHeight);
      const sourceX = Math.floor(image.width * normalizedLeft);
      const sourceY = Math.floor(image.height * normalizedTop);
      const sourceWidth = Math.max(1, Math.ceil(image.width * Math.max(0.01, normalizedRight - normalizedLeft)));
      const sourceHeight = Math.max(1, Math.ceil(image.height * Math.max(0.01, normalizedBottom - normalizedTop)));

      const canvas = document.createElement('canvas');
      canvas.width = REGION_SAMPLE_SIZE_PX;
      canvas.height = REGION_SAMPLE_SIZE_PX;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        setLuminance(fallbackStats);
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        REGION_SAMPLE_SIZE_PX,
        REGION_SAMPLE_SIZE_PX,
      );

      const sampledPixels = context.getImageData(0, 0, REGION_SAMPLE_SIZE_PX, REGION_SAMPLE_SIZE_PX).data;
      setLuminance(resolveLuminanceStats(sampledPixels) ?? fallbackStats);
    });

    return () => {
      disposed = true;
    };
  }, [
    enabled,
    viewportRect?.left,
    viewportRect?.top,
    viewportRect?.width,
    viewportRect?.height,
    wallpaperBackdrop?.blurredWallpaperAverageLuminance,
    wallpaperBackdrop?.blurredWallpaperSrc,
  ]);

  return luminance;
}
