import { useMemo } from 'react';
import { resolveSearchBarTheme } from '@/components/search/searchBarTheme';
import { useWallpaperRegionLuminance } from '@/components/search/useWallpaperRegionLuminance';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

type UseDrawerAdaptiveShortcutForceWhiteTextParams = {
  surfaceNode: HTMLElement | null;
  enabled: boolean;
  overlayOpacity: number;
  fallbackForceWhiteText: boolean;
};

export function useDrawerAdaptiveShortcutForceWhiteText({
  surfaceNode,
  enabled,
  overlayOpacity,
  fallbackForceWhiteText,
}: UseDrawerAdaptiveShortcutForceWhiteTextParams) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const regionLuminance = useWallpaperRegionLuminance(surfaceNode, enabled);

  return useMemo(() => {
    if (!enabled || !regionLuminance) {
      return fallbackForceWhiteText;
    }

    const wallpaperMaskOpacity = clamp01((wallpaperBackdrop?.effectiveWallpaperMaskOpacity ?? 0) / 100);
    const luminanceMultiplier = (1 - wallpaperMaskOpacity) * (1 - clamp01(overlayOpacity));
    const adjustedAverage = clamp01(regionLuminance.average * luminanceMultiplier);
    const adjustedDarkest = clamp01(regionLuminance.p15 * luminanceMultiplier);
    const adjustedBrightest = clamp01(regionLuminance.p85 * luminanceMultiplier);
    const adaptiveTheme = resolveSearchBarTheme({
      backgroundLuminance: adjustedAverage,
      backgroundLuminanceRange: {
        darkest: adjustedDarkest,
        brightest: adjustedBrightest,
      },
    });

    return !adaptiveTheme.surfaceClassName.includes('text-black');
  }, [
    enabled,
    fallbackForceWhiteText,
    overlayOpacity,
    regionLuminance,
    wallpaperBackdrop?.effectiveWallpaperMaskOpacity,
  ]);
}
