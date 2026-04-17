import { useEffect, type MutableRefObject } from 'react';
import { useDragActiveEffects } from './useDragActiveEffects';

export function useRootSurfaceEffects(params: {
  active: boolean;
  ignoreClickRef: MutableRefObject<boolean>;
  externalDragSession?: { token: number } | null;
  onExternalDragSessionConsumed?: (token: number) => void;
}) {
  const {
    active,
    ignoreClickRef,
    externalDragSession,
    onExternalDragSessionConsumed,
  } = params;

  useDragActiveEffects({
    active,
    ignoreClickRef,
  });

  useEffect(() => {
    if (!externalDragSession) return;
    onExternalDragSessionConsumed?.(externalDragSession.token);
  }, [externalDragSession, onExternalDragSessionConsumed]);
}
