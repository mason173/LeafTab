export const SHORTCUT_CARD_VARIANTS = ['compact'] as const;

export type ShortcutCardVariant = (typeof SHORTCUT_CARD_VARIANTS)[number];
export type ShortcutLayoutDensity = 'compact' | 'regular' | 'large';

export const DEFAULT_SHORTCUT_CARD_VARIANT: ShortcutCardVariant = 'compact';

export function parseShortcutCardVariant(value: string | null | undefined): ShortcutCardVariant {
  void value;
  return DEFAULT_SHORTCUT_CARD_VARIANT;
}

export function getShortcutColumns(
  variant: ShortcutCardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  density: ShortcutLayoutDensity = 'regular',
): number {
  void variant;
  void density;
  return 9;
}

export function getShortcutColumnBounds(
  variant: ShortcutCardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
): { min: number; max: number } {
  void variant;
  return { min: 5, max: 10 };
}

export function clampShortcutGridColumns(
  value: number,
  variant: ShortcutCardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  density: ShortcutLayoutDensity = 'regular',
): number {
  void variant;
  if (!Number.isFinite(value)) return getShortcutColumns(variant, density);
  const { min, max } = getShortcutColumnBounds(variant);
  return Math.min(max, Math.max(min, Math.floor(value)));
}
