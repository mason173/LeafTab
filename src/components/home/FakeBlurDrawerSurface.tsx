import { useMemo, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';

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

  const imageStyle = useMemo(() => buildViewportSliceImageStyle({
    panelHeightVh,
    panelTranslateYPx,
  }), [panelHeightVh, panelTranslateYPx]);

  const themeCoverStyle = useMemo<CSSProperties>(() => (
    isDarkTheme
      ? {
          background:
            'linear-gradient(180deg, rgba(4,6,9,0.78) 0%, rgba(7,9,12,0.92) 52%, rgba(9,11,15,0.97) 100%)',
        }
      : {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.82) 52%, rgba(255,255,255,0.90) 100%)',
        }
  ), [isDarkTheme]);

  const atmosphereStyle = useMemo<CSSProperties>(() => (
    isDarkTheme
      ? {
          background:
            'linear-gradient(180deg, rgba(5,7,10,0.18) 0%, rgba(5,7,10,0.14) 100%)',
        }
      : {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.28) 100%)',
        }
  ), [isDarkTheme]);

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
            background: isDarkTheme
              ? 'linear-gradient(180deg, rgba(24,28,36,0.96) 0%, rgba(12,14,20,0.995) 100%)'
              : 'linear-gradient(180deg, rgba(252,253,255,0.98) 0%, rgba(244,247,251,0.995) 100%)',
          }}
        />
      )}
      <div className="absolute inset-0" style={themeCoverStyle} />
      <div className="absolute inset-0" style={atmosphereStyle} />
    </div>
  );
}
