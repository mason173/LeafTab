export const SHORTCUT_CARD_VARIANTS = ['default', 'compact'] as const;

export type ShortcutCardVariant = (typeof SHORTCUT_CARD_VARIANTS)[number];
export type ShortcutLayoutDensity = 'compact' | 'regular' | 'large';

export const DEFAULT_SHORTCUT_CARD_VARIANT: ShortcutCardVariant = 'default';

export function parseShortcutCardVariant(value: string | null | undefined): ShortcutCardVariant {
  if (value === 'default') return 'default';
  if (value === 'compact') return 'compact';
  return DEFAULT_SHORTCUT_CARD_VARIANT;
}

export function getShortcutColumns(
  variant: ShortcutCardVariant,
  density: ShortcutLayoutDensity = 'regular',
): number {
  if (variant === 'compact') {
    if (density === 'compact') return 9;
    if (density === 'large') return 10;
    return 9;
  }
  if (density === 'compact') return 4;
  if (density === 'large') return 5;
  return 4;
}
