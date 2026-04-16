import type { Shortcut } from '@leaftab/workspace-core';
import { describe, expect, it } from 'vitest';
import {
  buildDraggedRootItemAnchorRect,
  buildProjectedRootItemPreviewRect,
  buildProjectedRootItemAnchorRect,
  buildProjectedGridItemsPreservingFrozenSlotsByOrdinal,
  buildProjectedGridItemsForRootReorder,
  buildRootShortcutGridItems,
  resolveFinalHoverIntent,
  resolveSpanAwareSlotHitRect,
  resolveSpanAwareSlotProbePoint,
  shouldSkipLayoutShiftOnAnimationReenable,
} from './rootShortcutGridHelpers';

function createShortcut(id: string, title = id): Shortcut {
  return {
    id,
    title,
    url: `https://${id}.example.com`,
    icon: '',
  };
}

describe('buildRootShortcutGridItems', () => {
  it('generates stable duplicate-safe sort ids', () => {
    const items = buildRootShortcutGridItems({
      shortcuts: [createShortcut('dup'), createShortcut('dup'), createShortcut('unique')],
      resolveItemLayout: () => ({ width: 72, height: 96 }),
    });

    expect(items.map((item) => item.sortId)).toEqual([
      'dup',
      'dup::dup-1',
      'unique',
    ]);
  });

  it('preserves an explicit previewRect on normalized items', () => {
    const [item] = buildRootShortcutGridItems({
      shortcuts: [createShortcut('preview')],
      resolveItemLayout: () => ({
        width: 72,
        height: 96,
        previewRect: {
          left: 0,
          top: 0,
          width: 72,
          height: 72,
          borderRadius: '20px',
        },
      }),
    });

    expect(item.layout.previewOffsetX).toBe(0);
    expect(item.layout.previewOffsetY).toBe(0);
    expect(item.layout.previewRect).toEqual({
      left: 0,
      top: 0,
      width: 72,
      height: 72,
      borderRadius: '20px',
    });
  });
});

describe('buildProjectedGridItemsForRootReorder', () => {
  it('reorders normally in a simple single-span list', () => {
    const items = buildRootShortcutGridItems({
      shortcuts: [createShortcut('a'), createShortcut('b'), createShortcut('c')],
      resolveItemLayout: () => ({ width: 72, height: 96 }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'a',
      targetIndex: 2,
    });

    expect(projected?.map((item) => item.sortId)).toEqual(['b', 'c', 'a']);
  });

  it('keeps frozen multi-span items pinned while reordering a small item around them', () => {
    const shortcuts = [
      createShortcut('a'),
      createShortcut('folder-large'),
      createShortcut('b'),
      createShortcut('c'),
    ];
    const items = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: (shortcut) => ({
        width: shortcut.id === 'folder-large' ? 160 : 72,
        height: shortcut.id === 'folder-large' ? 160 : 96,
        columnSpan: shortcut.id === 'folder-large' ? 2 : 1,
        rowSpan: shortcut.id === 'folder-large' ? 2 : 1,
        preserveSlot: shortcut.id === 'folder-large',
      }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'c',
      targetIndex: 0,
      frozenSortIds: new Set(['folder-large']),
    });

    expect(projected?.map((item) => item.sortId)).toEqual([
      'c',
      'folder-large',
      'a',
      'b',
    ]);
  });

  it('can move a multi-span item itself through the same reorder path', () => {
    const shortcuts = [
      createShortcut('a'),
      createShortcut('b'),
      createShortcut('folder-large'),
      createShortcut('c'),
    ];
    const items = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: (shortcut) => ({
        width: shortcut.id === 'folder-large' ? 160 : 72,
        height: shortcut.id === 'folder-large' ? 160 : 96,
        columnSpan: shortcut.id === 'folder-large' ? 2 : 1,
        rowSpan: shortcut.id === 'folder-large' ? 2 : 1,
      }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'folder-large',
      targetIndex: 0,
    });

    expect(projected?.map((item) => item.sortId)).toEqual([
      'folder-large',
      'a',
      'b',
      'c',
    ]);
  });

  it('maps movable ordinals back onto the full list when frozen slots exist', () => {
    const shortcuts = [
      createShortcut('a'),
      createShortcut('folder-large'),
      createShortcut('b'),
      createShortcut('c'),
    ];
    const items = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: (shortcut) => ({
        width: shortcut.id === 'folder-large' ? 160 : 72,
        height: shortcut.id === 'folder-large' ? 160 : 96,
        columnSpan: shortcut.id === 'folder-large' ? 2 : 1,
        rowSpan: shortcut.id === 'folder-large' ? 2 : 1,
      }),
    });

    const projected = buildProjectedGridItemsPreservingFrozenSlotsByOrdinal({
      items,
      activeSortId: 'c',
      targetMovableOrdinal: 0,
      frozenSortIds: new Set(['folder-large']),
    });

    expect(projected?.activeFullIndex).toBe(0);
    expect(projected?.projectedItems.map((item) => item.sortId)).toEqual([
      'c',
      'folder-large',
      'a',
      'b',
    ]);
  });
});

describe('buildProjectedRootItemPreviewRect', () => {
  it('anchors multi-span preview rects to the full item slot instead of re-centering only the preview body', () => {
    const rect = buildProjectedRootItemPreviewRect({
      placedItem: {
        columnStart: 2,
        rowStart: 2,
        columnSpan: 2,
      },
      gridColumnWidth: 72,
      columnGap: 12,
      rowHeight: 96,
      rowGap: 20,
      layout: {
        width: 156,
        height: 180,
        previewWidth: 152,
        previewHeight: 156,
        previewOffsetX: 2,
        previewOffsetY: 4,
        previewBorderRadius: '16px',
      },
    });

    expect(rect).toEqual({
      left: 86,
      top: 120,
      width: 152,
      height: 156,
      borderRadius: '16px',
    });
  });
});

describe('buildProjectedRootItemAnchorRect', () => {
  it('returns the physical top-left grid cell for multi-span placements', () => {
    expect(buildProjectedRootItemAnchorRect({
      placedItem: {
        columnStart: 2,
        rowStart: 3,
      },
      gridColumnWidth: 72,
      columnGap: 12,
      rowHeight: 96,
      rowGap: 20,
    })).toEqual({
      left: 84,
      top: 232,
      width: 72,
      height: 96,
    });
  });
});

describe('buildDraggedRootItemAnchorRect', () => {
  it('maps a dragged large-folder card back onto its physical anchor cell', () => {
    expect(buildDraggedRootItemAnchorRect({
      itemRect: {
        left: 200,
        top: 180,
      },
      gridColumnWidth: 72,
      columnGap: 12,
      rowHeight: 96,
      layout: {
        width: 156,
        columnSpan: 2,
      },
    })).toEqual({
      left: 200,
      top: 180,
      width: 72,
      height: 96,
    });
  });
});

describe('resolveSpanAwareSlotProbePoint', () => {
  it('keeps single-span items on the raw pointer point', () => {
    expect(resolveSpanAwareSlotProbePoint({
      point: { x: 140, y: 96 },
      anchorRect: {
        left: 100,
        top: 60,
        width: 72,
        height: 96,
      } as DOMRect,
      layout: {
        columnSpan: 1,
        rowSpan: 1,
      },
    })).toEqual({ x: 140, y: 96 });
  });

  it('anchors multi-span items to the origin cell center instead of the full preview center', () => {
    expect(resolveSpanAwareSlotProbePoint({
      point: { x: 320, y: 300 },
      anchorRect: {
        left: 200,
        top: 180,
        width: 72,
        height: 96,
      },
      layout: {
        columnSpan: 2,
        rowSpan: 2,
      },
    })).toEqual({ x: 236, y: 228 });
  });
});

describe('resolveSpanAwareSlotHitRect', () => {
  it('keeps single-span slot hit rects equal to the preview rect', () => {
    expect(resolveSpanAwareSlotHitRect({
      previewRect: {
        left: 100,
        top: 60,
        width: 72,
        height: 72,
      },
      anchorRect: {
        left: 100,
        top: 60,
        width: 72,
        height: 96,
      },
      layout: {
        columnSpan: 1,
        rowSpan: 1,
      },
    })).toEqual({
      left: 100,
      top: 60,
      width: 72,
      height: 72,
    });
  });

  it('shrinks multi-span slot hit rects to the origin preview cell', () => {
    expect(resolveSpanAwareSlotHitRect({
      previewRect: {
        left: 200,
        top: 180,
        width: 160,
        height: 160,
      },
      anchorRect: {
        left: 200,
        top: 180,
        width: 72,
        height: 96,
      },
      layout: {
        columnSpan: 2,
        rowSpan: 2,
      },
    })).toEqual({
      left: 200,
      top: 180,
      width: 72,
      height: 96,
    });
  });
});

describe('shouldSkipLayoutShiftOnAnimationReenable', () => {
  it('skips the first layout-shift commit after animation is re-enabled', () => {
    expect(shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: true,
      animationDisabled: false,
    })).toBe(true);
  });

  it('does not skip while animation remains disabled or was already enabled', () => {
    expect(shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: true,
      animationDisabled: true,
    })).toBe(false);
    expect(shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: false,
      animationDisabled: false,
    })).toBe(false);
  });
});

describe('resolveFinalHoverIntent', () => {
  it('prefers the interaction intent when one is still active', () => {
    expect(resolveFinalHoverIntent({
      interactionIntent: 'merge',
      visualProjectionIntent: 'reorder',
    })).toBe('merge');
  });

  it('falls back to the current visual projection when interaction intent is empty', () => {
    expect(resolveFinalHoverIntent({
      interactionIntent: null,
      visualProjectionIntent: 'reorder',
    })).toBe('reorder');
  });

  it('returns null when neither interaction nor visual projection is active', () => {
    expect(resolveFinalHoverIntent({
      interactionIntent: null,
      visualProjectionIntent: null,
    })).toBeNull();
  });
});
