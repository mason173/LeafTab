import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { buildRecommendedAccentPaletteFromHexes, sampleAccentFromImageData } from '@/utils/dynamicAccentColor';

const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{6}/g;

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace('#', '');
  const parsed = Number.parseInt(normalized, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function mixRgb(left: RgbColor, right: RgbColor, rightWeight: number): RgbColor {
  const weight = clamp01(rightWeight);
  const leftWeight = 1 - weight;
  return {
    r: Math.round(left.r * leftWeight + right.r * weight),
    g: Math.round(left.g * leftWeight + right.g * weight),
    b: Math.round(left.b * leftWeight + right.b * weight),
  };
}

function toRgba(color: RgbColor, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp01(alpha).toFixed(3)})`;
}

function toTransparent(color: RgbColor) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, 0)`;
}

export function resolveBottomCropFadeHeight(searchHeight: number) {
  return Math.max(
    Math.round(searchHeight + 52),
    Math.round(searchHeight * 3),
  );
}

export function resolveBottomCropFadeInset(searchHeight: number) {
  return Math.max(28, Math.round(resolveBottomCropFadeHeight(searchHeight) * 0.36));
}

type BottomCropFadeOverlayProps = {
  heightPx: number;
  className?: string;
};

export function BottomCropFadeOverlay({
  heightPx,
  className,
}: BottomCropFadeOverlayProps) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [accentColor, setAccentColor] = useState<RgbColor | null>(null);
  const normalizedBackdropLuminance = clamp01(
    wallpaperBackdrop?.blurredWallpaperAverageLuminance ?? (isDarkTheme ? 0.42 : 0.68),
  );

  useEffect(() => {
    let cancelled = false;

    const setAccentFromHex = (hex: string | null) => {
      if (cancelled) return;
      setAccentColor(hex ? hexToRgb(hex) : null);
    };

    if (wallpaperBackdrop?.wallpaperMode === 'color') {
      const gradientHexes = wallpaperBackdrop.colorWallpaperGradient.match(HEX_COLOR_PATTERN) || [];
      const palette = buildRecommendedAccentPaletteFromHexes(gradientHexes);
      setAccentFromHex(palette[0] || gradientHexes[0] || null);
      return () => {
        cancelled = true;
      };
    }

    if (!wallpaperBackdrop?.blurredWallpaperSrc) {
      setAccentFromHex(null);
      return () => {
        cancelled = true;
      };
    }

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;
      try {
        const sampleSize = 48;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          setAccentFromHex(null);
          return;
        }

        context.drawImage(image, 0, 0, sampleSize, sampleSize);
        const imageData = context.getImageData(0, 0, sampleSize, sampleSize);
        const accentHex = sampleAccentFromImageData(imageData.data, sampleSize, sampleSize);
        setAccentFromHex(accentHex || null);
      } catch {
        setAccentFromHex(null);
      }
    };
    image.onerror = () => {
      setAccentFromHex(null);
    };
    image.src = wallpaperBackdrop.blurredWallpaperSrc;

    return () => {
      cancelled = true;
    };
  }, [
    wallpaperBackdrop?.blurredWallpaperSrc,
    wallpaperBackdrop?.colorWallpaperGradient,
    wallpaperBackdrop?.wallpaperMode,
  ]);

  const overlayStyle = useMemo<CSSProperties>(() => {
    const fallbackAccent = normalizedBackdropLuminance > 0.56
      ? ({ r: 206, g: 223, b: 255 } satisfies RgbColor)
      : ({ r: 58, g: 88, b: 142 } satisfies RgbColor);
    const accentBase = accentColor || fallbackAccent;
    const bottomNeutral = normalizedBackdropLuminance > 0.56
      ? ({ r: 255, g: 255, b: 255 } satisfies RgbColor)
      : ({ r: 10, g: 16, b: 30 } satisfies RgbColor);
    const cropBottomTone = mixRgb(accentBase, bottomNeutral, normalizedBackdropLuminance > 0.56 ? 0.74 : 0.46);
    const cropTransparentColor = toTransparent(cropBottomTone);
    const cropBottomColor = toRgba(cropBottomTone, normalizedBackdropLuminance > 0.56 ? 0.92 : 0.88);

    return {
      width: '100%',
      height: heightPx,
      background: [
        'linear-gradient(to bottom,',
        `${cropTransparentColor} 0%,`,
        `${cropBottomColor} 100%)`,
      ].join(' '),
    };
  }, [accentColor, heightPx, normalizedBackdropLuminance]);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={overlayStyle}
    />
  );
}
