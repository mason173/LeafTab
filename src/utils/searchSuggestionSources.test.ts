import { describe, expect, it } from 'vitest';
import { buildShortcutSearchIndex } from '@/utils/searchSuggestionSources';

describe('buildShortcutSearchIndex', () => {
  it('indexes link shortcuts nested inside folders', () => {
    const shortcuts = [
      {
        id: 'folder-1',
        kind: 'folder' as const,
        title: 'Work',
        url: '',
        icon: '',
        children: [
          {
            id: 'link-1',
            kind: 'link' as const,
            title: 'Docs',
            url: 'https://docs.example',
            icon: '',
          },
        ],
      },
    ];

    const index = buildShortcutSearchIndex(shortcuts);

    expect(index).toEqual([
      expect.objectContaining({
        id: 'link-1',
        label: 'Docs',
        url: 'https://docs.example',
      }),
    ]);
  });
});
