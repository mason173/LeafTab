import { describe, expect, it } from 'vitest';
import {
  collectAvailableShortcutIndexLetters,
  filterShortcutsByIndexLetter,
  resolveShortcutIndexLetter,
} from '@/components/home/drawerShortcutAlphabetIndex';
import type { Shortcut } from '@/types';

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

describe('drawerShortcutAlphabetIndex', () => {
  it('uses the first meaningful character from the shortcut title', () => {
    expect(resolveShortcutIndexLetter(createShortcut({ title: 'GitHub', url: 'https://github.com' }))).toBe('G');
    expect(resolveShortcutIndexLetter(createShortcut({ title: ' (Docs)', url: 'https://docs.example.com' }))).toBe('D');
  });

  it('falls back to the hostname when the title is empty', () => {
    expect(resolveShortcutIndexLetter(createShortcut({ url: 'https://www.baidu.com' }))).toBe('B');
  });

  it('groups numbers and non-latin leading characters under #', () => {
    expect(resolveShortcutIndexLetter(createShortcut({ title: '123 Password' }))).toBe('#');
    expect(resolveShortcutIndexLetter(createShortcut({ title: '中文文档' }))).toBe('Z');
  });

  it('uses pinyin initials for leading chinese characters', () => {
    expect(resolveShortcutIndexLetter(createShortcut({ title: '搜狗' }))).toBe('S');
    expect(resolveShortcutIndexLetter(createShortcut({ title: '豆瓣' }))).toBe('D');
    expect(resolveShortcutIndexLetter(createShortcut({ title: '微信' }))).toBe('W');
  });

  it('only exposes groups that actually exist in the current shortcut list', () => {
    const shortcuts = [
      createShortcut({ id: 'a', title: 'Apple' }),
      createShortcut({ id: 'b', title: 'Bing' }),
      createShortcut({ id: 'c', title: '123 Password' }),
      createShortcut({ id: 'd', title: '微信' }),
    ];

    expect(collectAvailableShortcutIndexLetters(shortcuts)).toEqual(['#', 'A', 'B', 'W']);
  });

  it('filters by the selected letter and leaves the list untouched when no filter is active', () => {
    const shortcuts = [
      createShortcut({ id: 'a', title: 'Apple' }),
      createShortcut({ id: 'b', title: 'Bing' }),
      createShortcut({ id: 'c', title: '123 Password' }),
    ];

    expect(filterShortcutsByIndexLetter(shortcuts, null)).toEqual(shortcuts);
    expect(filterShortcutsByIndexLetter(shortcuts, 'A').map((shortcut) => shortcut.id)).toEqual(['a']);
    expect(filterShortcutsByIndexLetter(shortcuts, '#').map((shortcut) => shortcut.id)).toEqual(['c']);
  });
});
