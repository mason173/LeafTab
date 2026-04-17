import { useCallback, useEffect, useRef, useState } from 'react';

export function useProjectionSettleSuppression(params: {
  disabled?: boolean;
}) {
  const { disabled = false } = params;
  const resumeRafRef = useRef<number | null>(null);
  const [suppressed, setSuppressed] = useState(false);

  const armProjectionSettleSuppression = useCallback(() => {
    if (disabled) {
      setSuppressed(false);
      return;
    }
    if (resumeRafRef.current !== null) {
      window.cancelAnimationFrame(resumeRafRef.current);
      resumeRafRef.current = null;
    }

    setSuppressed(true);
    const firstFrame = window.requestAnimationFrame(() => {
      resumeRafRef.current = window.requestAnimationFrame(() => {
        resumeRafRef.current = null;
        setSuppressed(false);
      });
    });
    resumeRafRef.current = firstFrame;
  }, [disabled]);

  useEffect(() => () => {
    if (resumeRafRef.current !== null) {
      window.cancelAnimationFrame(resumeRafRef.current);
      resumeRafRef.current = null;
    }
  }, []);

  return {
    suppressProjectionSettleAnimation: suppressed,
    armProjectionSettleSuppression,
  };
}
