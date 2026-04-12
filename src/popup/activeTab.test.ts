import { describe, expect, it } from 'vitest';
import { buildShortcutPrefillFromTab, isSaveableShortcutUrl } from '@/popup/activeTab';

describe('active tab shortcut prefill', () => {
  it('keeps website title and url for normal pages', () => {
    const prefill = buildShortcutPrefillFromTab({
      title: 'Example Domain',
      url: 'https://example.com/path?q=1',
      pendingUrl: undefined,
      favIconUrl: 'https://example.com/favicon.ico',
    });

    expect(prefill).toEqual({
      title: 'Example Domain',
      url: 'https://example.com/path?q=1',
      icon: 'https://example.com/favicon.ico',
    });
  });

  it('keeps browser internal pages available for manual saving', () => {
    const prefill = buildShortcutPrefillFromTab({
      title: 'Extensions',
      url: 'chrome://extensions',
      pendingUrl: undefined,
      favIconUrl: undefined,
    });

    expect(prefill.url).toBe('chrome://extensions');
    expect(prefill.icon).toBe('');
    expect(isSaveableShortcutUrl('chrome://extensions')).toBe(false);
  });
});
