import { useCallback, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { readCloudSyncConfigFromStorage } from '@/utils/cloudSyncConfig';
import { recordSyncDiagnosticEvent } from '@/utils/syncDiagnostics';
import type { LeafTabSyncInitialChoice } from '@/sync/leaftab';
import type { WebdavConfig } from '@/types/webdav';
import type { LeafTabSyncEncryptionTransport } from '@/hooks/useLeafTabSyncEncryptionManager';

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
  allowDestructiveBookmarkChanges?: boolean;
  forceBookmarksForThisRun?: boolean;
  progressTaskId?: string | null;
  onProgress?: (progress: SyncProgress) => void;
  allowWhenDisabled?: boolean;
  retryAfterForceUnlock?: boolean;
  retryAfterConflictRefresh?: boolean;
};

type WebdavSyncActionOptions = {
  mode?: LeafTabSyncInitialChoice | 'auto';
  silentSuccess?: boolean;
  skipPostSuccessAnalysis?: boolean;
  requestBookmarkPermission?: boolean;
  allowDestructiveBookmarkChanges?: boolean;
  showProgressIndicator?: boolean;
  progressTaskId?: string | null;
  onProgress?: (progress: SyncProgress) => void;
};

type UseSyncCenterActionsOptions = {
  user: string | null;
  t: (key: string, options?: any) => string;
  leafTabSyncHasConfig: boolean;
  cloudSyncing: boolean;
  webdavSyncing: boolean;
  webdavSyncBookmarksEnabled: boolean;
  cloudSyncBookmarksConfigured: boolean;
  cloudSyncBookmarksEnabled: boolean;
  cloudSyncEncryptionScopeKey: string;
  cloudSyncEncryptedTransport: LeafTabSyncEncryptionTransport;
  setCloudSyncBookmarksPermissionGranted: (granted: boolean) => void;
  ensureSyncEncryptionAccess: (params: {
    providerLabel: string;
    scopeKey: string;
    transport: LeafTabSyncEncryptionTransport;
  }) => Promise<boolean>;
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
  webdavSyncBookmarksEnabled,
  cloudSyncBookmarksConfigured,
  cloudSyncBookmarksEnabled,
  cloudSyncEncryptionScopeKey,
  cloudSyncEncryptedTransport,
  setCloudSyncBookmarksPermissionGranted,
  ensureSyncEncryptionAccess,
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
  const webdavSyncDataDetail = webdavSyncBookmarksEnabled
    ? t('leaftabSyncActions.dataDetail.withBookmarks', { defaultValue: '正在处理快捷方式和书签数据' })
    : t('leaftabSyncActions.dataDetail.shortcutsOnly', { defaultValue: '正在处理快捷方式数据' });
  const cloudSyncDataDetail = cloudSyncBookmarksEnabled
    ? t('leaftabSyncActions.dataDetail.withBookmarks', { defaultValue: '正在处理快捷方式和书签数据' })
    : t('leaftabSyncActions.dataDetail.shortcutsOnly', { defaultValue: '正在处理快捷方式数据' });

  const handleLeafTabAutoSync = useCallback(async () => {
    recordSyncDiagnosticEvent({
      provider: 'webdav',
      action: 'trigger.auto',
    });
    const result = await handleLeafTabSync({
      silentSuccess: true,
      skipPostSuccessAnalysis: true,
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
    if (webdavSyncBookmarksEnabled) {
      const permissionGranted = await ensureExtensionPermission('bookmarks', {
        requestIfNeeded: true,
      }).catch(() => false);
      if (!permissionGranted) {
        toast.error(t('leaftabSyncActions.bookmarksPermissionRequired', { defaultValue: '未授予书签权限，无法执行修复同步' }));
        return false;
      }
    }
    setLeafTabSyncDialogOpen(false);
    return runLongTask({
      title: mode === 'pull-remote'
        ? t('leaftabSyncActions.webdav.repair.pullTitle', { defaultValue: '正在用 WebDAV 覆盖本地' })
        : t('leaftabSyncActions.webdav.repair.pushTitle', { defaultValue: '正在用本地覆盖 WebDAV' }),
      detail: webdavSyncDataDetail,
      progress: 8,
    }, async ({ update }) => {
      const result = await handleLeafTabSync({
        mode,
        allowDestructiveBookmarkChanges: true,
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
        toast.success(mode === 'pull-remote'
          ? t('leaftabSyncActions.webdav.repair.pullSuccess', { defaultValue: '已用 WebDAV 数据覆盖本地' })
          : t('leaftabSyncActions.webdav.repair.pushSuccess', { defaultValue: '已用本地数据覆盖 WebDAV' }));
        return true;
      }
      toast.error(mode === 'pull-remote'
        ? t('leaftabSyncActions.webdav.repair.pullFailed', { defaultValue: 'WebDAV 覆盖本地失败' })
        : t('leaftabSyncActions.webdav.repair.pushFailed', { defaultValue: '本地覆盖 WebDAV 失败' }));
      return false;
    });
  }, [
    handleLeafTabSync,
    leafTabSyncHasConfig,
    openLeafTabSyncConfig,
    runLongTask,
    setLeafTabSyncDialogOpen,
    webdavSyncBookmarksEnabled,
    webdavSyncDataDetail,
  ]);

  const resolveWebdavConflict = useCallback(async (_config: WebdavConfig) => {
    await handleLeafTabSync({
      requestBookmarkPermission: webdavSyncBookmarksEnabled,
      showProgressIndicator: true,
    });
  }, [handleLeafTabSync, webdavSyncBookmarksEnabled]);

  const handleRequestCloudLogin = useCallback(() => {
    const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (webdavEnabled) {
      toast.error(t('settings.backup.webdav.disableWebdavBeforeCloudLogin'));
      return false;
    }
    setIsAuthModalOpen(true);
    return true;
  }, [setIsAuthModalOpen, t]);

  const handleOpenCloudSyncConfig = useCallback(() => {
    const webdavEnabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (webdavEnabled) {
      toast.error(t('settings.backup.webdav.disableWebdavBeforeCloudManage', {
        defaultValue: '当前已启用 WebDAV 同步，请先停用 WebDAV 同步后再管理云同步',
      }));
      return;
    }
    setLeafTabSyncDialogOpen(false);
    setCloudSyncConfigOpen(true);
  }, [setCloudSyncConfigOpen, setLeafTabSyncDialogOpen, t]);

  const handleCloudSyncNowFromCenter = useCallback(async (options?: { allowWhenDisabled?: boolean }) => {
    if (cloudSyncing || cloudSyncNowInFlightRef.current) {
      toast.info(t('leaftabSyncActions.cloud.inProgress', { defaultValue: '云同步正在进行中，请稍候' }));
      return false;
    }
    if (!user) {
      handleRequestCloudLogin();
      return false;
    }
    cloudSyncNowInFlightRef.current = true;
    try {
      const encryptionReady = await ensureSyncEncryptionAccess({
        providerLabel: t('leaftabSync.provider.cloud', { defaultValue: '云同步' }),
        scopeKey: cloudSyncEncryptionScopeKey,
        transport: cloudSyncEncryptedTransport,
      });
      if (!encryptionReady) {
        return false;
      }
      return runLongTask({
        title: t('leaftabSyncActions.cloud.syncingTitle', { defaultValue: '正在同步到云端' }),
        detail: cloudSyncDataDetail,
        progress: 8,
      }, async ({ update }) => {
        const result = await handleCloudLeafTabSync({
          allowWhenDisabled: options?.allowWhenDisabled,
          requestBookmarkPermission: cloudSyncBookmarksConfigured,
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
    cloudSyncBookmarksConfigured,
    cloudSyncNowInFlightRef,
    cloudSyncing,
    ensureSyncEncryptionAccess,
    handleCloudLeafTabSync,
    handleRequestCloudLogin,
    runLongTask,
    t,
    user,
    cloudSyncDataDetail,
  ]);

  const handleWebdavSyncNowFromCenter = useCallback(async () => {
    recordSyncDiagnosticEvent({
      provider: 'webdav',
      action: 'trigger.manual',
      detail: {
        source: 'sync-center',
      },
    });
    if (webdavSyncing || webdavSyncNowInFlightRef.current) {
      toast.info(t('leaftabSyncActions.webdav.inProgress', { defaultValue: 'WebDAV 同步正在进行中，请稍候' }));
      return false;
    }
    if (!leafTabSyncHasConfig) {
      openLeafTabSyncConfig();
      return false;
    }
    webdavSyncNowInFlightRef.current = true;
    try {
      return runLongTask({
        title: t('leaftabSyncActions.webdav.syncingTitle', { defaultValue: '正在同步到 WebDAV' }),
        detail: webdavSyncDataDetail,
        progress: 8,
      }, async ({ update }) => {
        const result = await handleLeafTabSync({
          requestBookmarkPermission: webdavSyncBookmarksEnabled,
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
    webdavSyncBookmarksEnabled,
    webdavSyncDataDetail,
    webdavSyncing,
  ]);

  const handleCloudRepairFromCenter = useCallback(async (
    mode: LeafTabSyncInitialChoice,
  ) => {
    if (!user) {
      handleRequestCloudLogin();
      return false;
    }
    let bookmarkPermissionGranted = false;
    if (cloudSyncBookmarksConfigured) {
      bookmarkPermissionGranted = await ensureExtensionPermission('bookmarks', {
        requestIfNeeded: true,
      }).catch(() => false);
      setCloudSyncBookmarksPermissionGranted(Boolean(bookmarkPermissionGranted));
      if (!bookmarkPermissionGranted) {
        toast.error(t('leaftabSyncActions.bookmarksPermissionRequired', { defaultValue: '未授予书签权限，无法执行修复同步' }));
        return false;
      }
    }
    setLeafTabSyncDialogOpen(false);
    return runLongTask({
      title: mode === 'pull-remote'
        ? t('leaftabSyncActions.cloud.repair.pullTitle', { defaultValue: '正在用云端覆盖本地' })
        : t('leaftabSyncActions.cloud.repair.pushTitle', { defaultValue: '正在用本地覆盖云端' }),
      detail: cloudSyncDataDetail,
      progress: 8,
    }, async ({ update }) => {
      const result = await handleCloudLeafTabSync({
        mode,
        allowWhenDisabled: true,
        allowDestructiveBookmarkChanges: true,
        requestBookmarkPermission: false,
        forceBookmarksForThisRun: cloudSyncBookmarksConfigured && bookmarkPermissionGranted,
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
        toast.success(mode === 'pull-remote'
          ? t('leaftabSyncActions.cloud.repair.pullSuccess', { defaultValue: '已用云端数据覆盖本地' })
          : t('leaftabSyncActions.cloud.repair.pushSuccess', { defaultValue: '已用本地数据覆盖云端' }));
        return true;
      }
      return false;
    });
  }, [
    cloudSyncBookmarksConfigured,
    handleCloudLeafTabSync,
    handleRequestCloudLogin,
    runLongTask,
    setCloudSyncBookmarksPermissionGranted,
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
    const encryptionReady = await ensureSyncEncryptionAccess({
      providerLabel: t('leaftabSync.provider.cloud', { defaultValue: '云同步' }),
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
