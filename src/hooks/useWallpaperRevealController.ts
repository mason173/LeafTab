import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { WallpaperMode } from '@/wallpaper/types';
import {
  WALLPAPER_COLOR_REVEAL_DELAY_MS,
  WALLPAPER_COLOR_REVEAL_DURATION_MS,
  WALLPAPER_FADE_REVEAL_DURATION_MS,
  WALLPAPER_INITIAL_REVEAL_OPACITY,
  WALLPAPER_INITIAL_SCALE,
  WALLPAPER_SCALE_REVEAL_DURATION_MS,
} from '@/config/animationTokens';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

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
  const firefox = isFirefoxBuildTarget();
  const [wallpaperImageLoaded, setWallpaperImageLoaded] = useState(false);
  const [wallpaperFadeRevealReady, setWallpaperFadeRevealReady] = useState(false);
  const [wallpaperColorRevealReady, setWallpaperColorRevealReady] = useState(false);
  const [displayedOverlayWallpaperSrc, setDisplayedOverlayWallpaperSrc] = useState('');
  const [hasLoadedOverlayWallpaperOnce, setHasLoadedOverlayWallpaperOnce] = useState(false);
  const wallpaperBootRevealStartedRef = useRef(false);
  const wallpaperFadeRafRef = useRef<number | null>(null);
  const wallpaperColorTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (wallpaperFadeRafRef.current !== null) window.cancelAnimationFrame(wallpaperFadeRafRef.current);
    if (wallpaperColorTimerRef.current !== null) window.clearTimeout(wallpaperColorTimerRef.current);
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
      setWallpaperFadeRevealReady(true);
      setWallpaperColorRevealReady(true);
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
    setWallpaperFadeRevealReady(false);
    setWallpaperColorRevealReady(firefox);

    wallpaperFadeRafRef.current = window.requestAnimationFrame(() => {
      setWallpaperFadeRevealReady(true);
      wallpaperFadeRafRef.current = null;
    });
    if (firefox) return;
    wallpaperColorTimerRef.current = window.setTimeout(() => {
      setWallpaperColorRevealReady(true);
      wallpaperColorTimerRef.current = null;
    }, WALLPAPER_COLOR_REVEAL_DELAY_MS);
  }, [
    disableRevealAnimation,
    displayedOverlayWallpaperSrc,
    firefox,
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
    if (disableRevealAnimation) {
      return {
        opacity: 1,
        filter: 'none',
        transform: 'scale(1)',
        transformOrigin: 'center center',
        transition: 'none',
      };
    }
    if (firefox) {
      const wallpaperRevealOpacity = wallpaperFadeRevealReady ? 1 : WALLPAPER_INITIAL_REVEAL_OPACITY;
      return {
        opacity: wallpaperRevealOpacity,
        filter: 'none',
        transform: 'scale(1)',
        transformOrigin: 'center center',
        transition: `opacity ${WALLPAPER_FADE_REVEAL_DURATION_MS}ms linear`,
      };
    }
    const wallpaperImageRevealOpacity = wallpaperFadeRevealReady ? 1 : WALLPAPER_INITIAL_REVEAL_OPACITY;
    const wallpaperImageRevealFilter = wallpaperColorRevealReady
      ? 'grayscale(0) saturate(1) brightness(1)'
      : 'grayscale(1) saturate(0) brightness(1)';
    const wallpaperImageRevealScale = wallpaperFadeRevealReady ? 1 : WALLPAPER_INITIAL_SCALE;
    return {
      opacity: wallpaperImageRevealOpacity,
      filter: wallpaperImageRevealFilter,
      transform: `scale(${wallpaperImageRevealScale})`,
      transformOrigin: 'center center',
      transition: `opacity ${WALLPAPER_FADE_REVEAL_DURATION_MS}ms linear, transform ${WALLPAPER_SCALE_REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${WALLPAPER_COLOR_REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${WALLPAPER_COLOR_REVEAL_DELAY_MS}ms`,
    };
  }, [disableRevealAnimation, firefox, wallpaperColorRevealReady, wallpaperFadeRevealReady]);

  return {
    effectiveOverlayWallpaperSrc,
    wallpaperAnimatedLayerStyle,
    handleOverlayImageReady,
  };
}
