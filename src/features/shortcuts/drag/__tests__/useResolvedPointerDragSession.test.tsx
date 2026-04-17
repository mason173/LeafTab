import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyDragHoverResolution, type ActiveDragSession, type PendingDragSession } from '@/features/shortcuts/drag/dragSessionRuntime';
import { useResolvedPointerDragSession } from '@/features/shortcuts/drag/useResolvedPointerDragSession';

type TestIntent = {
  phase: 'activated' | 'moved';
  pointerX: number;
};

describe('useResolvedPointerDragSession', () => {
  it('activates pending drags, publishes hover updates, and clears state after end', () => {
    const pendingDragRef: { current: PendingDragSession<'a'> | null } = {
      current: {
        activeId: 'a',
        pointerId: 1,
        pointerType: 'mouse',
        origin: { x: 10, y: 10 },
        previewOffset: { x: 12, y: 14 },
      },
    };
    const activeDragRef: { current: ActiveDragSession<'a'> | null } = { current: null };
    const onActivated = vi.fn();
    const onHoverResolved = vi.fn();
    const onEnded = vi.fn(({ clearDragState }: { clearDragState: () => void }) => {
      clearDragState();
    });
    const onCleared = vi.fn();

    const { result } = renderHook(() => useResolvedPointerDragSession({
      pendingDragRef,
      activeDragRef,
      emptyHoverResolution: createEmptyDragHoverResolution<TestIntent>(),
      resolveHover: ({ pointer, phase }) => ({
        hoverResolution: {
          interactionIntent: { phase, pointerX: pointer.x },
          visualProjectionIntent: null,
        },
        extra: {
          recognitionPoint: pointer,
        },
      }),
      onActivated,
      onHoverResolved,
      onEnded,
      onCleared,
    }));

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 15,
      clientY: 10,
    });

    expect(result.current.activeDragId).toBeNull();
    expect(onActivated).not.toHaveBeenCalled();

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 16,
      clientY: 10,
    });

    expect(result.current.activeDragId).toBe('a');
    expect(result.current.dragPointer).toEqual({ x: 16, y: 10 });
    expect(result.current.dragPreviewOffset).toEqual({ x: 12, y: 14 });
    expect(result.current.hoverResolution).toEqual({
      interactionIntent: { phase: 'activated', pointerX: 16 },
      visualProjectionIntent: null,
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(onHoverResolved).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: 'activated',
      pointer: { x: 16, y: 10 },
      resolvedHover: {
        hoverResolution: {
          interactionIntent: { phase: 'activated', pointerX: 16 },
          visualProjectionIntent: null,
        },
        extra: {
          recognitionPoint: { x: 16, y: 10 },
        },
      },
    }));
    expect(activeDragRef.current?.pointer).toEqual({ x: 16, y: 10 });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 24,
      clientY: 14,
    });

    expect(result.current.dragPointer).toEqual({ x: 24, y: 14 });
    expect(result.current.hoverResolution).toEqual({
      interactionIntent: { phase: 'moved', pointerX: 24 },
      visualProjectionIntent: null,
    });
    expect(onHoverResolved).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: 'moved',
      pointer: { x: 24, y: 14 },
    }));

    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 24,
      clientY: 14,
    });

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenLastCalledWith(expect.objectContaining({
      hoverResolution: {
        interactionIntent: { phase: 'moved', pointerX: 24 },
        visualProjectionIntent: null,
      },
    }));
    expect(result.current.activeDragId).toBeNull();
    expect(result.current.dragPointer).toBeNull();
    expect(result.current.dragPreviewOffset).toBeNull();
    expect(result.current.hoverResolution).toEqual(createEmptyDragHoverResolution());
    expect(pendingDragRef.current).toBeNull();
    expect(activeDragRef.current).toBeNull();
    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it('forwards pending releases before activation', () => {
    const pendingDragRef: { current: PendingDragSession<'a'> | null } = {
      current: {
        activeId: 'a',
        pointerId: 2,
        pointerType: 'mouse',
        origin: { x: 10, y: 10 },
        previewOffset: { x: 12, y: 14 },
      },
    };
    const activeDragRef: { current: ActiveDragSession<'a'> | null } = { current: null };
    const onPendingReleased = vi.fn();
    const onEnded = vi.fn();

    const { result } = renderHook(() => useResolvedPointerDragSession({
      pendingDragRef,
      activeDragRef,
      emptyHoverResolution: createEmptyDragHoverResolution<TestIntent>(),
      resolveHover: ({ pointer, phase }) => ({
        hoverResolution: {
          interactionIntent: { phase, pointerX: pointer.x },
          visualProjectionIntent: null,
        },
        extra: null,
      }),
      onEnded,
      onPendingReleased,
    }));

    fireEvent.pointerUp(window, {
      pointerId: 2,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 10,
      clientY: 10,
    });

    expect(onPendingReleased).toHaveBeenCalledTimes(1);
    expect(onEnded).not.toHaveBeenCalled();
    expect(pendingDragRef.current).toBeNull();
    expect(result.current.activeDragId).toBeNull();
  });
});
