import { describe, expect, it } from 'vitest';
import type {
  FolderExtractDragStartPayload,
  FolderShortcutDropIntent,
  RootShortcutDropIntent,
} from '@/features/shortcuts/drag/types';
import { applyFolderExtractDragStart, applyShortcutDropIntent } from '@/features/shortcuts/domain/dropIntents';
import type { Shortcut } from '@/types';

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

describe('applyShortcutDropIntent', () => {
  it('returns a merge request outcome instead of mutating shortcuts for merge intents', () => {
    const shortcuts = [createLink('a', 'Alpha'), createLink('b', 'Beta')];
    const intent: RootShortcutDropIntent = {
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    };

    expect(applyShortcutDropIntent(shortcuts, intent)).toEqual({
      kind: 'request-folder-merge',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('preserves large folder anchor positions during eligible root reorders', () => {
    const shortcuts = [
      createLink('a', 'Alpha'),
      createLargeFolder('folder-large', 'Large', [createLink('nested', 'Nested')]),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];
    const intent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    };

    expect(applyShortcutDropIntent(shortcuts, intent)).toEqual({
      kind: 'update-shortcuts',
      shortcuts: [
        createLink('c', 'Gamma'),
        createLargeFolder('folder-large', 'Large', [createLink('nested', 'Nested')]),
        createLink('a', 'Alpha'),
        createLink('b', 'Beta'),
      ],
    });
  });

  it('moves a root shortcut into an existing folder', () => {
    const shortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-1', 'Folder', [createLink('nested', 'Nested')]),
      createLink('b', 'Beta'),
    ];
    const intent: RootShortcutDropIntent = {
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'b',
      targetFolderId: 'folder-1',
    };

    expect(applyShortcutDropIntent(shortcuts, intent)).toEqual({
      kind: 'update-shortcuts',
      shortcuts: [
        createLink('a', 'Alpha'),
        createFolder('folder-1', 'Folder', [
          createLink('nested', 'Nested'),
          createLink('b', 'Beta'),
        ]),
      ],
    });
  });
  it('reorders shortcuts within a folder', () => {
    const shortcuts = [
      createFolder('folder-1', 'Folder', [
        createLink('a', 'Alpha'),
        createLink('b', 'Beta'),
        createLink('c', 'Gamma'),
      ]),
    ];
    const intent: FolderShortcutDropIntent = {
      type: 'reorder-folder-shortcuts',
      folderId: 'folder-1',
      shortcutId: 'c',
      targetIndex: 0,
      edge: 'before',
    };

    expect(applyShortcutDropIntent(shortcuts, intent)).toEqual({
      kind: 'update-shortcuts',
      shortcuts: [
        createFolder('folder-1', 'Folder', [
          createLink('c', 'Gamma'),
          createLink('a', 'Alpha'),
          createLink('b', 'Beta'),
        ]),
      ],
    });
  });

  it('extracts a shortcut from a folder back to the root after its source folder', () => {
    const shortcuts = [
      createLink('root-a', 'Root A'),
      createFolder('folder-1', 'Folder', [
        createLink('nested-a', 'Nested A'),
        createLink('nested-b', 'Nested B'),
      ]),
      createLink('root-b', 'Root B'),
    ];
    const intent: FolderShortcutDropIntent = {
      type: 'extract-folder-shortcut',
      folderId: 'folder-1',
      shortcutId: 'nested-b',
    };

    expect(applyShortcutDropIntent(shortcuts, intent)).toEqual({
      kind: 'update-shortcuts',
      shortcuts: [
        createLink('root-a', 'Root A'),
        createLink('nested-a', 'Nested A'),
        createLink('nested-b', 'Nested B'),
        createLink('root-b', 'Root B'),
      ],
    });
  });

  it('rejects nested folder trees so the open-source boundary stays two-level', () => {
    const shortcuts = [
      createFolder('folder-1', 'Folder', [
        createFolder('folder-2', 'Nested Folder', [createLink('a', 'Alpha')]),
      ]),
      createLink('b', 'Beta'),
    ];
    const intent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'b',
      overShortcutId: 'folder-1',
      targetIndex: 0,
      edge: 'before',
    };

    expect(applyShortcutDropIntent(shortcuts, intent)).toEqual({
      kind: 'unsupported-tree',
      maxSupportedFolderDepth: 1,
    });
  });
});

describe('applyFolderExtractDragStart', () => {
  it('returns a shared root-drag handoff outcome for folder extraction', () => {
    const shortcuts = [
      createLink('root-a', 'Root A'),
      createFolder('folder-1', 'Folder', [
        createLink('nested-a', 'Nested A'),
        createLink('nested-b', 'Nested B'),
      ]),
    ];
    const payload: FolderExtractDragStartPayload = {
      folderId: 'folder-1',
      shortcutId: 'nested-b',
      pointerId: 7,
      pointerType: 'mouse',
      pointer: { x: 320, y: 240 },
      anchor: { xRatio: 0.5, yRatio: 0.25 },
    };

    expect(applyFolderExtractDragStart(shortcuts, payload)).toEqual({
      kind: 'start-root-drag-session',
      shortcuts: [
        createLink('root-a', 'Root A'),
        createLink('nested-a', 'Nested A'),
        createLink('nested-b', 'Nested B'),
      ],
      closeFolderId: 'folder-1',
      session: {
        shortcutId: 'nested-b',
        pointerId: 7,
        pointerType: 'mouse',
        pointer: { x: 320, y: 240 },
        anchor: { xRatio: 0.5, yRatio: 0.25 },
      },
    });
  });
});
