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

const SHORTCUT_GRID_COLUMNS_LEGACY_KEY = 'shortcutGridColumns';
const SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY = 'shortcutGridColumnsByVariant';
const SEARCH_TAB_SWITCH_ENGINE_KEY = 'search_tab_switch_engine';
const SEARCH_PREFIX_ENABLED_KEY = 'search_prefix_enabled';
const SEARCH_SITE_DIRECT_ENABLED_KEY = 'search_site_direct_enabled';
const SEARCH_SITE_SHORTCUT_ENABLED_KEY = 'search_site_shortcut_enabled';
const SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY = 'search_any_key_capture_enabled';
const SEARCH_CALCULATOR_ENABLED_KEY = 'search_calculator_enabled';

function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw) === true;
  } catch {
    return raw === 'true';
  }
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('panoramic');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [tabSwitchSearchEngine, setTabSwitchSearchEngine] = useState<boolean>(() => readStoredBoolean(SEARCH_TAB_SWITCH_ENGINE_KEY, true));
  const [searchPrefixEnabled, setSearchPrefixEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_PREFIX_ENABLED_KEY, true));
  const [searchSiteDirectEnabled, setSearchSiteDirectEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_SITE_DIRECT_ENABLED_KEY, true));
  const [searchSiteShortcutEnabled, setSearchSiteShortcutEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_SITE_SHORTCUT_ENABLED_KEY, true));
  const [searchAnyKeyCaptureEnabled, setSearchAnyKeyCaptureEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, true));
  const [searchCalculatorEnabled, setSearchCalculatorEnabled] = useState<boolean>(() => readStoredBoolean(SEARCH_CALCULATOR_ENABLED_KEY, true));
  const [is24Hour, setIs24Hour] = useState(true);
  const [timeFont, setTimeFont] = useState(localStorage.getItem('time_font') || 'PingFang SC');
  const [showSeconds, setShowSeconds] = useState(() => {
    const storedShowSeconds = localStorage.getItem('showSeconds');
    if (storedShowSeconds === null) return true;
    try {
      return JSON.parse(storedShowSeconds) === true;
    } catch {
      return storedShowSeconds === 'true';
    }
  });
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
    loadGoogleFont(timeFont);
    localStorage.setItem('time_font', timeFont);
  }, [timeFont]);

  useEffect(() => {
    const storedDisplayMode = localStorage.getItem('displayMode');
    if (storedDisplayMode === 'panoramic' || storedDisplayMode === 'minimalist' || storedDisplayMode === 'fresh') {
      setDisplayMode(storedDisplayMode);
    } else {
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
      if (storedMinimalistMode) setDisplayMode('minimalist');
      else if (storedFreshMode) setDisplayMode('fresh');
      else setDisplayMode('panoramic');
    }
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
    
    const storedIs24Hour = localStorage.getItem('is24Hour');
    if (storedIs24Hour !== null) setIs24Hour(JSON.parse(storedIs24Hour));
    
    const storedShowTime = localStorage.getItem('showTime');
    if (storedShowTime !== null) setShowTime(JSON.parse(storedShowTime));
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
    localStorage.setItem('displayMode', displayMode);
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem('openInNewTab', JSON.stringify(openInNewTab));
  }, [openInNewTab]);

  useEffect(() => {
    localStorage.setItem(SEARCH_TAB_SWITCH_ENGINE_KEY, JSON.stringify(tabSwitchSearchEngine));
  }, [tabSwitchSearchEngine]);

  useEffect(() => {
    localStorage.setItem(SEARCH_PREFIX_ENABLED_KEY, JSON.stringify(searchPrefixEnabled));
  }, [searchPrefixEnabled]);

  useEffect(() => {
    localStorage.setItem(SEARCH_SITE_DIRECT_ENABLED_KEY, JSON.stringify(searchSiteDirectEnabled));
  }, [searchSiteDirectEnabled]);

  useEffect(() => {
    localStorage.setItem(SEARCH_SITE_SHORTCUT_ENABLED_KEY, JSON.stringify(searchSiteShortcutEnabled));
  }, [searchSiteShortcutEnabled]);

  useEffect(() => {
    localStorage.setItem(SEARCH_ANY_KEY_CAPTURE_ENABLED_KEY, JSON.stringify(searchAnyKeyCaptureEnabled));
  }, [searchAnyKeyCaptureEnabled]);

  useEffect(() => {
    localStorage.setItem(SEARCH_CALCULATOR_ENABLED_KEY, JSON.stringify(searchCalculatorEnabled));
  }, [searchCalculatorEnabled]);

  useEffect(() => {
    localStorage.setItem('is24Hour', JSON.stringify(is24Hour));
  }, [is24Hour]);

  useEffect(() => {
    localStorage.setItem('showSeconds', JSON.stringify(showSeconds));
  }, [showSeconds]);

  useEffect(() => {
    localStorage.setItem('showTime', JSON.stringify(showTime));
  }, [showTime]);

  useEffect(() => {
    localStorage.setItem('shortcutCardVariant', shortcutCardVariant);
  }, [shortcutCardVariant]);

  useEffect(() => {
    localStorage.setItem('shortcutCompactShowTitle', String(shortcutCompactShowTitle));
  }, [shortcutCompactShowTitle]);

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
    if (privacyConsent !== null) {
      localStorage.setItem('privacy_consent', JSON.stringify(privacyConsent));
    }
  }, [privacyConsent]);

  useEffect(() => {
    if (!ENABLE_CUSTOM_API_SERVER) {
      if (apiServer !== 'official') {
        setApiServer('official');
        return;
      }
      localStorage.setItem('leaftab_api_server', 'official');
      return;
    }
    localStorage.setItem('leaftab_api_server', apiServer);
  }, [apiServer]);

  useEffect(() => {
    const next = customApiUrl.trim();
    localStorage.setItem('leaftab_custom_api_url', next);
    if (apiServer === 'custom' && !next) {
      setApiServer('official');
    }
  }, [customApiUrl, apiServer]);

  useEffect(() => {
    localStorage.setItem('leaftab_custom_api_name', customApiName.trim());
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
    is24Hour,
    setIs24Hour,
    timeFont,
    setTimeFont,
    showSeconds,
    setShowSeconds,
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
