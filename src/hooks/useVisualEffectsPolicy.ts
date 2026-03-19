import { useMemo } from 'react';

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
  return useMemo(() => {
    if (level === 'high') {
      return {
        disableInitialRevealMotion: false,
        disableWallpaperRevealMotion: false,
        disableBackdropBlur: false,
        freezeDynamicWallpaper: false,
        disableShortcutReorderMotion: false,
        disableSecondTickMotion: false,
        disableSyncCardAccentAnimation: false,
      };
    }

    if (level === 'medium') {
      return {
        disableInitialRevealMotion: false,
        disableWallpaperRevealMotion: false,
        disableBackdropBlur: true,
        freezeDynamicWallpaper: true,
        disableShortcutReorderMotion: false,
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
  }, [level]);
}
