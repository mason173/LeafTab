import { describe, expect, it } from 'vitest';
import { resolveDrawerAlphabetRailLayout } from '@/components/home/drawerAlphabetRailLayout';

describe('drawerAlphabetRailLayout', () => {
  it('docks the alphabet rail outside the drawer content when the viewport has enough gutter', () => {
    expect(resolveDrawerAlphabetRailLayout({
      contentWidth: 1000,
      viewportWidth: 1440,
    })).toEqual({
      dockOutside: true,
      railRightOffsetPx: -62,
    });
  });

  it('refuses to dock the alphabet rail when that would overlap the shortcut grid', () => {
    expect(resolveDrawerAlphabetRailLayout({
      contentWidth: 920,
      viewportWidth: 980,
    })).toEqual({
      dockOutside: false,
      railRightOffsetPx: 0,
    });
  });
});
