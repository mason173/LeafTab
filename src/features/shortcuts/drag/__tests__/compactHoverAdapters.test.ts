import { describe, expect, it } from 'vitest';
import { buildRootSlotIntent } from '@/features/shortcuts/drag/compactHoverAdapters';
import type { Shortcut } from '@/types';

const createLink = (id: string): Shortcut => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

describe('compactHoverAdapters', () => {
  it('builds the nearest root slot reorder intent from the projected active footprint', () => {
    const shortcuts = [createLink('a'), createLink('b'), createLink('c')];
    const items = shortcuts.map((shortcut) => ({
      sortId: shortcut.id,
      shortcut,
      layout: {
        width: 72,
        height: 96,
        previewWidth: 72,
        previewHeight: 72,
        previewOffsetX: 0,
        previewOffsetY: 0,
        columnSpan: 1,
        rowSpan: 1,
      },
    }));

    expect(buildRootSlotIntent({
      items,
      shortcuts,
      activeSortId: 'a',
      recognitionPoint: { x: 166, y: 48 },
      rootRect: new DOMRect(0, 0, 336, 96),
      gridColumns: 3,
      gridColumnWidth: 100,
      columnGap: 16,
      rowHeight: 96,
      rowGap: 20,
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    });
  });
});
