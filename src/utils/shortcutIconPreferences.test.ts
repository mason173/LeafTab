import { describe, expect, it } from 'vitest';
import {
  LEGACY_SHORTCUT_ICON_COLOR,
  getPersistedShortcutIconColor,
  getShortcutIconColor,
  normalizeShortcutIconColor,
  resolveShortcutIconColor,
} from '@/utils/shortcutIconPreferences';

describe('normalizeShortcutIconColor', () => {
  it('keeps palette colors stable regardless of input case', () => {
    expect(normalizeShortcutIconColor('#f4e300')).toBe('#F4E300');
    expect(normalizeShortcutIconColor('#F4E300')).toBe('#F4E300');
  });

  it('accepts custom hex colors and normalizes to uppercase', () => {
    expect(normalizeShortcutIconColor('#abc')).toBe('#ABC');
    expect(normalizeShortcutIconColor('#12ab90')).toBe('#12AB90');
    expect(normalizeShortcutIconColor('#12ab90ff')).toBe('#12AB90FF');
  });

  it('rejects unsupported color formats', () => {
    expect(normalizeShortcutIconColor('rgb(0,0,0)')).toBe('');
    expect(normalizeShortcutIconColor('blue')).toBe('');
    expect(normalizeShortcutIconColor('#12ab9')).toBe('');
  });

  it('uses fixed legacy color when color is missing', () => {
    expect(normalizeShortcutIconColor('')).toBe('');
    expect(resolveShortcutIconColor('')).toBe(LEGACY_SHORTCUT_ICON_COLOR);
    expect(getShortcutIconColor('seed-a', '')).toBe(LEGACY_SHORTCUT_ICON_COLOR);
    expect(getShortcutIconColor('seed-b', null)).toBe(LEGACY_SHORTCUT_ICON_COLOR);
    expect(getPersistedShortcutIconColor('any-seed')).toBe('');
  });
});
