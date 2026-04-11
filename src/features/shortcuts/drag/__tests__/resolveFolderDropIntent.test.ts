import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import {
  FOLDER_EXTRACT_DROP_ZONE_ID,
  FOLDER_MASK_DROP_ZONE_IDS,
  resolveFolderDropIntent,
} from '@/features/shortcuts/drag/resolveFolderDropIntent';
import type { RootShortcutDragItem } from '@/features/shortcuts/drag/types';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
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

describe('resolveFolderDropIntent', () => {
  it('returns extract intent when dropped on the extract zone', () => {
    const items = createItems([createLink('a', 'Alpha')]);

    expect(resolveFolderDropIntent({
      folderId: 'folder-1',
      activeSortId: 'a',
      overId: FOLDER_EXTRACT_DROP_ZONE_ID,
      pointer: { x: 250, y: 150 },
      overRect: null,
      items,
    })).toEqual({
      type: 'extract-folder-shortcut',
      folderId: 'folder-1',
      shortcutId: 'a',
    });
  });

  it('returns extract intent when dropped on the folder mask', () => {
    const items = createItems([createLink('a', 'Alpha')]);

    expect(resolveFolderDropIntent({
      folderId: 'folder-1',
      activeSortId: 'a',
      overId: FOLDER_MASK_DROP_ZONE_IDS[0],
      pointer: { x: 250, y: 150 },
      overRect: null,
      items,
    })).toEqual({
      type: 'extract-folder-shortcut',
      folderId: 'folder-1',
      shortcutId: 'a',
    });
  });

  it('returns reorder intent when dropped near the leading edge of another item', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);

    expect(resolveFolderDropIntent({
      folderId: 'folder-1',
      activeSortId: 'c',
      overId: 'b',
      pointer: { x: 210, y: 120 },
      overRect: baseRect,
      items,
    })).toEqual({
      type: 'reorder-folder-shortcuts',
      folderId: 'folder-1',
      shortcutId: 'c',
      targetIndex: 1,
      edge: 'before',
    });
  });
});
