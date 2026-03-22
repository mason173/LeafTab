import { useMemo } from 'react';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

export type VisualEffectsLevel = 'low' | 'medium' | 'high';

export interface VisualEffectsPolicy {
  disableInitialRevealMotion: boolean;
  disableWallpaperRevealMotion: boolean;
  disableBackdropBlur: boolean;
  freezeDynamicWallpaper: boolean;
  disableShortcutReorderMotion: boolean;
  disableSecondTickMotion: boolean;
  disableSyncCardAccentAnimation: boolean;
}

export function useVisualEffectsPolicy(level: VisualEffectsLevel): VisualEffectsPolicy {
  const firefox = isFirefoxBuildTarget();

  return useMemo(() => {
    if (level === 'high') {
      return {
        disableInitialRevealMotion: false,
        disableWallpaperRevealMotion: firefox,
        disableBackdropBlur: firefox,
        freezeDynamicWallpaper: false,
        disableShortcutReorderMotion: false,
        disableSecondTickMotion: false,
        disableSyncCardAccentAnimation: firefox,
      };
    }

    if (level === 'medium') {
      return {
        disableInitialRevealMotion: false,
        disableWallpaperRevealMotion: firefox,
        disableBackdropBlur: true,
        freezeDynamicWallpaper: true,
        disableShortcutReorderMotion: firefox,
        disableSecondTickMotion: false,
        disableSyncCardAccentAnimation: true,
      };
    }

    return {
      disableInitialRevealMotion: true,
      disableWallpaperRevealMotion: true,
      disableBackdropBlur: true,
      freezeDynamicWallpaper: true,
      disableShortcutReorderMotion: true,
      disableSecondTickMotion: true,
      disableSyncCardAccentAnimation: true,
    };
  }, [firefox, level]);
}
