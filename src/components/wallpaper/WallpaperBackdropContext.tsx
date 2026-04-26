import { createContext, useContext } from 'react';
import type { WallpaperMode } from '@/wallpaper/types';

export type WallpaperBackdropSnapshot = {
  wallpaperMode: WallpaperMode;
  colorWallpaperGradient: string;
  blurredWallpaperSrc: string;
  fallbackWallpaperSrc: string;
  blurredWallpaperAverageLuminance: number | null;
  effectiveWallpaperMaskOpacity: number;
};

const WallpaperBackdropContext = createContext<WallpaperBackdropSnapshot | null>(null);

export const WallpaperBackdropProvider = WallpaperBackdropContext.Provider;

export function useWallpaperBackdropSnapshot() {
  return useContext(WallpaperBackdropContext);
}
