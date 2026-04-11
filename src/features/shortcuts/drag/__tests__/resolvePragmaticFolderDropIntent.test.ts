import { describe, expect, it } from 'vitest';
import { buildFolderPragmaticDragData, buildFolderPragmaticDropData } from '@/features/shortcuts/drag/pragmaticData';
import { resolvePragmaticFolderDropIntent } from '@/features/shortcuts/drag/resolvePragmaticFolderDropIntent';

describe('resolvePragmaticFolderDropIntent', () => {
  it('returns reorder intent for a folder item target', () => {
    expect(resolvePragmaticFolderDropIntent({
      folderId: 'folder-1',
      sourceData: buildFolderPragmaticDragData({
        type: 'folder-shortcut',
        folderId: 'folder-1',
        shortcutId: 'a',
        shortcutIndex: 0,
      }),
      dropTargets: [{
        data: buildFolderPragmaticDropData({
          type: 'folder-item',
          folderId: 'folder-1',
          shortcutId: 'c',
          shortcutIndex: 2,
          edge: 'before',
        }),
      }],
    })).toEqual({
      type: 'reorder-folder-shortcuts',
      folderId: 'folder-1',
      shortcutId: 'a',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('returns extract intent for a folder mask target', () => {
    expect(resolvePragmaticFolderDropIntent({
      folderId: 'folder-1',
      sourceData: buildFolderPragmaticDragData({
        type: 'folder-shortcut',
        folderId: 'folder-1',
        shortcutId: 'a',
        shortcutIndex: 0,
      }),
      dropTargets: [{
        data: buildFolderPragmaticDropData({
          type: 'folder-mask',
          folderId: 'folder-1',
          zone: 'left',
        }),
      }],
    })).toEqual({
      type: 'extract-folder-shortcut',
      folderId: 'folder-1',
      shortcutId: 'a',
    });
  });

  it('skips self targets before resolving a later valid folder target', () => {
    expect(resolvePragmaticFolderDropIntent({
      folderId: 'folder-1',
      sourceData: buildFolderPragmaticDragData({
        type: 'folder-shortcut',
        folderId: 'folder-1',
        shortcutId: 'a',
        shortcutIndex: 0,
      }),
      dropTargets: [
        {
          data: buildFolderPragmaticDropData({
            type: 'folder-item',
            folderId: 'folder-1',
            shortcutId: 'a',
            shortcutIndex: 0,
            edge: 'after',
          }),
        },
        {
          data: buildFolderPragmaticDropData({
            type: 'folder-item',
            folderId: 'folder-1',
            shortcutId: 'b',
            shortcutIndex: 1,
            edge: 'after',
          }),
        },
      ],
    })).toEqual({
      type: 'reorder-folder-shortcuts',
      folderId: 'folder-1',
      shortcutId: 'a',
      targetIndex: 1,
      edge: 'after',
    });
  });
});
