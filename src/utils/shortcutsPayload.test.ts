import { describe, expect, it } from 'vitest';
import { normalizeScenarioShortcuts } from '@/utils/shortcutsPayload';

describe('normalizeScenarioShortcuts', () => {
  it('preserves explicit icon colors and keeps missing colors empty', () => {
    const normalized = normalizeScenarioShortcuts({
      work: [
        {
          id: 'a',
          title: 'Alpha',
          url: 'https://alpha.example',
          iconColor: '#12ab90',
        },
        {
          id: 'b',
          title: 'Beta',
          url: 'https://beta.example',
        },
      ],
    });

    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: 'a',
        iconColor: '#12AB90',
      }),
      expect.objectContaining({
        id: 'b',
        iconColor: '',
      }),
    ]);
  });

  it('normalizes folder shortcuts and their child links recursively', () => {
    const normalized = normalizeScenarioShortcuts({
      work: [
        {
          id: 'folder-1',
          kind: 'folder',
          title: 'Workspace',
          children: [
            {
              id: 'link-1',
              title: 'Docs',
              url: 'https://docs.example',
              icon: '',
            },
          ],
        },
      ],
    });

    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: 'folder-1',
        kind: 'folder',
        title: 'Workspace',
        url: '',
        children: [
          expect.objectContaining({
            id: 'link-1',
            kind: 'link',
            title: 'Docs',
            url: 'https://docs.example',
          }),
        ],
      }),
    ]);
  });
});
