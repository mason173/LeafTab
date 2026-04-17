import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { DragPoint } from './types';
import type {
  ActiveDragSession,
  DragHoverResolution,
  PendingDragSession,
} from './dragSessionRuntime';
import { useWindowPointerDragLifecycle } from './useWindowPointerDragLifecycle';

type DragPhase = 'activated' | 'moved';

export type ResolvedPointerDragHover<TIntent, TExtra> = {
  hoverResolution: DragHoverResolution<TIntent>;
  extra: TExtra;
};

export function useResolvedPointerDragSession<
  TActiveId extends string,
  TIntent,
  TMeta extends object,
  TExtra,
>(params: {
  pendingDragRef: MutableRefObject<PendingDragSession<TActiveId, TMeta> | null>;
  activeDragRef: MutableRefObject<ActiveDragSession<TActiveId, TMeta> | null>;
  emptyHoverResolution: DragHoverResolution<TIntent>;
  resolveHover: (params: {
    activeDrag: ActiveDragSession<TActiveId, TMeta>;
    pointer: DragPoint;
    phase: DragPhase;
    previousHoverResolution: DragHoverResolution<TIntent>;
  }) => ResolvedPointerDragHover<TIntent, TExtra>;
  onActivated?: (params: {
    activeDrag: ActiveDragSession<TActiveId, TMeta>;
    event: PointerEvent;
    pointer: DragPoint;
  }) => void;
  onHoverResolved?: (params: {
    activeDrag: ActiveDragSession<TActiveId, TMeta>;
    event: PointerEvent;
    pointer: DragPoint;
    phase: DragPhase;
    resolvedHover: ResolvedPointerDragHover<TIntent, TExtra>;
  }) => void;
  onEnded: (params: {
    activeDrag: ActiveDragSession<TActiveId, TMeta>;
    event: PointerEvent;
    hoverResolution: DragHoverResolution<TIntent>;
    clearDragState: () => void;
  }) => void;
  onPendingReleased?: (pendingDrag: PendingDragSession<TActiveId, TMeta>, event: PointerEvent) => void;
  onCleared?: () => void;
  pointerMoveOptions?: AddEventListenerOptions | boolean;
  pointerEndOptions?: AddEventListenerOptions | boolean;
}) {
  const {
    pendingDragRef,
    activeDragRef,
    emptyHoverResolution,
    resolveHover,
    onActivated,
    onHoverResolved,
    onEnded,
    onPendingReleased,
    onCleared,
    pointerMoveOptions,
    pointerEndOptions,
  } = params;
  const hoverResolutionRef = useRef(emptyHoverResolution);
  const [activeDragId, setActiveDragId] = useState<TActiveId | null>(null);
  const [dragPointer, setDragPointer] = useState<DragPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<DragPoint | null>(null);
  const [hoverResolution, setHoverResolution] = useState(emptyHoverResolution);

  const clearDragState = useCallback(() => {
    pendingDragRef.current = null;
    activeDragRef.current = null;
    hoverResolutionRef.current = emptyHoverResolution;
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    setHoverResolution(emptyHoverResolution);
    onCleared?.();
  }, [activeDragRef, emptyHoverResolution, onCleared, pendingDragRef]);

  const publishHoverResolution = useCallback((params: {
    activeDrag: ActiveDragSession<TActiveId, TMeta>;
    event: PointerEvent;
    pointer: DragPoint;
    phase: DragPhase;
  }) => {
    const resolvedHover = resolveHover({
      activeDrag: params.activeDrag,
      pointer: params.pointer,
      phase: params.phase,
      previousHoverResolution: hoverResolutionRef.current,
    });
    hoverResolutionRef.current = resolvedHover.hoverResolution;
    setHoverResolution(resolvedHover.hoverResolution);
    onHoverResolved?.({
      ...params,
      resolvedHover,
    });
  }, [onHoverResolved, resolveHover]);

  useWindowPointerDragLifecycle({
    pendingDragRef,
    activeDragRef,
    onActivated: (activeDrag, event) => {
      const pointer = { x: event.clientX, y: event.clientY };
      setActiveDragId(activeDrag.activeId);
      setDragPointer(pointer);
      setDragPreviewOffset(activeDrag.previewOffset);
      onActivated?.({
        activeDrag,
        event,
        pointer,
      });
      publishHoverResolution({
        activeDrag,
        event,
        pointer,
        phase: 'activated',
      });
    },
    onMoved: (activeDrag, event) => {
      const pointer = { x: event.clientX, y: event.clientY };
      setDragPointer(pointer);
      publishHoverResolution({
        activeDrag,
        event,
        pointer,
        phase: 'moved',
      });
    },
    onEnded: (activeDrag, event) => {
      onEnded({
        activeDrag,
        event,
        hoverResolution: hoverResolutionRef.current,
        clearDragState,
      });
    },
    onPendingReleased,
    pointerMoveOptions,
    pointerEndOptions,
  });

  return {
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
    clearDragState,
  };
}
