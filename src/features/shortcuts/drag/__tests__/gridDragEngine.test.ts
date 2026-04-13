import { describe, expect, it } from 'vitest';
import { getDragVisualCenter } from '@/features/shortcuts/drag/gridDragEngine';

describe('getDragVisualCenter', () => {
  it('uses the compact icon preview center instead of the full card center when a visual rect is provided', () => {
    const activeRect = new DOMRect(100, 200, 72, 92);

    expect(getDragVisualCenter({
      pointer: { x: 136, y: 246 },
      previewOffset: { x: 36, y: 46 },
      activeRect,
      visualRect: {
        offsetX: 0,
        offsetY: 0,
        width: 72,
        height: 72,
      },
    })).toEqual({ x: 136, y: 236 });
  });
});
