import { useEffect, useState } from 'react';
import { getTimeFontScale } from '@/utils/googleFonts';
import { getMeasuredTimeFontScale, readMeasuredTimeFontScale } from '@/utils/timeFontMetrics';

export function useResolvedTimeFontScale(fontFamily: string) {
  const [scale, setScale] = useState(() => readMeasuredTimeFontScale(fontFamily) ?? getTimeFontScale(fontFamily));

  useEffect(() => {
    let cancelled = false;
    const cachedScale = readMeasuredTimeFontScale(fontFamily);
    setScale(cachedScale ?? getTimeFontScale(fontFamily));

    void getMeasuredTimeFontScale(fontFamily).then((nextScale) => {
      if (!cancelled) {
        setScale(nextScale);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fontFamily]);

  return scale;
}
