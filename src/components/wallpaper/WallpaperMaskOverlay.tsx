interface WallpaperMaskOverlayProps {
  opacity: number;
  className?: string;
}

const clampOpacity = (value: number): number => {
  if (!Number.isFinite(value)) return 10;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function WallpaperMaskOverlay({
  opacity,
  className = 'absolute inset-0 pointer-events-none',
}: WallpaperMaskOverlayProps) {
  const safeOpacity = clampOpacity(opacity);

  return (
    <div
      className={className}
      style={{ backgroundColor: `rgba(0, 0, 0, ${safeOpacity / 100})` }}
    />
  );
}
