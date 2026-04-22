import { describe, expect, it } from 'vitest';
import { normalizeScenarioShortcuts } from '@/utils/shortcutsPayload';

describe('normalizeScenarioShortcuts', () => {
  it('drops empty folder shells from synced shortcut payloads', () => {
    const normalized = normalizeScenarioShortcuts({
      default: [
        {
          id: 'folder-empty',
          kind: 'folder',
          title: 'Empty Folder',
          children: [],
        },
        {
          id: 'folder-nested-empty',
          kind: 'folder',
          title: 'Nested Empty Folder',
          children: [
            {
              id: 'folder-child-empty',
              kind: 'folder',
              title: 'Child Empty Folder',
              children: [],
            },
          ],
        },
        {
          id: 'link-1',
          title: 'GitHub',
          url: 'https://github.com',
        },
      ],
    });

    expect(normalized.default).toEqual([
      expect.objectContaining({
        id: 'link-1',
        kind: 'link',
      }),
    ]);
  });
});
