import { describe, expect, it } from 'vitest';
import type { SearchSuggestionItem } from '@/types';
import { createMixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';
import { rerankPersonalizedSearchActions, recordSearchPersonalizationEvent, createEmptySearchPersonalizationProfile } from '@/utils/searchPersonalization';
import { buildSearchSuggestionActions } from '@/utils/searchSuggestionEngine';
import { createSearchAction, type SearchAction } from '@/utils/searchActions';

type SearchFixture = {
  id: string;
  label: string;
  query: string;
  actions: SearchAction[];
};

type SimulationStep = {
  fixtureId: string;
  preferredSourceId: SearchAction['sourceId'];
  preferredSearchActionKey?: string;
  alternateSourceIds?: SearchAction['sourceId'][];
  noiseRate?: number;
};

type PersonaDefinition = {
  id: string;
  label: string;
  steps: SimulationStep[];
};

type PersonaSimulationResult = {
  id: string;
  label: string;
  sessions: number;
  baselineTop1: number;
  personalizedTop1: number;
  baselineMrr: number;
  personalizedMrr: number;
  averageRankDelta: number;
  wins: number;
  ties: number;
  losses: number;
  baselineLateTop1?: number;
  personalizedLateTop1?: number;
  baselineLateMrr?: number;
  personalizedLateMrr?: number;
};

function createMulberry32(seed: number) {
  let nextSeed = seed >>> 0;
  return () => {
    nextSeed += 0x6d2b79f5;
    let value = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function buildNavigateFixture(query: string, brand: string, id: string): SearchFixture {
  return {
    id,
    label: `${brand} mixed navigate`,
    query,
    actions: buildSearchSuggestionActions({
      mode: 'default',
      searchValue: query,
      bookmarkSuggestionItems: [
        {
          type: 'bookmark',
          label: `${brand} Bookmark`,
          value: `https://${query}.example.com/bookmark`,
          icon: '',
          bookmarkId: `${id}-bookmark`,
        },
      ],
      tabSuggestionItems: [
        {
          type: 'tab',
          label: `${brand} Active Tab`,
          value: `https://${query}.example.com/tab`,
          icon: '',
          tabId: 10_000 + id.length,
          windowId: 1,
        },
      ],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: `${brand} recent query`,
          value: `${query} release note`,
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: `${brand} 官网`,
          value: `${brand} 官网`,
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: `${brand} History`,
          value: `https://${query}.example.com/history`,
          timestamp: 2,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [
        {
          type: 'shortcut',
          label: `${brand} Shortcut`,
          value: `https://${query}.example.com/shortcut`,
          icon: '',
          shortcutId: `${id}-shortcut`,
        },
      ],
    }),
  };
}

function buildSettingsFixture(args: {
  id: string;
  query: string;
  primaryLabel: string;
  primaryActionKey: string;
  primaryState: string;
  secondaryLabel: string;
  secondaryActionKey: string;
  secondaryState: string;
}): SearchFixture {
  const {
    id,
    query,
    primaryLabel,
    primaryActionKey,
    primaryState,
    secondaryLabel,
    secondaryActionKey,
    secondaryState,
  } = args;

  return {
    id,
    label: `${primaryLabel} settings`,
    query,
    actions: [
      createSearchAction({
        type: 'history',
        label: primaryLabel,
        value: primaryLabel,
        timestamp: 1,
        historySource: 'local',
        searchActionKey: primaryActionKey,
        searchActionState: primaryState,
      } as SearchSuggestionItem, 0, {
        sourceId: 'settings',
        baseRank: 0,
        reasons: ['base:settings-match'],
      }),
      createSearchAction({
        type: 'history',
        label: secondaryLabel,
        value: secondaryLabel,
        timestamp: 1,
        historySource: 'local',
        searchActionKey: secondaryActionKey,
        searchActionState: secondaryState,
      } as SearchSuggestionItem, 1, {
        sourceId: 'settings',
        baseRank: 1,
        reasons: ['base:settings-match'],
      }),
    ],
  };
}

function findActionBySource(
  actions: readonly SearchAction[],
  preferredSourceId: SearchAction['sourceId'],
  preferredSearchActionKey: string | undefined,
  alternateSourceIds: readonly SearchAction['sourceId'][] = [],
  rng: () => number,
  noiseRate = 0,
): SearchAction {
  const preferred = preferredSearchActionKey
    ? actions.find((action) => (
        action.item.type === 'history'
        && action.item.searchActionKey === preferredSearchActionKey
      ))
    : actions.find((action) => action.sourceId === preferredSourceId);
  if (!preferred) {
    throw new Error([
      `missing preferred source ${String(preferredSourceId)}`,
      preferredSearchActionKey ? `key=${preferredSearchActionKey}` : '',
      `available=${actions.map((action) => `${String(action.sourceId)}:${action.item.type === 'history' ? action.item.searchActionKey || action.item.label : action.item.label}`).join(',')}`,
    ].filter(Boolean).join(' | '));
  }

  if (noiseRate > 0 && alternateSourceIds.length > 0 && rng() < noiseRate) {
    for (const alternateSourceId of alternateSourceIds) {
      const alternate = actions.find((action) => action.sourceId === alternateSourceId);
      if (alternate) return alternate;
    }
  }

  return preferred;
}

function average(values: readonly number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function simulatePersona(args: {
  persona: PersonaDefinition;
  fixtures: Map<string, SearchFixture>;
  seed: number;
  lateWindowSize?: number;
}): PersonaSimulationResult {
  const { persona, fixtures, seed, lateWindowSize = 10 } = args;
  const rng = createMulberry32(seed);
  let profile = createEmptySearchPersonalizationProfile();
  let usedAt = 1_710_000_000_000;
  const baselineRanks: number[] = [];
  const personalizedRanks: number[] = [];

  for (const step of persona.steps) {
    const fixture = fixtures.get(step.fixtureId);
    if (!fixture) {
      throw new Error(`unknown fixture ${step.fixtureId}`);
    }

    const queryModel = createMixedSearchQueryModel({
      searchValue: fixture.query,
      displayMode: 'default',
    });
    const baseActions = fixture.actions;
    const personalizedActions = rerankPersonalizedSearchActions({
      actions: baseActions,
      queryModel,
      profile,
      now: usedAt,
    });
    const chosenBaseAction = findActionBySource(
      baseActions,
      step.preferredSourceId,
      step.preferredSearchActionKey,
      step.alternateSourceIds,
      rng,
      step.noiseRate,
    );
    const chosenActionId = chosenBaseAction.id;
    const baselineRank = baseActions.findIndex((action) => action.id === chosenActionId) + 1;
    const personalizedRank = personalizedActions.findIndex((action) => action.id === chosenActionId) + 1;
    if (baselineRank <= 0 || personalizedRank <= 0) {
      throw new Error(`unable to resolve ranks for ${chosenActionId}`);
    }

    baselineRanks.push(baselineRank);
    personalizedRanks.push(personalizedRank);

    const chosenPersonalizedAction = personalizedActions.find((action) => action.id === chosenActionId);
    if (!chosenPersonalizedAction) {
      throw new Error(`missing personalized action ${chosenActionId}`);
    }

    profile = recordSearchPersonalizationEvent({
      profile,
      queryModel,
      action: chosenPersonalizedAction,
      visibleActions: personalizedActions,
      usedAt,
    });
    usedAt += 60_000 * 12;
  }

  const wins = personalizedRanks.filter((rank, index) => rank < baselineRanks[index]).length;
  const ties = personalizedRanks.filter((rank, index) => rank === baselineRanks[index]).length;
  const losses = personalizedRanks.filter((rank, index) => rank > baselineRanks[index]).length;
  const baselineLateRanks = baselineRanks.slice(-Math.min(lateWindowSize, baselineRanks.length));
  const personalizedLateRanks = personalizedRanks.slice(-Math.min(lateWindowSize, personalizedRanks.length));

  return {
    id: persona.id,
    label: persona.label,
    sessions: baselineRanks.length,
    baselineTop1: average(baselineRanks.map((rank) => (rank === 1 ? 1 : 0))),
    personalizedTop1: average(personalizedRanks.map((rank) => (rank === 1 ? 1 : 0))),
    baselineMrr: average(baselineRanks.map((rank) => 1 / rank)),
    personalizedMrr: average(personalizedRanks.map((rank) => 1 / rank)),
    averageRankDelta: average(baselineRanks.map((rank, index) => rank - personalizedRanks[index])),
    wins,
    ties,
    losses,
    baselineLateTop1: average(baselineLateRanks.map((rank) => (rank === 1 ? 1 : 0))),
    personalizedLateTop1: average(personalizedLateRanks.map((rank) => (rank === 1 ? 1 : 0))),
    baselineLateMrr: average(baselineLateRanks.map((rank) => 1 / rank)),
    personalizedLateMrr: average(personalizedLateRanks.map((rank) => 1 / rank)),
  };
}

function repeatSteps(steps: readonly SimulationStep[], cycles: number): SimulationStep[] {
  return Array.from({ length: cycles }, () => steps).flat();
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

describe('search personalization simulation', () => {
  it('simulates realistic personas and reports ranking lift', () => {
    const fixtures = new Map<string, SearchFixture>([
      ['github', buildNavigateFixture('github', 'GitHub', 'github')],
      ['notion', buildNavigateFixture('notion', 'Notion', 'notion')],
      ['linear', buildNavigateFixture('linear', 'Linear', 'linear')],
      ['figma', buildNavigateFixture('figma', 'Figma', 'figma')],
      ['theme', buildSettingsFixture({
        id: 'theme',
        query: '主题模式',
        primaryLabel: '主题模式',
        primaryActionKey: 'theme-mode-entry',
        primaryState: 'dark',
        secondaryLabel: '壁纸设置',
        secondaryActionKey: 'wallpaper-settings-entry',
        secondaryState: 'bing',
      })],
      ['search-engine', buildSettingsFixture({
        id: 'search-engine',
        query: '搜索引擎',
        primaryLabel: '搜索引擎',
        primaryActionKey: 'search-settings-entry',
        primaryState: 'bing',
        secondaryLabel: '显示时间',
        secondaryActionKey: 'show-time-setting',
        secondaryState: 'enabled',
      })],
    ]);

    const personas: PersonaDefinition[] = [
      {
        id: 'bookmark-archivist',
        label: 'Bookmark-heavy 用户',
        steps: repeatSteps([
          { fixtureId: 'github', preferredSourceId: 'bookmarks' },
          { fixtureId: 'notion', preferredSourceId: 'bookmarks' },
          { fixtureId: 'linear', preferredSourceId: 'bookmarks' },
        ], 8),
      },
      {
        id: 'shortcut-launcher',
        label: 'Shortcut-heavy 用户',
        steps: repeatSteps([
          { fixtureId: 'github', preferredSourceId: 'shortcuts' },
          { fixtureId: 'figma', preferredSourceId: 'shortcuts' },
          { fixtureId: 'notion', preferredSourceId: 'shortcuts' },
        ], 8),
      },
      {
        id: 'tab-worker',
        label: 'Tab-heavy 用户',
        steps: repeatSteps([
          { fixtureId: 'github', preferredSourceId: 'tabs' },
          { fixtureId: 'linear', preferredSourceId: 'tabs' },
          { fixtureId: 'figma', preferredSourceId: 'tabs' },
        ], 8),
      },
      {
        id: 'settings-operator',
        label: 'Settings power user',
        steps: repeatSteps([
          { fixtureId: 'theme', preferredSourceId: 'settings' },
          { fixtureId: 'search-engine', preferredSourceId: 'settings', preferredSearchActionKey: 'search-settings-entry' },
        ], 10),
      },
      {
        id: 'noisy-bookmark-user',
        label: '带噪声的书签用户',
        steps: repeatSteps([
          { fixtureId: 'github', preferredSourceId: 'bookmarks', alternateSourceIds: ['tabs'], noiseRate: 0.18 },
          { fixtureId: 'notion', preferredSourceId: 'bookmarks', alternateSourceIds: ['shortcuts'], noiseRate: 0.18 },
          { fixtureId: 'linear', preferredSourceId: 'bookmarks', alternateSourceIds: ['tabs'], noiseRate: 0.18 },
        ], 8),
      },
      {
        id: 'preference-shift',
        label: '偏好迁移用户',
        steps: [
          ...repeatSteps([
            { fixtureId: 'github', preferredSourceId: 'bookmarks' },
            { fixtureId: 'notion', preferredSourceId: 'bookmarks' },
            { fixtureId: 'linear', preferredSourceId: 'bookmarks' },
          ], 4),
          ...repeatSteps([
            { fixtureId: 'github', preferredSourceId: 'shortcuts' },
            { fixtureId: 'notion', preferredSourceId: 'shortcuts' },
            { fixtureId: 'linear', preferredSourceId: 'shortcuts' },
          ], 4),
        ],
      },
    ];

    const results = personas.map((persona, index) => simulatePersona({
      persona,
      fixtures,
      seed: 100 + index * 17,
    }));

    console.table(results.map((result) => ({
      persona: result.label,
      sessions: result.sessions,
      baseline_top1: formatRate(result.baselineTop1),
      personalized_top1: formatRate(result.personalizedTop1),
      baseline_mrr: result.baselineMrr.toFixed(3),
      personalized_mrr: result.personalizedMrr.toFixed(3),
      avg_rank_delta: result.averageRankDelta.toFixed(2),
      wins: result.wins,
      ties: result.ties,
      losses: result.losses,
      late_top1_base: formatRate(result.baselineLateTop1 || 0),
      late_top1_personalized: formatRate(result.personalizedLateTop1 || 0),
    })));

    const bookmarkPersona = results.find((result) => result.id === 'bookmark-archivist');
    const shortcutPersona = results.find((result) => result.id === 'shortcut-launcher');
    const tabPersona = results.find((result) => result.id === 'tab-worker');
    const settingsPersona = results.find((result) => result.id === 'settings-operator');
    const noisyPersona = results.find((result) => result.id === 'noisy-bookmark-user');
    const shiftPersona = results.find((result) => result.id === 'preference-shift');

    expect(bookmarkPersona?.personalizedTop1 || 0).toBeGreaterThan((bookmarkPersona?.baselineTop1 || 0) + 0.45);
    expect(shortcutPersona?.personalizedTop1 || 0).toBeGreaterThan((shortcutPersona?.baselineTop1 || 0) + 0.45);
    expect(tabPersona?.personalizedTop1 || 0).toBeGreaterThanOrEqual((tabPersona?.baselineTop1 || 0) - 0.01);
    expect(settingsPersona?.personalizedTop1 || 0).toBeGreaterThanOrEqual((settingsPersona?.baselineTop1 || 0) - 0.01);
    expect(noisyPersona?.personalizedMrr || 0).toBeGreaterThan((noisyPersona?.baselineMrr || 0) + 0.08);
    expect(shiftPersona?.personalizedLateTop1 || 0).toBeGreaterThan((shiftPersona?.baselineLateTop1 || 0) + 0.35);
  });
});
