import { type CSSProperties } from 'react';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { useLiveViewportRect, type ViewportRect } from '@/hooks/useLiveViewportRect';

const SEARCH_FAKE_BLUR_PATCH_OPACITY = 0.98;

function buildSearchBorderStyle(): CSSProperties {
  return {
    border: '1px solid rgba(255,255,255,0.18)',
  };
}

function buildViewportSliceImageStyle(rect: ViewportRect, options?: {
  sliceOverscanPx?: number;
  sliceScale?: number;
}): CSSProperties {
  const overscanPx = options?.sliceOverscanPx ?? 0;
  const sliceScale = options?.sliceScale ?? 1;

  return {
    position: 'absolute',
    left: `${-rect.left - overscanPx}px`,
    top: `${-rect.top - overscanPx}px`,
    width: `calc(100vw + ${overscanPx * 2}px)`,
    height: `calc(100vh + ${overscanPx * 2}px)`,
    objectFit: 'cover',
    maxWidth: 'none',
    transform: `translateZ(0) scale(${sliceScale})`,
    WebkitTransform: `translateZ(0) scale(${sliceScale})`,
    transformOrigin: 'center center',
    backfaceVisibility: 'hidden',
    willChange: 'transform',
  };
}

function buildViewportSliceGradientStyle(rect: ViewportRect): CSSProperties {
  return {
    position: 'absolute',
    left: `${-rect.left}px`,
    top: `${-rect.top}px`,
    width: '100vw',
    height: '100vh',
    maxWidth: 'none',
    backfaceVisibility: 'hidden',
    willChange: 'transform',
  };
}

export function SearchFakeBlurSurface({
  surfaceNode,
  tone = 'default',
  radiusClassName = 'rounded-[999px]',
  darkCoverStrength = 'normal',
  sliceOverscanPx,
  sliceScale,
  specularHighlight = 'normal',
  atmosphereMode = 'normal',
}: {
  surfaceNode: HTMLElement | null;
  tone?: 'default' | 'drawer';
  radiusClassName?: string;
  darkCoverStrength?: 'normal' | 'deep';
  sliceOverscanPx?: number;
  sliceScale?: number;
  specularHighlight?: 'normal' | 'none';
  atmosphereMode?: 'normal' | 'flat';
}) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const hasViewportBackedSurface = Boolean(
    wallpaperBackdrop?.blurredWallpaperSrc
    || (wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient),
  );
  const viewportRect = useLiveViewportRect(surfaceNode, hasViewportBackedSurface);
  const drawerToneActive = tone === 'drawer';
  const drawerTransparentMode = drawerToneActive;
  const wallpaperMaskStyle: CSSProperties | null = !drawerTransparentMode && wallpaperBackdrop
    ? {
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0, Math.min(100, wallpaperBackdrop.effectiveWallpaperMaskOpacity)) / 100})`,
      }
    : null;
  void darkCoverStrength;
  void specularHighlight;
  void atmosphereMode;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${radiusClassName}`}
      aria-hidden="true"
    >
      {!drawerTransparentMode && wallpaperBackdrop?.blurredWallpaperSrc && viewportRect ? (
        <img
          src={wallpaperBackdrop.blurredWallpaperSrc}
          alt=""
          draggable={false}
          className="select-none"
          style={{
            ...buildViewportSliceImageStyle(viewportRect, {
              sliceOverscanPx,
              sliceScale,
            }),
            opacity: SEARCH_FAKE_BLUR_PATCH_OPACITY,
          }}
        />
      ) : !drawerTransparentMode && wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient && viewportRect ? (
        <div
          className="absolute inset-0"
          style={{
            ...buildViewportSliceGradientStyle(viewportRect),
            backgroundImage: wallpaperBackdrop.colorWallpaperGradient,
            opacity: SEARCH_FAKE_BLUR_PATCH_OPACITY,
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: drawerTransparentMode ? 'transparent' : 'rgba(127,127,127,0.16)',
            opacity: drawerTransparentMode ? 1 : SEARCH_FAKE_BLUR_PATCH_OPACITY,
          }}
        />
      )}
      {wallpaperMaskStyle ? <div className="absolute inset-0" style={wallpaperMaskStyle} /> : null}
      <div
        className={`absolute inset-0 ${radiusClassName}`}
        style={buildSearchBorderStyle()}
      />
    </div>
  );
}
