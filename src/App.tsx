/// <reference types="chrome" />

import { Suspense, useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import imgImage from "./assets/Default_wallpaper.webp?url";
import { saveWallpaper } from './db';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useWallpaper } from './hooks/useWallpaper';
import { useRole } from './hooks/useRole';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useLongTaskIndicator } from './hooks/useLongTaskIndicator';
import { useInitialReveal } from './hooks/useInitialReveal';
import { useNewtabBootstrapFocus } from './hooks/useNewtabBootstrapFocus';
import { useWallpaperRevealController } from './hooks/useWallpaperRevealController';
import { useVisualEffectsPolicy } from './hooks/useVisualEffectsPolicy';

// Components
import ScenarioModeMenu from './components/ScenarioModeMenu';
import type { TopNavIntroStep } from './components/TopNavBar';
import { Toaster, toast } from './components/ui/sonner';
import type { Shortcut, ShortcutFolderDisplayMode, SyncablePreferences } from './types';
import { normalizeApiBase } from "./utils";
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfilePreferences, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { PrivacyConsentModal } from './components/PrivacyConsentModal';
import { LongTaskIndicator } from './components/LongTaskIndicator';
import ConfirmDialog from './components/ConfirmDialog';
import { ENABLE_CUSTOM_API_SERVER, IS_STORE_BUILD } from '@/config/distribution';
import { useGithubReleaseUpdate } from './hooks/useGithubReleaseUpdate';
import { DEFAULT_SHORTCUT_CARD_VARIANT, clampShortcutGridColumns } from '@/components/shortcuts/shortcutCardVariant';
import { scaleShortcutIconSize } from '@/utils/shortcutIconSettings';
import { getDisplayModeLayoutFlags } from '@/displayMode/config';
import { DEFAULT_COLOR_WALLPAPER_ID, getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
import type { AboutLeafTabModalTab } from '@/components/AboutLeafTabModal';
import { weatherVideoMap, sunnyWeatherVideo } from '@/components/wallpaper/weatherWallpapers';
import type { ShortcutFolderOpeningSourceSnapshot } from '@/components/folderTransition/useFolderTransitionController';
import {
  useFolderTransitionActiveFolderId,
  useFolderTransitionController,
  useFolderTransitionOverlayFolderId,
} from '@/components/folderTransition/useFolderTransitionController';
import { FolderTransitionDocumentEffects } from '@/components/folderTransition/FolderTransitionDocumentEffects';
import {
  getFolderPreviewRoot,
  getFolderPreviewSlotEntries,
  getFolderPreviewTitle,
} from '@/components/shortcuts/folderPreviewRegistry';
import {
  LazyRoleSelector,
  LazyUpdateAvailableDialog,
  LazyWallpaperSelector,
  preloadShortcutFolderCompactOverlay,
} from '@/lazy/components';
import { applyDynamicAccentColor, resolveAccentColorSelection } from '@/utils/dynamicAccentColor';
import { DEFAULT_ACCENT_COLOR } from '@/utils/accentColor';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import {
  PANORAMIC_SURFACE_REVEAL_TIMING,
} from '@/config/animationTokens';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { type LeafTabSyncSnapshot } from '@/sync/leaftab';
import {
  emitSyncablePreferencesApplied,
  normalizeSyncablePreferences,
  readSyncablePreferencesFromStorage,
  writeSyncablePreferencesToStorage,
} from '@/utils/syncablePreferences';
import {
  applyShortcutDropIntent,
  dissolveFolder,
  mergeShortcutsIntoNewFolder,
  moveShortcutsIntoFolder,
  ROOT_SHORTCUTS_PATH,
  type FolderExtractDragStartPayload,
  type FolderShortcutDropIntent,
  type RootShortcutDropIntent,
  type ShortcutDropIntent,
} from '@leaftab/workspace-core';
import {
  findShortcutById,
  isShortcutFolder,
  isShortcutLink,
} from '@/utils/shortcutFolders';
import { useShortcutExperienceRootProps } from '@/features/appShell/useShortcutExperienceRootProps';
import { ShortcutAppProvider } from '@/features/shortcuts/app/ShortcutAppContext';
import { ShortcutAppDialogsRoot } from '@/features/shortcuts/app/ShortcutAppDialogsRoot';
import { ShortcutExperienceRoot } from '@/features/shortcuts/app/ShortcutExperienceRoot';
import { ShortcutSyncDialogsRoot } from '@/features/shortcuts/app/ShortcutSyncDialogsRoot';
import { useShortcutAppContextValue } from '@/features/shortcuts/app/useShortcutAppContextValue';
import { createLeaftabGridEngineHostAdapter } from '@/features/shortcuts/gridEngine/leaftabGridEngineHostAdapter';
import { useShortcutWorkspaceController } from '@/features/shortcuts/workspace/useShortcutWorkspaceController';
import { LeafTabSyncProvider } from '@/features/sync/app/LeafTabSyncContext';
import { useLeafTabSyncRuntimeController } from '@/features/sync/app/useLeafTabSyncRuntimeController';

type FolderOverlaySnapshotRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const TOP_NAV_LAYOUT_INTRO_SEEN_KEY = 'leaftab_top_nav_layout_intro_seen_v1';

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

const LOGOUT_PRE_SYNC_MAX_WAIT_MS = 2200;
const LONG_TASK_INDICATOR_DELAY_MS = 180;
const DARK_MODE_AUTO_DIM_OPACITY = 12;
const DARK_MODE_AUTO_DIM_OPACITY_CAP = 85;
const DYNAMIC_WALLPAPER_IDLE_FREEZE_MS = 4 * 60 * 1000;

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
    return stored || DEFAULT_ACCENT_COLOR;
  } catch {
    return DEFAULT_ACCENT_COLOR;
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
  const [syncConfigBackTarget, setSyncConfigBackTarget] = useState<'settings' | 'sync-center'>('settings');
  const [webdavDialogOpen, setWebdavDialogOpen] = useState(false);
  const [webdavEnableAfterConfigSave, setWebdavEnableAfterConfigSave] = useState(false);
  const [webdavShowConnectionFields, setWebdavShowConnectionFields] = useState(false);
  const [pendingWebdavEnableScopeKey, setPendingWebdavEnableScopeKey] = useState<string | null>(null);
  const [leafTabSyncDialogOpen, setLeafTabSyncDialogOpen] = useState(false);
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
  // Initialize Hooks
  const { 
    user, 
    isAuthModalOpen,
    setIsAuthModalOpen,
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

  const normalizedGridColumns = clampShortcutGridColumns(shortcutGridColumns, DEFAULT_SHORTCUT_CARD_VARIANT, responsiveLayout.density);
  const minShortcutRows = responsiveLayout.baseRows;

  const shortcutApp = useShortcutAppContextValue(
    user,
    openInNewTab,
    API_URL,
    handleLogout,
  );
  const {
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
    shortcuts,
    totalShortcuts,
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    isDragging,
    scenarioModeOpen,
    setContextMenu,
    setShortcutEditOpen,
    setShortcutModalMode,
    setShortcutDeleteOpen,
    setSelectedShortcut,
    setEditingTitle,
    setEditingUrl,
    setScenarioModeOpen,
    setScenarioCreateOpen,
    handleOpenEditScenarioMode,
    handleDeleteScenarioMode,
    handleShortcutOpen,
    handleShortcutContextMenu,
    handleGridContextMenu,
    handleShortcutReorder,
    setUserRole,
    resetLocalShortcutsByRole,
    localDirtyRef,
  } = shortcutApp;

  const markShortcutStateDirty = useCallback(() => {
    if (!user) localDirtyRef.current = true;
  }, [localDirtyRef, user]);

  const {
    editingFolderId,
    setEditingFolderId,
    pendingRootFolderMerge,
    folderNameDialogOpen,
    setFolderNameDialogOpen,
    externalShortcutDragSession,
    pendingExtractHiddenShortcutId,
    activePendingExtractDrag,
    rootDisplayShortcuts,
    startFolderExtractDrag,
    markRootShortcutDragStart,
    markRootShortcutDragEnd,
    commitPendingFolderExtractPreview,
    consumeExternalDragSession,
    requestRootFolderMerge,
    closeFolderNameDialog,
    completeFolderNameFlow,
  } = useShortcutWorkspaceController({
    selectedScenarioId,
    shortcuts,
    onCommitPendingExtractPreview: ({ scenarioId, previewShortcuts }) => {
      setScenarioShortcuts((prev) => ({
        ...prev,
        [scenarioId]: previewShortcuts,
      }));
      markShortcutStateDirty();
    },
  });
  const folderOverlayWarmupPromiseRef = useRef<Promise<unknown> | null>(null);
  const folderOpenRequestIdRef = useRef(0);
  const folderTransitionController = useFolderTransitionController();
  const openFolderId = useFolderTransitionActiveFolderId(folderTransitionController);
  const overlayFolderId = useFolderTransitionOverlayFolderId(folderTransitionController);
  const runAfterFolderOverlayClose = folderTransitionController.runAfterClose;

  const openFolderShortcut = useMemo(
    () => (openFolderId ? findShortcutById(shortcuts, openFolderId) : null),
    [openFolderId, shortcuts],
  );
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

  const ensureFolderOverlayReady = useCallback(() => {
    if (!folderOverlayWarmupPromiseRef.current) {
      folderOverlayWarmupPromiseRef.current = preloadShortcutFolderCompactOverlay();
    }
    return folderOverlayWarmupPromiseRef.current;
  }, []);

  useEffect(() => {
    void ensureFolderOverlayReady();
  }, [ensureFolderOverlayReady]);

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
      sourceTitleRect: copyFolderOverlaySnapshotRect(getFolderPreviewTitle(folderId)?.getBoundingClientRect()),
      sourceChildRects,
      sourceChildSlotRects: sourceChildSlotRects.filter(Boolean),
    };
  }, []);

  const handleShortcutActivate = useCallback((shortcut: Shortcut) => {
    if (isShortcutFolder(shortcut)) {
      const openRequestId = folderOpenRequestIdRef.current + 1;
      folderOpenRequestIdRef.current = openRequestId;

      void ensureFolderOverlayReady()
        .catch(() => null)
        .then(() => {
          if (folderOpenRequestIdRef.current !== openRequestId) return;
          const sourceSnapshot = captureFolderOpeningSourceSnapshot(shortcut.id);
          folderTransitionController.openFolder(shortcut.id, sourceSnapshot);
        });
      return;
    }
    folderOpenRequestIdRef.current += 1;
    handleShortcutOpen(shortcut);
  }, [
    captureFolderOpeningSourceSnapshot,
    ensureFolderOverlayReady,
    folderTransitionController,
    handleShortcutOpen,
  ]);

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

  const handleShortcutDropIntent = useCallback((intent: ShortcutDropIntent) => {
    const sourceShortcuts = activePendingExtractDrag?.previewShortcuts ?? shortcuts;
    const outcome = applyShortcutDropIntent(sourceShortcuts, intent);
    if (outcome.kind === 'request-folder-merge') {
      requestRootFolderMerge({
        scenarioId: selectedScenarioId,
        activeShortcutId: outcome.activeShortcutId,
        targetShortcutId: outcome.targetShortcutId,
      });
      return;
    }
    if (outcome.kind === 'noop' || outcome.kind === 'unsupported-tree') return;
    if (outcome.kind !== 'update-shortcuts') return;

    setScenarioShortcuts((prev) => ({
      ...prev,
      [selectedScenarioId]: outcome.shortcuts,
    }));
    if (activePendingExtractDrag) {
      commitPendingFolderExtractPreview(outcome.shortcuts);
    }
    markShortcutStateDirty();
  }, [
    commitPendingFolderExtractPreview,
    markShortcutStateDirty,
    requestRootFolderMerge,
    selectedScenarioId,
    setScenarioShortcuts,
    shortcuts,
  ]);

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
    flushSync(() => {
      startFolderExtractDrag(payload, {
        onCloseFolderOverlay: () => {
          folderTransitionController.clearImmediately();
        },
      });
    });
  }, [folderTransitionController, startFolderExtractDrag]);

  const handleRootShortcutDragStart = useCallback(() => {
    markRootShortcutDragStart();
  }, [markRootShortcutDragStart]);

  const handleRootShortcutDragEnd = useCallback(() => {
    markRootShortcutDragEnd();
  }, [markRootShortcutDragEnd]);

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
      completeFolderNameFlow();
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
    completeFolderNameFlow();
  }, [
    completeFolderNameFlow,
    editingFolderId,
    localDirtyRef,
    pendingRootFolderMerge,
    selectedScenarioId,
    setScenarioShortcuts,
    user,
  ]);

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
    let canceled = false;
    document.documentElement.setAttribute('data-accent-color', accentColorSetting);
    resolveAccentColorSelection(accentColorSetting, {
      wallpaperMode: effectiveWallpaperMode,
      bingWallpaper,
      customWallpaper,
      weatherCode,
      colorWallpaperId,
    }, {
      // Re-sample once the rendered wallpaper image finishes loading to avoid
      // caching a fallback color from an early decode/load race.
      forceImageResample: wallpaperImageReadyTick > 0,
      isDarkTheme,
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
    isDarkTheme,
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

  const syncController = useLeafTabSyncRuntimeController({
    t,
    language: i18n.language,
    apiUrl: API_URL,
    user,
    setIsAuthModalOpen,
    setAuthModalMode,
    setSettingsOpen,
    setWebdavDialogOpen,
    setCloudSyncConfigOpen,
    setLeafTabSyncDialogOpen,
    leafTabSyncDialogOpen,
    setWebdavEnableAfterConfigSave,
    setWebdavShowConnectionFields,
    setPendingWebdavEnableScopeKey,
    pendingWebdavEnableScopeKey,
    setSyncConfigBackTarget,
    setConfirmLegacyCloudMigrationOpen,
    legacyCloudMigrationResolverRef,
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    localDirtyRef,
    resetLocalShortcutsByRole,
    buildSyncablePreferencesSnapshot,
    applySyncablePreferencesSnapshot,
    stripWallpaperFromCloudSyncPreferences,
    mergeCloudSyncSnapshotWithLocalWallpaper,
    runLongTask,
    startLongTaskIndicator,
    updateLongTaskIndicator,
    finishLongTaskIndicator,
    clearLongTaskIndicator,
    isDragging,
  });
  const syncState = syncController.state;
  const syncActions = syncController.actions;

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
    syncActions.queueCloudLoginSync(username);
    if (typeof consent !== 'undefined') {
      setPrivacyConsent(consent as any);
      try { localStorage.setItem('privacy_consent', JSON.stringify(consent)); } catch {}
    }
  }, [handleLoginSuccess, setPrivacyConsent, syncActions]);
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

  const handleLogoutWithOptions = useCallback(async (options?: { clearLocal?: boolean }) => {
    const shouldClearLocal = options?.clearLocal === true;
    const syncTask = syncActions.syncLocalToCloudBeforeLogout();
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
  }, [
    handleLogout,
    localDirtyRef,
    resetLocalShortcutsByRole,
    scenarioModes,
    scenarioShortcuts,
    selectedScenarioId,
    syncActions,
  ]);
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
    syncActions.setExportBackupDialogOpen(false);
    syncActions.setImportConfirmOpen(false);
    syncActions.handleImportBackupDialogOpenChange(false);
    setWebdavDialogOpen(false);
    setCloudSyncConfigOpen(false);
    setWebdavEnableAfterConfigSave(false);
    setWebdavShowConnectionFields(false);
    setPendingWebdavEnableScopeKey(null);
    setSettingsOpen(true);
  }, [
    setSettingsOpen,
    syncActions,
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
  const [topNavIntroStep, setTopNavIntroStep] = useState<TopNavIntroStep | null>(null);
  const [topNavIntroCompleted, setTopNavIntroCompleted] = useState(() => {
    try {
      return localStorage.getItem(TOP_NAV_LAYOUT_INTRO_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const handleAdvanceTopNavIntro = useCallback(() => {
    setTopNavIntroStep((currentStep) => {
      if (currentStep === 'scenario') return 'sync';
      if (currentStep === 'sync') return 'settings';
      try {
        localStorage.setItem(TOP_NAV_LAYOUT_INTRO_SEEN_KEY, 'true');
      } catch {}
      setTopNavIntroCompleted(true);
      return null;
    });
  }, []);

  useEffect(() => {
    if (roleSelectorOpen || !initialRevealReady) return;
    if (displayMode !== 'fresh' && displayMode !== 'minimalist') return;
    if (topNavIntroStep !== null) return;

    try {
      if (localStorage.getItem(TOP_NAV_LAYOUT_INTRO_SEEN_KEY) === 'true') return;
    } catch {}

    const timer = window.setTimeout(() => {
      setTopNavIntroStep((currentStep) => currentStep ?? 'scenario');
    }, 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [displayMode, initialRevealReady, roleSelectorOpen, topNavIntroStep]);
  const topNavModeProps = useMemo(() => ({
    fadeOnIdle: true,
    hideWeather: true,
    onSettingsClick: handleOpenSettings,
    onSyncClick: () => setLeafTabSyncDialogOpen(true),
    syncStatus: syncState.topNavSyncStatus,
    onWeatherUpdate: setWeatherCode,
    reduceVisualEffects: visualEffectsPolicy.disableBackdropBlur,
    leftSlot: <ScenarioModeMenu {...scenarioMenuLayerProps} reduceVisualEffects={visualEffectsPolicy.disableBackdropBlur} />,
    introGuide: topNavIntroStep
      ? {
          step: topNavIntroStep,
          onAcknowledge: handleAdvanceTopNavIntro,
        }
      : null,
  }), [
    handleAdvanceTopNavIntro,
    handleOpenSettings,
    scenarioMenuLayerProps,
    setWeatherCode,
    topNavIntroStep,
    syncState.topNavSyncStatus,
    visualEffectsPolicy.disableBackdropBlur,
  ]);
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
    syncStatus: syncState.topNavSyncStatus,
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
    syncState.topNavSyncStatus,
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
    shortcuts: rootDisplayShortcuts,
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
    onRootDragStart: handleRootShortcutDragStart,
    onRootDragEnd: handleRootShortcutDragEnd,
    onGridContextMenu: handleGridContextMenu,
    externalDragSession: externalShortcutDragSession,
    onExternalDragSessionConsumed: (token: number) => {
      consumeExternalDragSession(token);
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
    rootDisplayShortcuts,
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
    handleRootShortcutDragStart,
    handleRootShortcutDragEnd,
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
    topNavIntroCompleted,
  }), [
    displayMode,
    is24Hour,
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
    topNavIntroCompleted,
    visualEffectsLevel,
  ]);
  const compactFolderOverlayProps = useMemo(() => ({
    ...shortcutEngineHostAdapter.compactFolderOverlayProps,
    displayMode,
  }), [displayMode, shortcutEngineHostAdapter.compactFolderOverlayProps]);
  const panoramicSurfaceRevealStyle: CSSProperties = {
    backgroundColor: initialRevealReady ? 'var(--background)' : 'var(--initial-reveal-surface)',
    transition: `background-color ${PANORAMIC_SURFACE_REVEAL_TIMING}`,
  };
  const shouldMountWallpaperSelector = useKeepMountedAfterFirstOpen(wallpaperSettingsOpen);
  const shouldMountUpdateDialog = !IS_STORE_BUILD && useKeepMountedAfterFirstOpen(updateDialogOpen);
  const shortcutExperienceRootProps = useShortcutExperienceRootProps({
    onEditShortcut: handleOpenShortcutEditor,
    onEditFolderShortcut: handleOpenFolderChildShortcutEditor,
    onDeleteFolderShortcut: handleDeleteFolderChildShortcut,
    onShortcutOpen: handleShortcutActivate,
    onCreateFolder: handleCreateFolderFromSelection,
    onPinSelectedShortcuts: handlePinSelectedShortcuts,
    onMoveSelectedShortcutsToScenario: handleMoveSelectedShortcutsToScenario,
    onMoveSelectedShortcutsToFolder: handleMoveSelectedShortcutsToFolder,
    onDissolveFolder: handleDissolveFolder,
    onSetFolderDisplayMode: handleSetFolderDisplayMode,
    homeInteractiveSurfaceVisible: !roleSelectorOpen,
    initialRevealReady,
    modeLayersVisible,
    modeFlags: displayModeFlags,
    showOverlayWallpaperLayer,
    wallpaperAnimatedLayerStyle,
    effectiveWallpaperMode,
    freshWeatherVideo,
    colorWallpaperGradient,
    effectiveOverlayWallpaperSrc,
    overlayBackgroundAlt,
    onOverlayImageReady: handleOverlayWallpaperReadyForRevealAndAccent,
    effectiveWallpaperMaskOpacity,
    topNavModeProps,
    homeMainContentBaseProps,
    shortcutGridBaseProps: shortcutEngineHostAdapter.rootGridProps,
    shortcutGridHeatZoneInspectorEnabled: gridHitInspectorVisible,
    shortcutGridHiddenShortcutId: pendingExtractHiddenShortcutId ?? overlayFolderId,
    wallpaperClockBaseProps,
    searchExperienceBaseProps,
    baseTimeAnimationEnabled: effectiveTimeAnimationEnabled,
    freezeDynamicWallpaperBase: visualEffectsPolicy.freezeDynamicWallpaper || isDynamicWallpaperIdleFrozen,
    folderTransitionController,
    compactFolderOverlayBaseProps: compactFolderOverlayProps,
    folderNameDialogOpen,
    setFolderNameDialogOpen,
    closeFolderNameDialog,
    folderNameDialogTitle,
    folderNameDialogDescription,
    folderNameDialogInitialName,
    onFolderNameSubmit: handleSaveFolderName,
  });
  const shortcutAppDialogsRootProps = {
    nonSyncExternalDialogActivity:
      isAuthModalOpen
      || settingsOpen
      || searchSettingsOpen
      || shortcutGuideOpen
      || shortcutIconSettingsOpen
      || adminModalOpen
      || aboutModalOpen
      || webdavDialogOpen
      || cloudSyncConfigOpen
      || confirmDisableConsentOpen,
    authDialog: {
      isAuthModalOpen,
      onOpenChange: handleAuthModalOpenChange,
      onLoginSuccess,
      setAuthModalMode,
      apiServer,
      onApiServerChange: setApiServer,
      customApiUrl,
      customApiName,
      defaultApiBase,
      authModalMode,
      linkedUsername: user,
    },
    settingsDialogs: {
      settingsOpen,
      setSettingsOpen,
      username: user,
      onLogout: requestLogoutConfirmation,
      shortcutsCount: totalShortcuts,
      displayMode,
      onDisplayModeChange: setDisplayMode,
      shortcutIconCornerRadius,
      onShortcutIconCornerRadiusChange: setShortcutIconCornerRadius,
      shortcutIconScale,
      onShortcutIconScaleChange: setShortcutIconScale,
      shortcutIconAppearance,
      onShortcutIconAppearanceChange: setShortcutIconAppearance,
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
      setWallpaperSettingsOpen,
      privacyConsent,
      onPrivacyConsentChange: handlePrivacySwitchChange,
      onOpenAdminModal: handleOpenAdminModal,
      onOpenAboutModal: handleOpenAboutModal,
      setLeafTabSyncDialogOpen,
      setShortcutGuideOpen,
    },
    utilityDialogs: {
      searchSettingsOpen,
      setSearchSettingsOpen,
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
      shortcutGuideOpen,
      setShortcutGuideOpen,
      shortcutIconSettingsOpen,
      setShortcutIconSettingsOpen,
      adminModalOpen,
      setAdminModalOpen,
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
      aboutModalOpen,
      setAboutModalOpen,
      defaultAboutTab: aboutModalDefaultTab,
    },
    syncProviderDialogs: {
      webdavDialogOpen,
      onBackToParent: handleBackFromSyncProviderConfig,
      setWebdavDialogOpen,
      enableAfterSave: webdavEnableAfterConfigSave,
      showConnectionFields: webdavShowConnectionFields,
      setWebdavEnableAfterConfigSave,
      setWebdavShowConnectionFields,
      setPendingWebdavEnableScopeKey,
      setConfirmDisableWebdavSyncOpen,
      cloudSyncConfigOpen,
      setCloudSyncConfigOpen,
      onLinkGoogle: openGoogleLinkAuthModal,
      onCloudSyncLogout: requestLogoutConfirmation,
    },
    consentDialogs: {
      confirmDisableConsentOpen,
      setConfirmDisableConsentOpen,
      onPrivacyConsent: handlePrivacyConsent,
    },
  };
  const shortcutSyncDialogsRootProps = {
    leafTabSyncDialogOpen,
    setLeafTabSyncDialogOpen,
    setSyncConfigBackTarget,
    user,
  };

  return (
    <ShortcutAppProvider value={shortcutApp}>
      <LeafTabSyncProvider value={syncController}>
        <div
          ref={pageFocusRef}
          tabIndex={-1}
          className={`${showOverlayWallpaperLayer ? 'bg-transparent' : 'bg-background'} relative w-full min-h-screen flex flex-col items-center overflow-x-hidden overflow-y-auto pb-[24px] focus:outline-none`}
          style={panoramicSurfaceRevealStyle}
        >
          <ShortcutExperienceRoot {...shortcutExperienceRootProps} />
          {shouldMountWallpaperSelector ? (
            <Suspense fallback={null}>
              <LazyWallpaperSelector
                {...wallpaperSelectorLayerProps}
                mode={effectiveWallpaperMode}
                hideWeather={firefox}
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
              void syncActions.handleDisableWebdavSync();
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
              syncActions.resolveLegacyCloudMigrationPrompt(false);
            }}
            title={t('settings.backup.cloud.legacyMigrationTitle', { defaultValue: '检测到旧版云同步数据' })}
            description={t('settings.backup.cloud.legacyMigrationDesc', {
              defaultValue: '检测到这个账号里还有旧版未加密的快捷方式云数据。继续后需要先设置同步口令，LeafTab 才会把这批旧数据迁移到新版加密同步里；在你确认之前，旧数据不会被删除。',
            })}
            cancelText={t('common.cancel', { defaultValue: '取消' })}
            confirmText={t('settings.backup.cloud.startMigration', { defaultValue: '继续迁移' })}
            onConfirm={() => {
              syncActions.resolveLegacyCloudMigrationPrompt(true);
            }}
          />
          <ShortcutAppDialogsRoot {...shortcutAppDialogsRootProps} />
          <ShortcutSyncDialogsRoot {...shortcutSyncDialogsRootProps} />
          <FolderTransitionDocumentEffects controller={folderTransitionController} />
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
                wallpaperMode={effectiveWallpaperMode}
                bingWallpaper={bingWallpaper}
                customWallpaper={customWallpaper}
                weatherCode={weatherCode}
                colorWallpaperId={colorWallpaperId}
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
      </LeafTabSyncProvider>
    </ShortcutAppProvider>
  );
}
