import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { WallpaperMode } from '@/wallpaper/types';
import {
  LIMESTART_WALLPAPER_OPACITY_DURATION_MS,
  LIMESTART_WALLPAPER_REVEAL_DELAY_MS,
  WALLPAPER_INITIAL_SCALE,
} from '@/config/animationTokens';

interface UseWallpaperRevealControllerOptions {
  wallpaperMode: WallpaperMode;
  overlayBackgroundImageSrc: string;
  usesImageWallpaperLayer: boolean;
  showOverlayWallpaperLayer: boolean;
  hasWeatherVisual: boolean;
  disableRevealAnimation?: boolean;
}

interface UseWallpaperRevealControllerResult {
  effectiveOverlayWallpaperSrc: string;
  wallpaperAnimatedLayerStyle: CSSProperties;
  handleOverlayImageReady: () => void;
}

export function useWallpaperRevealController({
  wallpaperMode,
  overlayBackgroundImageSrc,
  usesImageWallpaperLayer,
  showOverlayWallpaperLayer,
  hasWeatherVisual,
  disableRevealAnimation = false,
}: UseWallpaperRevealControllerOptions): UseWallpaperRevealControllerResult {
  const [wallpaperImageLoaded, setWallpaperImageLoaded] = useState(false);
  const [wallpaperRevealReady, setWallpaperRevealReady] = useState(false);
  const [displayedOverlayWallpaperSrc, setDisplayedOverlayWallpaperSrc] = useState('');
  const [hasLoadedOverlayWallpaperOnce, setHasLoadedOverlayWallpaperOnce] = useState(false);
  const wallpaperBootRevealStartedRef = useRef(false);
  const wallpaperRevealTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (wallpaperRevealTimerRef.current !== null) window.clearTimeout(wallpaperRevealTimerRef.current);
  }, []);

  useEffect(() => {
    if (!usesImageWallpaperLayer || !overlayBackgroundImageSrc) {
      setDisplayedOverlayWallpaperSrc('');
      setWallpaperImageLoaded(true);
      return;
    }
    if (!hasLoadedOverlayWallpaperOnce || !displayedOverlayWallpaperSrc) {
      setDisplayedOverlayWallpaperSrc(overlayBackgroundImageSrc);
      setWallpaperImageLoaded(false);
      return;
    }
    if (overlayBackgroundImageSrc === displayedOverlayWallpaperSrc) return;

    let cancelled = false;
    const preloader = new window.Image();
    preloader.onload = () => {
      if (cancelled) return;
      setDisplayedOverlayWallpaperSrc(overlayBackgroundImageSrc);
    };
    preloader.onerror = () => {
      if (cancelled) return;
      // Keep currently displayed wallpaper to avoid visual flashes.
    };
    preloader.src = overlayBackgroundImageSrc;

    return () => {
      cancelled = true;
      preloader.onload = null;
      preloader.onerror = null;
    };
  }, [displayedOverlayWallpaperSrc, hasLoadedOverlayWallpaperOnce, overlayBackgroundImageSrc, usesImageWallpaperLayer]);

  useEffect(() => {
    if (disableRevealAnimation) {
      setWallpaperRevealReady(true);
      return;
    }
    const hasOverlayWallpaperVisual = wallpaperMode === 'weather'
      ? hasWeatherVisual
      : wallpaperMode === 'color'
          ? true
          : Boolean(displayedOverlayWallpaperSrc || overlayBackgroundImageSrc);
    const wallpaperVisualReady = usesImageWallpaperLayer
      ? hasOverlayWallpaperVisual && wallpaperImageLoaded
      : hasOverlayWallpaperVisual;
    if (!showOverlayWallpaperLayer || !hasOverlayWallpaperVisual || !wallpaperVisualReady) return;
    if (wallpaperBootRevealStartedRef.current) return;

    wallpaperBootRevealStartedRef.current = true;
    setWallpaperRevealReady(false);

    wallpaperRevealTimerRef.current = window.setTimeout(() => {
      setWallpaperRevealReady(true);
      wallpaperRevealTimerRef.current = null;
    }, LIMESTART_WALLPAPER_REVEAL_DELAY_MS);
  }, [
    disableRevealAnimation,
    displayedOverlayWallpaperSrc,
    hasWeatherVisual,
    overlayBackgroundImageSrc,
    showOverlayWallpaperLayer,
    usesImageWallpaperLayer,
    wallpaperImageLoaded,
    wallpaperMode,
  ]);

  const handleOverlayImageReady = useCallback(() => {
    setWallpaperImageLoaded(true);
    setHasLoadedOverlayWallpaperOnce(true);
  }, []);

  const effectiveOverlayWallpaperSrc = displayedOverlayWallpaperSrc || overlayBackgroundImageSrc;
  const wallpaperAnimatedLayerStyle = useMemo<CSSProperties>(() => {
    const wallpaperRevealOpacity = wallpaperRevealReady ? 1 : 0;

    if (disableRevealAnimation) {
      return {
        opacity: 1,
        filter: 'none',
        transform: `scale(${WALLPAPER_INITIAL_SCALE})`,
        transformOrigin: 'center center',
        transition: 'none',
      };
    }

    return {
      opacity: wallpaperRevealOpacity,
      filter: 'none',
      transform: `scale(${WALLPAPER_INITIAL_SCALE})`,
      transformOrigin: 'center center',
      transition: `opacity ${LIMESTART_WALLPAPER_OPACITY_DURATION_MS}ms linear`,
    };
  }, [disableRevealAnimation, wallpaperRevealReady]);

  return {
    effectiveOverlayWallpaperSrc,
    wallpaperAnimatedLayerStyle,
    handleOverlayImageReady,
  };
}
