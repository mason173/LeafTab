export const SHORTCUT_CARD_VARIANTS = ['default', 'compact'] as const;

export type ShortcutCardVariant = (typeof SHORTCUT_CARD_VARIANTS)[number];

export const DEFAULT_SHORTCUT_CARD_VARIANT: ShortcutCardVariant = 'default';

export function parseShortcutCardVariant(value: string | null | undefined): ShortcutCardVariant {
  if (value === 'default') return 'default';
  if (value === 'compact') return 'compact';
  return DEFAULT_SHORTCUT_CARD_VARIANT;
}

export function getShortcutColumns(variant: ShortcutCardVariant): number {
  return variant === 'compact' ? 9 : 4;
}
