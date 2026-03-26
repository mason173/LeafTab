import type { Shortcut, ShortcutVisualMode } from '@/types';

const EMPTY_ICON_COLOR_MAP_KEY = 'leaftab_empty_icon_color_map_v1';

export const SHORTCUT_ICON_COLOR_PALETTE = [
  '#F4E300',
  '#7279E3',
  '#6B5CE7',
  '#1964D2',
  '#1BB1C7',
  '#099A4A',
  '#13375A',
  '#1C84E2',
  '#FA8A00',
  '#E25724',
  '#F00016',
  '#DD4E84',
  '#4E4DB7',
  '#2994CC',
] as const;

const isShortcutIconColor = (value: string): value is (typeof SHORTCUT_ICON_COLOR_PALETTE)[number] =>
  SHORTCUT_ICON_COLOR_PALETTE.includes(value as (typeof SHORTCUT_ICON_COLOR_PALETTE)[number]);

const readEmptyIconColorMap = () => {
  try {
    const raw = localStorage.getItem(EMPTY_ICON_COLOR_MAP_KEY);
    if (!raw) return {} as Record<string, string>;
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') return {} as Record<string, string>;
    return parsed;
  } catch {
    return {} as Record<string, string>;
  }
};

const persistEmptyIconColorMap = (map: Record<string, string>) => {
  try {
    localStorage.setItem(EMPTY_ICON_COLOR_MAP_KEY, JSON.stringify(map));
  } catch {}
};

export const normalizeShortcutIconColor = (value: string | null | undefined) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return isShortcutIconColor(trimmed) ? trimmed : '';
};

export const normalizeShortcutVisualMode = (value: unknown): ShortcutVisualMode =>
  value === 'letter' ? 'letter' : 'favicon';

export const getPersistedShortcutIconColor = (seed: string) => {
  const safeSeed = seed.trim().toLowerCase();
  if (!safeSeed) return SHORTCUT_ICON_COLOR_PALETTE[0];
  const map = readEmptyIconColorMap();
  const existing = normalizeShortcutIconColor(map[safeSeed]);
  if (existing) return existing;
  const picked = SHORTCUT_ICON_COLOR_PALETTE[Math.floor(Math.random() * SHORTCUT_ICON_COLOR_PALETTE.length)];
  map[safeSeed] = picked;
  persistEmptyIconColorMap(map);
  return picked;
};

export const getShortcutIconColor = (seed: string, preferredColor?: string | null) => {
  const normalizedPreferred = normalizeShortcutIconColor(preferredColor);
  if (normalizedPreferred) return normalizedPreferred;
  return getPersistedShortcutIconColor(seed);
};

export const shouldUseOfficialShortcutIcon = (params: {
  officialAvailable: boolean;
  shortcut?: Partial<Shortcut> | null;
}) => {
  const { officialAvailable, shortcut } = params;
  if (!officialAvailable) return false;
  const useOfficialIcon = shortcut?.useOfficialIcon !== false;
  if (useOfficialIcon) return true;
  const autoUseOfficialIcon = shortcut?.autoUseOfficialIcon !== false;
  const officialIconAvailableAtSave = shortcut?.officialIconAvailableAtSave === true;
  return autoUseOfficialIcon && !officialIconAvailableAtSave;
};
