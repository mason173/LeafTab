import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import { resolveRootDropIntent } from '@/features/shortcuts/drag/resolveRootDropIntent';
import type { RootShortcutDragItem } from '@/features/shortcuts/drag/types';

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

  it('treats a near-center drop as reorder instead of merge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);

    expect(resolveRootDropIntent({
      activeSortId: 'a',
      overSortId: 'b',
      pointer: { x: 264, y: 150 },
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
});
