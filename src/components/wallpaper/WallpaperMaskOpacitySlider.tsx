import Scrubber from '@/components/ui/smoothui/scrubber';
import { useTranslation } from 'react-i18next';

interface WallpaperMaskOpacitySliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const clampOpacity = (value: number): number => {
  if (!Number.isFinite(value)) return 10;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function WallpaperMaskOpacitySlider({
  value,
  onChange,
  className = '',
  onInteractionStart,
  onInteractionEnd,
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
      trackHeight={40}
      className={`w-full ${className}`}
      onDragStart={onInteractionStart}
      onDragEnd={onInteractionEnd}
      onValueChange={(nextRawValue) => {
        const next = clampOpacity(nextRawValue);
        onChange(next);
      }}
    />
  );
}
