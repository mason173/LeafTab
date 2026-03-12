import Scrubber from '@/components/ui/smoothui/scrubber';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const safeValue = clampOpacity(value);

  return (
    <Scrubber
      min={0}
      max={100}
      step={1}
      value={safeValue}
      label={t('weather.wallpaper.maskOpacity')}
      valueText={(safeValue / 100).toFixed(2)}
      ticks={7}
      decimals={0}
      showLabel
      showValue
      trackHeight={48}
      className={`w-full ${className} [&_[data-slot=scrubber-track]]:bg-black/40 [&_[data-slot=scrubber-track]]:backdrop-blur-md [&_[data-slot=scrubber-fill]]:bg-white/14 [&_[data-slot=scrubber-tick]]:bg-white/30 [&_[data-slot=scrubber-thumb]]:bg-white/70 [&_[data-slot=scrubber-thumb]]:shadow-none [&_[data-slot=scrubber-label]]:text-white [&_[data-slot=scrubber-label]]:text-[13px] [&_[data-slot=scrubber-value]]:text-white [&_[data-slot=scrubber-value]]:text-[13px]`}
      onValueChange={(nextRawValue) => {
        const next = clampOpacity(nextRawValue);
        onChange(next);
      }}
    />
  );
}
