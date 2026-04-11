import { describe, expect, it } from 'vitest';
import {
  hexToShortcutIconHsl,
  normalizeShortcutIconHsl,
  shortcutIconHslToHex,
} from '@/utils/shortcutColorHsl';

describe('shortcutColorHsl', () => {
  it('converts hex colors into editable HSL slider values', () => {
    expect(hexToShortcutIconHsl('#F4E300')).toEqual({
      hue: 56,
      saturation: 100,
      lightness: 48,
    });
    expect(hexToShortcutIconHsl('#12ab90ff')).toEqual({
      hue: 169,
      saturation: 81,
      lightness: 37,
    });
  });

  it('converts slider values back into uppercase hex', () => {
    expect(shortcutIconHslToHex({
      hue: 210,
      saturation: 70,
      lightness: 56,
    })).toBe('#408FDD');
  });

  it('clamps slider values into the supported ranges', () => {
    expect(normalizeShortcutIconHsl({
      hue: 420,
      saturation: -10,
      lightness: 120,
    })).toEqual({
      hue: 360,
      saturation: 0,
      lightness: 100,
    });
  });
});
