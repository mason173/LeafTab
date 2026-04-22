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
  const drawerTransparentMode = drawerToneActive;
  const deepDarkCover = darkCoverStrength === 'deep';
  const specularDisabled = specularHighlight === 'none';
  const flatAtmosphere = atmosphereMode === 'flat';
  const baseTintStyle: CSSProperties = drawerTransparentMode
    ? (isDarkTheme
        ? { backgroundColor: 'rgba(255,255,255,0.07)' }
        : { backgroundColor: 'rgba(255,255,255,0.18)' })
    : drawerToneActive
    ? (isDarkTheme
        ? { background: deepDarkCover ? 'rgba(5,7,10,0.62)' : 'rgba(6,8,12,0.46)' }
        : { background: 'rgba(255,255,255,0.34)' })
    : (isDarkTheme
        ? { background: deepDarkCover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.10)' }
        : { background: 'rgba(255,255,255,0.18)' });
  const atmosphereStyle: CSSProperties = drawerTransparentMode
    ? (isDarkTheme
        ? { backgroundColor: 'rgba(0,0,0,0.16)' }
        : { backgroundColor: 'rgba(255,255,255,0.07)' })
    : flatAtmosphere
    ? (isDarkTheme
        ? {
            background: drawerToneActive
              ? (deepDarkCover
                  ? 'linear-gradient(180deg, rgba(5,7,10,0.14) 0%, rgba(5,7,10,0.10) 100%)'
                  : 'linear-gradient(180deg, rgba(6,8,12,0.10) 0%, rgba(6,8,12,0.08) 100%)')
              : (deepDarkCover
                  ? 'linear-gradient(180deg, rgba(7,9,12,0.09) 0%, rgba(7,9,12,0.06) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'),
          }
        : {
            background: drawerToneActive
              ? 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.20) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.10) 100%)',
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
                    ? 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 16%, rgba(8,10,14,0.04) 42%, rgba(7,9,12,0.10) 100%)'
                    : 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.035) 18%, rgba(255,255,255,0.02) 44%, rgba(255,255,255,0.03) 100%)',
              }
            : {
                background:
                  'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 26%, rgba(255,255,255,0.12) 54%, rgba(255,255,255,0.22) 100%)',
              }));
  const highlightStyle: CSSProperties = drawerTransparentMode
    ? { background: 'transparent' }
    : drawerToneActive
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
  const compensationStyle: CSSProperties | null = drawerTransparentMode
    ? (isDarkTheme
        ? { backgroundColor: 'rgba(255,255,255,0.025)' }
        : { backgroundColor: 'rgba(255,255,255,0.045)' })
    : null;

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
          style={buildViewportSliceImageStyle(viewportRect, {
            sliceOverscanPx,
            sliceScale,
          })}
        />
      ) : !drawerTransparentMode && wallpaperBackdrop?.wallpaperMode === 'color' && wallpaperBackdrop.colorWallpaperGradient ? (
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
              ? (drawerTransparentMode
                  ? 'transparent'
                  : 'linear-gradient(180deg, rgba(24,30,38,0.94) 0%, rgba(14,18,24,0.98) 100%)')
              : (drawerTransparentMode
                  ? 'transparent'
                  : 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(238,242,247,0.99) 100%)'),
          }}
        />
      )}
      <div className="absolute inset-0" style={baseTintStyle} />
      <div className="absolute inset-0" style={atmosphereStyle} />
      {compensationStyle ? <div className="absolute inset-0" style={compensationStyle} /> : null}
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
