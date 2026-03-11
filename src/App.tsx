/// <reference types="chrome" />

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  RiArrowRightSLine,
  RiCloseFill,
  RiCloudFill,
  RiRainyFill,
  RiSnowyFill,
  RiSunFill,
  RiThunderstormsFill,
} from '@remixicon/react';
import imgImage from "./assets/Default_wallpaper.png?url";

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSearch } from './hooks/useSearch';
import { useShortcuts } from './hooks/useShortcuts';
import { useClock } from './hooks/useClock';
import { useSettings } from './hooks/useSettings';
import { useWallpaper } from './hooks/useWallpaper';
import { useRole } from './hooks/useRole';
import { useWebdavSync, type ApplyImportedDataOptions, type WebdavConfig } from './hooks/useWebdavSync';
import { useWebdavAutoSync } from './hooks/useWebdavAutoSync';
import { Shortcut } from './types';

// Components
import { SearchBar } from './components/SearchBar';
import { WallpaperClock } from './components/WallpaperClock';
import { ShortcutsCarousel } from './components/ShortcutsCarousel';
import { TopNavBar } from './components/TopNavBar';
import { RoleSelector } from './components/RoleSelector';
import { LoginBanner } from './components/LoginBanner';
import { Toaster, toast } from './components/ui/sonner';
import { Button } from "@/components/ui/button";
import { TimeFontDialog } from './components/TimeFontDialog';
import { extractDomainFromUrl, normalizeApiBase } from "./utils";
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';
import { fetchIconLibraryManifest } from '@/utils/iconLibrary';
import { readWebdavConfigFromStorage, WEBDAV_STORAGE_KEYS } from '@/utils/webdavConfig';
import { isWebdavAuthError } from '@/utils/webdavError';
import { AppDialogs } from './components/AppDialogs';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';
import { UpdateAvailableDialog } from './components/UpdateAvailableDialog';
import {
  buildBackupDataV4,
  clampShortcutsRowsPerColumn,
  mergeWebdavPayload,
  type WebdavPayload,
} from './utils/backupData';
import { areSyncPayloadsEqual } from '@/sync/core';
import { useGithubReleaseUpdate } from './hooks/useGithubReleaseUpdate';
import { getShortcutColumns } from '@/components/shortcuts/shortcutCardVariant';

const getApiBase = () => {
  const envApi = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
    ? (import.meta as any).env.VITE_API_URL
    : '';
  if (envApi) return envApi;
  if (typeof window !== 'undefined') {
    const protocol = window.location?.protocol;
    if (protocol === 'chrome-extension:' || protocol === 'moz-extension:' || protocol === 'edge-extension:') {
      return 'https://www.leaftab.cc/api';
    }
  }
  return '/api';
};

const WEBDAV_CONFLICT_CACHE_KEY = 'leaftab_webdav_conflict_cache_v1';

type WebdavConflictChoice = 'cloud' | 'local' | 'merge';
type PersistedWebdavConflict = {
  localPayload: WebdavPayload;
  remotePayload: WebdavPayload;
  choice: WebdavConflictChoice;
};

const readPersistedWebdavConflict = (): PersistedWebdavConflict | null => {
  try {
    const raw = localStorage.getItem(WEBDAV_CONFLICT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWebdavConflict;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.localPayload || !parsed.remotePayload) return null;
    const choice: WebdavConflictChoice = parsed.choice === 'cloud' || parsed.choice === 'merge' ? parsed.choice : 'local';
    return {
      localPayload: parsed.localPayload,
      remotePayload: parsed.remotePayload,
      choice,
    };
  } catch {
    return null;
  }
};

const persistWebdavConflict = (conflict: PersistedWebdavConflict) => {
  try {
    localStorage.setItem(WEBDAV_CONFLICT_CACHE_KEY, JSON.stringify(conflict));
  } catch {}
};

const clearPersistedWebdavConflict = () => {
  try {
    localStorage.removeItem(WEBDAV_CONFLICT_CACHE_KEY);
  } catch {}
};

export default function App() {
  const { t, i18n } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [confirmChoice, setConfirmChoice] = useState<'cloud' | 'local' | 'merge' | null>('local');
  const [webdavConfirmSyncOpen, setWebdavConfirmSyncOpen] = useState(false);
  const [webdavConfirmChoice, setWebdavConfirmChoice] = useState<'cloud' | 'local' | 'merge' | null>(null);
  const [webdavPendingLocalPayload, setWebdavPendingLocalPayload] = useState<WebdavPayload | null>(null);
  const [webdavPendingRemotePayload, setWebdavPendingRemotePayload] = useState<WebdavPayload | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importPendingPayload, setImportPendingPayload] = useState<any | null>(null);
  const [importConfirmBusy, setImportConfirmBusy] = useState(false);
  const [confirmDisableConsentOpen, setConfirmDisableConsentOpen] = useState(false);
  const [webdavDialogOpen, setWebdavDialogOpen] = useState(false);
  const [webdavEnableAfterConfigSave, setWebdavEnableAfterConfigSave] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [moveDialogData, setMoveDialogData] = useState<{ sourceIndex: number; sourceShortcutId?: string } | null>(null);
  const [moveSubOpen, setMoveSubOpen] = useState(false);
  const [pageDeleteOpen, setPageDeleteOpen] = useState(false);
  const [weatherDebugVisible, setWeatherDebugVisible] = useState(() => {
    try {
      return sessionStorage.getItem('leaftab_weather_debug_visible') === 'true';
    } catch {
      return false;
    }
  });
  const moveSubTimerRef = useRef<number | null>(null);
  const weatherDebugTapCountRef = useRef(0);
  const weatherDebugTapTimerRef = useRef<number | null>(null);
  const webdavEnableConflictRef = useRef<{
    config: WebdavConfig;
    localPayload: WebdavPayload;
    remotePayload: WebdavPayload;
  } | null>(null);
  const webdavConflictHydratedRef = useRef(false);
  const openMoveSub = useCallback(() => {
    if (moveSubTimerRef.current) {
      window.clearTimeout(moveSubTimerRef.current);
      moveSubTimerRef.current = null;
    }
    setMoveSubOpen(true);
  }, []);
  const scheduleCloseMoveSub = useCallback((delay = 180) => {
    if (moveSubTimerRef.current) window.clearTimeout(moveSubTimerRef.current);
    moveSubTimerRef.current = window.setTimeout(() => {
      setMoveSubOpen(false);
      moveSubTimerRef.current = null;
    }, delay);
  }, []);
  useEffect(() => () => {
    if (moveSubTimerRef.current) window.clearTimeout(moveSubTimerRef.current);
  }, []);
  useEffect(() => () => {
    if (weatherDebugTapTimerRef.current) window.clearTimeout(weatherDebugTapTimerRef.current);
  }, []);
  useEffect(() => {
    if (!webdavConflictHydratedRef.current) return;
    if (webdavPendingLocalPayload && webdavPendingRemotePayload) {
      const choice: WebdavConflictChoice = webdavConfirmChoice === 'cloud' || webdavConfirmChoice === 'merge' ? webdavConfirmChoice : 'local';
      persistWebdavConflict({
        localPayload: webdavPendingLocalPayload,
        remotePayload: webdavPendingRemotePayload,
        choice,
      });
      return;
    }
    clearPersistedWebdavConflict();
  }, [webdavConfirmChoice, webdavPendingLocalPayload, webdavPendingRemotePayload]);
  useEffect(() => {
    const restored = readPersistedWebdavConflict();
    if (restored) {
      setWebdavPendingLocalPayload(restored.localPayload);
      setWebdavPendingRemotePayload(restored.remotePayload);
      setWebdavConfirmChoice(restored.choice);
      setWebdavConfirmSyncOpen(true);
    }
    webdavConflictHydratedRef.current = true;
  }, []);
  // Initialize Hooks
  const { 
    user, 
    setUser, 
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginBannerVisible, 
    setLoginBannerVisible, 
    handleLoginSuccess, 
    handleLogout 
  } = useAuth();

  const {
    settingsOpen, setSettingsOpen,
    minimalistMode, setMinimalistMode,
    freshMode, setFreshMode,
    displayMode, setDisplayMode,
    openInNewTab, setOpenInNewTab,
    is24Hour, setIs24Hour,
    timeFont, setTimeFont,
    showSeconds, setShowSeconds,
    showTime, setShowTime,
    shortcutCardVariant, setShortcutCardVariant,
    shortcutCompactShowTitle, setShortcutCompactShowTitle,
    shortcutsRowsPerColumn, setShortcutsRowsPerColumn,
    privacyConsent, setPrivacyConsent,
    apiServer, setApiServer,
    customApiUrl, setCustomApiUrl,
    customApiName, setCustomApiName,
  } = useSettings();
  // removed auto-focus search feature

  const defaultApiBase = useMemo(() => getApiBase(), []);

  const API_URL = useMemo(() => {
    if (ENABLE_CUSTOM_API_SERVER && apiServer === 'custom') {
      const normalized = normalizeApiBase(customApiUrl);
      if (normalized) return normalized;
    }
    return defaultApiBase;
  }, [apiServer, customApiUrl, defaultApiBase]);

  const {
    open: updateDialogOpen,
    setOpen: setUpdateDialogOpen,
    currentVersion,
    latestVersion,
    releaseUrl,
    publishedAt,
    notes: updateNotes,
    ignoreCurrentRelease,
    snoozeCurrentRelease,
  } = useGithubReleaseUpdate(API_URL);

  const {
    searchValue, setSearchValue,
    searchHistory, setSearchHistory,
    historySelectedIndex, setHistorySelectedIndex,
    searchEngine, setSearchEngine,
    dropdownOpen, setDropdownOpen,
    historyOpen, setHistoryOpen,
    skipNextHistoryOpen,
    handleSearchChange,
    filteredHistoryItems,
    handleSearch,
    handleEngineClick,
    handleEngineSelect,
    openSearchWithQuery,
  } = useSearch(searchInputRef as React.RefObject<HTMLInputElement>, openInNewTab);

  const {
    scenarioModes, setScenarioModes,
    selectedScenarioId, setSelectedScenarioId,
    scenarioShortcuts, setScenarioShortcuts,
    cloudSyncInitialized, setCloudSyncInitialized,
    userRole, setUserRole,
    totalShortcuts,
    conflictModalOpen, setConflictModalOpen,
    pendingLocalPayload,
    pendingCloudPayload,
    cloudConflictPending,
    triggerCloudSyncNow,
    contextMenu, setContextMenu,
    shortcutEditOpen, setShortcutEditOpen,
    shortcutModalMode, setShortcutModalMode,
    shortcutDeleteOpen, setShortcutDeleteOpen,
    selectedShortcut, setSelectedShortcut,
    editingTitle, setEditingTitle,
    editingUrl, setEditingUrl,
    isDragging, setIsDragging,
    currentEditScenarioId, setCurrentEditScenarioId,
    currentInsertIndex, setCurrentInsertIndex,
    shortcuts,
    localDirtyRef,
    handleCreateScenarioMode, handleOpenEditScenarioMode, handleUpdateScenarioMode, handleDeleteScenarioMode,
    handleShortcutOpen, handleShortcutContextMenu, handlePageContextMenu,
    handleSaveShortcutEdit, handleConfirmDeleteShortcut,
    findOrCreateAvailableIndex, handleDeletePage, getMaxPageIndex, contextMenuRef,
    resolveWithCloud, resolveWithLocal, resolveWithMerge,
    applyUndoPayload,
    scenarioModeOpen, setScenarioModeOpen,
    scenarioCreateOpen, setScenarioCreateOpen,
    scenarioEditOpen, setScenarioEditOpen,
    handlePageReorder,
    moveShortcutToPage,
    resetLocalShortcutsByRole
  } = useShortcuts(user, openInNewTab, API_URL, handleLogout, shortcutsRowsPerColumn, shortcutCardVariant);

  useEffect(() => {
    if (conflictModalOpen && !confirmChoice) {
      setConfirmChoice('local');
    }
  }, [confirmChoice, conflictModalOpen]);

  const downloadBackupPayload = useCallback((payload: any, source: 'cloud' | 'local') => {
    try {
      const envelope = buildBackupDataV4({
        scenarioModes: payload.scenarioModes,
        selectedScenarioId: payload.selectedScenarioId,
        scenarioShortcuts: payload.scenarioShortcuts,
      });
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaftab_backup_${source}_${ts}.leaftab`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, []);

  const downloadCloudBackupEnvelope = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/user/shortcuts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      const shortcutsRaw = data?.shortcuts;
      if (!shortcutsRaw) return;
      const shortcutsStr = typeof shortcutsRaw === 'string' ? shortcutsRaw : JSON.stringify(shortcutsRaw);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const blob = new Blob([shortcutsStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaftab_backup_cloud_before_import_${ts}.leaftab`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('settings.backup.cloudBackupDownloaded'));
    } catch {}
  }, [API_URL, t]);

  type SuggestionItem = { type: 'history' | 'shortcut'; label: string; value: string; icon?: string };

  const shortcutSuggestionItems = useMemo(() => {
    const all: { title: string; url: string; icon: string }[] = [];
    Object.values(scenarioShortcuts as Record<string, Shortcut[]>).forEach((list) => {
      (list || []).forEach((s) => all.push({ title: s.title || '', url: s.url || '', icon: s.icon || '' }));
    });
    const q = searchValue.trim().toLowerCase();
    if (!q) return [] as SuggestionItem[];
    const seen = new Set<string>();
    const out: SuggestionItem[] = [];
    for (const s of all) {
      const title = s.title.toLowerCase();
      const url = s.url.toLowerCase();
      if (!s.url) continue;
      if (title.includes(q) || url.includes(q)) {
        const key = s.url.trim();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: 'shortcut', label: s.title || s.url, value: s.url.trim(), icon: s.icon });
      }
    }
    return out.slice(0, 10);
  }, [scenarioShortcuts, searchValue]);

  const mergedSuggestionItems = useMemo(() => {
    if (!searchValue.trim()) return filteredHistoryItems.map((h) => ({ type: 'history', label: h, value: h } as SuggestionItem));
    const seen = new Set<string>();
    const merged: SuggestionItem[] = [];
    for (const it of shortcutSuggestionItems) {
      const key = `${it.label}|${it.value}`;
      if (!seen.has(key)) { seen.add(key); merged.push(it); }
    }
    for (const h of filteredHistoryItems) {
      const key = `history|${h}`;
      if (!seen.has(key)) { seen.add(key); merged.push({ type: 'history', label: h, value: h }); }
    }
    return merged.slice(0, 15);
  }, [searchValue, shortcutSuggestionItems, filteredHistoryItems]);
  
  const handleSuggestionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!historyOpen) {
        setHistoryOpen(true);
        if (mergedSuggestionItems.length > 0) setHistorySelectedIndex(0);
      } else if (mergedSuggestionItems.length > 0) {
        setHistorySelectedIndex((prev) => (prev + 1) % mergedSuggestionItems.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyOpen && mergedSuggestionItems.length > 0) {
        setHistorySelectedIndex((prev) => (prev - 1 + mergedSuggestionItems.length) % mergedSuggestionItems.length);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (historySelectedIndex !== -1 && mergedSuggestionItems[historySelectedIndex]) {
        e.preventDefault();
        const item = mergedSuggestionItems[historySelectedIndex];
        setSearchValue(item.label);
        openSearchWithQuery(item.value);
        setHistoryOpen(false);
        setHistorySelectedIndex(-1);
        return;
      }
    }
  }, [historyOpen, mergedSuggestionItems, historySelectedIndex, setHistorySelectedIndex, setHistoryOpen, setSearchValue, openSearchWithQuery]);

  const { time, date, lunar } = useClock(is24Hour, showSeconds, i18n.language);

  useEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const pad = 8;
    const rect = contextMenuRef.current.getBoundingClientRect();
    let newX = contextMenu.x;
    let newY = contextMenu.y;
    if (rect.right > window.innerWidth - pad) newX = Math.max(pad, window.innerWidth - pad - rect.width);
    if (rect.bottom > window.innerHeight - pad) newY = Math.max(pad, window.innerHeight - pad - rect.height);
    if (newX !== contextMenu.x || newY !== contextMenu.y) {
      setContextMenu({ ...contextMenu, x: newX, y: newY });
    }
  }, [contextMenu, setContextMenu, contextMenuRef]);

  const {
    bingWallpaper,
    customWallpaper, setCustomWallpaper,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    isWallpaperExpanded, setIsWallpaperExpanded,
  } = useWallpaper();

  const { roleSelectorOpen, setRoleSelectorOpen, handleRoleSelect } = useRole(
    user, setUserRole, setScenarioModes, setSelectedScenarioId, setScenarioShortcuts, localDirtyRef, API_URL
  );

  const showPrivacyModal = !!user && privacyConsent === null;

  const handlePrivacyConsent = (agreed: boolean) => {
    setPrivacyConsent(agreed);
    try { localStorage.setItem('privacy_consent', JSON.stringify(agreed)); } catch {}
    try {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_URL}/user/privacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ consent: agreed })
        }).catch(() => {});
      }
    } catch {}
  };

  const onLoginSuccess = useCallback((username: string, role?: string | null, consent?: boolean | null) => {
    handleLoginSuccess(username);
    if (typeof consent !== 'undefined') {
      setPrivacyConsent(consent as any);
      try { localStorage.setItem('privacy_consent', JSON.stringify(consent)); } catch {}
    }
  }, [handleLoginSuccess, setPrivacyConsent]);
  
  const handlePrivacySwitchChange = useCallback((checked: boolean) => {
    if (!checked && privacyConsent) {
      setConfirmDisableConsentOpen(true);
      return;
    }
    if (checked) {
      handlePrivacyConsent(true);
    }
  }, [privacyConsent]);

  const [shortcutsPageIndex, setShortcutsPageIndex] = useState(0);

  useEffect(() => {
    const maxPage = getMaxPageIndex(shortcuts.length);
    setShortcutsPageIndex((prev) => Math.min(Math.max(prev, 0), maxPage));
  }, [shortcuts.length, selectedScenarioId, getMaxPageIndex]);

  const handleShortcutsRowsPerColumnChange = useCallback((rows: number) => {
    setShortcutsRowsPerColumn(rows);
    setShortcutsPageIndex(0);
    setSettingsOpen(false);
  }, [setShortcutsRowsPerColumn, setSettingsOpen]);

  const buildBackupData = useCallback(() => {
    return buildBackupDataV4({ scenarioModes, selectedScenarioId, scenarioShortcuts });
  }, [scenarioModes, selectedScenarioId, scenarioShortcuts]);

  const applyImportedData = useCallback((data: any, options?: ApplyImportedDataOptions) => {
    const closeSettings = options?.closeSettings ?? true;
    const successKey = options?.successKey || 'settings.backup.importSuccess';
    const silentSuccess = options?.silentSuccess ?? false;
    try {
      const snapshot = {
        scenarioModes: Array.isArray(data.scenarioModes) ? data.scenarioModes : scenarioModes,
        selectedScenarioId: typeof data.selectedScenarioId === 'string' ? data.selectedScenarioId : selectedScenarioId,
        scenarioShortcuts: data.scenarioShortcuts,
      };
      if (snapshot.scenarioModes) setScenarioModes(snapshot.scenarioModes);
      if (snapshot.selectedScenarioId) setSelectedScenarioId(snapshot.selectedScenarioId);
      if (snapshot.scenarioShortcuts) {
        setScenarioShortcuts(snapshot.scenarioShortcuts);
        persistLocalProfileSnapshot(snapshot);
        if (user) {
          const payload = {
            version: 3 as const,
            scenarioModes: snapshot.scenarioModes,
            selectedScenarioId: snapshot.selectedScenarioId,
            scenarioShortcuts: snapshot.scenarioShortcuts,
          };
          localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
          localStorage.setItem('leaf_tab_sync_pending', 'true');
          clearLocalNeedsCloudReconcile();
        } else {
          const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
          if (!hasStoredCloudSession) {
            markLocalNeedsCloudReconcile('signed_out_edit');
          }
        }
      } else {
        throw new Error('invalid_scenario_shortcuts');
      }
      if (!user) localDirtyRef.current = true;
      if (!silentSuccess) {
        toast.success(t(successKey));
      }
      if (closeSettings) setSettingsOpen(false);
    } catch (error) {
      toast.error(t('settings.backup.importError'));
      throw error;
    }
  }, [user, t, setScenarioModes, setSelectedScenarioId, setScenarioShortcuts, localDirtyRef, setSettingsOpen]);

  const handleExportData = useCallback(() => {
    const backupData = buildBackupData();
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaftab_backup_${new Date().toISOString().split('T')[0]}.leaftab`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t('settings.backup.exportSuccess'));
  }, [buildBackupData, t]);

  const handleImportData = useCallback((data: any) => {
    if (user) {
      setImportPendingPayload(data);
      setImportConfirmOpen(true);
      return;
    }
    applyImportedData(data, { closeSettings: true });
  }, [applyImportedData, user]);

  const applyImportedDataWithoutClose = useCallback((data: any) => {
    applyImportedData(data, { closeSettings: false });
  }, [applyImportedData]);

  const {
    uploadToWebdav: handleWebdavUpload,
    uploadDataToWebdav,
    fetchWebdavData,
  } = useWebdavSync({
    buildBackupData,
    applyImportedData: applyImportedDataWithoutClose,
  });

  const buildLocalWebdavPayload = useCallback((): WebdavPayload => {
    return {
      scenarioModes,
      selectedScenarioId,
      scenarioShortcuts,
    };
  }, [scenarioShortcuts, scenarioModes, selectedScenarioId]);

  const emitWebdavSyncStatusChanged = useCallback(() => {
    window.dispatchEvent(new Event('webdav-config-changed'));
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);

  const markWebdavSyncSuccess = useCallback(() => {
    localStorage.setItem('webdav_last_sync_at', new Date().toISOString());
    localStorage.removeItem('webdav_last_error_at');
    localStorage.removeItem('webdav_last_error_message');
  }, []);

  const markWebdavSyncError = useCallback((error: unknown) => {
    localStorage.setItem('webdav_last_error_at', new Date().toISOString());
    localStorage.setItem('webdav_last_error_message', String((error as any)?.message || 'unknown'));
  }, []);

  const setWebdavSyncEnabledInStorage = useCallback((enabled: boolean) => {
    localStorage.setItem(WEBDAV_STORAGE_KEYS.syncEnabled, String(enabled));
    if (enabled && !localStorage.getItem(WEBDAV_STORAGE_KEYS.syncBySchedule)) {
      localStorage.setItem(WEBDAV_STORAGE_KEYS.syncBySchedule, 'true');
    }
    if (!enabled) {
      localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    }
    emitWebdavSyncStatusChanged();
  }, [emitWebdavSyncStatusChanged]);

  const executeWebdavEnableChoice = useCallback(async (
    mode: 'merge' | 'prefer_remote' | 'prefer_local',
    pendingOverride?: { localPayload: WebdavPayload; remotePayload: WebdavPayload },
  ) => {
    const pending = webdavEnableConflictRef.current;
    const config = pending?.config || readWebdavConfigFromStorage({ allowDisabled: true });
    const localPayload = pendingOverride?.localPayload || pending?.localPayload || webdavPendingLocalPayload;
    const remotePayload = pendingOverride?.remotePayload || pending?.remotePayload || webdavPendingRemotePayload;
    if (!config || !localPayload || !remotePayload) return;
    try {
      if (mode === 'prefer_remote') {
        applyImportedDataWithoutClose(remotePayload, { closeSettings: false, silentSuccess: true });
      } else if (mode === 'merge') {
        const mergedPayload = mergeWebdavPayload(localPayload, remotePayload);
        applyImportedDataWithoutClose(mergedPayload, { closeSettings: false, silentSuccess: true });
        await uploadDataToWebdav(config, mergedPayload);
      } else {
        await uploadDataToWebdav(config, localPayload);
      }
      markWebdavSyncSuccess();
      setWebdavSyncEnabledInStorage(true);
      toast.success(t('settings.backup.webdav.syncSuccess'));
    } catch (error) {
      markWebdavSyncError(error);
      emitWebdavSyncStatusChanged();
      toast.error(isWebdavAuthError(error) ? t('settings.backup.webdav.authFailed') : t('settings.backup.webdav.syncError'));
    } finally {
      webdavEnableConflictRef.current = null;
      setWebdavConfirmSyncOpen(false);
      setWebdavConfirmChoice(null);
      setWebdavPendingLocalPayload(null);
      setWebdavPendingRemotePayload(null);
    }
  }, [applyImportedDataWithoutClose, emitWebdavSyncStatusChanged, markWebdavSyncError, markWebdavSyncSuccess, setWebdavSyncEnabledInStorage, t, uploadDataToWebdav, webdavPendingLocalPayload, webdavPendingRemotePayload]);

  const handleEnableWebdavSync = useCallback(async () => {
    if (user) {
      toast.error(t('settings.backup.webdav.disableCloudBeforeWebdavEnable'));
      return;
    }
    const config = readWebdavConfigFromStorage({ allowDisabled: true });
    if (!config) {
      toast.error(t('settings.backup.webdav.urlRequired'));
      return;
    }
    try {
      const remotePayload = await fetchWebdavData(config);
      const localPayload = buildLocalWebdavPayload();
      if (!remotePayload) {
        await uploadDataToWebdav(config, localPayload);
        markWebdavSyncSuccess();
        setWebdavSyncEnabledInStorage(true);
        toast.success(t('settings.backup.webdav.syncSuccess'));
        return;
      }
      if (areSyncPayloadsEqual(localPayload, remotePayload)) {
        markWebdavSyncSuccess();
        setWebdavSyncEnabledInStorage(true);
        toast.success(t('settings.backup.webdav.syncSuccess'));
        return;
      }
      webdavEnableConflictRef.current = { config, localPayload, remotePayload };
      setWebdavPendingLocalPayload(localPayload);
      setWebdavPendingRemotePayload(remotePayload);
      setWebdavConfirmChoice('local');
      setWebdavConfirmSyncOpen(true);
    } catch (error) {
      markWebdavSyncError(error);
      emitWebdavSyncStatusChanged();
      toast.error(isWebdavAuthError(error) ? t('settings.backup.webdav.authFailed') : t('settings.backup.webdav.syncError'));
    }
  }, [buildLocalWebdavPayload, emitWebdavSyncStatusChanged, fetchWebdavData, markWebdavSyncError, markWebdavSyncSuccess, setWebdavSyncEnabledInStorage, t, uploadDataToWebdav, user]);

  const handleDisableWebdavSync = useCallback(async (options?: { clearLocal?: boolean }) => {
    const currentlyEnabled = (localStorage.getItem(WEBDAV_STORAGE_KEYS.syncEnabled) ?? 'false') === 'true';
    if (!currentlyEnabled) return;
    let forceSyncFailed = false;
    const config = readWebdavConfigFromStorage();
    if (config) {
      try {
        await handleWebdavUpload(config);
        markWebdavSyncSuccess();
      } catch (error) {
        forceSyncFailed = true;
        markWebdavSyncError(error);
      }
    }
    setWebdavSyncEnabledInStorage(false);
    if (options?.clearLocal === true) {
      await resetLocalShortcutsByRole(localStorage.getItem('role'));
    }
    if (forceSyncFailed) {
      toast.error(t('settings.backup.webdav.disableFinalSyncFailed'));
    }
    toast.success(t('settings.backup.webdav.syncDisabled'));
  }, [handleWebdavUpload, markWebdavSyncError, markWebdavSyncSuccess, resetLocalShortcutsByRole, setWebdavSyncEnabledInStorage, t]);
  const handleOpenWebdavConfig = useCallback((options?: { enableAfterSave?: boolean }) => {
    setWebdavEnableAfterConfigSave(Boolean(options?.enableAfterSave));
    setWebdavDialogOpen(true);
  }, []);

  const handleConfirmCloudSyncChoice = useCallback(() => {
    const chosen = confirmChoice;
    if (!chosen) {
      return;
    }
    if (chosen === 'merge') {
      if (pendingLocalPayload) downloadBackupPayload(pendingLocalPayload, 'local');
      if (pendingCloudPayload) downloadBackupPayload(pendingCloudPayload, 'cloud');
      toast.success(t('syncUndo.backupToastBoth'));
      resolveWithMerge();
      return;
    }
    const backupTarget = chosen === 'cloud' ? 'local' : 'cloud';
    const backupPayload = chosen === 'cloud' ? pendingLocalPayload : pendingCloudPayload;
    if (backupPayload) {
      downloadBackupPayload(backupPayload, backupTarget);
      toast.success(t('syncUndo.backupToast', { backup: t(backupTarget === 'cloud' ? 'sync.cloud' : 'sync.local') }));
    }
    if (chosen === 'cloud') resolveWithCloud();
    else resolveWithLocal();
  }, [confirmChoice, downloadBackupPayload, pendingCloudPayload, pendingLocalPayload, resolveWithCloud, resolveWithLocal, resolveWithMerge, t]);

  const handleConfirmWebdavSyncChoice = useCallback(async () => {
    const chosen = webdavConfirmChoice;
    const pending = webdavEnableConflictRef.current;
    const localPayload = pending?.localPayload || webdavPendingLocalPayload;
    const remotePayload = pending?.remotePayload || webdavPendingRemotePayload;
    if (!chosen || !localPayload || !remotePayload) {
      setWebdavConfirmSyncOpen(false);
      return;
    }
    if (chosen === 'cloud') {
      downloadBackupPayload(localPayload, 'local');
      toast.success(t('syncUndo.backupToast', { backup: t('sync.local') }));
      await executeWebdavEnableChoice('prefer_remote', { localPayload, remotePayload });
      return;
    }
    if (chosen === 'local') {
      downloadBackupPayload(remotePayload, 'cloud');
      toast.success(t('syncUndo.backupToast', { backup: t('sync.cloud') }));
      await executeWebdavEnableChoice('prefer_local', { localPayload, remotePayload });
      return;
    }
    downloadBackupPayload(localPayload, 'local');
    downloadBackupPayload(remotePayload, 'cloud');
    toast.success(t('syncUndo.backupToastBoth'));
    await executeWebdavEnableChoice('merge', { localPayload, remotePayload });
  }, [downloadBackupPayload, executeWebdavEnableChoice, t, webdavConfirmChoice, webdavPendingLocalPayload, webdavPendingRemotePayload]);

  const webdavConflictPending = Boolean(webdavPendingLocalPayload && webdavPendingRemotePayload);

  const { resolveWebdavConflict } = useWebdavAutoSync({
    conflictModalOpen: conflictModalOpen || cloudConflictPending || webdavConflictPending,
    isDragging,
    buildLocalPayload: buildLocalWebdavPayload,
    applyImportedData: applyImportedDataWithoutClose,
    uploadToWebdav: handleWebdavUpload,
    uploadDataToWebdav,
    fetchWebdavData,
    mergePayload: mergeWebdavPayload,
  });

  const handleRequestCloudLogin = useCallback(() => {
    const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (webdavEnabled) {
      toast.error(t('settings.backup.webdav.disableWebdavBeforeCloudLogin'));
      return false;
    }
    setIsAuthModalOpen(true);
    return true;
  }, [t]);
  const syncLocalToCloudBeforeLogout = useCallback(async () => {
    if (!user) return false;
    const token = localStorage.getItem('token');
    if (!token) return false;
    if (!navigator.onLine) return false;
    try {
      const envelope = buildBackupDataV4({
        scenarioModes,
        selectedScenarioId,
        scenarioShortcuts,
      });
      const response = await fetch(`${API_URL}/user/shortcuts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          shortcuts: envelope,
          syncMode: 'prefer_local',
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [API_URL, scenarioModes, scenarioShortcuts, selectedScenarioId, user]);
  const handleLogoutWithOptions = useCallback(async (options?: { clearLocal?: boolean }) => {
    const shouldClearLocal = options?.clearLocal === true;
    const syncedBeforeLogout = await syncLocalToCloudBeforeLogout();
    if (!shouldClearLocal) {
      try {
        persistLocalProfileSnapshot({
          scenarioModes,
          selectedScenarioId,
          scenarioShortcuts,
        });
        if (syncedBeforeLogout) {
          clearLocalNeedsCloudReconcile();
          localDirtyRef.current = false;
        } else {
          markLocalNeedsCloudReconcile('logout_keep_local');
          localDirtyRef.current = true;
        }
      } catch {}
    }
    handleLogout({ clearLocal: shouldClearLocal });
    if (shouldClearLocal) {
      await resetLocalShortcutsByRole(localStorage.getItem('role'));
    }
  }, [clearLocalNeedsCloudReconcile, handleLogout, localDirtyRef, resetLocalShortcutsByRole, scenarioModes, scenarioShortcuts, selectedScenarioId, syncLocalToCloudBeforeLogout]);
  const handleVersionTap = useCallback(() => {
    weatherDebugTapCountRef.current += 1;
    if (weatherDebugTapTimerRef.current) {
      window.clearTimeout(weatherDebugTapTimerRef.current);
    }
    weatherDebugTapTimerRef.current = window.setTimeout(() => {
      weatherDebugTapCountRef.current = 0;
      weatherDebugTapTimerRef.current = null;
    }, 1800);
    if (weatherDebugTapCountRef.current >= 6) {
      weatherDebugTapCountRef.current = 0;
      if (weatherDebugTapTimerRef.current) {
        window.clearTimeout(weatherDebugTapTimerRef.current);
        weatherDebugTapTimerRef.current = null;
      }
      setWeatherDebugVisible(true);
      try { sessionStorage.setItem('leaftab_weather_debug_visible', 'true'); } catch {}
    }
  }, []);

  const registrableDomain = (domain: string) => {
    let d = (domain || '').trim().toLowerCase();
    if (d.startsWith('www.')) d = d.slice(4);
    const parts = d.split('.');
    if (parts.length <= 2) return parts.join('.');
    const last2 = parts.slice(-2).join('.');
    const multiSuffixes = new Set([
      'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
      'co.uk', 'org.uk', 'ac.uk',
      'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'gr.jp', 'ed.jp', 'ad.jp',
      'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
      'com.hk', 'com.tw'
    ]);
    if (multiSuffixes.has(last2)) {
      if (parts.length >= 3) return parts.slice(-3).join('.');
    }
    return last2;
  };

  const handleExportDomains = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('toast.sessionExpired'));
        return;
      }
      const adminKey = (localStorage.getItem('admin_api_key') || '').trim();
      if (!adminKey) {
        toast.error(t('settings.iconAssistant.adminKeyRequired'));
        return;
      }
      const resp = await fetch(`${API_URL}/admin/domains/export`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Admin-Key': adminKey }
      });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          toast.error(t('settings.iconAssistant.adminKeyInvalid'));
          return;
        }
        toast.error(t('settings.iconAssistant.downloadFailed'));
        return;
      }
      const data = await resp.json();
      const list: Array<{ domain: string; count: number; first_seen?: string; last_seen?: string }> = (data?.domains || []);
      const apexSet = new Set<string>();
      const manifest = await fetchIconLibraryManifest();
      const manifestKeys = manifest?.icons ? Object.keys(manifest.icons) : [];
      for (const key of manifestKeys) {
        const apex = registrableDomain(key);
        if (apex) apexSet.add(apex);
      }
      const parseSeenMs = (value?: string) => {
        if (!value) return Number.NaN;
        const s = value.trim();
        if (!s) return Number.NaN;
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).getTime();
        const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/);
        if (m) return new Date(`${m[1]}T${m[2]}${m[3] || ''}Z`).getTime();
        return new Date(s).getTime();
      };
      const formatSeenLocal = (value?: string) => {
        const ms = parseSeenMs(value);
        if (!Number.isFinite(ms)) return value || '';
        const d = new Date(ms);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };
      const minIso = (a?: string, b?: string) => {
        const ta = parseSeenMs(a);
        const tb = parseSeenMs(b);
        if (!Number.isFinite(ta)) return b;
        if (!Number.isFinite(tb)) return a;
        return ta <= tb ? a : b;
      };
      const maxIso = (a?: string, b?: string) => {
        const ta = parseSeenMs(a);
        const tb = parseSeenMs(b);
        if (!Number.isFinite(ta)) return b;
        if (!Number.isFinite(tb)) return a;
        return ta >= tb ? a : b;
      };
      const aggregated = new Map<string, { domain: string; count: number; first_seen?: string; last_seen?: string }>();
      for (const item of list) {
        const apex = registrableDomain(item.domain);
        if (!apex) continue;
        if (apexSet.has(apex)) continue;
        const prev = aggregated.get(apex);
        const c = Number(item.count) || 0;
        if (!prev) {
          aggregated.set(apex, { domain: apex, count: c, first_seen: item.first_seen, last_seen: item.last_seen });
        } else {
          prev.count += c;
          prev.first_seen = minIso(prev.first_seen, item.first_seen);
          prev.last_seen = maxIso(prev.last_seen, item.last_seen);
        }
      }
      const rows = Array.from(aggregated.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const tb = parseSeenMs(b.last_seen);
        const ta = parseSeenMs(a.last_seen);
        if (tb !== ta) return tb - ta;
        return a.domain.localeCompare(b.domain);
      });
      const csvEscape = (value: unknown) => {
        const s = value === null || value === undefined ? '' : String(value);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csv = [
        ['domain', 'count', 'first_seen', 'last_seen'].join(','),
        ...rows.map((r) => [r.domain, r.count, formatSeenLocal(r.first_seen), formatSeenLocal(r.last_seen)].map(csvEscape).join(',')),
      ].join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaftab_domains_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('settings.iconAssistant.downloadSuccess'));
    } catch (e) {
      toast.error(t('settings.iconAssistant.downloadFailed'));
    }
  }, [API_URL, t]);

  const handleFetchAdminStats = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('missing_token');
    const adminKey = (localStorage.getItem('admin_api_key') || '').trim();
    if (!adminKey) throw new Error('missing_admin_key');
    const resp = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-Admin-Key': adminKey }
    });
    if (!resp.ok) {
      throw new Error(`admin_stats_${resp.status}`);
    }
    return await resp.json();
  }, []);

  const handleOpenAdminModal = useCallback(() => {
    setSettingsOpen(false);
    setAdminModalOpen(true);
  }, [setSettingsOpen]);

  const handleOpenAboutModal = useCallback(() => {
    setSettingsOpen(false);
    setAboutModalOpen(true);
  }, [setSettingsOpen]);

  const handleWeatherDebugEnabledChange = useCallback((enabled: boolean) => {
    setWeatherDebugVisible(enabled);
    try { sessionStorage.setItem('leaftab_weather_debug_visible', enabled ? 'true' : 'false'); } catch {}
  }, []);

  const normalizedRowsPerColumn = clampShortcutsRowsPerColumn(shortcutsRowsPerColumn);
  const shortcutsColumns = getShortcutColumns(shortcutCardVariant);
  const shortcutsPageCapacity = normalizedRowsPerColumn * shortcutsColumns;
  const maxShortcutsPageIndex = getMaxPageIndex(shortcuts.length);
  const maxShortcutsOnCurrentPage = (() => {
    const start = shortcutsPageIndex * shortcutsPageCapacity;
    const end = Math.min(start + shortcutsPageCapacity, shortcuts.length);
    const total = Math.max(0, end - start);
    const rows = Math.ceil(total / shortcutsColumns);
    return Math.min(rows, normalizedRowsPerColumn);
  })();
  const displayRows = Math.max(maxShortcutsOnCurrentPage, normalizedRowsPerColumn);
  const shortcutRowHeight = shortcutCardVariant === 'compact'
    ? (shortcutCompactShowTitle ? 96 : 72)
    : 52;
  const shortcutRowGap = shortcutCardVariant === 'compact' ? 20 : 4;
  const shortcutsAreaHeight = 32 + 4 + displayRows * shortcutRowHeight + Math.max(0, displayRows - 1) * shortcutRowGap;
  const pageIndices = (() => {
    const pageCount = Math.max(1, Math.ceil(shortcuts.length / shortcutsPageCapacity));
    return Array.from({ length: pageCount }, (_, i) => i);
  })();
  const currentCarouselIndex = (() => {
    const idx = pageIndices.indexOf(shortcutsPageIndex);
    return idx >= 0 ? idx : 0;
  })();
  const handleCarouselIndexChange = useCallback((index: number) => {
    const nextPage = pageIndices[index] ?? pageIndices[0] ?? 0;
    setShortcutsPageIndex(nextPage);
  }, [pageIndices]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu, contextMenuRef, setContextMenu]);
  
  useEffect(() => {
    const handleHistoryOutside = (event: MouseEvent) => {
      if (!historyOpen) return;
      const target = event.target as Node;
      if (searchAreaRef.current && !searchAreaRef.current.contains(target)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleHistoryOutside);
    return () => document.removeEventListener('mousedown', handleHistoryOutside);
  }, [historyOpen, setHistoryOpen]);
  
  useEffect(() => {
    const handleEngineOutside = (event: MouseEvent) => {
      if (!dropdownOpen) return;
      const target = event.target as Node;
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleEngineOutside);
    return () => document.removeEventListener('mousedown', handleEngineOutside);
  }, [dropdownOpen, setDropdownOpen]);

  const scenarioEditMode = scenarioModes.find((m: any) => m.id === currentEditScenarioId) ?? null;
  const countPayload = (payload: any) => {
    if (!payload || !payload.scenarioShortcuts) return 0;
    let c = 0;
    Object.values(payload.scenarioShortcuts).forEach((list: any) => {
      if (Array.isArray(list)) c += list.length;
    });
    return c;
  };
  const cloudCount = countPayload(pendingCloudPayload);
  const localCount = countPayload(pendingLocalPayload);
  const webdavCloudCount = countPayload(webdavPendingRemotePayload);
  const webdavLocalCount = countPayload(webdavPendingLocalPayload);
  const cloudTimeRaw = typeof window !== 'undefined'
    ? (localStorage.getItem('cloud_shortcuts_updated_at')
      || localStorage.getItem('cloud_shortcuts_fetched_at')
      || '')
    : '';
  const localTimeRaw = typeof window !== 'undefined' ? localStorage.getItem('local_shortcuts_updated_at') || '' : '';
  const webdavCloudTimeRaw = typeof window !== 'undefined' ? (localStorage.getItem('webdav_last_sync_at') || '') : '';
  const webdavLocalTimeRaw = localTimeRaw;
  const formatTime = (s: string) => {
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const cloudTime = formatTime(cloudTimeRaw);
  const localTime = formatTime(localTimeRaw);
  const webdavCloudTime = formatTime(webdavCloudTimeRaw);
  const webdavLocalTime = formatTime(webdavLocalTimeRaw);

  return (
    <div className="bg-background relative w-full min-h-screen flex flex-col items-center overflow-x-hidden overflow-y-auto pb-[24px]">
      
      {/* 极简模式下的顶部状态栏 */}
      {!roleSelectorOpen && minimalistMode && !freshMode && (
        <div className="fixed top-6 left-6 right-6 z-50 animate-in fade-in zoom-in duration-300">
          <TopNavBar 
              onSettingsClick={() => setSettingsOpen(true)}
              showScenarioMode={!minimalistMode}
              scenarioModes={scenarioModes}
              selectedScenarioId={selectedScenarioId}
              scenarioModeOpen={scenarioModeOpen}
              onScenarioModeOpenChange={setScenarioModeOpen}
              onScenarioModeSelect={setSelectedScenarioId}
              onScenarioModeCreate={() => setScenarioCreateOpen(true)}
              onScenarioModeEdit={handleOpenEditScenarioMode}
              onScenarioModeDelete={handleDeleteScenarioMode}
              onWeatherUpdate={setWeatherCode}
            />
        </div>
      )}
      {!roleSelectorOpen && freshMode && (
        <div className="fixed top-6 left-6 right-6 z-50 animate-in fade-in zoom-in duration-300">
          <TopNavBar 
            className=""
            hideWeather={false}
            variant="default"
            onSettingsClick={() => setSettingsOpen(true)}
            showScenarioMode={false}
            scenarioModes={scenarioModes}
            selectedScenarioId={selectedScenarioId}
            scenarioModeOpen={false}
            onScenarioModeOpenChange={() => {}}
            onScenarioModeSelect={() => {}}
            onScenarioModeCreate={() => {}}
            onScenarioModeEdit={() => {}}
            onScenarioModeDelete={() => {}}
          />
        </div>
      )}

      {/* Minimalist Mode Background */}
      {!roleSelectorOpen && minimalistMode && !freshMode && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img 
            src={wallpaperMode === 'custom' && customWallpaper ? customWallpaper : (bingWallpaper || imgImage)} 
            alt="Background" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Full Screen Wallpaper Overlay */}
      {!roleSelectorOpen && isWallpaperExpanded && (
        <div className="fixed inset-0 z-0 cursor-pointer" onClick={() => setIsWallpaperExpanded(false)}>
          <img src={bingWallpaper || imgImage} alt="Fullscreen Wallpaper" className="absolute w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/10" />
        </div>
      )}

      {/* 主要内容区域 */}
      {!roleSelectorOpen && (
        <div className="flex flex-col items-center mt-[32px] flex-1 w-full">
          <div className="w-[1000px] max-w-full flex flex-col items-stretch gap-[16px]">
          {!user && loginBannerVisible && (
            <motion.div className="w-full" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <LoginBanner 
                onLogin={handleRequestCloudLogin}
                onClose={() => { setLoginBannerVisible(false); sessionStorage.setItem('loginBannerDismissed', 'true'); }} 
              />
            </motion.div>
          )}

          {!minimalistMode && !freshMode ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 12 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full transform-gpu will-change-transform"
            >
              <WallpaperClock 
                time={time} date={date} lunar={lunar} wallpaperUrl={bingWallpaper}
                onSettingsClick={() => setSettingsOpen(true)}
                showScenarioMode={!minimalistMode} scenarioModes={scenarioModes}
                selectedScenarioId={selectedScenarioId} scenarioModeOpen={scenarioModeOpen}
                onScenarioModeOpenChange={setScenarioModeOpen} onScenarioModeSelect={setSelectedScenarioId}
                onScenarioModeCreate={() => setScenarioCreateOpen(true)} onScenarioModeEdit={handleOpenEditScenarioMode}
                onScenarioModeDelete={handleDeleteScenarioMode}
                wallpaperMode={wallpaperMode} onWallpaperModeChange={setWallpaperMode}
                weatherCode={weatherCode} onWeatherUpdate={setWeatherCode}
                bingWallpaper={bingWallpaper} customWallpaper={customWallpaper}
                onCustomWallpaperChange={setCustomWallpaper} timeFont={timeFont}
                onTimeFontChange={setTimeFont}
              />
            </motion.div>
          ) : (
            showTime && (
              <motion.div 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="w-full transform-gpu will-change-transform"
              >
                <InlineTime 
                  time={time} 
                  date={date} 
                  lunar={lunar} 
                  timeFont={timeFont} 
                  onTimeFontChange={setTimeFont}
                  isMinimalistMode={minimalistMode}
                  isFreshMode={freshMode}
                />
              </motion.div>
            )
          )}

          <motion.div 
            className="relative w-full z-20 transform-gpu will-change-transform" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.12 }}
          >
            <SearchBar 
              value={searchValue} onChange={handleSearchChange} onSubmit={handleSearch}
              searchEngine={searchEngine} onEngineClick={handleEngineClick} dropdownOpen={dropdownOpen}
              onEngineSelect={handleEngineSelect} dropdownRef={searchDropdownRef} suggestionItems={mergedSuggestionItems}
              historyOpen={historyOpen} onHistoryOpen={() => setHistoryOpen(true)}
              onSuggestionSelect={(item) => { setSearchValue(item.label); openSearchWithQuery(item.value); setHistoryOpen(false); }}
              onHistoryClear={() => setSearchHistory([])} onClear={() => setSearchValue('')}
              historyRef={searchAreaRef} placeholder={t('search.placeholderDynamic')}
              onKeyDown={handleSuggestionKeyDown} historySelectedIndex={historySelectedIndex} inputRef={searchInputRef} minimalistMode={minimalistMode}
            />
          </motion.div>

          {!minimalistMode && (
            <motion.div 
              className="relative w-full z-10 transform-gpu will-change-transform" 
              initial={{ opacity: 0, y: 24 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.24 }}
            >
              <ShortcutsCarousel 
                currentIndex={currentCarouselIndex}
                onIndexChange={handleCarouselIndexChange}
                pageIndices={pageIndices}
                height={shortcutsAreaHeight}
                shortcuts={shortcuts}
                rowsPerColumn={normalizedRowsPerColumn}
                cardVariant={shortcutCardVariant}
                compactShowTitle={shortcutCompactShowTitle}
                onShortcutOpen={handleShortcutOpen}
                onShortcutContextMenu={handleShortcutContextMenu}
                onPageReorder={handlePageReorder}
                onPageContextMenu={handlePageContextMenu}
              />
            </motion.div>
          )}
          </div>
        </div>
      )}

      {contextMenu && (
        <div ref={contextMenuRef} className="fixed z-50" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="bg-popover rounded-xl border border-border shadow-lg w-[160px] p-[6px]">
            {contextMenu.kind === 'shortcut' ? (
              <>
                <ContextMenuItem label={t('context.newShortcut')} onSelect={() => { const startPage = Math.floor(contextMenu.shortcutIndex / shortcutsPageCapacity); const result = findOrCreateAvailableIndex(startPage); if (result && result.targetIndex >= 0) { setShortcutModalMode('add'); setSelectedShortcut(null); setEditingTitle(''); setEditingUrl(''); setCurrentInsertIndex(result.targetIndex); setShortcutEditOpen(true); if (pageIndices.includes(result.targetPage)) setShortcutsPageIndex(result.targetPage); } else { toast.error(t('toast.shortcutCreateFailed')); } setContextMenu(null); }} />
                <ContextMenuItem label={t('context.open')} onSelect={() => { handleShortcutOpen(contextMenu.shortcut); setContextMenu(null); }} />
                <ContextMenuItem label={t('context.copyLink')} onSelect={() => { const raw = contextMenu.shortcut.url || ''; let hostname = extractDomainFromUrl(raw); if (!hostname) { try { const normalized = raw.includes('://') ? raw : `https://${raw}`; hostname = new URL(normalized).hostname; } catch { hostname = ''; } } if (!hostname) { toast.error(t('toast.linkCopyFailed')); setContextMenu(null); return; } navigator.clipboard.writeText(hostname).then(() => { toast.success(t('toast.linkCopied')); }).catch(() => { try { const textarea = document.createElement('textarea'); textarea.value = hostname; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea); toast.success(t('toast.linkCopied')); } catch { toast.error(t('toast.linkCopyFailed')); } }); setContextMenu(null); }} />
                <div className="relative" onMouseEnter={openMoveSub} onMouseLeave={() => scheduleCloseMoveSub()}>
                  <ContextMenuItem label={t('context.move')} onSelect={() => {}} iconRight={<RiArrowRightSLine className="size-4" />} />
                  {moveSubOpen && (
                    <div className="absolute left-full top-0 ml-2 bg-popover rounded-xl border border-border shadow-lg w-[160px] p-[6px]" onMouseEnter={openMoveSub} onMouseLeave={() => scheduleCloseMoveSub()}>
                      <ContextMenuItem
                        label={t('context.movePrevPage')}
                        onSelect={() => {
                          const sourceIndexById = shortcuts.findIndex((item) => item.id === contextMenu.shortcut.id);
                          const sourceIndex = sourceIndexById >= 0 ? sourceIndexById : contextMenu.shortcutIndex;
                          if (sourceIndex < 0 || sourceIndex >= shortcuts.length) return;
                          const page = Math.floor(sourceIndex / shortcutsPageCapacity);
                          const target = Math.max(0, page - 1);
                          if (page === 0) return;
                          moveShortcutToPage(sourceIndex, target, {
                            strict: true,
                            sourceShortcutId: contextMenu.shortcut.id,
                          });
                          setShortcutsPageIndex(target);
                          setContextMenu(null);
                          setMoveSubOpen(false);
                        }}
                        disabled={(() => {
                          const page = Math.floor(contextMenu.shortcutIndex / shortcutsPageCapacity);
                          return page <= 0;
                        })()}
                      />
                      <ContextMenuItem
                        label={t('context.moveNextPage')}
                        onSelect={() => {
                          const sourceIndexById = shortcuts.findIndex((item) => item.id === contextMenu.shortcut.id);
                          const sourceIndex = sourceIndexById >= 0 ? sourceIndexById : contextMenu.shortcutIndex;
                          if (sourceIndex < 0 || sourceIndex >= shortcuts.length) return;
                          const page = Math.floor(sourceIndex / shortcutsPageCapacity);
                          const target = page + 1;
                          const maxPage = getMaxPageIndex(shortcuts.length);
                          if (target > maxPage) return;
                          moveShortcutToPage(sourceIndex, target, {
                            strict: true,
                            sourceShortcutId: contextMenu.shortcut.id,
                          });
                          setShortcutsPageIndex(target);
                          setContextMenu(null);
                          setMoveSubOpen(false);
                        }}
                        disabled={(() => {
                          const page = Math.floor(contextMenu.shortcutIndex / shortcutsPageCapacity);
                          const maxPage = getMaxPageIndex(shortcuts.length);
                          return page >= maxPage;
                        })()}
                      />
                      <ContextMenuItem
                        label={t('context.moveToPage')}
                        onSelect={() => {
                          setMoveDialogData({
                            sourceIndex: contextMenu.shortcutIndex,
                            sourceShortcutId: contextMenu.shortcut.id,
                          });
                          setMoveDialogOpen(true);
                          setMoveSubOpen(false);
                          setContextMenu(null);
                        }}
                      />
                    </div>
                  )}
                </div>
                <ContextMenuItem label={t('context.edit')} onSelect={() => { setSelectedShortcut({ index: contextMenu.shortcutIndex, shortcut: contextMenu.shortcut }); setEditingTitle(contextMenu.shortcut.title); setEditingUrl(contextMenu.shortcut.url); setShortcutModalMode('edit'); setShortcutEditOpen(true); setContextMenu(null); }} />
                <ContextMenuItem label={t('context.delete')} onSelect={() => { setSelectedShortcut({ index: contextMenu.shortcutIndex, shortcut: contextMenu.shortcut }); setShortcutDeleteOpen(true); setContextMenu(null); }} variant="destructive" />
              </>
            ) : (
              <>
                <ContextMenuItem 
                label={t('context.addShortcut')} 
                onSelect={() => { 
                  const result = findOrCreateAvailableIndex(shortcutsPageIndex);
                  if (result && result.targetIndex >= 0) {
                    setShortcutModalMode('add'); setSelectedShortcut(null); setEditingTitle(''); setEditingUrl(''); setCurrentInsertIndex(result.targetIndex); setShortcutEditOpen(true); if (pageIndices.includes(result.targetPage)) setShortcutsPageIndex(result.targetPage);
                  } else {
                    toast.error(t('toast.shortcutCreateFailed'));
                  }
                  setContextMenu(null); 
                }} 
              />
                {contextMenu.kind === 'page' && (
                  <ContextMenuItem label={t('pageDelete.title')} variant="destructive" onSelect={() => { setPageDeleteOpen(true); setContextMenu(null); }} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      <AppDialogs
        movePageDialog={{
          open: moveDialogOpen,
          onOpenChange: setMoveDialogOpen,
          moveDialogData,
          getMaxPageIndex,
          shortcuts,
          shortcutsPageCapacity,
          moveShortcutToPage,
          onTargetPageSelected: setShortcutsPageIndex,
        }}
        shortcutModalProps={{
          isOpen: shortcutEditOpen,
          onOpenChange: (open) => {
            setShortcutEditOpen(open);
            if (!open) {
              setShortcutModalMode('add');
              setSelectedShortcut(null);
              setEditingTitle('');
              setEditingUrl('');
            }
          },
          mode: shortcutModalMode,
          initialTitle: editingTitle,
          initialUrl: editingUrl,
          initialIcon: selectedShortcut?.shortcut.icon || 'chatgpt',
          onSave: handleSaveShortcutEdit,
        }}
        shortcutDeleteDialogProps={{
          open: shortcutDeleteOpen,
          onOpenChange: setShortcutDeleteOpen,
          title: t('shortcutDelete.title'),
          description: t('shortcutDelete.description'),
          onConfirm: handleConfirmDeleteShortcut,
        }}
        scenarioCreateDialogProps={{
          open: scenarioCreateOpen,
          onOpenChange: setScenarioCreateOpen,
          onSubmit: handleCreateScenarioMode,
        }}
        scenarioEditDialogProps={{
          open: scenarioEditOpen,
          onOpenChange: setScenarioEditOpen,
          onSubmit: handleUpdateScenarioMode,
          title: t('scenario.editTitle'),
          submitText: t('common.save'),
          mode: scenarioEditMode,
        }}
        authModalProps={{
          isOpen: isAuthModalOpen,
          onOpenChange: setIsAuthModalOpen,
          onLoginSuccess: onLoginSuccess,
          apiServer,
          onApiServerChange: setApiServer,
          customApiUrl,
          customApiName,
          defaultApiBase,
          allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
        }}
        settingsModalProps={{
          isOpen: settingsOpen,
          onOpenChange: setSettingsOpen,
          username: user,
          onLogin: handleRequestCloudLogin,
          onLogout: handleLogoutWithOptions,
          shortcutsCount: totalShortcuts,
          minimalistMode,
          onMinimalistModeChange: setMinimalistMode,
          freshMode,
          onFreshModeChange: setFreshMode,
          displayMode,
          onDisplayModeChange: setDisplayMode,
          shortcutCardVariant,
          onShortcutCardVariantChange: setShortcutCardVariant,
          shortcutCompactShowTitle,
          onShortcutCompactShowTitleChange: setShortcutCompactShowTitle,
          shortcutsRowsPerColumn: normalizedRowsPerColumn,
          onShortcutsRowsPerColumnChange: handleShortcutsRowsPerColumnChange,
          openInNewTab,
          onOpenInNewTabChange: setOpenInNewTab,
          is24Hour,
          onIs24HourChange: setIs24Hour,
          showSeconds,
          onShowSecondsChange: setShowSeconds,
          showTime,
          onShowTimeChange: setShowTime,
          onExportData: handleExportData,
          onImportData: handleImportData,
          wallpaperMode,
          onWallpaperModeChange: setWallpaperMode,
          bingWallpaper,
          customWallpaper,
          onCustomWallpaperChange: setCustomWallpaper,
          weatherCode,
          privacyConsent,
          onPrivacyConsentChange: handlePrivacySwitchChange,
          onOpenAdminModal: handleOpenAdminModal,
          onOpenAboutModal: handleOpenAboutModal,
          onCloudSyncNow: triggerCloudSyncNow,
          onOpenWebdavConfig: handleOpenWebdavConfig,
          onWebdavSync: resolveWebdavConflict,
          onWebdavEnable: handleEnableWebdavSync,
          onWebdavDisable: handleDisableWebdavSync,
          onVersionClick: handleVersionTap,
        }}
        adminModalProps={{
          open: adminModalOpen,
          onOpenChange: setAdminModalOpen,
          onExportDomains: handleExportDomains,
          onFetchAdminStats: handleFetchAdminStats,
          weatherDebugEnabled: weatherDebugVisible,
          onWeatherDebugEnabledChange: handleWeatherDebugEnabledChange,
          customApiUrl,
          onCustomApiUrlChange: setCustomApiUrl,
          customApiName,
          onCustomApiNameChange: setCustomApiName,
          allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
        }}
        aboutModalProps={{
          open: aboutModalOpen,
          onOpenChange: setAboutModalOpen,
        }}
        webdavConfigDialogProps={{
          open: webdavDialogOpen,
          onOpenChange: (open: boolean) => {
            setWebdavDialogOpen(open);
            if (!open) {
              setWebdavEnableAfterConfigSave(false);
            }
          },
          enableAfterSave: webdavEnableAfterConfigSave,
          onEnableAfterSave: async () => {
            await handleEnableWebdavSync();
            setWebdavEnableAfterConfigSave(false);
          },
        }}
        confirmSyncDialog={{
          open: conflictModalOpen,
          onOpenChange: setConflictModalOpen,
          confirmChoice,
          onChoiceChange: setConfirmChoice,
          enableChoiceSwitch: true,
          title: t('syncConflict.title'),
          description: t('syncConflict.description'),
          confirmCloudLabel: t('syncConflict.useCloud'),
          confirmLocalLabel: t('syncConflict.useLocal'),
          confirmMergeLabel: t('syncConflict.merge'),
          cloudCount,
          cloudTime,
          cloudPayload: pendingCloudPayload,
          localCount,
          localTime,
          localPayload: pendingLocalPayload,
          onConfirm: handleConfirmCloudSyncChoice,
          onCancel: () => {
            setConflictModalOpen(false);
          },
        }}
        webdavConfirmSyncDialog={{
          open: webdavConfirmSyncOpen,
          onOpenChange: setWebdavConfirmSyncOpen,
          confirmChoice: webdavConfirmChoice,
          onChoiceChange: setWebdavConfirmChoice,
          enableChoiceSwitch: true,
          title: t('syncConflict.title'),
          description: t('syncConflict.description'),
          confirmCloudLabel: t('syncConflict.useCloud'),
          confirmLocalLabel: t('syncConflict.useLocal'),
          confirmMergeLabel: t('syncConflict.merge'),
          cloudCount: webdavCloudCount,
          cloudTime: webdavCloudTime,
          cloudPayload: webdavPendingRemotePayload,
          localCount: webdavLocalCount,
          localTime: webdavLocalTime,
          localPayload: webdavPendingLocalPayload,
          onConfirm: () => {
            void handleConfirmWebdavSyncChoice();
          },
          onCancel: () => {
            setWebdavConfirmSyncOpen(false);
          },
        }}
        importConfirmDialog={{
          open: importConfirmOpen,
          setOpen: setImportConfirmOpen,
          payload: importPendingPayload,
          setPayload: setImportPendingPayload,
          busy: importConfirmBusy,
          setBusy: setImportConfirmBusy,
          downloadCloudBackupEnvelope,
          applyUndoPayload,
          onSuccess: () => setSettingsOpen(false),
        }}
        pageDeleteDialogProps={{
          open: pageDeleteOpen,
          onOpenChange: setPageDeleteOpen,
          title: t('pageDelete.title'),
          description: t('pageDelete.description'),
          onConfirm: () => {
            handleDeletePage(shortcutsPageIndex);
            setPageDeleteOpen(false);
            setShortcutsPageIndex(Math.max(0, shortcutsPageIndex - 1));
          },
        }}
        disableConsentDialog={{
          open: confirmDisableConsentOpen,
          onOpenChange: setConfirmDisableConsentOpen,
          onAgree: () => {
            setConfirmDisableConsentOpen(false);
            handlePrivacyConsent(true);
          },
          onDisagree: () => {
            setConfirmDisableConsentOpen(false);
            handlePrivacyConsent(false);
          },
        }}
      />
      <UpdateAvailableDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        releaseUrl={releaseUrl}
        publishedAt={publishedAt}
        notes={updateNotes}
        onIgnoreCurrentVersion={ignoreCurrentRelease}
        onLater={snoozeCurrentRelease}
      />
      <Toaster />
      <RoleSelector 
        open={roleSelectorOpen} 
        onSelect={(role, id, layout) => {
          handleRoleSelect(role, id);
          if (layout) {
            setDisplayMode(layout);
          }
        }} 
      />
      <PrivacyConsentModal 
        isOpen={showPrivacyModal} 
        onConsent={handlePrivacyConsent} 
      />
      {weatherDebugVisible && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
          <div className="bg-popover border border-border rounded-xl p-2 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs text-muted-foreground">Weather Debug</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setWeatherDebugVisible(false);
                  try { sessionStorage.setItem('leaftab_weather_debug_visible', 'false'); } catch {}
                }}
                title="Close"
              >
                <RiCloseFill className="size-3.5" />
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => { setWallpaperMode('weather'); setWeatherCode(0); }}
                title="Sunny"
              >
                <RiSunFill className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => { setWallpaperMode('weather'); setWeatherCode(2); }}
                title="Cloudy"
              >
                <RiCloudFill className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => { setWallpaperMode('weather'); setWeatherCode(61); }}
                title="Rain"
              >
                <RiRainyFill className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => { setWallpaperMode('weather'); setWeatherCode(71); }}
                title="Snow"
              >
                <RiSnowyFill className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => { setWallpaperMode('weather'); setWeatherCode(95); }}
                title="Thunderstorm"
              >
                <RiThunderstormsFill className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineTime({ time, date, lunar, timeFont, onTimeFontChange, isMinimalistMode, isFreshMode }: { time: string; date: Date; lunar: string; timeFont: string; onTimeFontChange: (font: string) => void; isMinimalistMode: boolean; isFreshMode: boolean }) {
  const { i18n } = useTranslation();
  const [timeFontDialogOpen, setTimeFontDialogOpen] = useState(false);
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const dateString = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  return (
    <div className="relative w-full rounded-[28px] overflow-hidden group select-none">
      <div className="absolute inset-0 pointer-events-none opacity-0" />
      <div className="relative z-10 pointer-events-none transform-gpu flex flex-col items-center justify-center py-6">
        <button
          type="button"
          className={`${isMinimalistMode ? 'text-white text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]' : 'text-muted-foreground dark:text-foreground dark:text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]'} text-[100px] font-thin leading-none tracking-tight cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0`}
          style={{ fontFamily: timeFont }}
          onClick={() => setTimeFontDialogOpen(true)}
        >
          {time}
        </button>
        <TimeFontDialog
          open={timeFontDialogOpen}
          onOpenChange={setTimeFontDialogOpen}
          currentFont={timeFont}
          previewTime={time}
          onSelect={onTimeFontChange}
        />
        <div className={`flex items-center gap-3 text-base mt-2 font-['PingFang_SC',sans-serif] ${isMinimalistMode ? 'text-white/80' : 'text-muted-foreground'}`}>
          <span>{dateString} {weekday}</span>
          {lunar && <span>{lunar}</span>}
        </div>
      </div>
    </div>
  );
}
function ContextMenuItem({ label, onSelect, variant = 'default', disabled = false, iconRight }: { label: string; onSelect: () => void; variant?: 'default' | 'destructive'; disabled?: boolean; iconRight?: React.ReactNode }) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
        variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/15 dark:hover:bg-destructive/25 font-medium'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <span>{label}</span>
      {iconRight}
    </button>
  );
}
