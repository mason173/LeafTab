import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeDisplayDialog } from '@/components/TimeDisplayDialog';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { useClock } from '@/hooks/useClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface InlineTimeProps {
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showLunar: boolean;
  onShowLunarChange: (checked: boolean) => void;
  timeAnimationEnabled: boolean;
  onTimeAnimationModeChange: (mode: 'inherit' | 'on' | 'off') => void;
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
  showLunar,
  onShowLunarChange,
  timeAnimationEnabled,
  onTimeAnimationModeChange,
  timeFont,
  onTimeFontChange,
  forceWhiteText,
  layout,
}: InlineTimeProps) {
  const { i18n } = useTranslation();
  const { time, date, lunar } = useClock(is24Hour, showSeconds, i18n.language, showLunar);
  const [timeDisplayDialogOpen, setTimeDisplayDialogOpen] = useState(false);
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }),
    [locale],
  );
  const weekday = weekdayFormatter.format(date);
  const dateString = dateFormatter.format(date);

  return (
    <div className="relative w-full rounded-[28px] overflow-hidden group select-none">
      <div className="absolute inset-0 pointer-events-none opacity-0" />
      <div className="relative z-10 pointer-events-none transform-gpu flex flex-col items-center justify-center py-6">
        <button
          type="button"
          className={`${forceWhiteText ? 'text-white text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]' : 'text-muted-foreground dark:text-foreground dark:text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]'} font-thin leading-none tracking-tight cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0`}
          style={{ fontFamily: timeFont, fontSize: layout.clockFontSize }}
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
          showSeconds={showSeconds}
          onShowSecondsChange={onShowSecondsChange}
          showLunar={showLunar}
          onShowLunarChange={onShowLunarChange}
          timeAnimationEnabled={timeAnimationEnabled}
          onTimeAnimationModeChange={onTimeAnimationModeChange}
          onSelect={onTimeFontChange}
        />
        <div
          className={`flex items-center gap-3 mt-2 font-['PingFang_SC',sans-serif] ${forceWhiteText ? 'text-white' : 'text-muted-foreground'}`}
          style={{ fontSize: layout.clockMetaFontSize }}
        >
          <span>{dateString} {weekday}</span>
          {showLunar && lunar ? <span>{lunar}</span> : null}
        </div>
      </div>
    </div>
  );
});
