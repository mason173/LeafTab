import { describe, expect, it } from 'vitest';
import { buildFaviconCandidates, getRemoteFaviconOverride } from '@/utils';

describe('buildFaviconCandidates', () => {
  it('normalizes www subdomains when resolving favicon overrides', () => {
    expect(getRemoteFaviconOverride('www.doubao.com')).toBe(
      'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/favicon/64x64.png',
    );
  });

  it('prefers the doubao override before generic favicon paths', () => {
    expect(buildFaviconCandidates('www.doubao.com')).toEqual([
      'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/favicon/64x64.png',
      'https://www.doubao.com/favicon.ico',
      'https://www.doubao.com/favicon.png',
      'https://www.doubao.com/apple-touch-icon.png',
      'https://www.doubao.com/apple-touch-icon-precomposed.png',
    ]);
  });
});
