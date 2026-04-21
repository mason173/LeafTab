import { useEffect, useMemo, useState } from 'react';
import {
  buildBlurredWallpaperCacheKey,
  generateBlurredWallpaperAsset,
} from '@/utils/wallpaperBlurAsset';

type UseBlurredWallpaperAssetOptions = {
  sourceUrl: string;
  enabled: boolean;
};

type ViewportSize = {
  width: number;
  height: number;
};

function readViewportSize(): ViewportSize {
  if (typeof window === 'undefined') {
    return {
      width: 1280,
      height: 720,
    };
  }

  return {
    width: Math.max(1, Math.round(window.innerWidth)),
    height: Math.max(1, Math.round(window.innerHeight)),
  };
}

export function useBlurredWallpaperAsset({
  sourceUrl,
  enabled,
}: UseBlurredWallpaperAssetOptions) {
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => readViewportSize());
  const [blurredWallpaperSrc, setBlurredWallpaperSrc] = useState('');
  const [resolvedCacheKey, setResolvedCacheKey] = useState('');
  const normalizedSourceUrl = sourceUrl.trim();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let rafId = 0;
    const handleResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setViewportSize((current) => {
          const next = readViewportSize();
          if (current.width === next.width && current.height === next.height) {
            return current;
          }
          return next;
        });
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const nextCacheKey = useMemo(() => {
    if (!enabled || !normalizedSourceUrl) return '';
    return buildBlurredWallpaperCacheKey({
      src: normalizedSourceUrl,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
    });
  }, [enabled, normalizedSourceUrl, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!enabled || !normalizedSourceUrl) {
      setBlurredWallpaperSrc('');
      setResolvedCacheKey('');
      return;
    }

    let cancelled = false;
    void generateBlurredWallpaperAsset({
      src: normalizedSourceUrl,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
    }).then((asset) => {
      if (cancelled || !asset) return;
      setBlurredWallpaperSrc(asset.objectUrl);
      setResolvedCacheKey(asset.cacheKey);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, normalizedSourceUrl, viewportSize.height, viewportSize.width]);

  return {
    blurredWallpaperSrc,
    blurredWallpaperReady: nextCacheKey !== '' && resolvedCacheKey === nextCacheKey && blurredWallpaperSrc !== '',
  };
}
