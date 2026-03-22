import { useEffect, useRef, useState } from 'react';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';

type LunarModule = typeof import('lunar-javascript');

const LUNAR_LANGUAGE_PREFIXES = ['zh', 'ja', 'ko', 'vi'] as const;

let lunarModulePromise: Promise<LunarModule> | null = null;

function shouldRenderLunar(language: string): boolean {
  const normalizedLanguage = (language || '').toLowerCase();
  return LUNAR_LANGUAGE_PREFIXES.some((prefix) => normalizedLanguage.startsWith(prefix));
}

function loadLunarModule(): Promise<LunarModule> {
  if (!lunarModulePromise) {
    lunarModulePromise = import('lunar-javascript');
  }
  return lunarModulePromise;
}

function formatTimeValue(now: Date, is24Hour: boolean, showSeconds: boolean): string {
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  if (!is24Hour) {
    hours = hours % 12;
    hours = hours ? hours : 12;
    return showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  }

  const hoursStr = hours.toString().padStart(2, '0');
  return showSeconds ? `${hoursStr}:${minutes}:${seconds}` : `${hoursStr}:${minutes}`;
}

function formatLunarValue(lunarLib: LunarModule, now: Date, language: string): string {
  const solar = lunarLib.Solar.fromDate(now);
  const lunarDate = solar.getLunar();
  const month = lunarDate.getMonth();
  const day = lunarDate.getDay();
  const normalizedLanguage = language || 'en';

  if (normalizedLanguage.startsWith('zh')) {
    const lunarMonthRaw = lunarDate.getMonthInChinese();
    const lunarMonth = lunarMonthRaw.includes('月') ? lunarMonthRaw : `${lunarMonthRaw}月`;
    const lunarDay = lunarDate.getDayInChinese();
    return `${lunarMonth}${lunarDay}`;
  }
  if (normalizedLanguage.startsWith('ja')) {
    return `${month}月${day}日`;
  }
  if (normalizedLanguage.startsWith('ko')) {
    return `${month}월 ${day}일`;
  }
  if (normalizedLanguage.startsWith('vi')) {
    return `Ngày ${day} Tháng ${month}`;
  }
  return '';
}

export function useClock(is24Hour: boolean, showSeconds: boolean, language: string, showLunar = true) {
  const initialNow = new Date();
  const isDocumentVisible = useDocumentVisibility();
  const [time, setTime] = useState(() => formatTimeValue(initialNow, is24Hour, showSeconds));
  const [date, setDate] = useState(initialNow);
  const [lunar, setLunar] = useState('');
  const lunarModuleRef = useRef<LunarModule | null>(null);
  const calendarDayKeyRef = useRef('');

  useEffect(() => {
    let timer: number | null = null;

    const updateTime = () => {
      setTime(formatTimeValue(new Date(), is24Hour, showSeconds));
    };

    updateTime();

    if (!isDocumentVisible) {
      return;
    }

    const scheduleNextTick = () => {
      const stepMs = showSeconds ? 1000 : 60_000;
      const now = Date.now();
      const delay = stepMs - (now % stepMs) + 8;
      timer = window.setTimeout(() => {
        updateTime();
        scheduleNextTick();
      }, Math.max(16, delay));
    };

    scheduleNextTick();

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [is24Hour, isDocumentVisible, showSeconds]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let cancelDeferredLunarLoad: (() => void) | null = null;
    const needsLunar = showLunar && shouldRenderLunar(language);

    const updateCalendar = (force = false) => {
      const now = new Date();
      const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const dayChanged = dayKey !== calendarDayKeyRef.current;

      if (dayChanged || force) {
        calendarDayKeyRef.current = dayKey;
        setDate(now);
      }

      if (!needsLunar) {
        setLunar('');
        return;
      }

      const applyLunar = (module: LunarModule) => {
        if (!cancelled) {
          setLunar(formatLunarValue(module, now, language));
        }
      };

      if (lunarModuleRef.current) {
        if (dayChanged || force) {
          applyLunar(lunarModuleRef.current);
        }
        return;
      }

      setLunar('');
    };

    updateCalendar(true);

    if (needsLunar && !lunarModuleRef.current && isDocumentVisible) {
      cancelDeferredLunarLoad = scheduleAfterInteractivePaint(() => {
        void loadLunarModule()
          .then((module) => {
            if (cancelled) return;
            lunarModuleRef.current = module;
            updateCalendar(true);
          })
          .catch(() => {
            if (!cancelled) setLunar('');
          });
      }, {
        delayMs: 120,
        idleTimeoutMs: 320,
      });
    }

    if (!isDocumentVisible) {
      return () => {
        cancelled = true;
      };
    }

    const scheduleNextCalendarTick = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 32);
      const delay = nextMidnight.getTime() - now.getTime();
      timer = window.setTimeout(() => {
        updateCalendar(true);
        scheduleNextCalendarTick();
      }, Math.max(1000, delay));
    };

    scheduleNextCalendarTick();

    return () => {
      cancelled = true;
      if (cancelDeferredLunarLoad) {
        cancelDeferredLunarLoad();
      }
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [isDocumentVisible, language, showLunar]);

  return { time, date, lunar };
}
