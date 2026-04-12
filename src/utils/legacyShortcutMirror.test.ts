import { describe, expect, it } from 'vitest';
import type { ScenarioShortcuts, Shortcut } from '@/types';
import { flattenScenarioShortcutsForLegacyMirror, flattenShortcutsForLegacyMirror } from './legacyShortcutMirror';

const createLink = (id: string, title: string, url = `https://example.com/${id}`): Shortcut => ({
  id,
  title,
  url,
  icon: '',
  kind: 'link',
});

describe('legacyShortcutMirror', () => {
  it('flattens folder shortcuts into plain legacy links', () => {
    const shortcuts: Shortcut[] = [
      {
        id: 'folder-1',
        title: 'Workspace',
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: 'large',
        children: [
          createLink('docs', 'Docs', 'https://docs.example'),
          createLink('repo', 'Repo', 'https://repo.example'),
        ],
      },
      createLink('chat', 'Chat', 'https://chat.example'),
    ];

    expect(flattenShortcutsForLegacyMirror(shortcuts)).toEqual([
      expect.objectContaining({
        id: 'docs',
        kind: 'link',
        url: 'https://docs.example',
      }),
      expect.objectContaining({
        id: 'repo',
        kind: 'link',
        url: 'https://repo.example',
      }),
      expect.objectContaining({
        id: 'chat',
        kind: 'link',
        url: 'https://chat.example',
      }),
    ]);
  });

  it('treats legacy children metadata without kind as a folder when mirroring', () => {
    const scenarioShortcuts: ScenarioShortcuts = {
      work: [
        {
          id: 'legacy-folder',
          title: 'Legacy Folder',
          url: '',
          icon: '',
          children: [
            createLink('alpha', 'Alpha', 'https://alpha.example'),
          ],
        },
      ],
    };

    expect(flattenScenarioShortcutsForLegacyMirror(scenarioShortcuts)).toEqual({
      work: [
        expect.objectContaining({
          id: 'alpha',
          title: 'Alpha',
          kind: 'link',
          url: 'https://alpha.example',
        }),
      ],
    });
  });
});
