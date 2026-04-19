/// <reference types="chrome" />

import { Suspense, useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useLeafTabSyncRuntime } from '@/lazy/sync';
import i18n from './i18n';
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
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';
import { getDefaultLocalBackupExportScope } from '@/utils/localBackupScopePolicy';

// Components
import ScenarioModeMenu from './components/ScenarioModeMenu';
import { Toaster, toast } from './components/ui/sonner';
import type { Shortcut, ShortcutFolderDisplayMode, SyncablePreferences } from './types';
import { normalizeApiBase } from "./utils";
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfilePreferences, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';
import { LongTaskIndicator } from './components/LongTaskIndicator';
import { LeafTabDangerousSyncDialog } from '@/components/sync/LeafTabDangerousSyncDialog';
import {
  applyWebdavDangerousBookmarkChoiceToStorage,
  hasWebdavUrlConfiguredFromStorage,
  isWebdavSyncEnabledFromStorage,
  readWebdavConfigFromStorage,
  readWebdavStorageStateFromStorage,
  WEBDAV_STORAGE_KEYS,
} from '@/utils/webdavConfig';
import { isWebdavAuthError } from '@/utils/webdavError';
import {
  CLOUD_SYNC_STORAGE_KEYS,
  applyCloudDangerousBookmarkChoiceToStorage,
  emitCloudSyncStatusChanged,
  readCloudSyncConfigFromStorage,
} from '@/utils/cloudSyncConfig';
import ConfirmDialog from './components/ConfirmDialog';
import { ENABLE_CUSTOM_API_SERVER, IS_STORE_BUILD } from '@/config/distribution';
import { useGithubReleaseUpdate } from './hooks/useGithubReleaseUpdate';
import { DEFAULT_SHORTCUT_CARD_VARIANT, clampShortcutGridColumns } from '@/components/shortcuts/shortcutCardVariant';
import { scaleShortcutIconSize } from '@/utils/shortcutIconSettings';
import { getDisplayModeLayoutFlags } from '@/displayMode/config';
import { DEFAULT_COLOR_WALLPAPER_ID, getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
import type { AboutLeafTabModalTab } from '@/components/AboutLeafTabModal';
import { weatherVideoMap, sunnyWeatherVideo } from '@/components/wallpaper/weatherWallpapers';
import { HomeInteractiveSurface } from '@/components/home/HomeInteractiveSurface';
import { ShortcutSelectionShell } from '@/components/home/ShortcutSelectionShell';
import type { ShortcutFolderOpeningSourceSnapshot } from '@/components/folderTransition/useFolderTransitionController';
import { useFolderTransitionController } from '@/components/folderTransition/useFolderTransitionController';
import {
  getFolderPreviewRoot,
  getFolderPreviewSlotEntries,
} from '@/components/shortcuts/folderPreviewRegistry';
import type { RootShortcutExternalDragSession as ExternalShortcutDragSession } from '@/features/shortcuts/components/RootShortcutGrid';
import {
  LazyAppDialogs,
  LazyLeafTabSyncDialog,
  LazyLeafTabSyncEncryptionDialog,
  LazyRoleSelector,
  LazyShortcutFolderCompactOverlay,
  LazyShortcutFolderNameDialog,
  LazyUpdateAvailableDialog,
  LazyWallpaperSelector,
  preloadHomeDialogs,
} from '@/lazy/components';
import { applyDynamicAccentColor, clearDynamicAccentColor, resolveDynamicAccentColor } from '@/utils/dynamicAccentColor';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import {
  PANORAMIC_SURFACE_REVEAL_TIMING,
} from '@/config/animationTokens';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { getAlignedJitteredNextAt, resolveInitialAlignedJitteredTargetAt } from '@/sync/schedule';
import {
  type LeafTabSyncEngineResult,
  type LeafTabSyncInitialChoice,
  type LeafTabSyncSnapshot,
} from '@/sync/leaftab';
import { normalizeLeafTabSyncSnapshot } from '@/sync/leaftab/schema';
import { readLeafTabBookmarkSyncScope } from '@/sync/leaftab/bookmarkScope';
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
import {
  resolveCloudSyncBookmarkApplyMode,
  resolveCloudSyncBookmarksEnabled,
} from '@/utils/cloudSyncBookmarksPolicy';
import { resolveDeferredBookmarkSyncExecution } from '@/utils/deferredBookmarkSync';
import {
  applyFolderExtractDragStart,
  applyShortcutDropIntent,
  dissolveFolder,
  mergeShortcutsIntoNewFolder,
  moveShortcutsIntoFolder,
  ROOT_SHORTCUTS_PATH,
  type FolderExtractDragStartPayload,
  type FolderShortcutDropIntent,
  type RootShortcutDropIntent,
  type ShortcutDropIntent,
  type ShortcutInteractionApplication,
} from '@leaftab/workspace-core';
import {
  findShortcutById,
  isShortcutFolder,
  isShortcutLink,
} from '@/utils/shortcutFolders';
import { createLeaftabGridEngineHostAdapter } from '@/features/shortcuts/gridEngine/leaftabGridEngineHostAdapter';

type WebdavLeafTabSyncOptions = LeafTabSyncRunnerOptionsBase & {
  enableAfterSuccess?: boolean;
  skipBookmarksForThisRun?: boolean;
};

type CloudLeafTabSyncOptions = LeafTabSyncRunnerOptionsBase & {
  mode?: LeafTabSyncInitialChoice | 'auto';
  allowWhenDisabled?: boolean;
  skipBookmarksForThisRun?: boolean;
  retryAfterForceUnlock?: boolean;
  retryAfterConflictRefresh?: boolean;
  _retriedAfterForceUnlock?: boolean;
  _retriedAfterConflictRefresh?: boolean;
};

type FolderOverlaySnapshotRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function copyFolderOverlaySnapshotRect(rect: DOMRect | FolderOverlaySnapshotRect | null | undefined) {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function readElementBorderRadiusPx(element: HTMLElement | null | undefined) {
  if (!element || typeof window === 'undefined') return null;
  const computedStyle = window.getComputedStyle(element);
  const resolvedRadius = Number.parseFloat(computedStyle.borderTopLeftRadius || '0');
  return Number.isFinite(resolvedRadius) ? resolvedRadius : null;
}

function createFolderShortcutId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `fld_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const isNamedError = (error: unknown, name: string) => {
  return Boolean(error && typeof error === 'object' && (error as { name?: unknown }).name === name);
};

const isCloudRemoteStoreError = (
  error: unknown,
): error is Error & { status: number; operation?: unknown } => {
  return Boolean(
    error
      && typeof error === 'object'
      && typeof (error as { status?: unknown }).status === 'number'
      && (
        (error as { name?: unknown }).name === 'LeafTabSyncCloudRemoteStoreError'
        || typeof (error as { operation?: unknown }).operation === 'string'
      ),
  );
};

type DangerousSyncDialogAction = 'continue-without-bookmarks' | 'use-remote' | 'use-local' | null;

type DangerousSyncDialogState = {
  open: boolean;
  provider: 'cloud' | 'webdav';
  localBookmarkCount: number | null;
  remoteBookmarkCount: number | null;
  detectedFromCount: number;
  detectedToCount: number;
};

type PendingRootFolderMerge = {
  scenarioId: string;
  activeShortcutId: string;
  targetShortcutId: string;
};

type DangerousSyncError = Error & {
  fromCount: number;
  toCount: number;
};

const formatLeafTabSyncErrorMessage = (error: unknown) => {
  if (isNamedError(error, 'LeafTabDestructiveBookmarkChangeError')) {
    return (error as Error).message;
  }
  if (isNamedError(error, 'LeafTabBookmarkPermissionDeniedError')) {
    return (error as Error).message;
  }
  if (error && typeof error === 'object') {
    const status = Number((error as { status?: unknown }).status);
    const operation = String((error as { operation?: unknown }).operation || '');
    const relativePath = String((error as { relativePath?: unknown }).relativePath || '');
    if (Number.isInteger(status) && status > 0 && operation) {
      const actionLabel = operation === 'mkcol'
        ? i18n.t('leaftabSync.webdav.actions.mkcol', { defaultValue: '创建目录' })
        : operation === 'upload'
          ? i18n.t('leaftabSync.webdav.actions.upload', { defaultValue: '写入' })
          : operation === 'download'
            ? i18n.t('leaftabSync.webdav.actions.download', { defaultValue: '读取' })
            : operation === 'delete'
              ? i18n.t('leaftabSync.webdav.actions.delete', { defaultValue: '删除' })
              : operation;

      return relativePath
        ? i18n.t('leaftabSync.webdav.error.withPath', {
          action: actionLabel,
          status,
          path: relativePath,
          defaultValue: 'WebDAV {{action}}失败（{{status}}）：{{path}}',
        })
        : i18n.t('leaftabSync.webdav.error.noPath', {
          action: actionLabel,
          status,
          defaultValue: 'WebDAV {{action}}失败（{{status}}）',
        });
    }
  }

  return String((error as Error)?.message || 'LeafTab sync failed');
};

const isCloudSyncLockConflictError = (error: unknown) => {
  const operation = String((error as { operation?: unknown })?.operation || '');
  const message = String((error as { message?: unknown })?.message || '');
  return isCloudRemoteStoreError(error)
    && error.status === 409
    && (
      /lock is held by another device/i.test(message)
      || /POST\s+\/user\/leaftab-sync\/lock/i.test(operation)
    );
};

const isCloudSyncCommitConflictError = (error: unknown) => {
  return isCloudRemoteStoreError(error)
    && error.status === 409
    && (
      /remote commit changed/i.test(error.message || '')
      || /parent commit required/i.test(error.message || '')
    );
};

const formatCloudSyncErrorMessage = (error: unknown) => {
  if (isNamedError(error, 'LeafTabDestructiveBookmarkChangeError')) {
    return (error as Error).message;
  }
  if (isNamedError(error, 'LeafTabBookmarkPermissionDeniedError')) {
    return (error as Error).message;
  }
  if (isCloudRemoteStoreError(error)) {
    const operation = String((error as { operation?: unknown }).operation || '');
    const message = String(error.message || '');
    if (error.status === 409) {
      if (
        /lock is held by another device/i.test(message)
        || /POST\s+\/user\/leaftab-sync\/lock/i.test(operation)
      ) {
        return i18n.t('leaftabSync.cloud.error.lockedTryFix', {
          defaultValue: '云同步被旧设备锁定，已尝试自动修复；如果仍失败请再试一次',
        });
      }
      if (/remote commit changed/i.test(message)) {
        return i18n.t('leaftabSync.cloud.error.remoteCommitChanged', {
          defaultValue: '云端数据刚刚发生变化，请重新同步一次',
        });
      }
      if (/parent commit required/i.test(message)) {
        return i18n.t('leaftabSync.cloud.error.parentCommitRequired', {
          defaultValue: '云端已有新版本，请先拉取最新数据后再覆盖',
        });
      }
    }

    return message || i18n.t('leaftabSync.cloud.error.httpStatus', {
      status: error.status,
      defaultValue: '云同步失败（{{status}}）',
    });
  }

  return String((error as Error)?.message || i18n.t('leaftabSync.cloud.error.generic', { defaultValue: '云同步失败' }));
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
  const [syncConfigBackTarget, setSyncConfigBackTarget] = useState<'settings' | 'sync-center'>('settings');
  const [webdavDialogOpen, setWebdavDialogOpen] = useState(false);
  const [webdavEnableAfterConfigSave, setWebdavEnableAfterConfigSave] = useState(false);
  const [webdavShowConnectionFields, setWebdavShowConnectionFields] = useState(false);
  const [pendingWebdavEnableScopeKey, setPendingWebdavEnableScopeKey] = useState<string | null>(null);
  const [leafTabSyncDialogOpen, setLeafTabSyncDialogOpen] = useState(false);
  const [dangerousSyncDialogState, setDangerousSyncDialogState] = useState<DangerousSyncDialogState | null>(null);
  const [dangerousSyncDialogBusyAction, setDangerousSyncDialogBusyAction] = useState<DangerousSyncDialogAction>(null);
  const [leafTabSyncConfigVersion, setLeafTabSyncConfigVersion] = useState(0);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [searchSettingsOpen, setSearchSettingsOpen] = useState(false);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const [shortcutIconSettingsOpen, setShortcutIconSettingsOpen] = useState(false);
  const [aboutModalDefaultTab, setAboutModalDefaultTab] = useState<AboutLeafTabModalTab>('about');
  const [wallpaperSettingsOpen, setWallpaperSettingsOpen] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(() => {
    try {
      return localStorage.getItem('leaftab_admin_mode_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [gridHitDebugVisible, setGridHitDebugVisible] = useState(() => {
    try {
      return sessionStorage.getItem('leaftab_grid_hit_debug_visible') === 'true';
    } catch {
      return false;
    }
  });
  const [weatherDebugVisible, setWeatherDebugVisible] = useState(() => {
    try {
      return sessionStorage.getItem('leaftab_weather_debug_visible') === 'true';
    } catch {
      return false;
    }
  });
  const legacyCloudMigrationResolverRef = useRef<((value: boolean) => void) | null>(null);
  const openLeafTabSyncConfig = useCallback(() => {
    setSyncConfigBackTarget('settings');
    setWebdavEnableAfterConfigSave(false);
    setWebdavShowConnectionFields(false);
    setWebdavDialogOpen(true);
  }, []);
  useEffect(() => {
    const syncAdminModeEnabled = () => {
      let enabled = false;
      try {
        enabled = localStorage.getItem('leaftab_admin_mode_enabled') === 'true';
      } catch {}
      setAdminModeEnabled(enabled);
      if (!enabled) {
        setGridHitDebugVisible(false);
        try { sessionStorage.setItem('leaftab_grid_hit_debug_visible', 'false'); } catch {}
      }
    };

    syncAdminModeEnabled();
    window.addEventListener('leaftab-admin-mode-changed', syncAdminModeEnabled);
    return () => {
      window.removeEventListener('leaftab-admin-mode-changed', syncAdminModeEnabled);
    };
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
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginBannerVisible, 
    setLoginBannerVisible, 
    handleLoginSuccess, 
    handleLogout 
  } = useAuth();
  const [authModalMode, setAuthModalMode] = useState<'login' | 'link-google'>('login');

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
    shortcutCompactShowTitle, setShortcutCompactShowTitle,
    shortcutGridColumns, setShortcutGridColumns,
    shortcutIconAppearance, setShortcutIconAppearance,
    shortcutIconCornerRadius, setShortcutIconCornerRadius,
    shortcutIconScale, setShortcutIconScale,
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

  useEffect(() => {
    let canceled = false;

    const warmDialogs = () => {
      if (canceled) return;
      void preloadHomeDialogs();
    };

    const cancelWarmup = scheduleAfterInteractivePaint(warmDialogs, {
      delayMs: 240,
      idleTimeoutMs: 900,
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        warmDialogs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      canceled = true;
      cancelWarmup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const normalizedGridColumns = clampShortcutGridColumns(shortcutGridColumns, DEFAULT_SHORTCUT_CARD_VARIANT, responsiveLayout.density);
  const minShortcutRows = responsiveLayout.baseRows;

  const {
    scenarioModes, setScenarioModes,
    selectedScenarioId, setSelectedScenarioId,
    scenarioShortcuts, setScenarioShortcuts,
    setUserRole,
    totalShortcuts,
    contextMenu, setContextMenu,
    shortcutEditOpen, setShortcutEditOpen,
    shortcutModalMode, setShortcutModalMode,
    shortcutDeleteOpen, setShortcutDeleteOpen,
    selectedShortcut, setSelectedShortcut,
    editingTitle, setEditingTitle,
    editingUrl, setEditingUrl,
    isDragging,
    currentEditScenarioId,
    setCurrentInsertIndex,
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
  );

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [pendingRootFolderMerge, setPendingRootFolderMerge] = useState<PendingRootFolderMerge | null>(null);
  const [folderNameDialogOpen, setFolderNameDialogOpen] = useState(false);
  const [externalShortcutDragSession, setExternalShortcutDragSession] = useState<ExternalShortcutDragSession | null>(null);
  const folderTransitionController = useFolderTransitionController();
  const openFolderId = folderTransitionController.activeFolderId;
  const runAfterFolderOverlayClose = folderTransitionController.runAfterClose;

  const openFolderShortcut = useMemo(
    () => (openFolderId ? findShortcutById(shortcuts, openFolderId) : null),
    [openFolderId, shortcuts],
  );
  const compactOverlayShortcut = useMemo(() => {
    const overlayFolderId = folderTransitionController.overlayFolderId;
    return overlayFolderId ? findShortcutById(shortcuts, overlayFolderId) : null;
  }, [folderTransitionController.overlayFolderId, shortcuts]);
  const editingFolderShortcut = useMemo(
    () => (editingFolderId ? findShortcutById(shortcuts, editingFolderId) : null),
    [editingFolderId, shortcuts],
  );
  const folderNameDialogInitialName = pendingRootFolderMerge
    ? t('context.newFolder', { defaultValue: '新文件夹' })
    : (editingFolderShortcut?.title || '');
  const folderNameDialogTitle = pendingRootFolderMerge
    ? t('context.nameFolder', { defaultValue: '给分组起个名字' })
    : undefined;
  const folderNameDialogDescription = pendingRootFolderMerge
    ? t('context.nameFolderDesc', { defaultValue: '只有点确定后，这两个图标才会真正编成组。' })
    : undefined;

  useEffect(() => {
    if (openFolderId && !openFolderShortcut) {
      folderTransitionController.clearImmediately();
    }
  }, [folderTransitionController, openFolderId, openFolderShortcut]);

  useEffect(() => {
    if (editingFolderId && !editingFolderShortcut) {
      setEditingFolderId(null);
      if (!pendingRootFolderMerge) {
        setFolderNameDialogOpen(false);
      }
    }
  }, [editingFolderId, editingFolderShortcut, pendingRootFolderMerge]);

  const captureFolderOpeningSourceSnapshot = useCallback((folderId: string) => {
    const sourcePreview = getFolderPreviewRoot(folderId);
    const sourceRect = copyFolderOverlaySnapshotRect(sourcePreview?.getBoundingClientRect());
    if (!sourceRect) return null;
    const sourceBorderRadius = readElementBorderRadiusPx(sourcePreview);

    const previewSlots = getFolderPreviewSlotEntries(folderId);
    const sourceChildSlotRects: FolderOverlaySnapshotRect[] = [];
    const sourceChildRects: ShortcutFolderOpeningSourceSnapshot['sourceChildRects'] = [];

    previewSlots.forEach((slot) => {
      const rect = copyFolderOverlaySnapshotRect(slot.element.getBoundingClientRect());
      if (!rect) return;
      sourceChildSlotRects[slot.index] = rect;
      sourceChildRects.push({
        childId: slot.childId,
        rect,
      });
    });

    return {
      folderId,
      sourceRect,
      sourceBorderRadius,
      sourceChildRects,
      sourceChildSlotRects: sourceChildSlotRects.filter(Boolean),
    };
  }, []);

  const handleShortcutActivate = useCallback((shortcut: Shortcut) => {
    if (isShortcutFolder(shortcut)) {
      const sourceSnapshot = captureFolderOpeningSourceSnapshot(shortcut.id);
      folderTransitionController.openFolder(shortcut.id, sourceSnapshot);
      return;
    }
    handleShortcutOpen(shortcut);
  }, [captureFolderOpeningSourceSnapshot, folderTransitionController, handleShortcutOpen]);

  const handleOpenShortcutEditor = useCallback((shortcutIndex: number, shortcut: Shortcut) => {
    if (isShortcutFolder(shortcut)) {
      setEditingFolderId(shortcut.id);
      setFolderNameDialogOpen(true);
      return;
    }
    setSelectedShortcut({ index: shortcutIndex, shortcut });
    setEditingTitle(shortcut.title);
    setEditingUrl(shortcut.url);
    setShortcutModalMode('edit');
    setShortcutEditOpen(true);
  }, [
    setEditingTitle,
    setEditingUrl,
    setSelectedShortcut,
    setShortcutEditOpen,
    setShortcutModalMode,
  ]);

  const handleOpenFolderChildShortcutEditor = useCallback((folderId: string, shortcut: Shortcut) => {
    runAfterFolderOverlayClose(folderId, () => {
      setSelectedShortcut({ index: -1, shortcut, parentFolderId: folderId });
      setEditingTitle(shortcut.title);
      setEditingUrl(shortcut.url);
      setShortcutModalMode('edit');
      setShortcutEditOpen(true);
    });
  }, [
    runAfterFolderOverlayClose,
    setEditingTitle,
    setEditingUrl,
    setSelectedShortcut,
    setShortcutEditOpen,
    setShortcutModalMode,
  ]);

  const handleDeleteFolderChildShortcut = useCallback((folderId: string, shortcut: Shortcut) => {
    runAfterFolderOverlayClose(folderId, () => {
      setSelectedShortcut({ index: -1, shortcut, parentFolderId: folderId });
      setShortcutDeleteOpen(true);
    });
  }, [
    runAfterFolderOverlayClose,
    setSelectedShortcut,
    setShortcutDeleteOpen,
  ]);

  const handleFolderChildShortcutContextMenu = useCallback((
    event: ReactMouseEvent<HTMLDivElement>,
    folderId: string,
    shortcut: Shortcut,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 172;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, kind: 'folder-shortcut', folderId, shortcut });
  }, [setContextMenu]);

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
    const targetScenarioName = scenarioModes.find((mode) => mode.id === targetScenarioId)?.name
      ?? t('scenario.unnamed', { defaultValue: '未命名情景模式' });
    let movedCount = 0;
    let changed = false;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const targetShortcuts = prev[targetScenarioId] ?? [];
      const validIndices = Array.from(new Set(
        selectedShortcutIndexes
          .filter((index) => Number.isInteger(index) && index >= 0 && index < sourceShortcuts.length),
      )).sort((a, b) => a - b);
      if (validIndices.length === 0) return prev;
      movedCount = validIndices.length;
      const selectedSet = new Set(validIndices);
      const movedShortcuts = validIndices.map((index) => sourceShortcuts[index]);
      const nextSourceShortcuts = sourceShortcuts.filter((_, index) => !selectedSet.has(index));
      const nextTargetShortcuts = [...targetShortcuts, ...movedShortcuts];
      changed = true;
      return {
        ...prev,
        [selectedScenarioId]: nextSourceShortcuts,
        [targetScenarioId]: nextTargetShortcuts,
      };
    });
    if (!changed || movedCount <= 0) return;
    toast.success(t('context.movedToScenarioToast', {
      count: movedCount,
      scenario: targetScenarioName,
      defaultValue: '已将 {{count}} 项移动到“{{scenario}}”',
    }));
    if (!user) localDirtyRef.current = true;
  }, [localDirtyRef, scenarioModes, selectedScenarioId, setScenarioShortcuts, t, user]);

  const handleCreateFolderFromSelection = useCallback((selectedShortcutIndexes: number[]) => {
    let createdFolderId = '';
    let changed = false;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const validIds = Array.from(new Set(
        selectedShortcutIndexes
          .filter((index) => Number.isInteger(index) && index >= 0 && index < sourceShortcuts.length)
          .map((index) => sourceShortcuts[index]?.id)
          .filter((id): id is string => Boolean(id)),
      ));

      const result = mergeShortcutsIntoNewFolder(sourceShortcuts, ROOT_SHORTCUTS_PATH, validIds, (folderChildren) => ({
        id: createFolderShortcutId(),
        title: t('context.newFolder', { defaultValue: '新文件夹' }),
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: 'small',
        children: folderChildren,
      }));
      if (!result) return prev;

      changed = true;
      createdFolderId = result.folder.id;
      return {
        ...prev,
        [selectedScenarioId]: result.nextShortcuts,
      };
    });
    if (!createdFolderId || !changed) return;
    if (!user) localDirtyRef.current = true;
    setEditingFolderId(createdFolderId);
    setFolderNameDialogOpen(true);
  }, [localDirtyRef, selectedScenarioId, setScenarioShortcuts, t, user]);

  const handleMoveSelectedShortcutsToFolder = useCallback((selectedShortcutIndexes: number[], targetFolderId: string) => {
    if (!targetFolderId) return;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const validIndices = Array.from(new Set(
        selectedShortcutIndexes
          .filter((index) => Number.isInteger(index) && index >= 0 && index < sourceShortcuts.length)
          .filter((index) => isShortcutLink(sourceShortcuts[index])),
      )).sort((a, b) => a - b);
      if (validIndices.length === 0) return prev;
      const shortcutIds = validIndices.map((index) => sourceShortcuts[index]?.id).filter((id): id is string => Boolean(id));
      const nextShortcuts = moveShortcutsIntoFolder(sourceShortcuts, ROOT_SHORTCUTS_PATH, shortcutIds, targetFolderId);
      if (!nextShortcuts) return prev;
      return {
        ...prev,
        [selectedScenarioId]: nextShortcuts,
      };
    });
    if (!user) localDirtyRef.current = true;
  }, [localDirtyRef, selectedScenarioId, setScenarioShortcuts, user]);

  const markShortcutStateDirty = useCallback(() => {
    if (!user) localDirtyRef.current = true;
  }, [localDirtyRef, user]);

  const commitShortcutInteractionOutcome = useCallback((outcome: ShortcutInteractionApplication) => {
    if (outcome.kind === 'start-root-drag-session') {
      flushSync(() => {
        if (outcome.closeFolderId) {
          folderTransitionController.clearImmediately();
        }
        setScenarioShortcuts((prev) => ({
          ...prev,
          [selectedScenarioId]: outcome.shortcuts,
        }));
        setExternalShortcutDragSession({
          token: Date.now(),
          ...outcome.session,
        });
      });
      markShortcutStateDirty();
    }
  }, [folderTransitionController, markShortcutStateDirty, selectedScenarioId, setScenarioShortcuts]);

  const handleShortcutDropIntent = useCallback((intent: ShortcutDropIntent) => {
    const outcome = applyShortcutDropIntent(shortcuts, intent);
    if (outcome.kind === 'request-folder-merge') {
      setEditingFolderId(null);
      setPendingRootFolderMerge({
        scenarioId: selectedScenarioId,
        activeShortcutId: outcome.activeShortcutId,
        targetShortcutId: outcome.targetShortcutId,
      });
      setFolderNameDialogOpen(true);
      return;
    }
    if (outcome.kind === 'noop' || outcome.kind === 'unsupported-tree') return;

    let changed = false;

    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const nextOutcome = applyShortcutDropIntent(sourceShortcuts, intent);
      if (nextOutcome.kind !== 'update-shortcuts') return prev;
      changed = true;
      return {
        ...prev,
        [selectedScenarioId]: nextOutcome.shortcuts,
      };
    });

    if (!changed) return;
    markShortcutStateDirty();
  }, [markShortcutStateDirty, selectedScenarioId, setScenarioShortcuts, shortcuts]);

  const handleRootShortcutDropIntent = useCallback((intent: RootShortcutDropIntent) => {
    handleShortcutDropIntent(intent);
  }, [handleShortcutDropIntent]);

  const handleDissolveFolder = useCallback((shortcutIndex: number, shortcut: Shortcut) => {
    if (!isShortcutFolder(shortcut)) return;
    let changed = false;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const resolvedFolderId = sourceShortcuts[shortcutIndex]?.id === shortcut.id
        ? shortcut.id
        : sourceShortcuts.find((item) => item.id === shortcut.id)?.id;
      if (!resolvedFolderId) return prev;
      const nextShortcuts = dissolveFolder(sourceShortcuts, resolvedFolderId);
      if (!nextShortcuts) return prev;
      changed = true;
      return {
        ...prev,
        [selectedScenarioId]: nextShortcuts,
      };
    });
    if (!changed) return;
    if (!user) localDirtyRef.current = true;
    if (openFolderId === shortcut.id) {
      folderTransitionController.clearImmediately();
    }
    toast.success(t('context.folderDissolved', { defaultValue: '文件夹已解散' }));
  }, [folderTransitionController, localDirtyRef, openFolderId, selectedScenarioId, setScenarioShortcuts, t, user]);

  const handleFolderShortcutDropIntent = useCallback((intent: FolderShortcutDropIntent) => {
    handleShortcutDropIntent(intent);
  }, [handleShortcutDropIntent]);

  const handleFolderExtractDragStart = useCallback((payload: FolderExtractDragStartPayload) => {
    const outcome = applyFolderExtractDragStart(shortcuts, payload);
    if (outcome.kind !== 'start-root-drag-session') return;
    commitShortcutInteractionOutcome(outcome);
  }, [commitShortcutInteractionOutcome, shortcuts]);

  const handleFolderEngineChildrenCommit = useCallback((folderId: string, children: Shortcut[]) => {
    if (!folderId) return;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      let changed = false;
      const nextShortcuts = sourceShortcuts.map((shortcut) => {
        if (shortcut.id !== folderId || !isShortcutFolder(shortcut)) return shortcut;
        changed = true;
        return {
          ...shortcut,
          children,
        };
      });
      if (!changed) return prev;
      return {
        ...prev,
        [selectedScenarioId]: nextShortcuts,
      };
    });
    if (!user) localDirtyRef.current = true;
  }, [localDirtyRef, selectedScenarioId, setScenarioShortcuts, user]);

  const handleSaveFolderName = useCallback((name: string) => {
    const nextName = name.trim();
    if (!nextName) return;

    if (pendingRootFolderMerge) {
      let changed = false;
      setScenarioShortcuts((prev) => {
        const sourceShortcuts = prev[pendingRootFolderMerge.scenarioId] ?? [];
        const result = mergeShortcutsIntoNewFolder(
          sourceShortcuts,
          ROOT_SHORTCUTS_PATH,
          [pendingRootFolderMerge.activeShortcutId, pendingRootFolderMerge.targetShortcutId],
          (folderChildren) => ({
            id: createFolderShortcutId(),
            title: nextName,
            url: '',
            icon: '',
            kind: 'folder',
            folderDisplayMode: 'small',
            children: folderChildren,
          }),
        );
        if (!result) return prev;

        changed = true;
        return {
          ...prev,
          [pendingRootFolderMerge.scenarioId]: result.nextShortcuts,
        };
      });
      if (!changed) return;
      if (!user) localDirtyRef.current = true;
      setPendingRootFolderMerge(null);
      setFolderNameDialogOpen(false);
      setEditingFolderId(null);
      return;
    }

    if (!editingFolderId) return;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      let changed = false;
      const nextShortcuts = sourceShortcuts.map((shortcut) => {
        if (shortcut.id !== editingFolderId || !isShortcutFolder(shortcut)) return shortcut;
        changed = true;
        return {
          ...shortcut,
          title: nextName,
        };
      });
      if (!changed) return prev;
      return {
        ...prev,
        [selectedScenarioId]: nextShortcuts,
      };
    });
    if (!user) localDirtyRef.current = true;
    setFolderNameDialogOpen(false);
    setEditingFolderId(null);
  }, [editingFolderId, localDirtyRef, pendingRootFolderMerge, selectedScenarioId, setScenarioShortcuts, user]);

  const handleRenameFolderInline = useCallback((folderId: string, name: string) => {
    const nextName = name.trim();
    if (!folderId || !nextName) return;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      let changed = false;
      const nextShortcuts = sourceShortcuts.map((shortcut) => {
        if (shortcut.id !== folderId || !isShortcutFolder(shortcut)) return shortcut;
        changed = true;
        return {
          ...shortcut,
          title: nextName,
        };
      });
      if (!changed) return prev;
      return {
        ...prev,
        [selectedScenarioId]: nextShortcuts,
      };
    });
    if (!user) localDirtyRef.current = true;
  }, [localDirtyRef, selectedScenarioId, setScenarioShortcuts, user]);

  const handleSetFolderDisplayMode = useCallback((
    shortcutIndex: number,
    shortcut: Shortcut,
    mode: 'small' | 'large',
  ) => {
    if (!isShortcutFolder(shortcut)) return;
    let changed = false;
    setScenarioShortcuts((prev) => {
      const sourceShortcuts = prev[selectedScenarioId] ?? [];
      const resolvedFolderId = sourceShortcuts[shortcutIndex]?.id === shortcut.id
        ? shortcut.id
        : sourceShortcuts.find((item) => item.id === shortcut.id)?.id;
      if (!resolvedFolderId) return prev;

      let changed = false;
      const nextShortcuts = sourceShortcuts.map((item) => {
        if (item.id !== resolvedFolderId || !isShortcutFolder(item)) return item;
        const nextMode: ShortcutFolderDisplayMode = mode === 'large' ? 'large' : 'small';
        if ((item.folderDisplayMode || 'small') === nextMode) return item;
        changed = true;
        return {
          ...item,
          folderDisplayMode: nextMode,
        };
      });

      if (!changed) return prev;
      return {
        ...prev,
        [selectedScenarioId]: nextShortcuts,
      } satisfies typeof prev;
    });
    if (changed && !user) {
      localDirtyRef.current = true;
    }
  }, [localDirtyRef, selectedScenarioId, setScenarioShortcuts, user]);

  const [accentColorSetting, setAccentColorSetting] = useState<string>(() => readAccentColorSetting());
  const [preventDuplicatePermissionRequestInFlight, setPreventDuplicatePermissionRequestInFlight] = useState(false);
  const [wallpaperImageReadyTick, setWallpaperImageReadyTick] = useState(0);

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
    }, {
      // Re-sample once the rendered wallpaper image finishes loading to avoid
      // caching a fallback color from an early decode/load race.
      forceImageResample: wallpaperImageReadyTick > 0,
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
  }, [
    accentColorSetting,
    effectiveWallpaperMode,
    bingWallpaper,
    customWallpaper,
    weatherCode,
    colorWallpaperId,
    wallpaperImageReadyTick,
  ]);

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
      shortcutCardVariant: DEFAULT_SHORTCUT_CARD_VARIANT,
      shortcutCompactShowTitle,
      shortcutIconAppearance,
      shortcutIconCornerRadius,
      shortcutIconScale,
      shortcutGridColumnsByVariant: {
        ...stored.shortcutGridColumnsByVariant,
        compact: normalizedGridColumns,
      },
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
    openInNewTab,
    preventDuplicateNewTab,
    privacyConsent,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchRotatingPlaceholderEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    shortcutCompactShowTitle,
    shortcutIconAppearance,
    shortcutIconCornerRadius,
    shortcutIconScale,
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

  const stripWallpaperFromCloudSyncPreferences = useCallback((preferences: SyncablePreferences): SyncablePreferences => {
    return normalizeSyncablePreferences({
      ...preferences,
      wallpaperMode: null,
      wallpaperMaskOpacity: 10,
      darkModeAutoDimWallpaperEnabled: true,
      colorWallpaperId: DEFAULT_COLOR_WALLPAPER_ID,
    });
  }, []);

  const mergeCloudSyncSnapshotWithLocalWallpaper = useCallback((snapshot: LeafTabSyncSnapshot): LeafTabSyncSnapshot => {
    if (!snapshot.preferences) return snapshot;
    const localPreferences = buildSyncablePreferencesSnapshot();
    return {
      ...snapshot,
      preferences: {
        ...snapshot.preferences,
        value: normalizeSyncablePreferences({
          ...snapshot.preferences.value,
          wallpaperMode: localPreferences.wallpaperMode,
          wallpaperMaskOpacity: localPreferences.wallpaperMaskOpacity,
          darkModeAutoDimWallpaperEnabled: localPreferences.darkModeAutoDimWallpaperEnabled,
          colorWallpaperId: localPreferences.colorWallpaperId,
        }),
      },
    };
  }, [buildSyncablePreferencesSnapshot]);

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
    setShortcutCompactShowTitle(normalized.shortcutCompactShowTitle);
    setShortcutGridColumns(normalized.shortcutGridColumnsByVariant.compact);
    setShortcutIconAppearance(normalized.shortcutIconAppearance);
    setShortcutIconCornerRadius(normalized.shortcutIconCornerRadius);
    setShortcutIconScale(normalized.shortcutIconScale);
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
    setShortcutCompactShowTitle,
    setShortcutGridColumns,
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

  const { roleSelectorOpen, handleRoleSelect } = useRole(
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

  const onLoginSuccess = useCallback((username: string, _role?: string | null, consent?: boolean | null) => {
    handleLoginSuccess(username);
    setCloudLoginSyncPendingUser(username);
    if (typeof consent !== 'undefined') {
      setPrivacyConsent(consent as any);
      try { localStorage.setItem('privacy_consent', JSON.stringify(consent)); } catch {}
    }
  }, [handleLoginSuccess, setPrivacyConsent]);
  const handleAuthModalOpenChange = useCallback((open: boolean) => {
    setIsAuthModalOpen(open);
    if (!open) {
      setAuthModalMode('login');
    }
  }, [setIsAuthModalOpen]);
  const openGoogleLinkAuthModal = useCallback(() => {
    if (!user) return;
    setCloudSyncConfigOpen(false);
    setLeafTabSyncDialogOpen(false);
    setAuthModalMode('link-google');
    setIsAuthModalOpen(true);
  }, [setCloudSyncConfigOpen, setIsAuthModalOpen, setLeafTabSyncDialogOpen, user]);
  
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

  const handleOpenSearchSettings = useCallback(() => {
    setSearchSettingsOpen(true);
  }, []);

  const handleOpenShortcutIconSettings = useCallback(() => {
    setShortcutIconSettingsOpen(true);
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
  const clearCloudSyncError = useCallback(() => {
    localStorage.removeItem('cloud_last_error_at');
    localStorage.removeItem('cloud_last_error_message');
    emitCloudSyncStatusChanged();
  }, []);
  const applyCloudDangerousBookmarkChoice = useCallback(() => {
    applyCloudDangerousBookmarkChoiceToStorage();
    window.dispatchEvent(new Event('cloud-sync-config-changed'));
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
  const clearWebdavSyncError = useCallback(() => {
    localStorage.removeItem('webdav_last_error_at');
    localStorage.removeItem('webdav_last_error_message');
    emitWebdavSyncStatusChanged();
  }, [emitWebdavSyncStatusChanged]);

  const markWebdavSyncError = useCallback((error: unknown) => {
    console.error('[LeafTab][WebDAV sync]', error);
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
  const applyWebdavDangerousBookmarkChoice = useCallback(() => {
    applyWebdavDangerousBookmarkChoiceToStorage();
    emitWebdavSyncStatusChanged();
  }, [emitWebdavSyncStatusChanged]);

  const leafTabSyncWebdavConfig = useMemo(() => {
    const config = readWebdavConfigFromStorage({ allowDisabled: true });
    if (!config?.url) return null;
    return {
      url: config.url,
      username: config.username,
      password: config.password,
      filePath: config.filePath,
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
  const cloudSyncToken = useMemo(() => (
    user ? (localStorage.getItem('token') || '') : ''
  ), [user]);
  const syncRuntime = useLeafTabSyncRuntime(Boolean(leafTabSyncWebdavConfig?.url || (user && cloudSyncToken)));
  const leafTabWebdavBaseStore = useMemo(() => {
    if (!syncRuntime || !leafTabSyncWebdavConfig?.url) return null;
    return new syncRuntime.LeafTabSyncWebdavStore({
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
    syncRuntime,
  ]);
  const leafTabWebdavEncryptedTransport = useMemo(() => {
    if (!syncRuntime || !leafTabWebdavBaseStore || !leafTabWebdavEncryptionScopeKey) return null;
    return new syncRuntime.LeafTabSyncWebdavEncryptedTransport({
      webdavStore: leafTabWebdavBaseStore,
      rootPath: leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    });
  }, [
    leafTabSyncWebdavConfig?.rootPath,
    leafTabWebdavBaseStore,
    leafTabWebdavEncryptionScopeKey,
    syncRuntime,
  ]);
  const leafTabSyncRemoteStore = useMemo(() => {
    if (!syncRuntime || !leafTabWebdavEncryptedTransport || !leafTabWebdavEncryptionScopeKey) return null;
    return new syncRuntime.LeafTabSyncEncryptedRemoteStore({
      transport: leafTabWebdavEncryptedTransport,
      scopeKey: leafTabWebdavEncryptionScopeKey,
      scopeLabel: t('leaftabSync.provider.webdav', { defaultValue: 'WebDAV 同步' }),
      rootPath: leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    });
  }, [
    leafTabSyncWebdavConfig?.rootPath,
    leafTabWebdavEncryptedTransport,
    leafTabWebdavEncryptionScopeKey,
    syncRuntime,
    t,
  ]);
  const webdavStorageState = useMemo(
    () => readWebdavStorageStateFromStorage(),
    [leafTabSyncConfigVersion],
  );
  const webdavSyncBookmarksEnabled = webdavStorageState.syncBookmarksEnabled;
  const leafTabSyncBookmarksDisabledRemoteStore = useMemo(() => {
    if (!syncRuntime || !leafTabSyncRemoteStore) return null;
    return new syncRuntime.LeafTabSyncBookmarksDisabledRemoteStore(leafTabSyncRemoteStore);
  }, [leafTabSyncRemoteStore, syncRuntime]);
  const leafTabSyncEffectiveRemoteStore = useMemo(() => {
    if (!leafTabSyncRemoteStore) return null;
    if (webdavSyncBookmarksEnabled) return leafTabSyncRemoteStore;
    return leafTabSyncBookmarksDisabledRemoteStore;
  }, [
    leafTabSyncBookmarksDisabledRemoteStore,
    leafTabSyncRemoteStore,
    webdavSyncBookmarksEnabled,
  ]);
  const cloudSyncConfig = useMemo(
    () => readCloudSyncConfigFromStorage(),
    [cloudSyncConfigVersion, user],
  );
  const cloudSyncBookmarksConfigured = cloudSyncConfig.syncBookmarksEnabled;
  const [cloudSyncBookmarksPermissionGranted, setCloudSyncBookmarksPermissionGranted] = useState(false);
  useEffect(() => {
    let disposed = false;
    if (!user || !cloudSyncBookmarksConfigured) {
      setCloudSyncBookmarksPermissionGranted(false);
      return () => {
        disposed = true;
      };
    }
    void ensureExtensionPermission('bookmarks', { requestIfNeeded: false })
      .then((granted) => {
        if (!disposed) {
          setCloudSyncBookmarksPermissionGranted(Boolean(granted));
        }
      })
      .catch(() => {
        if (!disposed) {
          setCloudSyncBookmarksPermissionGranted(false);
        }
      });
    return () => {
      disposed = true;
    };
  }, [cloudSyncBookmarksConfigured, user]);
  const cloudSyncBookmarksEnabled = resolveCloudSyncBookmarksEnabled(
    cloudSyncBookmarksConfigured,
    cloudSyncBookmarksPermissionGranted,
  );
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
    if (!syncRuntime || !user || !cloudSyncToken) return null;
    return new syncRuntime.LeafTabSyncCloudEncryptedTransport({
      apiUrl: API_URL,
      token: cloudSyncToken,
    });
  }, [API_URL, cloudSyncToken, syncRuntime, user]);
  const cloudSyncRemoteStore = useMemo(() => {
    if (!syncRuntime || !cloudSyncEncryptedTransport || !cloudSyncEncryptionScopeKey) return null;
    return new syncRuntime.LeafTabSyncEncryptedRemoteStore({
      transport: cloudSyncEncryptedTransport,
      scopeKey: cloudSyncEncryptionScopeKey,
      scopeLabel: t('leaftabSync.provider.cloud', { defaultValue: '云同步' }),
      rootPath: LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
    });
  }, [cloudSyncEncryptedTransport, cloudSyncEncryptionScopeKey, syncRuntime, t]);
  const cloudSyncBookmarksDisabledRemoteStore = useMemo(() => {
    if (!syncRuntime || !cloudSyncRemoteStore) return null;
    return new syncRuntime.LeafTabSyncBookmarksDisabledRemoteStore(cloudSyncRemoteStore);
  }, [cloudSyncRemoteStore, syncRuntime]);
  const cloudSyncEffectiveRemoteStore = useMemo(() => {
    if (!cloudSyncRemoteStore) return null;
    if (cloudSyncBookmarksEnabled) return cloudSyncRemoteStore;
    if (!syncRuntime) return null;
    return new syncRuntime.LeafTabSyncBookmarksDisabledRemoteStore(cloudSyncRemoteStore);
  }, [cloudSyncBookmarksEnabled, cloudSyncRemoteStore, syncRuntime]);

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
    () => t('bookmarks.scope.rootsLabel', { defaultValue: 'Bookmarks bar, Other bookmarks' }),
    [i18n.language, t],
  );

  const {
    buildSnapshotFromCurrentState: buildLeafTabSyncSnapshotFromCurrentState,
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
    const bookmarkMode = resolveCloudSyncBookmarkApplyMode(cloudSyncBookmarksEnabled);
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: cloudSyncBaselineStorageKey,
      includeBookmarks: bookmarkMode.includeBookmarks,
      preferencesTransform: stripWallpaperFromCloudSyncPreferences,
    });
  }, [
    buildLeafTabSyncSnapshotFromCurrentState,
    cloudSyncBaselineStorageKey,
    cloudSyncBookmarksEnabled,
    stripWallpaperFromCloudSyncPreferences,
  ]);
  const buildWebdavLeafTabSyncSnapshotWithScope = useCallback(async () => {
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: leafTabSyncBaselineStorageKey,
      includeBookmarks: webdavSyncBookmarksEnabled,
    });
  }, [
    buildLeafTabSyncSnapshotFromCurrentState,
    leafTabSyncBaselineStorageKey,
    webdavSyncBookmarksEnabled,
  ]);
  const buildWebdavLeafTabSyncSnapshotWithoutBookmarks = useCallback(async () => {
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: leafTabSyncBaselineStorageKey,
      includeBookmarks: false,
    });
  }, [
    buildLeafTabSyncSnapshotFromCurrentState,
    leafTabSyncBaselineStorageKey,
  ]);
  const buildCloudLeafTabSyncSnapshotWithoutBookmarks = useCallback(async () => {
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: cloudSyncBaselineStorageKey,
      includeBookmarks: false,
      preferencesTransform: stripWallpaperFromCloudSyncPreferences,
    });
  }, [
    buildLeafTabSyncSnapshotFromCurrentState,
    cloudSyncBaselineStorageKey,
    stripWallpaperFromCloudSyncPreferences,
  ]);
  const applyCloudLeafTabSyncSnapshot = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    const snapshotWithoutCloudWallpaper = mergeCloudSyncSnapshotWithLocalWallpaper(snapshot);
    const bookmarkMode = resolveCloudSyncBookmarkApplyMode(cloudSyncBookmarksEnabled);
    if (!bookmarkMode.skipBookmarkApply) {
      await applyLeafTabSyncSnapshot(snapshotWithoutCloudWallpaper);
      return;
    }

    await applyLeafTabSyncSnapshot(snapshotWithoutCloudWallpaper, {
      skipBookmarkApply: bookmarkMode.skipBookmarkApply,
    });
  }, [
    applyLeafTabSyncSnapshot,
    cloudSyncBookmarksEnabled,
    mergeCloudSyncSnapshotWithLocalWallpaper,
  ]);
  const applyWebdavLeafTabSyncSnapshot = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    if (webdavSyncBookmarksEnabled) {
      await applyLeafTabSyncSnapshot(snapshot);
      return;
    }
    await applyLeafTabSyncSnapshot(snapshot, {
      skipBookmarkApply: true,
    });
  }, [
    applyLeafTabSyncSnapshot,
    webdavSyncBookmarksEnabled,
  ]);
  const applyWebdavLeafTabSyncSnapshotWithoutBookmarks = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    await applyLeafTabSyncSnapshot(snapshot, {
      skipBookmarkApply: true,
    });
  }, [applyLeafTabSyncSnapshot]);
  const applyCloudLeafTabSyncSnapshotWithoutBookmarks = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    const snapshotWithoutCloudWallpaper = mergeCloudSyncSnapshotWithLocalWallpaper(snapshot);
    await applyLeafTabSyncSnapshot(snapshotWithoutCloudWallpaper, {
      skipBookmarkApply: true,
    });
  }, [
    applyLeafTabSyncSnapshot,
    mergeCloudSyncSnapshotWithLocalWallpaper,
  ]);
  const cloudSyncRunnerRef = useRef<(options?: CloudLeafTabSyncOptions) => Promise<unknown>>(async () => null);
  const {
    syncEncryptionDialogState,
    syncEncryptionDialogBusy,
    handleSyncEncryptionDialogOpenChange,
    handleSubmitSyncEncryptionDialog,
    ensureSyncEncryptionAccess,
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
    invalidateAnalysis: invalidateLeafTabSyncAnalysis,
    refreshAnalysis: refreshLeafTabSyncAnalysis,
    runSync: runLeafTabSync,
    clearSyncError: clearLeafTabSyncErrorState,
    syncState: leafTabSyncState,
  } = useLeafTabSyncEngine({
    deviceId: leafTabSyncDeviceId,
    webdav: null,
    remoteStore: leafTabSyncEffectiveRemoteStore,
    legacyCompat: webdavLegacyCompat,
    buildLocalSnapshot: buildWebdavLeafTabSyncSnapshotWithScope,
    applyLocalSnapshot: applyWebdavLeafTabSyncSnapshot,
    createEmptySnapshot: createEmptyLeafTabSyncSnapshot,
    baselineStorageKey: leafTabSyncBaselineStorageKey,
  });

  const {
    analysis: cloudLeafTabSyncAnalysis,
    hasConfig: cloudLeafTabSyncHasConfig,
    lastResult: cloudLeafTabSyncLastResult,
    invalidateAnalysis: invalidateCloudLeafTabSyncAnalysis,
    refreshAnalysis: refreshCloudLeafTabSyncAnalysis,
    runSync: runCloudLeafTabSync,
    clearSyncError: clearCloudLeafTabSyncErrorState,
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
  const { runSync: runLeafTabSyncWithoutBookmarks } = useLeafTabSyncEngine({
    deviceId: leafTabSyncDeviceId,
    webdav: null,
    remoteStore: leafTabSyncBookmarksDisabledRemoteStore,
    legacyCompat: webdavLegacyCompat,
    buildLocalSnapshot: buildWebdavLeafTabSyncSnapshotWithoutBookmarks,
    applyLocalSnapshot: applyWebdavLeafTabSyncSnapshotWithoutBookmarks,
    createEmptySnapshot: createEmptyLeafTabSyncSnapshot,
    baselineStorageKey: leafTabSyncBaselineStorageKey,
  });
  const { runSync: runCloudLeafTabSyncWithoutBookmarks } = useLeafTabSyncEngine({
    enabled: Boolean(user && cloudSyncToken),
    deviceId: leafTabSyncDeviceId,
    webdav: null,
    remoteStore: cloudSyncBookmarksDisabledRemoteStore,
    legacyCompat: cloudLegacyCompat,
    buildLocalSnapshot: buildCloudLeafTabSyncSnapshotWithoutBookmarks,
    applyLocalSnapshot: applyCloudLeafTabSyncSnapshotWithoutBookmarks,
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
  const presentDangerousSyncDialog = useCallback(async (params: {
    provider: 'cloud' | 'webdav';
    error: DangerousSyncError;
  }) => {
    const refreshedAnalysis = await (
      params.provider === 'cloud'
        ? refreshCloudLeafTabSyncAnalysis({ force: true }).catch(() => cloudLeafTabSyncAnalysis)
        : refreshLeafTabSyncAnalysis({ force: true }).catch(() => leafTabSyncAnalysis)
    );
    const analysis = refreshedAnalysis
      || (params.provider === 'cloud' ? cloudLeafTabSyncAnalysis : leafTabSyncAnalysis);

    setDangerousSyncDialogBusyAction(null);
    setDangerousSyncDialogState({
      open: true,
      provider: params.provider,
      localBookmarkCount: analysis?.localSummary.bookmarkItems ?? null,
      remoteBookmarkCount: analysis?.remoteSummary.bookmarkItems ?? null,
      detectedFromCount: params.error.fromCount,
      detectedToCount: params.error.toCount,
    });
  }, [
    cloudLeafTabSyncAnalysis,
    leafTabSyncAnalysis,
    refreshCloudLeafTabSyncAnalysis,
    refreshLeafTabSyncAnalysis,
  ]);
  const closeDangerousSyncDialog = useCallback(() => {
    setDangerousSyncDialogBusyAction(null);
    setDangerousSyncDialogState(null);
  }, []);
  const webdavSkipBookmarksForThisRunRef = useRef(false);
  const cloudSkipBookmarksForThisRunRef = useRef(false);
  const webdavDeferredDangerousBookmarksScopeKeyRef = useRef<string | null>(null);
  const cloudDeferredDangerousBookmarksScopeKeyRef = useRef<string | null>(null);
  const runWebdavSyncWithUi = useLeafTabSyncRunner<LeafTabSyncEngineResult, WebdavLeafTabSyncOptions>({
    providerLabel: t('leaftabSync.provider.webdav', { defaultValue: 'WebDAV 同步' }),
    runSync: (mode, progressOptions) => (
      webdavSkipBookmarksForThisRunRef.current
        ? runLeafTabSyncWithoutBookmarks(mode, progressOptions)
        : runLeafTabSync(mode, progressOptions)
    ),
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
      title: t('leaftabSyncRunner.webdav.prepareTitle', { defaultValue: '正在准备同步数据' }),
      detail: t('leaftabSyncRunner.webdav.prepareDetail', { defaultValue: '正在读取本地与云端状态' }),
      progress: 6,
    }),
    getPermissionProgressCopy: (options) => ({
      title: t('leaftabSyncRunner.permissionTitle', { defaultValue: '正在检查书签权限' }),
      detail: options.progressDetail || t('leaftabSyncRunner.permissionDetail', { defaultValue: '需要确认当前浏览器允许访问书签数据' }),
      progress: 10,
    }),
    getSuccessText: (result) => result.summaryText || t('leaftabSyncRunner.successTitle', { defaultValue: '同步完成' }),
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
      if (isNamedError(error, 'LeafTabDestructiveBookmarkChangeError')) {
        markWebdavSyncError(error);
        await presentDangerousSyncDialog({
          provider: 'webdav',
          error: error as DangerousSyncError,
        });
        return null;
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
    const hasDeferredDangerousBookmarks = Boolean(
      leafTabWebdavEncryptionScopeKey
      && webdavDeferredDangerousBookmarksScopeKeyRef.current === leafTabWebdavEncryptionScopeKey,
    );
    const {
      effectiveSkipBookmarks,
      effectiveRequestBookmarkPermission,
    } = resolveDeferredBookmarkSyncExecution({
      requestBookmarkPermission: options?.requestBookmarkPermission,
      skipBookmarksForThisRun: options?.skipBookmarksForThisRun === true,
      hasDeferredDangerousBookmarks,
    });
    if (effectiveSkipBookmarks) {
      webdavSkipBookmarksForThisRunRef.current = true;
    }
    try {
      return await runWebdavSyncWithUi({
        ...options,
        requestBookmarkPermission: effectiveRequestBookmarkPermission,
      });
    } finally {
      if (effectiveSkipBookmarks) {
        webdavSkipBookmarksForThisRunRef.current = false;
      }
    }
  }, [
    leafTabSyncHasConfig,
    leafTabWebdavEncryptionScopeKey,
    openLeafTabSyncConfig,
    runWebdavSyncWithUi,
  ]);

  const runCloudSyncWithUi = useLeafTabSyncRunner<LeafTabSyncEngineResult, CloudLeafTabSyncOptions>({
    providerLabel: t('leaftabSync.provider.cloud', { defaultValue: '云同步' }),
    runSync: (mode, progressOptions) => (
      cloudSkipBookmarksForThisRunRef.current
        ? runCloudLeafTabSyncWithoutBookmarks(mode, progressOptions)
        : runCloudLeafTabSync(mode, progressOptions)
    ),
    refreshAnalysis: refreshCloudLeafTabSyncAnalysis,
    resolveSyncEncryptionError,
    requestBookmarkPermission: async () => {
      const granted = await ensureExtensionPermission('bookmarks', { requestIfNeeded: true }).catch(() => false);
      setCloudSyncBookmarksPermissionGranted(Boolean(granted));
      if (!granted && cloudSyncBookmarksConfigured) {
        toast.info(t('leaftabSyncRunner.bookmarksPermissionDeniedToast', { defaultValue: '未授予书签权限，本次仅同步快捷方式和设置' }));
      }
      return granted;
    },
    longTask: {
      start: startLongTaskIndicator,
      update: updateLongTaskIndicator,
      finish: finishLongTaskIndicator,
      clear: clearLongTaskIndicator,
    },
    getInitialProgressCopy: () => ({
      title: t('leaftabSyncRunner.cloud.prepareTitle', { defaultValue: '正在准备云同步' }),
      detail: t('leaftabSyncRunner.cloud.prepareDetail', { defaultValue: '正在读取本地与账号云端状态' }),
      progress: 6,
    }),
    getPermissionProgressCopy: (options) => ({
      title: t('leaftabSyncRunner.permissionTitle', { defaultValue: '正在检查书签权限' }),
      detail: options.progressDetail || t('leaftabSyncRunner.permissionDetail', { defaultValue: '需要确认当前浏览器允许访问书签数据' }),
      progress: 10,
    }),
    getSuccessText: (result) => result.summaryText || t('leaftabSyncRunner.successTitle', { defaultValue: '同步完成' }),
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
        toast.info(t('leaftabSyncRunner.cloud.lockConflict.autoFixToast', { defaultValue: '检测到云同步锁冲突（409），正在自动修复后重试' }));
        context.options.onProgress?.({
          stage: 'acquiring-lock',
          message: t('leaftabSyncRunner.cloud.lockConflict.autoFixTitle', { defaultValue: '检测到旧云端锁，正在自动修复' }),
          progress: 18,
        });
        if (context.progressTaskId) {
          updateLongTaskIndicator(context.progressTaskId, {
            title: t('leaftabSyncRunner.cloud.lockConflict.autoFixTitle', { defaultValue: '检测到旧云端锁，正在自动修复' }),
            detail: context.options.progressDetail || t('leaftabSyncRunner.cloud.lockConflict.autoFixDetail', { defaultValue: '正在释放旧锁并重新尝试同步' }),
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
          message: t('leaftabSyncRunner.cloud.commitConflict.realignTitle', { defaultValue: '检测到云端版本变化，正在重新对齐状态' }),
          progress: 26,
        });
        if (context.progressTaskId) {
          updateLongTaskIndicator(context.progressTaskId, {
            title: t('leaftabSyncRunner.cloud.commitConflict.realignTitle', { defaultValue: '检测到云端版本变化，正在重新对齐状态' }),
            detail: context.options.progressDetail || t('leaftabSyncRunner.cloud.commitConflict.realignDetail', { defaultValue: '正在等待最新状态生效后重试' }),
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
      if (isCloudSyncLockConflictError(error)) {
        markCloudSyncError(error);
        toast.error(t('leaftabSyncRunner.cloud.lockConflict.failedToast', {
          defaultValue: '云同步失败（409）：当前账号同步锁被其他设备占用。请关闭其他设备同步后重试，或等待约 2 分钟再试。',
        }));
        return null;
      }
      if (isNamedError(error, 'LeafTabDestructiveBookmarkChangeError')) {
        markCloudSyncError(error);
        await presentDangerousSyncDialog({
          provider: 'cloud',
          error: error as DangerousSyncError,
        });
        return null;
      }
      markCloudSyncError(error);
      toast.error(formatCloudSyncErrorMessage(error));
      return null;
    },
  });

  const handleCloudLeafTabSync = useCallback(async (options?: CloudLeafTabSyncOptions) => {
    if (!user) {
      const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
      if (webdavEnabled) {
        toast.error(t('settings.backup.webdav.disableWebdavBeforeCloudLogin'));
      } else {
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
      }
      return null;
    }
    if (!cloudLeafTabSyncHasConfig) {
      return null;
    }
    if (!options?.allowWhenDisabled && !cloudSyncEnabled) {
      setSyncConfigBackTarget('sync-center');
      setLeafTabSyncDialogOpen(false);
      setCloudSyncConfigOpen(true);
      return null;
    }
    if (cloudSyncBookmarksConfigured && !cloudSyncBookmarksPermissionGranted) {
      toast.info(t('leaftabSyncRunner.bookmarksPermissionDeniedToastAlt', { defaultValue: '书签权限未授权，当前仅同步快捷方式和设置' }));
    }
    const hasDeferredDangerousBookmarks = Boolean(
      cloudSyncEncryptionScopeKey
      && cloudDeferredDangerousBookmarksScopeKeyRef.current === cloudSyncEncryptionScopeKey,
    );
    const {
      effectiveSkipBookmarks,
      effectiveRequestBookmarkPermission,
    } = resolveDeferredBookmarkSyncExecution({
      requestBookmarkPermission: options?.requestBookmarkPermission,
      skipBookmarksForThisRun: options?.skipBookmarksForThisRun === true,
      hasDeferredDangerousBookmarks,
    });
    if (effectiveSkipBookmarks) {
      cloudSkipBookmarksForThisRunRef.current = true;
    }
    try {
      return await runCloudSyncWithUi({
        ...options,
        requestBookmarkPermission: effectiveRequestBookmarkPermission,
      });
    } finally {
      if (effectiveSkipBookmarks) {
        cloudSkipBookmarksForThisRunRef.current = false;
      }
    }
  }, [
    cloudSyncEncryptionScopeKey,
    cloudSyncBookmarksConfigured,
    cloudSyncBookmarksPermissionGranted,
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
      providerLabel: t('leaftabSync.provider.webdav', { defaultValue: 'WebDAV 同步' }),
      scopeKey: leafTabWebdavEncryptionScopeKey,
      transport: leafTabWebdavEncryptedTransport,
    });
    if (!encryptionReady) {
      return;
    }
    await handleLeafTabSync({
      enableAfterSuccess: true,
      requestBookmarkPermission: webdavSyncBookmarksEnabled,
      showProgressIndicator: true,
    });
  }, [
    ensureSyncEncryptionAccess,
    handleLeafTabSync,
    leafTabWebdavEncryptedTransport,
    leafTabWebdavEncryptionScopeKey,
    t,
    user,
    webdavSyncBookmarksEnabled,
  ]);
  useEffect(() => {
    if (!pendingWebdavEnableScopeKey) return;
    if (!leafTabSyncHasConfig) return;
    if (pendingWebdavEnableScopeKey !== leafTabWebdavEncryptionScopeKey) return;
    setPendingWebdavEnableScopeKey(null);
    void handleEnableWebdavSync();
  }, [
    handleEnableWebdavSync,
    leafTabWebdavEncryptionScopeKey,
    leafTabSyncHasConfig,
    pendingWebdavEnableScopeKey,
  ]);

  const handleDisableWebdavSync = useCallback(async (options?: { clearLocal?: boolean }) => {
    const currentlyEnabled = (localStorage.getItem(WEBDAV_STORAGE_KEYS.syncEnabled) ?? 'false') === 'true';
    if (!currentlyEnabled) return;
    await runLongTask(
      {
        title: t('leaftabSyncRunner.webdav.disable.title', { defaultValue: '正在停用同步' }),
        detail: t('leaftabSyncRunner.webdav.disable.detail', { defaultValue: '正在处理最后一次同步和关闭操作' }),
        progress: 8,
      },
      async ({ update }) => {
        let forceSyncFailed = false;

        if (leafTabSyncHasConfig) {
          update({
            title: t('leaftabSyncRunner.webdav.disable.finalSyncTitle', { defaultValue: '正在同步最后的变更' }),
            progress: 18,
          });
          try {
            const result = await handleLeafTabSync({
              silentSuccess: true,
              progressDetail: t('leaftabSyncRunner.webdav.disable.detail', { defaultValue: '正在处理最后一次同步和关闭操作' }),
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
          title: t('leaftabSyncRunner.webdav.disable.closingTitle', { defaultValue: '正在关闭同步' }),
          progress: 92,
        });
        if (webdavDeferredDangerousBookmarksScopeKeyRef.current === leafTabWebdavEncryptionScopeKey) {
          webdavDeferredDangerousBookmarksScopeKeyRef.current = null;
        }
        setWebdavSyncEnabledInStorage(false);

        if (options?.clearLocal === true) {
          update({
            title: t('leaftabSyncRunner.webdav.disable.clearingTitle', { defaultValue: '正在清理本地数据' }),
            progress: 96,
          });
          await resetLocalShortcutsByRole(localStorage.getItem('role'));
        }

        update({
          title: t('leaftabSyncRunner.webdav.disable.doneTitle', { defaultValue: '同步已停用' }),
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
    leafTabWebdavEncryptionScopeKey,
  ]);
  const handleOpenWebdavConfig = useCallback((options?: { enableAfterSave?: boolean; showConnectionFields?: boolean }) => {
    if (cloudSyncEnabled) {
      toast.error(t('settings.backup.webdav.disableCloudBeforeWebdavConfig', {
        defaultValue: '当前已启用云同步，请先退出云同步后再配置 WebDAV 同步',
      }));
      return false;
    }
    const shouldEnableAfterSave = options?.enableAfterSave ?? !leafTabWebdavConfigured;
    const shouldShowConnectionFields = options?.showConnectionFields ?? shouldEnableAfterSave;
    setSyncConfigBackTarget('settings');
    setWebdavEnableAfterConfigSave(Boolean(shouldEnableAfterSave));
    setWebdavShowConnectionFields(Boolean(shouldShowConnectionFields));
    setWebdavDialogOpen(true);
    return true;
  }, [cloudSyncEnabled, leafTabWebdavConfigured]);
  const handleOpenWebdavConfigFromSyncCenter = useCallback((options?: { enableAfterSave?: boolean; showConnectionFields?: boolean }) => {
    const opened = handleOpenWebdavConfig(options);
    if (!opened) {
      return;
    }
    setSyncConfigBackTarget('sync-center');
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

  useEffect(() => {
    const bookmarksApi = globalThis.chrome?.bookmarks;
    if (!bookmarksApi) return;

    let refreshTimer: number | null = null;

    const handleBookmarksChanged = () => {
      invalidateLeafTabSyncAnalysis();
      invalidateCloudLeafTabSyncAnalysis();

      if (!leafTabSyncDialogOpen) {
        return;
      }

      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshLeafTabSyncAnalysis({
          force: false,
          maxAgeMs: 0,
        });
        if (cloudSyncBookmarksEnabled) {
          void refreshCloudLeafTabSyncAnalysis({
            force: false,
            maxAgeMs: 0,
          });
        }
      }, 120);
    };

    bookmarksApi.onCreated?.addListener?.(handleBookmarksChanged);
    bookmarksApi.onRemoved?.addListener?.(handleBookmarksChanged);
    bookmarksApi.onChanged?.addListener?.(handleBookmarksChanged);
    bookmarksApi.onMoved?.addListener?.(handleBookmarksChanged);
    bookmarksApi.onChildrenReordered?.addListener?.(handleBookmarksChanged);
    bookmarksApi.onImportEnded?.addListener?.(handleBookmarksChanged);

    return () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      bookmarksApi.onCreated?.removeListener?.(handleBookmarksChanged);
      bookmarksApi.onRemoved?.removeListener?.(handleBookmarksChanged);
      bookmarksApi.onChanged?.removeListener?.(handleBookmarksChanged);
      bookmarksApi.onMoved?.removeListener?.(handleBookmarksChanged);
      bookmarksApi.onChildrenReordered?.removeListener?.(handleBookmarksChanged);
      bookmarksApi.onImportEnded?.removeListener?.(handleBookmarksChanged);
    };
  }, [
    cloudSyncBookmarksEnabled,
    invalidateCloudLeafTabSyncAnalysis,
    invalidateLeafTabSyncAnalysis,
    leafTabSyncDialogOpen,
    refreshCloudLeafTabSyncAnalysis,
    refreshLeafTabSyncAnalysis,
  ]);
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
    webdavSyncBookmarksEnabled,
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

  const handleOpenCloudSyncConfigFromSyncCenter = useCallback(() => {
    setSyncConfigBackTarget('sync-center');
    handleOpenCloudSyncConfig();
  }, [handleOpenCloudSyncConfig]);
  const handleDangerousSyncDialogContinueWithoutBookmarks = useCallback(async () => {
    if (!dangerousSyncDialogState) return;
    setDangerousSyncDialogBusyAction('continue-without-bookmarks');
    closeDangerousSyncDialog();
    toast.info(t('leaftabDangerousSync.toast.skipBookmarks', { defaultValue: '本次将跳过书签，仅同步快捷方式和设置' }));
    if (dangerousSyncDialogState.provider === 'cloud') {
      cloudDeferredDangerousBookmarksScopeKeyRef.current = null;
      applyCloudDangerousBookmarkChoice();
      clearCloudSyncError();
      clearCloudLeafTabSyncErrorState();
      await handleCloudLeafTabSync({
        skipBookmarksForThisRun: true,
        requestBookmarkPermission: false,
        showProgressIndicator: true,
        retryAfterConflictRefresh: true,
        retryAfterForceUnlock: true,
      });
      return;
    }
    webdavDeferredDangerousBookmarksScopeKeyRef.current = null;
    applyWebdavDangerousBookmarkChoice();
    clearWebdavSyncError();
    clearLeafTabSyncErrorState();
    await handleLeafTabSync({
      skipBookmarksForThisRun: true,
      requestBookmarkPermission: false,
      showProgressIndicator: true,
    });
  }, [
    closeDangerousSyncDialog,
    cloudSyncEncryptionScopeKey,
    dangerousSyncDialogState,
    handleCloudLeafTabSync,
    handleLeafTabSync,
    leafTabWebdavEncryptionScopeKey,
    applyWebdavDangerousBookmarkChoice,
  ]);
  const handleDangerousSyncDialogDefer = useCallback(() => {
    if (!dangerousSyncDialogState) return;
    closeDangerousSyncDialog();
    if (dangerousSyncDialogState.provider !== 'webdav') {
      applyCloudDangerousBookmarkChoice();
      clearCloudSyncError();
      clearCloudLeafTabSyncErrorState();
      toast.info(t('leaftabDangerousSync.toast.cloudBookmarksDisabled', { defaultValue: '已启用云同步，并暂时关闭“同步书签”' }));
      return;
    }
    webdavDeferredDangerousBookmarksScopeKeyRef.current = null;
    applyWebdavDangerousBookmarkChoice();
    clearWebdavSyncError();
    clearLeafTabSyncErrorState();
    toast.info(t('leaftabDangerousSync.toast.webdavBookmarksDisabled', { defaultValue: '已启用 WebDAV 同步，并暂时关闭“同步书签”' }));
  }, [
    applyWebdavDangerousBookmarkChoice,
    applyCloudDangerousBookmarkChoice,
    clearCloudLeafTabSyncErrorState,
    clearCloudSyncError,
    clearLeafTabSyncErrorState,
    clearWebdavSyncError,
    closeDangerousSyncDialog,
    dangerousSyncDialogState,
  ]);
  const handleDangerousSyncDialogUseRemote = useCallback(async () => {
    if (!dangerousSyncDialogState) return;
    setDangerousSyncDialogBusyAction('use-remote');
    closeDangerousSyncDialog();
    if (dangerousSyncDialogState.provider === 'cloud') {
      const repaired = await handleCloudRepairFromCenter('pull-remote');
      if (repaired && cloudDeferredDangerousBookmarksScopeKeyRef.current === cloudSyncEncryptionScopeKey) {
        cloudDeferredDangerousBookmarksScopeKeyRef.current = null;
      }
      return;
    }
    const repaired = await handleWebdavRepairFromCenter('pull-remote');
    if (repaired && webdavDeferredDangerousBookmarksScopeKeyRef.current === leafTabWebdavEncryptionScopeKey) {
      webdavDeferredDangerousBookmarksScopeKeyRef.current = null;
    }
  }, [
    closeDangerousSyncDialog,
    cloudSyncEncryptionScopeKey,
    dangerousSyncDialogState,
    handleCloudRepairFromCenter,
    handleWebdavRepairFromCenter,
    leafTabWebdavEncryptionScopeKey,
  ]);
  const handleDangerousSyncDialogUseLocal = useCallback(async () => {
    if (!dangerousSyncDialogState) return;
    setDangerousSyncDialogBusyAction('use-local');
    closeDangerousSyncDialog();
    if (dangerousSyncDialogState.provider === 'cloud') {
      const repaired = await handleCloudRepairFromCenter('push-local');
      if (repaired && cloudDeferredDangerousBookmarksScopeKeyRef.current === cloudSyncEncryptionScopeKey) {
        cloudDeferredDangerousBookmarksScopeKeyRef.current = null;
      }
      return;
    }
    const repaired = await handleWebdavRepairFromCenter('push-local');
    if (repaired && webdavDeferredDangerousBookmarksScopeKeyRef.current === leafTabWebdavEncryptionScopeKey) {
      webdavDeferredDangerousBookmarksScopeKeyRef.current = null;
    }
  }, [
    closeDangerousSyncDialog,
    cloudSyncEncryptionScopeKey,
    dangerousSyncDialogState,
    handleCloudRepairFromCenter,
    handleWebdavRepairFromCenter,
    leafTabWebdavEncryptionScopeKey,
  ]);
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
    if (!cloudLeafTabSyncHasConfig) {
      return;
    }
    setCloudLoginSyncPendingUser(null);
    void handleCloudSyncNowFromCenter({
      allowWhenDisabled: true,
    });
  }, [
    cloudLeafTabSyncHasConfig,
    cloudLoginSyncPendingUser,
    handleCloudSyncNowFromCenter,
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

  const handleBackToMainSettings = useCallback(() => {
    setSearchSettingsOpen(false);
    setShortcutGuideOpen(false);
    setShortcutIconSettingsOpen(false);
    setAdminModalOpen(false);
    setAboutModalOpen(false);
    setWallpaperSettingsOpen(false);
    setExportBackupDialogOpen(false);
    setImportConfirmOpen(false);
    handleImportBackupDialogOpenChange(false);
    setWebdavDialogOpen(false);
    setCloudSyncConfigOpen(false);
    setWebdavEnableAfterConfigSave(false);
    setWebdavShowConnectionFields(false);
    setPendingWebdavEnableScopeKey(null);
    setSettingsOpen(true);
  }, [
    handleImportBackupDialogOpenChange,
    setExportBackupDialogOpen,
    setImportConfirmOpen,
    setSettingsOpen,
  ]);

  const handleBackFromSyncProviderConfig = useCallback(() => {
    setWebdavDialogOpen(false);
    setCloudSyncConfigOpen(false);
    setWebdavEnableAfterConfigSave(false);
    setWebdavShowConnectionFields(false);
    setPendingWebdavEnableScopeKey(null);
    if (syncConfigBackTarget === 'sync-center') {
      setSettingsOpen(false);
      setLeafTabSyncDialogOpen(true);
      return;
    }
    setLeafTabSyncDialogOpen(false);
    setSettingsOpen(true);
  }, [setSettingsOpen, syncConfigBackTarget]);

  const handleGridHitDebugEnabledChange = useCallback((enabled: boolean) => {
    setGridHitDebugVisible(enabled);
    try { sessionStorage.setItem('leaftab_grid_hit_debug_visible', enabled ? 'true' : 'false'); } catch {}
  }, []);
  const handleWeatherDebugEnabledChange = useCallback((enabled: boolean) => {
    setWeatherDebugVisible(enabled);
    try { sessionStorage.setItem('leaftab_weather_debug_visible', enabled ? 'true' : 'false'); } catch {}
  }, []);
  const handleWeatherDebugApply = useCallback((code: number) => {
    setWallpaperMode('weather');
    setWeatherCode(code);
  }, [setWallpaperMode, setWeatherCode]);

  const displayRows = Math.max(
    Math.ceil(shortcuts.length / Math.max(normalizedGridColumns, 1)),
    minShortcutRows,
  );
  const scaledCompactShortcutSize = scaleShortcutIconSize(responsiveLayout.compactShortcutSize, shortcutIconScale);
  const shortcutRowHeight = scaledCompactShortcutSize + 24;
  const shortcutRowGap = responsiveLayout.compactRowGap;
  const shortcutsAreaHeight = displayRows * shortcutRowHeight + Math.max(0, displayRows - 1) * shortcutRowGap;

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu, contextMenuRef, setContextMenu]);

  const scenarioEditMode = scenarioModes.find((m: any) => m.id === currentEditScenarioId) ?? null;
  const gridHitInspectorVisible = adminModeEnabled && gridHitDebugVisible;
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
  const handleOverlayWallpaperReadyForRevealAndAccent = useCallback(() => {
    handleOverlayImageReady();
    setWallpaperImageReadyTick((prev) => prev + 1);
  }, [handleOverlayImageReady]);
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
    timeAnimationMode,
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
    timeAnimationMode,
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
  const shortcutEngineHostAdapter = useMemo(() => createLeaftabGridEngineHostAdapter({
    scenarioId: selectedScenarioId,
    shortcuts,
    containerHeight: shortcutsAreaHeight,
    bottomInset: 0,
    gridColumns: normalizedGridColumns,
    minRows: minShortcutRows,
    layoutDensity: responsiveLayout.density,
    compactIconSize: scaledCompactShortcutSize,
    compactTitleFontSize: responsiveLayout.compactShortcutTitleSize,
    compactShowTitle: shortcutCompactShowTitle,
    iconCornerRadius: shortcutIconCornerRadius,
    iconAppearance: shortcutIconAppearance,
    disableReorderAnimation: visualEffectsPolicy.disableShortcutReorderMotion || Boolean(openFolderShortcut),
    onRootShortcutOpen: handleShortcutActivate,
    onFolderShortcutOpen: handleShortcutOpen,
    onShortcutContextMenu: handleShortcutContextMenu,
    onShortcutReorder: handleShortcutReorder,
    onShortcutDropIntent: handleRootShortcutDropIntent,
    onGridContextMenu: handleGridContextMenu,
    externalDragSession: externalShortcutDragSession,
    onExternalDragSessionConsumed: (token: number) => {
      setExternalShortcutDragSession((current) => (current?.token === token ? null : current));
    },
    openFolderShortcut,
    onFolderOpenChange: (open) => {
      if (!open) folderTransitionController.requestClose();
    },
    onRenameFolder: handleRenameFolderInline,
    onFolderShortcutContextMenu: handleFolderChildShortcutContextMenu,
    onFolderShortcutDropIntent: handleFolderShortcutDropIntent,
    onFolderExtractDragStart: handleFolderExtractDragStart,
    onFolderChildrenCommit: handleFolderEngineChildrenCommit,
  }), [
    selectedScenarioId,
    shortcuts,
    shortcutsAreaHeight,
    normalizedGridColumns,
    minShortcutRows,
    responsiveLayout.density,
    responsiveLayout.compactShortcutTitleSize,
    scaledCompactShortcutSize,
    shortcutCompactShowTitle,
    shortcutIconCornerRadius,
    shortcutIconAppearance,
    visualEffectsPolicy.disableShortcutReorderMotion,
    openFolderShortcut,
    handleShortcutActivate,
    handleShortcutContextMenu,
    handleShortcutReorder,
    handleRootShortcutDropIntent,
    handleGridContextMenu,
    externalShortcutDragSession,
    folderTransitionController,
    handleRenameFolderInline,
    handleFolderChildShortcutContextMenu,
    handleFolderShortcutDropIntent,
    handleFolderExtractDragStart,
    handleFolderEngineChildrenCommit,
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
    timeAnimationEnabled: effectiveTimeAnimationEnabled,
    timeAnimationMode,
    onTimeAnimationModeChange: setTimeAnimationMode,
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
    setTimeAnimationMode,
    setWeatherCode,
    effectiveTimeAnimationEnabled,
    showDate,
    showLunar,
    showSeconds,
    showTime,
    showWeekday,
    timeAnimationMode,
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
      || shortcutIconSettingsOpen
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
        onEditShortcut={handleOpenShortcutEditor}
        onEditFolderShortcut={handleOpenFolderChildShortcutEditor}
        onDeleteShortcut={(shortcutIndex, shortcut) => {
          setSelectedShortcut({ index: shortcutIndex, shortcut });
          setShortcutDeleteOpen(true);
        }}
        onDeleteFolderShortcut={handleDeleteFolderChildShortcut}
        onShortcutOpen={handleShortcutActivate}
        onDeleteSelectedShortcuts={handleConfirmDeleteShortcuts}
        onCreateFolder={handleCreateFolderFromSelection}
        onPinSelectedShortcuts={handlePinSelectedShortcuts}
        onMoveSelectedShortcutsToScenario={handleMoveSelectedShortcutsToScenario}
        onMoveSelectedShortcutsToFolder={handleMoveSelectedShortcutsToFolder}
        onDissolveFolder={handleDissolveFolder}
        showLargeFolderToggle
        onSetFolderDisplayMode={handleSetFolderDisplayMode}
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
            onOverlayImageReady={handleOverlayWallpaperReadyForRevealAndAccent}
            effectiveWallpaperMaskOpacity={effectiveWallpaperMaskOpacity}
            topNavModeProps={topNavModeProps}
            homeMainContentBaseProps={homeMainContentBaseProps}
            shortcutGridProps={{
              ...shortcutEngineHostAdapter.rootGridProps,
              heatZoneInspectorEnabled: gridHitInspectorVisible,
              hiddenShortcutId: folderTransitionController.overlayFolderId,
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
            folderImmersiveProgress={folderTransitionController.backgroundProgress}
          />
        )}
      </ShortcutSelectionShell>
      {compactOverlayShortcut ? (
        <Suspense fallback={null}>
          <LazyShortcutFolderCompactOverlay
            {...shortcutEngineHostAdapter.compactFolderOverlayProps}
            transitionPhase={folderTransitionController.transition.phase}
            transitionProgress={folderTransitionController.transition.progress}
            openingSourceSnapshot={
              folderTransitionController.transition.sourceSnapshot?.folderId === compactOverlayShortcut.id
                ? folderTransitionController.transition.sourceSnapshot
                : null
            }
            onOpeningLayoutReady={() => folderTransitionController.notifyOpeningReady(compactOverlayShortcut.id)}
            onClosingLayoutReady={() => folderTransitionController.notifyClosingReady(compactOverlayShortcut.id)}
            shortcut={compactOverlayShortcut}
          />
        </Suspense>
      ) : null}
      {folderNameDialogOpen ? (
        <Suspense fallback={null}>
          <LazyShortcutFolderNameDialog
            open={folderNameDialogOpen}
            onOpenChange={(open) => {
              setFolderNameDialogOpen(open);
              if (!open) {
                setEditingFolderId(null);
                setPendingRootFolderMerge(null);
              }
            }}
            title={folderNameDialogTitle}
            description={folderNameDialogDescription}
            initialName={folderNameDialogInitialName}
            onSubmit={handleSaveFolderName}
          />
        </Suspense>
      ) : null}
      {shouldMountWallpaperSelector ? (
        <Suspense fallback={null}>
          <LazyWallpaperSelector
            {...wallpaperSelectorLayerProps}
            mode={effectiveWallpaperMode}
            hideWeather={displayMode === 'minimalist' || firefox}
            open={wallpaperSettingsOpen}
            onOpenChange={setWallpaperSettingsOpen}
            onBackToSettings={handleBackToMainSettings}
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
              iconCornerRadius: shortcutIconCornerRadius,
              iconScale: shortcutIconScale,
              iconAppearance: shortcutIconAppearance,
              onSave: handleSaveShortcutEdit,
            }}
            shortcutDeleteDialogProps={{
              open: shortcutDeleteOpen,
              onOpenChange: setShortcutDeleteOpen,
              title: isShortcutFolder(selectedShortcut?.shortcut)
                ? t('shortcutDelete.folderTitle', { defaultValue: '删除文件夹' })
                : t('shortcutDelete.title'),
              description: isShortcutFolder(selectedShortcut?.shortcut)
                ? t('shortcutDelete.folderDescription', { defaultValue: '删除后，文件夹里的快捷方式也会一起删除。' })
                : t('shortcutDelete.description'),
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
              onOpenChange: handleAuthModalOpenChange,
              onLoginSuccess: onLoginSuccess,
              onGoogleLinkSuccess: () => {
                setAuthModalMode('login');
              },
              apiServer,
              onApiServerChange: setApiServer,
              customApiUrl,
              customApiName,
              defaultApiBase,
              allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
              mode: authModalMode,
              linkedUsername: user,
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
              shortcutCompactShowTitle,
              onShortcutCompactShowTitleChange: setShortcutCompactShowTitle,
              shortcutGridColumns: normalizedGridColumns,
              onShortcutGridColumnsChange: handleShortcutGridColumnsChange,
              onOpenShortcutIconSettings: handleOpenShortcutIconSettings,
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
	              onOpenShortcutGuide: () => setShortcutGuideOpen(true),
	            }}
	            searchSettingsModalProps={{
	              isOpen: searchSettingsOpen,
	              onOpenChange: setSearchSettingsOpen,
                onBackToSettings: handleBackToMainSettings,
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
                onBackToSettings: handleBackToMainSettings,
	            }}
            shortcutIconSettingsDialogProps={{
              open: shortcutIconSettingsOpen,
              onOpenChange: setShortcutIconSettingsOpen,
              onBackToSettings: handleBackToMainSettings,
              compactShowTitle: shortcutCompactShowTitle,
              columns: normalizedGridColumns,
              onSaveStyle: ({ compactShowTitle, columns }) => {
                setShortcutCompactShowTitle(compactShowTitle);
                handleShortcutGridColumnsChange(columns);
              },
              appearance: shortcutIconAppearance,
              cornerRadius: shortcutIconCornerRadius,
              scale: shortcutIconScale,
              onSave: ({ appearance, cornerRadius, scale }) => {
                setShortcutIconAppearance(appearance);
                setShortcutIconCornerRadius(cornerRadius);
                setShortcutIconScale(scale);
              },
            }}
            adminModalProps={{
              open: adminModalOpen,
              onOpenChange: setAdminModalOpen,
              onBackToSettings: handleBackToMainSettings,
              onExportDomains: handleExportDomains,
              gridHitDebugEnabled: gridHitDebugVisible,
              onGridHitDebugEnabledChange: handleGridHitDebugEnabledChange,
              weatherDebugEnabled: weatherDebugVisible,
              onWeatherDebugEnabledChange: handleWeatherDebugEnabledChange,
              onWeatherDebugApply: handleWeatherDebugApply,
              customApiUrl,
              onCustomApiUrlChange: setCustomApiUrl,
              customApiName,
              onCustomApiNameChange: setCustomApiName,
              allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
            }}
            aboutModalProps={{
              open: aboutModalOpen,
              onOpenChange: setAboutModalOpen,
              onBackToSettings: handleBackToMainSettings,
              defaultTab: aboutModalDefaultTab,
            }}
            exportBackupDialogProps={{
              open: exportBackupDialogOpen,
              onOpenChange: setExportBackupDialogOpen,
              onBackToSettings: handleBackToMainSettings,
              mode: 'export',
              availableScope: {
                shortcuts: true,
                bookmarks: true,
              },
              defaultScope: {
                ...getDefaultLocalBackupExportScope(),
              },
              onConfirm: async (scope) => {
                await executeExportData(scope);
              },
            }}
            importBackupDialogProps={{
              open: importBackupDialogOpen,
              onOpenChange: handleImportBackupDialogOpenChange,
              onBackToSettings: handleBackToMainSettings,
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
              onBackToParent: handleBackFromSyncProviderConfig,
              onOpenChange: (open: boolean) => {
                setWebdavDialogOpen(open);
                if (!open) {
                  setWebdavEnableAfterConfigSave(false);
                  setWebdavShowConnectionFields(false);
                  setPendingWebdavEnableScopeKey(null);
                }
              },
              enableAfterSave: webdavEnableAfterConfigSave,
              showConnectionFields: webdavShowConnectionFields,
              onEnableAfterSave: async () => {
                const nextConfig = readWebdavConfigFromStorage({ allowDisabled: true });
                const nextScopeKey = createLeafTabWebdavEncryptionScopeKey(
                  nextConfig?.url || '',
                  resolveLeafTabSyncRootPath(nextConfig),
                );
                setWebdavEnableAfterConfigSave(false);
                setWebdavShowConnectionFields(false);
                setPendingWebdavEnableScopeKey(nextScopeKey || null);
              },
              onSaveSuccess: async () => {
                if (!leafTabWebdavEnabled || leafTabSyncState.status === 'syncing') {
                  return;
                }
                await handleLeafTabAutoSync();
              },
              onDisableSync: async () => {
                setConfirmDisableWebdavSyncOpen(true);
              },
            }}
            cloudSyncConfigDialogProps={{
              open: cloudSyncConfigOpen,
              onBackToParent: handleBackFromSyncProviderConfig,
              onOpenChange: setCloudSyncConfigOpen,
              onSaveSuccess: handleCloudSyncConfigSaved,
              onLinkGoogle: openGoogleLinkAuthModal,
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
            webdavSyncBookmarksEnabled={webdavSyncBookmarksEnabled}
            webdavProfileLabel={leafTabWebdavProfileLabel}
            webdavUrlLabel={leafTabSyncWebdavConfig?.url || ''}
            webdavLastSyncLabel={leafTabWebdavLastSyncLabel}
            webdavNextSyncLabel={leafTabWebdavNextSyncLabel}
            webdavEncryptionReady={leafTabWebdavEncryptionReady}
            onCloudSyncNow={() => {
              setLeafTabSyncDialogOpen(false);
              void handleCloudSyncNowFromCenter();
            }}
            onOpenCloudConfig={handleOpenCloudSyncConfigFromSyncCenter}
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
              setSyncConfigBackTarget('sync-center');
              setLeafTabSyncDialogOpen(false);
              void handleWebdavSyncNowFromCenter();
            }}
            onOpenConfig={() => {
              handleOpenWebdavConfigFromSyncCenter();
            }}
            onOpenSetupConfig={() => {
              handleOpenWebdavConfigFromSyncCenter({
                showConnectionFields: true,
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
	            providerLabel={syncEncryptionDialogState?.providerLabel || t('leaftabSync.provider.generic', { defaultValue: '同步' })}
	            busy={syncEncryptionDialogBusy}
	            onOpenChange={handleSyncEncryptionDialogOpenChange}
	            onSubmit={handleSubmitSyncEncryptionDialog}
	          />
        </Suspense>
      ) : null}
      {dangerousSyncDialogState?.open ? (
        <LeafTabDangerousSyncDialog
          open={dangerousSyncDialogState.open}
          onOpenChange={(open) => {
            if (!open) {
              closeDangerousSyncDialog();
            }
          }}
          provider={dangerousSyncDialogState.provider}
          localBookmarkCount={dangerousSyncDialogState.localBookmarkCount}
          remoteBookmarkCount={dangerousSyncDialogState.remoteBookmarkCount}
          detectedFromCount={dangerousSyncDialogState.detectedFromCount}
          detectedToCount={dangerousSyncDialogState.detectedToCount}
          busyAction={dangerousSyncDialogBusyAction}
          onContinueWithoutBookmarks={() => {
            void handleDangerousSyncDialogContinueWithoutBookmarks();
          }}
          onDefer={handleDangerousSyncDialogDefer}
          onUseRemote={() => {
            void handleDangerousSyncDialogUseRemote();
          }}
          onUseLocal={() => {
            void handleDangerousSyncDialogUseLocal();
          }}
        />
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
    </div>
  );
}
