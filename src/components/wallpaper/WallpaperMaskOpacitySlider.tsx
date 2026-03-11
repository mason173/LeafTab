import React from 'react';
import { Slider } from '@/components/ui/slider';

interface WallpaperMaskOpacitySliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const clampOpacity = (value: number): number => {
  if (!Number.isFinite(value)) return 10;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function WallpaperMaskOpacitySlider({
  value,
  onChange,
  className = '',
}: WallpaperMaskOpacitySliderProps) {
  const safeValue = clampOpacity(value);

  return (
    <Slider
      min={0}
      max={100}
      step={1}
      value={[safeValue]}
      className={`w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/45 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-white ${className}`}
      onValueChange={(values) => {
        const next = clampOpacity(values[0] ?? safeValue);
        onChange(next);
      }}
    />
  );
}
