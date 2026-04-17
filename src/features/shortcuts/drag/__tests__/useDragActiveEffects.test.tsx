import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDragActiveEffects } from '@/features/shortcuts/drag/useDragActiveEffects';

describe('useDragActiveEffects', () => {
  it('marks clicks as ignored while dragging and notifies active changes', () => {
    const ignoreClickRef = { current: false };
    const onActiveChange = vi.fn();

    const { rerender } = renderHook(
      ({ active }) => useDragActiveEffects({
        active,
        ignoreClickRef,
        onActiveChange,
      }),
      {
        initialProps: { active: false },
      },
    );

    expect(ignoreClickRef.current).toBe(false);
    expect(onActiveChange).toHaveBeenCalledWith(false);

    rerender({ active: true });

    expect(ignoreClickRef.current).toBe(true);
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
  });

  it('clears ignored clicks after the configured delay when dragging ends', () => {
    vi.useFakeTimers();
    const ignoreClickRef = { current: false };

    try {
      const { rerender } = renderHook(
        ({ active }) => useDragActiveEffects({
          active,
          ignoreClickRef,
          clearIgnoreClickDelayMs: 120,
        }),
        {
          initialProps: { active: true },
        },
      );

      expect(ignoreClickRef.current).toBe(true);

      rerender({ active: false });
      expect(ignoreClickRef.current).toBe(true);

      vi.advanceTimersByTime(120);
      expect(ignoreClickRef.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
