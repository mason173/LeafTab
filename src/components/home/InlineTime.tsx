import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeFontDialog } from '@/components/TimeFontDialog';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { useClock } from '@/hooks/useClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface InlineTimeProps {
  is24Hour: boolean;
  showSeconds: boolean;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  forceWhiteText: boolean;
  layout: ResponsiveLayout;
}

export function InlineTime({
  is24Hour,
  showSeconds,
  timeFont,
  onTimeFontChange,
  forceWhiteText,
  layout,
}: InlineTimeProps) {
  const { i18n } = useTranslation();
  const { time, date, lunar } = useClock(is24Hour, showSeconds, i18n.language);
  const [timeFontDialogOpen, setTimeFontDialogOpen] = useState(false);
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const dateString = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  return (
    <div className="relative w-full rounded-[28px] overflow-hidden group select-none">
      <div className="absolute inset-0 pointer-events-none opacity-0" />
      <div className="relative z-10 pointer-events-none transform-gpu flex flex-col items-center justify-center py-6">
        <button
          type="button"
          className={`${forceWhiteText ? 'text-white text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]' : 'text-muted-foreground dark:text-foreground dark:text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]'} font-thin leading-none tracking-tight cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0`}
          style={{ fontFamily: timeFont, fontSize: layout.clockFontSize }}
          onClick={() => setTimeFontDialogOpen(true)}
          aria-label={time}
        >
          <SlidingClockTime time={time} />
        </button>
        <TimeFontDialog
          open={timeFontDialogOpen}
          onOpenChange={setTimeFontDialogOpen}
          currentFont={timeFont}
          previewTime={time}
          onSelect={onTimeFontChange}
        />
        <div
          className={`flex items-center gap-3 mt-2 font-['PingFang_SC',sans-serif] ${forceWhiteText ? 'text-white' : 'text-muted-foreground'}`}
          style={{ fontSize: layout.clockMetaFontSize }}
        >
          <span>{dateString} {weekday}</span>
          {lunar && <span>{lunar}</span>}
        </div>
      </div>
    </div>
  );
}
