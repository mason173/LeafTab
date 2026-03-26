import {
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';

export type SuggestionUsageEntry = {
  count: number;
  lastUsedAt: number;
  hourCounts: number[];
};

export type SuggestionUsageMap = Record<string, SuggestionUsageEntry>;

const USAGE_STATS_KEY = 'leaftab_search_usage_stats_v1';
const MAX_USAGE_ENTRIES = 800;
let cachedUsageMapRaw: string | null = null;
let cachedUsageMapParsed: SuggestionUsageMap | null = null;

function normalizeHourCounts(raw: unknown): number[] {
  if (!Array.isArray(raw)) return Array.from({ length: 24 }, () => 0);
  const next = Array.from({ length: 24 }, (_, index) => {
    const value = Number(raw[index]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  });
  return next;
}

function normalizeUsageMap(raw: unknown): SuggestionUsageMap {
  if (!raw || typeof raw !== 'object') return {};
  const map = raw as Record<string, unknown>;
  const next: SuggestionUsageMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    const count = Number(entry.count);
    const lastUsedAt = Number(entry.lastUsedAt);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (!Number.isFinite(lastUsedAt) || lastUsedAt <= 0) continue;
    next[key] = {
      count: Math.floor(count),
      lastUsedAt,
      hourCounts: normalizeHourCounts(entry.hourCounts),
    };
  }
  return next;
}

export function readSuggestionUsageMap(): SuggestionUsageMap {
  try {
    const raw = readCachedLocalStorageItem(USAGE_STATS_KEY);
    if (!raw) return {};
    if (cachedUsageMapRaw === raw && cachedUsageMapParsed) {
      return cachedUsageMapParsed;
    }
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeUsageMap(parsed);
    cachedUsageMapRaw = raw;
    cachedUsageMapParsed = normalized;
    return normalized;
  } catch {
    return {};
  }
}

function writeSuggestionUsageMap(map: SuggestionUsageMap) {
  try {
    const serialized = JSON.stringify(map);
    queueCachedLocalStorageSetItem(USAGE_STATS_KEY, serialized);
    cachedUsageMapRaw = serialized;
    cachedUsageMapParsed = map;
  } catch {}
}

function trimSuggestionUsageMap(map: SuggestionUsageMap): SuggestionUsageMap {
  const entries = Object.entries(map);
  if (entries.length <= MAX_USAGE_ENTRIES) return map;
  entries.sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt);
  const kept = entries.slice(0, MAX_USAGE_ENTRIES);
  return Object.fromEntries(kept);
}

function normalizeShortcutUrl(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

export function buildQueryUsageKey(query: string): string {
  const normalized = query.trim().toLowerCase();
  return normalized ? `query:${normalized}` : '';
}

export function buildShortcutUsageKey(url: string): string {
  const normalized = normalizeShortcutUrl(url);
  return normalized ? `shortcut:${normalized}` : '';
}

export function recordSuggestionUsage(key: string, usedAt = Date.now()) {
  if (!key) return;
  const currentHour = new Date(usedAt).getHours();
  const map = readSuggestionUsageMap();
  const prev = map[key];
  const hourCounts = prev ? [...prev.hourCounts] : Array.from({ length: 24 }, () => 0);
  hourCounts[currentHour] += 1;
  map[key] = {
    count: (prev?.count || 0) + 1,
    lastUsedAt: usedAt,
    hourCounts,
  };
  writeSuggestionUsageMap(trimSuggestionUsageMap(map));
}

export function getSuggestionUsageBoost(
  map: SuggestionUsageMap,
  key: string,
  now = Date.now(),
): number {
  if (!key) return 0;
  const entry = map[key];
  if (!entry) return 0;

  const hoursSinceUsed = Math.max(0, (now - entry.lastUsedAt) / 3_600_000);
  const frequencyBoost = Math.min(24, Math.log2(entry.count + 1) * 7);
  const recencyBoost = Math.max(0, 20 - hoursSinceUsed * 0.9);
  const currentHour = new Date(now).getHours();
  const currentHourCount = entry.hourCounts[currentHour] || 0;
  const hourAffinity = entry.count > 0
    ? Math.min(8, (currentHourCount / entry.count) * 18)
    : 0;

  return frequencyBoost + recencyBoost + hourAffinity;
}
