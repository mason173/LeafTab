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
import { useLeafTabSyncEngine } from './hooks/useLeafTabSyncEngine';
import { useLeafTabWebdavAutoSync } from './hooks/useLeafTabWebdavAutoSync';
import { useLongTaskIndicator } from './hooks/useLongTaskIndicator';
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
import type { ScenarioShortcuts } from './types';
import { extractDomainFromUrl, normalizeApiBase } from "./utils";
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';
import { LongTaskIndicator } from './components/LongTaskIndicator';
import {
  subscribeSemanticBookmarkSearchStatus,
  warmSemanticBookmarkIndex,
} from '@/features/ai-bookmarks';
import { ENABLE_AI_BOOKMARK_SEARCH } from '@/config/featureFlags';
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
import { getBookmarksApi } from '@/platform/runtime';
import { defaultScenarioModes } from '@/scenario/scenario';
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';
import {
  buildLeafTabSyncSnapshot,
  captureLeafTabBookmarkTreeDraft,
  createLeafTabSyncEncryptionMetadata,
  deriveLeafTabSyncKey,
  LeafTabSyncCloudEncryptedTransport,
  LeafTabSyncEncryptedRemoteStore,
  LeafTabSyncEncryptionRequiredError,
  LeafTabSyncWebdavEncryptedTransport,
  LeafTabSyncWebdavStore,
  parseLeafTabSyncKeyBytes,
  serializeLeafTabSyncKeyBytes,
  verifyLeafTabSyncKey,
  createLeafTabLocalBackupBundle,
  createLeafTabSyncBuildState,
  filterLeafTabLocalBackupSnapshot,
  formatLeafTabBookmarkSyncScopeLabel,
  getLeafTabLocalBackupAvailableScope,
  LEAFTAB_SYNC_SCHEMA_VERSION,
  mergeLeafTabLocalBackupSnapshotWithBase,
  restrictLeafTabLocalBackupImportScope,
  type LeafTabLocalBackupExportScope,
  type LeafTabLocalBackupImportData,
  type LeafTabSyncEngineProgress,
  type LeafTabSyncSnapshot,
  normalizeLeafTabSyncSnapshot,
  projectLeafTabSyncSnapshotToAppState,
  readLeafTabBookmarkSyncScope,
  replaceLeafTabBookmarkTree,
} from '@/sync/leaftab';
import type { WebdavConfig } from '@/types/webdav';
import { flushQueuedLocalStorageWrites } from '@/utils/storageWriteQueue';
import { LeafTabSyncDialog } from '@/components/sync/LeafTabSyncDialog';
import { LeafTabSyncEncryptionDialog } from '@/components/sync/LeafTabSyncEncryptionDialog';
import {
  clearLeafTabSyncEncryptionConfig,
  createLeafTabCloudEncryptionScopeKey,
  createLeafTabWebdavEncryptionScopeKey,
  emitLeafTabSyncEncryptionChanged,
  hasLeafTabSyncEncryptionConfig,
  readLeafTabSyncEncryptionConfig,
  writeLeafTabSyncEncryptionConfig,
  type LeafTabSyncEncryptionMetadata,
} from '@/utils/leafTabSyncEncryption';

type ApplyImportedDataOptions = {
  closeSettings?: boolean;
  successKey?: string;
  silentSuccess?: boolean;
};

type ApplyImportedBackupOptions = ApplyImportedDataOptions & {
  syncCloudIfSignedIn?: boolean;
  onProgress?: (options: {
    title?: string;
    detail?: string;
    progress?: number;
  }) => void;
  skipLongTaskIndicator?: boolean;
};

type LeafTabSyncEncryptionDialogState = {
  open: boolean;
  mode: 'setup' | 'unlock';
  scopeKey: string;
  scopeLabel: string;
  providerLabel: string;
  metadata: LeafTabSyncEncryptionMetadata | null;
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

  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importPendingPayload, setImportPendingPayload] = useState<LeafTabLocalBackupImportData | null>(null);
  const [importConfirmBusy, setImportConfirmBusy] = useState(false);
  const [exportBackupDialogOpen, setExportBackupDialogOpen] = useState(false);
  const [importBackupDialogOpen, setImportBackupDialogOpen] = useState(false);
  const [importBackupScopePayload, setImportBackupScopePayload] = useState<LeafTabLocalBackupImportData | null>(null);
  const [confirmDisableConsentOpen, setConfirmDisableConsentOpen] = useState(false);
  const [confirmDisableWebdavSyncOpen, setConfirmDisableWebdavSyncOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [cloudSyncConfigOpen, setCloudSyncConfigOpen] = useState(false);
  const [cloudSyncConfigVersion, setCloudSyncConfigVersion] = useState(0);
  const [cloudLoginSyncPendingUser, setCloudLoginSyncPendingUser] = useState<string | null>(null);
  const [syncEncryptionVersion, setSyncEncryptionVersion] = useState(0);
  const [syncEncryptionDialogState, setSyncEncryptionDialogState] = useState<LeafTabSyncEncryptionDialogState | null>(null);
  const [syncEncryptionDialogBusy, setSyncEncryptionDialogBusy] = useState(false);
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
  const syncEncryptionDialogResolverRef = useRef<((value: boolean) => void) | null>(null);
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
    const taskId = startLongTaskIndicator(initial);
    try {
      const result = await runner({
        update: (options) => {
          updateLongTaskIndicator(taskId, options);
        },
      });
      finishLongTaskIndicator(taskId);
      return result;
    } catch (error) {
      clearLongTaskIndicator(taskId);
      throw error;
    }
  }, [
    clearLongTaskIndicator,
    finishLongTaskIndicator,
    startLongTaskIndicator,
    updateLongTaskIndicator,
  ]);
  const semanticBookmarkIndexTaskIdRef = useRef<string | null>(null);
  const scheduleSemanticBookmarkWarmup = useCallback((options?: { immediate?: boolean }) => {
    if (!ENABLE_AI_BOOKMARK_SEARCH) return;
    const bookmarksApi = getBookmarksApi();
    if (!bookmarksApi) return;
    if (options?.immediate) {
      void warmSemanticBookmarkIndex(bookmarksApi);
      return;
    }
    return scheduleAfterInteractivePaint(() => {
      void warmSemanticBookmarkIndex(bookmarksApi);
    }, {
      delayMs: 180,
      idleTimeoutMs: 800,
    });
  }, []);

  useEffect(() => {
    if (!ENABLE_AI_BOOKMARK_SEARCH) return undefined;
    return subscribeSemanticBookmarkSearchStatus((semanticStatus) => {
      const taskId = semanticBookmarkIndexTaskIdRef.current;
      const inProgress = semanticStatus.indexState === 'syncing' || semanticStatus.modelState === 'loading';
      if (inProgress) {
        const nextTitle = semanticStatus.progressLabel || '正在建立 AI 书签语义索引...';
        const nextProgress = semanticStatus.progress ?? 8;
        const nextDetail = semanticStatus.activity === 'downloading-model'
          ? '首次启用会联网下载模型，下载完成后会自动开始建立书签语义索引'
          : '正在后台建立书签语义索引，你可以继续进行其他操作';
        if (!taskId) {
          semanticBookmarkIndexTaskIdRef.current = startLongTaskIndicator({
            title: nextTitle,
            detail: nextDetail,
            progress: nextProgress,
          });
        } else {
          updateLongTaskIndicator(taskId, {
            title: nextTitle,
            detail: nextDetail,
            progress: nextProgress,
            tone: 'info',
          });
        }
        return;
      }

      if (semanticStatus.activity === 'error') {
        const nextTitle = semanticStatus.progressLabel || 'AI 书签语义索引建立失败';
        const nextProgress = semanticStatus.progress ?? 0;
        const nextDetail = semanticStatus.lastError === 'ai_bookmark_sandbox_request_timeout'
          ? '模型下载或初始化超时，请检查网络后重试'
          : semanticStatus.lastError === 'ai_bookmark_sandbox_nested_request'
            ? 'AI 沙箱初始化异常，请刷新页面后重试'
            : semanticStatus.lastError?.includes('no available backend found')
              ? 'AI 推理后端初始化失败，请刷新页面后重试'
              : (semanticStatus.lastError || '可以稍后重试建立 AI 书签语义索引');
        if (!taskId) {
          semanticBookmarkIndexTaskIdRef.current = startLongTaskIndicator({
            title: nextTitle,
            detail: nextDetail,
            progress: nextProgress,
            tone: 'error',
          });
        } else {
          updateLongTaskIndicator(taskId, {
            title: nextTitle,
            detail: nextDetail,
            progress: nextProgress,
            tone: 'error',
          });
        }
        return;
      }

      if (semanticStatus.indexState === 'ready' && taskId) {
        finishLongTaskIndicator(taskId, {
          title: 'AI 书签语义索引已准备完成',
          detail: '现在可以直接使用更精准的书签语义搜索了',
          delayMs: 900,
        });
        semanticBookmarkIndexTaskIdRef.current = null;
        return;
      }

      if (taskId && semanticStatus.activity === 'idle') {
        clearLongTaskIndicator(taskId);
        semanticBookmarkIndexTaskIdRef.current = null;
      }
    });
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

  const downloadCloudBackupEnvelope = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const bookmarkSyncScope = readLeafTabBookmarkSyncScope();

      const response = await fetch(`${API_URL}/user/leaftab-sync/state`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let backupContent = '';

      if (response.ok) {
        const data = await response.json();
        const remoteSnapshot = normalizeLeafTabSyncSnapshot(data?.snapshot || null);
        if (remoteSnapshot) {
          const projected = projectLeafTabSyncSnapshotToAppState(remoteSnapshot);
          const projectedScenarioModes = projected.scenarioModes.length > 0
            ? projected.scenarioModes
            : defaultScenarioModes;
          const backupBundle = createLeafTabLocalBackupBundle({
            snapshot: remoteSnapshot,
            selectedScenarioId: projectedScenarioModes.some((mode) => mode.id === selectedScenarioId)
              ? selectedScenarioId
              : projectedScenarioModes[0]?.id || '',
            bookmarkScope: bookmarkSyncScope,
            exportScope: { shortcuts: true, bookmarks: true },
            rootPath: 'cloud',
            appVersion: globalThis.chrome?.runtime?.getManifest?.().version || '',
          });
          backupContent = JSON.stringify(backupBundle, null, 2);
        }
      }

      if (!backupContent) {
        const legacyResponse = await fetch(`${API_URL}/user/shortcuts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!legacyResponse.ok) return;
        const legacyData = await legacyResponse.json();
        const shortcutsRaw = legacyData?.shortcuts;
        if (!shortcutsRaw) return;
        backupContent = typeof shortcutsRaw === 'string' ? shortcutsRaw : JSON.stringify(shortcutsRaw);
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const blob = new Blob([backupContent], { type: 'application/json' });
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
  }, [API_URL, selectedScenarioId, t]);

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

  const resolveSyncEncryptionDialog = useCallback((confirmed: boolean) => {
    const resolver = syncEncryptionDialogResolverRef.current;
    syncEncryptionDialogResolverRef.current = null;
    setSyncEncryptionDialogState((current) => (current ? { ...current, open: false } : null));
    if (resolver) {
      resolver(confirmed);
    }
  }, []);

  const requestSyncEncryptionDialog = useCallback((params: {
    mode: 'setup' | 'unlock';
    scopeKey: string;
    scopeLabel: string;
    providerLabel: string;
    metadata?: LeafTabSyncEncryptionMetadata | null;
  }) => {
    return new Promise<boolean>((resolve) => {
      syncEncryptionDialogResolverRef.current = resolve;
      setSettingsOpen(false);
      setLeafTabSyncDialogOpen(false);
      setWebdavDialogOpen(false);
      setCloudSyncConfigOpen(false);
      setSyncEncryptionDialogState({
        open: true,
        mode: params.mode,
        scopeKey: params.scopeKey,
        scopeLabel: params.scopeLabel,
        providerLabel: params.providerLabel,
        metadata: params.metadata || null,
      });
    });
  }, []);

  const handleSyncEncryptionDialogOpenChange = useCallback((open: boolean) => {
    if (open) return;
    resolveSyncEncryptionDialog(false);
  }, [resolveSyncEncryptionDialog]);

  const handleSubmitSyncEncryptionDialog = useCallback(async (payload: { passphrase: string }) => {
    const request = syncEncryptionDialogState;
    if (!request) return;
    setSyncEncryptionDialogBusy(true);
    try {
      let metadata = request.metadata;
      let keyBytes: Uint8Array;
      if (request.mode === 'setup') {
        const created = await createLeafTabSyncEncryptionMetadata(payload.passphrase);
        metadata = created.metadata;
        keyBytes = created.keyBytes;
      } else {
        if (!metadata) {
          throw new Error('缺少同步加密元数据');
        }
        keyBytes = await deriveLeafTabSyncKey(payload.passphrase, metadata);
        const valid = await verifyLeafTabSyncKey(keyBytes, metadata);
        if (!valid) {
          throw new Error('同步口令不正确');
        }
      }
      if (!metadata) {
        throw new Error('同步加密配置无效');
      }
      writeLeafTabSyncEncryptionConfig(
        request.scopeKey,
        metadata,
        serializeLeafTabSyncKeyBytes(keyBytes),
      );
      emitLeafTabSyncEncryptionChanged();
      toast.success(request.mode === 'setup' ? '同步口令已保存' : '同步数据已解锁');
      resolveSyncEncryptionDialog(true);
    } catch (error) {
      toast.error(String((error as Error)?.message || '保存同步口令失败'));
    } finally {
      setSyncEncryptionDialogBusy(false);
    }
  }, [resolveSyncEncryptionDialog, syncEncryptionDialogState]);

  const ensureSyncEncryptionAccess = useCallback(async (params: {
    providerLabel: string;
    scopeKey: string;
    transport: { readEncryptionState: () => Promise<{ metadata: LeafTabSyncEncryptionMetadata | null }> } | null;
  }) => {
    if (!params.scopeKey) return false;
    const localConfig = readLeafTabSyncEncryptionConfig(params.scopeKey);
    if (localConfig?.cachedKey && localConfig?.metadata) {
      const keyBytes = parseLeafTabSyncKeyBytes(localConfig.cachedKey);
      const valid = await verifyLeafTabSyncKey(keyBytes, localConfig.metadata).catch(() => false);
      if (valid) return true;
      clearLeafTabSyncEncryptionConfig(params.scopeKey);
      emitLeafTabSyncEncryptionChanged();
    }

    let remoteMetadata: LeafTabSyncEncryptionMetadata | null = null;
    if (params.transport) {
      try {
        const remoteState = await params.transport.readEncryptionState();
        remoteMetadata = remoteState.metadata || null;
      } catch {}
    }

    return requestSyncEncryptionDialog({
      mode: remoteMetadata ? 'unlock' : 'setup',
      scopeKey: params.scopeKey,
      scopeLabel: params.providerLabel,
      providerLabel: params.providerLabel,
      metadata: remoteMetadata,
    });
  }, [requestSyncEncryptionDialog]);
  const handleManageWebdavSyncEncryption = useCallback(async () => {
    setLeafTabSyncDialogOpen(false);
    setWebdavDialogOpen(false);
    return ensureSyncEncryptionAccess({
      providerLabel: 'WebDAV 同步',
      scopeKey: leafTabWebdavEncryptionScopeKey,
      transport: leafTabWebdavEncryptedTransport,
    });
  }, [
    ensureSyncEncryptionAccess,
    leafTabWebdavEncryptedTransport,
    leafTabWebdavEncryptionScopeKey,
  ]);
  const handleManageCloudSyncEncryption = useCallback(async () => {
    setLeafTabSyncDialogOpen(false);
    setCloudSyncConfigOpen(false);
    return ensureSyncEncryptionAccess({
      providerLabel: '云同步',
      scopeKey: cloudSyncEncryptionScopeKey,
      transport: cloudSyncEncryptedTransport,
    });
  }, [
    cloudSyncEncryptedTransport,
    cloudSyncEncryptionScopeKey,
    ensureSyncEncryptionAccess,
  ]);

  const leafTabBookmarkSyncScope = useMemo(() => readLeafTabBookmarkSyncScope(), []);
  const leafTabBookmarkSyncScopeLabel = useMemo(
    () => formatLeafTabBookmarkSyncScopeLabel(leafTabBookmarkSyncScope),
    [leafTabBookmarkSyncScope],
  );

  const buildLeafTabSyncSnapshotFromCurrentState = useCallback(async (options?: {
    requestBookmarkPermission?: boolean;
    baselineStorageKey?: string;
  }) => {
    flushQueuedLocalStorageWrites();
    const generatedAt = new Date().toISOString();
    const baselineSnapshot = readLeafTabSyncBaselineSnapshot(
      options?.baselineStorageKey || leafTabSyncBaselineStorageKey,
    );
    const bookmarkTree = await captureLeafTabBookmarkTreeDraft({
      scope: leafTabBookmarkSyncScope,
      requestPermission: options?.requestBookmarkPermission === true,
    });
    const state = createLeafTabSyncBuildState({
      previousSnapshot: baselineSnapshot,
      scenarioModes,
      scenarioShortcuts,
      bookmarkTree,
      deviceId: leafTabSyncDeviceId,
      generatedAt,
    });
    return buildLeafTabSyncSnapshot({
      scenarioModes,
      scenarioShortcuts,
      bookmarkTree,
      deviceId: leafTabSyncDeviceId,
      generatedAt,
      state,
    });
  }, [leafTabBookmarkSyncScope, leafTabSyncBaselineStorageKey, leafTabSyncDeviceId, scenarioModes, scenarioShortcuts]);

  const buildLocalLeafTabSyncSnapshot = useCallback(async () => {
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: leafTabSyncBaselineStorageKey,
    });
  }, [buildLeafTabSyncSnapshotFromCurrentState, leafTabSyncBaselineStorageKey]);

  const buildCloudLeafTabSyncSnapshot = useCallback(async () => {
    return buildLeafTabSyncSnapshotFromCurrentState({
      baselineStorageKey: cloudSyncBaselineStorageKey,
    });
  }, [buildLeafTabSyncSnapshotFromCurrentState, cloudSyncBaselineStorageKey]);

  const createEmptyLeafTabSyncSnapshot = useCallback((): LeafTabSyncSnapshot => {
    const emptyTimestamp = '1970-01-01T00:00:00.000Z';
    return {
      meta: {
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        deviceId: leafTabSyncDeviceId,
        generatedAt: emptyTimestamp,
      },
      scenarios: {},
      shortcuts: {},
      bookmarkFolders: {},
      bookmarkItems: {},
      scenarioOrder: {
        type: 'scenario-order',
        ids: [],
        updatedAt: emptyTimestamp,
        updatedBy: leafTabSyncDeviceId,
        revision: 1,
      },
      shortcutOrders: {},
      bookmarkOrders: {
        __root__: {
          type: 'bookmark-order',
          parentId: null,
          ids: [],
          updatedAt: emptyTimestamp,
          updatedBy: leafTabSyncDeviceId,
          revision: 1,
        },
      },
      tombstones: {},
    };
  }, [leafTabSyncDeviceId]);

  const applyLeafTabSyncSnapshotToLocalState = useCallback(async (
    snapshot: LeafTabSyncSnapshot,
    options?: {
      preferredSelectedScenarioId?: string | null;
    },
  ) => {
    const projected = projectLeafTabSyncSnapshotToAppState(snapshot);
    const nextScenarioModes = projected.scenarioModes.length > 0
      ? projected.scenarioModes
      : defaultScenarioModes;
    const nextScenarioShortcuts = nextScenarioModes.reduce<ScenarioShortcuts>((acc, mode) => {
      acc[mode.id] = projected.scenarioShortcuts[mode.id] || [];
      return acc;
    }, {});
    const preferredSelectedScenarioId = options?.preferredSelectedScenarioId || '';
    const nextSelectedScenarioId = nextScenarioModes.some((mode) => mode.id === preferredSelectedScenarioId)
      ? preferredSelectedScenarioId
      : nextScenarioModes.some((mode) => mode.id === selectedScenarioId)
        ? selectedScenarioId
        : nextScenarioModes[0]?.id || '';

    setScenarioModes(nextScenarioModes);
    setSelectedScenarioId(nextSelectedScenarioId);
    setScenarioShortcuts(nextScenarioShortcuts);
    await replaceLeafTabBookmarkTree({
      scope: leafTabBookmarkSyncScope,
      folderLookup: Object.fromEntries(
        Object.values(projected.bookmarkFolders).map((folder) => [
          folder.id,
          {
            title: folder.title,
            parentId: folder.parentId,
          },
        ]),
      ),
      itemLookup: Object.fromEntries(
        Object.values(projected.bookmarkItems).map((item) => [
          item.id,
          {
            title: item.title,
            parentId: item.parentId,
            url: item.url,
          },
        ]),
      ),
      orderIdsByParent: Object.fromEntries(
        Object.entries(projected.bookmarkOrders).map(([key, order]) => [key, order.ids.slice()]),
      ),
      requestPermission: false,
    });

    const nextProfileSnapshot = {
      scenarioModes: nextScenarioModes,
      selectedScenarioId: nextSelectedScenarioId,
      scenarioShortcuts: nextScenarioShortcuts,
    };
    persistLocalProfileSnapshot(nextProfileSnapshot);

    if (user) {
      const payload = {
        version: 3 as const,
        ...nextProfileSnapshot,
      };
      localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
      localStorage.setItem('leaf_tab_sync_pending', 'true');
      clearLocalNeedsCloudReconcile();
    } else {
      const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
      if (!hasStoredCloudSession) {
        markLocalNeedsCloudReconcile('signed_out_edit');
      }
      localDirtyRef.current = true;
    }
  }, [
    localDirtyRef,
    selectedScenarioId,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
    user,
    leafTabBookmarkSyncScope,
  ]);

  const applyLeafTabSyncSnapshot = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    await applyLeafTabSyncSnapshotToLocalState(snapshot);
  }, [applyLeafTabSyncSnapshotToLocalState]);
  const cloudSyncRunnerRef = useRef<(options?: {
    silentSuccess?: boolean;
    allowWhenDisabled?: boolean;
    requestBookmarkPermission?: boolean;
  }) => Promise<unknown>>(async () => null);

  const applyImportedLegacyBackup = useCallback(async (
    payload: {
      scenarioModes: any[];
      selectedScenarioId: string;
      scenarioShortcuts: ScenarioShortcuts;
    },
    options?: ApplyImportedBackupOptions,
  ) => {
    const closeSettings = options?.closeSettings ?? true;
    const successKey = options?.successKey || 'settings.backup.importSuccess';
    const silentSuccess = options?.silentSuccess ?? false;
    const performImport = async (
      reportProgress?: (options: {
        title?: string;
        detail?: string;
        progress?: number;
      }) => void,
    ) => {
      reportProgress?.({
        title: '正在整理快捷方式数据',
        detail: '正在校验导入文件内容',
        progress: 16,
      });
      if (!Array.isArray(payload.scenarioModes) || !payload.scenarioShortcuts || typeof payload.scenarioShortcuts !== 'object') {
        throw new Error('invalid_legacy_backup_payload');
      }

      const nextSnapshot = {
        scenarioModes: payload.scenarioModes,
        selectedScenarioId: typeof payload.selectedScenarioId === 'string'
          ? payload.selectedScenarioId
          : payload.scenarioModes[0]?.id || '',
        scenarioShortcuts: payload.scenarioShortcuts,
      };

      reportProgress?.({
        title: '正在写入本地快捷方式',
        detail: '正在把导入数据应用到当前设备',
        progress: 52,
      });
      setScenarioModes(nextSnapshot.scenarioModes);
      setSelectedScenarioId(nextSnapshot.selectedScenarioId);
      setScenarioShortcuts(nextSnapshot.scenarioShortcuts);
      persistLocalProfileSnapshot(nextSnapshot);

      if (user) {
        localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify({
          version: 3 as const,
          ...nextSnapshot,
        }));
        localStorage.setItem('leaf_tab_sync_pending', 'true');
        clearLocalNeedsCloudReconcile();
      } else {
        const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
        if (!hasStoredCloudSession) {
          markLocalNeedsCloudReconcile('signed_out_edit');
        }
        localDirtyRef.current = true;
      }

      let synced = true;
      if (user && options?.syncCloudIfSignedIn !== false) {
        reportProgress?.({
          title: '正在同步导入结果',
          detail: '正在把最新快捷方式写回账号云端',
          progress: 82,
        });
        synced = Boolean(await cloudSyncRunnerRef.current({
          silentSuccess: true,
          allowWhenDisabled: true,
        }));
      }

      if (!silentSuccess) {
        toast.success(t(successKey));
      }
      if (closeSettings) setSettingsOpen(false);
      return synced;
    };

    try {
      if (options?.skipLongTaskIndicator) {
        return await performImport(options?.onProgress);
      }
      return await runLongTask({
        title: '正在导入快捷方式',
        detail: '正在写入本地数据，请稍候',
        progress: 8,
      }, async ({ update }) => {
        return performImport(update);
      });
    } catch (error) {
      toast.error(t('settings.backup.importError'));
      throw error;
    }
  }, [
    localDirtyRef,
    runLongTask,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
    setSettingsOpen,
    t,
    user,
  ]);

  const applyImportedLeafTabBackup = useCallback(async (
    data: LeafTabLocalBackupImportData,
    options?: ApplyImportedBackupOptions,
  ) => {
    if (data.kind === 'legacy-backup') {
      return applyImportedLegacyBackup(data.payload, options);
    }

    const closeSettings = options?.closeSettings ?? true;
    const successKey = options?.successKey || 'settings.backup.importSuccess';
    const silentSuccess = options?.silentSuccess ?? false;
    const performImport = async (
      reportProgress?: (options: {
        title?: string;
        detail?: string;
        progress?: number;
      }) => void,
    ) => {
      reportProgress?.({
        title: '正在读取当前本地数据',
        detail: '正在准备合并导入内容',
        progress: 18,
      });
      const baseSnapshot = await buildLeafTabSyncSnapshotFromCurrentState({
        requestBookmarkPermission: false,
      });
      reportProgress?.({
        title: '正在合并导入数据',
        detail: '正在对齐快捷方式与书签的最新状态',
        progress: 40,
      });
      const mergedSnapshot = mergeLeafTabLocalBackupSnapshotWithBase({
        baseSnapshot,
        importedSnapshot: data.snapshot,
        exportScope: data.exportScope,
      });
      const mergedProjected = projectLeafTabSyncSnapshotToAppState(mergedSnapshot);
      const nextScenarioModes = mergedProjected.scenarioModes.length > 0
        ? mergedProjected.scenarioModes
        : defaultScenarioModes;
      const nextSelectedScenarioId = nextScenarioModes.some((mode) => mode.id === data.selectedScenarioId)
        ? data.selectedScenarioId
        : nextScenarioModes[0]?.id || '';

      reportProgress?.({
        title: '正在写入本地数据',
        detail: '正在把导入结果应用到当前设备',
        progress: 68,
      });
      await applyLeafTabSyncSnapshotToLocalState(mergedSnapshot, {
        preferredSelectedScenarioId: nextSelectedScenarioId,
      });

      let synced = true;
      if (user && options?.syncCloudIfSignedIn !== false) {
        reportProgress?.({
          title: '正在同步导入结果',
          detail: '正在把最新数据写回账号云端',
          progress: 86,
        });
        synced = Boolean(await cloudSyncRunnerRef.current({
          silentSuccess: true,
          allowWhenDisabled: true,
        }));
      }

      if (!silentSuccess) {
        toast.success(t(successKey));
      }
      if (closeSettings) setSettingsOpen(false);
      return synced;
    };

    try {
      if (options?.skipLongTaskIndicator) {
        return await performImport(options?.onProgress);
      }
      return await runLongTask({
        title: '正在导入数据',
        detail: '正在处理快捷方式和书签内容',
        progress: 8,
      }, async ({ update }) => {
        return performImport(update);
      });
    } catch (error) {
      toast.error(t('settings.backup.importError'));
      throw error;
    }
  }, [
    applyImportedLegacyBackup,
    applyLeafTabSyncSnapshotToLocalState,
    buildLeafTabSyncSnapshotFromCurrentState,
    runLongTask,
    setSettingsOpen,
    t,
    user,
  ]);

  const executeExportData = useCallback(async (exportScope?: LeafTabLocalBackupExportScope) => {
    await runLongTask({
      title: '正在导出数据',
      detail: '正在准备快捷方式与书签内容',
      progress: 8,
    }, async ({ update }) => {
      update({
        title: '正在读取本地数据',
        detail: '正在收集当前设备上的快捷方式与书签',
        progress: 24,
      });
      const snapshot = await buildLeafTabSyncSnapshotFromCurrentState({
        requestBookmarkPermission: true,
      });
      update({
        title: '正在整理导出内容',
        detail: '正在组装 LeafTab 备份文件',
        progress: 58,
      });
      const bundle = createLeafTabLocalBackupBundle({
        snapshot: filterLeafTabLocalBackupSnapshot(snapshot, exportScope),
        selectedScenarioId: exportScope?.shortcuts === false ? '' : selectedScenarioId,
        bookmarkScope: leafTabBookmarkSyncScope,
        exportScope,
        rootPath: leafTabSyncWebdavConfig?.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT_PATH,
        appVersion: globalThis.chrome?.runtime?.getManifest?.().version || '',
      });
      update({
        title: '正在生成导出文件',
        detail: '马上就可以保存到本地',
        progress: 84,
      });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leaftab_backup_${new Date().toISOString().split('T')[0]}.leaftab`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
    toast.success(t('settings.backup.exportSuccess'));
  }, [
    buildLeafTabSyncSnapshotFromCurrentState,
    leafTabBookmarkSyncScope,
    leafTabSyncWebdavConfig?.rootPath,
    runLongTask,
    selectedScenarioId,
    t,
  ]);

  const handleExportData = useCallback(async () => {
    setExportBackupDialogOpen(true);
  }, []);

  const proceedImportData = useCallback(async (data: LeafTabLocalBackupImportData) => {
    if (user) {
      setImportPendingPayload(data);
      setImportConfirmOpen(true);
      return;
    }
    await applyImportedLeafTabBackup(data, {
      closeSettings: true,
      syncCloudIfSignedIn: false,
    });
  }, [applyImportedLeafTabBackup, user]);

  const handleImportData = useCallback(async (data: LeafTabLocalBackupImportData) => {
    const availableScope = getLeafTabLocalBackupAvailableScope(data);
    const hasBothSections = availableScope.shortcuts && availableScope.bookmarks;
    if (hasBothSections) {
      setSettingsOpen(false);
      setImportBackupScopePayload(data);
      setImportBackupDialogOpen(true);
      return;
    }
    setSettingsOpen(false);
    await proceedImportData(data);
  }, [proceedImportData, setSettingsOpen]);

  const handleImportConfirmApply = useCallback(async (payload: LeafTabLocalBackupImportData) => {
    return runLongTask({
      title: '正在备份云端当前数据',
      detail: '导入前会先保存一份当前账号云端副本',
      progress: 6,
    }, async ({ update }) => {
      update({
        title: '正在读取云端当前数据',
        detail: '正在生成导入前备份，避免误覆盖',
        progress: 18,
      });
      await downloadCloudBackupEnvelope();
      update({
        title: '正在导入备份数据',
        detail: '正在把你选择的数据写入当前设备',
        progress: 34,
      });
      return applyImportedLeafTabBackup(payload, {
        closeSettings: false,
        silentSuccess: true,
        skipLongTaskIndicator: true,
        onProgress: update,
      });
    });
  }, [applyImportedLeafTabBackup, downloadCloudBackupEnvelope, runLongTask]);

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
    legacyCompat: null,
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
    remoteStore: cloudSyncRemoteStore,
    legacyCompat: null,
    buildLocalSnapshot: buildCloudLeafTabSyncSnapshot,
    applyLocalSnapshot: applyLeafTabSyncSnapshot,
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
  const cloudSyncConfig = useMemo(
    () => readCloudSyncConfigFromStorage(),
    [cloudLeafTabSyncState.lastErrorAt, cloudLeafTabSyncState.lastSuccessAt, cloudSyncConfigVersion, user],
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
  const webdavEncryptionLabel = useMemo(() => {
    if (!leafTabWebdavConfigured) return '配置后设置';
    return leafTabWebdavEncryptionReady ? '当前设备已解锁' : '需要设置口令';
  }, [leafTabWebdavConfigured, leafTabWebdavEncryptionReady]);
  const cloudEncryptionLabel = useMemo(() => {
    if (!user) return '登录后设置';
    return cloudSyncEncryptionReady ? '当前设备已解锁' : '需要输入口令';
  }, [cloudSyncEncryptionReady, user]);
  const resolveSyncEncryptionError = useCallback(async (
    providerLabel: string,
    error: unknown,
  ) => {
    if (!(error instanceof LeafTabSyncEncryptionRequiredError)) {
      return false;
    }
    return requestSyncEncryptionDialog({
      mode: error.mode,
      scopeKey: error.scopeKey,
      scopeLabel: error.scopeLabel,
      providerLabel,
      metadata: error.metadata,
    });
  }, [requestSyncEncryptionDialog]);
  const handleLeafTabSync = useCallback(async (
    options?: {
      enableAfterSuccess?: boolean;
      silentSuccess?: boolean;
      requestBookmarkPermission?: boolean;
      showProgressIndicator?: boolean;
      progressTaskId?: string | null;
      progressDetail?: string;
      onProgress?: (progress: LeafTabSyncEngineProgress) => void;
      allowEncryptionPrompt?: boolean;
      _retriedAfterUnlock?: boolean;
    },
  ) => {
    if (!leafTabSyncHasConfig) {
      openLeafTabSyncConfig();
      return null;
    }
    const progressTaskId = options?.progressTaskId
      ?? (options?.showProgressIndicator === true
      ? startLongTaskIndicator({
          title: '正在准备同步数据',
          detail: '正在读取本地与云端状态',
          progress: 6,
        })
      : null);
    const shouldManageProgressIndicator = !options?.progressTaskId && options?.showProgressIndicator === true;
    const updateSyncIndicator = (progress: LeafTabSyncEngineProgress) => {
      options?.onProgress?.(progress);
      if (!progressTaskId) return;
      updateLongTaskIndicator(progressTaskId, {
        title: progress.message,
        detail: options?.progressDetail || '正在后台同步，你可以继续进行其他操作',
        progress: progress.progress,
      });
    };
    try {
      if (options?.requestBookmarkPermission) {
        options?.onProgress?.({
          stage: 'reading-state',
          message: '正在检查书签权限',
          progress: 10,
        });
        if (progressTaskId) {
          updateLongTaskIndicator(progressTaskId, {
            title: '正在检查书签权限',
            detail: options?.progressDetail || '需要确认当前浏览器允许访问书签数据',
            progress: 10,
          });
        }
        await ensureExtensionPermission('bookmarks', { requestIfNeeded: true }).catch(() => false);
      }

      const result = await runLeafTabSync('auto', {
        onProgress: updateSyncIndicator,
      });
      if (!result) return null;

      markWebdavSyncSuccess();
      if (options?.enableAfterSuccess) {
        setWebdavSyncEnabledInStorage(true);
      }
      if (shouldManageProgressIndicator && progressTaskId) {
        finishLongTaskIndicator(progressTaskId, {
          title: '同步完成',
          detail: result.summaryText || '本地与云端已经处理完成',
        });
      }
      const successText = result.summaryText || '同步完成';
      if (!options?.silentSuccess) {
        toast.success(successText);
      }
      await refreshLeafTabSyncAnalysis();
      return result;
    } catch (error) {
      if (options?.allowEncryptionPrompt !== false && !options?._retriedAfterUnlock) {
        const resolved = await resolveSyncEncryptionError('WebDAV 同步', error);
        if (resolved) {
          return handleLeafTabSync({
            ...options,
            _retriedAfterUnlock: true,
          });
        }
      }
      if (shouldManageProgressIndicator && progressTaskId) {
        clearLongTaskIndicator(progressTaskId);
      }
      markWebdavSyncError(error);
      toast.error(
        isWebdavAuthError(error)
          ? t('settings.backup.webdav.authFailed')
          : formatLeafTabSyncErrorMessage(error),
      );
      return null;
    }
  }, [
    leafTabSyncHasConfig,
    clearLongTaskIndicator,
    finishLongTaskIndicator,
    markWebdavSyncError,
    markWebdavSyncSuccess,
    openLeafTabSyncConfig,
    refreshLeafTabSyncAnalysis,
    runLeafTabSync,
    setWebdavSyncEnabledInStorage,
    t,
    updateLongTaskIndicator,
    startLongTaskIndicator,
    resolveSyncEncryptionError,
  ]);

  const handleCloudLeafTabSync = useCallback(async (
    options?: {
      silentSuccess?: boolean;
      requestBookmarkPermission?: boolean;
      showProgressIndicator?: boolean;
      progressTaskId?: string | null;
      progressDetail?: string;
      onProgress?: (progress: LeafTabSyncEngineProgress) => void;
      allowWhenDisabled?: boolean;
      allowEncryptionPrompt?: boolean;
      _retriedAfterUnlock?: boolean;
    },
  ) => {
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

    const progressTaskId = options?.progressTaskId
      ?? (options?.showProgressIndicator === true
      ? startLongTaskIndicator({
          title: '正在准备云同步',
          detail: '正在读取本地与账号云端状态',
          progress: 6,
        })
      : null);
    const shouldManageProgressIndicator = !options?.progressTaskId && options?.showProgressIndicator === true;

    const updateSyncIndicator = (progress: LeafTabSyncEngineProgress) => {
      options?.onProgress?.(progress);
      if (!progressTaskId) return;
      updateLongTaskIndicator(progressTaskId, {
        title: progress.message,
        detail: options?.progressDetail || '正在后台同步，你可以继续进行其他操作',
        progress: progress.progress,
      });
    };

    try {
      if (options?.requestBookmarkPermission) {
        options?.onProgress?.({
          stage: 'reading-state',
          message: '正在检查书签权限',
          progress: 10,
        });
        if (progressTaskId) {
          updateLongTaskIndicator(progressTaskId, {
            title: '正在检查书签权限',
            detail: options?.progressDetail || '需要确认当前浏览器允许访问书签数据',
            progress: 10,
          });
        }
        await ensureExtensionPermission('bookmarks', { requestIfNeeded: true }).catch(() => false);
      }

      const result = await runCloudLeafTabSync('auto', {
        onProgress: updateSyncIndicator,
      });
      if (!result) return null;

      markCloudSyncSuccess();
      if (shouldManageProgressIndicator && progressTaskId) {
        finishLongTaskIndicator(progressTaskId, {
          title: '同步完成',
          detail: result.summaryText || '本地与账号云端已经处理完成',
        });
      }
      if (!options?.silentSuccess) {
        toast.success(result.summaryText || '同步完成');
      }
      await refreshCloudLeafTabSyncAnalysis();
      return result;
    } catch (error) {
      if (options?.allowEncryptionPrompt !== false && !options?._retriedAfterUnlock) {
        const resolved = await resolveSyncEncryptionError('云同步', error);
        if (resolved) {
          return handleCloudLeafTabSync({
            ...options,
            _retriedAfterUnlock: true,
          });
        }
      }
      if (shouldManageProgressIndicator && progressTaskId) {
        clearLongTaskIndicator(progressTaskId);
      }
      markCloudSyncError(error);
      toast.error(String((error as Error)?.message || '云同步失败'));
      return null;
    }
  }, [
    clearLongTaskIndicator,
    cloudLeafTabSyncHasConfig,
    cloudSyncEnabled,
    finishLongTaskIndicator,
    markCloudSyncError,
    markCloudSyncSuccess,
    refreshCloudLeafTabSyncAnalysis,
    runCloudLeafTabSync,
    setIsAuthModalOpen,
    startLongTaskIndicator,
    t,
    updateLongTaskIndicator,
    user,
    resolveSyncEncryptionError,
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
  }, []);
  const handleLeafTabAutoSync = useCallback(async () => {
    const result = await handleLeafTabSync({
      silentSuccess: true,
    });
    return Boolean(result);
  }, [handleLeafTabSync]);

  useLeafTabWebdavAutoSync({
    conflictModalOpen: false,
    isDragging,
    syncing: leafTabSyncState.status === 'syncing',
    onSync: handleLeafTabAutoSync,
  });

  useEffect(() => {
    if (!user || !cloudSyncEnabled || !cloudLeafTabSyncHasConfig) {
      setCloudNextSyncAt(null);
      return;
    }

    let disposed = false;
    let timer: number | null = null;
    const intervalMs = Math.max(1, cloudSyncConfig.intervalMinutes) * 60 * 1000;

    const schedule = (delayMs: number) => {
      if (disposed) return;
      const safeDelayMs = Math.max(1200, delayMs);
      setCloudNextSyncAt(Date.now() + safeDelayMs);
      timer = window.setTimeout(async () => {
        if (disposed) return;
        const result = await handleCloudLeafTabSync({
          silentSuccess: true,
        });
        if (result && cloudSyncConfig.autoSyncToastEnabled) {
          toast.success(t('toast.cloudAutoSyncSuccess'));
        }
        if (disposed) return;
        schedule(intervalMs);
      }, safeDelayMs);
    };

    schedule(intervalMs);

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
    handleCloudLeafTabSync,
    setCloudNextSyncAt,
    t,
    user,
  ]);
  useEffect(() => {
    if (!cloudLoginSyncPendingUser || !user || cloudLoginSyncPendingUser !== user) {
      return;
    }
    setCloudLoginSyncPendingUser(null);
    if (!cloudSyncEnabled || !cloudLeafTabSyncHasConfig) {
      return;
    }
    window.setTimeout(() => {
      void runLongTask({
        title: '正在同步账号数据',
        detail: '正在处理快捷方式和书签数据',
        progress: 8,
      }, async ({ update }) => {
        await handleCloudLeafTabSync({
          silentSuccess: true,
          requestBookmarkPermission: true,
          progressTaskId: null,
          onProgress: (progress) => {
            update({
              title: progress.message,
              progress: progress.progress,
            });
          },
        });
      });
    }, 180);
  }, [
    cloudLeafTabSyncHasConfig,
    cloudLoginSyncPendingUser,
    cloudSyncEnabled,
    handleCloudLeafTabSync,
    runLongTask,
    user,
  ]);

  const resolveWebdavConflict = useCallback(async (_config: WebdavConfig) => {
    await handleLeafTabSync({
      requestBookmarkPermission: true,
      showProgressIndicator: true,
    });
  }, [handleLeafTabSync]);

  const handleRequestCloudLogin = useCallback(() => {
    const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (webdavEnabled) {
      toast.error('当前已启用 WebDAV 同步，请先停用 WebDAV 同步后再登录云同步');
      return false;
    }
    setIsAuthModalOpen(true);
    return true;
  }, []);
  const handleOpenCloudSyncConfig = useCallback(() => {
    const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (webdavEnabled) {
      toast.error('当前已启用 WebDAV 同步，请先停用 WebDAV 同步后再管理云同步');
      return;
    }
    setLeafTabSyncDialogOpen(false);
    setCloudSyncConfigOpen(true);
  }, []);
  const handleCloudSyncNowFromCenter = useCallback(async () => {
    if (!user) {
      handleRequestCloudLogin();
      return false;
    }
    const encryptionReady = await ensureSyncEncryptionAccess({
      providerLabel: '云同步',
      scopeKey: cloudSyncEncryptionScopeKey,
      transport: cloudSyncEncryptedTransport,
    });
    if (!encryptionReady) {
      return false;
    }
    return runLongTask({
      title: '正在同步到云端',
      detail: '正在处理快捷方式和书签数据',
      progress: 8,
    }, async ({ update }) => {
      const result = await handleCloudLeafTabSync({
        requestBookmarkPermission: true,
        silentSuccess: true,
        progressTaskId: null,
        onProgress: (progress) => {
          update({
            title: progress.message,
            progress: progress.progress,
          });
        },
      });
      if (result) {
        toast.success(t('toast.cloudAutoSyncSuccess'));
        return true;
      }
      toast.error(t('toast.cloudSyncFailed'));
      return false;
    });
  }, [
    cloudSyncEncryptedTransport,
    cloudSyncEncryptionScopeKey,
    ensureSyncEncryptionAccess,
    handleCloudLeafTabSync,
    handleRequestCloudLogin,
    runLongTask,
    t,
    user,
  ]);
  const handleCloudSyncConfigSaved = useCallback(async () => {
    if (!user) return;
    if (!readCloudSyncConfigFromStorage().enabled) {
      setCloudNextSyncAt(null);
      return;
    }
    const encryptionReady = await ensureSyncEncryptionAccess({
      providerLabel: '云同步',
      scopeKey: cloudSyncEncryptionScopeKey,
      transport: cloudSyncEncryptedTransport,
    });
    if (!encryptionReady) {
      return;
    }
    await handleCloudSyncNowFromCenter();
  }, [
    cloudSyncEncryptedTransport,
    cloudSyncEncryptionScopeKey,
    ensureSyncEncryptionAccess,
    handleCloudSyncNowFromCenter,
    setCloudNextSyncAt,
    user,
  ]);
  const syncLocalToCloudBeforeLogout = useCallback(async () => {
    if (!user) return false;
    if (!navigator.onLine) return false;
    if (!readCloudSyncConfigFromStorage().enabled) return true;
    try {
      const result = await handleCloudLeafTabSync({
        silentSuccess: true,
        allowWhenDisabled: true,
      });
      return Boolean(result);
    } catch {
      return false;
    }
  }, [handleCloudLeafTabSync, user]);
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
    onSettingsClick: handleOpenSettings,
    onSyncClick: () => setLeafTabSyncDialogOpen(true),
    syncStatus: topNavSyncStatus,
    onWeatherUpdate: setWeatherCode,
    reduceVisualEffects: visualEffectsPolicy.disableBackdropBlur,
    rightSlot: <ScenarioModeMenu {...scenarioMenuLayerProps} reduceVisualEffects={visualEffectsPolicy.disableBackdropBlur} />,
  }), [handleOpenSettings, scenarioMenuLayerProps, setWeatherCode, topNavSyncStatus, visualEffectsPolicy.disableBackdropBlur]);
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
    topNavSyncStatus,
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
    onWarmSemanticBookmarkIndex: scheduleSemanticBookmarkWarmup,
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
    scheduleSemanticBookmarkWarmup,
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
  const shouldMountUpdateDialog = !IS_STORE_BUILD && useKeepMountedAfterFirstOpen(updateDialogOpen);

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
              onConfirm: async (scope) => {
                await executeExportData(scope);
              },
            }}
            importBackupDialogProps={{
              open: importBackupDialogOpen,
              onOpenChange: (open) => {
                setImportBackupDialogOpen(open);
                if (!open) {
                  setImportBackupScopePayload(null);
                }
              },
              mode: 'import',
              availableScope: importBackupScopePayload
                ? getLeafTabLocalBackupAvailableScope(importBackupScopePayload)
                : {
                    shortcuts: true,
                    bookmarks: true,
                  },
              onConfirm: async (scope) => {
                if (!importBackupScopePayload) return;
                const narrowedImport = restrictLeafTabLocalBackupImportScope(importBackupScopePayload, scope);
                setImportBackupScopePayload(null);
                await proceedImportData(narrowedImport);
              },
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
            cloudSyncConfigDialogProps={{
              open: cloudSyncConfigOpen,
              onOpenChange: setCloudSyncConfigOpen,
              encryptionReady: cloudSyncEncryptionReady,
              onManageEncryption: handleManageCloudSyncEncryption,
              onSaveSuccess: handleCloudSyncConfigSaved,
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
      <LeafTabSyncDialog
        open={leafTabSyncDialogOpen}
        onOpenChange={handleLeafTabSyncDialogOpenChange}
        analysis={cloudLeafTabSyncAnalysis || leafTabSyncAnalysis}
        syncState={leafTabSyncState}
        cloudSyncState={cloudLeafTabSyncState}
        ready={leafTabSyncReady}
        hasConfig={leafTabSyncHasConfig}
        busy={leafTabSyncState.status === 'syncing' || cloudLeafTabSyncState.status === 'syncing'}
        bookmarkScopeLabel={leafTabBookmarkSyncScopeLabel}
        summaryText={cloudLeafTabSyncLastResult?.summaryText || leafTabSyncLastResult?.summaryText || ''}
        cloudSignedIn={Boolean(user)}
        cloudEnabled={cloudSyncEnabled}
        cloudUsername={user || ''}
        cloudLastSyncLabel={cloudLastSyncLabel}
        cloudNextSyncLabel={cloudNextSyncLabel}
        cloudEncryptionLabel={cloudEncryptionLabel}
        webdavConfigured={leafTabWebdavConfigured}
        webdavEnabled={leafTabWebdavEnabled}
        webdavProfileLabel={leafTabWebdavProfileLabel}
        webdavUrlLabel={leafTabSyncWebdavConfig?.url || ''}
        webdavLastSyncLabel={leafTabWebdavLastSyncLabel}
        webdavNextSyncLabel={leafTabWebdavNextSyncLabel}
        webdavEncryptionLabel={webdavEncryptionLabel}
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
        onCloudLogout={() => {
          requestLogoutConfirmation();
        }}
        onSyncNow={() => {
          setLeafTabSyncDialogOpen(false);
          void handleLeafTabSync({
            requestBookmarkPermission: true,
            showProgressIndicator: true,
          });
        }}
        onEnableSync={() => {
          setLeafTabSyncDialogOpen(false);
          void handleEnableWebdavSync();
        }}
        onDisableSync={() => {
          setConfirmDisableWebdavSyncOpen(true);
        }}
        onOpenConfig={() => {
          handleOpenWebdavConfigFromSyncCenter({
            enableAfterSave: true,
          });
        }}
      />
      <LeafTabSyncEncryptionDialog
        open={Boolean(syncEncryptionDialogState?.open)}
        mode={syncEncryptionDialogState?.mode || 'setup'}
        providerLabel={syncEncryptionDialogState?.providerLabel || '同步'}
        busy={syncEncryptionDialogBusy}
        onOpenChange={handleSyncEncryptionDialogOpenChange}
        onSubmit={handleSubmitSyncEncryptionDialog}
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
      <LongTaskIndicator task={longTaskIndicator} />
      <Toaster offset={longTaskIndicator ? 96 : 16} />
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
            onBookmarksPermissionGranted={() => {
              scheduleSemanticBookmarkWarmup({ immediate: true });
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
