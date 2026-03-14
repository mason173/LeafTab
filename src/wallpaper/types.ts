export type WallpaperMode = 'bing' | 'weather' | 'color' | 'dynamic' | 'custom';

export const DYNAMIC_WALLPAPER_EFFECTS = [
  'prism',
  'silk',
  'light-rays',
  'beams',
  'galaxy',
  'iridescence',
] as const;

export type DynamicWallpaperEffect = (typeof DYNAMIC_WALLPAPER_EFFECTS)[number];

export const isDynamicWallpaperEffect = (value: string | null | undefined): value is DynamicWallpaperEffect => {
  return value === 'prism'
    || value === 'silk'
    || value === 'light-rays'
    || value === 'beams'
    || value === 'galaxy'
    || value === 'iridescence';
};
