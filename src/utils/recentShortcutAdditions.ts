import {
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';
import { buildShortcutUsageKey } from '@/utils/suggestionPersonalization';

export type RecentShortcutAdditionsMap = Record<string, number>;

const RECENT_SHORTCUT_ADDITIONS_KEY = 'leaftab_recent_shortcut_additions_v1';
const MAX_RECENT_SHORTCUT_ADDITIONS = 24;
const RECENT_SHORTCUT_ADDITION_KEEP_MS = 3 * 24 * 60 * 60 * 1_000;
const RECENT_SHORTCUT_ADDITION_BOOST_MS = 24 * 60 * 60 * 1_000;
const RECENT_SHORTCUT_ADDITION_MAX_BOOST = 132;

let cachedRecentShortcutAdditionsRaw: string | null = null;
let cachedRecentShortcutAdditionsParsed: RecentShortcutAdditionsMap | null = null;

function normalizeRecentShortcutAdditionsMap(
  raw: unknown,
  now = Date.now(),
): RecentShortcutAdditionsMap {
  if (!raw || typeof raw !== 'object') return {};

  const nextEntries = Object.entries(raw as Record<string, unknown>)
    .map(([key, value]) => [key, Number(value)] as const)
    .filter(([key, addedAt]) => (
      Boolean(key)
      && Number.isFinite(addedAt)
      && addedAt > 0
      && now - addedAt <= RECENT_SHORTCUT_ADDITION_KEEP_MS
    ))
    .sort((left, right) => right[1] - left[1])
    .slice(0, MAX_RECENT_SHORTCUT_ADDITIONS);

  return Object.fromEntries(nextEntries);
}

function writeRecentShortcutAdditionsMap(map: RecentShortcutAdditionsMap) {
  try {
    const serialized = JSON.stringify(map);
    queueCachedLocalStorageSetItem(RECENT_SHORTCUT_ADDITIONS_KEY, serialized);
    cachedRecentShortcutAdditionsRaw = serialized;
    cachedRecentShortcutAdditionsParsed = map;
  } catch {}
}

export function readRecentShortcutAdditionsMap(now = Date.now()): RecentShortcutAdditionsMap {
  try {
    const raw = readCachedLocalStorageItem(RECENT_SHORTCUT_ADDITIONS_KEY);
    if (!raw) return {};
    if (cachedRecentShortcutAdditionsRaw === raw && cachedRecentShortcutAdditionsParsed) {
      return cachedRecentShortcutAdditionsParsed;
    }
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeRecentShortcutAdditionsMap(parsed, now);
    cachedRecentShortcutAdditionsRaw = raw;
    cachedRecentShortcutAdditionsParsed = normalized;
    return normalized;
  } catch {
    return {};
  }
}

export function recordRecentShortcutAddition(url: string, addedAt = Date.now()) {
  const key = buildShortcutUsageKey(url);
  if (!key) return;

  const map = readRecentShortcutAdditionsMap(addedAt);
  map[key] = addedAt;
  writeRecentShortcutAdditionsMap(normalizeRecentShortcutAdditionsMap(map, addedAt));
}

export function consumeRecentShortcutAddition(url: string, consumedAt = Date.now()) {
  const key = buildShortcutUsageKey(url);
  if (!key) return;

  const map = readRecentShortcutAdditionsMap(consumedAt);
  if (!map[key]) return;
  delete map[key];
  writeRecentShortcutAdditionsMap(normalizeRecentShortcutAdditionsMap(map, consumedAt));
}

export function getRecentShortcutAdditionBoost(addedAt?: number, now = Date.now()): number {
  if (!Number.isFinite(addedAt) || !addedAt || addedAt <= 0) return 0;
  const ageMs = Math.max(0, now - addedAt);
  if (ageMs >= RECENT_SHORTCUT_ADDITION_BOOST_MS) return 0;
  const freshnessRatio = 1 - (ageMs / RECENT_SHORTCUT_ADDITION_BOOST_MS);
  return Math.max(0, freshnessRatio * RECENT_SHORTCUT_ADDITION_MAX_BOOST);
}
