import type { ShortcutIconAppearance } from '@/types';

export const SHORTCUT_ICON_APPEARANCE_KEY = 'shortcutIconAppearance';
export const SHORTCUT_ICON_CORNER_RADIUS_KEY = 'shortcutIconCornerRadius';
export const SHORTCUT_ICON_SCALE_KEY = 'shortcutIconScale';

export const DEFAULT_SHORTCUT_ICON_APPEARANCE: ShortcutIconAppearance = 'colorful';
export const MIN_SHORTCUT_ICON_CORNER_RADIUS = 0;
export const MAX_SHORTCUT_ICON_CORNER_RADIUS = 50;
export const DEFAULT_SHORTCUT_ICON_CORNER_RADIUS = 33;
export const MIN_SHORTCUT_ICON_SCALE = 80;
export const MAX_SHORTCUT_ICON_SCALE = 120;
export const DEFAULT_SHORTCUT_ICON_SCALE = 100;

export const normalizeShortcutIconAppearance = (value: unknown): ShortcutIconAppearance => {
  return value === 'monochrome' || value === 'accent'
    ? value
    : DEFAULT_SHORTCUT_ICON_APPEARANCE;
};

export const clampShortcutIconCornerRadius = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SHORTCUT_ICON_CORNER_RADIUS;
  return Math.max(
    MIN_SHORTCUT_ICON_CORNER_RADIUS,
    Math.min(MAX_SHORTCUT_ICON_CORNER_RADIUS, Math.round(numeric)),
  );
};

export const getShortcutIconBorderRadius = (cornerRadius: unknown) => {
  return `${clampShortcutIconCornerRadius(cornerRadius)}%`;
};

export const clampShortcutIconScale = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SHORTCUT_ICON_SCALE;
  return Math.max(
    MIN_SHORTCUT_ICON_SCALE,
    Math.min(MAX_SHORTCUT_ICON_SCALE, Math.round(numeric)),
  );
};

export const scaleShortcutIconSize = (baseSize: number, scale: unknown) => {
  const normalizedScale = clampShortcutIconScale(scale);
  return Math.max(16, Math.round(baseSize * normalizedScale / 100));
};
