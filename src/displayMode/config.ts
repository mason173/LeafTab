export type DisplayMode = 'fresh' | 'minimalist';
export const DEFAULT_DISPLAY_MODE: DisplayMode = 'fresh';

export type DisplayModeOption = {
  value: DisplayMode;
  labelKey: string;
  descriptionKey: string;
};

export const DISPLAY_MODE_OPTIONS: DisplayModeOption[] = [
  {
    value: 'fresh',
    labelKey: 'settings.displayMode.rhythm',
    descriptionKey: 'settings.displayMode.rhythmDesc',
  },
  {
    value: 'minimalist',
    labelKey: 'settings.displayMode.blank',
    descriptionKey: 'settings.displayMode.blankDesc',
  },
];

export type DisplayModeLayoutFlags = {
  showHeroWallpaperClock: boolean;
  showOverlayBackground: boolean;
  showInlineTopNav: boolean;
  showFloatingScenarioMenu: boolean;
  showFloatingWallpaperSelector: boolean;
  showShortcuts: boolean;
  revealShortcutsOnDrawerExpand: boolean;
  forceWhiteSearchTheme: boolean;
  searchUsesBlankStyle: boolean;
};

export const normalizeDisplayMode = (value: unknown): DisplayMode | null => {
  if (value === 'fresh' || value === 'minimalist') {
    return value;
  }
  if (value === 'panoramic') {
    return DEFAULT_DISPLAY_MODE;
  }
  return null;
};

export const getDisplayModeLayoutFlags = (mode: DisplayMode): DisplayModeLayoutFlags => {
  const isRhythm = mode === 'fresh';
  const isBlank = mode === 'minimalist';
  return {
    showHeroWallpaperClock: false,
    showOverlayBackground: true,
    showInlineTopNav: true,
    showFloatingScenarioMenu: isRhythm,
    showFloatingWallpaperSelector: true,
    showShortcuts: !isBlank,
    revealShortcutsOnDrawerExpand: isBlank,
    forceWhiteSearchTheme: true,
    searchUsesBlankStyle: isBlank,
  };
};

export const shouldShowTimeDetailControls = (_mode: DisplayMode, showTime: boolean): boolean =>
  showTime;
