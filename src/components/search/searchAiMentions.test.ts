import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildAiMentionActions,
  buildAiMentionEntries,
  parseAiProviderActionId,
  parseSiteShortcutActionId,
} from '@/components/search/searchAiMentions';
import { toggleSearchAtPanelTargetPin } from '@/components/search/searchAtPanelPreferences';

const t = ((key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key) as never;

describe('searchAiMentions', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds AI and site targets for an empty @ query', () => {
    const actions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: '',
    });

    expect(actions.some((action) => action.item.label === '@ChatGPT')).toBe(true);
    expect(actions.some((action) => action.item.label === '@Kimi')).toBe(true);
    expect(actions.some((action) => action.item.label === '@Claude')).toBe(true);
    expect(actions.some((action) => action.item.label === '@Perplexity')).toBe(true);
    expect(actions.some((action) => action.item.label === '@通义千问')).toBe(true);
    expect(actions.some((action) => action.item.label === '@腾讯元宝')).toBe(true);
    expect(actions.some((action) => action.item.label === '@Copilot')).toBe(true);
    expect(actions.some((action) => action.item.label === '@GitHub')).toBe(true);
  });

  it('matches providers by localized keyword', () => {
    const actions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: '豆包',
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.item.label).toBe('@豆包');
  });

  it('matches newly added providers by keyword', () => {
    const qwenActions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: '千问',
    });
    const kimiActions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: 'kimi',
    });

    expect(qwenActions[0]?.item.label).toBe('@通义千问');
    expect(kimiActions[0]?.item.label).toBe('@Kimi');
  });

  it('parses action values back to provider ids', () => {
    const actions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: 'deep',
    });

    expect(parseAiProviderActionId(actions[0]?.item.value || '')).toBe('deepseek');
  });

  it('parses site shortcut values back to site ids', () => {
    const actions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: 'github',
    });

    const siteAction = actions.find((action) => action.item.label === '@GitHub');
    expect(parseSiteShortcutActionId(siteAction?.item.value || '')).toBe('github');
  });

  it('adds a pin secondary action for @ entries', () => {
    const actions = buildAiMentionActions({
      isOpen: true,
      entries: buildAiMentionEntries({ t }),
      queryKey: 'chat',
    });

    expect(actions[0]?.secondaryActions[0]?.kind).toBe('pin-at-target');
    expect(actions[0]?.secondaryActions[0]?.active).toBe(false);
  });

  it('moves pinned AI assistants and sites to the front within their own group', () => {
    toggleSearchAtPanelTargetPin('ai-provider', 'deepseek');
    toggleSearchAtPanelTargetPin('site-shortcut', 'reddit');
    toggleSearchAtPanelTargetPin('site-shortcut', 'github');

    const entries = buildAiMentionEntries({ t });
    const aiEntryIds = entries
      .filter((entry) => entry.kind === 'ai-provider')
      .map((entry) => entry.id);
    const siteEntryIds = entries
      .filter((entry) => entry.kind === 'site-shortcut')
      .map((entry) => entry.id);

    expect(aiEntryIds[0]).toBe('deepseek');
    expect(siteEntryIds.slice(0, 3)).toEqual(['github', 'reddit', 'bilibili']);
  });
});
