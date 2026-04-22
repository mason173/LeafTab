import { createContext, useContext } from 'react';
import type { WallpaperMode } from '@/wallpaper/types';

export type WallpaperBackdropSnapshot = {
  wallpaperMode: WallpaperMode;
  colorWallpaperGradient: string;
  blurredWallpaperSrc: string;
  blurredWallpaperAverageLuminance: number | null;
};

const WallpaperBackdropContext = createContext<WallpaperBackdropSnapshot | null>(null);

export const WallpaperBackdropProvider = WallpaperBackdropContext.Provider;

export function useWallpaperBackdropSnapshot() {
  return useContext(WallpaperBackdropContext);
}
