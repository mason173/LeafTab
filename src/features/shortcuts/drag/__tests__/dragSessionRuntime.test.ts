import { describe, expect, it } from 'vitest';
import {
  activatePendingDragSession,
  buildDragSessionVisualRect,
  createEmptyDragHoverResolution,
  deriveDragSessionGeometry,
  resolveFinalHoverIntent,
  updateActiveDragSessionPointer,
} from '@/features/shortcuts/drag/dragSessionRuntime';

describe('dragSessionRuntime', () => {
  it('activates and updates a pending drag session without losing metadata', () => {
    const pending = {
      activeId: 'shortcut-a',
      activeShortcutIndex: 2,
      pointerId: 7,
      pointerType: 'mouse',
      origin: { x: 10, y: 12 },
      previewOffset: { x: 18, y: 20 },
    };

    const active = activatePendingDragSession(pending, { x: 30, y: 44 });
    const updated = updateActiveDragSessionPointer(active, { x: 48, y: 56 });

    expect(active).toEqual({
      ...pending,
      pointer: { x: 30, y: 44 },
    });
    expect(updated).toEqual({
      ...pending,
      pointer: { x: 48, y: 56 },
    });
  });

  it('derives recognition point and visual rect from the same drag session geometry', () => {
    const geometry = deriveDragSessionGeometry({
      pointer: { x: 160, y: 120 },
      previewOffset: { x: 24, y: 36 },
      activeRect: { width: 72, height: 96 },
      visualBounds: {
        offsetX: 8,
        offsetY: 4,
        width: 56,
        height: 56,
      },
    });

    expect(geometry.visualRect).toEqual({
      left: 144,
      top: 88,
      right: 200,
      bottom: 144,
      width: 56,
      height: 56,
    });
    expect(geometry.recognitionPoint).toEqual({
      x: 172,
      y: 116,
    });
  });

  it('builds a visual rect directly from pointer and preview offsets', () => {
    expect(buildDragSessionVisualRect({
      pointer: { x: 120, y: 90 },
      previewOffset: { x: 20, y: 30 },
      visualBounds: {
        offsetX: 6,
        offsetY: 10,
        width: 40,
        height: 24,
      },
    })).toEqual({
      left: 106,
      top: 70,
      right: 146,
      bottom: 94,
      width: 40,
      height: 24,
    });
  });

  it('prefers interaction intent over visual projection when resolving the final intent', () => {
    const hover = createEmptyDragHoverResolution<'reorder' | 'merge'>();
    hover.visualProjectionIntent = 'reorder';
    hover.interactionIntent = 'merge';

    expect(resolveFinalHoverIntent(hover)).toBe('merge');
  });
});
