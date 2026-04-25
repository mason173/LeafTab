export type SearchAtPanelTargetKind = 'ai-provider' | 'site-shortcut';

export type SearchAtPanelPinState = Record<SearchAtPanelTargetKind, string[]>;

const SEARCH_AT_PANEL_PIN_STORAGE_KEY = 'leaftab_search_at_panel_pins_v1';

const EMPTY_SEARCH_AT_PANEL_PIN_STATE: SearchAtPanelPinState = {
  'ai-provider': [],
  'site-shortcut': [],
};

function cloneEmptySearchAtPanelPinState(): SearchAtPanelPinState {
  return {
    'ai-provider': [],
    'site-shortcut': [],
  };
}

function getSearchAtPanelStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function normalizePinnedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  value.forEach((candidate) => {
    if (typeof candidate !== 'string') return;
    const nextId = candidate.trim();
    if (!nextId || seen.has(nextId)) return;
    seen.add(nextId);
    normalized.push(nextId);
  });

  return normalized;
}

function normalizeSearchAtPanelPinState(value: unknown): SearchAtPanelPinState {
  if (!value || typeof value !== 'object') {
    return cloneEmptySearchAtPanelPinState();
  }

  const record = value as Partial<Record<SearchAtPanelTargetKind, unknown>>;
  return {
    'ai-provider': normalizePinnedIds(record['ai-provider']),
    'site-shortcut': normalizePinnedIds(record['site-shortcut']),
  };
}

function writeSearchAtPanelPinState(nextState: SearchAtPanelPinState) {
  const storage = getSearchAtPanelStorage();
  if (!storage) return;

  try {
    const isEmpty = Object.entries(nextState).every(([, value]) => value.length === 0);
    if (isEmpty) {
      storage.removeItem(SEARCH_AT_PANEL_PIN_STORAGE_KEY);
      return;
    }
    storage.setItem(SEARCH_AT_PANEL_PIN_STORAGE_KEY, JSON.stringify(nextState));
  } catch {}
}

export function readSearchAtPanelPinState(): SearchAtPanelPinState {
  const storage = getSearchAtPanelStorage();
  if (!storage) {
    return cloneEmptySearchAtPanelPinState();
  }

  try {
    const raw = storage.getItem(SEARCH_AT_PANEL_PIN_STORAGE_KEY);
    if (!raw) return cloneEmptySearchAtPanelPinState();
    return normalizeSearchAtPanelPinState(JSON.parse(raw) as unknown);
  } catch {
    return cloneEmptySearchAtPanelPinState();
  }
}

export function isSearchAtPanelTargetPinned(kind: SearchAtPanelTargetKind, id: string): boolean {
  if (!id.trim()) return false;
  return readSearchAtPanelPinState()[kind].includes(id);
}

export function toggleSearchAtPanelTargetPin(kind: SearchAtPanelTargetKind, id: string): boolean {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return false;
  }

  const currentState = readSearchAtPanelPinState();
  const currentIds = currentState[kind];
  const alreadyPinned = currentIds.includes(normalizedId);

  const nextState: SearchAtPanelPinState = {
    'ai-provider': [...currentState['ai-provider']],
    'site-shortcut': [...currentState['site-shortcut']],
  };

  nextState[kind] = alreadyPinned
    ? currentIds.filter((candidate) => candidate !== normalizedId)
    : [normalizedId, ...currentIds.filter((candidate) => candidate !== normalizedId)];

  writeSearchAtPanelPinState(nextState);
  return !alreadyPinned;
}

export function sortSearchAtPanelIds(kind: SearchAtPanelTargetKind, ids: string[]): string[] {
  const normalizedIds = normalizePinnedIds(ids);
  if (normalizedIds.length <= 1) {
    return normalizedIds;
  }

  const pinnedIds = readSearchAtPanelPinState()[kind];
  if (pinnedIds.length === 0) {
    return normalizedIds;
  }

  const availableIdSet = new Set(normalizedIds);
  const pinnedInOrder = pinnedIds.filter((id) => availableIdSet.has(id));
  const pinnedIdSet = new Set(pinnedInOrder);
  const remainingIds = normalizedIds.filter((id) => !pinnedIdSet.has(id));

  return [...pinnedInOrder, ...remainingIds];
}

export const EMPTY_AT_PANEL_PIN_STATE = EMPTY_SEARCH_AT_PANEL_PIN_STATE;
