import { describe, expect, it } from 'vitest';
import {
  buildSearchMatchCandidates,
  compactSearchQuery,
  getSearchMatchPriority,
  parseSearchEnginePrefix,
} from '@/utils/searchHelpers';

describe('searchHelpers pinyin candidates', () => {
  it('builds latin and url-oriented fallback candidates', () => {
    const candidates = buildSearchMatchCandidates('GitHub Docs');

    expect(candidates).toContain('github docs');
    expect(candidates).toContain('githubdocs');
    expect(candidates).toContain('gd');
    expect(getSearchMatchPriority('GitHub Docs', 'git')).toBeGreaterThan(0);
    expect(getSearchMatchPriority('https://www.openai.com/docs', 'openaidocs')).toBeGreaterThan(0);
  });

  it('treats whitespace as a weak signal for matching', () => {
    expect(compactSearchQuery(' 图标   圆角 ')).toBe('图标圆角');
    expect(getSearchMatchPriority('图标圆角', '图标 圆角')).toBeGreaterThan(0);
    expect(getSearchMatchPriority('Theme Mode', 'thememode')).toBeGreaterThan(0);
  });

  it('parses engine overrides only from explicit bang prefixes', () => {
    expect(parseSearchEnginePrefix('!g AI')).toEqual({
      query: 'AI',
      overrideEngine: 'google',
    });

    expect(parseSearchEnginePrefix('！g AI')).toEqual({
      query: 'AI',
      overrideEngine: 'google',
    });

    expect(parseSearchEnginePrefix('！ｂｄ　天气')).toEqual({
      query: '天气',
      overrideEngine: 'baidu',
    });

    expect(parseSearchEnginePrefix('!b ')).toEqual({
      query: '',
      overrideEngine: 'bing',
    });

    expect(parseSearchEnginePrefix('！g　')).toEqual({
      query: '',
      overrideEngine: 'google',
    });

    expect(parseSearchEnginePrefix('!b test')).toEqual({
      query: 'test',
      overrideEngine: 'bing',
    });

    expect(parseSearchEnginePrefix('B 站')).toEqual({
      query: 'B 站',
      overrideEngine: null,
    });

    expect(parseSearchEnginePrefix('b test')).toEqual({
      query: 'b test',
      overrideEngine: null,
    });
  });
});
