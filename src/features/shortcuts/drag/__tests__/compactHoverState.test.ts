import { describe, expect, it } from 'vitest';
import { createEmptyDragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import { resolveMeasuredCompactHoverState } from '@/features/shortcuts/drag/compactHoverState';

type TestItem = {
  id: string;
  layout: {
    previewOffsetX: number;
    previewOffsetY: number;
    previewWidth: number;
    previewHeight: number;
  };
};

describe('resolveMeasuredCompactHoverState', () => {
  it('returns an empty hover resolution when the active item is missing', () => {
    const result = resolveMeasuredCompactHoverState({
      activeId: 'missing',
      pointer: { x: 48, y: 52 },
      previewOffset: { x: 20, y: 24 },
      measuredItems: [],
      previousRecognitionPoint: null,
      previousHoverResolution: createEmptyDragHoverResolution<string>(),
      createEmptyHoverResolution: () => createEmptyDragHoverResolution<string>(),
      getId: (item) => item.id,
      getVisualBounds: (item) => ({
        offsetX: item.layout.previewOffsetX,
        offsetY: item.layout.previewOffsetY,
        width: item.layout.previewWidth,
        height: item.layout.previewHeight,
      }),
      resolveHoverResolution: () => ({
        interactionIntent: 'unexpected',
        visualProjectionIntent: null,
      }),
    });

    expect(result).toEqual({
      activeItem: null,
      activeVisualRect: null,
      hoverResolution: {
        interactionIntent: null,
        visualProjectionIntent: null,
      },
      recognitionPoint: null,
    });
  });

  it('derives geometry first and forwards it into hover resolution calculation', () => {
    const measuredItems = [{
      id: 'a',
      layout: {
        previewOffsetX: 8,
        previewOffsetY: 4,
        previewWidth: 56,
        previewHeight: 56,
      },
      rect: new DOMRect(0, 0, 72, 96),
    }];

    const result = resolveMeasuredCompactHoverState({
      activeId: 'a',
      pointer: { x: 160, y: 120 },
      previewOffset: { x: 24, y: 36 },
      measuredItems,
      previousRecognitionPoint: { x: 80, y: 48 },
      previousHoverResolution: createEmptyDragHoverResolution<string>(),
      createEmptyHoverResolution: () => createEmptyDragHoverResolution<string>(),
      getId: (item) => item.id,
      getVisualBounds: (item) => ({
        offsetX: item.layout.previewOffsetX,
        offsetY: item.layout.previewOffsetY,
        width: item.layout.previewWidth,
        height: item.layout.previewHeight,
      }),
      resolveHoverResolution: ({ recognitionPoint, activeVisualRect, previousRecognitionPoint }) => {
        expect(previousRecognitionPoint).toEqual({ x: 80, y: 48 });
        expect(recognitionPoint).toEqual({ x: 172, y: 116 });
        expect(activeVisualRect).toEqual({
          left: 144,
          top: 88,
          right: 200,
          bottom: 144,
          width: 56,
          height: 56,
        });
        return {
          interactionIntent: 'interaction',
          visualProjectionIntent: 'visual',
        };
      },
    });

    expect(result.hoverResolution).toEqual({
      interactionIntent: 'interaction',
      visualProjectionIntent: 'visual',
    });
    expect(result.recognitionPoint).toEqual({ x: 172, y: 116 });
  });
});
