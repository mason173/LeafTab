import type { SearchEngine } from '@/types';

type SearchEngineOverride = Exclude<SearchEngine, 'system'>;
export const SEARCH_ENGINE_ORDER: SearchEngine[] = ['system', 'bing', 'google', 'duckduckgo', 'baidu'];

const URL_PROTOCOL_PREFIX_RE = /^https?:\/\//i;
const URL_WWW_PREFIX_RE = /^www\./i;
const NON_ALNUM_RE = /[^a-z0-9]+/i;

const CHINESE_INITIAL_MAP: Record<string, string> = {
  知: 'z',
  乎: 'h',
  微: 'w',
  博: 'b',
  小: 'x',
  红: 'h',
  书: 's',
  掘: 'j',
  金: 'j',
  抖: 'd',
  音: 'y',
  百: 'b',
  度: 'd',
  淘: 't',
  宝: 'b',
  京: 'j',
  东: 'd',
  码: 'm',
  云: 'y',
  维: 'w',
  基: 'j',
};

const SEARCH_ENGINE_PREFIX_MAP: Record<string, SearchEngineOverride> = {
  g: 'google',
  google: 'google',
  b: 'bing',
  bing: 'bing',
  d: 'duckduckgo',
  ddg: 'duckduckgo',
  duck: 'duckduckgo',
  duckduckgo: 'duckduckgo',
  bd: 'baidu',
  baidu: 'baidu',
};

export function normalizeSearchQuery(rawValue: string): string {
  return rawValue.trim().toLowerCase();
}

function buildInitialsToken(rawValue: string): string {
  const normalized = normalizeSearchQuery(rawValue);
  if (!normalized) return '';

  let initials = '';
  let atWordStart = true;
  for (const ch of normalized) {
    if (/[a-z0-9]/.test(ch)) {
      if (atWordStart) initials += ch;
      atWordStart = false;
      continue;
    }
    const chineseInitial = CHINESE_INITIAL_MAP[ch];
    if (chineseInitial) {
      initials += chineseInitial;
      atWordStart = false;
      continue;
    }
    atWordStart = true;
  }
  return initials;
}

function isSubsequenceMatch(candidate: string, query: string): boolean {
  if (!candidate || !query || query.length > candidate.length) return false;
  let i = 0;
  let j = 0;
  while (i < candidate.length && j < query.length) {
    if (candidate[i] === query[j]) j += 1;
    i += 1;
  }
  return j === query.length;
}

function hasSmallTypo(candidate: string, query: string): boolean {
  const a = candidate;
  const b = query;
  if (!a || !b || b.length < 3) return false;
  if (Math.abs(a.length - b.length) > 1) return false;

  // same length: allow at most one substitution
  if (a.length === b.length) {
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) mismatch += 1;
      if (mismatch > 1) return false;
    }
    return mismatch === 1;
  }

  // one insertion/deletion
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    i += 1;
  }
  return true;
}

function isFuzzyMatch(candidate: string, normalizedQuery: string): boolean {
  if (!candidate || !normalizedQuery || normalizedQuery.length < 2) return false;
  if (candidate.includes(normalizedQuery)) return true;
  if (isSubsequenceMatch(candidate, normalizedQuery)) return true;
  return hasSmallTypo(candidate, normalizedQuery);
}

function buildMatchCandidates(rawValue: string): string[] {
  const normalized = normalizeSearchQuery(rawValue);
  if (!normalized) return [];

  const candidates = [normalized];
  const noProtocol = normalized.replace(URL_PROTOCOL_PREFIX_RE, '');
  if (noProtocol && noProtocol !== normalized) candidates.push(noProtocol);

  const noWww = noProtocol.replace(URL_WWW_PREFIX_RE, '');
  if (noWww && noWww !== noProtocol) candidates.push(noWww);
  if (noWww && NON_ALNUM_RE.test(noWww)) {
    candidates.push(noWww.split(/[^a-z0-9]+/).filter(Boolean).join(''));
  }

  const initials = buildInitialsToken(rawValue);
  if (initials) candidates.push(initials);

  return Array.from(new Set(candidates));
}

// 2 = prefix match, 1 = fallback contains match, 0 = no match
export function getSearchMatchPriority(
  rawValue: string,
  normalizedQuery: string,
  options?: { fuzzy?: boolean },
): 0 | 1 | 2 {
  if (!normalizedQuery) return 0;
  const fuzzyEnabled = options?.fuzzy ?? true;

  let priority: 0 | 1 | 2 = 0;
  const candidates = buildMatchCandidates(rawValue);
  for (const candidate of candidates) {
    if (candidate.startsWith(normalizedQuery)) return 2;
    if (priority === 0 && candidate.includes(normalizedQuery)) priority = 1;
  }
  if (priority === 0 && fuzzyEnabled && candidates.some((candidate) => isFuzzyMatch(candidate, normalizedQuery))) {
    return 1;
  }
  return priority;
}

// Higher score means higher suggestion priority.
// 4 title-prefix > 3 url-prefix > 2 title-contains > 1 url-contains > 0 no-match
export function getShortcutSuggestionScore(args: {
  title: string;
  url: string;
  normalizedQuery: string;
  fuzzy?: boolean;
}): 0 | 1 | 2 | 3 | 4 {
  const { title, url, normalizedQuery, fuzzy } = args;
  if (!normalizedQuery) return 0;

  const titlePriority = getSearchMatchPriority(title, normalizedQuery, { fuzzy });
  const urlPriority = getSearchMatchPriority(url, normalizedQuery, { fuzzy });

  if (titlePriority === 2) return 4;
  if (urlPriority === 2) return 3;
  if (titlePriority === 1) return 2;
  if (urlPriority === 1) return 1;
  return 0;
}

export function parseSearchEnginePrefix(rawQuery: string): {
  query: string;
  overrideEngine: SearchEngineOverride | null;
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { query: '', overrideEngine: null };

  const match = trimmed.match(/^([a-z]+)\s+(.+)$/i);
  if (!match) return { query: trimmed, overrideEngine: null };

  const prefix = match[1].toLowerCase();
  const nextQuery = match[2].trim();
  const overrideEngine = SEARCH_ENGINE_PREFIX_MAP[prefix] || null;
  if (!overrideEngine || !nextQuery) {
    return { query: trimmed, overrideEngine: null };
  }
  return { query: nextQuery, overrideEngine };
}

export function getNextSearchEngine(current: SearchEngine, direction: 1 | -1 = 1): SearchEngine {
  const total = SEARCH_ENGINE_ORDER.length;
  const currentIndex = SEARCH_ENGINE_ORDER.indexOf(current);
  if (currentIndex < 0) return SEARCH_ENGINE_ORDER[0];
  const nextIndex = (currentIndex + direction + total) % total;
  return SEARCH_ENGINE_ORDER[nextIndex];
}
