import { Suspense, lazy, type ReactNode } from 'react';
import type { DynamicWallpaperEffect } from '@/wallpaper/types';
import { getDynamicWallpaperStaticBackground } from './dynamicWallpaperFallbacks';

type DynamicWallpaperRenderVariant =
  | 'selector-live'
  | 'selector-static'
  | 'hero'
  | 'background'
  | 'background-static';

const DynamicWallpaperScene = lazy(() => import('./dynamicWallpaperSceneImpl'));

interface LazyDynamicWallpaperSceneProps {
  effect: DynamicWallpaperEffect;
  variant: DynamicWallpaperRenderVariant;
  fallback?: ReactNode;
}

export function LazyDynamicWallpaperScene({
  effect,
  variant,
  fallback,
}: LazyDynamicWallpaperSceneProps) {
  const resolvedFallback = fallback ?? (
    <div
      className="absolute inset-0"
      style={{ backgroundImage: getDynamicWallpaperStaticBackground(effect) }}
    />
  );
  return (
    <Suspense fallback={resolvedFallback}>
      <DynamicWallpaperScene effect={effect} variant={variant} />
    </Suspense>
  );
}
