import { DEFAULT_SHORTCUT_CARD_VARIANT, getShortcutColumns, parseShortcutCardVariant, type ShortcutCardVariant } from '@/components/shortcuts/shortcutCardVariant';
import type { DisplayMode } from '@/displayMode/config';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import type { VisualEffectsLevel } from '@/hooks/useVisualEffectsPolicy';
import { getDefaultSearchEngineForPlatform, normalizeSearchEngineForPlatform } from '@/platform/search';
import type { SearchEngine, SyncablePreferences, SyncableWallpaperMode, WeatherManualLocation } from '@/types';
import { DEFAULT_COLOR_WALLPAPER_ID } from '@/components/wallpaper/colorWallpapers';
import { clampShortcutGridColumns } from '@/components/shortcuts/shortcutCardVariant';
import {
  clampShortcutIconCornerRadius,
  DEFAULT_SHORTCUT_ICON_APPEARANCE,
  DEFAULT_SHORTCUT_ICON_CORNER_RADIUS,
  DEFAULT_SHORTCUT_ICON_SCALE,
  normalizeShortcutIconAppearance,
  SHORTCUT_ICON_APPEARANCE_KEY,
  SHORTCUT_ICON_CORNER_RADIUS_KEY,
  SHORTCUT_ICON_SCALE_KEY,
  clampShortcutIconScale,
} from '@/utils/shortcutIconSettings';

const SHORTCUT_GRID_COLUMNS_LEGACY_KEY = 'shortcutGridColumns';
const SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY = 'shortcutGridColumnsByVariant';
const SEARCH_TAB_SWITCH_ENGINE_KEY = 'search_tab_switch_engine';
const SEARCH_PREFIX_ENABLED_KEY = 'search_prefix_enabled';
const SEARCH_SITE_DIRECT_ENABLED_KEY = 'search_site_direct_enabled';
const SEARCH_SITE_SHORTCUT_ENABLED_KEY = 'search_site_shortcut_enabled';
const SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY = 'search_any_key_capture_enabled';
const SEARCH_CALCULATOR_ENABLED_KEY = 'search_calculator_enabled';
const SEARCH_ROTATING_PLACEHOLDER_ENABLED_KEY = 'search_rotating_placeholder_enabled';
const PREVENT_DUPLICATE_NEWTAB_KEY = 'leaftab_prevent_duplicate_newtab';
const SHOW_DATE_KEY = 'showDate';
const SHOW_WEEKDAY_KEY = 'showWeekday';
const SHOW_LUNAR_KEY = 'showLunar';
const TIME_ANIMATION_MODE_KEY = 'time_animation_mode';
const VISUAL_EFFECTS_LEVEL_KEY = 'visual_effects_level';
const REDUCE_VISUAL_EFFECTS_KEY = 'reduce_visual_effects';
const SEARCH_ENGINE_KEY = 'search_engine';
const THEME_KEY = 'theme';
const LANGUAGE_KEY = 'i18nextLng';
const ACCENT_COLOR_KEY = 'accentColor';
const WALLPAPER_MODE_KEY = 'wallpaperMode';
const WALLPAPER_MASK_OPACITY_KEY = 'wallpaperMaskOpacity';
const WALLPAPER_AUTO_DIM_KEY = 'darkModeAutoDimWallpaperEnabled';
const COLOR_WALLPAPER_ID_KEY = 'colorWallpaperId';
const MANUAL_LOCATION_KEY = 'weather_manual_location_v3';

export const SYNCABLE_PREFERENCES_APPLIED_EVENT = 'leaftab-syncable-preferences-applied';

const readStoredBoolean = (key: string, defaultValue: boolean): boolean => {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw) === true;
  } catch {
    return raw === 'true';
  }
};

const readNullableBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  return null;
};

const readInitialDisplayMode = (): DisplayMode => {
  const storedDisplayMode = localStorage.getItem('displayMode');
  if (storedDisplayMode === 'panoramic' || storedDisplayMode === 'minimalist' || storedDisplayMode === 'fresh') {
    return storedDisplayMode;
  }
  const storedMinimalistMode = readStoredBoolean('minimalistMode', false);
  const storedFreshMode = readStoredBoolean('freshMode', false);
  if (storedMinimalistMode) return 'minimalist';
  if (storedFreshMode) return 'fresh';
  return 'panoramic';
};

const readTimeAnimationMode = (): TimeAnimationMode => {
  const stored = (localStorage.getItem(TIME_ANIMATION_MODE_KEY) || '').trim();
  if (stored === 'inherit' || stored === 'on' || stored === 'off') return stored;

  const legacyRaw = localStorage.getItem('time_animation_enabled');
  if (legacyRaw !== null) {
    try {
      return JSON.parse(legacyRaw) === false ? 'off' : 'on';
    } catch {
      return legacyRaw === 'false' ? 'off' : 'on';
    }
  }

  return 'on';
};

const readVisualEffectsLevel = (): VisualEffectsLevel => {
  const stored = (localStorage.getItem(VISUAL_EFFECTS_LEVEL_KEY) || '').trim();
  if (stored === 'low' || stored === 'medium' || stored === 'high') return stored;
  return readStoredBoolean(REDUCE_VISUAL_EFFECTS_KEY, false) ? 'low' : 'high';
};

const normalizeWallpaperMode = (value: unknown): SyncableWallpaperMode => {
  return value === 'bing' || value === 'weather' || value === 'color'
    ? value
    : null;
};

const normalizeSearchEngine = (value: unknown): SearchEngine => {
  if (value === 'system' || value === 'google' || value === 'bing' || value === 'duckduckgo' || value === 'baidu') {
    return normalizeSearchEngineForPlatform(value);
  }
  return getDefaultSearchEngineForPlatform();
};

const normalizeManualLocation = (value: unknown): WeatherManualLocation | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const city = typeof (value as { city?: unknown }).city === 'string'
    ? (value as { city: string }).city.trim()
    : '';
  if (!city) return null;
  const latitude = Number((value as { latitude?: unknown }).latitude);
  const longitude = Number((value as { longitude?: unknown }).longitude);
  return {
    city,
    ...(Number.isFinite(latitude) ? { latitude } : {}),
    ...(Number.isFinite(longitude) ? { longitude } : {}),
  };
};

export const getDefaultShortcutGridColumnsByVariant = (): Record<ShortcutCardVariant, number> => ({
  compact: getShortcutColumns(),
});

export const readShortcutGridColumnsByVariantFromStorage = (): Record<ShortcutCardVariant, number> => {
  const defaults = getDefaultShortcutGridColumnsByVariant();
  try {
    const raw = localStorage.getItem(SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem(SHORTCUT_GRID_COLUMNS_LEGACY_KEY);
      const legacyValue = Number(legacyRaw);
      if (Number.isFinite(legacyValue)) {
        return {
          ...defaults,
          compact: clampShortcutGridColumns(legacyValue),
        };
      }
      return defaults;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const compactValue = Number(parsed.compact);
    const legacyDefaultValue = Number(parsed.default);
    return {
      compact: clampShortcutGridColumns(
        Number.isFinite(compactValue) ? compactValue : legacyDefaultValue,
      ),
    };
  } catch {
    return defaults;
  }
};

export const getDefaultSyncablePreferences = (): SyncablePreferences => ({
  displayMode: 'panoramic',
  openInNewTab: true,
  searchTabSwitchEngine: true,
  searchPrefixEnabled: true,
  searchSiteDirectEnabled: true,
  searchSiteShortcutEnabled: true,
  searchAnyKeyCaptureEnabled: true,
  searchCalculatorEnabled: true,
  searchRotatingPlaceholderEnabled: true,
  searchEngine: getDefaultSearchEngineForPlatform(),
  preventDuplicateNewTab: false,
  is24Hour: true,
  showDate: true,
  showWeekday: true,
  showLunar: true,
  timeAnimationMode: 'on',
  timeFont: 'Pacifico',
  showSeconds: true,
  visualEffectsLevel: 'high',
  showTime: true,
  shortcutCardVariant: DEFAULT_SHORTCUT_CARD_VARIANT,
  shortcutCompactShowTitle: true,
  shortcutGridColumnsByVariant: getDefaultShortcutGridColumnsByVariant(),
  shortcutIconAppearance: DEFAULT_SHORTCUT_ICON_APPEARANCE,
  shortcutIconCornerRadius: DEFAULT_SHORTCUT_ICON_CORNER_RADIUS,
  shortcutIconScale: DEFAULT_SHORTCUT_ICON_SCALE,
  privacyConsent: null,
  theme: 'system',
  language: 'zh',
  accentColor: 'green',
  wallpaperMode: null,
  wallpaperMaskOpacity: 10,
  darkModeAutoDimWallpaperEnabled: true,
  colorWallpaperId: DEFAULT_COLOR_WALLPAPER_ID,
  weatherManualLocation: null,
});

export const normalizeSyncablePreferences = (
  raw: unknown,
): SyncablePreferences => {
  const defaults = getDefaultSyncablePreferences();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const candidate = raw as Partial<SyncablePreferences>;
  const shortcutGridColumnsByVariant = candidate.shortcutGridColumnsByVariant || {};
  const compactColumns = Number(
    shortcutGridColumnsByVariant.compact
    ?? (shortcutGridColumnsByVariant as Record<string, unknown>).default,
  );

  return {
    displayMode: candidate.displayMode === 'minimalist' || candidate.displayMode === 'fresh' || candidate.displayMode === 'panoramic'
      ? candidate.displayMode
      : defaults.displayMode,
    openInNewTab: typeof candidate.openInNewTab === 'boolean' ? candidate.openInNewTab : defaults.openInNewTab,
    searchTabSwitchEngine: typeof candidate.searchTabSwitchEngine === 'boolean' ? candidate.searchTabSwitchEngine : defaults.searchTabSwitchEngine,
    searchPrefixEnabled: typeof candidate.searchPrefixEnabled === 'boolean' ? candidate.searchPrefixEnabled : defaults.searchPrefixEnabled,
    searchSiteDirectEnabled: typeof candidate.searchSiteDirectEnabled === 'boolean' ? candidate.searchSiteDirectEnabled : defaults.searchSiteDirectEnabled,
    searchSiteShortcutEnabled: typeof candidate.searchSiteShortcutEnabled === 'boolean' ? candidate.searchSiteShortcutEnabled : defaults.searchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled: typeof candidate.searchAnyKeyCaptureEnabled === 'boolean' ? candidate.searchAnyKeyCaptureEnabled : defaults.searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled: typeof candidate.searchCalculatorEnabled === 'boolean' ? candidate.searchCalculatorEnabled : defaults.searchCalculatorEnabled,
    searchRotatingPlaceholderEnabled: typeof candidate.searchRotatingPlaceholderEnabled === 'boolean' ? candidate.searchRotatingPlaceholderEnabled : defaults.searchRotatingPlaceholderEnabled,
    searchEngine: normalizeSearchEngine(candidate.searchEngine),
    preventDuplicateNewTab: typeof candidate.preventDuplicateNewTab === 'boolean' ? candidate.preventDuplicateNewTab : defaults.preventDuplicateNewTab,
    is24Hour: typeof candidate.is24Hour === 'boolean' ? candidate.is24Hour : defaults.is24Hour,
    showDate: typeof candidate.showDate === 'boolean' ? candidate.showDate : defaults.showDate,
    showWeekday: typeof candidate.showWeekday === 'boolean' ? candidate.showWeekday : defaults.showWeekday,
    showLunar: typeof candidate.showLunar === 'boolean' ? candidate.showLunar : defaults.showLunar,
    timeAnimationMode: candidate.timeAnimationMode === 'on' || candidate.timeAnimationMode === 'off' || candidate.timeAnimationMode === 'inherit'
      ? candidate.timeAnimationMode
      : defaults.timeAnimationMode,
    timeFont: typeof candidate.timeFont === 'string' && candidate.timeFont.trim()
      ? candidate.timeFont
      : defaults.timeFont,
    showSeconds: typeof candidate.showSeconds === 'boolean' ? candidate.showSeconds : defaults.showSeconds,
    visualEffectsLevel: candidate.visualEffectsLevel === 'low' || candidate.visualEffectsLevel === 'medium' || candidate.visualEffectsLevel === 'high'
      ? candidate.visualEffectsLevel
      : defaults.visualEffectsLevel,
    showTime: typeof candidate.showTime === 'boolean' ? candidate.showTime : defaults.showTime,
    shortcutCardVariant: parseShortcutCardVariant(candidate.shortcutCardVariant),
    shortcutCompactShowTitle: typeof candidate.shortcutCompactShowTitle === 'boolean'
      ? candidate.shortcutCompactShowTitle
      : defaults.shortcutCompactShowTitle,
    shortcutGridColumnsByVariant: {
      compact: clampShortcutGridColumns(compactColumns),
    },
    shortcutIconAppearance: normalizeShortcutIconAppearance(candidate.shortcutIconAppearance),
    shortcutIconCornerRadius: clampShortcutIconCornerRadius(candidate.shortcutIconCornerRadius),
    shortcutIconScale: clampShortcutIconScale(candidate.shortcutIconScale),
    privacyConsent: readNullableBoolean(candidate.privacyConsent),
    theme: candidate.theme === 'light' || candidate.theme === 'dark' || candidate.theme === 'system'
      ? candidate.theme
      : defaults.theme,
    language: typeof candidate.language === 'string' && candidate.language.trim()
      ? candidate.language
      : defaults.language,
    accentColor: typeof candidate.accentColor === 'string' && candidate.accentColor.trim()
      ? candidate.accentColor
      : defaults.accentColor,
    wallpaperMode: normalizeWallpaperMode(candidate.wallpaperMode),
    wallpaperMaskOpacity: Math.max(0, Math.min(100, Number(candidate.wallpaperMaskOpacity ?? defaults.wallpaperMaskOpacity) || defaults.wallpaperMaskOpacity)),
    darkModeAutoDimWallpaperEnabled: typeof candidate.darkModeAutoDimWallpaperEnabled === 'boolean'
      ? candidate.darkModeAutoDimWallpaperEnabled
      : defaults.darkModeAutoDimWallpaperEnabled,
    colorWallpaperId: typeof candidate.colorWallpaperId === 'string' && candidate.colorWallpaperId.trim()
      ? candidate.colorWallpaperId
      : defaults.colorWallpaperId,
    weatherManualLocation: normalizeManualLocation(candidate.weatherManualLocation),
  };
};

export const readSyncablePreferencesFromStorage = (): SyncablePreferences => {
  const storedShowSeconds = localStorage.getItem('showSeconds');
  const storedShowTime = localStorage.getItem('showTime');
  const storedPrivacyConsent = localStorage.getItem('privacy_consent');
  const storedShortcutCompactShowTitle = localStorage.getItem('shortcutCompactShowTitle');
  let privacyConsent: boolean | null = null;
  if (storedPrivacyConsent !== null) {
    try {
      const parsed = JSON.parse(storedPrivacyConsent);
      privacyConsent = typeof parsed === 'boolean' ? parsed : null;
    } catch {
      privacyConsent = null;
    }
  }

  let manualLocation: WeatherManualLocation | null = null;
  try {
    manualLocation = normalizeManualLocation(JSON.parse(localStorage.getItem(MANUAL_LOCATION_KEY) || 'null'));
  } catch {
    manualLocation = null;
  }

  return normalizeSyncablePreferences({
    displayMode: readInitialDisplayMode(),
    openInNewTab: readStoredBoolean('openInNewTab', true),
    searchTabSwitchEngine: readStoredBoolean(SEARCH_TAB_SWITCH_ENGINE_KEY, true),
    searchPrefixEnabled: readStoredBoolean(SEARCH_PREFIX_ENABLED_KEY, true),
    searchSiteDirectEnabled: readStoredBoolean(SEARCH_SITE_DIRECT_ENABLED_KEY, true),
    searchSiteShortcutEnabled: readStoredBoolean(SEARCH_SITE_SHORTCUT_ENABLED_KEY, true),
    searchAnyKeyCaptureEnabled: readStoredBoolean(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, true),
    searchCalculatorEnabled: readStoredBoolean(SEARCH_CALCULATOR_ENABLED_KEY, true),
    searchRotatingPlaceholderEnabled: readStoredBoolean(SEARCH_ROTATING_PLACEHOLDER_ENABLED_KEY, true),
    searchEngine: normalizeSearchEngine(localStorage.getItem(SEARCH_ENGINE_KEY)),
    preventDuplicateNewTab: readStoredBoolean(PREVENT_DUPLICATE_NEWTAB_KEY, false),
    is24Hour: readStoredBoolean('is24Hour', true),
    showDate: readStoredBoolean(SHOW_DATE_KEY, true),
    showWeekday: readStoredBoolean(SHOW_WEEKDAY_KEY, true),
    showLunar: readStoredBoolean(SHOW_LUNAR_KEY, true),
    timeAnimationMode: readTimeAnimationMode(),
    timeFont: localStorage.getItem('time_font') || 'Pacifico',
    showSeconds: storedShowSeconds === null ? true : readStoredBoolean('showSeconds', true),
    visualEffectsLevel: readVisualEffectsLevel(),
    showTime: storedShowTime === null ? true : readStoredBoolean('showTime', true),
    shortcutCardVariant: parseShortcutCardVariant(localStorage.getItem('shortcutCardVariant')),
    shortcutCompactShowTitle: storedShortcutCompactShowTitle === null ? true : storedShortcutCompactShowTitle === 'true',
    shortcutGridColumnsByVariant: readShortcutGridColumnsByVariantFromStorage(),
    shortcutIconAppearance: normalizeShortcutIconAppearance(localStorage.getItem(SHORTCUT_ICON_APPEARANCE_KEY)),
    shortcutIconCornerRadius: clampShortcutIconCornerRadius(localStorage.getItem(SHORTCUT_ICON_CORNER_RADIUS_KEY)),
    shortcutIconScale: clampShortcutIconScale(localStorage.getItem(SHORTCUT_ICON_SCALE_KEY)),
    privacyConsent,
    theme: ((localStorage.getItem(THEME_KEY) || 'system').trim() as SyncablePreferences['theme']),
    language: (localStorage.getItem(LANGUAGE_KEY) || 'zh').trim() || 'zh',
    accentColor: (localStorage.getItem(ACCENT_COLOR_KEY) || 'green').trim() || 'green',
    wallpaperMode: normalizeWallpaperMode(localStorage.getItem(WALLPAPER_MODE_KEY)),
    wallpaperMaskOpacity: Number(localStorage.getItem(WALLPAPER_MASK_OPACITY_KEY) || '10'),
    darkModeAutoDimWallpaperEnabled: readStoredBoolean(WALLPAPER_AUTO_DIM_KEY, true),
    colorWallpaperId: localStorage.getItem(COLOR_WALLPAPER_ID_KEY) || DEFAULT_COLOR_WALLPAPER_ID,
    weatherManualLocation: manualLocation,
  });
};

export const writeSyncablePreferencesToStorage = (preferences: SyncablePreferences) => {
  const normalized = normalizeSyncablePreferences(preferences);
  localStorage.setItem('displayMode', normalized.displayMode);
  localStorage.setItem('openInNewTab', JSON.stringify(normalized.openInNewTab));
  localStorage.setItem(SEARCH_TAB_SWITCH_ENGINE_KEY, JSON.stringify(normalized.searchTabSwitchEngine));
  localStorage.setItem(SEARCH_PREFIX_ENABLED_KEY, JSON.stringify(normalized.searchPrefixEnabled));
  localStorage.setItem(SEARCH_SITE_DIRECT_ENABLED_KEY, JSON.stringify(normalized.searchSiteDirectEnabled));
  localStorage.setItem(SEARCH_SITE_SHORTCUT_ENABLED_KEY, JSON.stringify(normalized.searchSiteShortcutEnabled));
  localStorage.setItem(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, JSON.stringify(normalized.searchAnyKeyCaptureEnabled));
  localStorage.setItem(SEARCH_CALCULATOR_ENABLED_KEY, JSON.stringify(normalized.searchCalculatorEnabled));
  localStorage.setItem(SEARCH_ROTATING_PLACEHOLDER_ENABLED_KEY, JSON.stringify(normalized.searchRotatingPlaceholderEnabled));
  localStorage.setItem(SEARCH_ENGINE_KEY, normalized.searchEngine);
  localStorage.setItem(PREVENT_DUPLICATE_NEWTAB_KEY, JSON.stringify(normalized.preventDuplicateNewTab));
  localStorage.setItem('is24Hour', JSON.stringify(normalized.is24Hour));
  localStorage.setItem(SHOW_DATE_KEY, JSON.stringify(normalized.showDate));
  localStorage.setItem(SHOW_WEEKDAY_KEY, JSON.stringify(normalized.showWeekday));
  localStorage.setItem(SHOW_LUNAR_KEY, JSON.stringify(normalized.showLunar));
  localStorage.setItem(TIME_ANIMATION_MODE_KEY, normalized.timeAnimationMode);
  localStorage.removeItem('time_animation_enabled');
  localStorage.setItem('time_font', normalized.timeFont);
  localStorage.setItem('showSeconds', JSON.stringify(normalized.showSeconds));
  localStorage.setItem(VISUAL_EFFECTS_LEVEL_KEY, normalized.visualEffectsLevel);
  localStorage.removeItem(REDUCE_VISUAL_EFFECTS_KEY);
  localStorage.setItem('showTime', JSON.stringify(normalized.showTime));
  localStorage.setItem('shortcutCardVariant', DEFAULT_SHORTCUT_CARD_VARIANT);
  localStorage.setItem('shortcutCompactShowTitle', String(normalized.shortcutCompactShowTitle));
  localStorage.setItem(
    SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY,
    JSON.stringify(normalized.shortcutGridColumnsByVariant),
  );
  localStorage.setItem(SHORTCUT_ICON_APPEARANCE_KEY, normalized.shortcutIconAppearance);
  localStorage.setItem(SHORTCUT_ICON_CORNER_RADIUS_KEY, String(normalized.shortcutIconCornerRadius));
  localStorage.setItem(SHORTCUT_ICON_SCALE_KEY, String(normalized.shortcutIconScale));
  localStorage.setItem(
    SHORTCUT_GRID_COLUMNS_LEGACY_KEY,
    String(normalized.shortcutGridColumnsByVariant.compact),
  );
  localStorage.removeItem('shortcutsRowsPerColumn');
  if (normalized.privacyConsent === null) {
    localStorage.removeItem('privacy_consent');
  } else {
    localStorage.setItem('privacy_consent', JSON.stringify(normalized.privacyConsent));
  }
  localStorage.setItem(THEME_KEY, normalized.theme);
  localStorage.setItem(LANGUAGE_KEY, normalized.language);
  localStorage.setItem(ACCENT_COLOR_KEY, normalized.accentColor);
  if (normalized.wallpaperMode) {
    localStorage.setItem(WALLPAPER_MODE_KEY, normalized.wallpaperMode);
  }
  localStorage.setItem(WALLPAPER_MASK_OPACITY_KEY, String(normalized.wallpaperMaskOpacity));
  localStorage.setItem(WALLPAPER_AUTO_DIM_KEY, String(normalized.darkModeAutoDimWallpaperEnabled));
  localStorage.setItem(COLOR_WALLPAPER_ID_KEY, normalized.colorWallpaperId);
  if (normalized.weatherManualLocation) {
    localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify({
      ...normalized.weatherManualLocation,
      updatedAt: Date.now(),
    }));
  } else {
    localStorage.removeItem(MANUAL_LOCATION_KEY);
  }
};

export const emitSyncablePreferencesApplied = (preferences: SyncablePreferences) => {
  window.dispatchEvent(new CustomEvent(SYNCABLE_PREFERENCES_APPLIED_EVENT, {
    detail: {
      preferences: normalizeSyncablePreferences(preferences),
    },
  }));
};
