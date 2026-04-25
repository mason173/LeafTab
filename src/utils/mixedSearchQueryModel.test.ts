import { describe, expect, it } from 'vitest';
import { createMixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';

describe('mixedSearchQueryModel', () => {
  it('treats empty default search as empty intent with recovery sources', () => {
    const model = createMixedSearchQueryModel({
      searchValue: '   ',
      displayMode: 'default',
    });

    expect(model.intent).toBe('empty');
    expect(model.primarySourceId).toBeNull();
    expect(model.rankingQuery).toBe('');
    expect(model.compactQuery).toBe('');
    expect(model.compactRankingQuery).toBe('');
    expect(model.wantsOfficialTarget).toBe(false);
    expect(model.sourcePlan).toEqual(['recently-closed', 'browser-history', 'shortcuts', 'local-history']);
  });

  it('treats scoped tabs mode as primary tabs source', () => {
    const model = createMixedSearchQueryModel({
      searchValue: '/tabs figma',
      displayMode: 'tabs',
    });

    expect(model.intent).toBe('scoped-tabs');
    expect(model.primarySourceId).toBe('tabs');
    expect(model.sourcePlan).toEqual(['tabs']);
  });

  it('classifies compact brand-like queries as navigate intent', () => {
    const model = createMixedSearchQueryModel({
      searchValue: 'github',
      displayMode: 'default',
    });

    expect(model.intent).toBe('navigate');
    expect(model.sourcePlan[0]).toBe('tabs');
  });

  it('strips official-intent keywords for ranking while preserving navigate intent', () => {
    const model = createMixedSearchQueryModel({
      searchValue: 'github 官网',
      displayMode: 'default',
    });

    expect(model.intent).toBe('navigate');
    expect(model.normalizedQuery).toBe('github 官网'.toLowerCase());
    expect(model.compactQuery).toBe('github官网');
    expect(model.rankingQuery).toBe('github');
    expect(model.compactRankingQuery).toBe('github');
    expect(model.wantsOfficialTarget).toBe(true);
  });

  it('treats settings-like queries as command intent', () => {
    const model = createMixedSearchQueryModel({
      searchValue: '主题',
      displayMode: 'default',
    });

    expect(model.intent).toBe('command');
    expect(model.sourcePlan).toEqual(['commands', 'settings', 'shortcuts', 'tabs', 'bookmarks']);
  });

  it('keeps longer multi-word queries in generic search intent', () => {
    const model = createMixedSearchQueryModel({
      searchValue: 'react server components tutorial',
      displayMode: 'default',
    });

    expect(model.intent).toBe('search');
    expect(model.sourcePlan).toEqual([
      'shortcuts',
      'builtin-sites',
      'tabs',
      'bookmarks',
      'settings',
      'local-history',
      'remote',
      'browser-history',
    ]);
  });

  it('keeps compact variants for whitespace-tolerant ranking', () => {
    const model = createMixedSearchQueryModel({
      searchValue: '图标   圆角',
      displayMode: 'default',
    });

    expect(model.normalizedQuery).toBe('图标 圆角');
    expect(model.compactQuery).toBe('图标圆角');
    expect(model.rankingQuery).toBe('图标 圆角');
    expect(model.compactRankingQuery).toBe('图标圆角');
  });
});
