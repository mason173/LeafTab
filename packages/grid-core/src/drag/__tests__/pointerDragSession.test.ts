import { describe, expect, it } from 'vitest';
import {
  POINTER_DRAG_ACTIVATION_DISTANCE_PX,
  buildDragAnchor,
  buildPreviewOffsetFromAnchor,
  buildPreviewOffsetFromPointer,
  hasPointerDragActivated,
} from '../pointerDragSession';

describe('pointerDragSession helpers', () => {
  it('uses the shared activation threshold for pointer drags', () => {
    expect(hasPointerDragActivated({
      origin: { x: 10, y: 10 },
      pointer: { x: 10 + POINTER_DRAG_ACTIVATION_DISTANCE_PX, y: 10 },
    })).toBe(true);

    expect(hasPointerDragActivated({
      origin: { x: 10, y: 10 },
      pointer: { x: 10 + POINTER_DRAG_ACTIVATION_DISTANCE_PX - 0.01, y: 10 },
    })).toBe(false);
  });

  it('clamps pointer-derived preview offsets to the card bounds', () => {
    expect(buildPreviewOffsetFromPointer({
      rect: { left: 100, top: 200, width: 80, height: 60 },
      pointer: { x: 260, y: 120 },
    })).toEqual({ x: 80, y: 0 });
  });

  it('rebuilds preview offsets from normalized anchors', () => {
    expect(buildPreviewOffsetFromAnchor({
      rect: { width: 80, height: 60 },
      anchor: { xRatio: 0.25, yRatio: 0.5 },
    })).toEqual({ x: 20, y: 30 });
  });

  it('derives normalized anchors from preview offsets', () => {
    expect(buildDragAnchor({
      rect: { width: 80, height: 60 },
      previewOffset: { x: 20, y: 30 },
    })).toEqual({ xRatio: 0.25, yRatio: 0.5 });
  });

  it('falls back to center anchors when the source rect is empty', () => {
    expect(buildDragAnchor({
      rect: { width: 0, height: 0 },
      previewOffset: { x: 0, y: 0 },
    })).toEqual({ xRatio: 0.5, yRatio: 0.5 });
  });
});
