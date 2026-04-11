import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import { ROOT_SHORTCUTS_PATH } from '@/features/shortcuts/model/paths';
import {
  dissolveFolder,
  extractShortcutFromFolder,
  mergeShortcutsIntoNewFolder,
  moveShortcutsIntoFolder,
  reorderRootShortcutPreservingLargeFolderPositions,
  reorderShortcutWithinContainer,
} from '@/features/shortcuts/model/operations';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createFolder = (id: string, title: string, children: Shortcut[]): Shortcut => ({
  id,
  title,
  url: '',
  icon: '',
  kind: 'folder',
  children,
});

const createLargeFolder = (id: string, title: string, children: Shortcut[]): Shortcut => ({
  ...createFolder(id, title, children),
  folderDisplayMode: 'large',
});

describe('shortcut model operations', () => {
  it('merges shortcuts into a new folder at the earliest selected position', () => {
    const shortcuts: Shortcut[] = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const result = mergeShortcutsIntoNewFolder(shortcuts, ROOT_SHORTCUTS_PATH, ['c', 'a'], (children) =>
      createFolder('folder-1', 'Folder', children),
    );

    expect(result).not.toBeNull();
    expect(result?.nextShortcuts).toEqual([
      createFolder('folder-1', 'Folder', [createLink('a', 'Alpha'), createLink('c', 'Gamma')]),
      createLink('b', 'Beta'),
    ]);
  });

  it('moves multiple shortcuts into an existing folder', () => {
    const shortcuts: Shortcut[] = [
      createLink('a', 'Alpha'),
      createFolder('folder-1', 'Folder', [createLink('nested', 'Nested')]),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    expect(moveShortcutsIntoFolder(shortcuts, ROOT_SHORTCUTS_PATH, ['b', 'c'], 'folder-1')).toEqual([
      createLink('a', 'Alpha'),
      createFolder('folder-1', 'Folder', [
        createLink('nested', 'Nested'),
        createLink('b', 'Beta'),
        createLink('c', 'Gamma'),
      ]),
    ]);
  });

  it('reorders shortcuts within a folder container', () => {
    const shortcuts: Shortcut[] = [
      createFolder('folder-1', 'Folder', [
        createLink('a', 'Alpha'),
        createLink('b', 'Beta'),
        createLink('c', 'Gamma'),
      ]),
    ];

    expect(reorderShortcutWithinContainer(shortcuts, { type: 'folder', folderId: 'folder-1' }, 'c', 0)).toEqual([
      createFolder('folder-1', 'Folder', [
        createLink('c', 'Gamma'),
        createLink('a', 'Alpha'),
        createLink('b', 'Beta'),
      ]),
    ]);
  });

  it('extracts a shortcut from a folder back to root at a requested index', () => {
    const shortcuts: Shortcut[] = [
      createLink('root-a', 'Root A'),
      createFolder('folder-1', 'Folder', [
        createLink('nested-a', 'Nested A'),
        createLink('nested-b', 'Nested B'),
      ]),
      createLink('root-b', 'Root B'),
    ];

    expect(extractShortcutFromFolder(shortcuts, 'folder-1', 'nested-b', ROOT_SHORTCUTS_PATH, 1)).toEqual([
      createLink('root-a', 'Root A'),
      createLink('nested-b', 'Nested B'),
      createLink('nested-a', 'Nested A'),
      createLink('root-b', 'Root B'),
    ]);
  });

  it('dissolves a folder in place and preserves child order', () => {
    const shortcuts: Shortcut[] = [
      createLink('root-a', 'Root A'),
      createFolder('folder-1', 'Folder', [
        createLink('nested-a', 'Nested A'),
        createLink('nested-b', 'Nested B'),
      ]),
      createLink('root-b', 'Root B'),
    ];

    expect(dissolveFolder(shortcuts, 'folder-1')).toEqual([
      createLink('root-a', 'Root A'),
      createLink('nested-a', 'Nested A'),
      createLink('nested-b', 'Nested B'),
      createLink('root-b', 'Root B'),
    ]);
  });

  it('reorders a small root shortcut without changing large folder anchor positions', () => {
    const shortcuts: Shortcut[] = [
      createLink('a', 'Alpha'),
      createLargeFolder('folder-large', 'Large', [createLink('nested', 'Nested')]),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
    ];

    expect(reorderRootShortcutPreservingLargeFolderPositions(shortcuts, 'd', 0)).toEqual([
      createLink('d', 'Delta'),
      createLargeFolder('folder-large', 'Large', [createLink('nested', 'Nested')]),
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
  });
});
