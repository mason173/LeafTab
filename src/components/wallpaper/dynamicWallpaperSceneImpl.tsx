import { renderDynamicWallpaper } from './dynamicWallpapers';
import type { DynamicWallpaperEffect } from '@/wallpaper/types';

type DynamicWallpaperRenderVariant =
  | 'selector-live'
  | 'selector-static'
  | 'hero'
  | 'background'
  | 'background-static';

interface DynamicWallpaperSceneImplProps {
  effect: DynamicWallpaperEffect;
  variant: DynamicWallpaperRenderVariant;
}

export default function DynamicWallpaperSceneImpl({
  effect,
  variant,
}: DynamicWallpaperSceneImplProps) {
  return <>{renderDynamicWallpaper(effect, variant)}</>;
}
