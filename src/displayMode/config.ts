export type DisplayMode = 'panoramic' | 'fresh' | 'minimalist';

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
    value: 'panoramic',
    labelKey: 'settings.displayMode.panoramic',
    descriptionKey: 'settings.displayMode.panoramicDesc',
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
  forceWhiteSearchTheme: boolean;
  searchUsesBlankStyle: boolean;
};

export const getDisplayModeLayoutFlags = (mode: DisplayMode): DisplayModeLayoutFlags => {
  const isPanoramic = mode === 'panoramic';
  const isRhythm = mode === 'fresh';
  const isBlank = mode === 'minimalist';
  return {
    showHeroWallpaperClock: isPanoramic,
    showOverlayBackground: !isPanoramic,
    showInlineTopNav: !isPanoramic,
    showFloatingScenarioMenu: isRhythm,
    showFloatingWallpaperSelector: !isPanoramic,
    showShortcuts: !isBlank,
    forceWhiteSearchTheme: !isPanoramic,
    searchUsesBlankStyle: isBlank,
  };
};

export const shouldShowTimeDetailControls = (mode: DisplayMode, showTime: boolean): boolean =>
  mode === 'panoramic' || showTime;
