import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { useDragActiveEffects } from './useDragActiveEffects';

export function useFolderSurfaceEffects(params: {
  active: boolean;
  ignoreClickRef: MutableRefObject<boolean>;
  onDragActiveChange?: (active: boolean) => void;
  clearDragState: () => void;
  clearDragSettlePreview: () => void;
}) {
  const {
    active,
    ignoreClickRef,
    onDragActiveChange,
    clearDragState,
    clearDragSettlePreview,
  } = params;

  useDragActiveEffects({
    active,
    ignoreClickRef,
    onActiveChange: onDragActiveChange,
    clearIgnoreClickDelayMs: 120,
  });

  useEffect(() => () => {
    onDragActiveChange?.(false);
    clearDragState();
    clearDragSettlePreview();
  }, [clearDragSettlePreview, clearDragState, onDragActiveChange]);
}
