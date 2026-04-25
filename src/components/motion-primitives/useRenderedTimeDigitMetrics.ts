import { useEffect, useState, type RefObject } from 'react';
import {
  readRenderedTimeDigitMetrics,
  type RenderedTimeDigitMetrics,
} from '@/utils/timeFontMetrics';

const DEFAULT_RENDERED_TIME_DIGIT_METRICS: RenderedTimeDigitMetrics = {
  digitHeightEm: 1.08,
  digitWidthEm: 0.66,
  digitTranslateEm: 1.08,
};

export function useRenderedTimeDigitMetrics(ref: RefObject<HTMLElement | null>) {
  const [metrics, setMetrics] = useState<RenderedTimeDigitMetrics>(DEFAULT_RENDERED_TIME_DIGIT_METRICS);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === 'undefined') return;

    const updateMetrics = () => {
      setMetrics(readRenderedTimeDigitMetrics(element));
    };

    updateMetrics();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateMetrics())
      : null;
    resizeObserver?.observe(element);

    const fontSet = document.fonts;
    const handleFontLoadingDone = () => updateMetrics();
    fontSet?.ready.then(() => updateMetrics()).catch(() => {});
    fontSet?.addEventListener?.('loadingdone', handleFontLoadingDone);

    return () => {
      resizeObserver?.disconnect();
      fontSet?.removeEventListener?.('loadingdone', handleFontLoadingDone);
    };
  }, [ref]);

  return metrics;
}
