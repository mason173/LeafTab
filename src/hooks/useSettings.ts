import { useState, useEffect } from 'react';
import { loadGoogleFont } from '../utils/googleFonts';
import { clampShortcutsRowsPerColumn } from '../utils/backupData';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';
import {
  clampShortcutGridColumns,
  getShortcutColumns,
  parseShortcutCardVariant,
  type ShortcutCardVariant,
} from '@/components/shortcuts/shortcutCardVariant';
import { type DisplayMode } from '@/displayMode/config';
import type { VisualEffectsLevel } from '@/hooks/useVisualEffectsPolicy';
import {
  queueLocalStorageRemoveItem,
  queueLocalStorageSetItem,
} from '@/utils/storageWriteQueue';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

export type TimeAnimationMode = 'inherit' | 'on' | 'off';

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

function readInitialDisplayMode(): DisplayMode {
  const storedDisplayMode = localStorage.getItem('displayMode');
  if (storedDisplayMode === 'panoramic' || storedDisplayMode === 'minimalist' || storedDisplayMode === 'fresh') {
    return storedDisplayMode;
  }
  const parseStoredBoolean = (value: string | null): boolean => {
    if (value === null) return false;
    try {
      return JSON.parse(value) === true;
    } catch {
      return value === 'true';
    }
  };
  const storedMinimalistMode = parseStoredBoolean(localStorage.getItem('minimalistMode'));
  const storedFreshMode = parseStoredBoolean(localStorage.getItem('freshMode'));
  if (storedMinimalistMode) return 'minimalist';
  if (storedFreshMode) return 'fresh';
  return 'panoramic';
}

function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw) === true;
  } catch {
    return raw === 'true';
  }
}

function readVisualEffectsLevel(): VisualEffectsLevel {
  if (isFirefoxBuildTarget()) return 'low';

  const stored = (localStorage.getItem(VISUAL_EFFECTS_LEVEL_KEY) || '').trim();
  if (stored === 'low' || stored === 'medium' || stored === 'high') return stored;
  const legacyReduced = readStoredBoolean(REDUCE_VISUAL_EFFECTS_KEY, false);
  if (legacyReduced) return 'low';
  return 'high';
}

function readTimeAnimationMode(): TimeAnimationMode {
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
}

function readShortcutGridColumnsByVariant(): Partial<Record<ShortcutCardVariant, number>> {
  try {
    const raw = localStorage.getItem(SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const next: Partial<Record<ShortcutCardVariant, number>> = {};
    for (const variant of ['default', 'compact'] as const) {
      const value = Number((parsed as Record<string, unknown>)[variant]);
      if (Number.isFinite(value)) {
        next[variant] = clampShortcutGridColumns(value, variant);
      }
    }
    return next;
  } catch {
    return {};
  }
}

function writeShortcutGridColumnsByVariant(map: Partial<Record<ShortcutCardVariant, number>>) {
  try {
    localStorage.setItem(SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY, JSON.stringify(map));
  } catch {}
}

function readShortcutGridColumns(variant: ShortcutCardVariant): number {
  const byVariant = readShortcutGridColumnsByVariant();
  const variantValue = byVariant[variant];
  if (Number.isFinite(variantValue)) {
    return clampShortcutGridColumns(variantValue as number, variant);
  }
  const raw = localStorage.getItem(SHORTCUT_GRID_COLUMNS_LEGACY_KEY);
  const parsed = raw === null ? Number.NaN : Number(raw);
  if (Number.isFinite(parsed)) return clampShortcutGridColumns(parsed, variant);
  return getShortcutColumns(variant);
}

export function useSettings() {
  const firefox = isFirefoxBuildTarget();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => readInitialDisplayMode());
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [tabSwitchSearchEngine, setTabSwitchSearchEngine] = useState<boolean>(() => readStoredBoolean(SEARCH_TAB_SWITCH_ENGINE_KEY, true));
  const [searchPrefixEnabled, setSearchPrefixEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_PREFIX_ENABLED_KEY, true));
  const [searchSiteDirectEnabled, setSearchSiteDirectEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_SITE_DIRECT_ENABLED_KEY, true));
  const [searchSiteShortcutEnabled, setSearchSiteShortcutEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_SITE_SHORTCUT_ENABLED_KEY, true));
  const [searchAnyKeyCaptureEnabled, setSearchAnyKeyCaptureEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, true));
  const [searchCalculatorEnabled, setSearchCalculatorEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_CALCULATOR_ENABLED_KEY, true));
  const [searchRotatingPlaceholderEnabled, setSearchRotatingPlaceholderEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_ROTATING_PLACEHOLDER_ENABLED_KEY, true));
  const [preventDuplicateNewTab, setPreventDuplicateNewTab] = useState<boolean>(() => readStoredBoolean(PREVENT_DUPLICATE_NEWTAB_KEY, false));
  const [is24Hour, setIs24Hour] = useState(true);
  const [showDate, setShowDate] = useState<boolean>(() => readStoredBoolean(SHOW_DATE_KEY, true));
  const [showWeekday, setShowWeekday] = useState<boolean>(() => readStoredBoolean(SHOW_WEEKDAY_KEY, true));
  const [showLunar, setShowLunar] = useState<boolean>(() => readStoredBoolean(SHOW_LUNAR_KEY, true));
  const [timeAnimationMode, setTimeAnimationMode] = useState<TimeAnimationMode>(() => readTimeAnimationMode());
  const [timeFont, setTimeFont] = useState(localStorage.getItem('time_font') || 'Pacifico');
  const [showSeconds, setShowSeconds] = useState(() => {
    const storedShowSeconds = localStorage.getItem('showSeconds');
    if (storedShowSeconds === null) return true;
    try {
      return JSON.parse(storedShowSeconds) === true;
    } catch {
      return storedShowSeconds === 'true';
    }
  });
  const [visualEffectsLevel, setVisualEffectsLevel] = useState<VisualEffectsLevel>(() => readVisualEffectsLevel());
  const [showTime, setShowTime] = useState(true);
  const [apiServer, setApiServer] = useState<'official' | 'custom'>(() => {
    if (!ENABLE_CUSTOM_API_SERVER) return 'official';
    const stored = localStorage.getItem('leaftab_api_server');
    if (stored === 'custom' || stored === 'official') return stored;
    return 'official';
  });
  const [customApiUrl, setCustomApiUrl] = useState(() => localStorage.getItem('leaftab_custom_api_url') || '');
  const [customApiName, setCustomApiName] = useState(() => localStorage.getItem('leaftab_custom_api_name') || '');
  const [shortcutCardVariant, setShortcutCardVariant] = useState<ShortcutCardVariant>(() => {
    const stored = localStorage.getItem('shortcutCardVariant');
    return parseShortcutCardVariant(stored);
  });
  const [shortcutCompactShowTitle, setShortcutCompactShowTitle] = useState<boolean>(() => {
    const stored = localStorage.getItem('shortcutCompactShowTitle');
    if (stored === null) return true;
    return stored === 'true';
  });
  const [shortcutGridColumns, setShortcutGridColumns] = useState(() => {
    const variant = parseShortcutCardVariant(localStorage.getItem('shortcutCardVariant'));
    return readShortcutGridColumns(variant);
  });
  const [shortcutsRowsPerColumn, setShortcutsRowsPerColumn] = useState(() => {
    const stored = Number(localStorage.getItem('shortcutsRowsPerColumn') || '4');
    return clampShortcutsRowsPerColumn(stored);
  });
  const [privacyConsent, setPrivacyConsent] = useState<boolean | null>(() => {
    const stored = localStorage.getItem('privacy_consent');
    if (stored === null) return null;
    try {
      const parsed = JSON.parse(stored);
      return typeof parsed === 'boolean' ? parsed : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!firefox || visualEffectsLevel === 'low') return;
    setVisualEffectsLevel('low');
  }, [firefox, visualEffectsLevel]);

  useEffect(() => {
    loadGoogleFont(timeFont);
    queueLocalStorageSetItem('time_font', timeFont);
  }, [timeFont]);

  useEffect(() => {
    setDisplayMode(readInitialDisplayMode());
    try {
      // Legacy keys were replaced by a single displayMode source.
      localStorage.removeItem('minimalistMode');
      localStorage.removeItem('freshMode');
      // Personalization/fuzzy are now always-on system capabilities.
      localStorage.removeItem('search_personalization_enabled');
      localStorage.removeItem('search_fuzzy_match_enabled');
    } catch {}
    
    const storedOpenInNewTab = localStorage.getItem('openInNewTab');
    if (storedOpenInNewTab !== null) setOpenInNewTab(JSON.parse(storedOpenInNewTab));
    setTabSwitchSearchEngine(readStoredBoolean(SEARCH_TAB_SWITCH_ENGINE_KEY, true));
    setSearchPrefixEnabled(readStoredBoolean(SEARCH_PREFIX_ENABLED_KEY, true));
    setSearchSiteDirectEnabled(readStoredBoolean(SEARCH_SITE_DIRECT_ENABLED_KEY, true));
    setSearchSiteShortcutEnabled(readStoredBoolean(SEARCH_SITE_SHORTCUT_ENABLED_KEY, true));
    setSearchAnyKeyCaptureEnabled(readStoredBoolean(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, true));
    setSearchCalculatorEnabled(readStoredBoolean(SEARCH_CALCULATOR_ENABLED_KEY, true));
    setSearchRotatingPlaceholderEnabled(readStoredBoolean(SEARCH_ROTATING_PLACEHOLDER_ENABLED_KEY, true));
    setPreventDuplicateNewTab(readStoredBoolean(PREVENT_DUPLICATE_NEWTAB_KEY, false));
    setShowDate(readStoredBoolean(SHOW_DATE_KEY, true));
    setShowWeekday(readStoredBoolean(SHOW_WEEKDAY_KEY, true));
    setShowLunar(readStoredBoolean(SHOW_LUNAR_KEY, true));
    setTimeAnimationMode(readTimeAnimationMode());
    
    const storedIs24Hour = localStorage.getItem('is24Hour');
    if (storedIs24Hour !== null) setIs24Hour(JSON.parse(storedIs24Hour));
    
    const storedShowTime = localStorage.getItem('showTime');
    if (storedShowTime !== null) setShowTime(JSON.parse(storedShowTime));
    setVisualEffectsLevel(readVisualEffectsLevel());
    setShortcutCardVariant(parseShortcutCardVariant(localStorage.getItem('shortcutCardVariant')));
    const storedShortcutCompactShowTitle = localStorage.getItem('shortcutCompactShowTitle');
    if (storedShortcutCompactShowTitle !== null) {
      setShortcutCompactShowTitle(storedShortcutCompactShowTitle === 'true');
    }
    const nextShortcutVariant = parseShortcutCardVariant(localStorage.getItem('shortcutCardVariant'));
    setShortcutGridColumns(readShortcutGridColumns(nextShortcutVariant));
    const storedShortcutsRowsPerColumn = Number(localStorage.getItem('shortcutsRowsPerColumn') || '4');
    setShortcutsRowsPerColumn(clampShortcutsRowsPerColumn(storedShortcutsRowsPerColumn));
    
    const storedPrivacyConsent = localStorage.getItem('privacy_consent');
    if (storedPrivacyConsent !== null) {
      try {
        const parsed = JSON.parse(storedPrivacyConsent);
        setPrivacyConsent(typeof parsed === 'boolean' ? parsed : null);
      } catch {
        setPrivacyConsent(null);
      }
    }

    if (ENABLE_CUSTOM_API_SERVER) {
      const storedApiServer = localStorage.getItem('leaftab_api_server');
      if (storedApiServer === 'custom' || storedApiServer === 'official') setApiServer(storedApiServer);
    } else {
      setApiServer('official');
    }
    const storedCustomApiUrl = localStorage.getItem('leaftab_custom_api_url');
    if (storedCustomApiUrl !== null) setCustomApiUrl(storedCustomApiUrl);
    const storedCustomApiName = localStorage.getItem('leaftab_custom_api_name');
    if (storedCustomApiName !== null) setCustomApiName(storedCustomApiName);
  }, []);

  useEffect(() => {
    queueLocalStorageSetItem('displayMode', displayMode);
    queueLocalStorageSetItem('openInNewTab', JSON.stringify(openInNewTab));
    queueLocalStorageSetItem(SEARCH_TAB_SWITCH_ENGINE_KEY, JSON.stringify(tabSwitchSearchEngine));
    queueLocalStorageSetItem(SEARCH_PREFIX_ENABLED_KEY, JSON.stringify(searchPrefixEnabled));
    queueLocalStorageSetItem(SEARCH_SITE_DIRECT_ENABLED_KEY, JSON.stringify(searchSiteDirectEnabled));
    queueLocalStorageSetItem(SEARCH_SITE_SHORTCUT_ENABLED_KEY, JSON.stringify(searchSiteShortcutEnabled));
    queueLocalStorageSetItem(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, JSON.stringify(searchAnyKeyCaptureEnabled));
    queueLocalStorageSetItem(SEARCH_CALCULATOR_ENABLED_KEY, JSON.stringify(searchCalculatorEnabled));
    queueLocalStorageSetItem(SEARCH_ROTATING_PLACEHOLDER_ENABLED_KEY, JSON.stringify(searchRotatingPlaceholderEnabled));
    queueLocalStorageSetItem(PREVENT_DUPLICATE_NEWTAB_KEY, JSON.stringify(preventDuplicateNewTab));
    queueLocalStorageSetItem('is24Hour', JSON.stringify(is24Hour));
    queueLocalStorageSetItem(SHOW_DATE_KEY, JSON.stringify(showDate));
    queueLocalStorageSetItem(SHOW_WEEKDAY_KEY, JSON.stringify(showWeekday));
    queueLocalStorageSetItem(SHOW_LUNAR_KEY, JSON.stringify(showLunar));
    queueLocalStorageSetItem(TIME_ANIMATION_MODE_KEY, timeAnimationMode);
    queueLocalStorageRemoveItem('time_animation_enabled');
    queueLocalStorageSetItem('showSeconds', JSON.stringify(showSeconds));
    queueLocalStorageSetItem(VISUAL_EFFECTS_LEVEL_KEY, visualEffectsLevel);
    queueLocalStorageRemoveItem(REDUCE_VISUAL_EFFECTS_KEY);
    queueLocalStorageSetItem('showTime', JSON.stringify(showTime));
    queueLocalStorageSetItem('shortcutCardVariant', shortcutCardVariant);
    queueLocalStorageSetItem('shortcutCompactShowTitle', String(shortcutCompactShowTitle));
    if (privacyConsent !== null) {
      queueLocalStorageSetItem('privacy_consent', JSON.stringify(privacyConsent));
    }
  }, [
    displayMode,
    is24Hour,
    openInNewTab,
    preventDuplicateNewTab,
    privacyConsent,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchRotatingPlaceholderEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    shortcutCardVariant,
    shortcutCompactShowTitle,
    showDate,
    showLunar,
    showSeconds,
    showTime,
    showWeekday,
    tabSwitchSearchEngine,
    timeAnimationMode,
    visualEffectsLevel,
  ]);

  useEffect(() => {
    const normalized = clampShortcutGridColumns(shortcutGridColumns, shortcutCardVariant);
    if (normalized !== shortcutGridColumns) {
      setShortcutGridColumns(normalized);
      return;
    }
    const currentMap = readShortcutGridColumnsByVariant();
    const nextMap: Partial<Record<ShortcutCardVariant, number>> = {
      ...currentMap,
      [shortcutCardVariant]: normalized,
    };
    writeShortcutGridColumnsByVariant(nextMap);
    localStorage.setItem(SHORTCUT_GRID_COLUMNS_LEGACY_KEY, String(normalized));
  }, [shortcutCardVariant, shortcutGridColumns]);

  useEffect(() => {
    const normalized = clampShortcutsRowsPerColumn(shortcutsRowsPerColumn);
    if (normalized !== shortcutsRowsPerColumn) {
      setShortcutsRowsPerColumn(normalized);
      return;
    }
    localStorage.setItem('shortcutsRowsPerColumn', String(normalized));
  }, [shortcutsRowsPerColumn]);

  useEffect(() => {
    if (!ENABLE_CUSTOM_API_SERVER) {
      if (apiServer !== 'official') {
        setApiServer('official');
        return;
      }
      queueLocalStorageSetItem('leaftab_api_server', 'official');
      return;
    }
    queueLocalStorageSetItem('leaftab_api_server', apiServer);
  }, [apiServer]);

  useEffect(() => {
    const next = customApiUrl.trim();
    queueLocalStorageSetItem('leaftab_custom_api_url', next);
    if (apiServer === 'custom' && !next) {
      setApiServer('official');
    }
  }, [customApiUrl, apiServer]);

  useEffect(() => {
    queueLocalStorageSetItem('leaftab_custom_api_name', customApiName.trim());
  }, [customApiName]);

  return {
    settingsOpen,
    setSettingsOpen,
    displayMode,
    setDisplayMode,
    openInNewTab,
    setOpenInNewTab,
    tabSwitchSearchEngine,
    setTabSwitchSearchEngine,
    searchPrefixEnabled,
    setSearchPrefixEnabled,
    searchSiteDirectEnabled,
    setSearchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    setSearchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled,
    setSearchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    setSearchCalculatorEnabled,
    searchRotatingPlaceholderEnabled,
    setSearchRotatingPlaceholderEnabled,
    preventDuplicateNewTab,
    setPreventDuplicateNewTab,
    is24Hour,
    setIs24Hour,
    showDate,
    setShowDate,
    showWeekday,
    setShowWeekday,
    showLunar,
    setShowLunar,
    timeAnimationMode,
    setTimeAnimationMode,
    timeFont,
    setTimeFont,
    showSeconds,
    setShowSeconds,
    visualEffectsLevel,
    setVisualEffectsLevel,
    showTime,
    setShowTime,
    shortcutCardVariant,
    setShortcutCardVariant,
    shortcutCompactShowTitle,
    setShortcutCompactShowTitle,
    shortcutGridColumns,
    setShortcutGridColumns,
    shortcutsRowsPerColumn,
    setShortcutsRowsPerColumn,
    privacyConsent,
    setPrivacyConsent,
    apiServer,
    setApiServer,
    customApiUrl,
    setCustomApiUrl,
    customApiName,
    setCustomApiName,
  };
}
