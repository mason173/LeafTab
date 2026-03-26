import { useCallback, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { readCloudSyncConfigFromStorage } from '@/utils/cloudSyncConfig';
import type { LeafTabSyncInitialChoice } from '@/sync/leaftab';
import type { WebdavConfig } from '@/types/webdav';

type LongTaskRunner = <T>(
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
  }) => Promise<T>,
) => Promise<T>;

type SyncProgress = {
  message: string;
  progress: number;
};

type CloudSyncActionOptions = {
  mode?: LeafTabSyncInitialChoice | 'auto';
  silentSuccess?: boolean;
  requestBookmarkPermission?: boolean;
  progressTaskId?: string | null;
  onProgress?: (progress: SyncProgress) => void;
  allowWhenDisabled?: boolean;
  retryAfterForceUnlock?: boolean;
  retryAfterConflictRefresh?: boolean;
};

type WebdavSyncActionOptions = {
  mode?: LeafTabSyncInitialChoice | 'auto';
  silentSuccess?: boolean;
  requestBookmarkPermission?: boolean;
  showProgressIndicator?: boolean;
  progressTaskId?: string | null;
  onProgress?: (progress: SyncProgress) => void;
};

type EncryptionTransport = {
  readEncryptionState: () => Promise<unknown>;
} | null;

type UseSyncCenterActionsOptions = {
  user: string | null;
  t: (key: string, options?: any) => string;
  leafTabSyncHasConfig: boolean;
  cloudSyncing: boolean;
  webdavSyncing: boolean;
  cloudSyncBookmarksEnabled: boolean;
  cloudSyncEncryptionScopeKey: string;
  cloudSyncEncryptedTransport: EncryptionTransport;
  ensureSyncEncryptionAccess: (params: {
    providerLabel: string;
    scopeKey: string;
    transport: EncryptionTransport;
  }) => Promise<boolean>;
  ensureCloudLegacyMigrationReady: () => Promise<boolean>;
  handleCloudLeafTabSync: (options?: CloudSyncActionOptions) => Promise<any>;
  handleLeafTabSync: (options?: WebdavSyncActionOptions) => Promise<any>;
  setIsAuthModalOpen: (open: boolean) => void;
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  setCloudSyncConfigOpen: (open: boolean) => void;
  runLongTask: LongTaskRunner;
  setCloudNextSyncAt: (nextMs: number | null) => void;
  openLeafTabSyncConfig: () => void;
};

export function useSyncCenterActions({
  user,
  t,
  leafTabSyncHasConfig,
  cloudSyncing,
  webdavSyncing,
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
}: UseSyncCenterActionsOptions) {
  const cloudSyncNowInFlightRef = useRef(false);
  const webdavSyncNowInFlightRef = useRef(false);
  const cloudSyncDataDetail = cloudSyncBookmarksEnabled
    ? '正在处理快捷方式和书签数据'
    : '正在处理快捷方式数据';

  const handleLeafTabAutoSync = useCallback(async () => {
    const result = await handleLeafTabSync({
      silentSuccess: true,
    });
    return Boolean(result);
  }, [handleLeafTabSync]);

  const handleWebdavRepairFromCenter = useCallback(async (
    mode: LeafTabSyncInitialChoice,
  ) => {
    if (!leafTabSyncHasConfig) {
      openLeafTabSyncConfig();
      return false;
    }
    const permissionGranted = await ensureExtensionPermission('bookmarks', {
      requestIfNeeded: true,
    }).catch(() => false);
    if (!permissionGranted) {
      toast.error('未授予书签权限，无法执行修复同步');
      return false;
    }
    setLeafTabSyncDialogOpen(false);
    return runLongTask({
      title: mode === 'pull-remote' ? '正在用 WebDAV 覆盖本地' : '正在用本地覆盖 WebDAV',
      detail: '正在处理快捷方式和书签数据',
      progress: 8,
    }, async ({ update }) => {
      const result = await handleLeafTabSync({
        mode,
        requestBookmarkPermission: false,
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
        toast.success(mode === 'pull-remote' ? '已用 WebDAV 数据覆盖本地' : '已用本地数据覆盖 WebDAV');
        return true;
      }
      toast.error(mode === 'pull-remote' ? 'WebDAV 覆盖本地失败' : '本地覆盖 WebDAV 失败');
      return false;
    });
  }, [
    handleLeafTabSync,
    leafTabSyncHasConfig,
    openLeafTabSyncConfig,
    runLongTask,
    setLeafTabSyncDialogOpen,
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
  }, [setIsAuthModalOpen]);

  const handleOpenCloudSyncConfig = useCallback(() => {
    const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (webdavEnabled) {
      toast.error('当前已启用 WebDAV 同步，请先停用 WebDAV 同步后再管理云同步');
      return;
    }
    setLeafTabSyncDialogOpen(false);
    setCloudSyncConfigOpen(true);
  }, [setCloudSyncConfigOpen, setLeafTabSyncDialogOpen]);

  const handleCloudSyncNowFromCenter = useCallback(async () => {
    if (cloudSyncing || cloudSyncNowInFlightRef.current) {
      toast.info('云同步正在进行中，请稍候');
      return false;
    }
    if (!user) {
      handleRequestCloudLogin();
      return false;
    }
    if (!(await ensureCloudLegacyMigrationReady())) {
      return false;
    }
    cloudSyncNowInFlightRef.current = true;
    try {
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
        detail: cloudSyncDataDetail,
        progress: 8,
      }, async ({ update }) => {
        const result = await handleCloudLeafTabSync({
          requestBookmarkPermission: cloudSyncBookmarksEnabled,
          retryAfterConflictRefresh: true,
          retryAfterForceUnlock: true,
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
        return false;
      });
    } finally {
      cloudSyncNowInFlightRef.current = false;
    }
  }, [
    cloudSyncEncryptedTransport,
    cloudSyncEncryptionScopeKey,
    cloudSyncBookmarksEnabled,
    cloudSyncNowInFlightRef,
    cloudSyncing,
    ensureSyncEncryptionAccess,
    ensureCloudLegacyMigrationReady,
    handleCloudLeafTabSync,
    handleRequestCloudLogin,
    runLongTask,
    t,
    user,
    cloudSyncDataDetail,
  ]);

  const handleWebdavSyncNowFromCenter = useCallback(async () => {
    if (webdavSyncing || webdavSyncNowInFlightRef.current) {
      toast.info('WebDAV 同步正在进行中，请稍候');
      return false;
    }
    if (!leafTabSyncHasConfig) {
      openLeafTabSyncConfig();
      return false;
    }
    webdavSyncNowInFlightRef.current = true;
    try {
      return runLongTask({
        title: '正在同步到 WebDAV',
        detail: '正在处理快捷方式和书签数据',
        progress: 8,
      }, async ({ update }) => {
        const result = await handleLeafTabSync({
          requestBookmarkPermission: true,
          progressTaskId: null,
          silentSuccess: true,
          onProgress: (progress) => {
            update({
              title: progress.message,
              progress: progress.progress,
            });
          },
        });
        return Boolean(result);
      });
    } finally {
      webdavSyncNowInFlightRef.current = false;
    }
  }, [
    handleLeafTabSync,
    leafTabSyncHasConfig,
    openLeafTabSyncConfig,
    runLongTask,
    webdavSyncNowInFlightRef,
    webdavSyncing,
  ]);

  const handleCloudRepairFromCenter = useCallback(async (
    mode: LeafTabSyncInitialChoice,
  ) => {
    if (!user) {
      handleRequestCloudLogin();
      return false;
    }
    if (!(await ensureCloudLegacyMigrationReady())) {
      return false;
    }
    if (cloudSyncBookmarksEnabled) {
      const permissionGranted = await ensureExtensionPermission('bookmarks', {
        requestIfNeeded: true,
      }).catch(() => false);
      if (!permissionGranted) {
        toast.error('未授予书签权限，无法执行修复同步');
        return false;
      }
    }
    setLeafTabSyncDialogOpen(false);
    return runLongTask({
      title: mode === 'pull-remote' ? '正在用云端覆盖本地' : '正在用本地覆盖云端',
      detail: cloudSyncDataDetail,
      progress: 8,
    }, async ({ update }) => {
      const result = await handleCloudLeafTabSync({
        mode,
        allowWhenDisabled: true,
        requestBookmarkPermission: false,
        retryAfterConflictRefresh: true,
        retryAfterForceUnlock: true,
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
        toast.success(mode === 'pull-remote' ? '已用云端数据覆盖本地' : '已用本地数据覆盖云端');
        return true;
      }
      return false;
    });
  }, [
    handleCloudLeafTabSync,
    cloudSyncBookmarksEnabled,
    ensureCloudLegacyMigrationReady,
    handleRequestCloudLogin,
    runLongTask,
    setLeafTabSyncDialogOpen,
    user,
    cloudSyncDataDetail,
  ]);

  const handleCloudSyncConfigSaved = useCallback(async () => {
    if (!user) return;
    if (!readCloudSyncConfigFromStorage().enabled) {
      setCloudNextSyncAt(null);
      return;
    }
    if (!(await ensureCloudLegacyMigrationReady())) {
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
    ensureCloudLegacyMigrationReady,
    handleCloudSyncNowFromCenter,
    setCloudNextSyncAt,
    user,
  ]);

  return {
    handleLeafTabAutoSync,
    handleWebdavSyncNowFromCenter,
    handleWebdavRepairFromCenter,
    resolveWebdavConflict,
    handleRequestCloudLogin,
    handleOpenCloudSyncConfig,
    handleCloudSyncNowFromCenter,
    handleCloudRepairFromCenter,
    handleCloudSyncConfigSaved,
  };
}
