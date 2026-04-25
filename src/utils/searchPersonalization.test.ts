import { describe, expect, it } from 'vitest';
import { createMixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';
import { createSearchAction } from '@/utils/searchActions';
import {
  createEmptySearchPersonalizationProfile,
  recordSearchPersonalizationEvent,
  rerankPersonalizedSearchActions,
} from '@/utils/searchPersonalization';

describe('searchPersonalization', () => {
  it('promotes results the user repeatedly chooses for the same query', () => {
    const queryModel = createMixedSearchQueryModel({
      searchValue: 'github',
      displayMode: 'default',
    });
    const gitlabAction = createSearchAction({
      type: 'bookmark',
      label: 'GitLab',
      value: 'https://gitlab.com/team/project',
      icon: '',
      bookmarkId: 'gitlab',
    }, 0, {
      sourceId: 'bookmarks',
      baseRank: 0,
      reasons: ['base:bookmark-match'],
    });
    const githubAction = createSearchAction({
      type: 'bookmark',
      label: 'GitHub',
      value: 'https://github.com/team/project',
      icon: '',
      bookmarkId: 'github',
    }, 1, {
      sourceId: 'bookmarks',
      baseRank: 1,
      reasons: ['base:bookmark-match'],
    });

    const profile = recordSearchPersonalizationEvent({
      profile: createEmptySearchPersonalizationProfile(),
      queryModel,
      action: githubAction,
      usedAt: 1_710_000_000_000,
    });

    const reranked = rerankPersonalizedSearchActions({
      actions: [gitlabAction, githubAction],
      queryModel,
      profile,
      now: 1_710_000_000_000,
    });

    expect(reranked.map((action) => action.item.label)).toEqual(['GitHub', 'GitLab']);
    expect(reranked[0]?.reasons).toContain('personalization:query-target-affinity');
  });

  it('keeps personalization rerank bounded to the top result window', () => {
    const queryModel = createMixedSearchQueryModel({
      searchValue: 'docs',
      displayMode: 'default',
    });
    const actions = Array.from({ length: 16 }, (_, index) => createSearchAction({
      type: 'shortcut',
      label: `Docs ${index}`,
      value: `https://example.com/docs/${index}`,
      icon: '',
      shortcutId: `shortcut-${index}`,
    }, index, {
      sourceId: 'shortcuts',
      baseRank: index,
      reasons: ['base:shortcut-match'],
    }));
    const profile = recordSearchPersonalizationEvent({
      profile: createEmptySearchPersonalizationProfile(),
      queryModel,
      action: actions[15],
      usedAt: 1_710_000_000_000,
    });

    const reranked = rerankPersonalizedSearchActions({
      actions,
      queryModel,
      profile,
      now: 1_710_000_000_000,
    });

    expect(reranked[15]?.item.label).toBe('Docs 15');
  });

  it('applies weak negative feedback to skipped higher-ranked results', () => {
    const queryModel = createMixedSearchQueryModel({
      searchValue: 'github',
      displayMode: 'default',
    });
    const topAction = createSearchAction({
      type: 'bookmark',
      label: 'GitHub Docs',
      value: 'https://docs.github.com',
      icon: '',
      bookmarkId: 'github-docs',
    }, 0, {
      sourceId: 'bookmarks',
      baseRank: 0,
      reasons: ['base:bookmark-match'],
    });
    const selectedAction = createSearchAction({
      type: 'bookmark',
      label: 'GitHub Repo',
      value: 'https://github.com/team/project',
      icon: '',
      bookmarkId: 'github-repo',
    }, 1, {
      sourceId: 'bookmarks',
      baseRank: 1,
      reasons: ['base:bookmark-match'],
    });

    const profile = recordSearchPersonalizationEvent({
      profile: createEmptySearchPersonalizationProfile(),
      queryModel,
      action: selectedAction,
      visibleActions: [topAction, selectedAction],
      usedAt: 1_710_000_000_000,
    });

    const reranked = rerankPersonalizedSearchActions({
      actions: [topAction, selectedAction],
      queryModel,
      profile,
      now: 1_710_000_000_000,
    });

    expect(reranked.map((action) => action.item.label)).toEqual(['GitHub Repo', 'GitHub Docs']);
    expect(reranked[1]?.reasons).toContain('personalization:query-target-avoidance');
  });
});
