import { describe, expect, it } from 'vitest';
import type { SearchSuggestionItem } from '@/types';
import {
  buildSemanticHybridScore,
  mergeSuggestions,
} from '@/features/ai-bookmarks/ranker';

describe('ai bookmark ranker mergeSuggestions', () => {
  it('keeps semantic results focused and only adds a small number of strong fallback matches', () => {
    const fallbackItems: SearchSuggestionItem[] = Array.from({ length: 8 }, (_, index) => ({
      type: 'bookmark',
      label: index < 4 ? `Leaf search docs ${index}` : `Misc unrelated ${index}`,
      value: index < 4
        ? `https://leaf.example/docs/${index}`
        : `https://misc.example/${index}`,
      icon: '',
    }));

    const merged = mergeSuggestions({
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

    const merged = mergeSuggestions({
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

describe('ai bookmark ranker buildSemanticHybridScore', () => {
  it('drops weak semantic matches when there is no lexical evidence', () => {
    expect(buildSemanticHybridScore({
      entry: {
        title: 'Completely unrelated page',
        url: 'https://elsewhere.example/random',
        domain: 'elsewhere.example',
        folderPath: '',
        pageTitle: '',
      },
      normalizedQuery: 'leaftab',
      preferSemantic: false,
      semanticScore: 0.11,
    })).toBe(0);
  });
});
