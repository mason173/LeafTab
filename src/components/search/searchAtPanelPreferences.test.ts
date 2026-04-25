import { beforeEach, describe, expect, it } from 'vitest';
import {
  isSearchAtPanelTargetPinned,
  readSearchAtPanelPinState,
  sortSearchAtPanelIds,
  toggleSearchAtPanelTargetPin,
} from '@/components/search/searchAtPanelPreferences';

describe('searchAtPanelPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty state by default', () => {
    expect(readSearchAtPanelPinState()).toEqual({
      'ai-provider': [],
      'site-shortcut': [],
    });
  });

  it('pins targets to the front and persists the latest order', () => {
    expect(toggleSearchAtPanelTargetPin('site-shortcut', 'github')).toBe(true);
    expect(toggleSearchAtPanelTargetPin('site-shortcut', 'reddit')).toBe(true);

    expect(readSearchAtPanelPinState()['site-shortcut']).toEqual(['reddit', 'github']);
    expect(sortSearchAtPanelIds('site-shortcut', ['bilibili', 'github', 'reddit', 'zhihu'])).toEqual([
      'reddit',
      'github',
      'bilibili',
      'zhihu',
    ]);
  });

  it('removes a pinned target when toggled again', () => {
    toggleSearchAtPanelTargetPin('ai-provider', 'gemini');
    expect(isSearchAtPanelTargetPinned('ai-provider', 'gemini')).toBe(true);

    expect(toggleSearchAtPanelTargetPin('ai-provider', 'gemini')).toBe(false);
    expect(isSearchAtPanelTargetPinned('ai-provider', 'gemini')).toBe(false);
    expect(sortSearchAtPanelIds('ai-provider', ['chatgpt', 'gemini', 'deepseek'])).toEqual([
      'chatgpt',
      'gemini',
      'deepseek',
    ]);
  });
});
