import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import { buildLeaftabRootSurfaceInstanceKey } from './leaftabGridEngineHostAdapter';

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
