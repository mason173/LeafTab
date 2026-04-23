import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { resolveSearchBarTheme, type SearchBarTheme } from '@/components/search/searchBarTheme';
import { useWallpaperRegionLuminance } from '@/components/search/useWallpaperRegionLuminance';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';

export type FrostedSurfaceForegroundTone = 'dark' | 'light';

type FrostedSurfaceThemeOptions = {
  surfaceNode: HTMLElement | null;
  surfaceTone?: 'default' | 'drawer';
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
};

export function useFrostedSurfaceTheme({
  surfaceNode,
  surfaceTone = 'default',
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
}: FrostedSurfaceThemeOptions): {
  theme: SearchBarTheme;
  foregroundTone: FrostedSurfaceForegroundTone;
} {
  const { resolvedTheme } = useTheme();
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const regionLuminance = useWallpaperRegionLuminance(surfaceNode, surfaceTone !== 'drawer');

  const backgroundLuminanceStats = useMemo(() => {
    if (surfaceTone === 'drawer') {
      return {
        average: 0,
        p15: 0,
        p85: 0,
      };
    }

    if (!regionLuminance) {
      return null;
    }

    const maskOpacity = Math.max(0, Math.min(1, (wallpaperBackdrop?.effectiveWallpaperMaskOpacity ?? 0) / 100));
    const maskMultiplier = 1 - maskOpacity;
    return {
      average: regionLuminance.average * maskMultiplier,
      p15: regionLuminance.p15 * maskMultiplier,
      p85: regionLuminance.p85 * maskMultiplier,
    };
  }, [
    regionLuminance,
    surfaceTone,
    wallpaperBackdrop?.effectiveWallpaperMaskOpacity,
  ]);

  const backgroundLuminanceRange = useMemo(() => (
    backgroundLuminanceStats
      ? {
          darkest: backgroundLuminanceStats.p15,
          brightest: backgroundLuminanceStats.p85,
        }
      : null
  ), [backgroundLuminanceStats]);

  const theme = useMemo(() => resolveSearchBarTheme({
    blankMode,
    forceWhiteTheme,
    subtleDarkTone,
    resolvedTheme,
    backgroundLuminance: backgroundLuminanceStats?.average ?? null,
    backgroundLuminanceRange,
  }), [
    backgroundLuminanceRange,
    backgroundLuminanceStats?.average,
    blankMode,
    forceWhiteTheme,
    resolvedTheme,
    subtleDarkTone,
  ]);

  return {
    theme,
    foregroundTone: theme.surfaceClassName.includes('text-black') ? 'dark' : 'light',
  };
}
