import { useEffect, type MutableRefObject } from 'react';
import {
  activatePendingDragSession,
  updateActiveDragSessionPointer,
  type ActiveDragSession,
  type PendingDragSession,
} from './dragSessionRuntime';
import { hasPointerDragActivated } from './pointerDragSession';

type DragPointer = {
  x: number;
  y: number;
};

export function useWindowPointerDragLifecycle<TActiveId extends string, TMeta extends object>(params: {
  pendingDragRef: MutableRefObject<PendingDragSession<TActiveId, TMeta> | null>;
  activeDragRef: MutableRefObject<ActiveDragSession<TActiveId, TMeta> | null>;
  onActivated: (activeDrag: ActiveDragSession<TActiveId, TMeta>, event: PointerEvent) => void;
  onMoved: (activeDrag: ActiveDragSession<TActiveId, TMeta>, event: PointerEvent) => void;
  onEnded: (activeDrag: ActiveDragSession<TActiveId, TMeta>, event: PointerEvent) => void;
  onPendingReleased?: (pendingDrag: PendingDragSession<TActiveId, TMeta>, event: PointerEvent) => void;
  pointerMoveOptions?: AddEventListenerOptions | boolean;
  pointerEndOptions?: AddEventListenerOptions | boolean;
}) {
  const {
    pendingDragRef,
    activeDragRef,
    onActivated,
    onMoved,
    onEnded,
    onPendingReleased,
    pointerMoveOptions,
    pointerEndOptions,
  } = params;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const toPointer = (event: PointerEvent): DragPointer => ({
      x: event.clientX,
      y: event.clientY,
    });

    const handlePointerMove = (event: PointerEvent) => {
      const activeDrag = activeDragRef.current;
      if (activeDrag && event.pointerId === activeDrag.pointerId) {
        const nextActiveDrag = updateActiveDragSessionPointer(activeDrag, toPointer(event));
        activeDragRef.current = nextActiveDrag;
        onMoved(nextActiveDrag, event);
        return;
      }

      const pendingDrag = pendingDragRef.current;
      if (!pendingDrag || event.pointerId !== pendingDrag.pointerId) {
        return;
      }

      const pointer = toPointer(event);
      if (!hasPointerDragActivated({ origin: pendingDrag.origin, pointer })) {
        return;
      }

      const nextActiveDrag = activatePendingDragSession(pendingDrag, pointer);
      pendingDragRef.current = null;
      activeDragRef.current = nextActiveDrag;
      onActivated(nextActiveDrag, event);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const pendingDrag = pendingDragRef.current;
      if (pendingDrag && event.pointerId === pendingDrag.pointerId) {
        pendingDragRef.current = null;
        onPendingReleased?.(pendingDrag, event);
        return;
      }

      const activeDrag = activeDragRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
        return;
      }

      onEnded(activeDrag, event);
    };

    window.addEventListener('pointermove', handlePointerMove, pointerMoveOptions);
    window.addEventListener('pointerup', handlePointerEnd, pointerEndOptions);
    window.addEventListener('pointercancel', handlePointerEnd, pointerEndOptions);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, pointerMoveOptions);
      window.removeEventListener('pointerup', handlePointerEnd, pointerEndOptions);
      window.removeEventListener('pointercancel', handlePointerEnd, pointerEndOptions);
    };
  }, [
    activeDragRef,
    onActivated,
    onEnded,
    onMoved,
    onPendingReleased,
    pendingDragRef,
    pointerEndOptions,
    pointerMoveOptions,
  ]);
}
