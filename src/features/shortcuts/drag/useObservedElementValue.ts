import { useLayoutEffect, useState } from 'react';
import type React from 'react';

export function useObservedElementValue<T>(params: {
  elementRef: React.RefObject<HTMLElement | null>;
  initialValue: T;
  computeValue: (element: HTMLElement) => T;
  areEqual?: (current: T, next: T) => boolean;
}) {
  const {
    elementRef,
    initialValue,
    computeValue,
    areEqual = Object.is,
  } = params;
  const [value, setValue] = useState<T>(initialValue);

  useLayoutEffect(() => {
    const node = elementRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateValue = () => {
      const nextValue = computeValue(node);
      setValue((currentValue) => (
        areEqual(currentValue, nextValue) ? currentValue : nextValue
      ));
    };

    updateValue();
    const resizeObserver = new ResizeObserver(updateValue);
    resizeObserver.observe(node);
    window.addEventListener('resize', updateValue, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateValue);
    };
  }, [areEqual, computeValue, elementRef]);

  return value;
}
