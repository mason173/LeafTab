import { describe, expect, it } from 'vitest';
import {
  applyFolderExtractDragStart,
  applyShortcutDropIntent,
  mergeShortcutsIntoNewFolder,
  ROOT_SHORTCUTS_PATH,
  type Shortcut,
} from '@leaftab/workspace-core';

function createLink(id: string, title?: string): Shortcut {
  return {
    id,
    title: title || id,
    url: `https://${id}.example`,
    icon: '',
  };
}

describe('shortcut workspace regression flows', () => {
  it('reorders root shortcuts', () => {
    const shortcuts = [
      createLink('a'),
      createLink('b'),
      createLink('c'),
    ];

    const outcome = applyShortcutDropIntent(shortcuts, {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
      placement: { kind: 'stable-insert' },
    });

    expect(outcome.kind).toBe('update-shortcuts');
    if (outcome.kind !== 'update-shortcuts') return;
    expect(outcome.shortcuts.map((shortcut) => shortcut.id)).toEqual(['b', 'c', 'a']);
  });

  it('reorders folder-internal shortcuts', () => {
    const shortcuts: Shortcut[] = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        children: [
          createLink('a'),
          createLink('b'),
          createLink('c'),
        ],
      },
    ];

    const outcome = applyShortcutDropIntent(shortcuts, {
      type: 'reorder-folder-shortcuts',
      folderId: 'folder-1',
      shortcutId: 'a',
      targetIndex: 2,
      edge: 'after',
    });

    expect(outcome.kind).toBe('update-shortcuts');
    if (outcome.kind !== 'update-shortcuts') return;
    expect(outcome.shortcuts[0]?.children?.map((shortcut) => shortcut.id)).toEqual(['b', 'c', 'a']);
  });

  it('extracts a folder shortcut into the root grid preview', () => {
    const shortcuts: Shortcut[] = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        children: [
          createLink('a'),
          createLink('b'),
        ],
      },
      createLink('c'),
    ];

    const outcome = applyFolderExtractDragStart(shortcuts, {
      folderId: 'folder-1',
      shortcutId: 'b',
      pointerId: 1,
      pointerType: 'mouse',
      pointer: { x: 100, y: 100 },
      anchor: { xRatio: 0.5, yRatio: 0.5 },
    });

    expect(outcome.kind).toBe('start-root-drag-session');
    if (outcome.kind !== 'start-root-drag-session') return;

    expect(outcome.shortcuts.map((shortcut) => shortcut.id)).toEqual(['a', 'b', 'c']);
    expect(outcome.shortcuts.some((shortcut) => shortcut.id === 'folder-1')).toBe(false);
    expect(outcome.session.sourceRootShortcutId).toBe('folder-1');
    expect(outcome.closeFolderId).toBe('folder-1');
  });

  it('requests a merge for two root shortcuts and names the new folder on commit', () => {
    const shortcuts = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const mergeRequest = applyShortcutDropIntent(shortcuts, {
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });

    expect(mergeRequest.kind).toBe('request-folder-merge');
    if (mergeRequest.kind !== 'request-folder-merge') return;

    const result = mergeShortcutsIntoNewFolder(
      shortcuts,
      ROOT_SHORTCUTS_PATH,
      [mergeRequest.activeShortcutId, mergeRequest.targetShortcutId],
      (children) => ({
        id: 'folder-new',
        title: 'My Folder',
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: 'small',
        children,
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.folder.title).toBe('My Folder');
    expect(result?.folder.children?.map((shortcut) => shortcut.id)).toEqual(['a', 'b']);
    expect(result?.nextShortcuts.map((shortcut) => shortcut.id)).toEqual(['folder-new', 'c']);
  });
});
