import { useEffect, useRef, useState } from 'react';

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

export function useClock(is24Hour: boolean, showSeconds: boolean, language: string) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState(new Date());
  const [lunar, setLunar] = useState('');
  const lunarModuleRef = useRef<LunarModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    const needsLunar = shouldRenderLunar(language);

    const updateTime = () => {
      const now = new Date();
      setDate(now);

      setTime(formatTimeValue(now, is24Hour, showSeconds));

      if (!needsLunar) {
        setLunar('');
        return;
      }

      if (lunarModuleRef.current) {
        setLunar(formatLunarValue(lunarModuleRef.current, now, language));
      } else {
        setLunar('');
      }
    };

    updateTime();

    if (needsLunar && !lunarModuleRef.current) {
      void loadLunarModule()
        .then((module) => {
          if (cancelled) return;
          lunarModuleRef.current = module;
          updateTime();
        })
        .catch(() => {
          if (!cancelled) setLunar('');
        });
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
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [is24Hour, showSeconds, language]);

  return { time, date, lunar };
}
