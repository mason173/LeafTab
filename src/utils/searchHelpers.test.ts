import { describe, expect, it } from 'vitest';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriority,
} from '@/utils/searchHelpers';

describe('searchHelpers pinyin candidates', () => {
  it('builds latin and url-oriented fallback candidates', () => {
    const candidates = buildSearchMatchCandidates('GitHub Docs');

    expect(candidates).toContain('github docs');
    expect(candidates).toContain('gd');
    expect(getSearchMatchPriority('GitHub Docs', 'git')).toBeGreaterThan(0);
    expect(getSearchMatchPriority('https://www.openai.com/docs', 'openaidocs')).toBeGreaterThan(0);
  });
});
