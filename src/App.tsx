/// <reference types="chrome" />

import { Suspense, useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseFill,
  RiCloseLine,
  RiCloudFill,
  RiDeleteBinLine,
  RiFolderTransferLine,
  RiRainyFill,
  RiSnowyFill,
  RiSunFill,
  RiThunderstormsFill,
} from '@/icons/ri-compat';
import imgImage from "./assets/Default_wallpaper.webp?url";

// Hooks
import { useAuth } from './hooks/useAuth';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import { useWallpaper } from './hooks/useWallpaper';
import { useRole } from './hooks/useRole';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useWebdavSync, type ApplyImportedDataOptions, type WebdavConfig } from './hooks/useWebdavSync';
import { useWebdavAutoSync } from './hooks/useWebdavAutoSync';
import { useInitialReveal } from './hooks/useInitialReveal';
import { useNewtabBootstrapFocus } from './hooks/useNewtabBootstrapFocus';
import { useWallpaperRevealController } from './hooks/useWallpaperRevealController';
import { useVisualEffectsPolicy } from './hooks/useVisualEffectsPolicy';

// Components
import { TopNavBar } from './components/TopNavBar';
import ScenarioModeMenu from './components/ScenarioModeMenu';
import { Toaster, toast } from './components/ui/sonner';
import { Button } from "@/components/ui/button";
import { HomeMainContent } from './components/home/HomeMainContent';
import type { SearchInteractionState } from './components/search/SearchExperience';
import { extractDomainFromUrl, normalizeApiBase } from "./utils";
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';
import { readWebdavConfigFromStorage, WEBDAV_STORAGE_KEYS } from '@/utils/webdavConfig';
import { isWebdavAuthError } from '@/utils/webdavError';
import ConfirmDialog from './components/ConfirmDialog';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';
import {
  buildBackupDataV4,
  clampShortcutsRowsPerColumn,
  mergeWebdavPayload,
  type WebdavPayload,
} from './utils/backupData';
import { areSyncPayloadsEqual } from '@/sync/core';
import { createCloudSyncAdapter } from '@/hooks/cloudSync/cloudSyncAdapter';
import { useGithubReleaseUpdate } from './hooks/useGithubReleaseUpdate';
import { clampShortcutGridColumns } from '@/components/shortcuts/shortcutCardVariant';
import { getDisplayModeLayoutFlags } from '@/displayMode/config';
import { WallpaperMaskOverlay } from '@/components/wallpaper/WallpaperMaskOverlay';
import { getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
import type { AboutLeafTabModalTab } from '@/components/AboutLeafTabModal';
import { AppDialogs } from './components/AppDialogs';
import WallpaperSelector from './components/WallpaperSelector';
import { weatherVideoMap, sunnyWeatherVideo } from '@/components/wallpaper/weatherWallpapers';
import { WeatherLoopVideo } from '@/components/wallpaper/WeatherLoopVideo';
import {
  LazyRoleSelector,
  LazyUpdateAvailableDialog,
} from '@/lazy/components';
import { applyDynamicAccentColor, clearDynamicAccentColor, resolveDynamicAccentColor } from '@/utils/dynamicAccentColor';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import {
  INITIAL_REVEAL_TIMING,
  PANORAMIC_SURFACE_REVEAL_TIMING,
  resolveInitialRevealOpacity,
  resolveInitialRevealTransform,
} from '@/config/animationTokens';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

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
const LOGOUT_PRE_SYNC_MAX_WAIT_MS = 2200;
const INITIAL_SEARCH_FOCUS_RETRY_MS = 60;
const INITIAL_SEARCH_FOCUS_MAX_ATTEMPTS = 20;
const DARK_MODE_AUTO_DIM_OPACITY = 12;
const DARK_MODE_AUTO_DIM_OPACITY_CAP = 85;
const DYNAMIC_WALLPAPER_IDLE_FREEZE_MS = 4 * 60 * 1000;
type WebdavConflictChoice = 'cloud' | 'local' | 'merge';
type PersistedWebdavConflict = {
  localPayload: WebdavPayload;
  remotePayload: WebdavPayload;
  choice: WebdavConflictChoice;
};

const clampMaskOpacity = (value: number): number => {
  if (!Number.isFinite(value)) return 10;
  return Math.max(0, Math.min(100, value));
};

const resolveWallpaperMaskOpacityWithDarkModeAutoDim = (args: {
  userOpacity: number;
  isDarkTheme: boolean;
  autoDimEnabled: boolean;
}): number => {
  const { userOpacity, isDarkTheme, autoDimEnabled } = args;
  const safeUserOpacity = clampMaskOpacity(userOpacity);
  if (!isDarkTheme || !autoDimEnabled) return safeUserOpacity;
  if (safeUserOpacity >= DARK_MODE_AUTO_DIM_OPACITY_CAP) return safeUserOpacity;

  const userRatio = safeUserOpacity / 100;
  const autoDimRatio = DARK_MODE_AUTO_DIM_OPACITY / 100;
  const boostedRatio = 1 - (1 - userRatio) * (1 - autoDimRatio);
  const boostedOpacity = boostedRatio * 100;
  const cappedBoostedOpacity = Math.min(DARK_MODE_AUTO_DIM_OPACITY_CAP, boostedOpacity);
  return Math.max(safeUserOpacity, cappedBoostedOpacity);
};

function readAccentColorSetting(): string {
  try {
    const stored = (localStorage.getItem('accentColor') || '').trim();
    return stored || 'green';
  } catch {
    return 'green';
  }
}

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

const resolveEventTargetElement = (target: EventTarget | null): Element | null => {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  const element = resolveEventTargetElement(target);
  if (!element) return false;
  if (element instanceof HTMLElement && element.isContentEditable) return true;

  return Boolean(
    element.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  );
};

function useKeepMountedAfterFirstOpen(open: boolean) {
  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  return hasOpened || open;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const firefox = isFirefoxBuildTarget();
  const pageFocusRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let attempts = 0;
    let retryTimer: number | null = null;
    let rafId: number | null = null;

    const scheduleRetry = () => {
      if (attempts >= INITIAL_SEARCH_FOCUS_MAX_ATTEMPTS) return;
      if (retryTimer !== null) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        tryFocusSearchInput();
      }, INITIAL_SEARCH_FOCUS_RETRY_MS);
    };

    const tryFocusSearchInput = () => {
      attempts += 1;
      const input = searchInputRef.current;
      if (!input) {
        scheduleRetry();
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName?.toLowerCase() || '';
      const activeIsEditable = Boolean(
        activeElement
        && (
          activeElement.isContentEditable
          || activeTag === 'input'
          || activeTag === 'textarea'
          || activeTag === 'select'
        ),
      );
      if (activeElement && activeElement !== input && activeIsEditable) {
        return;
      }

      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }

      const cursor = input.value.length;
      try {
        input.setSelectionRange(cursor, cursor);
      } catch {}

      if (document.activeElement !== input) {
        scheduleRetry();
      }
    };

    rafId = window.requestAnimationFrame(() => {
      tryFocusSearchInput();
    });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, []);

  const [confirmChoice, setConfirmChoice] = useState<'cloud' | 'local' | 'merge' | null>('merge');
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
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [searchSettingsOpen, setSearchSettingsOpen] = useState(false);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const [shortcutStyleSettingsOpen, setShortcutStyleSettingsOpen] = useState(false);
  const [aboutModalDefaultTab, setAboutModalDefaultTab] = useState<AboutLeafTabModalTab>('about');
  const [wallpaperSettingsOpen, setWallpaperSettingsOpen] = useState(false);
  const [isQuickAccessDrawerExpanded, setIsQuickAccessDrawerExpanded] = useState(false);
  const [weatherDebugVisible, setWeatherDebugVisible] = useState(() => {
    try {
      return sessionStorage.getItem('leaftab_weather_debug_visible') === 'true';
    } catch {
      return false;
    }
  });
  const weatherDebugTapCountRef = useRef(0);
  const weatherDebugTapTimerRef = useRef<number | null>(null);
  const webdavEnableConflictRef = useRef<{
    config: WebdavConfig;
    localPayload: WebdavPayload;
    remotePayload: WebdavPayload;
  } | null>(null);
  const webdavConflictHydratedRef = useRef(false);
  useEffect(() => () => {
    if (weatherDebugTapTimerRef.current) window.clearTimeout(weatherDebugTapTimerRef.current);
  }, []);
  useEffect(() => {
    if (!webdavConflictHydratedRef.current) return;
    if (webdavPendingLocalPayload && webdavPendingRemotePayload) {
      const choice: WebdavConflictChoice = webdavConfirmChoice === 'cloud' || webdavConfirmChoice === 'merge' ? webdavConfirmChoice : 'merge';
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
    displayMode, setDisplayMode,
    openInNewTab, setOpenInNewTab,
    tabSwitchSearchEngine, setTabSwitchSearchEngine,
    searchPrefixEnabled, setSearchPrefixEnabled,
    searchSiteDirectEnabled, setSearchSiteDirectEnabled,
    searchSiteShortcutEnabled, setSearchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled, setSearchAnyKeyCaptureEnabled,
    searchCalculatorEnabled, setSearchCalculatorEnabled,
    preventDuplicateNewTab, setPreventDuplicateNewTab,
    is24Hour, setIs24Hour,
    showLunar, setShowLunar,
    timeAnimationMode, setTimeAnimationMode,
    timeFont, setTimeFont,
    showSeconds, setShowSeconds,
    visualEffectsLevel, setVisualEffectsLevel,
    showTime, setShowTime,
    shortcutCardVariant, setShortcutCardVariant,
    shortcutCompactShowTitle, setShortcutCompactShowTitle,
    shortcutGridColumns, setShortcutGridColumns,
    shortcutsRowsPerColumn, setShortcutsRowsPerColumn,
    privacyConsent, setPrivacyConsent,
    apiServer, setApiServer,
    customApiUrl, setCustomApiUrl,
    customApiName, setCustomApiName,
  } = useSettings();
  const visualEffectsPolicy = useVisualEffectsPolicy(visualEffectsLevel);
  const effectiveTimeAnimationEnabled = timeAnimationMode === 'on'
    ? true
    : timeAnimationMode === 'off'
      ? false
      : !visualEffectsPolicy.disableSecondTickMotion;
  const [isDynamicWallpaperIdleFrozen, setIsDynamicWallpaperIdleFrozen] = useState(false);
  const initialRevealReady = useInitialReveal(visualEffectsPolicy.disableInitialRevealMotion);
  const displayModeFlags = useMemo(() => getDisplayModeLayoutFlags(displayMode), [displayMode]);
  const responsiveLayout = useResponsiveLayout();

  useEffect(() => {
    let idleTimer: number | null = null;

    const clearIdleTimer = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const scheduleIdleFreeze = () => {
      clearIdleTimer();
      idleTimer = window.setTimeout(() => {
        setIsDynamicWallpaperIdleFrozen(true);
      }, DYNAMIC_WALLPAPER_IDLE_FREEZE_MS);
    };

    const markActive = () => {
      if (document.hidden) return;
      setIsDynamicWallpaperIdleFrozen(false);
      scheduleIdleFreeze();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearIdleTimer();
        setIsDynamicWallpaperIdleFrozen(true);
        return;
      }
      markActive();
    };

    markActive();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('wheel', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });
    window.addEventListener('keydown', markActive, true);

    return () => {
      clearIdleTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('wheel', markActive);
      window.removeEventListener('touchstart', markActive);
      window.removeEventListener('keydown', markActive, true);
    };
  }, []);

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
    latestVersion,
    releaseUrl,
    notes: updateNotes,
    snoozeCurrentRelease,
  } = useGithubReleaseUpdate(API_URL);

  const [searchInteractionState, setSearchInteractionState] = useState<SearchInteractionState>({
    historyOpen: false,
    dropdownOpen: false,
    typingBurst: false,
  });
  // Keep the lightweight engine switcher from downgrading the clock/wallpaper rendering.
  // Otherwise opening the menu flips the time between animated and plain rendering paths,
  // which is especially noticeable with decorative fonts like Pacifico.
  const searchPerformanceModeActive = searchInteractionState.historyOpen
    || searchInteractionState.typingBurst;
  const effectiveTopTimeAnimationEnabled = effectiveTimeAnimationEnabled && !searchPerformanceModeActive;
  const shouldFreezeDynamicWallpaper = visualEffectsPolicy.freezeDynamicWallpaper
    || isDynamicWallpaperIdleFrozen
    || searchPerformanceModeActive;

  const normalizedRowsPerColumn = clampShortcutsRowsPerColumn(shortcutsRowsPerColumn);
  const normalizedGridColumns = clampShortcutGridColumns(shortcutGridColumns, shortcutCardVariant, responsiveLayout.density);

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
    handleShortcutOpen, handleShortcutContextMenu, handleGridContextMenu,
    handleSaveShortcutEdit, handleConfirmDeleteShortcut, handleConfirmDeleteShortcuts,
    contextMenuRef,
    resolveWithCloud, resolveWithLocal, resolveWithMerge,
    applyUndoPayload,
    scenarioModeOpen, setScenarioModeOpen,
    scenarioCreateOpen, setScenarioCreateOpen,
    scenarioEditOpen, setScenarioEditOpen,
    handleShortcutReorder,
    resetLocalShortcutsByRole
  } = useShortcuts(
    user,
    openInNewTab,
    API_URL,
    handleLogout,
  );

  const [shortcutMultiSelectMode, setShortcutMultiSelectMode] = useState(false);
  const [selectedShortcutIndexes, setSelectedShortcutIndexes] = useState<number[]>([]);
  const [bulkShortcutDeleteOpen, setBulkShortcutDeleteOpen] = useState(false);
  const [multiSelectMoveOpen, setMultiSelectMoveOpen] = useState(false);
  const multiSelectMoveRef = useRef<HTMLDivElement>(null);
  const selectedShortcutIndexSet = useMemo(() => new Set(selectedShortcutIndexes), [selectedShortcutIndexes]);
  const selectedShortcutCount = selectedShortcutIndexes.length;
  const moveTargetScenarioModes = useMemo(
    () => scenarioModes.filter((mode) => mode.id !== selectedScenarioId),
    [scenarioModes, selectedScenarioId],
  );

  useEffect(() => {
    const handleSwitchScenarioShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.isComposing) return;
      if (!(event.metaKey || event.ctrlKey) || !event.altKey || event.shiftKey) return;
      const pressedScenarioHotkey = event.code === 'KeyS' || event.key.toLowerCase() === 's';
      if (!pressedScenarioHotkey) return;
      if (scenarioModes.length <= 1) return;

      const activeElement = document.activeElement;
      const activeElementIsSearchInput = activeElement === searchInputRef.current;
      const searchInputBusy = searchInteractionState.historyOpen
        || searchInteractionState.dropdownOpen
        || searchInteractionState.typingBurst;

      if (!activeElementIsSearchInput && (isEditableTarget(event.target) || isEditableTarget(activeElement))) return;
      if (activeElementIsSearchInput && searchInputBusy) return;

      const currentIndex = scenarioModes.findIndex((mode) => mode.id === selectedScenarioId);
      const nextMode = currentIndex < 0
        ? scenarioModes[0]
        : scenarioModes[(currentIndex + 1) % scenarioModes.length];
      if (!nextMode) return;

      event.preventDefault();
      setSelectedScenarioId(nextMode.id);
      toast(t('scenario.toast.switched', { name: nextMode.name }));
    };

    window.addEventListener('keydown', handleSwitchScenarioShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleSwitchScenarioShortcut, true);
    };
  }, [scenarioModes, searchInteractionState, selectedScenarioId, setSelectedScenarioId, t]);

  const clearShortcutMultiSelect = useCallback(() => {
    setShortcutMultiSelectMode(false);
    setSelectedShortcutIndexes([]);
    setBulkShortcutDeleteOpen(false);
    setMultiSelectMoveOpen(false);
  }, []);

  const openShortcutMultiSelect = useCallback((initialIndex?: number) => {
    setShortcutMultiSelectMode(true);
    if (typeof initialIndex === 'number' && initialIndex >= 0) {
      setSelectedShortcutIndexes([initialIndex]);
      return;
    }
    setSelectedShortcutIndexes([]);
  }, []);

  const toggleShortcutMultiSelect = useCallback((shortcutIndex: number) => {
    setSelectedShortcutIndexes((prev) => {
      if (prev.includes(shortcutIndex)) {
        return prev.filter((index) => index !== shortcutIndex);
      }
      return [...prev, shortcutIndex];
    });
  }, []);

  const requestBulkDeleteShortcuts = useCallback(() => {
    if (selectedShortcutCount <= 0) return;
    setBulkShortcutDeleteOpen(true);
    setContextMenu(null);
  }, [selectedShortcutCount, setContextMenu]);

  const handleConfirmBulkDeleteShortcuts = useCallback(() => {
    if (selectedShortcutIndexes.length === 0) return;
    handleConfirmDeleteShortcuts(selectedShortcutIndexes);
    setBulkShortcutDeleteOpen(false);
    setContextMenu(null);
    clearShortcutMultiSelect();
  }, [clearShortcutMultiSelect, handleConfirmDeleteShortcuts, selectedShortcutIndexes, setContextMenu]);

  const handlePinSelectedShortcuts = useCallback((position: 'top' | 'bottom') => {
    if (selectedShortcutIndexes.length === 0 || shortcuts.length === 0) return;
    const validIndices = Array.from(new Set(
      selectedShortcutIndexes
        .filter((index) => Number.isInteger(index) && index >= 0 && index < shortcuts.length),
    )).sort((a, b) => a - b);
    if (validIndices.length === 0) return;
    const selectedSet = new Set(validIndices);
    const selectedItems = validIndices.map((index) => shortcuts[index]);
    const remainingItems = shortcuts.filter((_, index) => !selectedSet.has(index));
    const nextShortcuts = position === 'top'
      ? [...selectedItems, ...remainingItems]
      : [...remainingItems, ...selectedItems];
    const nextSelectedIndexes = position === 'top'
      ? selectedItems.map((_, index) => index)
      : selectedItems.map((_, index) => remainingItems.length + index);
    handleShortcutReorder(nextShortcuts);
    setSelectedShortcutIndexes(nextSelectedIndexes);
    setContextMenu(null);
  }, [handleShortcutReorder, selectedShortcutIndexes, setContextMenu, shortcuts]);

  const handleMoveSelectedShortcutsToScenario = useCallback((targetScenarioId: string) => {
    if (!targetScenarioId || targetScenarioId === selectedScenarioId) return;
    if (selectedShortcutIndexes.length === 0) return;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const targetShortcuts = prev[targetScenarioId] ?? [];
      const validIndices = Array.from(new Set(
        selectedShortcutIndexes
          .filter((index) => Number.isInteger(index) && index >= 0 && index < sourceShortcuts.length),
      )).sort((a, b) => a - b);
      if (validIndices.length === 0) return prev;
      const selectedSet = new Set(validIndices);
      const movedShortcuts = validIndices.map((index) => sourceShortcuts[index]);
      const nextSourceShortcuts = sourceShortcuts.filter((_, index) => !selectedSet.has(index));
      const nextTargetShortcuts = [...targetShortcuts, ...movedShortcuts];
      return {
        ...prev,
        [selectedScenarioId]: nextSourceShortcuts,
        [targetScenarioId]: nextTargetShortcuts,
      };
    });
    if (!user) localDirtyRef.current = true;
    setMultiSelectMoveOpen(false);
    setContextMenu(null);
    clearShortcutMultiSelect();
  }, [clearShortcutMultiSelect, localDirtyRef, selectedScenarioId, selectedShortcutIndexes, setContextMenu, setScenarioShortcuts, user]);

  useEffect(() => {
    setSelectedShortcutIndexes((prev) => prev.filter((index) => index >= 0 && index < shortcuts.length));
  }, [shortcuts.length]);

  useEffect(() => {
    clearShortcutMultiSelect();
  }, [clearShortcutMultiSelect, selectedScenarioId]);

  useEffect(() => {
    if (conflictModalOpen && !confirmChoice) {
      setConfirmChoice('merge');
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

  const [accentColorSetting, setAccentColorSetting] = useState<string>(() => readAccentColorSetting());
  const [preventDuplicatePermissionRequestInFlight, setPreventDuplicatePermissionRequestInFlight] = useState(false);
  const handleSearchInteractionStateChange = useCallback((nextState: SearchInteractionState) => {
    setSearchInteractionState((prevState) => (
      prevState.historyOpen === nextState.historyOpen
      && prevState.dropdownOpen === nextState.dropdownOpen
      && prevState.typingBurst === nextState.typingBurst
    ) ? prevState : nextState);
  }, []);

  const handlePreventDuplicateNewTabChange = useCallback((checked: boolean) => {
    if (!checked) {
      setPreventDuplicateNewTab(false);
      return;
    }
    if (preventDuplicatePermissionRequestInFlight) return;

    setPreventDuplicatePermissionRequestInFlight(true);
    void ensureExtensionPermission('tabs')
      .then((granted) => {
        setPreventDuplicatePermissionRequestInFlight(false);
        if (!granted) {
          toast.error(t('settings.preventDuplicateNewTab.permissionDenied', {
            defaultValue: '未授予标签页权限，无法启用避免重复打开 LeafTab。',
          }));
          return;
        }
        setPreventDuplicateNewTab(true);
      })
      .catch(() => {
        setPreventDuplicatePermissionRequestInFlight(false);
        toast.error(t('settings.preventDuplicateNewTab.permissionFailed', {
          defaultValue: '申请标签页权限失败，请重试。',
        }));
      });
  }, [
    preventDuplicatePermissionRequestInFlight,
    setPreventDuplicateNewTab,
    t,
  ]);

  useEffect(() => {
    if (!preventDuplicateNewTab) return;

    let canceled = false;
    const syncTabsPermission = () => {
      void ensureExtensionPermission('tabs', { requestIfNeeded: false })
        .then((granted) => {
          if (canceled || granted) return;
          setPreventDuplicateNewTab(false);
        })
        .catch(() => {});
    };

    syncTabsPermission();

    const permissionsApi = globalThis.chrome?.permissions;
    if (!permissionsApi?.onAdded || !permissionsApi?.onRemoved) {
      return () => {
        canceled = true;
      };
    }

    const handlePermissionsChanged = () => {
      syncTabsPermission();
    };
    permissionsApi.onAdded.addListener(handlePermissionsChanged);
    permissionsApi.onRemoved.addListener(handlePermissionsChanged);
    return () => {
      canceled = true;
      permissionsApi.onAdded.removeListener(handlePermissionsChanged);
      permissionsApi.onRemoved.removeListener(handlePermissionsChanged);
    };
  }, [preventDuplicateNewTab, setPreventDuplicateNewTab]);

  useNewtabBootstrapFocus(pageFocusRef);

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
    isBingWallpaperRefreshing,
    refreshBingWallpaper,
    customWallpaperLoaded,
    customWallpaper, setCustomWallpaper,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    colorWallpaperId, setColorWallpaperId,
    wallpaperMaskOpacity, setWallpaperMaskOpacity,
    darkModeAutoDimWallpaperEnabled, setDarkModeAutoDimWallpaperEnabled,
  } = useWallpaper();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const effectiveWallpaperMaskOpacity = useMemo(() => (
    resolveWallpaperMaskOpacityWithDarkModeAutoDim({
      userOpacity: wallpaperMaskOpacity,
      isDarkTheme,
      autoDimEnabled: darkModeAutoDimWallpaperEnabled,
    })
  ), [darkModeAutoDimWallpaperEnabled, isDarkTheme, wallpaperMaskOpacity]);
  const effectiveWallpaperMode = firefox && wallpaperMode === 'weather' ? 'bing' : wallpaperMode;
  const freshWeatherVideo = weatherVideoMap[weatherCode] || sunnyWeatherVideo;
  const colorWallpaperGradient = getColorWallpaperGradient(colorWallpaperId);
  const freshWallpaperSrc = effectiveWallpaperMode === 'custom'
    ? (customWallpaper || '')
    : effectiveWallpaperMode === 'bing'
      ? bingWallpaper
      : (bingWallpaper || imgImage);

  useEffect(() => {
    document.documentElement.setAttribute('data-browser-target', firefox ? 'firefox' : 'chromium');
    return () => {
      document.documentElement.removeAttribute('data-browser-target');
    };
  }, [firefox]);

  useEffect(() => {
    if (firefox && wallpaperMode === 'weather') {
      setWallpaperMode('bing');
    }
  }, [firefox, wallpaperMode, setWallpaperMode]);

  useEffect(() => {
    const syncAccentColorSetting = () => {
      setAccentColorSetting(readAccentColorSetting());
    };
    window.addEventListener('leaftab-accent-color-changed', syncAccentColorSetting);
    return () => window.removeEventListener('leaftab-accent-color-changed', syncAccentColorSetting);
  }, []);

  useLayoutEffect(() => {
    if (accentColorSetting !== 'dynamic') {
      document.documentElement.setAttribute('data-accent-color', accentColorSetting);
      clearDynamicAccentColor();
      return;
    }

    let canceled = false;
    document.documentElement.setAttribute('data-accent-color', 'dynamic');
    resolveDynamicAccentColor({
      wallpaperMode: effectiveWallpaperMode,
      bingWallpaper,
      customWallpaper,
      weatherCode,
      colorWallpaperId,
    })
      .then((hex) => {
        if (canceled) return;
        applyDynamicAccentColor(hex);
      })
      .catch(() => {
        if (canceled) return;
        applyDynamicAccentColor('#3b82f6');
      });

    return () => {
      canceled = true;
    };
  }, [accentColorSetting, effectiveWallpaperMode, bingWallpaper, customWallpaper, weatherCode, colorWallpaperId]);

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

  const handleShortcutGridColumnsChange = useCallback((columns: number) => {
    setShortcutGridColumns(columns);
  }, [setShortcutGridColumns]);

  const handleShortcutsRowsPerColumnChange = useCallback((rows: number) => {
    setShortcutsRowsPerColumn(rows);
  }, [setShortcutsRowsPerColumn]);

  const handleOpenSearchSettings = useCallback(() => {
    setSearchSettingsOpen(true);
  }, []);

  const handleOpenShortcutStyleSettings = useCallback(() => {
    setShortcutStyleSettingsOpen(true);
  }, []);

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

  const clearWebdavEnableConflictState = useCallback((options?: { closeDialog?: boolean }) => {
    webdavEnableConflictRef.current = null;
    setWebdavConfirmChoice(null);
    setWebdavPendingLocalPayload(null);
    setWebdavPendingRemotePayload(null);
    clearPersistedWebdavConflict();
    if (options?.closeDialog !== false) {
      setWebdavConfirmSyncOpen(false);
    }
  }, []);

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
      clearWebdavEnableConflictState();
    }
  }, [applyImportedDataWithoutClose, clearWebdavEnableConflictState, emitWebdavSyncStatusChanged, markWebdavSyncError, markWebdavSyncSuccess, setWebdavSyncEnabledInStorage, t, uploadDataToWebdav, webdavPendingLocalPayload, webdavPendingRemotePayload]);

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
      setWebdavConfirmChoice('merge');
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

  const handleWebdavConfirmDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      setWebdavConfirmSyncOpen(true);
      return;
    }
    // For first-conflict onboarding, user must choose one option before leaving this dialog.
    setWebdavConfirmSyncOpen(true);
  }, []);

  const handleCancelWebdavConfirmDialog = useCallback(() => {
    // Keep dialog open: conflict decision is required.
    setWebdavConfirmSyncOpen(true);
  }, []);

  const webdavConflictPending = Boolean(webdavPendingLocalPayload && webdavPendingRemotePayload);

  const { resolveWebdavConflict } = useWebdavAutoSync({
    conflictModalOpen: conflictModalOpen || cloudConflictPending || webdavConflictPending,
    isDragging,
    buildLocalPayload: buildLocalWebdavPayload,
    uploadToWebdav: handleWebdavUpload,
    uploadDataToWebdav,
    fetchWebdavData,
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
    const hasPendingSync = localStorage.getItem('leaf_tab_sync_pending') === 'true' || localDirtyRef.current;
    if (!hasPendingSync) return true;
    try {
      const payload = {
        version: 3 as const,
        scenarioModes,
        selectedScenarioId,
        scenarioShortcuts,
      };
      const adapter = createCloudSyncAdapter({
        API_URL,
        token,
        normalizeCloudShortcutsPayload: () => null,
      });
      let pushResult = await adapter.push(payload, {
        mode: 'prefer_local',
      });
      if (!pushResult.ok && pushResult.status === 409) {
        const retryPull = await adapter.pull();
        if (retryPull.status === 401 || retryPull.status === 403) {
          return false;
        }
        const retryExpectedVersion = Number.isFinite(retryPull.version as number)
          ? Number(retryPull.version)
          : undefined;
        pushResult = await adapter.push(payload, {
          expectedVersion: retryExpectedVersion,
          mode: 'prefer_local',
        });
      }
      if (pushResult.ok) {
        try {
          localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
          localStorage.removeItem('leaf_tab_sync_pending');
        } catch {}
      }
      return pushResult.ok;
    } catch {
      return false;
    }
  }, [API_URL, localDirtyRef, scenarioModes, scenarioShortcuts, selectedScenarioId, user]);
  const handleLogoutWithOptions = useCallback(async (options?: { clearLocal?: boolean }) => {
    const shouldClearLocal = options?.clearLocal === true;
    const syncTask = syncLocalToCloudBeforeLogout();
    const syncedBeforeLogout = await Promise.race<boolean>([
      syncTask,
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(false), LOGOUT_PRE_SYNC_MAX_WAIT_MS);
      }),
    ]);
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
          void syncTask.then((syncedEventually) => {
            if (!syncedEventually) return;
            clearLocalNeedsCloudReconcile();
            localDirtyRef.current = false;
          });
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
      const viewerUrl = new URL('admin-domains-viewer.html', `${window.location.origin}/`);
      viewerUrl.searchParams.set('api', API_URL);
      viewerUrl.searchParams.set('lang', i18n.language || 'en');
      const opened = window.open(viewerUrl.toString(), '_blank', 'noopener,noreferrer');
      if (!opened) {
        toast.error(t('settings.iconAssistant.viewerOpenFailed', { defaultValue: t('settings.iconAssistant.downloadFailed') }));
      }
    } catch (e) {
      toast.error(t('settings.iconAssistant.viewerOpenFailed', { defaultValue: t('settings.iconAssistant.downloadFailed') }));
    }
  }, [API_URL, i18n.language, t]);

  const handleOpenAdminModal = useCallback(() => {
    setSettingsOpen(false);
    setAdminModalOpen(true);
  }, [setSettingsOpen]);

  const handleOpenAboutModal = useCallback((tab: AboutLeafTabModalTab = 'about') => {
    setSettingsOpen(false);
    setAboutModalDefaultTab(tab);
    setAboutModalOpen(true);
  }, [setSettingsOpen]);

  const handleWeatherDebugEnabledChange = useCallback((enabled: boolean) => {
    setWeatherDebugVisible(enabled);
    try { sessionStorage.setItem('leaftab_weather_debug_visible', enabled ? 'true' : 'false'); } catch {}
  }, []);

  const displayRows = Math.max(
    Math.ceil(shortcuts.length / Math.max(normalizedGridColumns, 1)),
    normalizedRowsPerColumn,
  );
  const shortcutRowHeight = shortcutCardVariant === 'compact'
    ? (responsiveLayout.compactShortcutSize + 24)
    : (responsiveLayout.defaultShortcutIconSize + responsiveLayout.defaultShortcutVerticalPadding * 2);
  const shortcutRowGap = shortcutCardVariant === 'compact' ? responsiveLayout.compactRowGap : responsiveLayout.defaultRowGap;
  const shortcutsAreaHeight = displayRows * shortcutRowHeight + Math.max(0, displayRows - 1) * shortcutRowGap;

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu, contextMenuRef, setContextMenu]);

  useEffect(() => {
    if (!multiSelectMoveOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (multiSelectMoveRef.current && !multiSelectMoveRef.current.contains(event.target as Node)) {
        setMultiSelectMoveOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [multiSelectMoveOpen]);

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
  const modeLayersVisible = !roleSelectorOpen && displayMode !== 'panoramic';
  const showOverlayWallpaperLayer = modeLayersVisible && displayModeFlags.showOverlayBackground;
  const overlayBackgroundImageSrc = displayMode === 'fresh'
    ? freshWallpaperSrc
    : effectiveWallpaperMode === 'custom'
      ? (customWallpaper || '')
      : effectiveWallpaperMode === 'bing'
        ? bingWallpaper
        : (bingWallpaper || imgImage);
  const usesImageWallpaperLayer = effectiveWallpaperMode !== 'weather' && effectiveWallpaperMode !== 'color';
  const overlayBackgroundAlt = displayMode === 'fresh' ? 'Rhythm Wallpaper' : 'Background';
  const {
    effectiveOverlayWallpaperSrc,
    wallpaperAnimatedLayerStyle,
    handleOverlayImageReady,
  } = useWallpaperRevealController({
    wallpaperMode: effectiveWallpaperMode,
    overlayBackgroundImageSrc,
    usesImageWallpaperLayer,
    showOverlayWallpaperLayer,
    hasWeatherVisual: effectiveWallpaperMode === 'weather' && Boolean(freshWeatherVideo),
    disableRevealAnimation: visualEffectsPolicy.disableWallpaperRevealMotion,
  });
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);
  const handleScenarioModeCreate = useCallback(() => {
    setScenarioCreateOpen(true);
  }, [setScenarioCreateOpen]);
  const handleDismissLoginBanner = useCallback(() => {
    setLoginBannerVisible(false);
    sessionStorage.setItem('loginBannerDismissed', 'true');
  }, [setLoginBannerVisible]);
  const scenarioMenuLayerProps = useMemo(() => ({
    scenarioModes,
    selectedScenarioId,
    open: scenarioModeOpen,
    onOpenChange: setScenarioModeOpen,
    onSelect: setSelectedScenarioId,
    onCreate: handleScenarioModeCreate,
    onEdit: handleOpenEditScenarioMode,
    onDelete: handleDeleteScenarioMode,
  }), [
    handleDeleteScenarioMode,
    handleOpenEditScenarioMode,
    handleScenarioModeCreate,
    scenarioModeOpen,
    scenarioModes,
    selectedScenarioId,
    setScenarioModeOpen,
    setSelectedScenarioId,
  ]);
  const wallpaperSelectorLayerProps = useMemo(() => ({
    mode: effectiveWallpaperMode,
    onModeChange: setWallpaperMode,
    bingWallpaper,
    isBingWallpaperRefreshing,
    onRefreshBingWallpaper: refreshBingWallpaper,
    weatherCode,
    customWallpaper,
    onCustomWallpaperChange: setCustomWallpaper,
    colorWallpaperId,
    onColorWallpaperIdChange: setColorWallpaperId,
    wallpaperMaskOpacity,
    effectiveWallpaperMaskOpacity,
    onWallpaperMaskOpacityChange: setWallpaperMaskOpacity,
    darkModeAutoDimWallpaperEnabled,
    onDarkModeAutoDimWallpaperEnabledChange: setDarkModeAutoDimWallpaperEnabled,
  }), [
    bingWallpaper,
    isBingWallpaperRefreshing,
    colorWallpaperId,
    customWallpaper,
    darkModeAutoDimWallpaperEnabled,
    effectiveWallpaperMaskOpacity,
    refreshBingWallpaper,
    setDarkModeAutoDimWallpaperEnabled,
    setColorWallpaperId,
    setCustomWallpaper,
    setWallpaperMaskOpacity,
    setWallpaperMode,
    wallpaperMaskOpacity,
    effectiveWallpaperMode,
    weatherCode,
  ]);
  const topNavModeProps = useMemo(() => ({
    fadeOnIdle: true,
    onSettingsClick: handleOpenSettings,
    onWeatherUpdate: setWeatherCode,
    reduceVisualEffects: visualEffectsPolicy.disableBackdropBlur,
    rightSlot: <ScenarioModeMenu {...scenarioMenuLayerProps} reduceVisualEffects={visualEffectsPolicy.disableBackdropBlur} />,
  }), [handleOpenSettings, scenarioMenuLayerProps, setWeatherCode, visualEffectsPolicy.disableBackdropBlur]);
  const wallpaperClockProps = useMemo(() => ({
    is24Hour,
    onIs24HourChange: setIs24Hour,
    showSeconds,
    onShowSecondsChange: setShowSeconds,
    showLunar,
    onShowLunarChange: setShowLunar,
    timeAnimationEnabled: effectiveTopTimeAnimationEnabled,
    onTimeAnimationModeChange: setTimeAnimationMode,
    bingWallpaperUrl: bingWallpaper,
    onSettingsClick: handleOpenSettings,
    showScenarioMode: true,
    scenarioModes,
    selectedScenarioId,
    scenarioModeOpen,
    onScenarioModeOpenChange: setScenarioModeOpen,
    onScenarioModeSelect: setSelectedScenarioId,
    onScenarioModeCreate: handleScenarioModeCreate,
    onScenarioModeEdit: handleOpenEditScenarioMode,
    onScenarioModeDelete: handleDeleteScenarioMode,
    wallpaperMode: effectiveWallpaperMode,
    weatherCode,
    onWeatherUpdate: setWeatherCode,
    customWallpaperLoaded,
    customWallpaper,
    colorWallpaperId,
    wallpaperMaskOpacity: effectiveWallpaperMaskOpacity,
    pauseDynamicWallpaper: shouldFreezeDynamicWallpaper,
    timeFont,
    onTimeFontChange: setTimeFont,
    layout: responsiveLayout,
    reduceTopControlsEffects: visualEffectsPolicy.disableBackdropBlur,
  }), [
    bingWallpaper,
    colorWallpaperId,
    customWallpaperLoaded,
    customWallpaper,
    handleDeleteScenarioMode,
    handleOpenEditScenarioMode,
    handleOpenSettings,
    handleScenarioModeCreate,
    is24Hour,
    responsiveLayout,
    scenarioModeOpen,
    scenarioModes,
    selectedScenarioId,
    setScenarioModeOpen,
    setSelectedScenarioId,
    setTimeFont,
    setWeatherCode,
    setIs24Hour,
    setShowLunar,
    setShowSeconds,
    setTimeAnimationMode,
    showSeconds,
    showLunar,
    timeFont,
    effectiveTopTimeAnimationEnabled,
    visualEffectsPolicy.disableBackdropBlur,
    effectiveWallpaperMaskOpacity,
    shouldFreezeDynamicWallpaper,
    effectiveWallpaperMode,
    weatherCode,
  ]);
  const searchExperienceProps = useMemo(() => ({
    inputRef: searchInputRef,
    openInNewTab,
    shortcuts,
    tabSwitchSearchEngine,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    disablePlaceholderAnimation: visualEffectsLevel === 'low',
    lightweightSearchUi: visualEffectsLevel === 'low',
    searchHeight: responsiveLayout.searchHeight,
    searchInputFontSize: responsiveLayout.searchInputFontSize,
    searchHorizontalPadding: responsiveLayout.searchHorizontalPadding,
    searchActionSize: responsiveLayout.searchActionSize,
    onInteractionStateChange: handleSearchInteractionStateChange,
  }), [
    handleSearchInteractionStateChange,
    openInNewTab,
    responsiveLayout.searchActionSize,
    responsiveLayout.searchHeight,
    responsiveLayout.searchHorizontalPadding,
    responsiveLayout.searchInputFontSize,
    shortcuts,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    tabSwitchSearchEngine,
    visualEffectsLevel,
  ]);
  const shortcutGridProps = useMemo(() => ({
    containerHeight: shortcutsAreaHeight,
    bottomInset: 0,
    shortcuts,
    gridColumns: normalizedGridColumns,
    minRows: normalizedRowsPerColumn,
    cardVariant: shortcutCardVariant,
    layoutDensity: responsiveLayout.density,
    compactIconSize: responsiveLayout.compactShortcutSize,
    compactTitleFontSize: responsiveLayout.compactShortcutTitleSize,
    defaultIconSize: responsiveLayout.defaultShortcutIconSize,
    defaultTitleFontSize: responsiveLayout.defaultShortcutTitleSize,
    defaultUrlFontSize: responsiveLayout.defaultShortcutUrlSize,
    defaultVerticalPadding: responsiveLayout.defaultShortcutVerticalPadding,
    compactShowTitle: shortcutCompactShowTitle,
    disableReorderAnimation: visualEffectsPolicy.disableShortcutReorderMotion,
    onShortcutOpen: handleShortcutOpen,
    onShortcutContextMenu: handleShortcutContextMenu,
    onShortcutReorder: handleShortcutReorder,
    onGridContextMenu: handleGridContextMenu,
    selectionMode: shortcutMultiSelectMode,
    selectedShortcutIndexes: selectedShortcutIndexSet,
    onToggleShortcutSelection: toggleShortcutMultiSelect,
  }), [
    handleGridContextMenu,
    handleShortcutContextMenu,
    handleShortcutOpen,
    handleShortcutReorder,
    normalizedGridColumns,
    normalizedRowsPerColumn,
    responsiveLayout.compactShortcutSize,
    responsiveLayout.compactShortcutTitleSize,
    responsiveLayout.defaultRowGap,
    responsiveLayout.defaultShortcutIconSize,
    responsiveLayout.defaultShortcutTitleSize,
    responsiveLayout.defaultShortcutUrlSize,
    responsiveLayout.defaultShortcutVerticalPadding,
    responsiveLayout.density,
    selectedShortcutIndexSet,
    shortcutCardVariant,
    shortcutCompactShowTitle,
    shortcutMultiSelectMode,
    shortcuts,
    shortcutsAreaHeight,
    toggleShortcutMultiSelect,
    visualEffectsPolicy.disableShortcutReorderMotion,
  ]);
  const initialRevealTransform = resolveInitialRevealTransform(initialRevealReady);
  const initialRevealOpacity = resolveInitialRevealOpacity(initialRevealReady);
  const initialRevealTiming = INITIAL_REVEAL_TIMING;
  const overlayWallpaperLayer = useMemo(() => {
    if (!showOverlayWallpaperLayer) return null;

    return (
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          top: '-2px',
          right: '-2px',
          bottom: '-2px',
          left: '-2px',
          backgroundColor: 'var(--initial-reveal-surface)',
          backfaceVisibility: 'hidden',
        }}
      >
        <div className="absolute inset-0" style={wallpaperAnimatedLayerStyle}>
          {effectiveWallpaperMode === 'weather' ? (
            <WeatherLoopVideo src={freshWeatherVideo} paused={shouldFreezeDynamicWallpaper} />
          ) : effectiveWallpaperMode === 'color' ? (
            <div className="absolute w-full h-full" style={{ backgroundImage: colorWallpaperGradient }} />
          ) : effectiveOverlayWallpaperSrc ? (
            <img
              src={effectiveOverlayWallpaperSrc}
              alt={overlayBackgroundAlt}
              className="absolute w-full h-full object-cover"
              onLoad={handleOverlayImageReady}
              onError={handleOverlayImageReady}
            />
          ) : null}
          <WallpaperMaskOverlay opacity={effectiveWallpaperMaskOpacity} />
        </div>
      </div>
    );
  }, [
    colorWallpaperGradient,
    effectiveOverlayWallpaperSrc,
    effectiveWallpaperMaskOpacity,
    freshWeatherVideo,
    handleOverlayImageReady,
    overlayBackgroundAlt,
    shouldFreezeDynamicWallpaper,
    showOverlayWallpaperLayer,
    wallpaperAnimatedLayerStyle,
    effectiveWallpaperMode,
  ]);
  const fixedTopNavLayer = useMemo(() => {
    if (!(modeLayersVisible && displayModeFlags.showInlineTopNav)) return null;

    return (
      <div
        className="fixed top-6 left-6 right-6 z-50"
        style={{
          opacity: initialRevealOpacity,
          transform: initialRevealTransform,
          transition: `opacity ${initialRevealTiming}, transform ${initialRevealTiming}`,
        }}
      >
        <TopNavBar {...topNavModeProps} />
      </div>
    );
  }, [
    displayModeFlags.showInlineTopNav,
    initialRevealOpacity,
    initialRevealTiming,
    initialRevealTransform,
    modeLayersVisible,
    topNavModeProps,
  ]);
  const panoramicSurfaceRevealStyle: CSSProperties = {
    backgroundColor: initialRevealReady ? 'var(--background)' : 'var(--initial-reveal-surface)',
    transition: `background-color ${PANORAMIC_SURFACE_REVEAL_TIMING}`,
  };
  const shouldMountWallpaperSelector = useKeepMountedAfterFirstOpen(wallpaperSettingsOpen);
  const shouldMountUpdateDialog = useKeepMountedAfterFirstOpen(updateDialogOpen);

  return (
    <div
      ref={pageFocusRef}
      tabIndex={-1}
      className={`${showOverlayWallpaperLayer ? 'bg-transparent' : 'bg-background'} relative w-full min-h-screen flex flex-col items-center overflow-x-hidden overflow-y-auto pb-[24px] focus:outline-none`}
      style={panoramicSurfaceRevealStyle}
    >
      {overlayWallpaperLayer}
      {fixedTopNavLayer}
      <HomeMainContent
        initialRevealReady={initialRevealReady}
        visible={!roleSelectorOpen}
        user={user}
        loginBannerVisible={loginBannerVisible}
        onLoginRequest={handleRequestCloudLogin}
        onDismissLoginBanner={handleDismissLoginBanner}
        modeFlags={displayModeFlags}
        showTime={showTime}
        displayMode={displayMode}
        is24Hour={is24Hour}
        onIs24HourChange={setIs24Hour}
        showSeconds={showSeconds}
        onShowSecondsChange={setShowSeconds}
        showLunar={showLunar}
        onShowLunarChange={setShowLunar}
        timeAnimationEnabled={effectiveTopTimeAnimationEnabled}
        onTimeAnimationModeChange={setTimeAnimationMode}
        timeFont={timeFont}
        onTimeFontChange={setTimeFont}
        layout={responsiveLayout}
        reduceMotionVisuals={visualEffectsLevel === 'low'}
        wallpaperClockProps={wallpaperClockProps}
        searchExperienceProps={searchExperienceProps}
        searchInteractionLocked={searchInteractionState.historyOpen || searchInteractionState.dropdownOpen}
        shortcutGridProps={shortcutGridProps}
        onDrawerExpandedChange={setIsQuickAccessDrawerExpanded}
      />
      {shouldMountWallpaperSelector ? (
        <WallpaperSelector
          {...wallpaperSelectorLayerProps}
          mode={effectiveWallpaperMode}
          hideWeather={displayMode === 'minimalist' || firefox}
          open={wallpaperSettingsOpen}
          onOpenChange={setWallpaperSettingsOpen}
          trigger={<span className="hidden" aria-hidden="true" />}
        />
      ) : null}

      {contextMenu && (
        <div ref={contextMenuRef} className="fixed z-[15020]" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="bg-popover rounded-[20px] border border-border shadow-lg w-[160px] p-[6px]">
            {contextMenu.kind === 'shortcut' ? (
              shortcutMultiSelectMode ? (
                <>
                  <ContextMenuItem
                    label={selectedShortcutIndexSet.has(contextMenu.shortcutIndex)
                      ? t('context.unselect', { defaultValue: '取消选择' })
                      : t('context.select', { defaultValue: '选择' })}
                    onSelect={() => {
                      toggleShortcutMultiSelect(contextMenu.shortcutIndex);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.deleteSelected', { defaultValue: '删除已选' })}
                    onSelect={requestBulkDeleteShortcuts}
                    variant="destructive"
                    disabled={selectedShortcutCount <= 0}
                  />
                  <ContextMenuItem
                    label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
                    onSelect={() => {
                      clearShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <ContextMenuItem label={t('context.newShortcut')} onSelect={() => { setShortcutModalMode('add'); setSelectedShortcut(null); setEditingTitle(''); setEditingUrl(''); setCurrentInsertIndex(Math.min(contextMenu.shortcutIndex + 1, shortcuts.length)); setShortcutEditOpen(true); setContextMenu(null); }} />
                  <ContextMenuItem label={t('context.open')} onSelect={() => { handleShortcutOpen(contextMenu.shortcut); setContextMenu(null); }} />
                  <ContextMenuItem label={t('context.copyLink')} onSelect={() => { const raw = contextMenu.shortcut.url || ''; let hostname = extractDomainFromUrl(raw); if (!hostname) { try { const normalized = raw.includes('://') ? raw : `https://${raw}`; hostname = new URL(normalized).hostname; } catch { hostname = ''; } } if (!hostname) { toast.error(t('toast.linkCopyFailed')); setContextMenu(null); return; } navigator.clipboard.writeText(hostname).then(() => { toast.success(t('toast.linkCopied')); }).catch(() => { try { const textarea = document.createElement('textarea'); textarea.value = hostname; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea); toast.success(t('toast.linkCopied')); } catch { toast.error(t('toast.linkCopyFailed')); } }); setContextMenu(null); }} />
                  <ContextMenuItem label={t('context.edit')} onSelect={() => { setSelectedShortcut({ index: contextMenu.shortcutIndex, shortcut: contextMenu.shortcut }); setEditingTitle(contextMenu.shortcut.title); setEditingUrl(contextMenu.shortcut.url); setShortcutModalMode('edit'); setShortcutEditOpen(true); setContextMenu(null); }} />
                  <ContextMenuItem
                    label={t('context.multiSelect', { defaultValue: '多选' })}
                    onSelect={() => {
                      openShortcutMultiSelect(contextMenu.shortcutIndex);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem label={t('context.delete')} onSelect={() => { setSelectedShortcut({ index: contextMenu.shortcutIndex, shortcut: contextMenu.shortcut }); setShortcutDeleteOpen(true); setContextMenu(null); }} variant="destructive" />
                </>
              )
            ) : (
              shortcutMultiSelectMode ? (
                <>
                  <ContextMenuItem
                    label={t('context.deleteSelected', { defaultValue: '删除已选' })}
                    onSelect={requestBulkDeleteShortcuts}
                    variant="destructive"
                    disabled={selectedShortcutCount <= 0}
                  />
                  <ContextMenuItem
                    label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
                    onSelect={() => {
                      clearShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <ContextMenuItem 
                    label={t('context.addShortcut')} 
                    onSelect={() => { 
                      setShortcutModalMode('add');
                      setSelectedShortcut(null);
                      setEditingTitle('');
                      setEditingUrl('');
                      setCurrentInsertIndex(shortcuts.length);
                      setShortcutEditOpen(true);
                      setContextMenu(null); 
                    }} 
                  />
                  <ContextMenuItem
                    label={t('context.multiSelect', { defaultValue: '多选' })}
                    onSelect={() => {
                      openShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              )
            )}
          </div>
        </div>
      )}

      {shortcutMultiSelectMode && (
        <div className="fixed bottom-6 left-1/2 z-[15025] -translate-x-1/2 rounded-full border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground min-w-[88px]">
              {t('context.selectedCount', { count: selectedShortcutCount, defaultValue: '已选 {{count}} 项' })}
            </span>
            <div ref={multiSelectMoveRef} className="relative">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-xl"
                title={t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                aria-label={t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                aria-expanded={multiSelectMoveOpen}
                onClick={() => setMultiSelectMoveOpen((prev) => !prev)}
              >
                <RiFolderTransferLine className="size-4" />
              </Button>
              {multiSelectMoveOpen ? (
                <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-[15050] w-[280px] -translate-x-1/2 rounded-2xl border border-border bg-popover/95 p-2 text-foreground shadow-2xl backdrop-blur-xl">
                  <div className="px-2 pb-1 pt-1 text-xs text-muted-foreground">
                    {t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                  </div>
                  <div className="max-h-[260px] space-y-1 overflow-y-auto">
                    {selectedShortcutCount <= 0 ? (
                      <div className="px-2 py-5 text-center text-sm text-muted-foreground">
                        {t('context.selectBeforeMove', { defaultValue: '请先选择快捷方式' })}
                      </div>
                    ) : null}
                    {selectedShortcutCount > 0 && moveTargetScenarioModes.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                        onClick={() => handleMoveSelectedShortcutsToScenario(mode.id)}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: mode.color || '#60a5fa' }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{mode.name}</span>
                      </button>
                    ))}
                    {selectedShortcutCount > 0 && moveTargetScenarioModes.length === 0 ? (
                      <div className="px-2 py-5 text-center text-sm text-muted-foreground">
                        {t('context.noScenarioTarget', { defaultValue: '暂无可移动的目标情景模式' })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              onClick={() => handlePinSelectedShortcuts('top')}
              disabled={selectedShortcutCount <= 0}
              title={t('context.pinTop', { defaultValue: '置顶已选' })}
              aria-label={t('context.pinTop', { defaultValue: '置顶已选' })}
            >
              <RiArrowUpLine className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              onClick={() => handlePinSelectedShortcuts('bottom')}
              disabled={selectedShortcutCount <= 0}
              title={t('context.pinBottom', { defaultValue: '置底已选' })}
              aria-label={t('context.pinBottom', { defaultValue: '置底已选' })}
            >
              <RiArrowDownLine className="size-4" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl"
              variant="secondary"
              onClick={requestBulkDeleteShortcuts}
              disabled={selectedShortcutCount <= 0}
              title={t('context.deleteSelected', { defaultValue: '删除已选' })}
              aria-label={t('context.deleteSelected', { defaultValue: '删除已选' })}
            >
              <RiDeleteBinLine className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              onClick={clearShortcutMultiSelect}
              title={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
              aria-label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
            >
              <RiCloseLine className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={bulkShortcutDeleteOpen}
        onOpenChange={setBulkShortcutDeleteOpen}
        title={t('shortcutDelete.bulkTitle', { count: selectedShortcutCount, defaultValue: '批量删除快捷方式' })}
        description={t('shortcutDelete.bulkDescription', {
          count: selectedShortcutCount,
          defaultValue: '确定要删除已选的 {{count}} 个快捷方式吗？',
        })}
        confirmText={t('shortcutDelete.confirm')}
        cancelText={t('shortcutDelete.cancel')}
        onConfirm={handleConfirmBulkDeleteShortcuts}
        confirmButtonClassName="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
      />

      <AppDialogs
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
              displayMode,
              onDisplayModeChange: setDisplayMode,
              shortcutCardVariant,
              onShortcutCardVariantChange: setShortcutCardVariant,
              shortcutCompactShowTitle,
              onShortcutCompactShowTitleChange: setShortcutCompactShowTitle,
              shortcutGridColumns: normalizedGridColumns,
              onShortcutGridColumnsChange: handleShortcutGridColumnsChange,
              openInNewTab,
              onOpenInNewTabChange: setOpenInNewTab,
              preventDuplicateNewTab,
              onPreventDuplicateNewTabChange: handlePreventDuplicateNewTabChange,
              onOpenSearchSettings: handleOpenSearchSettings,
              visualEffectsLevel,
              onVisualEffectsLevelChange: setVisualEffectsLevel,
              disableSyncCardAccentAnimation: visualEffectsPolicy.disableSyncCardAccentAnimation,
              showTime,
              onShowTimeChange: setShowTime,
              onExportData: handleExportData,
              onImportData: handleImportData,
              wallpaperMode: effectiveWallpaperMode,
              onWallpaperModeChange: setWallpaperMode,
              bingWallpaper,
              customWallpaper,
              onCustomWallpaperChange: setCustomWallpaper,
              weatherCode,
              colorWallpaperId,
              onColorWallpaperIdChange: setColorWallpaperId,
              wallpaperMaskOpacity,
              onWallpaperMaskOpacityChange: setWallpaperMaskOpacity,
	              onOpenWallpaperSettings: () => setWallpaperSettingsOpen(true),
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
	              onOpenShortcutGuide: () => setShortcutGuideOpen(true),
	              onOpenShortcutStyleSettings: handleOpenShortcutStyleSettings,
	            }}
	            searchSettingsModalProps={{
	              isOpen: searchSettingsOpen,
	              onOpenChange: setSearchSettingsOpen,
	              tabSwitchSearchEngine,
	              onTabSwitchSearchEngineChange: setTabSwitchSearchEngine,
	              searchPrefixEnabled,
	              onSearchPrefixEnabledChange: setSearchPrefixEnabled,
	              searchSiteDirectEnabled,
	              onSearchSiteDirectEnabledChange: setSearchSiteDirectEnabled,
	              searchSiteShortcutEnabled,
	              onSearchSiteShortcutEnabledChange: setSearchSiteShortcutEnabled,
	              searchAnyKeyCaptureEnabled,
	              onSearchAnyKeyCaptureEnabledChange: setSearchAnyKeyCaptureEnabled,
	              searchCalculatorEnabled,
	              onSearchCalculatorEnabledChange: setSearchCalculatorEnabled,
	            }}
	            shortcutGuideDialogProps={{
	              open: shortcutGuideOpen,
	              onOpenChange: setShortcutGuideOpen,
	            }}
	            shortcutStyleSettingsDialogProps={{
	              open: shortcutStyleSettingsOpen,
	              onOpenChange: setShortcutStyleSettingsOpen,
	              variant: shortcutCardVariant,
              compactShowTitle: shortcutCompactShowTitle,
              columns: normalizedGridColumns,
              onSave: ({ variant, compactShowTitle, columns }) => {
                setShortcutCardVariant(variant);
                setShortcutCompactShowTitle(compactShowTitle);
                handleShortcutGridColumnsChange(columns);
              },
            }}
            adminModalProps={{
              open: adminModalOpen,
              onOpenChange: setAdminModalOpen,
              onExportDomains: handleExportDomains,
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
              defaultTab: aboutModalDefaultTab,
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
              requireDecision: true,
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
              onOpenChange: handleWebdavConfirmDialogOpenChange,
              confirmChoice: webdavConfirmChoice,
              onChoiceChange: setWebdavConfirmChoice,
              enableChoiceSwitch: true,
              requireDecision: true,
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
              onCancel: handleCancelWebdavConfirmDialog,
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
      {shouldMountUpdateDialog ? (
        <Suspense fallback={null}>
          <LazyUpdateAvailableDialog
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            latestVersion={latestVersion}
            releaseUrl={releaseUrl}
            notes={updateNotes}
            onLater={snoozeCurrentRelease}
          />
        </Suspense>
      ) : null}
      <Toaster />
      {roleSelectorOpen ? (
        <Suspense fallback={null}>
          <LazyRoleSelector
            open={roleSelectorOpen}
            onSelect={(role, id, layout) => {
              handleRoleSelect(role, id);
              if (layout) {
                setDisplayMode(layout);
              }
            }}
          />
        </Suspense>
      ) : null}
      <PrivacyConsentModal 
        isOpen={showPrivacyModal} 
        onConsent={handlePrivacyConsent} 
      />
      {weatherDebugVisible && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[15030] pointer-events-auto flex flex-col gap-2">
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
