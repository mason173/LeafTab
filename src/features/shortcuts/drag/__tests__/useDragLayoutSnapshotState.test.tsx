import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDragLayoutSnapshotState } from '@/features/shortcuts/drag/useDragLayoutSnapshotState';

describe('useDragLayoutSnapshotState', () => {
  it('captures, reuses, and clears drag layout snapshots', () => {
    const { result } = renderHook(() => useDragLayoutSnapshotState<{ id: string }>());
    const firstMeasure = vi.fn(() => [{
      id: 'a',
      rect: new DOMRect(0, 0, 72, 96),
    }]);
    const secondMeasure = vi.fn(() => [{
      id: 'b',
      rect: new DOMRect(88, 0, 72, 96),
    }]);

    act(() => {
      expect(result.current.captureDragLayoutSnapshot(firstMeasure)).toEqual([{
        id: 'a',
        rect: new DOMRect(0, 0, 72, 96),
      }]);
    });

    expect(result.current.dragLayoutSnapshot).toEqual([{
      id: 'a',
      rect: new DOMRect(0, 0, 72, 96),
    }]);
    expect(firstMeasure).toHaveBeenCalledTimes(1);

    act(() => {
      expect(result.current.getDragLayoutSnapshot(secondMeasure)).toEqual([{
        id: 'a',
        rect: new DOMRect(0, 0, 72, 96),
      }]);
    });

    expect(secondMeasure).not.toHaveBeenCalled();

    act(() => {
      result.current.clearDragLayoutSnapshot();
    });

    expect(result.current.dragLayoutSnapshot).toBeNull();

    act(() => {
      expect(result.current.getDragLayoutSnapshot(secondMeasure)).toEqual([{
        id: 'b',
        rect: new DOMRect(88, 0, 72, 96),
      }]);
    });

    expect(secondMeasure).toHaveBeenCalledTimes(1);
    expect(result.current.dragLayoutSnapshot).toEqual([{
      id: 'b',
      rect: new DOMRect(88, 0, 72, 96),
    }]);
  });
});
