import type { Shortcut, ShortcutVisualMode } from '@/types';

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
  '#FFFFFF',
  '#232128',
] as const;

const isShortcutIconColor = (value: string): value is (typeof SHORTCUT_ICON_COLOR_PALETTE)[number] =>
  SHORTCUT_ICON_COLOR_PALETTE.includes(value as (typeof SHORTCUT_ICON_COLOR_PALETTE)[number]);

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const matched = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!matched) return '';
  return `#${matched[1].toUpperCase()}`;
};

export const LEGACY_SHORTCUT_ICON_COLOR = '#FFFFFF';

export const normalizeShortcutIconColor = (value: string | null | undefined) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return '';
  const paletteMatched = SHORTCUT_ICON_COLOR_PALETTE.find((paletteColor) => (
    paletteColor.toLowerCase() === trimmed.toLowerCase()
  ));
  if (paletteMatched && isShortcutIconColor(paletteMatched)) return paletteMatched;
  return normalizeHexColor(trimmed);
};

export const normalizeShortcutVisualMode = (value: unknown): ShortcutVisualMode =>
  value === 'letter' ? 'letter' : 'favicon';

export const getPersistedShortcutIconColor = (seed: string) => {
  void seed;
  return '';
};

export const resolveShortcutIconColor = (value: string | null | undefined) => {
  const normalized = normalizeShortcutIconColor(value);
  return normalized || LEGACY_SHORTCUT_ICON_COLOR;
};

export const getShortcutIconColor = (seed: string, preferredColor?: string | null) => {
  void seed;
  return resolveShortcutIconColor(preferredColor);
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
