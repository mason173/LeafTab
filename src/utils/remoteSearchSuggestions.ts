import type { SearchSuggestionItem, RemoteSearchSuggestionProvider } from '@/types';
import { isExtensionRuntime } from '@/platform/runtime';
import { compactSearchQuery, normalizeSearchQuery } from '@/utils/searchHelpers';

const REMOTE_SEARCH_SUGGESTIONS_MESSAGE_TYPE = 'LEAFTAB_REMOTE_SEARCH_SUGGESTIONS';
const REMOTE_SEARCH_SUGGESTIONS_CACHE_TTL_MS = 5 * 60_000;

type RemoteSuggestionsMessageResponse =
  | {
    success: true;
    items: string[];
  }
  | {
    success: false;
    error?: string;
  };

type RemoteSuggestionsCacheEntry = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

const remoteSuggestionsCache = new Map<string, RemoteSuggestionsCacheEntry>();

function normalizeRemoteSuggestionQuery(rawValue: string): string {
  return normalizeSearchQuery(String(rawValue || ''));
}

function buildRemoteSuggestionsCacheKey(
  provider: RemoteSearchSuggestionProvider,
  rawQuery: string,
): string {
  return `${provider}:${normalizeRemoteSuggestionQuery(rawQuery)}`;
}

function toRemoteSuggestionItems(
  provider: RemoteSearchSuggestionProvider,
  rawItems: readonly string[],
): SearchSuggestionItem[] {
  const seen = new Set<string>();
  const items: SearchSuggestionItem[] = [];

  rawItems.forEach((rawItem) => {
    const value = typeof rawItem === 'string' ? rawItem.trim() : '';
    if (!value) return;

    const normalizedValue = value.toLowerCase();
    if (seen.has(normalizedValue)) return;
    seen.add(normalizedValue);

    items.push({
      type: 'remote',
      label: value,
      value,
      provider,
    });
  });

  return items;
}

export function getCachedRemoteSearchSuggestions(
  provider: RemoteSearchSuggestionProvider,
  query: string,
): SearchSuggestionItem[] | null {
  const normalizedQuery = normalizeRemoteSuggestionQuery(query);
  if (!normalizedQuery) return null;

  const cacheKey = buildRemoteSuggestionsCacheKey(provider, normalizedQuery);
  const cacheEntry = remoteSuggestionsCache.get(cacheKey);
  if (!cacheEntry) return null;

  if (Date.now() - cacheEntry.cachedAt > REMOTE_SEARCH_SUGGESTIONS_CACHE_TTL_MS) {
    remoteSuggestionsCache.delete(cacheKey);
    return null;
  }

  return cacheEntry.items;
}

export async function getRemoteSearchSuggestionsFromExtension(args: {
  provider: RemoteSearchSuggestionProvider;
  query: string;
  limit?: number;
}): Promise<SearchSuggestionItem[]> {
  const { provider, query, limit = 10 } = args;
  const normalizedQuery = normalizeRemoteSuggestionQuery(query);
  if (
    !normalizedQuery
    || !isExtensionRuntime()
    || typeof chrome === 'undefined'
    || !chrome.runtime?.sendMessage
  ) {
    return [];
  }

  const cacheKey = buildRemoteSuggestionsCacheKey(provider, normalizedQuery);
  const compactQuery = compactSearchQuery(normalizedQuery);
  const queryVariants = compactQuery && compactQuery !== normalizedQuery
    ? [normalizedQuery, compactQuery]
    : [normalizedQuery];

  for (const queryVariant of queryVariants) {
    const cachedItems = getCachedRemoteSearchSuggestions(provider, queryVariant);
    if (cachedItems) {
      if (queryVariant !== normalizedQuery) {
        remoteSuggestionsCache.set(cacheKey, {
          cachedAt: Date.now(),
          items: cachedItems,
        });
      }
      return cachedItems.slice(0, limit);
    }
  }

  for (const queryVariant of queryVariants) {
    const response = await new Promise<RemoteSuggestionsMessageResponse>((resolve) => {
      try {
        chrome.runtime.sendMessage({
          type: REMOTE_SEARCH_SUGGESTIONS_MESSAGE_TYPE,
          payload: {
            provider,
            query: queryVariant,
            limit,
          },
        }, (messageResponse: RemoteSuggestionsMessageResponse | undefined) => {
          if (chrome.runtime?.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message,
            });
            return;
          }

          resolve(messageResponse || { success: false, error: 'empty_response' });
        });
      } catch (error) {
        resolve({
          success: false,
          error: String(error instanceof Error ? error.message : error),
        });
      }
    });

    if (!response.success) continue;

    const items = toRemoteSuggestionItems(provider, response.items).slice(0, limit);
    if (items.length === 0) {
      continue;
    }

    remoteSuggestionsCache.set(buildRemoteSuggestionsCacheKey(provider, queryVariant), {
      cachedAt: Date.now(),
      items,
    });
    if (queryVariant !== normalizedQuery) {
      remoteSuggestionsCache.set(cacheKey, {
        cachedAt: Date.now(),
        items,
      });
    }
    return items;
  }

  return [];
}
