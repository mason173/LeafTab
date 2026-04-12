import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import { groupTopLevelShortcutsIntoFolder, isShortcutFolder, moveTopLevelShortcutIntoFolder } from '@/utils/shortcutFolders';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

describe('shortcutFolders', () => {
  it('groups top-level links into a folder at the earliest selected position', () => {
    const shortcuts: Shortcut[] = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const result = groupTopLevelShortcutsIntoFolder(shortcuts, ['c', 'a'], (children) => ({
      id: 'folder-1',
      title: 'Folder',
      url: '',
      icon: '',
      kind: 'folder',
      children,
    }));

    expect(result).not.toBeNull();
    expect(result?.nextShortcuts).toEqual([
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        children: [
          createLink('a', 'Alpha'),
          createLink('c', 'Gamma'),
        ],
      },
      createLink('b', 'Beta'),
    ]);
  });

  it('ignores folder ids when grouping and only proceeds with two links', () => {
    const shortcuts: Shortcut[] = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        children: [createLink('nested', 'Nested')],
      },
      createLink('a', 'Alpha'),
    ];

    const result = groupTopLevelShortcutsIntoFolder(shortcuts, ['folder-1', 'a'], (children) => ({
      id: 'folder-2',
      title: 'Folder 2',
      url: '',
      icon: '',
      kind: 'folder',
      children,
    }));

    expect(result).toBeNull();
  });

  it('moves a top-level link into an existing top-level folder', () => {
    const shortcuts: Shortcut[] = [
      createLink('a', 'Alpha'),
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        children: [createLink('nested', 'Nested')],
      },
      createLink('b', 'Beta'),
    ];

    expect(moveTopLevelShortcutIntoFolder(shortcuts, 'b', 'folder-1')).toEqual([
      createLink('a', 'Alpha'),
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        children: [
          createLink('nested', 'Nested'),
          createLink('b', 'Beta'),
        ],
      },
    ]);
  });

  it('does not treat a link with empty children metadata as a folder', () => {
    const shortcut: Shortcut = {
      id: 'link-with-empty-children',
      title: 'Next.js',
      url: 'https://nextjs.org',
      icon: '',
      kind: 'link',
      children: [],
    };

    expect(isShortcutFolder(shortcut)).toBe(false);
  });
});
