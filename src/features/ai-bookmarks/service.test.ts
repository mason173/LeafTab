import { describe, expect, it } from 'vitest';
import { __testing__ } from '@/features/ai-bookmarks/service';
import type { SearchSuggestionItem } from '@/types';

describe('ai bookmark search mergeSuggestions', () => {
  it('keeps semantic results focused and only adds a small number of strong fallback matches', () => {
    const fallbackItems: SearchSuggestionItem[] = Array.from({ length: 8 }, (_, index) => ({
      type: 'bookmark',
      label: index < 4 ? `Leaf search docs ${index}` : `Misc unrelated ${index}`,
      value: index < 4
        ? `https://leaf.example/docs/${index}`
        : `https://misc.example/${index}`,
      icon: '',
    }));

    const merged = __testing__.mergeSuggestions({
      query: 'leaf search',
      limit: 12,
      semanticResults: [
        {
          bookmarkId: 'semantic-1',
          url: 'https://leaf.example/semantic',
          label: 'Leaf semantic result',
          score: 0.48,
        },
      ],
      fallbackItems,
    });

    expect(merged).toHaveLength(5);
    expect(merged.map((item) => item.value)).toContain('https://leaf.example/semantic');
    expect(merged.every((item) => item.value.startsWith('https://leaf.example/'))).toBe(true);
  });

  it('falls back to keyword ordering when semantic search has no confident hits', () => {
    const fallbackItems: SearchSuggestionItem[] = [
      {
        type: 'bookmark',
        label: 'LeafTab Docs',
        value: 'https://leaf.example/docs',
        icon: '',
      },
      {
        type: 'bookmark',
        label: 'LeafTab Blog',
        value: 'https://leaf.example/blog',
        icon: '',
      },
    ];

    const merged = __testing__.mergeSuggestions({
      query: 'leaftab',
      limit: 12,
      semanticResults: [],
      fallbackItems,
    });

    expect(merged.map((item) => item.value)).toEqual([
      'https://leaf.example/docs',
      'https://leaf.example/blog',
    ]);
  });
});
