import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { LeafTabDangerousSyncDialog } from '@/components/sync/LeafTabDangerousSyncDialog';
import {
  LazyLeafTabSyncDialog,
  LazyLeafTabSyncEncryptionDialog,
} from '@/lazy/components';
import { useLeafTabSyncContext } from '@/features/sync/app/LeafTabSyncContext';

export type ShortcutSyncDialogsRootProps = {
  shouldMountLeafTabSyncDialog: boolean;
  shouldMountLeafTabSyncEncryptionDialog: boolean;
  leafTabSyncDialogOpen: boolean;
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  setSyncConfigBackTarget: (target: 'settings' | 'sync-center') => void;
  user: string | null;
};

export function ShortcutSyncDialogsRoot({
  shouldMountLeafTabSyncDialog,
  shouldMountLeafTabSyncEncryptionDialog,
  leafTabSyncDialogOpen,
  setLeafTabSyncDialogOpen,
  setSyncConfigBackTarget,
  user,
}: ShortcutSyncDialogsRootProps) {
  const { t } = useTranslation();
  const sync = useLeafTabSyncContext();

  const leafTabSyncDialogProps = {
    open: leafTabSyncDialogOpen,
    onOpenChange: sync.actions.handleLeafTabSyncDialogOpenChange,
    cloudAnalysis: sync.state.cloudLeafTabSyncAnalysis,
    webdavAnalysis: sync.state.leafTabSyncAnalysis,
    syncState: sync.state.leafTabSyncState,
    cloudSyncState: sync.state.cloudLeafTabSyncState,
    ready: sync.state.leafTabSyncReady,
    hasConfig: sync.state.leafTabSyncHasConfig,
    busy: sync.state.leafTabSyncState.status === 'syncing' || sync.state.cloudLeafTabSyncState.status === 'syncing',
    bookmarkScopeLabel: sync.state.leafTabBookmarkSyncScopeLabel,
    summaryText: sync.state.cloudLeafTabSyncLastResult?.summaryText || sync.state.leafTabSyncLastResult?.summaryText || '',
    cloudSignedIn: Boolean(user),
    cloudEnabled: sync.state.cloudSyncEnabled,
    cloudSyncBookmarksEnabled: sync.state.cloudSyncBookmarksEnabled,
    cloudUsername: user || '',
    cloudLastSyncLabel: sync.state.cloudLastSyncLabel,
    cloudNextSyncLabel: sync.state.cloudNextSyncLabel,
    cloudEncryptionReady: sync.state.cloudSyncEncryptionReady,
    webdavConfigured: sync.state.leafTabWebdavConfigured,
    webdavEnabled: sync.state.leafTabWebdavEnabled,
    webdavSyncBookmarksEnabled: sync.state.webdavSyncBookmarksEnabled,
    webdavProfileLabel: sync.state.leafTabWebdavProfileLabel,
    webdavUrlLabel: sync.state.leafTabSyncWebdavConfig?.url || '',
    webdavLastSyncLabel: sync.state.leafTabWebdavLastSyncLabel,
    webdavNextSyncLabel: sync.state.leafTabWebdavNextSyncLabel,
    webdavEncryptionReady: sync.state.leafTabWebdavEncryptionReady,
    onCloudSyncNow: () => {
      setLeafTabSyncDialogOpen(false);
      void sync.actions.handleCloudSyncNowFromCenter();
    },
    onOpenCloudConfig: sync.actions.handleOpenCloudSyncConfigFromSyncCenter,
    onCloudLogin: () => {
      const shouldOpenLogin = sync.actions.handleRequestCloudLogin();
      if (shouldOpenLogin) {
        setLeafTabSyncDialogOpen(false);
      }
    },
    onCloudRepairPull: () => {
      void sync.actions.handleCloudRepairFromCenter('pull-remote');
    },
    onCloudRepairPush: () => {
      void sync.actions.handleCloudRepairFromCenter('push-local');
    },
    onSyncNow: () => {
      setSyncConfigBackTarget('sync-center');
      setLeafTabSyncDialogOpen(false);
      void sync.actions.handleWebdavSyncNowFromCenter();
    },
    onOpenConfig: () => {
      sync.actions.handleOpenWebdavConfigFromSyncCenter();
    },
    onOpenSetupConfig: () => {
      sync.actions.handleOpenWebdavConfigFromSyncCenter({
        showConnectionFields: true,
        enableAfterSave: true,
      });
    },
    onWebdavRepairPull: () => {
      void sync.actions.handleWebdavRepairFromCenter('pull-remote');
    },
    onWebdavRepairPush: () => {
      void sync.actions.handleWebdavRepairFromCenter('push-local');
    },
  };

  const leafTabSyncEncryptionDialogProps = {
    open: Boolean(sync.state.syncEncryptionDialogState?.open),
    mode: sync.state.syncEncryptionDialogState?.mode || 'setup',
    providerLabel: sync.state.syncEncryptionDialogState?.providerLabel || t('leaftabSync.provider.generic', { defaultValue: '同步' }),
    busy: sync.state.syncEncryptionDialogBusy,
    onOpenChange: sync.actions.handleSyncEncryptionDialogOpenChange,
    onSubmit: sync.actions.handleSubmitSyncEncryptionDialog,
  };

  const dangerousSyncDialogProps = sync.state.dangerousSyncDialogState?.open
    ? {
        open: sync.state.dangerousSyncDialogState.open,
        onOpenChange: (open: boolean) => {
          if (!open) {
            sync.actions.closeDangerousSyncDialog();
          }
        },
        provider: sync.state.dangerousSyncDialogState.provider,
        localBookmarkCount: sync.state.dangerousSyncDialogState.localBookmarkCount,
        remoteBookmarkCount: sync.state.dangerousSyncDialogState.remoteBookmarkCount,
        detectedFromCount: sync.state.dangerousSyncDialogState.detectedFromCount,
        detectedToCount: sync.state.dangerousSyncDialogState.detectedToCount,
        busyAction: sync.state.dangerousSyncDialogBusyAction,
        onContinueWithoutBookmarks: () => {
          void sync.actions.handleDangerousSyncDialogContinueWithoutBookmarks();
        },
        onDefer: sync.actions.handleDangerousSyncDialogDefer,
        onUseRemote: () => {
          void sync.actions.handleDangerousSyncDialogUseRemote();
        },
        onUseLocal: () => {
          void sync.actions.handleDangerousSyncDialogUseLocal();
        },
      }
    : null;

  return (
    <>
      {shouldMountLeafTabSyncDialog ? (
        <Suspense fallback={null}>
          <LazyLeafTabSyncDialog {...leafTabSyncDialogProps} />
        </Suspense>
      ) : null}
      {shouldMountLeafTabSyncEncryptionDialog ? (
        <Suspense fallback={null}>
          <LazyLeafTabSyncEncryptionDialog {...leafTabSyncEncryptionDialogProps} />
        </Suspense>
      ) : null}
      {dangerousSyncDialogProps?.open ? (
        <LeafTabDangerousSyncDialog {...dangerousSyncDialogProps} />
      ) : null}
    </>
  );
}
