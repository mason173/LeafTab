import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import {
  buildLeaftabRootSurfaceInstanceKey,
  createLeaftabGridEngineHostAdapter,
} from './leaftabGridEngineHostAdapter';

function createLink(id: string): Shortcut {
  return {
    id,
    title: id,
    url: `https://${id}.example`,
    icon: '',
  };
}

function createFolder(id: string, mode: 'small' | 'large' = 'small'): Shortcut {
  return {
    id,
    title: id,
    url: '',
    icon: '',
    kind: 'folder',
    folderDisplayMode: mode,
    children: [createLink(`${id}-child`)],
  };
}

describe('buildLeaftabRootSurfaceInstanceKey', () => {
  it('stays stable across root reorders', () => {
    const first = buildLeaftabRootSurfaceInstanceKey('scenario-1', [
      createLink('alpha'),
      createFolder('folder-1', 'small'),
      createLink('beta'),
    ]);
    const second = buildLeaftabRootSurfaceInstanceKey('scenario-1', [
      createLink('beta'),
      createLink('alpha'),
      createFolder('folder-1', 'small'),
    ]);

    expect(second).toBe(first);
  });

  it('changes when the root structure changes', () => {
    const base = buildLeaftabRootSurfaceInstanceKey('scenario-1', [
      createLink('alpha'),
      createFolder('folder-1', 'small'),
    ]);
    const withLargeFolder = buildLeaftabRootSurfaceInstanceKey('scenario-1', [
      createLink('alpha'),
      createFolder('folder-1', 'large'),
    ]);
    const withDifferentRootItems = buildLeaftabRootSurfaceInstanceKey('scenario-1', [
      createFolder('folder-merged', 'small'),
    ]);

    expect(withLargeFolder).not.toBe(base);
    expect(withDifferentRootItems).not.toBe(base);
  });
});

describe('createLeaftabGridEngineHostAdapter', () => {
  it('keeps the root surface instance key pinned to the real root structure during folder extract preview', () => {
    const realRootShortcuts = [
      createFolder('folder-1', 'small'),
      createLink('alpha'),
    ];
    const previewShortcuts = [
      createFolder('folder-1', 'small'),
      createLink('child-from-folder'),
      createLink('alpha'),
    ];

    const adapter = createLeaftabGridEngineHostAdapter({
      scenarioId: 'scenario-1',
      shortcuts: previewShortcuts,
      surfaceStructureShortcuts: realRootShortcuts,
      containerHeight: 640,
      gridColumns: 4,
      minRows: 2,
      layoutDensity: 'regular',
      compactIconSize: 72,
      compactTitleFontSize: 12,
      compactShowTitle: true,
      iconCornerRadius: 22,
      iconAppearance: 'colorful',
      disableReorderAnimation: false,
      onRootShortcutOpen: () => {},
      onFolderShortcutOpen: () => {},
      onShortcutContextMenu: () => {},
      onShortcutReorder: () => {},
      onShortcutDropIntent: () => {},
      onGridContextMenu: () => {},
      externalDragSession: null,
      onExternalDragSessionConsumed: () => {},
      openFolderShortcut: null,
      onFolderOpenChange: () => {},
      onRenameFolder: () => {},
      onFolderShortcutContextMenu: () => {},
      onFolderShortcutDropIntent: () => {},
      onFolderChildrenCommit: () => {},
    });

    expect(adapter.rootGridProps.surfaceInstanceKey).toBe(
      buildLeaftabRootSurfaceInstanceKey('scenario-1', realRootShortcuts),
    );
    expect(adapter.rootGridProps.shortcuts).toEqual(previewShortcuts);
  });

  it('passes the highlighted shortcut id through to the root grid props', () => {
    const adapter = createLeaftabGridEngineHostAdapter({
      scenarioId: 'scenario-1',
      shortcuts: [createLink('alpha')],
      containerHeight: 640,
      gridColumns: 4,
      minRows: 2,
      layoutDensity: 'regular',
      compactIconSize: 72,
      compactTitleFontSize: 12,
      compactShowTitle: true,
      highlightedShortcutId: 'alpha',
      iconCornerRadius: 22,
      iconAppearance: 'colorful',
      disableReorderAnimation: false,
      onRootShortcutOpen: () => {},
      onFolderShortcutOpen: () => {},
      onShortcutContextMenu: () => {},
      onShortcutReorder: () => {},
      onShortcutDropIntent: () => {},
      onGridContextMenu: () => {},
      externalDragSession: null,
      onExternalDragSessionConsumed: () => {},
      openFolderShortcut: null,
      onFolderOpenChange: () => {},
      onRenameFolder: () => {},
      onFolderShortcutContextMenu: () => {},
      onFolderShortcutDropIntent: () => {},
      onFolderChildrenCommit: () => {},
    });

    expect(adapter.rootGridProps.highlightedShortcutId).toBe('alpha');
  });
});
