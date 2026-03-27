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
});
