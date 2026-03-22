export const SEARCH_HISTORY_KEY = 'search_history';
export const MAX_SEARCH_HISTORY = 15;

export type SearchHistoryEntry = {
  query: string;
  timestamp: number;
};

export const normalizeSearchHistory = (parsed: unknown): SearchHistoryEntry[] => {
  if (!Array.isArray(parsed)) return [];

  const now = Date.now();
  const normalized: SearchHistoryEntry[] = [];
  const seen = new Set<string>();

  parsed.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const query = entry.trim();
      if (!query || seen.has(query)) return;
      seen.add(query);
      normalized.push({
        query,
        timestamp: now - index * 60_000,
      });
      return;
    }

    if (!entry || typeof entry !== 'object') return;
    const rawQuery = (entry as { query?: unknown }).query;
    const rawTimestamp = (entry as { timestamp?: unknown }).timestamp;
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    if (!query || seen.has(query)) return;
    seen.add(query);

    const parsedTimestamp = Number(rawTimestamp);
    normalized.push({
      query,
      timestamp: Number.isFinite(parsedTimestamp) && parsedTimestamp > 0
        ? parsedTimestamp
        : now - index * 60_000,
    });
  });

  return normalized
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_SEARCH_HISTORY);
};

export const readSearchHistoryFromStorage = () => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    return normalizeSearchHistory(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
};

export const writeSearchHistoryToStorage = (entries: SearchHistoryEntry[]) => {
  const normalized = normalizeSearchHistory(entries);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(normalized));
  return normalized;
};
