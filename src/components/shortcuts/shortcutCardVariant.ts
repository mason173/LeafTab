export const SHORTCUT_CARD_VARIANTS = ['default', 'compact'] as const;

export type ShortcutCardVariant = (typeof SHORTCUT_CARD_VARIANTS)[number];
export type ShortcutLayoutDensity = 'compact' | 'regular' | 'large';

export const DEFAULT_SHORTCUT_CARD_VARIANT: ShortcutCardVariant = 'compact';

export function parseShortcutCardVariant(value: string | null | undefined): ShortcutCardVariant {
  // The rich/default card variant stays in the codebase for legacy rendering paths,
  // but user-facing configuration is now compact-only.
  if (value === 'compact') return 'compact';
  return DEFAULT_SHORTCUT_CARD_VARIANT;
}

export function getShortcutColumns(
  variant: ShortcutCardVariant,
  density: ShortcutLayoutDensity = 'regular',
): number {
  void density;
  return variant === 'compact' ? 9 : 4;
}

export function getShortcutColumnBounds(variant: ShortcutCardVariant): { min: number; max: number } {
  if (variant === 'compact') {
    return { min: 5, max: 10 };
  }
  return { min: 2, max: 6 };
}

export function clampShortcutGridColumns(
  value: number,
  variant: ShortcutCardVariant,
  density: ShortcutLayoutDensity = 'regular',
): number {
  if (!Number.isFinite(value)) return getShortcutColumns(variant, density);
  const { min, max } = getShortcutColumnBounds(variant);
  return Math.min(max, Math.max(min, Math.floor(value)));
}
