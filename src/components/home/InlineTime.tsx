import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeDisplayDialog } from '@/components/TimeDisplayDialog';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { useClock } from '@/hooks/useClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useResolvedTimeFontScale } from '@/hooks/useResolvedTimeFontScale';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import { WeatherCard } from '@/components/WeatherCard';
import { toCssFontFamily } from '@/utils/googleFonts';

interface InlineTimeProps {
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showDate: boolean;
  onShowDateChange: (checked: boolean) => void;
  showWeekday: boolean;
  onShowWeekdayChange: (checked: boolean) => void;
  showLunar: boolean;
  onShowLunarChange: (checked: boolean) => void;
  timeAnimationEnabled: boolean;
  timeAnimationMode: TimeAnimationMode;
  onTimeAnimationModeChange: (mode: 'inherit' | 'on' | 'off') => void;
  onWeatherUpdate?: (code: number) => void;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  forceWhiteText: boolean;
  layout: ResponsiveLayout;
}

export const InlineTime = memo(function InlineTime({
  is24Hour,
  onIs24HourChange,
  showSeconds,
  onShowSecondsChange,
  showDate,
  onShowDateChange,
  showWeekday,
  onShowWeekdayChange,
  showLunar,
  onShowLunarChange,
  timeAnimationEnabled,
  timeAnimationMode,
  onTimeAnimationModeChange,
  onWeatherUpdate,
  timeFont,
  onTimeFontChange,
  forceWhiteText,
  layout,
}: InlineTimeProps) {
  const { i18n } = useTranslation();
  const { time, date, lunar } = useClock(is24Hour, showSeconds, i18n.language, showLunar);
  const [timeDisplayDialogOpen, setTimeDisplayDialogOpen] = useState(false);
  const resolvedTimeFontScale = useResolvedTimeFontScale(timeFont);
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }),
    [locale],
  );
  const weekday = weekdayFormatter.format(date);
  const dateString = dateFormatter.format(date);
  const primaryMetaText = showDate && showWeekday
    ? `${dateString}${weekday}`
    : showDate
      ? dateString
      : showWeekday
        ? weekday
        : '';
  const normalizedClockFontSize = layout.clockFontSize * resolvedTimeFontScale;

  return (
    <div className="relative w-full rounded-[28px] overflow-hidden group select-none">
      <div className="absolute inset-0 pointer-events-none opacity-0" />
      <div className="relative z-10 pointer-events-none transform-gpu flex flex-col items-center justify-center py-6">
        <button
          type="button"
          className={`${forceWhiteText ? 'text-white text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]' : 'text-muted-foreground dark:text-foreground dark:text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]'} font-thin leading-none tracking-tight cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0`}
          style={{ fontFamily: toCssFontFamily(timeFont), fontSize: normalizedClockFontSize }}
          onClick={() => setTimeDisplayDialogOpen(true)}
          aria-label={time}
        >
          {!timeAnimationEnabled ? time : <SlidingClockTime time={time} />}
        </button>
        <TimeDisplayDialog
          open={timeDisplayDialogOpen}
          onOpenChange={setTimeDisplayDialogOpen}
          currentFont={timeFont}
          previewTime={time}
          is24Hour={is24Hour}
          onIs24HourChange={onIs24HourChange}
          showDate={showDate}
          onShowDateChange={onShowDateChange}
          showWeekday={showWeekday}
          onShowWeekdayChange={onShowWeekdayChange}
          showSeconds={showSeconds}
          onShowSecondsChange={onShowSecondsChange}
          showLunar={showLunar}
          onShowLunarChange={onShowLunarChange}
          timeAnimationMode={timeAnimationMode}
          onTimeAnimationModeChange={onTimeAnimationModeChange}
          onSelect={onTimeFontChange}
        />
        <div className={`mt-2 flex max-w-full flex-col items-center font-['PingFang_SC',sans-serif] ${forceWhiteText ? 'text-white' : 'text-muted-foreground'}`}>
          <div
            className="inline-flex w-fit max-w-full self-center items-center justify-center gap-3 text-center"
            style={{ fontSize: layout.clockMetaFontSize }}
          >
            {primaryMetaText || (showLunar && lunar) ? (
              <div className="inline-flex w-fit items-center gap-3 whitespace-nowrap">
                {primaryMetaText ? <span>{primaryMetaText}</span> : null}
                {showLunar && lunar ? <span>{lunar}</span> : null}
              </div>
            ) : null}
            <WeatherCard
              onWeatherUpdate={onWeatherUpdate}
              variant={forceWhiteText ? 'inverted' : 'default'}
              displayMode="inline"
              className="w-fit max-w-full"
              textClassName="text-inherit"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
