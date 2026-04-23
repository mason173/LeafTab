import { useMemo, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { useLiveViewportRect, type ViewportRect } from '@/hooks/useLiveViewportRect';

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

type FakeBlurDrawerSurfaceProps = {
  surfaceNode: HTMLElement | null;
  opacity: number;
  transition: string;
};

function buildViewportSliceImageStyle(rect: ViewportRect): CSSProperties {
  const overscanPx = 96;

  return {
    position: 'absolute',
    left: `${-rect.left - overscanPx}px`,
    top: `${-rect.top - overscanPx}px`,
    width: `calc(100vw + ${overscanPx * 2}px)`,
    height: `calc(100vh + ${overscanPx * 2}px)`,
    maxWidth: 'none',
    objectFit: 'cover',
    transform: 'translateZ(0) scale(1.04)',
    WebkitTransform: 'translateZ(0) scale(1.04)',
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

export function FakeBlurDrawerSurface({
  surfaceNode,
  opacity,
  transition,
}: FakeBlurDrawerSurfaceProps) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const hasViewportBackedSurface = Boolean(
    wallpaperBackdrop?.blurredWallpaperSrc
    || (wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient),
  );
  const viewportRect = useLiveViewportRect(surfaceNode, hasViewportBackedSurface);
  const normalizedBackdropLuminance = clamp01(
    wallpaperBackdrop?.blurredWallpaperAverageLuminance ?? (isDarkTheme ? 0.42 : 0.68),
  );
  const wallpaperMaskStyle = useMemo<CSSProperties | null>(() => {
    if (!wallpaperBackdrop) return null;
    return {
      backgroundColor: `rgba(0, 0, 0, ${Math.max(0, Math.min(100, wallpaperBackdrop.effectiveWallpaperMaskOpacity)) / 100})`,
    };
  }, [wallpaperBackdrop]);

  const imageStyle = useMemo(() => (
    viewportRect ? buildViewportSliceImageStyle(viewportRect) : null
  ), [viewportRect]);

  const immersiveBackdropTintStyle = useMemo<CSSProperties>(() => ({
    backgroundColor: `rgba(18,22,30,${(0.08 + (normalizedBackdropLuminance * 0.12)).toFixed(3)})`,
  }), [normalizedBackdropLuminance]);
  const immersiveBlurOverlayStyle = useMemo<CSSProperties>(() => {
    if (normalizedBackdropLuminance > 0.56) {
      const darkAlpha = 0.05 + ((normalizedBackdropLuminance - 0.56) / 0.44) * 0.11;
      return {
        backgroundColor: `rgba(18,22,30,${darkAlpha.toFixed(3)})`,
      };
    }

    const lightAlpha = 0.08 - (normalizedBackdropLuminance / 0.56) * 0.03;
    return {
      backgroundColor: `rgba(244,246,248,${lightAlpha.toFixed(3)})`,
    };
  }, [normalizedBackdropLuminance]);

  const colorWallpaperStyle = useMemo<CSSProperties>(() => ({
    ...(viewportRect ? buildViewportSliceGradientStyle(viewportRect) : {}),
    backgroundImage: wallpaperBackdrop?.colorWallpaperGradient,
  }), [viewportRect, wallpaperBackdrop?.colorWallpaperGradient]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{
        opacity,
        transition,
      }}
      aria-hidden="true"
    >
      {wallpaperBackdrop?.blurredWallpaperSrc && imageStyle ? (
        <img
          src={wallpaperBackdrop.blurredWallpaperSrc}
          alt=""
          draggable={false}
          className="select-none"
          style={imageStyle}
        />
      ) : wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient && viewportRect ? (
        <div style={colorWallpaperStyle} />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: isDarkTheme
              ? 'rgba(20,24,32,0.98)'
              : 'rgba(238,242,247,0.98)',
          }}
        />
      )}
      {wallpaperMaskStyle ? <div className="absolute inset-0" style={wallpaperMaskStyle} /> : null}
      <div className="absolute inset-0" style={immersiveBlurOverlayStyle} />
      <div className="absolute inset-0" style={immersiveBackdropTintStyle} />
    </div>
  );
}
