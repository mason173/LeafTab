import { useState, useEffect } from 'react';
import { Solar } from 'lunar-javascript';

export function useClock(is24Hour: boolean, showSeconds: boolean, language: string) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState(new Date());
  const [lunar, setLunar] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDate(now);
      
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      if (!is24Hour) {
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
        setTime(`${timeStr} ${period}`);
      } else {
        const hoursStr = hours.toString().padStart(2, '0');
        const timeStr = showSeconds ? `${hoursStr}:${minutes}:${seconds}` : `${hoursStr}:${minutes}`;
        setTime(timeStr);
      }
      
      const solar = Solar.fromDate(now);
      const lunarDate = solar.getLunar();
      const m = lunarDate.getMonth();
      const d = lunarDate.getDay();
      const lang = language || 'en';
      if (lang.startsWith('zh')) {
        const lunarMonthRaw = lunarDate.getMonthInChinese();
        const lunarMonth = lunarMonthRaw.includes('月') ? lunarMonthRaw : `${lunarMonthRaw}月`;
        const lunarDay = lunarDate.getDayInChinese();
        setLunar(`${lunarMonth}${lunarDay}`);
      } else if (lang.startsWith('ja')) {
        setLunar(`${m}月${d}日`);
      } else if (lang.startsWith('ko')) {
        setLunar(`${m}월 ${d}일`);
      } else if (lang.startsWith('vi')) {
        setLunar(`Ngày ${d} Tháng ${m}`);
      } else {
        setLunar('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [is24Hour, showSeconds, language]);

  return { time, date, lunar };
}
