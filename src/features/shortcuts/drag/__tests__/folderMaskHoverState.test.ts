import { describe, expect, it } from 'vitest';
import { createEmptyDragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import { resolveFolderMaskHoverState } from '@/features/shortcuts/drag/folderMaskHoverState';

describe('folderMaskHoverState', () => {
  it('returns an empty hover state when no recognition point is available', () => {
    const hoverResolution = createEmptyDragHoverResolution<any>();
    hoverResolution.interactionIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    expect(resolveFolderMaskHoverState({
      hoverResolution,
      recognitionPoint: null,
      boundaryRect: new DOMRect(0, 0, 100, 100),
    })).toEqual({
      hoverResolution: createEmptyDragHoverResolution(),
      hoveredMask: false,
      recognitionPoint: null,
      shouldScheduleExtractHandoff: false,
    });
  });

  it('suppresses hover intents and schedules extract handoff outside the mask boundary', () => {
    const hoverResolution = createEmptyDragHoverResolution<any>();
    hoverResolution.visualProjectionIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    expect(resolveFolderMaskHoverState({
      hoverResolution,
      recognitionPoint: { x: 120, y: 50 },
      boundaryRect: new DOMRect(0, 0, 100, 100),
    })).toEqual({
      hoverResolution: createEmptyDragHoverResolution(),
      hoveredMask: true,
      recognitionPoint: { x: 120, y: 50 },
      shouldScheduleExtractHandoff: true,
    });
  });

  it('preserves hover intents while the recognition point remains inside the mask boundary', () => {
    const hoverResolution = createEmptyDragHoverResolution<any>();
    hoverResolution.interactionIntent = {
      type: 'enter-folder',
      activeShortcutId: 'a',
      folderId: 'folder',
      folderShortcutId: 'b',
    };

    expect(resolveFolderMaskHoverState({
      hoverResolution,
      recognitionPoint: { x: 40, y: 50 },
      boundaryRect: new DOMRect(0, 0, 100, 100),
    })).toEqual({
      hoverResolution,
      hoveredMask: false,
      recognitionPoint: { x: 40, y: 50 },
      shouldScheduleExtractHandoff: false,
    });
  });
});
