import { useCallback, useLayoutEffect, type MutableRefObject } from 'react';
import {
  measureRegisteredDragItems,
  measureRegisteredItemPositions,
} from './dragDomAdapters';
import type { MeasuredDragItem } from './gridDragEngine';

export function useRegisteredDragMeasurements<T>(params: {
  items: readonly T[];
  registryRef: MutableRefObject<Map<string, HTMLDivElement>>;
  getId: (item: T) => string;
  commitMeasuredItemRects?: (commit: {
    currentRects: Map<string, { left: number; top: number }>;
    skip?: boolean;
  }) => void;
  commitSkipped?: boolean;
}): {
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
} {
  const {
    items,
    registryRef,
    getId,
    commitMeasuredItemRects,
    commitSkipped = false,
  } = params;

  const measureCurrentItems = useCallback(() => measureRegisteredDragItems({
    items,
    registry: registryRef.current,
    getId,
  }), [getId, items, registryRef]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !commitMeasuredItemRects) return;

    commitMeasuredItemRects({
      currentRects: measureRegisteredItemPositions({
        items,
        registry: registryRef.current,
        getId,
      }),
      skip: commitSkipped,
    });
  }, [commitMeasuredItemRects, commitSkipped, getId, items, registryRef]);

  return {
    measureCurrentItems,
  };
}
