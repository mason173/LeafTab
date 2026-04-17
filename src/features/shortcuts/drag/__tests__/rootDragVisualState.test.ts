import { describe, expect, it } from 'vitest';
import {
  resolveRootDragItemVisualState,
  resolveRootDragVisualState,
} from '@/features/shortcuts/drag/rootDragVisualState';
import type { Shortcut } from '@/types';

const createLink = (id: string): Shortcut => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createFolder = (id: string, folderDisplayMode: 'small' | 'large' = 'small'): Shortcut => ({
  id,
  title: id,
  url: '',
  icon: '',
  kind: 'folder',
  folderDisplayMode,
  children: [createLink(`${id}-child`)],
});

describe('rootDragVisualState', () => {
  it('suppresses the drop preview and activates folder highlighting for move-into-folder intents', () => {
    const visualState = resolveRootDragVisualState({
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'a',
      targetFolderId: 'folder-small',
    }, 1);

    expect(visualState).toEqual({
      folderDropTargetId: 'folder-small',
      mergeTargetId: null,
      dropPreviewOpacity: 0.01,
    });

    expect(resolveRootDragItemVisualState({
      shortcut: createFolder('folder-small'),
      shortcutId: 'folder-small',
      visualState,
    })).toEqual({
      folderDropTargetActive: true,
      centerPreviewActive: false,
      folderCenterPreviewActive: true,
      emphasized: true,
    });

    expect(resolveRootDragItemVisualState({
      shortcut: createFolder('folder-large', 'large'),
      shortcutId: 'folder-small',
      visualState,
    })).toEqual({
      folderDropTargetActive: true,
      centerPreviewActive: false,
      folderCenterPreviewActive: false,
      emphasized: false,
    });
  });

  it('activates center preview only for merge targets that are plain icons', () => {
    const visualState = resolveRootDragVisualState({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    }, 1);

    expect(resolveRootDragItemVisualState({
      shortcut: createLink('b'),
      shortcutId: 'b',
      visualState,
    })).toEqual({
      folderDropTargetActive: false,
      centerPreviewActive: true,
      folderCenterPreviewActive: false,
      emphasized: true,
    });

    expect(resolveRootDragItemVisualState({
      shortcut: createFolder('b'),
      shortcutId: 'b',
      visualState,
    })).toEqual({
      folderDropTargetActive: false,
      centerPreviewActive: false,
      folderCenterPreviewActive: false,
      emphasized: false,
    });
  });
});
