import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import {
  buildDrawerShortcutEntries,
  collectDrawerShortcutIndexTargets,
  filterDrawerShortcutEntriesByIndexLetter,
} from '@/components/home/drawerShortcutFiltering';

function createShortcut(overrides: Partial<Shortcut> = {}): Shortcut {
  return {
    id: overrides.id || 'shortcut-1',
    title: overrides.title || '',
    url: overrides.url || '',
    icon: overrides.icon || '',
    kind: overrides.kind,
    children: overrides.children,
    folderDisplayMode: overrides.folderDisplayMode,
    useOfficialIcon: overrides.useOfficialIcon,
    autoUseOfficialIcon: overrides.autoUseOfficialIcon,
    officialIconAvailableAtSave: overrides.officialIconAvailableAtSave,
    officialIconColorOverride: overrides.officialIconColorOverride,
    iconRendering: overrides.iconRendering,
    iconColor: overrides.iconColor,
  };
}

describe('drawerShortcutFiltering', () => {
  it('keeps top-level shortcuts searchable by original root index', () => {
    const shortcuts = [
      createShortcut({ id: 'root-a', title: 'Apple' }),
      createShortcut({ id: 'root-b', title: 'Banana' }),
    ];

    expect(buildDrawerShortcutEntries(shortcuts)).toEqual([
      { shortcut: shortcuts[0], rootIndex: 0, parentFolderId: null },
      { shortcut: shortcuts[1], rootIndex: 1, parentFolderId: null },
    ]);
  });

  it('expands matching folder children instead of returning the folder shell', () => {
    const shortcuts = [
      createShortcut({ id: 'root-a', title: 'Apple' }),
      createShortcut({
        id: 'folder-1',
        title: '常用合集',
        kind: 'folder',
        children: [
          createShortcut({ id: 'child-1', title: '微信' }),
          createShortcut({ id: 'child-2', title: '微博' }),
          createShortcut({ id: 'child-3', title: 'QQ邮箱' }),
        ],
      }),
    ];

    const entries = filterDrawerShortcutEntriesByIndexLetter(
      buildDrawerShortcutEntries(shortcuts),
      'W',
    );

    expect(entries.map((entry) => ({
      id: entry.shortcut.id,
      rootIndex: entry.rootIndex,
      parentFolderId: entry.parentFolderId,
    }))).toEqual([
      { id: 'child-1', rootIndex: 1, parentFolderId: 'folder-1' },
      { id: 'child-2', rootIndex: 1, parentFolderId: 'folder-1' },
    ]);
  });

  it('keeps top-level matches alongside expanded folder children', () => {
    const shortcuts = [
      createShortcut({ id: 'root-w', title: '微信' }),
      createShortcut({
        id: 'folder-1',
        title: '常用合集',
        kind: 'folder',
        children: [
          createShortcut({ id: 'child-1', title: '微博' }),
        ],
      }),
    ];

    const entries = filterDrawerShortcutEntriesByIndexLetter(
      buildDrawerShortcutEntries(shortcuts),
      'W',
    );

    expect(entries.map((entry) => ({
      id: entry.shortcut.id,
      rootIndex: entry.rootIndex,
      parentFolderId: entry.parentFolderId,
    }))).toEqual([
      { id: 'root-w', rootIndex: 0, parentFolderId: null },
      { id: 'child-1', rootIndex: 1, parentFolderId: 'folder-1' },
    ]);
  });

  it('includes folder children when collecting alphabet index targets', () => {
    const shortcuts = [
      createShortcut({ id: 'root-a', title: 'Apple' }),
      createShortcut({
        id: 'folder-1',
        title: '常用合集',
        kind: 'folder',
        children: [
          createShortcut({ id: 'child-w', title: '微信' }),
          createShortcut({ id: 'child-q', title: 'QQ邮箱' }),
        ],
      }),
    ];

    expect(
      collectDrawerShortcutIndexTargets(buildDrawerShortcutEntries(shortcuts))
        .map((shortcut) => shortcut.id),
    ).toEqual(['root-a', 'child-w', 'child-q']);
  });
});
