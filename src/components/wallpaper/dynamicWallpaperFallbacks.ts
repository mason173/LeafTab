import type { DynamicWallpaperEffect } from '@/wallpaper/types';

export const dynamicWallpaperStaticBackgrounds: Record<DynamicWallpaperEffect, string> = {
  prism: 'linear-gradient(140deg, #111827 0%, #1e293b 45%, #64748b 100%)',
  silk: 'radial-gradient(circle at 20% 15%, #b8acbf 0%, #6b6572 40%, #1f1f23 100%)',
  'light-rays': 'linear-gradient(165deg, #f8fafc 0%, #dbeafe 48%, #475569 100%)',
  beams: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #64748b 100%)',
  galaxy: 'radial-gradient(circle at 30% 18%, #67e8f9 0%, #1e293b 36%, #020617 82%)',
  iridescence: 'linear-gradient(130deg, #fef3c7 0%, #fbcfe8 35%, #bfdbfe 68%, #d9f99d 100%)',
};

export function getDynamicWallpaperStaticBackground(effect: DynamicWallpaperEffect) {
  return dynamicWallpaperStaticBackgrounds[effect];
}
