import { describe, expect, it } from 'vitest';
import { buildPinyinSearchTokens } from '@/utils/searchPinyin';

describe('searchPinyin', () => {
  it('builds pinyin initials and full-pinyin tokens on demand', async () => {
    const tokens = await buildPinyinSearchTokens('微信读书');

    expect(tokens).toContain('wxds');
    expect(tokens).toContain('weixindushu');
    expect(tokens).toContain('wei xin du shu');
  });

  it('preserves latin prefixes in mixed chinese text', async () => {
    const tokens = await buildPinyinSearchTokens('QQ邮箱');

    expect(tokens).toContain('qyx');
    expect(tokens).toContain('qqyx');
    expect(tokens).toContain('qqyouxiang');
  });
});
