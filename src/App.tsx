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
import { resolveDynamicWallpaperById } from '@/components/wallpaper/dynamicWallpapers';
import type { AboutLeafTabModalTab } from '@/components/AboutLeafTabDialog';
import { weatherVideoMap, sunnyWeatherVideo } from '@/components/wallpaper/weatherWallpapers';
import type { ShortcutFolderOpeningSourceSnapshot } from '@/components/folderTransition/useFolderTransitionController';
import {
  useFolderTransitionActiveFolderId,
  useFolderTransitionController,
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
  pruneEmptyShortcutFolders,
} from '@/utils/shortcutFolders';
import { hasShortcutUrlConflict } from '@/utils/shortcutIdentity';
import { normalizeShortcutIconColor } from '@/utils/shortcutIconPreferences';
import { useShortcutExperienceRootProps } from '@/features/appShell/useShortcutExperienceRootProps';
import { ShortcutAppProvider } from '@/features/shortcuts/app/ShortcutAppContext';
import { ShortcutAppDialogsRoot } from '@/features/shortcuts/app/ShortcutAppDialogsRoot';
import { ShortcutExperienceRoot } from '@/features/shortcuts/app/ShortcutExperienceRoot';
import { ShortcutSyncDialogsRoot } from '@/features/shortcuts/app/ShortcutSyncDialogsRoot';
import { useShortcutAppContextValue } from '@/features/shortcuts/app/useShortcutAppContextValue';
import { createLeaftabGridEngineHostAdapter } from '@/features/shortcuts/gridEngine/leaftabGridEngineHostAdapter';
import { useShortcutWorkspaceController } from '@/features/shortcuts/workspace/useShortcutWorkspaceController';
import { WallpaperBackdropProvider } from '@/components/wallpaper/WallpaperBackdropContext';
import { LeafTabSyncProvider } from '@/features/sync/app/LeafTabSyncContext';
import { useLeafTabSyncRuntimeController } from '@/features/sync/app/useLeafTabSyncRuntimeController';
import type { SearchExperienceProps, SlashCommandDialogTarget } from '@/components/search/SearchExperience';
import { recordRecentShortcutAddition } from '@/utils/recentShortcutAdditions';
import {
  LIMESTART_GLOBAL_REVEAL_MASK_COLOR,
  LIMESTART_GLOBAL_REVEAL_MASK_FADE_MS,
  LIMESTART_GLOBAL_REVEAL_MASK_HOLD_MS,
  LIMESTART_GLOBAL_REVEAL_UI_SCALE,
  REVEAL_EASE_OUT_CUBIC,
} from '@/config/animationTokens';

type FolderOverlaySnapshotRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const TOP_NAV_LAYOUT_INTRO_SEEN_KEY = 'leaftab_top_nav_layout_intro_seen_v1';
const BOOT_SHIELD_HANDOFF_REMOVE_MS = 260;

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

function createShortcutId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `sht_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
const DYNAMIC_WALLPAPER_IDLE_FREEZE_MS = 18 * 1000;

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
  const [cloudSyncConfigOpen, setCloudSyncConfigOpen] = useState(false);
  const [syncConfigBackTarget, setSyncConfigBackTarget] = useState<'settings' | 'sync-center'>('settings');
  const [webdavDialogOpen, setWebdavDialogOpen] = useState(false);
  const [webdavEnableAfterConfigSave, setWebdavEnableAfterConfigSave] = useState(false);
  const [webdavShowConnectionFields, setWebdavShowConnectionFields] = useState(false);
  const [pendingWebdavEnableScopeKey, setPendingWebdavEnableScopeKey] = useState<string | null>(null);
  const [leafTabSyncDialogOpen, setLeafTabSyncDialogOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [importSourceDialogOpen, setImportSourceDialogOpen] = useState(false);
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
  const [pendingShortcutShineId, setPendingShortcutShineId] = useState<string | null>(null);
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
    searchBarPosition, setSearchBarPosition,
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
  const [globalRevealMaskVisible, setGlobalRevealMaskVisible] = useState(true);
  const [globalRevealMaskFading, setGlobalRevealMaskFading] = useState(false);
  const initialRevealReady = useInitialReveal(visualEffectsPolicy.disableInitialRevealMotion);
  const [manualHomeRevealReady, setManualHomeRevealReady] = useState(true);
  const [manualHomeRevealNonce, setManualHomeRevealNonce] = useState(0);
  const effectiveInitialRevealReady = initialRevealReady && manualHomeRevealReady;

  const replayHomeEntryReveal = useCallback(() => {
    setGlobalRevealMaskVisible(true);
    setGlobalRevealMaskFading(false);
    setManualHomeRevealReady(false);
    setManualHomeRevealNonce((current) => current + 1);
  }, []);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const bootShield = document.getElementById('boot-shield');
    if (!bootShield) return;

    let handoffFrame = window.requestAnimationFrame(() => {
      bootShield.style.opacity = '0';
    });
    const cleanupTimer = window.setTimeout(() => {
      bootShield.remove();
    }, BOOT_SHIELD_HANDOFF_REMOVE_MS);

    return () => {
      window.cancelAnimationFrame(handoffFrame);
      window.clearTimeout(cleanupTimer);
    };
  }, []);
  useEffect(() => {
    if (!effectiveInitialRevealReady) {
      setGlobalRevealMaskVisible(true);
      setGlobalRevealMaskFading(false);
      return;
    }

    if (visualEffectsPolicy.disableInitialRevealMotion) {
      setGlobalRevealMaskFading(true);
      const cleanupTimer = window.setTimeout(() => {
        setGlobalRevealMaskVisible(false);
      }, 24);
      return () => {
        window.clearTimeout(cleanupTimer);
      };
    }

    const fadeTimer = window.setTimeout(() => {
      setGlobalRevealMaskFading(true);
    }, LIMESTART_GLOBAL_REVEAL_MASK_HOLD_MS);
    const cleanupTimer = window.setTimeout(() => {
      setGlobalRevealMaskVisible(false);
    }, LIMESTART_GLOBAL_REVEAL_MASK_HOLD_MS + LIMESTART_GLOBAL_REVEAL_MASK_FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [effectiveInitialRevealReady, visualEffectsPolicy.disableInitialRevealMotion]);
  useEffect(() => {
    if (manualHomeRevealNonce === 0) return;
    if (visualEffectsPolicy.disableInitialRevealMotion) {
      setManualHomeRevealReady(true);
      return;
    }

    let firstFrameId = 0;
    let secondFrameId = 0;
    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setManualHomeRevealReady(true);
      });
    });

    return () => {
      if (firstFrameId) window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [manualHomeRevealNonce, visualEffectsPolicy.disableInitialRevealMotion]);
  const displayModeFlags = useMemo(() => getDisplayModeLayoutFlags(displayMode), [displayMode]);
  const responsiveLayout = useResponsiveLayout();
  const globalRevealMaskStyle = useMemo<CSSProperties>(() => ({
    opacity: globalRevealMaskFading ? 0 : 1,
    backgroundColor: LIMESTART_GLOBAL_REVEAL_MASK_COLOR,
    transition: visualEffectsPolicy.disableInitialRevealMotion
      ? undefined
      : `opacity ${LIMESTART_GLOBAL_REVEAL_MASK_FADE_MS}ms linear`,
    willChange: globalRevealMaskFading ? undefined : 'opacity',
  }), [globalRevealMaskFading, visualEffectsPolicy.disableInitialRevealMotion]);
  const globalRevealUiStyle = useMemo<CSSProperties>(() => {
    const revealScale = visualEffectsPolicy.disableInitialRevealMotion
      ? 1
      : (globalRevealMaskVisible && !globalRevealMaskFading ? LIMESTART_GLOBAL_REVEAL_UI_SCALE : 1);

    return {
      transform: `translate3d(0, 0, 0) scale3d(${revealScale}, ${revealScale}, 1)`,
      transformOrigin: 'center center',
      transition: visualEffectsPolicy.disableInitialRevealMotion
        ? undefined
        : `transform ${LIMESTART_GLOBAL_REVEAL_MASK_FADE_MS}ms ${REVEAL_EASE_OUT_CUBIC}`,
      willChange: globalRevealMaskVisible ? 'transform' : undefined,
      backfaceVisibility: 'hidden',
    };
  }, [
    globalRevealMaskFading,
    globalRevealMaskVisible,
    visualEffectsPolicy.disableInitialRevealMotion,
  ]);

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

    const freezeNow = () => {
      clearIdleTimer();
      setIsDynamicWallpaperIdleFrozen(true);
    };

    const markActive = () => {
      if (document.hidden || !document.hasFocus()) {
        freezeNow();
        return;
      }
      setIsDynamicWallpaperIdleFrozen(false);
      scheduleIdleFreeze();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        freezeNow();
        return;
      }
      markActive();
    };

    markActive();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', freezeNow);
    window.addEventListener('focus', markActive);
    window.addEventListener('pagehide', freezeNow);
    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('wheel', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });
    window.addEventListener('keydown', markActive, true);

    return () => {
      clearIdleTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', freezeNow);
      window.removeEventListener('focus', markActive);
      window.removeEventListener('pagehide', freezeNow);
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
    {
      onShortcutCreated: (shortcut) => {
        setPendingShortcutShineId(shortcut.id);
        recordRecentShortcutAddition(shortcut.url);
      },
    },
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
    setPendingShortcutShineId((current) => (current === shortcut.id ? null : current));
    handleShortcutOpen(shortcut);
  }, [
    captureFolderOpeningSourceSnapshot,
    ensureFolderOverlayReady,
    folderTransitionController,
    handleShortcutOpen,
    setPendingShortcutShineId,
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

  const handleEditShortcutSearchAction = useCallback((target: {
    shortcut: Shortcut;
    index: number;
    parentFolderId?: string | null;
  }) => {
    if (target.parentFolderId) {
      handleOpenFolderChildShortcutEditor(target.parentFolderId, target.shortcut);
      return;
    }
    handleOpenShortcutEditor(target.index, target.shortcut);
  }, [handleOpenFolderChildShortcutEditor, handleOpenShortcutEditor]);

  const handleDeleteShortcutSearchAction = useCallback((target: {
    shortcut: Shortcut;
    index: number;
    parentFolderId?: string | null;
  }) => {
    if (target.parentFolderId) {
      handleDeleteFolderChildShortcut(target.parentFolderId, target.shortcut);
      return;
    }
    setSelectedShortcut({ index: target.index, shortcut: target.shortcut });
    setShortcutDeleteOpen(true);
  }, [handleDeleteFolderChildShortcut, setSelectedShortcut, setShortcutDeleteOpen]);

  const handleAddShortcutSearchAction = useCallback((target: {
    title: string;
    url: string;
    icon?: string;
  }) => {
    const normalizedUrl = target.url.trim();
    if (!normalizedUrl) return;

    if (hasShortcutUrlConflict(shortcuts, normalizedUrl)) {
      toast.error(t('shortcutModal.errors.duplicateUrl', {
        defaultValue: '该网站已存在快捷方式',
      }), {
        description: t('shortcutModal.errors.duplicateUrlDesc', {
          defaultValue: '同一网站仅保留一个快捷方式，请检查网址后重试',
        }),
      });
      return;
    }

    const nextShortcut: Shortcut = {
      id: createShortcutId(),
      title: target.title.trim() || normalizedUrl,
      url: normalizedUrl,
      icon: target.icon || '',
      useOfficialIcon: true,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      officialIconColorOverride: false,
      iconColor: normalizeShortcutIconColor(''),
    };

    setScenarioShortcuts((prev) => ({
      ...prev,
      [selectedScenarioId]: [nextShortcut, ...(prev[selectedScenarioId] || [])],
    }));
    markShortcutStateDirty();
    setPendingShortcutShineId(nextShortcut.id);
    recordRecentShortcutAddition(nextShortcut.url);
    toast.success(t('search.shortcutAdded', {
      defaultValue: '已添加为快捷方式',
    }));
  }, [
    markShortcutStateDirty,
    selectedScenarioId,
    setPendingShortcutShineId,
    setScenarioShortcuts,
    shortcuts,
    t,
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
        [selectedScenarioId]: pruneEmptyShortcutFolders(nextShortcuts),
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
    customWallpaperGallery,
    appendCustomWallpapers,
    wallpaperRotationSettings,
    setWallpaperRotationInterval,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    colorWallpaperId, setColorWallpaperId,
    dynamicWallpaperId, setDynamicWallpaperId,
    wallpaperMaskOpacity, setWallpaperMaskOpacity,
    darkModeAutoDimWallpaperEnabled, setDarkModeAutoDimWallpaperEnabled,
  } = useWallpaper();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const effectiveWallpaperMode = firefox && wallpaperMode === 'weather' ? 'bing' : wallpaperMode;
  const videoWallpaperMode = effectiveWallpaperMode === 'weather' || effectiveWallpaperMode === 'dynamic';
  const dynamicWallpaperMaskDisabled = effectiveWallpaperMode === 'dynamic';
  const effectiveWallpaperMaskOpacity = useMemo(() => (
    dynamicWallpaperMaskDisabled
      ? 0
      :
    resolveWallpaperMaskOpacityWithDarkModeAutoDim({
      userOpacity: wallpaperMaskOpacity,
      isDarkTheme,
      autoDimEnabled: darkModeAutoDimWallpaperEnabled,
    })
  ), [darkModeAutoDimWallpaperEnabled, dynamicWallpaperMaskDisabled, isDarkTheme, wallpaperMaskOpacity]);
  const freshWeatherVideo = weatherVideoMap[weatherCode] || sunnyWeatherVideo;
  const colorWallpaperGradient = getColorWallpaperGradient(colorWallpaperId);
  const selectedDynamicWallpaper = resolveDynamicWallpaperById(dynamicWallpaperId);
  const dynamicWallpaperVideoSrc = selectedDynamicWallpaper.src;
  const dynamicWallpaperPosterSrc = selectedDynamicWallpaper.posterSrc;
  const dynamicWallpaperPlaybackRate = selectedDynamicWallpaper.playbackRate ?? 0.7;
  const freshWallpaperSrc = effectiveWallpaperMode === 'custom'
    ? (customWallpaper || '')
    : effectiveWallpaperMode === 'bing'
      ? bingWallpaper
      : (bingWallpaper || imgImage);
  const fallbackWallpaperBackdropSrc = effectiveWallpaperMode === 'custom'
    ? (customWallpaper || imgImage)
    : effectiveWallpaperMode === 'dynamic'
      ? dynamicWallpaperPosterSrc
      : effectiveWallpaperMode === 'bing'
        ? (bingWallpaper || imgImage)
        : imgImage;

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
      dynamicWallpaperSrc: dynamicWallpaperVideoSrc,
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
    dynamicWallpaperVideoSrc,
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
      searchBarPosition: 'bottom',
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
      wallpaperRotationSettings,
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
    wallpaperRotationSettings,
  ]);

  const stripWallpaperFromCloudSyncPreferences = useCallback((preferences: SyncablePreferences): SyncablePreferences => {
    return normalizeSyncablePreferences({
      ...preferences,
      wallpaperMode: null,
      wallpaperMaskOpacity: 10,
      darkModeAutoDimWallpaperEnabled: true,
      colorWallpaperId: DEFAULT_COLOR_WALLPAPER_ID,
      wallpaperRotationSettings: {
        dynamic: 'off',
        color: 'off',
        custom: 'off',
      },
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
          wallpaperRotationSettings: localPreferences.wallpaperRotationSettings,
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
    setWallpaperRotationInterval('dynamic', normalized.wallpaperRotationSettings.dynamic);
    setWallpaperRotationInterval('color', normalized.wallpaperRotationSettings.color);
    setWallpaperRotationInterval('custom', normalized.wallpaperRotationSettings.custom);
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
    setWallpaperRotationInterval,
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
    setImportSourceDialogOpen(false);
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
    setImportSourceDialogOpen,
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
  const modeLayersVisible = !roleSelectorOpen;
  const showOverlayWallpaperLayer = modeLayersVisible && displayModeFlags.showOverlayBackground;
  const overlayBackgroundImageSrc = displayMode === 'fresh'
    ? (effectiveWallpaperMode === 'dynamic' ? dynamicWallpaperVideoSrc : freshWallpaperSrc)
    : effectiveWallpaperMode === 'custom'
      ? (customWallpaper || '')
      : effectiveWallpaperMode === 'bing'
        ? bingWallpaper
        : effectiveWallpaperMode === 'dynamic'
          ? dynamicWallpaperVideoSrc
        : (bingWallpaper || imgImage);
  const usesImageWallpaperLayer = effectiveWallpaperMode !== 'weather' && effectiveWallpaperMode !== 'dynamic' && effectiveWallpaperMode !== 'color';
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
    hasWeatherVisual: (effectiveWallpaperMode === 'weather' && Boolean(freshWeatherVideo))
      || (effectiveWallpaperMode === 'dynamic' && Boolean(dynamicWallpaperVideoSrc)),
    disableRevealAnimation: visualEffectsPolicy.disableWallpaperRevealMotion,
  });
  const handleOverlayWallpaperReadyForRevealAndAccent = useCallback(() => {
    handleOverlayImageReady();
    setWallpaperImageReadyTick((prev) => prev + 1);
  }, [handleOverlayImageReady]);
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);
  const handleOpenSlashCommandDialog = useCallback((target: SlashCommandDialogTarget) => {
    setSettingsOpen(false);
    setSearchSettingsOpen(false);
    setShortcutGuideOpen(false);
    setShortcutIconSettingsOpen(false);
    setWallpaperSettingsOpen(false);
    setAdminModalOpen(false);
    setAboutModalOpen(false);

    if (target === 'settings-home') {
      setSettingsOpen(true);
      return;
    }
    if (target === 'search-settings') {
      setSearchSettingsOpen(true);
      return;
    }
    if (target === 'shortcut-guide') {
      setShortcutGuideOpen(true);
      return;
    }
    if (target === 'shortcut-icon-settings') {
      setShortcutIconSettingsOpen(true);
      return;
    }
    if (target === 'wallpaper-settings') {
      setWallpaperSettingsOpen(true);
      return;
    }
    if (target === 'sync-center') {
      setLeafTabSyncDialogOpen(true);
      return;
    }
    if (target === 'about') {
      setAboutModalDefaultTab('about');
      setAboutModalOpen(true);
    }
  }, [
    setAboutModalDefaultTab,
    setLeafTabSyncDialogOpen,
    setSettingsOpen,
    setSearchSettingsOpen,
    setShortcutGuideOpen,
    setShortcutIconSettingsOpen,
    setWallpaperSettingsOpen,
    setAdminModalOpen,
    setAboutModalOpen,
  ]);
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
    dynamicWallpaperId,
    onDynamicWallpaperIdChange: setDynamicWallpaperId,
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
    dynamicWallpaperId,
    effectiveWallpaperMaskOpacity,
    refreshBingWallpaper,
    setDarkModeAutoDimWallpaperEnabled,
    setColorWallpaperId,
    setDynamicWallpaperId,
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
    if (roleSelectorOpen || !effectiveInitialRevealReady) return;
    if (displayMode !== 'fresh' && displayMode !== 'minimalist') return;
    if (topNavIntroStep !== null) return;

    try {
      if (localStorage.getItem(TOP_NAV_LAYOUT_INTRO_SEEN_KEY) === 'true') return;
    } catch {}

    const timer = window.setTimeout(() => {
      setTopNavIntroStep((currentStep) => currentStep ?? 'scenario');
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [displayMode, effectiveInitialRevealReady, roleSelectorOpen, topNavIntroStep]);
  const topNavModeProps = useMemo(() => ({
    fadeOnIdle: true,
    hideWeather: true,
    onSettingsClick: handleOpenSettings,
    onSyncClick: () => setLeafTabSyncDialogOpen(true),
    syncStatus: syncState.topNavSyncStatus,
    onWeatherUpdate: setWeatherCode,
    reduceVisualEffects: visualEffectsPolicy.disableBackdropBlur || videoWallpaperMode,
    leftSlot: <ScenarioModeMenu {...scenarioMenuLayerProps} reduceVisualEffects={visualEffectsPolicy.disableBackdropBlur || videoWallpaperMode} />,
    introGuide: topNavIntroStep && !videoWallpaperMode
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
    videoWallpaperMode,
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
    dynamicWallpaperVideoSrc,
    dynamicWallpaperPosterSrc,
    dynamicWallpaperPlaybackRate,
    wallpaperMaskOpacity: effectiveWallpaperMaskOpacity,
    timeFont,
    onTimeFontChange: setTimeFont,
    layout: responsiveLayout,
    reduceTopControlsEffects: visualEffectsPolicy.disableBackdropBlur || videoWallpaperMode,
  }), [
    bingWallpaper,
    colorWallpaperId,
    customWallpaperLoaded,
    customWallpaper,
    dynamicWallpaperPosterSrc,
    dynamicWallpaperPlaybackRate,
    dynamicWallpaperVideoSrc,
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
    videoWallpaperMode,
    visualEffectsPolicy.disableBackdropBlur,
    effectiveWallpaperMaskOpacity,
    effectiveWallpaperMode,
    weatherCode,
  ]);
  const searchExperienceBaseProps = useMemo<Omit<SearchExperienceProps, 'inputRef' | 'onInteractionStateChange'>>(() => ({
    openInNewTab,
    shortcuts,
    tabSwitchSearchEngine,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchRotatingPlaceholderEnabled,
    disablePlaceholderAnimation: visualEffectsLevel === 'low' || videoWallpaperMode,
    lightweightSearchUi: visualEffectsLevel === 'low' || videoWallpaperMode,
    searchHeight: responsiveLayout.searchHeight,
    searchInputFontSize: responsiveLayout.searchInputFontSize,
    searchHorizontalPadding: responsiveLayout.searchHorizontalPadding,
    searchActionSize: responsiveLayout.searchActionSize,
    currentWallpaperMode: effectiveWallpaperMode,
    currentColorWallpaperId: colorWallpaperId,
    darkModeAutoDimWallpaperEnabled,
    currentShortcutIconAppearance: shortcutIconAppearance,
    currentShortcutIconCornerRadius: shortcutIconCornerRadius,
    currentShortcutIconScale: shortcutIconScale,
    shortcutShowTitleEnabled: shortcutCompactShowTitle,
    currentShortcutGridColumns: normalizedGridColumns,
    currentVisualEffectsLevel: visualEffectsLevel,
    preventDuplicateNewTab,
    showTime,
    activeSyncProvider: user && syncState.cloudSyncEnabled
      ? 'cloud'
      : syncState.leafTabWebdavEnabled
        ? 'webdav'
        : 'none',
    onEditShortcutAction: handleEditShortcutSearchAction,
    onDeleteShortcutAction: handleDeleteShortcutSearchAction,
    onAddShortcutAction: handleAddShortcutSearchAction,
    onSetShowTimeAction: setShowTime,
    onSetWallpaperModeAction: setWallpaperMode,
    onSetShortcutIconAppearanceAction: setShortcutIconAppearance,
    onSetSearchTabSwitchEngineAction: setTabSwitchSearchEngine,
    onSetSearchPrefixEnabledAction: setSearchPrefixEnabled,
    onSetSearchSiteDirectEnabledAction: setSearchSiteDirectEnabled,
    onSetSearchSiteShortcutEnabledAction: setSearchSiteShortcutEnabled,
    onSetSearchAnyKeyCaptureEnabledAction: setSearchAnyKeyCaptureEnabled,
    onSetSearchCalculatorEnabledAction: setSearchCalculatorEnabled,
    onSetSearchRotatingPlaceholderEnabledAction: setSearchRotatingPlaceholderEnabled,
    onSetShortcutShowTitleAction: setShortcutCompactShowTitle,
    onSetPreventDuplicateNewTabAction: handlePreventDuplicateNewTabChange,
    onSetDarkModeAutoDimWallpaperAction: setDarkModeAutoDimWallpaperEnabled,
    onOpenSlashCommandDialog: handleOpenSlashCommandDialog,
  }), [
    darkModeAutoDimWallpaperEnabled,
    colorWallpaperId,
    effectiveWallpaperMode,
    handleAddShortcutSearchAction,
    handleDeleteShortcutSearchAction,
    handleEditShortcutSearchAction,
    handlePreventDuplicateNewTabChange,
    handleOpenSlashCommandDialog,
    normalizedGridColumns,
    openInNewTab,
    preventDuplicateNewTab,
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
    setSearchAnyKeyCaptureEnabled,
    setSearchCalculatorEnabled,
    setSearchPrefixEnabled,
    setSearchRotatingPlaceholderEnabled,
    setSearchSiteDirectEnabled,
    setSearchSiteShortcutEnabled,
    setShortcutCompactShowTitle,
    setShortcutIconAppearance,
    setTabSwitchSearchEngine,
    setDarkModeAutoDimWallpaperEnabled,
    setShowTime,
    setWallpaperMode,
    shortcutCompactShowTitle,
    shortcutIconAppearance,
    shortcutIconCornerRadius,
    shortcutIconScale,
    showTime,
    syncState.cloudSyncEnabled,
    syncState.leafTabWebdavEnabled,
    tabSwitchSearchEngine,
    user,
    videoWallpaperMode,
    visualEffectsLevel,
  ]);
  const shortcutEngineHostAdapter = useMemo(() => createLeaftabGridEngineHostAdapter({
    scenarioId: selectedScenarioId,
    shortcuts: rootDisplayShortcuts,
    surfaceStructureShortcuts: shortcuts,
    containerHeight: shortcutsAreaHeight,
    bottomInset: 0,
    gridColumns: normalizedGridColumns,
    minRows: minShortcutRows,
    layoutDensity: responsiveLayout.density,
    compactIconSize: scaledCompactShortcutSize,
    compactTitleFontSize: responsiveLayout.compactShortcutTitleSize,
    compactShowTitle: shortcutCompactShowTitle,
    highlightedShortcutId: pendingShortcutShineId,
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
    pendingShortcutShineId,
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
  const compactFolderOverlayProps = shortcutEngineHostAdapter.compactFolderOverlayProps;
  const shouldMountWallpaperSelector = useKeepMountedAfterFirstOpen(wallpaperSettingsOpen);
  const shouldMountUpdateDialog = !IS_STORE_BUILD && useKeepMountedAfterFirstOpen(updateDialogOpen);
  const shortcutExperienceRootProps = useShortcutExperienceRootProps({
    onEditShortcut: handleOpenShortcutEditor,
    onEditFolderShortcut: handleOpenFolderChildShortcutEditor,
    onDeleteFolderShortcut: handleDeleteFolderChildShortcut,
    onShortcutOpen: handleShortcutActivate,
    onDrawerFolderChildShortcutContextMenu: handleFolderChildShortcutContextMenu,
    onCreateFolder: handleCreateFolderFromSelection,
    onPinSelectedShortcuts: handlePinSelectedShortcuts,
    onMoveSelectedShortcutsToScenario: handleMoveSelectedShortcutsToScenario,
    onMoveSelectedShortcutsToFolder: handleMoveSelectedShortcutsToFolder,
    onDissolveFolder: handleDissolveFolder,
    onSetFolderDisplayMode: handleSetFolderDisplayMode,
    homeInteractiveSurfaceVisible: !roleSelectorOpen,
    initialRevealReady: effectiveInitialRevealReady,
    modeLayersVisible,
    modeFlags: displayModeFlags,
    showOverlayWallpaperLayer,
    wallpaperAnimatedLayerStyle,
    effectiveWallpaperMode,
    freshWeatherVideo,
    dynamicWallpaperVideoSrc,
    dynamicWallpaperPosterSrc,
    dynamicWallpaperPlaybackRate,
    colorWallpaperGradient,
    effectiveOverlayWallpaperSrc,
    overlayBackgroundAlt,
    onOverlayImageReady: handleOverlayWallpaperReadyForRevealAndAccent,
    effectiveWallpaperMaskOpacity,
    topNavModeProps,
    homeMainContentBaseProps,
    shortcutGridBaseProps: shortcutEngineHostAdapter.rootGridProps,
    shortcutGridHeatZoneInspectorEnabled: gridHitInspectorVisible,
    shortcutGridHiddenShortcutId: pendingExtractHiddenShortcutId,
    shortcutGridOpenFolderPreviewId: openFolderId,
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
  const nonSyncExternalDialogActivity = (
    isAuthModalOpen
    || settingsOpen
    || importSourceDialogOpen
    || searchSettingsOpen
    || shortcutGuideOpen
    || shortcutIconSettingsOpen
    || adminModalOpen
    || aboutModalOpen
    || webdavDialogOpen
    || cloudSyncConfigOpen
    || confirmDisableConsentOpen
  );
  const shortcutAppDialogsAuthDialog = useMemo(() => ({
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
  }), [
    apiServer,
    authModalMode,
    customApiName,
    customApiUrl,
    defaultApiBase,
    handleAuthModalOpenChange,
    isAuthModalOpen,
    onLoginSuccess,
    setAuthModalMode,
    user,
  ]);
  const shortcutAppDialogsSettingsDialogs = useMemo(() => ({
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
    dynamicWallpaperSrc: dynamicWallpaperVideoSrc,
    onColorWallpaperIdChange: setColorWallpaperId,
    wallpaperMaskOpacity,
    onWallpaperMaskOpacityChange: setWallpaperMaskOpacity,
    setWallpaperSettingsOpen,
    privacyConsent,
    onPrivacyConsentChange: handlePrivacySwitchChange,
    onOpenAdminModal: handleOpenAdminModal,
    onOpenAboutModal: handleOpenAboutModal,
    setImportSourceDialogOpen,
    setLeafTabSyncDialogOpen,
    setShortcutGuideOpen,
  }), [
    bingWallpaper,
    colorWallpaperId,
    customWallpaper,
    displayMode,
    effectiveWallpaperMode,
    handleOpenAboutModal,
    handleOpenAdminModal,
    handleOpenSearchSettings,
    handleOpenShortcutIconSettings,
    handlePreventDuplicateNewTabChange,
    handlePrivacySwitchChange,
    handleShortcutGridColumnsChange,
    normalizedGridColumns,
    openInNewTab,
    preventDuplicateNewTab,
    privacyConsent,
    requestLogoutConfirmation,
    setColorWallpaperId,
    setDisplayMode,
    setImportSourceDialogOpen,
    setLeafTabSyncDialogOpen,
    setOpenInNewTab,
    setShortcutGuideOpen,
    setSettingsOpen,
    setShortcutCompactShowTitle,
    setShortcutIconAppearance,
    setShortcutIconCornerRadius,
    setShortcutIconScale,
    setShowTime,
    setVisualEffectsLevel,
    setWallpaperMode,
    setWallpaperMaskOpacity,
    setWallpaperSettingsOpen,
    setCustomWallpaper,
    shortcutCompactShowTitle,
    shortcutIconAppearance,
    shortcutIconCornerRadius,
    shortcutIconScale,
    settingsOpen,
    showTime,
    totalShortcuts,
    user,
    visualEffectsLevel,
    wallpaperMaskOpacity,
    weatherCode,
    visualEffectsPolicy.disableSyncCardAccentAnimation,
  ]);
  const shortcutAppDialogsUtilityDialogs = useMemo(() => ({
    importSourceDialogOpen,
    setImportSourceDialogOpen,
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
    searchBarPosition,
    onSearchBarPositionChange: setSearchBarPosition,
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
  }), [
    aboutModalDefaultTab,
    aboutModalOpen,
    adminModalOpen,
    customApiName,
    customApiUrl,
    gridHitDebugVisible,
    handleBackToMainSettings,
    handleExportDomains,
    handleGridHitDebugEnabledChange,
    handleWeatherDebugApply,
    handleWeatherDebugEnabledChange,
    importSourceDialogOpen,
    searchAnyKeyCaptureEnabled,
    searchBarPosition,
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchRotatingPlaceholderEnabled,
    searchSettingsOpen,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    setAboutModalOpen,
    setAdminModalOpen,
    setImportSourceDialogOpen,
    setCustomApiName,
    setCustomApiUrl,
    setSearchAnyKeyCaptureEnabled,
    setSearchBarPosition,
    setSearchCalculatorEnabled,
    setSearchPrefixEnabled,
    setSearchRotatingPlaceholderEnabled,
    setSearchSettingsOpen,
    setSearchSiteDirectEnabled,
    setSearchSiteShortcutEnabled,
    setShortcutGuideOpen,
    setShortcutIconSettingsOpen,
    setTabSwitchSearchEngine,
    shortcutGuideOpen,
    shortcutIconSettingsOpen,
    tabSwitchSearchEngine,
    weatherDebugVisible,
  ]);
  const shortcutAppDialogsSyncProviderDialogs = useMemo(() => ({
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
  }), [
    cloudSyncConfigOpen,
    handleBackFromSyncProviderConfig,
    openGoogleLinkAuthModal,
    requestLogoutConfirmation,
    setCloudSyncConfigOpen,
    setConfirmDisableWebdavSyncOpen,
    setPendingWebdavEnableScopeKey,
    setWebdavDialogOpen,
    setWebdavEnableAfterConfigSave,
    setWebdavShowConnectionFields,
    webdavDialogOpen,
    webdavEnableAfterConfigSave,
    webdavShowConnectionFields,
  ]);
  const shortcutAppDialogsConsentDialogs = useMemo(() => ({
    confirmDisableConsentOpen,
    setConfirmDisableConsentOpen,
    onPrivacyConsent: handlePrivacyConsent,
  }), [
    confirmDisableConsentOpen,
    handlePrivacyConsent,
    setConfirmDisableConsentOpen,
  ]);
  const shortcutAppDialogsRootProps = useMemo(() => ({
    nonSyncExternalDialogActivity,
    authDialog: shortcutAppDialogsAuthDialog,
    settingsDialogs: shortcutAppDialogsSettingsDialogs,
    utilityDialogs: shortcutAppDialogsUtilityDialogs,
    syncProviderDialogs: shortcutAppDialogsSyncProviderDialogs,
    consentDialogs: shortcutAppDialogsConsentDialogs,
  }), [
    nonSyncExternalDialogActivity,
    shortcutAppDialogsAuthDialog,
    shortcutAppDialogsConsentDialogs,
    shortcutAppDialogsSettingsDialogs,
    shortcutAppDialogsSyncProviderDialogs,
    shortcutAppDialogsUtilityDialogs,
  ]);
  const shortcutSyncDialogsRootProps = useMemo(() => ({
    leafTabSyncDialogOpen,
    setLeafTabSyncDialogOpen,
    setSyncConfigBackTarget,
    user,
  }), [
    leafTabSyncDialogOpen,
    setLeafTabSyncDialogOpen,
    setSyncConfigBackTarget,
    user,
  ]);

  return (
    <ShortcutAppProvider value={shortcutApp}>
      <LeafTabSyncProvider value={syncController}>
        <div
          ref={pageFocusRef}
          tabIndex={-1}
          className={`${showOverlayWallpaperLayer ? 'bg-transparent' : 'bg-background'} relative flex h-screen w-full flex-col items-center overflow-hidden focus:outline-none`}
          style={{
            backgroundColor: showOverlayWallpaperLayer
              ? 'var(--initial-reveal-surface)'
              : (effectiveInitialRevealReady ? 'var(--background)' : 'var(--initial-reveal-surface)'),
          }}
        >
          <WallpaperBackdropProvider
            value={{
              wallpaperMode: effectiveWallpaperMode,
              colorWallpaperGradient,
              blurredWallpaperSrc: '',
              fallbackWallpaperSrc: effectiveWallpaperMode === 'color' ? '' : fallbackWallpaperBackdropSrc,
              blurredWallpaperAverageLuminance: null,
              effectiveWallpaperMaskOpacity,
            }}
          >
            <div
              className="relative h-full w-full"
              style={globalRevealUiStyle}
            >
              <ShortcutExperienceRoot {...shortcutExperienceRootProps} />
              {shouldMountWallpaperSelector ? (
                <Suspense fallback={null}>
                  <LazyWallpaperSelector
                    {...wallpaperSelectorLayerProps}
                    mode={effectiveWallpaperMode}
                    customWallpaperGallery={customWallpaperGallery}
                    onAppendCustomWallpapers={appendCustomWallpapers}
                    wallpaperRotationSettings={wallpaperRotationSettings}
                    onWallpaperRotationIntervalChange={setWallpaperRotationInterval}
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
                    dynamicWallpaperSrc={dynamicWallpaperVideoSrc}
                    onSelect={async (id, layout) => {
                      const applied = await handleRoleSelect(id);
                      if (!applied) return;
                      flushSync(() => {
                        if (layout) {
                          setDisplayMode(layout);
                        }
                        replayHomeEntryReveal();
                      });
                    }}
                  />
                </Suspense>
              ) : null}
              <PrivacyConsentModal
                isOpen={showPrivacyModal}
                onConsent={handlePrivacyConsent}
              />
            </div>
            {globalRevealMaskVisible ? (
              <div
                aria-hidden="true"
                className="fixed inset-0 pointer-events-none"
                style={{
                  ...globalRevealMaskStyle,
                  zIndex: 2147483647,
                }}
              />
            ) : null}
          </WallpaperBackdropProvider>
        </div>
      </LeafTabSyncProvider>
    </ShortcutAppProvider>
  );
}
