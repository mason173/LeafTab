import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { toast } from '@/components/ui/sonner';
import type { ScenarioMode, ScenarioShortcuts } from '@/types';
import { defaultScenarioModes } from '@/scenario/scenario';
import {
  createLeafTabLocalBackupBundle,
  filterLeafTabLocalBackupSnapshot,
  getLeafTabLocalBackupAvailableScope,
  mergeLeafTabLocalBackupSnapshotWithBase,
  projectLeafTabSyncSnapshotToAppState,
  readLeafTabBookmarkSyncScope,
  restrictLeafTabLocalBackupImportScope,
  type LeafTabBookmarkSyncScope,
  type LeafTabLocalBackupExportScope,
  type LeafTabLocalBackupImportData,
} from '@/sync/leaftab';
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { normalizeLeafTabSyncSnapshot } from '@/sync/leaftab';

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

type CloudSyncRunnerOptions = {
  silentSuccess?: boolean;
  allowWhenDisabled?: boolean;
};

type UseLeafTabBackupActionsOptions = {
  API_URL: string;
  user: string | null;
  t: (key: string, options?: any) => string;
  selectedScenarioId: string;
  setScenarioModes: (value: ScenarioMode[]) => void;
  setSelectedScenarioId: (value: string) => void;
  setScenarioShortcuts: (value: ScenarioShortcuts) => void;
  localDirtyRef: MutableRefObject<boolean>;
  setSettingsOpen: (open: boolean) => void;
  runLongTask: LongTaskRunner;
  buildSnapshotFromCurrentState: (options?: {
    requestBookmarkPermission?: boolean;
    baselineStorageKey?: string;
  }) => Promise<any>;
  applySnapshotToLocalState: (snapshot: any, options?: {
    preferredSelectedScenarioId?: string | null;
  }) => Promise<void>;
  cloudSyncRunnerRef: MutableRefObject<(options?: CloudSyncRunnerOptions) => Promise<unknown>>;
  leafTabBookmarkSyncScope: LeafTabBookmarkSyncScope;
  leafTabSyncRootPath?: string | null;
};

export function useLeafTabBackupActions({
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
  buildSnapshotFromCurrentState,
  applySnapshotToLocalState,
  cloudSyncRunnerRef,
  leafTabBookmarkSyncScope,
  leafTabSyncRootPath,
}: UseLeafTabBackupActionsOptions) {
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importPendingPayload, setImportPendingPayload] = useState<LeafTabLocalBackupImportData | null>(null);
  const [importConfirmBusy, setImportConfirmBusy] = useState(false);
  const [exportBackupDialogOpen, setExportBackupDialogOpen] = useState(false);
  const [importBackupDialogOpen, setImportBackupDialogOpen] = useState(false);
  const [importBackupScopePayload, setImportBackupScopePayload] = useState<LeafTabLocalBackupImportData | null>(null);

  const downloadCloudBackupEnvelope = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const bookmarkSyncScope = readLeafTabBookmarkSyncScope();

      const response = await fetch(`${API_URL}/user/leaftab-sync/state`, {
        headers: { Authorization: `Bearer ${token}` },
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
          headers: { Authorization: `Bearer ${token}` },
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

  const applyImportedLegacyBackup = useCallback(async (
    payload: {
      scenarioModes: any[];
      selectedScenarioId: string;
      scenarioShortcuts: ScenarioShortcuts;
    },
    options?: {
      closeSettings?: boolean;
      successKey?: string;
      silentSuccess?: boolean;
      syncCloudIfSignedIn?: boolean;
      onProgress?: (options: {
        title?: string;
        detail?: string;
        progress?: number;
      }) => void;
      skipLongTaskIndicator?: boolean;
    },
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
        title: t('settings.backup.progress.importPreparingTitle', { defaultValue: '正在整理导入数据' }),
        detail: t('settings.backup.progress.importPreparingDetail', { defaultValue: '正在校验导入文件内容' }),
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
        title: t('settings.backup.progress.importWritingLocalTitle', { defaultValue: '正在写入本地数据' }),
        detail: t('settings.backup.progress.importWritingLocalDetail', { defaultValue: '正在把导入数据应用到当前设备' }),
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
          title: t('settings.backup.progress.importSyncingTitle', { defaultValue: '正在同步导入结果' }),
          detail: t('settings.backup.progress.importSyncingDetail', { defaultValue: '正在把最新数据写回账号云端' }),
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
        title: t('settings.backup.progress.importLongTaskTitle', { defaultValue: '正在导入数据' }),
        detail: t('settings.backup.progress.importLongTaskDetail', { defaultValue: '正在写入本地数据，请稍候' }),
        progress: 8,
      }, async ({ update }) => performImport(update));
    } catch (error) {
      toast.error(t('settings.backup.importError'));
      throw error;
    }
  }, [
    cloudSyncRunnerRef,
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
    options?: {
      closeSettings?: boolean;
      successKey?: string;
      silentSuccess?: boolean;
      syncCloudIfSignedIn?: boolean;
      onProgress?: (options: {
        title?: string;
        detail?: string;
        progress?: number;
      }) => void;
      skipLongTaskIndicator?: boolean;
    },
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
        title: t('settings.backup.progress.importReadingLocalTitle', { defaultValue: '正在读取当前本地数据' }),
        detail: t('settings.backup.progress.importReadingLocalDetail', { defaultValue: '正在准备合并导入内容' }),
        progress: 18,
      });
      const baseSnapshot = await buildSnapshotFromCurrentState({
        requestBookmarkPermission: false,
      });
      reportProgress?.({
        title: t('settings.backup.progress.importMergingTitle', { defaultValue: '正在合并导入数据' }),
        detail: t('settings.backup.progress.importMergingDetail', { defaultValue: '正在对齐快捷方式与书签的最新状态' }),
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
        title: t('settings.backup.progress.importWritingLocalTitle', { defaultValue: '正在写入本地数据' }),
        detail: t('settings.backup.progress.importWritingLocalDetail', { defaultValue: '正在把导入数据应用到当前设备' }),
        progress: 68,
      });
      await applySnapshotToLocalState(mergedSnapshot, {
        preferredSelectedScenarioId: nextSelectedScenarioId,
      });

      let synced = true;
      if (user && options?.syncCloudIfSignedIn !== false) {
        reportProgress?.({
          title: t('settings.backup.progress.importSyncingTitle', { defaultValue: '正在同步导入结果' }),
          detail: t('settings.backup.progress.importSyncingDetail', { defaultValue: '正在把最新数据写回账号云端' }),
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
        title: t('settings.backup.progress.importLongTaskTitle', { defaultValue: '正在导入数据' }),
        detail: t('settings.backup.progress.importLongTaskDetail', { defaultValue: '正在写入本地数据，请稍候' }),
        progress: 8,
      }, async ({ update }) => performImport(update));
    } catch (error) {
      toast.error(t('settings.backup.importError'));
      throw error;
    }
  }, [
    applyImportedLegacyBackup,
    applySnapshotToLocalState,
    buildSnapshotFromCurrentState,
    cloudSyncRunnerRef,
    runLongTask,
    setSettingsOpen,
    t,
    user,
  ]);

  const executeExportData = useCallback(async (exportScope?: LeafTabLocalBackupExportScope) => {
    await runLongTask({
      title: t('settings.backup.progress.exportLongTaskTitle', { defaultValue: '正在导出数据' }),
      detail: t('settings.backup.progress.exportLongTaskDetail', { defaultValue: '正在准备快捷方式与书签内容' }),
      progress: 8,
    }, async ({ update }) => {
      update({
        title: t('settings.backup.progress.exportReadingLocalTitle', { defaultValue: '正在读取本地数据' }),
        detail: t('settings.backup.progress.exportReadingLocalDetail', { defaultValue: '正在收集当前设备上的快捷方式与书签' }),
        progress: 24,
      });
      const snapshot = await buildSnapshotFromCurrentState({
        requestBookmarkPermission: true,
      });
      update({
        title: t('settings.backup.progress.exportAssemblingTitle', { defaultValue: '正在整理导出内容' }),
        detail: t('settings.backup.progress.exportAssemblingDetail', { defaultValue: '正在组装 LeafTab 备份文件' }),
        progress: 58,
      });
      const bundle = createLeafTabLocalBackupBundle({
        snapshot: filterLeafTabLocalBackupSnapshot(snapshot, exportScope),
        selectedScenarioId: exportScope?.shortcuts === false ? '' : selectedScenarioId,
        bookmarkScope: leafTabBookmarkSyncScope,
        exportScope,
        rootPath: leafTabSyncRootPath || 'leaftab/v1',
        appVersion: globalThis.chrome?.runtime?.getManifest?.().version || '',
      });
      update({
        title: t('settings.backup.progress.exportGeneratingTitle', { defaultValue: '正在生成导出文件' }),
        detail: t('settings.backup.progress.exportGeneratingDetail', { defaultValue: '马上就可以保存到本地' }),
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
    buildSnapshotFromCurrentState,
    leafTabBookmarkSyncScope,
    leafTabSyncRootPath,
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
      title: t('settings.backup.progress.cloudBackupLongTaskTitle', { defaultValue: '正在备份云端当前数据' }),
      detail: t('settings.backup.progress.cloudBackupLongTaskDetail', { defaultValue: '导入前会先保存一份当前账号云端副本' }),
      progress: 6,
    }, async ({ update }) => {
      update({
        title: t('settings.backup.progress.cloudBackupReadingTitle', { defaultValue: '正在读取云端当前数据' }),
        detail: t('settings.backup.progress.cloudBackupReadingDetail', { defaultValue: '正在生成导入前备份，避免误覆盖' }),
        progress: 18,
      });
      await downloadCloudBackupEnvelope();
      update({
        title: t('settings.backup.progress.cloudBackupImportingTitle', { defaultValue: '正在导入备份数据' }),
        detail: t('settings.backup.progress.cloudBackupImportingDetail', { defaultValue: '正在把你选择的数据写入当前设备' }),
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

  const handleImportBackupDialogOpenChange = useCallback((open: boolean) => {
    setImportBackupDialogOpen(open);
    if (!open) {
      setImportBackupScopePayload(null);
    }
  }, []);

  const handleImportBackupScopeConfirm = useCallback(async (scope: LeafTabLocalBackupExportScope) => {
    if (!importBackupScopePayload) return;
    const narrowedImport = restrictLeafTabLocalBackupImportScope(importBackupScopePayload, scope);
    setImportBackupScopePayload(null);
    await proceedImportData(narrowedImport);
  }, [importBackupScopePayload, proceedImportData]);

  return {
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
  };
}
