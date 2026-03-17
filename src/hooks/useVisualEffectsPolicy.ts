import { useMemo } from 'react';

export type VisualEffectsLevel = 'low' | 'medium' | 'high';

export interface VisualEffectsPolicy {
  level: VisualEffectsLevel;
  reduceVisualEffects: boolean;
  disableDialogMotion: boolean;
  disableInitialRevealMotion: boolean;
  disableWallpaperRevealMotion: boolean;
  disableBackdropBlur: boolean;
  disableBottomGradualBlur: boolean;
  disableMagnetic: boolean;
  freezeDynamicWallpaper: boolean;
  disableShortcutReorderMotion: boolean;
  disableSecondTickMotion: boolean;
  disableSyncCardAccentAnimation: boolean;
  disableSearchPlaceholderAnimation: boolean;
}

export function useVisualEffectsPolicy(level: VisualEffectsLevel): VisualEffectsPolicy {
  return useMemo(() => {
    if (level === 'high') {
      return {
        level: 'high',
        reduceVisualEffects: false,
        disableDialogMotion: false,
        disableInitialRevealMotion: false,
        disableWallpaperRevealMotion: false,
        disableBackdropBlur: false,
        disableBottomGradualBlur: false,
        disableMagnetic: false,
        freezeDynamicWallpaper: false,
        disableShortcutReorderMotion: false,
        disableSecondTickMotion: false,
        disableSyncCardAccentAnimation: false,
        disableSearchPlaceholderAnimation: false,
      };
    }

    if (level === 'medium') {
      return {
        level: 'medium',
        reduceVisualEffects: true,
        disableDialogMotion: true,
        disableInitialRevealMotion: false,
        disableWallpaperRevealMotion: false,
        disableBackdropBlur: true,
        disableBottomGradualBlur: true,
        disableMagnetic: true,
        freezeDynamicWallpaper: true,
        disableShortcutReorderMotion: false,
        disableSecondTickMotion: false,
        disableSyncCardAccentAnimation: true,
        disableSearchPlaceholderAnimation: false,
      };
    }

    return {
      level: 'low',
      reduceVisualEffects: true,
      disableDialogMotion: true,
      disableInitialRevealMotion: true,
      disableWallpaperRevealMotion: true,
      disableBackdropBlur: true,
      disableBottomGradualBlur: true,
      disableMagnetic: true,
      freezeDynamicWallpaper: true,
      disableShortcutReorderMotion: true,
      disableSecondTickMotion: true,
      disableSyncCardAccentAnimation: true,
      disableSearchPlaceholderAnimation: false,
    };
  }, [level]);
}
