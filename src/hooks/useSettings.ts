import { useState, useEffect } from 'react';
import { loadGoogleFont } from '../utils/googleFonts';
import { clampShortcutsRowsPerColumn } from '../utils/backupData';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';
import { parseShortcutCardVariant, type ShortcutCardVariant } from '@/components/shortcuts/shortcutCardVariant';
import { type DisplayMode } from '@/displayMode/config';

export function useSettings() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('panoramic');
  const [openInNewTab, setOpenInNewTab] = useState(true);
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
    } catch {}
    
    const storedOpenInNewTab = localStorage.getItem('openInNewTab');
    if (storedOpenInNewTab !== null) setOpenInNewTab(JSON.parse(storedOpenInNewTab));
    
    const storedIs24Hour = localStorage.getItem('is24Hour');
    if (storedIs24Hour !== null) setIs24Hour(JSON.parse(storedIs24Hour));
    
    const storedShowTime = localStorage.getItem('showTime');
    if (storedShowTime !== null) setShowTime(JSON.parse(storedShowTime));
    setShortcutCardVariant(parseShortcutCardVariant(localStorage.getItem('shortcutCardVariant')));
    const storedShortcutCompactShowTitle = localStorage.getItem('shortcutCompactShowTitle');
    if (storedShortcutCompactShowTitle !== null) {
      setShortcutCompactShowTitle(storedShortcutCompactShowTitle === 'true');
    }
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
