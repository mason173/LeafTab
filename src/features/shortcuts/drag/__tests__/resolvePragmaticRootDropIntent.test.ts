import { describe, expect, it } from 'vitest';
import { buildRootPragmaticDragData, buildRootPragmaticDropData } from '@/features/shortcuts/drag/pragmaticData';
import { resolvePragmaticRootDropIntent } from '@/features/shortcuts/drag/resolvePragmaticRootDropIntent';

describe('resolvePragmaticRootDropIntent', () => {
  it('returns reorder intent for a root item target', () => {
    expect(resolvePragmaticRootDropIntent({
      sourceData: buildRootPragmaticDragData({
        type: 'root-shortcut',
        sortId: 'a',
        shortcutId: 'a',
        shortcutIndex: 0,
        shortcutKind: 'link',
      }),
      dropTargets: [{
        data: buildRootPragmaticDropData({
          type: 'root-item',
          sortId: 'c',
          shortcutId: 'c',
          shortcutIndex: 2,
          shortcutKind: 'link',
          edge: 'before',
        }),
      }],
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('returns merge intent for a center drop onto another link', () => {
    expect(resolvePragmaticRootDropIntent({
      sourceData: buildRootPragmaticDragData({
        type: 'root-shortcut',
        sortId: 'a',
        shortcutId: 'a',
        shortcutIndex: 0,
        shortcutKind: 'link',
      }),
      dropTargets: [{
        data: buildRootPragmaticDropData({
          type: 'root-item',
          sortId: 'b',
          shortcutId: 'b',
          shortcutIndex: 1,
          shortcutKind: 'link',
          edge: 'center',
        }),
      }],
    })).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('returns move-into-folder intent for a center drop onto a folder', () => {
    expect(resolvePragmaticRootDropIntent({
      sourceData: buildRootPragmaticDragData({
        type: 'root-shortcut',
        sortId: 'a',
        shortcutId: 'a',
        shortcutIndex: 0,
        shortcutKind: 'link',
      }),
      dropTargets: [{
        data: buildRootPragmaticDropData({
          type: 'root-item',
          sortId: 'folder-1',
          shortcutId: 'folder-1',
          shortcutIndex: 1,
          shortcutKind: 'folder',
          edge: 'center',
        }),
      }],
    })).toEqual({
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'a',
      targetFolderId: 'folder-1',
    });
  });

  it('skips self and noop targets before resolving a later valid target', () => {
    expect(resolvePragmaticRootDropIntent({
      sourceData: buildRootPragmaticDragData({
        type: 'root-shortcut',
        sortId: 'a',
        shortcutId: 'a',
        shortcutIndex: 0,
        shortcutKind: 'link',
      }),
      dropTargets: [
        {
          data: buildRootPragmaticDropData({
            type: 'root-item',
            sortId: 'a',
            shortcutId: 'a',
            shortcutIndex: 0,
            shortcutKind: 'link',
            edge: 'after',
          }),
        },
        {
          data: buildRootPragmaticDropData({
            type: 'root-item',
            sortId: 'b',
            shortcutId: 'b',
            shortcutIndex: 1,
            shortcutKind: 'link',
            edge: 'after',
          }),
        },
      ],
    })).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    });
  });
});
