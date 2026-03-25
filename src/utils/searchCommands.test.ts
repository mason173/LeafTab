import { describe, expect, it } from 'vitest';
import {
  parseSearchCommand,
  resolveSearchCommandAutocomplete,
} from '@/utils/searchCommands';
import { createSearchSessionModel } from '@/utils/searchSessionModel';

describe('searchCommands', () => {
  it('parses /b and /bookmarks as bookmarks mode', () => {
    expect(parseSearchCommand('/b')).toMatchObject({
      active: true,
      id: 'bookmarks',
      token: '/bookmarks',
      query: '',
    });
    expect(parseSearchCommand('/bookmarks openai')).toMatchObject({
      active: true,
      id: 'bookmarks',
      token: '/bookmarks',
      query: 'openai',
    });
  });

  it('parses /t and /tabs as tabs mode', () => {
    expect(parseSearchCommand('/t')).toMatchObject({
      active: true,
      id: 'tabs',
      token: '/tabs',
      query: '',
    });
    expect(parseSearchCommand('/tabs chatgpt')).toMatchObject({
      active: true,
      id: 'tabs',
      token: '/tabs',
      query: 'chatgpt',
    });
  });

  it('autocompletes aliases to full command tokens', () => {
    expect(resolveSearchCommandAutocomplete('/b')).toBe('/bookmarks ');
    expect(resolveSearchCommandAutocomplete('/t')).toBe('/tabs ');
  });

  it('builds the correct session mode for /b and /t', () => {
    expect(createSearchSessionModel('/b').mode).toBe('bookmarks');
    expect(createSearchSessionModel('/t').mode).toBe('tabs');
  });
});
