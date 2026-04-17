import { useEffect, type MutableRefObject } from 'react';

export function useDragActiveEffects(params: {
  active: boolean;
  ignoreClickRef: MutableRefObject<boolean>;
  onActiveChange?: (active: boolean) => void;
  clearIgnoreClickDelayMs?: number;
}) {
  const {
    active,
    ignoreClickRef,
    onActiveChange,
    clearIgnoreClickDelayMs,
  } = params;

  useEffect(() => {
    if (active) {
      ignoreClickRef.current = true;
      onActiveChange?.(true);
      return undefined;
    }

    let resetTimer: number | null = null;
    if (typeof clearIgnoreClickDelayMs === 'number') {
      resetTimer = window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, clearIgnoreClickDelayMs);
    }
    onActiveChange?.(false);

    return () => {
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }
    };
  }, [active, clearIgnoreClickDelayMs, ignoreClickRef, onActiveChange]);
}
