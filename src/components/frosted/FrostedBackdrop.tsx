import { useMemo, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { useLiveViewportRect, type ViewportRect } from '@/hooks/useLiveViewportRect';

export type FrostedBackdropPreset = 'default' | 'immersive-drawer';
export type FrostedSurfaceTone = 'default' | 'drawer';

export type FrostedBackdropProps = {
  surfaceNode: HTMLElement | null;
  preset?: FrostedBackdropPreset;
  tone?: FrostedSurfaceTone;
  radiusClassName?: string;
  lightModeOverlayOpacity?: number;
  darkModeOverlayOpacity?: number;
  modeOverlayTransitionMs?: number;
  showBorder?: boolean;
  fallbackSurfaceColor?: string;
  opacity?: number;
  transition?: string;
  imageOverscanPx?: number;
  imageScale?: number;
  imageBlurPx?: number;
  wallpaperMaskOpacityMultiplier?: number;
};

const DEFAULT_FALLBACK_SURFACE_COLOR = 'rgba(30, 34, 42, 0.18)';
const DRAWER_SURFACE_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function buildSearchBorderStyle(): CSSProperties {
  return {
    border: '1px solid rgba(255,255,255,0.18)',
  };
}

function buildViewportSliceImageStyle(
  rect: ViewportRect,
  overscanPx: number,
  scale: number,
  blurPx: number,
): CSSProperties {
  return {
    position: 'absolute',
    left: `${-rect.left - overscanPx}px`,
    top: `${-rect.top - overscanPx}px`,
    width: `calc(100vw + ${overscanPx * 2}px)`,
    height: `calc(100vh + ${overscanPx * 2}px)`,
    objectFit: 'cover',
    maxWidth: 'none',
    transform: `translateZ(0) scale(${scale})`,
    WebkitTransform: `translateZ(0) scale(${scale})`,
    transformOrigin: 'center center',
    backfaceVisibility: 'hidden',
    filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    WebkitFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    willChange: blurPx > 0 ? 'transform, filter' : 'transform',
  };
}

function buildViewportSliceGradientStyle(
  rect: ViewportRect,
  overscanPx: number,
  blurPx: number,
): CSSProperties {
  return {
    position: 'absolute',
    left: `${-rect.left - overscanPx}px`,
    top: `${-rect.top - overscanPx}px`,
    width: `calc(100vw + ${overscanPx * 2}px)`,
    height: `calc(100vh + ${overscanPx * 2}px)`,
    maxWidth: 'none',
    filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    WebkitFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    backfaceVisibility: 'hidden',
    willChange: blurPx > 0 ? 'filter' : 'transform',
  };
}

export function FrostedBackdrop({
  surfaceNode,
  preset = 'default',
  tone = 'default',
  radiusClassName = 'rounded-[999px]',
  lightModeOverlayOpacity = 0.9,
  darkModeOverlayOpacity = 0.65,
  modeOverlayTransitionMs = 220,
  showBorder = true,
  fallbackSurfaceColor = DEFAULT_FALLBACK_SURFACE_COLOR,
  opacity,
  transition,
  imageOverscanPx = 0,
  imageScale = 1,
  imageBlurPx = 0,
  wallpaperMaskOpacityMultiplier = 1,
}: FrostedBackdropProps) {
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
  const immersiveWallpaperMaskStyle = useMemo<CSSProperties | null>(() => {
    if (!wallpaperBackdrop) return null;
    return {
      backgroundColor: `rgba(0, 0, 0, ${Math.max(0, Math.min(100, wallpaperBackdrop.effectiveWallpaperMaskOpacity)) / 100})`,
    };
  }, [wallpaperBackdrop]);
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

  if (preset === 'immersive-drawer') {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          opacity,
          transition,
        }}
        aria-hidden="true"
      >
        {wallpaperBackdrop?.blurredWallpaperSrc && viewportRect ? (
          <img
            src={wallpaperBackdrop.blurredWallpaperSrc}
            alt=""
            draggable={false}
            className="select-none"
            style={buildViewportSliceImageStyle(viewportRect, imageOverscanPx, imageScale, imageBlurPx)}
          />
        ) : wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient && viewportRect ? (
          <div
            style={{
              ...buildViewportSliceGradientStyle(viewportRect, imageOverscanPx, imageBlurPx),
              backgroundImage: wallpaperBackdrop.colorWallpaperGradient,
            }}
          />
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
        {immersiveWallpaperMaskStyle ? <div className="absolute inset-0" style={immersiveWallpaperMaskStyle} /> : null}
        <div className="absolute inset-0" style={immersiveBlurOverlayStyle} />
        <div className="absolute inset-0" style={immersiveBackdropTintStyle} />
      </div>
    );
  }

  const drawerToneActive = tone === 'drawer';
  const normalizedLightModeOverlayOpacity = clamp01(lightModeOverlayOpacity);
  const normalizedDarkModeOverlayOpacity = clamp01(darkModeOverlayOpacity);
  const modeOverlayStyle: CSSProperties = {
    backgroundColor: isDarkTheme
      ? `rgba(0, 0, 0, ${normalizedDarkModeOverlayOpacity})`
      : `rgba(255, 255, 255, ${normalizedLightModeOverlayOpacity})`,
    transition: `background-color ${modeOverlayTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  };
  const wallpaperMaskStyle: CSSProperties | null = !drawerToneActive && wallpaperBackdrop
    ? {
        backgroundColor: `rgba(0, 0, 0, ${(Math.max(0, Math.min(100, wallpaperBackdrop.effectiveWallpaperMaskOpacity)) / 100) * clamp01(wallpaperMaskOpacityMultiplier)})`,
      }
    : null;

  if (drawerToneActive) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${radiusClassName}`}
        aria-hidden="true"
      >
        <div className="absolute inset-0" style={DRAWER_SURFACE_OVERLAY_STYLE} />
        <div className="absolute inset-0" style={modeOverlayStyle} />
        {showBorder ? (
          <div
            className={`absolute inset-0 ${radiusClassName}`}
            style={buildSearchBorderStyle()}
          />
        ) : null}
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
          style={buildViewportSliceImageStyle(viewportRect, imageOverscanPx, imageScale, imageBlurPx)}
        />
      ) : wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient && viewportRect ? (
        <div
          className="absolute inset-0"
          style={{
            ...buildViewportSliceGradientStyle(viewportRect, imageOverscanPx, imageBlurPx),
            backgroundImage: wallpaperBackdrop.colorWallpaperGradient,
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: fallbackSurfaceColor,
          }}
        />
      )}
      {wallpaperMaskStyle ? <div className="absolute inset-0" style={wallpaperMaskStyle} /> : null}
      <div className="absolute inset-0" style={modeOverlayStyle} />
      {showBorder ? (
        <div
          className={`absolute inset-0 ${radiusClassName}`}
          style={buildSearchBorderStyle()}
        />
      ) : null}
    </div>
  );
}
