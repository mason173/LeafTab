import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { toast } from '@/components/ui/sonner';
import i18n from '@/i18n';
import { useLeafTabSyncRuntime } from '@/lazy/sync';
import {
  LEAFTAB_SYNC_ANALYSIS_CACHE_MAX_AGE_MS,
  useLeafTabSyncEngine,
} from '@/hooks/useLeafTabSyncEngine';
import { useLeafTabWebdavAutoSync } from '@/hooks/useLeafTabWebdavAutoSync';
import {
  useLeafTabSyncRunner,
  type LeafTabSyncRunnerOptionsBase,
} from '@/hooks/useLeafTabSyncRunner';
import {
  useLeafTabSyncEncryptionManager,
  type LeafTabSyncEncryptionDialogState,
} from '@/hooks/useLeafTabSyncEncryptionManager';
import { useLeafTabBackupActions } from '@/hooks/useLeafTabBackupActions';
import { useSyncCenterActions } from '@/hooks/useSyncCenterActions';
import { useLeafTabLegacyCompat } from '@/hooks/useLeafTabLegacyCompat';
import { useLeafTabSnapshotBridge } from '@/hooks/useLeafTabSnapshotBridge';
import { isWebdavAuthError } from '@/utils/webdavError';
import {
  CLOUD_SYNC_STORAGE_KEYS,
  applyCloudDangerousBookmarkChoiceToStorage,
  emitCloudSyncStatusChanged,
  readCloudSyncConfigFromStorage,
} from '@/utils/cloudSyncConfig';
import {
  applyWebdavDangerousBookmarkChoiceToStorage,
  hasWebdavUrlConfiguredFromStorage,
  isWebdavSyncEnabledFromStorage,
  readWebdavConfigFromStorage,
  readWebdavStorageStateFromStorage,
  WEBDAV_STORAGE_KEYS,
} from '@/utils/webdavConfig';
import {
  createLeafTabCloudEncryptionScopeKey,
  createLeafTabWebdavEncryptionScopeKey,
  hasLeafTabSyncEncryptionConfig,
} from '@/utils/leafTabSyncEncryption';
import { resolveCloudSyncBookmarkApplyMode, resolveCloudSyncBookmarksEnabled } from '@/utils/cloudSyncBookmarksPolicy';
import { resolveDeferredBookmarkSyncExecution } from '@/utils/deferredBookmarkSync';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { getAlignedJitteredNextAt, resolveInitialAlignedJitteredTargetAt } from '@/sync/schedule';
import {
  type LeafTabSyncEngineResult,
  type LeafTabSyncInitialChoice,
  type LeafTabSyncSnapshot,
} from '@/sync/leaftab';
import { normalizeLeafTabSyncSnapshot } from '@/sync/leaftab/schema';
import { readLeafTabBookmarkSyncScope } from '@/sync/leaftab/bookmarkScope';
import type { WebdavConfig } from '@/types/webdav';
import type { SyncablePreferences } from '@/types';
import type { ShortcutAppContextValue } from '@/features/shortcuts/app/ShortcutAppContext';

const LEAFTAB_SYNC_DEFAULT_ROOT_PATH = 'leaftab/v1';
const LEAFTAB_CLOUD_SYNC_BASELINE_PREFIX = 'leaftab_cloud_sync_v1_baseline';
const CLOUD_AUTO_SYNC_BUSY_RETRY_DELAY_MS = 5 * 1000;
const CLOUD_AUTO_SYNC_FAILURE_RETRY_DELAY_MS = 15 * 1000;

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

type DangerousSyncDialogAction = 'continue-without-bookmarks' | 'use-remote' | 'use-local' | null;

type DangerousSyncDialogState = {
  open: boolean;
  provider: 'cloud' | 'webdav';
  localBookmarkCount: number | null;
  remoteBookmarkCount: number | null;
  detectedFromCount: number;
  detectedToCount: number;
};

type DangerousSyncError = Error & {
  fromCount: number;
  toCount: number;
};

type LongTaskState = {
  title: string;
  detail?: string;
  progress?: number;
};

type LongTaskUpdate = {
  title?: string;
  detail?: string;
  progress?: number;
};

type LongTaskRunner = <T>(
  initial: LongTaskState,
  runner: (helpers: {
    update: (options: LongTaskUpdate) => void;
  }) => Promise<T>,
) => Promise<T>;

type ShortcutDomainState = ShortcutAppContextValue['state']['domain'];
type ShortcutDomainActions = ShortcutAppContextValue['actions']['domain'];
type ShortcutPersistenceActions = ShortcutAppContextValue['actions']['persistence'];
type ShortcutMeta = ShortcutAppContextValue['meta'];

export type UseLeafTabSyncRuntimeControllerParams = {
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
  apiUrl: string;
  user: string | null;
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthModalMode: (mode: 'login' | 'link-google') => void;
  setSettingsOpen: (open: boolean) => void;
  setWebdavDialogOpen: (open: boolean) => void;
  setCloudSyncConfigOpen: (open: boolean) => void;
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  leafTabSyncDialogOpen: boolean;
  setWebdavEnableAfterConfigSave: (open: boolean) => void;
  setWebdavShowConnectionFields: (open: boolean) => void;
  setPendingWebdavEnableScopeKey: (scopeKey: string | null) => void;
  pendingWebdavEnableScopeKey: string | null;
  setSyncConfigBackTarget: (target: 'settings' | 'sync-center') => void;
  setConfirmLegacyCloudMigrationOpen: (open: boolean) => void;
  legacyCloudMigrationResolverRef: MutableRefObject<((value: boolean) => void) | null>;
  scenarioModes: ShortcutDomainState['scenarioModes'];
  selectedScenarioId: ShortcutDomainState['selectedScenarioId'];
  scenarioShortcuts: ShortcutDomainState['scenarioShortcuts'];
  setScenarioModes: ShortcutDomainActions['setScenarioModes'];
  setSelectedScenarioId: ShortcutDomainActions['setSelectedScenarioId'];
  setScenarioShortcuts: ShortcutDomainActions['setScenarioShortcuts'];
  localDirtyRef: ShortcutMeta['localDirtyRef'];
  resetLocalShortcutsByRole: ShortcutPersistenceActions['resetLocalShortcutsByRole'];
  buildSyncablePreferencesSnapshot: () => SyncablePreferences;
  applySyncablePreferencesSnapshot: (preferences: SyncablePreferences | null) => Promise<void>;
  stripWallpaperFromCloudSyncPreferences: (preferences: SyncablePreferences) => SyncablePreferences;
  mergeCloudSyncSnapshotWithLocalWallpaper: (snapshot: LeafTabSyncSnapshot) => LeafTabSyncSnapshot;
  runLongTask: LongTaskRunner;
  startLongTaskIndicator: (state: LongTaskState) => string;
  updateLongTaskIndicator: (taskId: string, options: LongTaskUpdate) => void;
  finishLongTaskIndicator: (taskId: string) => void;
  clearLongTaskIndicator: (taskId: string) => void;
  isDragging: boolean;
};

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

export function useLeafTabSyncRuntimeController({
  t,
  language,
  apiUrl,
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
}: UseLeafTabSyncRuntimeControllerParams) {
  const [cloudSyncConfigVersion, setCloudSyncConfigVersion] = useState(0);
  const [syncEncryptionVersion, setSyncEncryptionVersion] = useState(0);
  const [leafTabSyncConfigVersion, setLeafTabSyncConfigVersion] = useState(0);
  const [cloudLoginSyncPendingUser, setCloudLoginSyncPendingUser] = useState<string | null>(null);
  const [dangerousSyncDialogState, setDangerousSyncDialogState] = useState<DangerousSyncDialogState | null>(null);
  const [dangerousSyncDialogBusyAction, setDangerousSyncDialogBusyAction] = useState<DangerousSyncDialogAction>(null);
  const [cloudSyncBookmarksPermissionGranted, setCloudSyncBookmarksPermissionGranted] = useState(false);

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

  const leafTabSyncDeviceId = useMemo(() => getOrCreateLeafTabSyncDeviceId(), []);

  const emitWebdavSyncStatusChanged = useCallback(() => {
    window.dispatchEvent(new Event('webdav-config-changed'));
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);

  const openLeafTabSyncConfig = useCallback(() => {
    setSyncConfigBackTarget('settings');
    setWebdavEnableAfterConfigSave(false);
    setWebdavShowConnectionFields(false);
    setWebdavDialogOpen(true);
  }, [
    setSyncConfigBackTarget,
    setWebdavDialogOpen,
    setWebdavEnableAfterConfigSave,
    setWebdavShowConnectionFields,
  ]);

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
    localStorage.setItem('webdav_last_error_message', String((error as Error)?.message || 'unknown'));
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
      apiUrl,
      token: cloudSyncToken,
    });
  }, [apiUrl, cloudSyncToken, syncRuntime, user]);

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

  const { webdavLegacyCompat, cloudLegacyCompat } = useLeafTabLegacyCompat({
    apiUrl,
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
    [language, t],
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
    API_URL: apiUrl,
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
      clear: (taskId) => {
        if (taskId) {
          clearLongTaskIndicator(taskId);
        }
      },
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
    onSuccess: async (_result, context) => {
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
      clear: (taskId) => {
        if (taskId) {
          clearLongTaskIndicator(taskId);
        }
      },
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
    setAuthModalMode,
    setCloudSyncConfigOpen,
    setIsAuthModalOpen,
    setLeafTabSyncDialogOpen,
    setSyncConfigBackTarget,
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
    setPendingWebdavEnableScopeKey,
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
          } catch {
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
  }, [
    cloudSyncEnabled,
    leafTabWebdavConfigured,
    setSyncConfigBackTarget,
    setWebdavDialogOpen,
    setWebdavEnableAfterConfigSave,
    setWebdavShowConnectionFields,
    t,
  ]);

  const handleOpenWebdavConfigFromSyncCenter = useCallback((options?: { enableAfterSave?: boolean; showConnectionFields?: boolean }) => {
    const opened = handleOpenWebdavConfig(options);
    if (!opened) {
      return;
    }
    setSyncConfigBackTarget('sync-center');
    setLeafTabSyncDialogOpen(false);
  }, [handleOpenWebdavConfig, setLeafTabSyncDialogOpen, setSyncConfigBackTarget]);

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
  }, [refreshCloudLeafTabSyncAnalysis, refreshLeafTabSyncAnalysis, setLeafTabSyncDialogOpen]);

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
  }, [legacyCloudMigrationResolverRef, setConfirmLegacyCloudMigrationOpen]);

  const requestLegacyCloudMigrationPrompt = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      legacyCloudMigrationResolverRef.current = resolve;
      setCloudSyncConfigOpen(false);
      setLeafTabSyncDialogOpen(false);
      setConfirmLegacyCloudMigrationOpen(true);
    });
  }, [
    legacyCloudMigrationResolverRef,
    setCloudSyncConfigOpen,
    setConfirmLegacyCloudMigrationOpen,
    setLeafTabSyncDialogOpen,
  ]);

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
      const response = await fetch(`${apiUrl}/user/shortcuts`, {
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
    apiUrl,
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
  }, [handleOpenCloudSyncConfig, setSyncConfigBackTarget]);

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
    applyCloudDangerousBookmarkChoice,
    applyWebdavDangerousBookmarkChoice,
    clearCloudLeafTabSyncErrorState,
    clearCloudSyncError,
    clearLeafTabSyncErrorState,
    clearWebdavSyncError,
    closeDangerousSyncDialog,
    dangerousSyncDialogState,
    handleCloudLeafTabSync,
    handleLeafTabSync,
    t,
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
    applyCloudDangerousBookmarkChoice,
    applyWebdavDangerousBookmarkChoice,
    clearCloudLeafTabSyncErrorState,
    clearCloudSyncError,
    clearLeafTabSyncErrorState,
    clearWebdavSyncError,
    closeDangerousSyncDialog,
    dangerousSyncDialogState,
    t,
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

  return {
    state: {
      syncEncryptionDialogState: syncEncryptionDialogState as LeafTabSyncEncryptionDialogState | null,
      syncEncryptionDialogBusy,
      importConfirmOpen,
      importPendingPayload,
      importConfirmBusy,
      exportBackupDialogOpen,
      importBackupDialogOpen,
      importBackupScopePayload,
      leafTabSyncAnalysis,
      leafTabSyncHasConfig,
      leafTabSyncReady,
      leafTabSyncLastResult,
      leafTabSyncState,
      cloudLeafTabSyncAnalysis,
      cloudLeafTabSyncHasConfig,
      cloudLeafTabSyncLastResult,
      cloudLeafTabSyncState,
      leafTabSyncWebdavConfig,
      leafTabWebdavEncryptionReady,
      webdavSyncBookmarksEnabled,
      cloudSyncBookmarksEnabled,
      cloudSyncEncryptionReady,
      leafTabWebdavConfigured,
      leafTabWebdavEnabled,
      leafTabWebdavProfileLabel,
      leafTabWebdavLastSyncLabel,
      leafTabWebdavNextSyncLabel,
      cloudSyncEnabled,
      cloudLastSyncLabel,
      cloudNextSyncLabel,
      leafTabBookmarkSyncScopeLabel,
      dangerousSyncDialogState,
      dangerousSyncDialogBusyAction,
      topNavSyncStatus,
    },
    actions: {
      queueCloudLoginSync: (username: string) => {
        setCloudLoginSyncPendingUser(username);
      },
      handleSyncEncryptionDialogOpenChange,
      handleSubmitSyncEncryptionDialog,
      setImportConfirmOpen,
      setImportPendingPayload,
      setImportConfirmBusy,
      setExportBackupDialogOpen,
      handleImportBackupDialogOpenChange,
      handleImportBackupScopeConfirm,
      handleExportData,
      executeExportData,
      handleImportData,
      handleImportConfirmApply,
      handleLeafTabSync,
      handleCloudLeafTabSync,
      handleEnableWebdavSync,
      handleDisableWebdavSync,
      handleOpenWebdavConfig,
      handleOpenWebdavConfigFromSyncCenter,
      handleLeafTabSyncDialogOpenChange,
      resolveLegacyCloudMigrationPrompt,
      handleLeafTabAutoSync,
      handleWebdavSyncNowFromCenter,
      handleWebdavRepairFromCenter,
      resolveWebdavConflict,
      handleRequestCloudLogin,
      handleOpenCloudSyncConfigFromSyncCenter,
      handleCloudSyncNowFromCenter,
      handleCloudRepairFromCenter,
      handleCloudSyncConfigSaved,
      closeDangerousSyncDialog,
      handleDangerousSyncDialogContinueWithoutBookmarks,
      handleDangerousSyncDialogDefer,
      handleDangerousSyncDialogUseRemote,
      handleDangerousSyncDialogUseLocal,
      syncLocalToCloudBeforeLogout,
    },
    meta: {
      resolveLeafTabSyncRootPath,
    },
  };
}

export type LeafTabSyncRuntimeController = ReturnType<typeof useLeafTabSyncRuntimeController>;
