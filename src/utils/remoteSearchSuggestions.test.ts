import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRemoteSearchSuggestionsFromExtension } from '@/utils/remoteSearchSuggestions';

describe('remoteSearchSuggestions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as { chrome?: unknown }).chrome = {
      runtime: {
        id: 'test-extension',
      },
    } as unknown;
  });

  it('falls back to the compact query when the spaced query returns no remote suggestions', async () => {
    const seenQueries: string[] = [];
    const sendMessage = vi.fn((
      message: {
        payload?: {
          query?: string;
        };
      },
      callback?: (response: { success: boolean; items?: string[] }) => void,
    ) => {
      const query = message.payload?.query ?? '';
      seenQueries.push(query);
      if (query === 'mac 开始') {
        callback?.({ success: true, items: [] });
        return;
      }
      if (query === 'mac开始') {
        callback?.({ success: true, items: ['Mac开始页', 'Mac开始菜单'] });
        return;
      }
      callback?.({ success: true, items: [] });
    });

    (globalThis as { chrome?: unknown }).chrome = {
      runtime: {
        id: 'test-extension',
        sendMessage,
      },
    } as unknown;

    const first = await getRemoteSearchSuggestionsFromExtension({
      provider: '360',
      query: 'Mac 开始',
      limit: 10,
    });

    expect(first.map((item) => item.label)).toEqual(['Mac开始页', 'Mac开始菜单']);
    expect(seenQueries).toEqual(['mac 开始', 'mac开始']);

    const second = await getRemoteSearchSuggestionsFromExtension({
      provider: '360',
      query: 'Mac 开始',
      limit: 10,
    });

    expect(second.map((item) => item.label)).toEqual(['Mac开始页', 'Mac开始菜单']);
    expect(seenQueries).toEqual(['mac 开始', 'mac开始']);
  });
});
