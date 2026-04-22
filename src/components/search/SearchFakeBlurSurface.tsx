import { type CSSProperties } from 'react';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { useLiveViewportRect, type ViewportRect } from '@/hooks/useLiveViewportRect';

const SEARCH_FAKE_BLUR_PATCH_OPACITY = 1;
const FALLBACK_SURFACE_COLOR = 'rgba(30, 34, 42, 0.18)';
const DRAWER_SURFACE_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
};

function buildSearchBorderStyle(): CSSProperties {
  return {
    border: '1px solid rgba(255,255,255,0.18)',
  };
}

function buildViewportSliceImageStyle(rect: ViewportRect): CSSProperties {
  return {
    position: 'absolute',
    left: `${-rect.left}px`,
    top: `${-rect.top}px`,
    width: '100vw',
    height: '100vh',
    objectFit: 'cover',
    maxWidth: 'none',
    transform: 'translateZ(0)',
    WebkitTransform: 'translateZ(0)',
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
}: {
  surfaceNode: HTMLElement | null;
  tone?: 'default' | 'drawer';
  radiusClassName?: string;
}) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const hasViewportBackedSurface = Boolean(
    wallpaperBackdrop?.blurredWallpaperSrc
    || (wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient),
  );
  const viewportRect = useLiveViewportRect(surfaceNode, hasViewportBackedSurface);
  const drawerToneActive = tone === 'drawer';
  const wallpaperMaskStyle: CSSProperties | null = !drawerToneActive && wallpaperBackdrop
    ? {
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0, Math.min(100, wallpaperBackdrop.effectiveWallpaperMaskOpacity)) / 100})`,
      }
    : null;

  if (drawerToneActive) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${radiusClassName}`}
        aria-hidden="true"
      >
        <div className="absolute inset-0" style={DRAWER_SURFACE_OVERLAY_STYLE} />
        <div
          className={`absolute inset-0 ${radiusClassName}`}
          style={buildSearchBorderStyle()}
        />
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${radiusClassName}`}
      aria-hidden="true"
    >
      {wallpaperBackdrop?.blurredWallpaperSrc && viewportRect ? (
        <img
          src={wallpaperBackdrop.blurredWallpaperSrc}
          alt=""
          draggable={false}
          className="select-none"
          style={{
            ...buildViewportSliceImageStyle(viewportRect),
            opacity: SEARCH_FAKE_BLUR_PATCH_OPACITY,
          }}
        />
      ) : wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient && viewportRect ? (
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
            backgroundColor: FALLBACK_SURFACE_COLOR,
            opacity: SEARCH_FAKE_BLUR_PATCH_OPACITY,
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
