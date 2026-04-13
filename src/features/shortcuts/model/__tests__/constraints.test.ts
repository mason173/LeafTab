import { describe, expect, it } from 'vitest';
import {
  getMaxShortcutFolderDepth,
  hasNestedShortcutFolders,
  SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  supportsShortcutFolderDepth,
} from '@/features/shortcuts/model/constraints';
import type { Shortcut } from '@/types';

const createLink = (id: string): Shortcut => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createFolder = (id: string, children: Shortcut[]): Shortcut => ({
  id,
  title: id,
  url: '',
  icon: '',
  kind: 'folder',
  children,
});

describe('shortcut folder constraints', () => {
  it('accepts the current two-level shortcut structure', () => {
    const shortcuts = [
      createLink('root-a'),
      createFolder('folder-1', [createLink('nested-a'), createLink('nested-b')]),
    ];

    expect(getMaxShortcutFolderDepth(shortcuts)).toBe(SUPPORTED_SHORTCUT_FOLDER_DEPTH);
    expect(supportsShortcutFolderDepth(shortcuts)).toBe(true);
    expect(hasNestedShortcutFolders(shortcuts)).toBe(false);
  });

  it('flags nested folders as outside the supported open-source shape', () => {
    const shortcuts = [
      createFolder('folder-1', [
        createFolder('folder-2', [createLink('nested-a')]),
      ]),
    ];

    expect(getMaxShortcutFolderDepth(shortcuts)).toBe(2);
    expect(supportsShortcutFolderDepth(shortcuts)).toBe(false);
    expect(hasNestedShortcutFolders(shortcuts)).toBe(true);
  });
});
