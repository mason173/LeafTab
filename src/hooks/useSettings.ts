import { useState, useEffect } from 'react';
import { loadGoogleFont } from '../utils/googleFonts';
import { clampShortcutsRowsPerColumn } from '../utils/backupData';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';

export function useSettings() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [minimalistMode, setMinimalistMode] = useState(false);
  const [freshMode, setFreshMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<'panoramic' | 'minimalist' | 'fresh'>('panoramic');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [is24Hour, setIs24Hour] = useState(true);
  const [timeFont, setTimeFont] = useState(localStorage.getItem('time_font') || 'PingFang SC');
  const [showSeconds, setShowSeconds] = useState(false);
  const [showTime, setShowTime] = useState(true);
  const [apiServer, setApiServer] = useState<'official' | 'custom'>(() => {
    if (!ENABLE_CUSTOM_API_SERVER) return 'official';
    const stored = localStorage.getItem('leaftab_api_server');
    if (stored === 'custom' || stored === 'official') return stored;
    return 'official';
  });
  const [customApiUrl, setCustomApiUrl] = useState(() => localStorage.getItem('leaftab_custom_api_url') || '');
  const [customApiName, setCustomApiName] = useState(() => localStorage.getItem('leaftab_custom_api_name') || '');
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
    const storedMinimalistMode = localStorage.getItem('minimalistMode');
    if (storedMinimalistMode !== null) setMinimalistMode(JSON.parse(storedMinimalistMode));
    const storedFreshMode = localStorage.getItem('freshMode');
    if (storedFreshMode !== null) setFreshMode(JSON.parse(storedFreshMode));
    const storedDisplayMode = localStorage.getItem('displayMode');
    if (storedDisplayMode === 'panoramic' || storedDisplayMode === 'minimalist' || storedDisplayMode === 'fresh') {
      setDisplayMode(storedDisplayMode as any);
    } else {
      if (JSON.parse(storedMinimalistMode || 'false')) setDisplayMode('minimalist');
      else if (JSON.parse(storedFreshMode || 'false')) setDisplayMode('fresh');
      else setDisplayMode('panoramic');
    }
    
    const storedOpenInNewTab = localStorage.getItem('openInNewTab');
    if (storedOpenInNewTab !== null) setOpenInNewTab(JSON.parse(storedOpenInNewTab));
    
    const storedIs24Hour = localStorage.getItem('is24Hour');
    if (storedIs24Hour !== null) setIs24Hour(JSON.parse(storedIs24Hour));
    
    const storedShowSeconds = localStorage.getItem('showSeconds');
    if (storedShowSeconds !== null) setShowSeconds(JSON.parse(storedShowSeconds));

    const storedShowTime = localStorage.getItem('showTime');
    if (storedShowTime !== null) setShowTime(JSON.parse(storedShowTime));
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
    localStorage.setItem('minimalistMode', JSON.stringify(minimalistMode));
  }, [minimalistMode]);
  useEffect(() => {
    localStorage.setItem('freshMode', JSON.stringify(freshMode));
  }, [freshMode]);
  useEffect(() => {
    localStorage.setItem('displayMode', displayMode);
    if (displayMode === 'minimalist') {
      setMinimalistMode(true);
      setFreshMode(false);
    } else if (displayMode === 'fresh') {
      setMinimalistMode(false);
      setFreshMode(true);
    } else {
      setMinimalistMode(false);
      setFreshMode(false);
    }
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
    minimalistMode,
    setMinimalistMode,
    freshMode,
    setFreshMode,
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
