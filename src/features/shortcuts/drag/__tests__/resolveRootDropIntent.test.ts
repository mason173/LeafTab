import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import { resolveRootDropIntent } from '@/features/shortcuts/drag/resolveRootDropIntent';
import type { DragRect, RootShortcutDragItem } from '@/features/shortcuts/drag/types';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createFolder = (id: string, title: string, children: Shortcut[] = []): Shortcut => ({
  id,
  title,
  url: '',
  icon: '',
  kind: 'folder',
  children,
});

const createItems = (shortcuts: Shortcut[]): RootShortcutDragItem[] =>
  shortcuts.map((shortcut, shortcutIndex) => ({
    sortId: shortcut.id,
    shortcut,
    shortcutIndex,
  }));

const inflateRect = (rect: DragRect, amount: number): DragRect => ({
  left: rect.left - amount,
  top: rect.top - amount,
  right: rect.right + amount,
  bottom: rect.bottom + amount,
  width: rect.width + amount * 2,
  height: rect.height + amount * 2,
});

const baseRect = {
  width: 100,
  height: 100,
  top: 100,
  left: 200,
  right: 300,
  bottom: 200,
};

describe('resolveRootDropIntent', () => {
  it('returns merge intent when a link is dropped on another link center', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ]);

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 250, y: 150 },
      overRect: baseRect,
      items,
    })).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('returns move-into-folder intent when a link is dropped on a folder center', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createFolder('folder-1', 'Folder'),
    ]);

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'folder-1',
      pointer: { x: 250, y: 150 },
      overRect: baseRect,
      items,
    })).toEqual({
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'a',
      targetFolderId: 'folder-1',
    });
  });

  it('returns reorder intent when the pointer lands on the leading edge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);

    expect(resolveRootDropIntent({
      activeSortId: 'c',
      overSortId: 'b',
      pointer: { x: 210, y: 120 },
      overRect: baseRect,
      items,
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('returns reorder intent when the pointer lands on the trailing edge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 290, y: 180 },
      overRect: baseRect,
      items,
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    });
  });

  it('treats an edge-biased drop as reorder instead of merge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 281, y: 150 },
      overRect: baseRect,
      items,
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    });
  });

  it('uses the compact preview rect for center merge detection', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ]);
    const compactCardRect = {
      ...baseRect,
      height: 124,
      bottom: 224,
    };
    const compactPreviewRect = {
      ...baseRect,
      height: 100,
      bottom: 200,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 250, y: 132 },
      overRect: compactCardRect,
      overCenterRect: compactPreviewRect,
      items,
    })).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('widens the center merge zone for compact-sized targets', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ]);
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 200,
      right: 272,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 259, y: 136 },
      overRect: compactPreviewRect,
      overCenterRect: compactPreviewRect,
      items,
    })).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('treats the full compact preview area as a merge hit for small targets', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ]);
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 200,
      right: 272,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 206, y: 136 },
      overRect: inflateRect(compactPreviewRect, 20),
      overCenterRect: compactPreviewRect,
      items,
    })).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('treats the full compact preview area as an enter-folder hit for small folders', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createFolder('folder-1', 'Folder'),
    ]);
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 200,
      right: 272,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'folder-1',
      pointer: { x: 206, y: 136 },
      overRect: inflateRect(compactPreviewRect, 20),
      overCenterRect: compactPreviewRect,
      items,
    })).toEqual({
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'a',
      targetFolderId: 'folder-1',
    });
  });

  it('keeps compact hit slop outside the preview area available for reorder', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 200,
      right: 272,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'c',
      overSortId: 'b',
      pointer: { x: 186, y: 136 },
      overRect: inflateRect(compactPreviewRect, 20),
      overCenterRect: compactPreviewRect,
      items,
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('treats the full target icon area as merge zone when full-center-rect mode is enabled', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ]);
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 200,
      right: 272,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 206, y: 136 },
      overRect: compactPreviewRect,
      overCenterRect: compactPreviewRect,
      items,
      centerHitMode: 'full-center-rect',
    })).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('reorders when the pointer is in the target cell but outside the target icon area', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const compactCellRect = {
      width: 100,
      height: 124,
      top: 100,
      left: 200,
      right: 300,
      bottom: 224,
    };
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 214,
      right: 286,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 294, y: 188 },
      overRect: compactCellRect,
      overCenterRect: compactPreviewRect,
      items,
      centerHitMode: 'full-center-rect',
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    });
  });

  it('can disable center merge intent for yielded targets and keep reorder active', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const compactPreviewRect = {
      width: 72,
      height: 72,
      top: 100,
      left: 214,
      right: 286,
      bottom: 172,
    };

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 250, y: 136 },
      overRect: compactPreviewRect,
      overCenterRect: compactPreviewRect,
      items,
      centerHitMode: 'full-center-rect',
      allowCenterIntent: false,
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    });
  });
});
