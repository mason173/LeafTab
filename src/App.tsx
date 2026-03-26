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
import { saveWallpaper } from './db';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import { useWallpaper } from './hooks/useWallpaper';
import { useRole } from './hooks/useRole';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import {
  LEAFTAB_SYNC_ANALYSIS_CACHE_MAX_AGE_MS,
  useLeafTabSyncEngine,
} from './hooks/useLeafTabSyncEngine';
import { useLeafTabWebdavAutoSync } from './hooks/useLeafTabWebdavAutoSync';
import { useLongTaskIndicator } from './hooks/useLongTaskIndicator';
import { useInitialReveal } from './hooks/useInitialReveal';
import { useNewtabBootstrapFocus } from './hooks/useNewtabBootstrapFocus';
import { useWallpaperRevealController } from './hooks/useWallpaperRevealController';
import { useVisualEffectsPolicy } from './hooks/useVisualEffectsPolicy';
import { useLeafTabSnapshotBridge } from './hooks/useLeafTabSnapshotBridge';
import { useLeafTabSyncRunner, type LeafTabSyncRunnerOptionsBase } from './hooks/useLeafTabSyncRunner';
import { useLeafTabSyncEncryptionManager } from './hooks/useLeafTabSyncEncryptionManager';
import { useLeafTabBackupActions } from './hooks/useLeafTabBackupActions';
import { useSyncCenterActions } from './hooks/useSyncCenterActions';
import { useLeafTabLegacyCompat } from './hooks/useLeafTabLegacyCompat';

// Components
import ScenarioModeMenu from './components/ScenarioModeMenu';
import { Toaster, toast } from './components/ui/sonner';
import { Button } from "@/components/ui/button";
import type { ScenarioShortcuts, SyncablePreferences } from './types';
import { extractDomainFromUrl, normalizeApiBase } from "./utils";
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfilePreferences, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';
import { LongTaskIndicator } from './components/LongTaskIndicator';
import {
  hasWebdavUrlConfiguredFromStorage,
  isWebdavSyncEnabledFromStorage,
  readWebdavConfigFromStorage,
  WEBDAV_STORAGE_KEYS,
} from '@/utils/webdavConfig';
import { isWebdavAuthError } from '@/utils/webdavError';
import {
  CLOUD_SYNC_STORAGE_KEYS,
  emitCloudSyncStatusChanged,
  readCloudSyncConfigFromStorage,
} from '@/utils/cloudSyncConfig';
import ConfirmDialog from './components/ConfirmDialog';
import { ENABLE_CUSTOM_API_SERVER, IS_STORE_BUILD } from '@/config/distribution';
import {
  clampShortcutsRowsPerColumn,
} from './utils/backupData';
import { useGithubReleaseUpdate } from './hooks/useGithubReleaseUpdate';
import { clampShortcutGridColumns } from '@/components/shortcuts/shortcutCardVariant';
import { getDisplayModeLayoutFlags } from '@/displayMode/config';
import { getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
import type { AboutLeafTabModalTab } from '@/components/AboutLeafTabModal';
import { weatherVideoMap, sunnyWeatherVideo } from '@/components/wallpaper/weatherWallpapers';
import { HomeInteractiveSurface } from '@/components/home/HomeInteractiveSurface';
import { ShortcutSelectionShell } from '@/components/home/ShortcutSelectionShell';
import {
  LazyAppDialogs,
  LazyLeafTabSyncDialog,
  LazyLeafTabSyncEncryptionDialog,
  LazyRoleSelector,
  LazyUpdateAvailableDialog,
  LazyWallpaperSelector,
} from '@/lazy/components';
import { applyDynamicAccentColor, clearDynamicAccentColor, resolveDynamicAccentColor } from '@/utils/dynamicAccentColor';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import {
  PANORAMIC_SURFACE_REVEAL_TIMING,
} from '@/config/animationTokens';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { getAlignedJitteredNextAt, resolveInitialAlignedJitteredTargetAt } from '@/sync/schedule';
import {
  LeafTabSyncBookmarksDisabledRemoteStore,
  LeafTabSyncCloudEncryptedTransport,
  LeafTabSyncCloudRemoteStoreError,
  LeafTabSyncEncryptedRemoteStore,
  LeafTabSyncWebdavEncryptedTransport,
  LeafTabSyncWebdavStore,
  formatLeafTabBookmarkSyncScopeLabel,
  mergeLeafTabSyncSnapshotWithBookmarks,
  type LeafTabSyncEngineResult,
  type LeafTabSyncInitialChoice,
  type LeafTabSyncSnapshot,
  normalizeLeafTabSyncSnapshot,
  readLeafTabBookmarkSyncScope,
} from '@/sync/leaftab';
import type { WebdavConfig } from '@/types/webdav';
import {
  createLeafTabCloudEncryptionScopeKey,
  createLeafTabWebdavEncryptionScopeKey,
  hasLeafTabSyncEncryptionConfig,
} from '@/utils/leafTabSyncEncryption';
import {
  emitSyncablePreferencesApplied,
  normalizeSyncablePreferences,
  readSyncablePreferencesFromStorage,
  writeSyncablePreferencesToStorage,
} from '@/utils/syncablePreferences';

type WebdavLeafTabSyncOptions = LeafTabSyncRunnerOptionsBase & {
  enableAfterSuccess?: boolean;
};

type CloudLeafTabSyncOptions = LeafTabSyncRunnerOptionsBase & {
  mode?: LeafTabSyncInitialChoice | 'auto';
  allowWhenDisabled?: boolean;
  retryAfterForceUnlock?: boolean;
  retryAfterConflictRefresh?: boolean;
  _retriedAfterForceUnlock?: boolean;
  _retriedAfterConflictRefresh?: boolean;
};

const formatLeafTabSyncErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const status = Number((error as { status?: unknown }).status);
    const operation = String((error as { operation?: unknown }).operation || '');
    const relativePath = String((error as { relativePath?: unknown }).relativePath || '');
    if (Number.isInteger(status) && status > 0 && operation) {
      const actionLabel = operation === 'mkcol'
        ? '创建目录'
        : operation === 'upload'
          ? '写入'
          : operation === 'download'
            ? '读取'
            : operation === 'delete'
              ? '删除'
              : operation;

      return relativePath
        ? `WebDAV ${actionLabel}失败（${status}）：${relativePath}`
        : `WebDAV ${actionLabel}失败（${status}）`;
    }
  }

  return String((error as Error)?.message || 'LeafTab sync failed');
};

const isCloudSyncLockConflictError = (error: unknown) => {
  return error instanceof LeafTabSyncCloudRemoteStoreError
    && error.status === 409
    && /lock is held by another device/i.test(error.message || '');
};

const isCloudSyncCommitConflictError = (error: unknown) => {
  return error instanceof LeafTabSyncCloudRemoteStoreError
    && error.status === 409
    && (
      /remote commit changed/i.test(error.message || '')
      || /parent commit required/i.test(error.message || '')
    );
};

const formatCloudSyncErrorMessage = (error: unknown) => {
  if (error instanceof LeafTabSyncCloudRemoteStoreError) {
    if (error.status === 409) {
      if (/lock is held by another device/i.test(error.message || '')) {
        return '云同步被旧设备锁定，已尝试自动修复；如果仍失败请再试一次';
      }
      if (/remote commit changed/i.test(error.message || '')) {
        return '云端数据刚刚发生变化，请重新同步一次';
      }
      if (/parent commit required/i.test(error.message || '')) {
        return '云端已有新版本，请先拉取最新数据后再覆盖';
      }
    }

    return error.message || `云同步失败（${error.status}）`;
  }

  return String((error as Error)?.message || '云同步失败');
};

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

const LEAFTAB_SYNC_DEFAULT_ROOT_PATH = 'leaftab/v1';
const LEAFTAB_CLOUD_SYNC_BASELINE_PREFIX = 'leaftab_cloud_sync_v1_baseline';
const LOGOUT_PRE_SYNC_MAX_WAIT_MS = 2200;
const CLOUD_AUTO_SYNC_BUSY_RETRY_DELAY_MS = 5 * 1000;
const CLOUD_AUTO_SYNC_FAILURE_RETRY_DELAY_MS = 15 * 1000;
const LONG_TASK_INDICATOR_DELAY_MS = 180;
const INITIAL_SEARCH_FOCUS_RETRY_MS = 60;
const INITIAL_SEARCH_FOCUS_MAX_ATTEMPTS = 20;
const DARK_MODE_AUTO_DIM_OPACITY = 12;
const DARK_MODE_AUTO_DIM_OPACITY_CAP = 85;
const DYNAMIC_WALLPAPER_IDLE_FREEZE_MS = 4 * 60 * 1000;
const resolveLeafTabSyncRootPath = (config: WebdavConfig | null) => {
  const rawPath = (config?.filePath || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!rawPath) return LEAFTAB_SYNC_DEFAULT_ROOT_PATH;

  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length <= 1) return LEAFTAB_SYNC_DEFAULT_ROOT_PATH;
  segments.pop();
  return `${segments.join('/')}/${LEAFTAB_SYNC_DEFAULT_ROOT_PATH}`;
};

const createLeafTabSyncBaselineStorageKey = (rootPath: string) => {
  const suffix = (rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH).replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `leaftab_sync_v1_baseline:${suffix}`;
};

const createLeafTabCloudBaselineStorageKey = (username: string | null) => {
  const suffix = (username || 'anonymous').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${LEAFTAB_CLOUD_SYNC_BASELINE_PREFIX}:${suffix}`;
};

const getOrCreateLeafTabSyncDeviceId = (storageKey = 'leaftab_sync_v1_device_id') => {
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

const readLeafTabSyncBaselineSnapshot = (storageKey: string): LeafTabSyncSnapshot | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: LeafTabSyncSnapshot };
    return normalizeLeafTabSyncSnapshot(parsed?.snapshot || null);
  } catch {
    return null;
  }
};

const formatLeafTabSyncTimestamp = (value: string | null | undefined) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

  const [confirmDisableConsentOpen, setConfirmDisableConsentOpen] = useState(false);
  const [confirmDisableWebdavSyncOpen, setConfirmDisableWebdavSyncOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [confirmLegacyCloudMigrationOpen, setConfirmLegacyCloudMigrationOpen] = useState(false);
  const [cloudSyncConfigOpen, setCloudSyncConfigOpen] = useState(false);
  const [cloudSyncConfigVersion, setCloudSyncConfigVersion] = useState(0);
  const [cloudLoginSyncPendingUser, setCloudLoginSyncPendingUser] = useState<string | null>(null);
  const [syncEncryptionVersion, setSyncEncryptionVersion] = useState(0);
  const [webdavDialogOpen, setWebdavDialogOpen] = useState(false);
  const [webdavEnableAfterConfigSave, setWebdavEnableAfterConfigSave] = useState(false);
  const [leafTabSyncDialogOpen, setLeafTabSyncDialogOpen] = useState(false);
  const [leafTabSyncConfigVersion, setLeafTabSyncConfigVersion] = useState(0);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [searchSettingsOpen, setSearchSettingsOpen] = useState(false);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const [shortcutStyleSettingsOpen, setShortcutStyleSettingsOpen] = useState(false);
  const [aboutModalDefaultTab, setAboutModalDefaultTab] = useState<AboutLeafTabModalTab>('about');
  const [wallpaperSettingsOpen, setWallpaperSettingsOpen] = useState(false);
  const [weatherDebugVisible, setWeatherDebugVisible] = useState(() => {
    try {
      return sessionStorage.getItem('leaftab_weather_debug_visible') === 'true';
    } catch {
      return false;
    }
  });
  const weatherDebugTapCountRef = useRef(0);
  const weatherDebugTapTimerRef = useRef<number | null>(null);
  const legacyCloudMigrationResolverRef = useRef<((value: boolean) => void) | null>(null);
  const openLeafTabSyncConfig = useCallback(() => {
    setWebdavEnableAfterConfigSave(false);
    setWebdavDialogOpen(true);
  }, []);
  useEffect(() => () => {
    if (weatherDebugTapTimerRef.current) window.clearTimeout(weatherDebugTapTimerRef.current);
  }, []);
  useEffect(() => {
    const handleCloudConfigChanged = () => {
      setCloudSyncConfigVersion((value) => value + 1);
    };
    const handleWebdavConfigChanged = () => {
      setLeafTabSyncConfigVersion((value) => value + 1);
    };
    const handleSyncEncryptionChanged = () => {
      setSyncEncryptionVersion((value) => value + 1);
    };
    window.addEventListener('cloud-sync-config-changed', handleCloudConfigChanged);
    window.addEventListener('cloud-sync-status-changed', handleCloudConfigChanged);
    window.addEventListener('webdav-config-changed', handleWebdavConfigChanged);
    window.addEventListener('webdav-sync-status-changed', handleWebdavConfigChanged);
    window.addEventListener('leaftab-sync-encryption-changed', handleSyncEncryptionChanged);
    return () => {
      window.removeEventListener('cloud-sync-config-changed', handleCloudConfigChanged);
      window.removeEventListener('cloud-sync-status-changed', handleCloudConfigChanged);
      window.removeEventListener('webdav-config-changed', handleWebdavConfigChanged);
      window.removeEventListener('webdav-sync-status-changed', handleWebdavConfigChanged);
      window.removeEventListener('leaftab-sync-encryption-changed', handleSyncEncryptionChanged);
    };
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
    searchRotatingPlaceholderEnabled, setSearchRotatingPlaceholderEnabled,
    preventDuplicateNewTab, setPreventDuplicateNewTab,
    is24Hour, setIs24Hour,
    showDate, setShowDate,
    showWeekday, setShowWeekday,
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
  const {
    task: longTaskIndicator,
    startTask: startLongTaskIndicator,
    updateTask: updateLongTaskIndicator,
    finishTask: finishLongTaskIndicator,
    clearTask: clearLongTaskIndicator,
  } = useLongTaskIndicator();
  const [isDynamicWallpaperIdleFrozen, setIsDynamicWallpaperIdleFrozen] = useState(false);
  const initialRevealReady = useInitialReveal(visualEffectsPolicy.disableInitialRevealMotion);
  const displayModeFlags = useMemo(() => getDisplayModeLayoutFlags(displayMode), [displayMode]);
  const responsiveLayout = useResponsiveLayout();
  const leafTabSyncDeviceId = useMemo(() => getOrCreateLeafTabSyncDeviceId(), []);

  const runLongTask = useCallback(async (
    initial: {
      title: string;
      detail?: string;
      progress?: number;
    },
    runner: (helpers: {
      update: (options: {
        title?: string;
        detail?: string;
        progress?: number;
      }) => void;
    }) => Promise<any>,
  ) => {
    let taskId: string | null = null;
    let latestState = { ...initial };
    const startTaskIfNeeded = () => {
      if (taskId) return;
      taskId = startLongTaskIndicator(latestState);
    };
    const startTimer = globalThis.setTimeout(() => {
      startTaskIfNeeded();
    }, LONG_TASK_INDICATOR_DELAY_MS);
    try {
      const result = await runner({
        update: (options) => {
          latestState = {
            ...latestState,
            title: typeof options.title === 'string' ? options.title : latestState.title,
            detail: typeof options.detail === 'string' ? options.detail : latestState.detail,
            progress: typeof options.progress === 'number' ? options.progress : latestState.progress,
          };
          if (taskId) {
            updateLongTaskIndicator(taskId, options);
          }
        },
      });
      globalThis.clearTimeout(startTimer);
      if (taskId) {
        finishLongTaskIndicator(taskId);
      }
      return result;
    } catch (error) {
      globalThis.clearTimeout(startTimer);
      if (taskId) {
        clearLongTaskIndicator(taskId);
      }
      throw error;
    }
  }, [
    clearLongTaskIndicator,
    finishLongTaskIndicator,
    startLongTaskIndicator,
    updateLongTaskIndicator,
  ]);

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

  const normalizedRowsPerColumn = clampShortcutsRowsPerColumn(shortcutsRowsPerColumn);
  const normalizedGridColumns = clampShortcutGridColumns(shortcutGridColumns, shortcutCardVariant, responsiveLayout.density);

  const {
    scenarioModes, setScenarioModes,
    selectedScenarioId, setSelectedScenarioId,
    scenarioShortcuts, setScenarioShortcuts,
    userRole, setUserRole,
    totalShortcuts,
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
    {
      legacyCloudRuntimeEnabled: false,
    },
  );

  const handlePinSelectedShortcuts = useCallback((selectedShortcutIndexes: number[], position: 'top' | 'bottom') => {
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
    return nextSelectedIndexes;
  }, [handleShortcutReorder, shortcuts]);

  const handleMoveSelectedShortcutsToScenario = useCallback((selectedShortcutIndexes: number[], targetScenarioId: string) => {
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
  }, [localDirtyRef, selectedScenarioId, setScenarioShortcuts, user]);

  const [accentColorSetting, setAccentColorSetting] = useState<string>(() => readAccentColorSetting());
  const [preventDuplicatePermissionRequestInFlight, setPreventDuplicatePermissionRequestInFlight] = useState(false);

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
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  const buildSyncablePreferencesSnapshot = useCallback((): SyncablePreferences => {
    const stored = readSyncablePreferencesFromStorage();
    return normalizeSyncablePreferences({
      ...stored,
      displayMode,
      openInNewTab,
      searchTabSwitchEngine: tabSwitchSearchEngine,
      searchPrefixEnabled,
      searchSiteDirectEnabled,
      searchSiteShortcutEnabled,
      searchAnyKeyCaptureEnabled,
      searchCalculatorEnabled,
      searchRotatingPlaceholderEnabled,
      preventDuplicateNewTab,
      is24Hour,
      showDate,
      showWeekday,
      showLunar,
      timeAnimationMode,
      timeFont,
      showSeconds,
      visualEffectsLevel,
      showTime,
      shortcutCardVariant,
      shortcutCompactShowTitle,
      shortcutGridColumnsByVariant: {
        ...stored.shortcutGridColumnsByVariant,
        [shortcutCardVariant]: normalizedGridColumns,
      },
      shortcutsRowsPerColumn: normalizedRowsPerColumn,
      privacyConsent,
      theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : stored.theme,
      language: (i18n.language || stored.language || 'zh').trim() || 'zh',
      accentColor: accentColorSetting,
      wallpaperMode: wallpaperMode === 'custom' ? null : wallpaperMode,
      wallpaperMaskOpacity,
      darkModeAutoDimWallpaperEnabled,
      colorWallpaperId,
    });
  }, [
    accentColorSetting,
    colorWallpaperId,
    darkModeAutoDimWallpaperEnabled,
    displayMode,
    i18n.language,
    is24Hour,
    normalizedGridColumns,
    normalizedRowsPerColumn,
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
    theme,
    timeAnimationMode,
    timeFont,
    visualEffectsLevel,
    wallpaperMaskOpacity,
    wallpaperMode,
  ]);

  const applySyncablePreferencesSnapshot = useCallback(async (preferences: SyncablePreferences | null) => {
    if (!preferences) return;
    const normalized = normalizeSyncablePreferences(preferences);
    writeSyncablePreferencesToStorage(normalized);

    setDisplayMode(normalized.displayMode);
    setOpenInNewTab(normalized.openInNewTab);
    setTabSwitchSearchEngine(normalized.searchTabSwitchEngine);
    setSearchPrefixEnabled(normalized.searchPrefixEnabled);
    setSearchSiteDirectEnabled(normalized.searchSiteDirectEnabled);
    setSearchSiteShortcutEnabled(normalized.searchSiteShortcutEnabled);
    setSearchAnyKeyCaptureEnabled(normalized.searchAnyKeyCaptureEnabled);
    setSearchCalculatorEnabled(normalized.searchCalculatorEnabled);
    setSearchRotatingPlaceholderEnabled(normalized.searchRotatingPlaceholderEnabled);
    setPreventDuplicateNewTab(normalized.preventDuplicateNewTab);
    setIs24Hour(normalized.is24Hour);
    setShowDate(normalized.showDate);
    setShowWeekday(normalized.showWeekday);
    setShowLunar(normalized.showLunar);
    setTimeAnimationMode(normalized.timeAnimationMode);
    setTimeFont(normalized.timeFont);
    setShowSeconds(normalized.showSeconds);
    setVisualEffectsLevel(normalized.visualEffectsLevel);
    setShowTime(normalized.showTime);
    setShortcutCardVariant(normalized.shortcutCardVariant);
    setShortcutCompactShowTitle(normalized.shortcutCompactShowTitle);
    setShortcutGridColumns(normalized.shortcutGridColumnsByVariant[normalized.shortcutCardVariant]);
    setShortcutsRowsPerColumn(normalized.shortcutsRowsPerColumn);
    setPrivacyConsent(normalized.privacyConsent);

    if (theme !== normalized.theme) {
      setTheme(normalized.theme);
    }
    if ((i18n.language || '').trim() !== normalized.language) {
      await i18n.changeLanguage(normalized.language);
    }

    setAccentColorSetting(normalized.accentColor);
    document.documentElement.setAttribute('data-accent-color', normalized.accentColor);
    window.dispatchEvent(new Event('leaftab-accent-color-changed'));

    setWallpaperMaskOpacity(normalized.wallpaperMaskOpacity);
    setDarkModeAutoDimWallpaperEnabled(normalized.darkModeAutoDimWallpaperEnabled);
    setColorWallpaperId(normalized.colorWallpaperId);
    if (normalized.wallpaperMode) {
      setWallpaperMode(normalized.wallpaperMode);
    } else {
      const hasLocalCustomWallpaper = wallpaperMode === 'custom' && Boolean(customWallpaper);
      if (!hasLocalCustomWallpaper) {
        try {
          await saveWallpaper(imgImage);
        } catch {}
        setCustomWallpaper(imgImage);
        localStorage.setItem('wallpaperMode', 'custom');
        setWallpaperMode('custom');
      }
    }

    persistLocalProfilePreferences(normalized);
    emitSyncablePreferencesApplied(normalized);
  }, [
    customWallpaper,
    i18n,
    setTheme,
    setAccentColorSetting,
    setColorWallpaperId,
    setCustomWallpaper,
    setDarkModeAutoDimWallpaperEnabled,
    setDisplayMode,
    setIs24Hour,
    setOpenInNewTab,
    setPreventDuplicateNewTab,
    setPrivacyConsent,
    setSearchAnyKeyCaptureEnabled,
    setSearchCalculatorEnabled,
    setSearchPrefixEnabled,
    setSearchRotatingPlaceholderEnabled,
    setSearchSiteDirectEnabled,
    setSearchSiteShortcutEnabled,
    setShortcutCardVariant,
    setShortcutCompactShowTitle,
    setShortcutGridColumns,
    setShortcutsRowsPerColumn,
    setShowDate,
    setShowLunar,
    setShowSeconds,
    setShowTime,
    setShowWeekday,
    setTabSwitchSearchEngine,
    setTimeAnimationMode,
    setTimeFont,
    setVisualEffectsLevel,
    setWallpaperMaskOpacity,
    setWallpaperMode,
    theme,
    wallpaperMode,
  ]);

  useEffect(() => {
    persistLocalProfileSnapshot({
      scenarioModes,
      selectedScenarioId,
      scenarioShortcuts,
      preferences: buildSyncablePreferencesSnapshot(),
    });
  }, [
    buildSyncablePreferencesSnapshot,
    scenarioModes,
    scenarioShortcuts,
    selectedScenarioId,
  ]);

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
    setCloudLoginSyncPendingUser(username);
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

  const emitWebdavSyncStatusChanged = useCallback(() => {
    window.dispatchEvent(new Event('webdav-config-changed'));
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);

  const markCloudSyncSuccess = useCallback(() => {
    localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.lastSyncAt, new Date().toISOString());
    localStorage.removeItem('cloud_last_error_at');
    localStorage.removeItem('cloud_last_error_message');
    emitCloudSyncStatusChanged();
  }, []);

  const markCloudSyncError = useCallback((error: unknown) => {
    localStorage.setItem('cloud_last_error_at', new Date().toISOString());
    localStorage.setItem('cloud_last_error_message', String((error as Error)?.message || error || 'unknown'));
    emitCloudSyncStatusChanged();
  }, []);

  const setCloudNextSyncAt = useCallback((nextMs: number | null) => {
    if (nextMs && Number.isFinite(nextMs)) {
      localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt, new Date(nextMs).toISOString());
    } else {
      localStorage.removeItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt);
    }
    emitCloudSyncStatusChanged();
  }, []);

  const markWebdavSyncSuccess = useCallback(() => {
    localStorage.setItem('webdav_last_sync_at', new Date().toISOString());
    localStorage.removeItem('webdav_last_error_at');
    localStorage.removeItem('webdav_last_error_message');
    emitWebdavSyncStatusChanged();
  }, [emitWebdavSyncStatusChanged]);

  const markWebdavSyncError = useCallback((error: unknown) => {
    localStorage.setItem('webdav_last_error_at', new Date().toISOString());
    localStorage.setItem('webdav_last_error_message', String((error as any)?.message || 'unknown'));
    emitWebdavSyncStatusChanged();
  }, [emitWebdavSyncStatusChanged]);

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

  const leafTabSyncWebdavConfig = useMemo(() => {
    const config = readWebdavConfigFromStorage({ allowDisabled: true });
    if (!config?.url) return null;
    return {
      url: config.url,
      username: config.username,
      password: config.password,
      rootPath: resolveLeafTabSyncRootPath(config),
      requestPermission: true,
    };
  }, [leafTabSyncConfigVersion]);
  const leafTabSyncBaselineStorageKey = useMemo(() => {
    return createLeafTabSyncBaselineStorageKey(
      leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    );
  }, [leafTabSyncWebdavConfig?.rootPath]);
  const leafTabWebdavEncryptionScopeKey = useMemo(() => {
    return createLeafTabWebdavEncryptionScopeKey(
      leafTabSyncWebdavConfig?.url || '',
      leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    );
  }, [leafTabSyncWebdavConfig?.rootPath, leafTabSyncWebdavConfig?.url]);
  const leafTabWebdavEncryptionReady = useMemo(
    () => hasLeafTabSyncEncryptionConfig(leafTabWebdavEncryptionScopeKey),
    [leafTabWebdavEncryptionScopeKey, syncEncryptionVersion],
  );
  const leafTabWebdavBaseStore = useMemo(() => {
    if (!leafTabSyncWebdavConfig?.url) return null;
    return new LeafTabSyncWebdavStore({
      url: leafTabSyncWebdavConfig.url,
      username: leafTabSyncWebdavConfig.username,
      password: leafTabSyncWebdavConfig.password,
      rootPath: leafTabSyncWebdavConfig.rootPath,
      requestPermission: true,
    });
  }, [
    leafTabSyncWebdavConfig?.password,
    leafTabSyncWebdavConfig?.rootPath,
    leafTabSyncWebdavConfig?.url,
    leafTabSyncWebdavConfig?.username,
  ]);
  const leafTabWebdavEncryptedTransport = useMemo(() => {
    if (!leafTabWebdavBaseStore || !leafTabWebdavEncryptionScopeKey) return null;
    return new LeafTabSyncWebdavEncryptedTransport({
      webdavStore: leafTabWebdavBaseStore,
      rootPath: leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    });
  }, [
    leafTabSyncWebdavConfig?.rootPath,
    leafTabWebdavBaseStore,
    leafTabWebdavEncryptionScopeKey,
  ]);
  const leafTabSyncRemoteStore = useMemo(() => {
    if (!leafTabWebdavEncryptedTransport || !leafTabWebdavEncryptionScopeKey) return null;
    return new LeafTabSyncEncryptedRemoteStore({
      transport: leafTabWebdavEncryptedTransport,
      scopeKey: leafTabWebdavEncryptionScopeKey,
      scopeLabel: 'WebDAV 同步',
      rootPath: leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    });
  }, [
    leafTabSyncWebdavConfig?.rootPath,
    leafTabWebdavEncryptedTransport,
    leafTabWebdavEncryptionScopeKey,
  ]);
  const cloudSyncToken = useMemo(() => (
    user ? (localStorage.getItem('token') || '') : ''
  ), [user]);
  const cloudSyncConfig = useMemo(
    () => readCloudSyncConfigFromStorage(),
    [cloudSyncConfigVersion, user],
  );
  const cloudSyncBookmarksEnabled = cloudSyncConfig.syncBookmarksEnabled;
  const cloudSyncBaselineStorageKey = useMemo(
    () => createLeafTabCloudBaselineStorageKey(user),
    [user],
  );
  const cloudSyncEncryptionScopeKey = useMemo(
    () => createLeafTabCloudEncryptionScopeKey(user),
    [user],
  );
  const cloudSyncEncryptionReady = useMemo(
    () => hasLeafTabSyncEncryptionConfig(cloudSyncEncryptionScopeKey),
    [cloudSyncEncryptionScopeKey, syncEncryptionVersion],
  );
  const cloudSyncEncryptedTransport = useMemo(() => {
    if (!user || !cloudSyncToken) return null;
    return new LeafTabSyncCloudEncryptedTransport({
      apiUrl: API_URL,
      token: cloudSyncToken,
    });
  }, [API_URL, cloudSyncToken, user]);
  const cloudSyncRemoteStore = useMemo(() => {
    if (!cloudSyncEncryptedTransport || !cloudSyncEncryptionScopeKey) return null;
    return new LeafTabSyncEncryptedRemoteStore({
      transport: cloudSyncEncryptedTransport,
      scopeKey: cloudSyncEncryptionScopeKey,
      scopeLabel: '云同步',
      rootPath: LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    });
  }, [cloudSyncEncryptedTransport, cloudSyncEncryptionScopeKey]);
  const cloudSyncEffectiveRemoteStore = useMemo(() => {
    if (!cloudSyncRemoteStore) return null;
    if (cloudSyncBookmarksEnabled) return cloudSyncRemoteStore;
    return new LeafTabSyncBookmarksDisabledRemoteStore(cloudSyncRemoteStore);
  }, [cloudSyncBookmarksEnabled, cloudSyncRemoteStore]);

  const {
    webdavLegacyCompat,
    cloudLegacyCompat,
  } = useLeafTabLegacyCompat({
    apiUrl: API_URL,
    token: cloudSyncToken,
    user,
    webdavFilePath: leafTabSyncWebdavConfig?.filePath || null,
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
    unnamedScenarioLabel: t('scenario.unnamed'),
  });

  const leafTabBookmarkSyncScope = useMemo(() => readLeafTabBookmarkSyncScope(), []);
  const leafTabBookmarkSyncScopeLabel = useMemo(
    () => formatLeafTabBookmarkSyncScopeLabel(leafTabBookmarkSyncScope),
    [leafTabBookmarkSyncScope],
  );

  const {
    buildSnapshotFromCurrentState: buildLeafTabSyncSnapshotFromCurrentState,
    buildLocalSnapshot: buildLocalLeafTabSyncSnapshot,
    createEmptySnapshot: createEmptyLeafTabSyncSnapshot,
    applySnapshotToLocalState: applyLeafTabSyncSnapshotToLocalState,
    applySnapshot: applyLeafTabSyncSnapshot,
  } = useLeafTabSnapshotBridge({
    leafTabBookmarkSyncScope,
    leafTabSyncDeviceId,
    leafTabSyncBaselineStorageKey,
    cloudSyncBaselineStorageKey,
    scenarioModes,
    scenarioShortcuts,
    selectedScenarioId,
    user,
    localDirtyRef,
    buildPreferencesSnapshot: buildSyncablePreferencesSnapshot,
    applyPreferencesSnapshot: applySyncablePreferencesSnapshot,
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    readBaselineSnapshot: readLeafTabSyncBaselineSnapshot,
  });
  const buildCloudLeafTabSyncSnapshotWithScope = useCallback(async () => {
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: cloudSyncBaselineStorageKey,
      includeBookmarks: cloudSyncBookmarksEnabled,
    });
  }, [
    buildLeafTabSyncSnapshotFromCurrentState,
    cloudSyncBaselineStorageKey,
    cloudSyncBookmarksEnabled,
  ]);
  const applyCloudLeafTabSyncSnapshot = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    if (cloudSyncBookmarksEnabled) {
      await applyLeafTabSyncSnapshot(snapshot);
      return;
    }

    const localSnapshot = await buildLocalLeafTabSyncSnapshot();
    await applyLeafTabSyncSnapshot(
      mergeLeafTabSyncSnapshotWithBookmarks(snapshot, localSnapshot),
    );
  }, [
    applyLeafTabSyncSnapshot,
    buildLocalLeafTabSyncSnapshot,
    cloudSyncBookmarksEnabled,
  ]);
  const cloudSyncRunnerRef = useRef<(options?: CloudLeafTabSyncOptions) => Promise<unknown>>(async () => null);
  const {
    syncEncryptionDialogState,
    syncEncryptionDialogBusy,
    handleSyncEncryptionDialogOpenChange,
    handleSubmitSyncEncryptionDialog,
    ensureSyncEncryptionAccess,
    handleManageCloudSyncEncryption,
    resolveSyncEncryptionError,
  } = useLeafTabSyncEncryptionManager({
    setSettingsOpen,
    setLeafTabSyncDialogOpen,
    setWebdavDialogOpen,
    setCloudSyncConfigOpen,
    leafTabWebdavEncryptionScopeKey,
    leafTabWebdavEncryptedTransport,
    cloudSyncEncryptionScopeKey,
    cloudSyncEncryptedTransport,
  });

  const {
    importConfirmOpen,
    setImportConfirmOpen,
    importPendingPayload,
    setImportPendingPayload,
    importConfirmBusy,
    setImportConfirmBusy,
    exportBackupDialogOpen,
    setExportBackupDialogOpen,
    importBackupDialogOpen,
    importBackupScopePayload,
    handleImportBackupDialogOpenChange,
    handleImportBackupScopeConfirm,
    handleExportData,
    executeExportData,
    handleImportData,
    handleImportConfirmApply,
  } = useLeafTabBackupActions({
    API_URL,
    user,
    t,
    selectedScenarioId,
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    localDirtyRef,
    setSettingsOpen,
    runLongTask,
    buildSnapshotFromCurrentState: buildLeafTabSyncSnapshotFromCurrentState,
    applySnapshotToLocalState: applyLeafTabSyncSnapshotToLocalState,
    cloudSyncRunnerRef,
    leafTabBookmarkSyncScope,
    leafTabSyncRootPath: leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
  });

  const {
    analysis: leafTabSyncAnalysis,
    hasConfig: leafTabSyncHasConfig,
    isReady: leafTabSyncReady,
    lastResult: leafTabSyncLastResult,
    refreshAnalysis: refreshLeafTabSyncAnalysis,
    runSync: runLeafTabSync,
    syncState: leafTabSyncState,
  } = useLeafTabSyncEngine({
    deviceId: leafTabSyncDeviceId,
    webdav: null,
    remoteStore: leafTabSyncRemoteStore,
    legacyCompat: webdavLegacyCompat,
    buildLocalSnapshot: buildLocalLeafTabSyncSnapshot,
    applyLocalSnapshot: applyLeafTabSyncSnapshot,
    createEmptySnapshot: createEmptyLeafTabSyncSnapshot,
    baselineStorageKey: leafTabSyncBaselineStorageKey,
  });

  const {
    analysis: cloudLeafTabSyncAnalysis,
    hasConfig: cloudLeafTabSyncHasConfig,
    lastResult: cloudLeafTabSyncLastResult,
    refreshAnalysis: refreshCloudLeafTabSyncAnalysis,
    runSync: runCloudLeafTabSync,
    syncState: cloudLeafTabSyncState,
  } = useLeafTabSyncEngine({
    enabled: Boolean(user && cloudSyncToken),
    deviceId: leafTabSyncDeviceId,
    webdav: null,
    remoteStore: cloudSyncEffectiveRemoteStore,
    legacyCompat: cloudLegacyCompat,
    buildLocalSnapshot: buildCloudLeafTabSyncSnapshotWithScope,
    applyLocalSnapshot: applyCloudLeafTabSyncSnapshot,
    createEmptySnapshot: createEmptyLeafTabSyncSnapshot,
    baselineStorageKey: cloudSyncBaselineStorageKey,
  });

  const leafTabWebdavConfigured = useMemo(
    () => hasWebdavUrlConfiguredFromStorage(),
    [leafTabSyncConfigVersion, leafTabSyncState.lastSuccessAt, leafTabSyncState.lastErrorAt],
  );
  const leafTabWebdavEnabled = useMemo(
    () => isWebdavSyncEnabledFromStorage(),
    [leafTabSyncConfigVersion, leafTabSyncState.lastSuccessAt, leafTabSyncState.lastErrorAt],
  );
  const leafTabWebdavProfileLabel = useMemo(() => {
    const config = readWebdavConfigFromStorage({ allowDisabled: true });
    if (!config?.url) return '';
    try {
      return new URL(config.url).host;
    } catch {
      return config.url;
    }
  }, [leafTabSyncConfigVersion, leafTabSyncState.lastSuccessAt, leafTabSyncState.lastErrorAt]);
  const leafTabWebdavLastSyncLabel = useMemo(
    () => formatLeafTabSyncTimestamp(localStorage.getItem('webdav_last_sync_at')),
    [leafTabSyncConfigVersion, leafTabSyncState.lastSuccessAt],
  );
  const leafTabWebdavNextSyncLabel = useMemo(
    () => formatLeafTabSyncTimestamp(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt)),
    [leafTabSyncConfigVersion, leafTabSyncState.lastSuccessAt, leafTabSyncState.lastErrorAt],
  );
  const cloudSyncEnabled = useMemo(
    () => Boolean(user) && cloudSyncConfig.enabled,
    [cloudSyncConfig.enabled, user],
  );
  const cloudLastSyncLabel = useMemo(
    () => formatLeafTabSyncTimestamp(
      localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.lastSyncAt)
        || localStorage.getItem('cloud_shortcuts_updated_at'),
    ),
    [cloudLeafTabSyncState.lastSuccessAt, cloudSyncConfigVersion],
  );
  const cloudNextSyncLabel = useMemo(
    () => formatLeafTabSyncTimestamp(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt)),
    [cloudLeafTabSyncState.lastErrorAt, cloudLeafTabSyncState.lastSuccessAt, cloudSyncConfigVersion],
  );
  const runWebdavSyncWithUi = useLeafTabSyncRunner<LeafTabSyncEngineResult, WebdavLeafTabSyncOptions>({
    providerLabel: 'WebDAV 同步',
    runSync: runLeafTabSync,
    refreshAnalysis: refreshLeafTabSyncAnalysis,
    resolveSyncEncryptionError,
    requestBookmarkPermission: () => ensureExtensionPermission('bookmarks', { requestIfNeeded: true }).catch(() => false),
    longTask: {
      start: startLongTaskIndicator,
      update: updateLongTaskIndicator,
      finish: finishLongTaskIndicator,
      clear: clearLongTaskIndicator,
    },
    getInitialProgressCopy: () => ({
      title: '正在准备同步数据',
      detail: '正在读取本地与云端状态',
      progress: 6,
    }),
    getPermissionProgressCopy: (options) => ({
      title: '正在检查书签权限',
      detail: options.progressDetail || '需要确认当前浏览器允许访问书签数据',
      progress: 10,
    }),
    getSuccessText: (result) => result.summaryText || '同步完成',
    notifySuccess: (message) => toast.success(message),
    notifyError: (message) => toast.error(message),
    formatErrorMessage: (error) => (
      isWebdavAuthError(error)
        ? t('settings.backup.webdav.authFailed')
        : formatLeafTabSyncErrorMessage(error)
    ),
    onSuccess: async (result, context) => {
      void result;
      markWebdavSyncSuccess();
      if (context.options.enableAfterSuccess) {
        setWebdavSyncEnabledInStorage(true);
      }
    },
    onError: async (error, context) => {
      if (context.shouldManageProgressIndicator && context.progressTaskId) {
        clearLongTaskIndicator(context.progressTaskId);
      }
      markWebdavSyncError(error);
      return null;
    },
  });

  const handleLeafTabSync = useCallback(async (options?: WebdavLeafTabSyncOptions) => {
    if (!leafTabSyncHasConfig) {
      openLeafTabSyncConfig();
      return null;
    }
    return runWebdavSyncWithUi(options);
  }, [leafTabSyncHasConfig, openLeafTabSyncConfig, runWebdavSyncWithUi]);

  const runCloudSyncWithUi = useLeafTabSyncRunner<LeafTabSyncEngineResult, CloudLeafTabSyncOptions>({
    providerLabel: '云同步',
    runSync: runCloudLeafTabSync,
    refreshAnalysis: refreshCloudLeafTabSyncAnalysis,
    resolveSyncEncryptionError,
    requestBookmarkPermission: () => ensureExtensionPermission('bookmarks', { requestIfNeeded: true }).catch(() => false),
    longTask: {
      start: startLongTaskIndicator,
      update: updateLongTaskIndicator,
      finish: finishLongTaskIndicator,
      clear: clearLongTaskIndicator,
    },
    getInitialProgressCopy: () => ({
      title: '正在准备云同步',
      detail: '正在读取本地与账号云端状态',
      progress: 6,
    }),
    getPermissionProgressCopy: (options) => ({
      title: '正在检查书签权限',
      detail: options.progressDetail || '需要确认当前浏览器允许访问书签数据',
      progress: 10,
    }),
    getSuccessText: (result) => result.summaryText || '同步完成',
    notifySuccess: (message) => toast.success(message),
    notifyError: (message) => toast.error(message),
    formatErrorMessage: (error) => formatCloudSyncErrorMessage(error),
    onSuccess: async () => {
      markCloudSyncSuccess();
    },
    onError: async (error, context) => {
      if (
        context.options.retryAfterForceUnlock
        && !context.options._retriedAfterForceUnlock
        && isCloudSyncLockConflictError(error)
      ) {
        context.options.onProgress?.({
          stage: 'acquiring-lock',
          message: '检测到旧云端锁，正在自动修复',
          progress: 18,
        });
        if (context.progressTaskId) {
          updateLongTaskIndicator(context.progressTaskId, {
            title: '检测到旧云端锁，正在自动修复',
            detail: context.options.progressDetail || '正在释放旧锁并重新尝试同步',
            progress: 18,
          });
        }
        await cloudSyncRemoteStore?.releaseLock().catch(() => null);
        return context.retry({
          ...context.options,
          _retriedAfterForceUnlock: true,
        });
      }
      if (
        context.options.retryAfterConflictRefresh
        && !context.options._retriedAfterConflictRefresh
        && isCloudSyncCommitConflictError(error)
      ) {
        context.options.onProgress?.({
          stage: 'rechecking-remote',
          message: '检测到云端版本变化，正在重新对齐状态',
          progress: 26,
        });
        if (context.progressTaskId) {
          updateLongTaskIndicator(context.progressTaskId, {
            title: '检测到云端版本变化，正在重新对齐状态',
            detail: context.options.progressDetail || '正在等待最新状态生效后重试',
            progress: 26,
          });
        }
        await refreshCloudLeafTabSyncAnalysis().catch(() => null);
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0);
        });
        return context.retry({
          ...context.options,
          _retriedAfterConflictRefresh: true,
        });
      }
      if (context.shouldManageProgressIndicator && context.progressTaskId) {
        clearLongTaskIndicator(context.progressTaskId);
      }
      markCloudSyncError(error);
      return null;
    },
  });

  const handleCloudLeafTabSync = useCallback(async (options?: CloudLeafTabSyncOptions) => {
    if (!user) {
      const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
      if (webdavEnabled) {
        toast.error(t('settings.backup.webdav.disableWebdavBeforeCloudLogin'));
      } else {
        setIsAuthModalOpen(true);
      }
      return null;
    }
    if (!cloudLeafTabSyncHasConfig) {
      return null;
    }
    if (!options?.allowWhenDisabled && !cloudSyncEnabled) {
      setLeafTabSyncDialogOpen(false);
      setCloudSyncConfigOpen(true);
      return null;
    }
    return runCloudSyncWithUi(options);
  }, [
    cloudLeafTabSyncHasConfig,
    cloudSyncEnabled,
    runCloudSyncWithUi,
    setIsAuthModalOpen,
    t,
    user,
  ]);

  useEffect(() => {
    cloudSyncRunnerRef.current = handleCloudLeafTabSync;
  }, [handleCloudLeafTabSync]);

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
    const encryptionReady = await ensureSyncEncryptionAccess({
      providerLabel: 'WebDAV 同步',
      scopeKey: leafTabWebdavEncryptionScopeKey,
      transport: leafTabWebdavEncryptedTransport,
    });
    if (!encryptionReady) {
      return;
    }
    await handleLeafTabSync({
      enableAfterSuccess: true,
      requestBookmarkPermission: true,
      showProgressIndicator: true,
    });
  }, [
    ensureSyncEncryptionAccess,
    handleLeafTabSync,
    leafTabWebdavEncryptedTransport,
    leafTabWebdavEncryptionScopeKey,
    t,
    user,
  ]);

  const handleDisableWebdavSync = useCallback(async (options?: { clearLocal?: boolean }) => {
    const currentlyEnabled = (localStorage.getItem(WEBDAV_STORAGE_KEYS.syncEnabled) ?? 'false') === 'true';
    if (!currentlyEnabled) return;
    await runLongTask(
      {
        title: '正在停用同步',
        detail: '正在处理最后一次同步和关闭操作',
        progress: 8,
      },
      async ({ update }) => {
        let forceSyncFailed = false;

        if (leafTabSyncHasConfig) {
          update({
            title: '正在同步最后的变更',
            progress: 18,
          });
          try {
            const result = await handleLeafTabSync({
              silentSuccess: true,
              progressDetail: '正在处理最后一次同步和关闭操作',
              onProgress: (progress) => {
                update({
                  title: progress.message,
                  progress: progress.progress,
                });
              },
            });
            if (!result) {
              forceSyncFailed = true;
            }
          } catch (error) {
            forceSyncFailed = true;
          }
        }

        update({
          title: '正在关闭同步',
          progress: 92,
        });
        setWebdavSyncEnabledInStorage(false);

        if (options?.clearLocal === true) {
          update({
            title: '正在清理本地数据',
            progress: 96,
          });
          await resetLocalShortcutsByRole(localStorage.getItem('role'));
        }

        update({
          title: '同步已停用',
          progress: 100,
        });

        if (forceSyncFailed) {
          toast.error(t('settings.backup.webdav.disableFinalSyncFailed'));
        }
        toast.success(t('settings.backup.webdav.syncDisabled'));
      },
    );
  }, [
    handleLeafTabSync,
    leafTabSyncHasConfig,
    resetLocalShortcutsByRole,
    runLongTask,
    setWebdavSyncEnabledInStorage,
    t,
  ]);
  const handleOpenWebdavConfig = useCallback((options?: { enableAfterSave?: boolean }) => {
    if (cloudSyncEnabled) {
      toast.error('当前已启用云同步，请先退出云同步后再配置 WebDAV 同步');
      return false;
    }
    const shouldEnableAfterSave = options?.enableAfterSave ?? !leafTabWebdavConfigured;
    setWebdavEnableAfterConfigSave(Boolean(shouldEnableAfterSave));
    setWebdavDialogOpen(true);
    return true;
  }, [cloudSyncEnabled, leafTabWebdavConfigured]);
  const handleOpenWebdavConfigFromSyncCenter = useCallback((options?: { enableAfterSave?: boolean }) => {
    const opened = handleOpenWebdavConfig(options);
    if (!opened) {
      return;
    }
    setLeafTabSyncDialogOpen(false);
  }, [handleOpenWebdavConfig]);
  const handleLeafTabSyncDialogOpenChange = useCallback((open: boolean) => {
    setLeafTabSyncDialogOpen(open);
    if (!open) return;

    void refreshLeafTabSyncAnalysis({
      force: false,
      maxAgeMs: LEAFTAB_SYNC_ANALYSIS_CACHE_MAX_AGE_MS,
    });
    void refreshCloudLeafTabSyncAnalysis({
      force: false,
      maxAgeMs: LEAFTAB_SYNC_ANALYSIS_CACHE_MAX_AGE_MS,
    });
  }, [refreshCloudLeafTabSyncAnalysis, refreshLeafTabSyncAnalysis]);
  const resolveLegacyCloudMigrationPrompt = useCallback((confirmed: boolean) => {
    const resolver = legacyCloudMigrationResolverRef.current;
    legacyCloudMigrationResolverRef.current = null;
    setConfirmLegacyCloudMigrationOpen(false);
    resolver?.(confirmed);
  }, []);
  const requestLegacyCloudMigrationPrompt = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      legacyCloudMigrationResolverRef.current = resolve;
      setCloudSyncConfigOpen(false);
      setLeafTabSyncDialogOpen(false);
      setConfirmLegacyCloudMigrationOpen(true);
    });
  }, []);
  const ensureCloudLegacyMigrationReady = useCallback(async () => {
    if (!user || !cloudSyncToken || !cloudSyncEncryptedTransport) {
      return true;
    }

    try {
      const remoteEncryptionState = await cloudSyncEncryptedTransport.readEncryptionState();
      if (remoteEncryptionState.metadata) {
        return true;
      }
    } catch {
      return true;
    }

    try {
      const response = await fetch(`${API_URL}/user/shortcuts`, {
        headers: { Authorization: `Bearer ${cloudSyncToken}` },
      });
      if (!response.ok) {
        return true;
      }

      const data = await response.json();
      const rawLegacyPayload = data?.shortcuts;
      const hasLegacyPayload = typeof rawLegacyPayload === 'string'
        ? rawLegacyPayload.trim().length > 0
        : Boolean(rawLegacyPayload);
      if (!hasLegacyPayload) {
        return true;
      }

      return requestLegacyCloudMigrationPrompt();
    } catch {
      return true;
    }
  }, [
    API_URL,
    cloudSyncEncryptedTransport,
    cloudSyncToken,
    requestLegacyCloudMigrationPrompt,
    user,
  ]);
  const {
    handleLeafTabAutoSync,
    handleWebdavSyncNowFromCenter,
    handleWebdavRepairFromCenter,
    resolveWebdavConflict,
    handleRequestCloudLogin,
    handleOpenCloudSyncConfig,
    handleCloudSyncNowFromCenter,
    handleCloudRepairFromCenter,
    handleCloudSyncConfigSaved,
  } = useSyncCenterActions({
    user,
    t,
    leafTabSyncHasConfig,
    cloudSyncing: cloudLeafTabSyncState.status === 'syncing',
    webdavSyncing: leafTabSyncState.status === 'syncing',
    cloudSyncBookmarksEnabled,
    cloudSyncEncryptionScopeKey,
    cloudSyncEncryptedTransport,
    ensureSyncEncryptionAccess,
    ensureCloudLegacyMigrationReady,
    handleCloudLeafTabSync,
    handleLeafTabSync,
    setIsAuthModalOpen,
    setLeafTabSyncDialogOpen,
    setCloudSyncConfigOpen,
    runLongTask,
    setCloudNextSyncAt,
    openLeafTabSyncConfig,
  });
  const cloudAutoSyncingRef = useRef(cloudLeafTabSyncState.status === 'syncing');

  useEffect(() => {
    cloudAutoSyncingRef.current = cloudLeafTabSyncState.status === 'syncing';
  }, [cloudLeafTabSyncState.status]);

  useLeafTabWebdavAutoSync({
    conflictModalOpen: false,
    isDragging,
    syncing: leafTabSyncState.status === 'syncing',
    onSync: handleLeafTabAutoSync,
  });

  useEffect(() => {
    if (!user || !cloudSyncEnabled || !cloudLeafTabSyncHasConfig || !cloudSyncEncryptionReady) {
      setCloudNextSyncAt(null);
      return;
    }

    let disposed = false;
    let timer: number | null = null;
    const schedule = (targetMs: number) => {
      if (disposed) return;
      if (timer) {
        window.clearTimeout(timer);
      }
      const nextMs = Math.max(Date.now() + 200, targetMs);
      setCloudNextSyncAt(nextMs);
      const delay = Math.min(nextMs - Date.now(), 2_147_483_647);
      timer = window.setTimeout(async () => {
        if (disposed) return;
        if (cloudAutoSyncingRef.current || !navigator.onLine) {
          schedule(Date.now() + CLOUD_AUTO_SYNC_BUSY_RETRY_DELAY_MS);
          return;
        }
        const result = await handleCloudLeafTabSync({
          silentSuccess: true,
        });
        if (disposed) return;
        if (result && cloudSyncConfig.autoSyncToastEnabled) {
          toast.success(t('toast.cloudAutoSyncSuccess'));
        }
        if (disposed) return;
        schedule(
          result
            ? getAlignedJitteredNextAt(cloudSyncConfig.intervalMinutes)
            : Date.now() + CLOUD_AUTO_SYNC_FAILURE_RETRY_DELAY_MS,
        );
      }, delay);
    };

    const persistedNextAtIso = localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt);
    const persistedNextAtMs = persistedNextAtIso ? new Date(persistedNextAtIso).getTime() : Number.NaN;
    const initialTarget = resolveInitialAlignedJitteredTargetAt({
      intervalMinutes: cloudSyncConfig.intervalMinutes,
      persistedNextAtIso: Number.isFinite(persistedNextAtMs) && persistedNextAtMs > Date.now()
        ? persistedNextAtIso
        : null,
    });

    schedule(initialTarget);

    return () => {
      disposed = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [
    cloudLeafTabSyncHasConfig,
    cloudSyncConfig.autoSyncToastEnabled,
    cloudSyncConfig.intervalMinutes,
    cloudSyncEnabled,
    cloudSyncEncryptionReady,
    handleCloudLeafTabSync,
    setCloudNextSyncAt,
    t,
    user,
  ]);
  useEffect(() => {
    if (!cloudLoginSyncPendingUser || !user || cloudLoginSyncPendingUser !== user) {
      return;
    }
    if (!cloudSyncEnabled || !cloudLeafTabSyncHasConfig || !cloudSyncEncryptionReady) {
      return;
    }
    setCloudLoginSyncPendingUser(null);
    void runLongTask({
      title: '正在同步账号数据',
      detail: cloudSyncBookmarksEnabled ? '正在处理快捷方式和书签数据' : '正在处理快捷方式数据',
      progress: 8,
    }, async ({ update }) => {
      await handleCloudLeafTabSync({
        silentSuccess: true,
        requestBookmarkPermission: cloudSyncBookmarksEnabled,
        progressTaskId: null,
        onProgress: (progress) => {
          update({
            title: progress.message,
            progress: progress.progress,
          });
        },
      });
    });
  }, [
    cloudLeafTabSyncHasConfig,
    cloudLoginSyncPendingUser,
    cloudSyncBookmarksEnabled,
    cloudSyncEnabled,
    cloudSyncEncryptionReady,
    handleCloudLeafTabSync,
    runLongTask,
    user,
  ]);
  const syncLocalToCloudBeforeLogout = useCallback(async () => {
    if (!user) return false;
    if (!navigator.onLine) return false;
    if (!readCloudSyncConfigFromStorage().enabled) return true;
    if (!cloudSyncEncryptionReady) return true;
    try {
      const result = await handleCloudLeafTabSync({
        silentSuccess: true,
        allowWhenDisabled: true,
      });
      return Boolean(result);
    } catch {
      return false;
    }
  }, [cloudSyncEncryptionReady, handleCloudLeafTabSync, user]);
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
  const requestLogoutConfirmation = useCallback(() => {
    setLeafTabSyncDialogOpen(false);
    setSettingsOpen(false);
    setConfirmLogoutOpen(true);
  }, []);
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

  const scenarioEditMode = scenarioModes.find((m: any) => m.id === currentEditScenarioId) ?? null;
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
  const topNavSyncStatus = useMemo(() => {
    if (leafTabSyncState.status === 'syncing' || cloudLeafTabSyncState.status === 'syncing') {
      return 'syncing' as const;
    }
    if (leafTabSyncState.status === 'error' || cloudLeafTabSyncState.status === 'error') {
      return 'error' as const;
    }
    if (leafTabSyncState.status === 'conflict' || cloudLeafTabSyncState.status === 'conflict') {
      return 'conflict' as const;
    }
    return 'idle' as const;
  }, [cloudLeafTabSyncState.status, leafTabSyncState.status]);
  const topNavModeProps = useMemo(() => ({
    fadeOnIdle: true,
    hideWeather: true,
    onSettingsClick: handleOpenSettings,
    onSyncClick: () => setLeafTabSyncDialogOpen(true),
    syncStatus: topNavSyncStatus,
    onWeatherUpdate: setWeatherCode,
    reduceVisualEffects: visualEffectsPolicy.disableBackdropBlur,
    leftSlot: <ScenarioModeMenu {...scenarioMenuLayerProps} reduceVisualEffects={visualEffectsPolicy.disableBackdropBlur} />,
  }), [handleOpenSettings, scenarioMenuLayerProps, setWeatherCode, topNavSyncStatus, visualEffectsPolicy.disableBackdropBlur]);
  const wallpaperClockBaseProps = useMemo(() => ({
    is24Hour,
    onIs24HourChange: setIs24Hour,
    showSeconds,
    onShowSecondsChange: setShowSeconds,
    showDate,
    onShowDateChange: setShowDate,
    showWeekday,
    onShowWeekdayChange: setShowWeekday,
    showLunar,
    onShowLunarChange: setShowLunar,
    onTimeAnimationModeChange: setTimeAnimationMode,
    bingWallpaperUrl: bingWallpaper,
    onSettingsClick: handleOpenSettings,
    onSyncClick: () => setLeafTabSyncDialogOpen(true),
    syncStatus: topNavSyncStatus,
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
    topNavSyncStatus,
    visualEffectsPolicy.disableBackdropBlur,
    effectiveWallpaperMaskOpacity,
    effectiveWallpaperMode,
    weatherCode,
  ]);
  const searchExperienceBaseProps = useMemo(() => ({
    openInNewTab,
    shortcuts,
    tabSwitchSearchEngine,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchRotatingPlaceholderEnabled,
    disablePlaceholderAnimation: visualEffectsLevel === 'low',
    lightweightSearchUi: visualEffectsLevel === 'low',
    searchHeight: responsiveLayout.searchHeight,
    searchInputFontSize: responsiveLayout.searchInputFontSize,
    searchHorizontalPadding: responsiveLayout.searchHorizontalPadding,
    searchActionSize: responsiveLayout.searchActionSize,
  }), [
    openInNewTab,
    responsiveLayout.searchActionSize,
    responsiveLayout.searchHeight,
    responsiveLayout.searchHorizontalPadding,
    responsiveLayout.searchInputFontSize,
    shortcuts,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchRotatingPlaceholderEnabled,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    tabSwitchSearchEngine,
    visualEffectsLevel,
  ]);
  const shortcutGridBaseProps = useMemo(() => ({
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
    shortcutCardVariant,
    shortcutCompactShowTitle,
    shortcuts,
    shortcutsAreaHeight,
    visualEffectsPolicy.disableShortcutReorderMotion,
  ]);
  const homeMainContentBaseProps = useMemo(() => ({
    user,
    loginBannerVisible,
    onLoginRequest: handleRequestCloudLogin,
    onDismissLoginBanner: handleDismissLoginBanner,
    showTime,
    displayMode,
    is24Hour,
    onIs24HourChange: setIs24Hour,
    showSeconds,
    onShowSecondsChange: setShowSeconds,
    showDate,
    onShowDateChange: setShowDate,
    showWeekday,
    onShowWeekdayChange: setShowWeekday,
    showLunar,
    onShowLunarChange: setShowLunar,
    onWeatherUpdate: setWeatherCode,
    timeFont,
    onTimeFontChange: setTimeFont,
    layout: responsiveLayout,
    reduceMotionVisuals: visualEffectsLevel === 'low',
  }), [
    displayMode,
    handleDismissLoginBanner,
    handleRequestCloudLogin,
    is24Hour,
    loginBannerVisible,
    responsiveLayout,
    setIs24Hour,
    setShowDate,
    setShowLunar,
    setShowSeconds,
    setShowWeekday,
    setTimeFont,
    setWeatherCode,
    showDate,
    showLunar,
    showSeconds,
    showTime,
    showWeekday,
    timeFont,
    user,
    visualEffectsLevel,
  ]);
  const panoramicSurfaceRevealStyle: CSSProperties = {
    backgroundColor: initialRevealReady ? 'var(--background)' : 'var(--initial-reveal-surface)',
    transition: `background-color ${PANORAMIC_SURFACE_REVEAL_TIMING}`,
  };
  const shouldMountAppDialogs = useKeepMountedAfterFirstOpen(
    shortcutEditOpen
      || shortcutDeleteOpen
      || scenarioCreateOpen
      || scenarioEditOpen
      || isAuthModalOpen
      || settingsOpen
      || searchSettingsOpen
      || shortcutGuideOpen
      || shortcutStyleSettingsOpen
      || adminModalOpen
      || aboutModalOpen
      || exportBackupDialogOpen
      || importBackupDialogOpen
      || webdavDialogOpen
      || cloudSyncConfigOpen
      || importConfirmOpen
      || confirmDisableConsentOpen,
  );
  const shouldMountWallpaperSelector = useKeepMountedAfterFirstOpen(wallpaperSettingsOpen);
  const shouldMountLeafTabSyncDialog = useKeepMountedAfterFirstOpen(leafTabSyncDialogOpen);
  const shouldMountLeafTabSyncEncryptionDialog = useKeepMountedAfterFirstOpen(Boolean(syncEncryptionDialogState?.open));
  const shouldMountUpdateDialog = !IS_STORE_BUILD && useKeepMountedAfterFirstOpen(updateDialogOpen);

  return (
    <div
      ref={pageFocusRef}
      tabIndex={-1}
      className={`${showOverlayWallpaperLayer ? 'bg-transparent' : 'bg-background'} relative w-full min-h-screen flex flex-col items-center overflow-x-hidden overflow-y-auto pb-[24px] focus:outline-none`}
      style={panoramicSurfaceRevealStyle}
    >
      <ShortcutSelectionShell
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        contextMenuRef={contextMenuRef}
        shortcuts={shortcuts}
        scenarioModes={scenarioModes}
        selectedScenarioId={selectedScenarioId}
        onCreateShortcut={(insertIndex) => {
          setShortcutModalMode('add');
          setSelectedShortcut(null);
          setEditingTitle('');
          setEditingUrl('');
          setCurrentInsertIndex(insertIndex);
          setShortcutEditOpen(true);
        }}
        onEditShortcut={(shortcutIndex, shortcut) => {
          setSelectedShortcut({ index: shortcutIndex, shortcut });
          setEditingTitle(shortcut.title);
          setEditingUrl(shortcut.url);
          setShortcutModalMode('edit');
          setShortcutEditOpen(true);
        }}
        onDeleteShortcut={(shortcutIndex, shortcut) => {
          setSelectedShortcut({ index: shortcutIndex, shortcut });
          setShortcutDeleteOpen(true);
        }}
        onShortcutOpen={handleShortcutOpen}
        onDeleteSelectedShortcuts={handleConfirmDeleteShortcuts}
        onPinSelectedShortcuts={handlePinSelectedShortcuts}
        onMoveSelectedShortcutsToScenario={handleMoveSelectedShortcutsToScenario}
      >
        {({ selectionMode, selectedShortcutIndexes, onToggleShortcutSelection }) => (
          <HomeInteractiveSurface
            initialRevealReady={initialRevealReady}
            visible={!roleSelectorOpen}
            modeLayersVisible={modeLayersVisible}
            modeFlags={displayModeFlags}
            showOverlayWallpaperLayer={showOverlayWallpaperLayer}
            wallpaperAnimatedLayerStyle={wallpaperAnimatedLayerStyle}
            effectiveWallpaperMode={effectiveWallpaperMode}
            freshWeatherVideo={freshWeatherVideo}
            colorWallpaperGradient={colorWallpaperGradient}
            effectiveOverlayWallpaperSrc={effectiveOverlayWallpaperSrc}
            overlayBackgroundAlt={overlayBackgroundAlt}
            onOverlayImageReady={handleOverlayImageReady}
            effectiveWallpaperMaskOpacity={effectiveWallpaperMaskOpacity}
            topNavModeProps={topNavModeProps}
            homeMainContentBaseProps={homeMainContentBaseProps}
            shortcutGridProps={{
              ...shortcutGridBaseProps,
              selectionMode,
              selectedShortcutIndexes,
              onToggleShortcutSelection,
            }}
            wallpaperClockBaseProps={wallpaperClockBaseProps}
            searchExperienceBaseProps={searchExperienceBaseProps}
            baseTimeAnimationEnabled={effectiveTimeAnimationEnabled}
            freezeDynamicWallpaperBase={
              visualEffectsPolicy.freezeDynamicWallpaper || isDynamicWallpaperIdleFrozen
            }
          />
        )}
      </ShortcutSelectionShell>
      {shouldMountWallpaperSelector ? (
        <Suspense fallback={null}>
          <LazyWallpaperSelector
            {...wallpaperSelectorLayerProps}
            mode={effectiveWallpaperMode}
            hideWeather={displayMode === 'minimalist' || firefox}
            open={wallpaperSettingsOpen}
            onOpenChange={setWallpaperSettingsOpen}
            trigger={<span className="hidden" aria-hidden="true" />}
          />
        </Suspense>
      ) : null}


      <ConfirmDialog
        open={confirmDisableWebdavSyncOpen}
        onOpenChange={setConfirmDisableWebdavSyncOpen}
        title={t('settings.backup.webdav.disableConfirmTitle')}
        description={t('settings.backup.webdav.disableConfirmDesc')}
        cancelText={t('common.cancel')}
        confirmText={t('leaftabSyncDialog.disableSync', { defaultValue: '停用同步' })}
        onConfirm={() => {
          setConfirmDisableWebdavSyncOpen(false);
          setLeafTabSyncDialogOpen(false);
          void handleDisableWebdavSync();
        }}
        confirmButtonClassName="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
      />

      <ConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title={t('logoutConfirm.title')}
        description={t('user.logoutOfflineWarning', {
          defaultValue: t('logoutConfirm.description'),
        })}
        cancelText={t('logoutConfirm.cancel')}
        confirmText={t('logoutConfirm.confirm')}
        onConfirm={() => {
          setConfirmLogoutOpen(false);
          void handleLogoutWithOptions();
        }}
        confirmButtonClassName="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
      />

      <ConfirmDialog
        open={confirmLegacyCloudMigrationOpen}
        onOpenChange={(open) => {
          if (open) {
            setConfirmLegacyCloudMigrationOpen(true);
            return;
          }
          resolveLegacyCloudMigrationPrompt(false);
        }}
        title={t('settings.backup.cloud.legacyMigrationTitle', { defaultValue: '检测到旧版云同步数据' })}
        description={t('settings.backup.cloud.legacyMigrationDesc', {
          defaultValue: '检测到这个账号里还有旧版未加密的快捷方式云数据。继续后需要先设置同步口令，LeafTab 才会把这批旧数据迁移到新版加密同步里；在你确认之前，旧数据不会被删除。',
        })}
        cancelText={t('common.cancel', { defaultValue: '取消' })}
        confirmText={t('settings.backup.cloud.startMigration', { defaultValue: '继续迁移' })}
        onConfirm={() => {
          resolveLegacyCloudMigrationPrompt(true);
        }}
      />
      {shouldMountAppDialogs ? (
        <Suspense fallback={null}>
          <LazyAppDialogs
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
              initialShortcut: selectedShortcut?.shortcut
                ? { ...selectedShortcut.shortcut, title: editingTitle, url: editingUrl }
                : { title: editingTitle, url: editingUrl, icon: '' },
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
              onLogout: requestLogoutConfirmation,
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
	              onCloudSyncNow: handleCloudSyncNowFromCenter,
                onOpenSyncCenter: () => {
                  setSettingsOpen(false);
                  setLeafTabSyncDialogOpen(true);
                },
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
                searchRotatingPlaceholderEnabled,
                onSearchRotatingPlaceholderEnabledChange: setSearchRotatingPlaceholderEnabled,
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
            exportBackupDialogProps={{
              open: exportBackupDialogOpen,
              onOpenChange: setExportBackupDialogOpen,
              mode: 'export',
              availableScope: {
                shortcuts: true,
                bookmarks: true,
              },
              defaultScope: {
                shortcuts: true,
                bookmarks: cloudSyncBookmarksEnabled,
              },
              onConfirm: async (scope) => {
                await executeExportData(scope);
              },
            }}
            importBackupDialogProps={{
              open: importBackupDialogOpen,
              onOpenChange: handleImportBackupDialogOpenChange,
              mode: 'import',
              availableScope: importBackupScopePayload
                ? {
                    shortcuts: Boolean(importBackupScopePayload.exportScope.shortcuts),
                    bookmarks: Boolean(importBackupScopePayload.exportScope.bookmarks),
                  }
                : {
                    shortcuts: true,
                    bookmarks: true,
                  },
              defaultScope: importBackupScopePayload
                ? {
                    shortcuts: true,
                    bookmarks: cloudSyncBookmarksEnabled && Boolean(importBackupScopePayload.exportScope.bookmarks),
                  }
                : {
                    shortcuts: true,
                    bookmarks: cloudSyncBookmarksEnabled,
                  },
              onConfirm: handleImportBackupScopeConfirm,
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
              onDisableSync: async () => {
                setConfirmDisableWebdavSyncOpen(true);
              },
            }}
            cloudSyncConfigDialogProps={{
              open: cloudSyncConfigOpen,
              onOpenChange: setCloudSyncConfigOpen,
              encryptionReady: cloudSyncEncryptionReady,
              onManageEncryption: handleManageCloudSyncEncryption,
              onSaveSuccess: handleCloudSyncConfigSaved,
              onLogout: requestLogoutConfirmation,
            }}
            confirmSyncDialog={{
              open: false,
              onOpenChange: () => {},
              confirmChoice: null,
              onChoiceChange: () => {},
              enableChoiceSwitch: false,
              requireDecision: false,
              title: t('syncConflict.title'),
              description: t('syncConflict.description'),
              confirmCloudLabel: t('syncConflict.useCloud'),
              confirmLocalLabel: t('syncConflict.useLocal'),
              confirmMergeLabel: t('syncConflict.merge'),
              cloudCount: 0,
              cloudTime: '',
              cloudPayload: null,
              localCount: 0,
              localTime: '',
              localPayload: null,
              onConfirm: () => {},
              onCancel: () => {},
            }}
            importConfirmDialog={{
              open: importConfirmOpen,
              setOpen: setImportConfirmOpen,
              payload: importPendingPayload,
              setPayload: setImportPendingPayload,
              busy: importConfirmBusy,
              setBusy: setImportConfirmBusy,
              downloadCloudBackupEnvelope: async () => {},
              applyUndoPayload: handleImportConfirmApply,
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
        </Suspense>
      ) : null}
      {shouldMountLeafTabSyncDialog ? (
        <Suspense fallback={null}>
          <LazyLeafTabSyncDialog
            open={leafTabSyncDialogOpen}
            onOpenChange={handleLeafTabSyncDialogOpenChange}
            cloudAnalysis={cloudLeafTabSyncAnalysis}
            webdavAnalysis={leafTabSyncAnalysis}
            syncState={leafTabSyncState}
            cloudSyncState={cloudLeafTabSyncState}
            ready={leafTabSyncReady}
            hasConfig={leafTabSyncHasConfig}
            busy={leafTabSyncState.status === 'syncing' || cloudLeafTabSyncState.status === 'syncing'}
            bookmarkScopeLabel={leafTabBookmarkSyncScopeLabel}
            summaryText={cloudLeafTabSyncLastResult?.summaryText || leafTabSyncLastResult?.summaryText || ''}
            cloudSignedIn={Boolean(user)}
            cloudEnabled={cloudSyncEnabled}
            cloudSyncBookmarksEnabled={cloudSyncBookmarksEnabled}
            cloudUsername={user || ''}
            cloudLastSyncLabel={cloudLastSyncLabel}
            cloudNextSyncLabel={cloudNextSyncLabel}
            cloudEncryptionReady={cloudSyncEncryptionReady}
            webdavConfigured={leafTabWebdavConfigured}
            webdavEnabled={leafTabWebdavEnabled}
            webdavProfileLabel={leafTabWebdavProfileLabel}
            webdavUrlLabel={leafTabSyncWebdavConfig?.url || ''}
            webdavLastSyncLabel={leafTabWebdavLastSyncLabel}
            webdavNextSyncLabel={leafTabWebdavNextSyncLabel}
            webdavEncryptionReady={leafTabWebdavEncryptionReady}
            onCloudSyncNow={() => {
              setLeafTabSyncDialogOpen(false);
              void handleCloudSyncNowFromCenter();
            }}
            onOpenCloudConfig={handleOpenCloudSyncConfig}
            onCloudLogin={() => {
              const shouldOpenLogin = handleRequestCloudLogin();
              if (shouldOpenLogin) {
                setLeafTabSyncDialogOpen(false);
              }
            }}
            onCloudRepairPull={() => {
              void handleCloudRepairFromCenter('pull-remote');
            }}
            onCloudRepairPush={() => {
              void handleCloudRepairFromCenter('push-local');
            }}
            onSyncNow={() => {
              setLeafTabSyncDialogOpen(false);
              void handleWebdavSyncNowFromCenter();
            }}
            onEnableSync={() => {
              setLeafTabSyncDialogOpen(false);
              void handleEnableWebdavSync();
            }}
            onOpenConfig={() => {
              handleOpenWebdavConfigFromSyncCenter();
            }}
            onOpenSetupConfig={() => {
              handleOpenWebdavConfigFromSyncCenter({
                enableAfterSave: true,
              });
            }}
            onWebdavRepairPull={() => {
              void handleWebdavRepairFromCenter('pull-remote');
            }}
            onWebdavRepairPush={() => {
              void handleWebdavRepairFromCenter('push-local');
            }}
          />
        </Suspense>
      ) : null}
      {shouldMountLeafTabSyncEncryptionDialog ? (
        <Suspense fallback={null}>
          <LazyLeafTabSyncEncryptionDialog
            open={Boolean(syncEncryptionDialogState?.open)}
            mode={syncEncryptionDialogState?.mode || 'setup'}
            providerLabel={syncEncryptionDialogState?.providerLabel || '同步'}
            busy={syncEncryptionDialogBusy}
            onOpenChange={handleSyncEncryptionDialogOpenChange}
            onSubmit={handleSubmitSyncEncryptionDialog}
          />
        </Suspense>
      ) : null}
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
      <LongTaskIndicator task={longTaskIndicator} />
      <Toaster offset={longTaskIndicator ? 96 : 16} />
      {roleSelectorOpen ? (
        <Suspense fallback={null}>
          <LazyRoleSelector
            open={roleSelectorOpen}
            onSelect={(id, layout) => {
              handleRoleSelect(id);
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
