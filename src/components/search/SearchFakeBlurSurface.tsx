import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';

type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function rectEquals(left: ViewportRect | null, right: ViewportRect | null) {
  if (!left || !right) return left === right;
  return (
    Math.abs(left.left - right.left) < 0.25
    && Math.abs(left.top - right.top) < 0.25
    && Math.abs(left.width - right.width) < 0.25
    && Math.abs(left.height - right.height) < 0.25
  );
}

function useLiveViewportRect(element: HTMLElement | null, enabled: boolean) {
  const [rect, setRect] = useState<ViewportRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !element || typeof window === 'undefined') {
      setRect(null);
      return;
    }

    let rafId = 0;
    const syncRect = () => {
      if (!element.isConnected) {
        setRect(null);
        return;
      }

      const nextRect = element.getBoundingClientRect();
      const resolvedRect = {
        left: nextRect.left,
        top: nextRect.top,
        width: nextRect.width,
        height: nextRect.height,
      };
      setRect((current) => (rectEquals(current, resolvedRect) ? current : resolvedRect));
      rafId = window.requestAnimationFrame(syncRect);
    };

    syncRect();
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [element, enabled]);

  return rect;
}

function buildViewportSliceImageStyle(rect: ViewportRect, options?: {
  sliceOverscanPx?: number;
  sliceScale?: number;
}): CSSProperties {
  const overscanPx = options?.sliceOverscanPx ?? 120;
  const sliceScale = options?.sliceScale ?? 1.055;

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
  const { resolvedTheme } = useTheme();
  const viewportRect = useLiveViewportRect(surfaceNode, Boolean(wallpaperBackdrop?.blurredWallpaperSrc));
  const isDarkTheme = resolvedTheme === 'dark';
  const drawerToneActive = tone === 'drawer';
  const deepDarkCover = darkCoverStrength === 'deep';
  const specularDisabled = specularHighlight === 'none';
  const flatAtmosphere = atmosphereMode === 'flat';

  const baseTintStyle: CSSProperties = drawerToneActive
    ? (isDarkTheme
        ? { background: deepDarkCover ? 'rgba(5,7,10,0.74)' : 'rgba(6,8,12,0.56)' }
        : { background: 'rgba(255,255,255,0.46)' })
    : (isDarkTheme
        ? { background: deepDarkCover ? 'rgba(7,9,12,0.64)' : 'rgba(10,14,20,0.38)' }
        : { background: 'rgba(255,255,255,0.28)' });
  const atmosphereStyle: CSSProperties = flatAtmosphere
    ? (isDarkTheme
        ? {
            background: drawerToneActive
              ? (deepDarkCover
                  ? 'linear-gradient(180deg, rgba(5,7,10,0.20) 0%, rgba(5,7,10,0.16) 100%)'
                  : 'linear-gradient(180deg, rgba(6,8,12,0.14) 0%, rgba(6,8,12,0.12) 100%)')
              : (deepDarkCover
                  ? 'linear-gradient(180deg, rgba(7,9,12,0.16) 0%, rgba(7,9,12,0.12) 100%)'
                  : 'linear-gradient(180deg, rgba(10,14,20,0.12) 0%, rgba(10,14,20,0.09) 100%)'),
          }
        : {
            background: drawerToneActive
              ? 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.30) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.18) 100%)',
          })
    : (drawerToneActive
        ? (isDarkTheme
            ? {
                background:
                  deepDarkCover
                    ? 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.015) 16%, rgba(7,9,12,0.06) 42%, rgba(5,7,10,0.16) 100%)'
                    : 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 18%, rgba(8,10,14,0.05) 44%, rgba(6,8,12,0.12) 100%)',
              }
            : {
                background:
                  'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.18) 26%, rgba(255,255,255,0.22) 52%, rgba(255,255,255,0.38) 100%)',
              })
        : (isDarkTheme
            ? {
                background:
                  deepDarkCover
                    ? 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 16%, rgba(8,10,14,0.05) 42%, rgba(7,9,12,0.14) 100%)'
                    : 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 18%, rgba(10,14,20,0.04) 44%, rgba(10,14,20,0.10) 100%)',
              }
            : {
                background:
                  'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 26%, rgba(255,255,255,0.12) 54%, rgba(255,255,255,0.22) 100%)',
              }));
  const highlightStyle: CSSProperties = drawerToneActive
    ? (isDarkTheme
        ? {
            background:
              deepDarkCover
                ? 'radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.018) 18%, rgba(255,255,255,0) 58%)'
                : 'radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 20%, rgba(255,255,255,0) 60%)',
          }
        : {
            background:
              'radial-gradient(ellipse at 50% 46%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0) 58%)',
          })
    : (isDarkTheme
        ? {
            background:
              deepDarkCover
                ? 'radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 18%, rgba(255,255,255,0) 58%)'
                : 'radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 20%, rgba(255,255,255,0) 60%)',
          }
        : {
            background:
              'radial-gradient(ellipse at 50% 46%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 58%)',
          });

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
          style={buildViewportSliceImageStyle(viewportRect, {
            sliceOverscanPx,
            sliceScale,
          })}
        />
      ) : wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: wallpaperBackdrop.colorWallpaperGradient,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1.06)',
            transformOrigin: 'center center',
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: isDarkTheme
              ? 'linear-gradient(180deg, rgba(20,24,30,0.96) 0%, rgba(10,12,18,0.995) 100%)'
              : 'linear-gradient(180deg, rgba(252,253,255,0.98) 0%, rgba(244,247,251,0.995) 100%)',
          }}
        />
      )}
      <div className="absolute inset-0" style={baseTintStyle} />
      <div className="absolute inset-0" style={atmosphereStyle} />
      {!specularDisabled ? <div className="absolute inset-0" style={highlightStyle} /> : null}
      {!specularDisabled ? (
        <div
          className="absolute inset-0"
          style={{
            background: isDarkTheme
              ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0.02) 68%, rgba(255,255,255,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0.10) 68%, rgba(255,255,255,0.18) 100%)',
            mixBlendMode: 'screen',
            opacity: drawerToneActive
              ? (isDarkTheme ? (deepDarkCover ? 0.10 : 0.22) : 0.88)
              : (isDarkTheme ? (deepDarkCover ? 0.08 : 0.18) : 0.72),
          }}
        />
      ) : null}
    </div>
  );
}
