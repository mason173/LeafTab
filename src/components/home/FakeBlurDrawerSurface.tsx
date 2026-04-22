import { useMemo, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

type FakeBlurDrawerSurfaceProps = {
  opacity: number;
  transition: string;
  panelHeightVh: number;
  panelTranslateYPx: number;
};

function buildViewportSliceImageStyle(params: {
  panelHeightVh: number;
  panelTranslateYPx: number;
}): CSSProperties {
  const { panelHeightVh, panelTranslateYPx } = params;
  const overscanPx = 96;

  return {
    position: 'absolute',
    left: `${-overscanPx}px`,
    top: `calc(${(panelHeightVh - 100).toFixed(4)}vh - ${panelTranslateYPx.toFixed(3)}px - ${overscanPx}px)`,
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

export function FakeBlurDrawerSurface({
  opacity,
  transition,
  panelHeightVh,
  panelTranslateYPx,
}: FakeBlurDrawerSurfaceProps) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const normalizedBackdropLuminance = clamp01(
    wallpaperBackdrop?.blurredWallpaperAverageLuminance ?? (isDarkTheme ? 0.42 : 0.68),
  );

  const imageStyle = useMemo(() => buildViewportSliceImageStyle({
    panelHeightVh,
    panelTranslateYPx,
  }), [panelHeightVh, panelTranslateYPx]);

  const themeCoverStyle = useMemo<CSSProperties>(() => (
    isDarkTheme
      ? {
          backgroundColor: `rgba(7,9,12,${(0.68 + (normalizedBackdropLuminance * 0.18)).toFixed(3)})`,
        }
      : {
          backgroundColor: `rgba(248,250,252,${(0.78 - (normalizedBackdropLuminance * 0.24)).toFixed(3)})`,
        }
  ), [isDarkTheme, normalizedBackdropLuminance]);
  const adaptiveDimmingStyle = useMemo<CSSProperties | null>(() => {
    if (isDarkTheme || normalizedBackdropLuminance < 0.62) return null;

    const alpha = ((normalizedBackdropLuminance - 0.62) / 0.38) * 0.12;
    return {
      backgroundColor: `rgba(12,16,22,${alpha.toFixed(3)})`,
    };
  }, [isDarkTheme, normalizedBackdropLuminance]);

  const colorWallpaperStyle = useMemo<CSSProperties>(() => ({
    position: 'absolute',
    inset: 0,
    backgroundImage: wallpaperBackdrop?.colorWallpaperGradient,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transform: 'scale(1.08)',
    transformOrigin: 'center center',
  }), [wallpaperBackdrop?.colorWallpaperGradient]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{
        opacity,
        transition,
      }}
      aria-hidden="true"
    >
      {wallpaperBackdrop?.blurredWallpaperSrc ? (
        <img
          src={wallpaperBackdrop.blurredWallpaperSrc}
          alt=""
          draggable={false}
          className="select-none"
          style={imageStyle}
        />
      ) : wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient ? (
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
      <div className="absolute inset-0" style={themeCoverStyle} />
      {adaptiveDimmingStyle ? <div className="absolute inset-0" style={adaptiveDimmingStyle} /> : null}
    </div>
  );
}
