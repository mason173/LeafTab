import { Suspense, memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeafTabDangerousSyncDialog } from '@/components/sync/LeafTabDangerousSyncDialog';
import {
  LazyLeafTabSyncDialog,
  LazyLeafTabSyncEncryptionDialog,
} from '@/lazy/components';
import {
  useLeafTabSyncActionsContext,
  useLeafTabSyncConfigContext,
  useLeafTabSyncDialogContext,
  useLeafTabSyncStatusContext,
} from '@/features/sync/app/LeafTabSyncContext';

function useKeepMountedAfterFirstOpen(open: boolean) {
  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  return hasOpened || open;
}

export type ShortcutSyncDialogsRootProps = {
  leafTabSyncDialogOpen: boolean;
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  setSyncConfigBackTarget: (target: 'settings' | 'sync-center') => void;
  user: string | null;
};

export const ShortcutSyncDialogsRoot = memo(function ShortcutSyncDialogsRoot({
  leafTabSyncDialogOpen,
  setLeafTabSyncDialogOpen,
  setSyncConfigBackTarget,
  user,
}: ShortcutSyncDialogsRootProps) {
  const { t } = useTranslation();
  const syncStatusState = useLeafTabSyncStatusContext();
  const syncDialogState = useLeafTabSyncDialogContext();
  const syncConfigState = useLeafTabSyncConfigContext();
  const syncActions = useLeafTabSyncActionsContext();
  const shouldMountLeafTabSyncDialog = useKeepMountedAfterFirstOpen(leafTabSyncDialogOpen);
  const shouldMountLeafTabSyncEncryptionDialog = useKeepMountedAfterFirstOpen(
    Boolean(syncDialogState.syncEncryptionDialogState?.open),
  );

  const leafTabSyncDialogProps = {
    open: leafTabSyncDialogOpen,
    onOpenChange: syncActions.handleLeafTabSyncDialogOpenChange,
    cloudAnalysis: syncConfigState.cloudLeafTabSyncAnalysis,
    webdavAnalysis: syncConfigState.leafTabSyncAnalysis,
    syncState: syncStatusState.leafTabSyncState,
    cloudSyncState: syncStatusState.cloudLeafTabSyncState,
    ready: syncConfigState.leafTabSyncReady,
    hasConfig: syncConfigState.leafTabSyncHasConfig,
    busy: syncStatusState.leafTabSyncState.status === 'syncing' || syncStatusState.cloudLeafTabSyncState.status === 'syncing',
    bookmarkScopeLabel: syncConfigState.leafTabBookmarkSyncScopeLabel,
    summaryText: syncConfigState.cloudLeafTabSyncLastResult?.summaryText || syncConfigState.leafTabSyncLastResult?.summaryText || '',
    cloudSignedIn: Boolean(user),
    cloudEnabled: syncConfigState.cloudSyncEnabled,
    cloudSyncBookmarksEnabled: syncConfigState.cloudSyncBookmarksEnabled,
    cloudUsername: user || '',
    cloudLastSyncLabel: syncConfigState.cloudLastSyncLabel,
    cloudNextSyncLabel: syncConfigState.cloudNextSyncLabel,
    cloudEncryptionReady: syncConfigState.cloudSyncEncryptionReady,
    webdavConfigured: syncConfigState.leafTabWebdavConfigured,
    webdavEnabled: syncConfigState.leafTabWebdavEnabled,
    webdavSyncBookmarksEnabled: syncConfigState.webdavSyncBookmarksEnabled,
    webdavProfileLabel: syncConfigState.leafTabWebdavProfileLabel,
    webdavUrlLabel: syncConfigState.leafTabSyncWebdavConfig?.url || '',
    webdavLastSyncLabel: syncConfigState.leafTabWebdavLastSyncLabel,
    webdavNextSyncLabel: syncConfigState.leafTabWebdavNextSyncLabel,
    webdavEncryptionReady: syncConfigState.leafTabWebdavEncryptionReady,
    onCloudSyncNow: () => {
      setLeafTabSyncDialogOpen(false);
      void syncActions.handleCloudSyncNowFromCenter();
    },
    onOpenCloudConfig: syncActions.handleOpenCloudSyncConfigFromSyncCenter,
    onCloudLogin: () => {
      const shouldOpenLogin = syncActions.handleRequestCloudLogin();
      if (shouldOpenLogin) {
        setLeafTabSyncDialogOpen(false);
      }
    },
    onCloudRepairPull: () => {
      void syncActions.handleCloudRepairFromCenter('pull-remote');
    },
    onCloudRepairPush: () => {
      void syncActions.handleCloudRepairFromCenter('push-local');
    },
    onSyncNow: () => {
      setSyncConfigBackTarget('sync-center');
      setLeafTabSyncDialogOpen(false);
      void syncActions.handleWebdavSyncNowFromCenter();
    },
    onOpenConfig: () => {
      syncActions.handleOpenWebdavConfigFromSyncCenter();
    },
    onOpenSetupConfig: () => {
      syncActions.handleOpenWebdavConfigFromSyncCenter({
        showConnectionFields: true,
        enableAfterSave: true,
      });
    },
    onWebdavRepairPull: () => {
      void syncActions.handleWebdavRepairFromCenter('pull-remote');
    },
    onWebdavRepairPush: () => {
      void syncActions.handleWebdavRepairFromCenter('push-local');
    },
  };

  const leafTabSyncEncryptionDialogProps = {
    open: Boolean(syncDialogState.syncEncryptionDialogState?.open),
    mode: syncDialogState.syncEncryptionDialogState?.mode || 'setup',
    providerLabel: syncDialogState.syncEncryptionDialogState?.providerLabel || t('leaftabSync.provider.generic', { defaultValue: '同步' }),
    busy: syncDialogState.syncEncryptionDialogBusy,
    onOpenChange: syncActions.handleSyncEncryptionDialogOpenChange,
    onSubmit: syncActions.handleSubmitSyncEncryptionDialog,
  };

  const dangerousSyncDialogProps = syncDialogState.dangerousSyncDialogState?.open
    ? {
        open: syncDialogState.dangerousSyncDialogState.open,
        onOpenChange: (open: boolean) => {
          if (!open) {
            syncActions.closeDangerousSyncDialog();
          }
        },
        provider: syncDialogState.dangerousSyncDialogState.provider,
        localBookmarkCount: syncDialogState.dangerousSyncDialogState.localBookmarkCount,
        remoteBookmarkCount: syncDialogState.dangerousSyncDialogState.remoteBookmarkCount,
        detectedFromCount: syncDialogState.dangerousSyncDialogState.detectedFromCount,
        detectedToCount: syncDialogState.dangerousSyncDialogState.detectedToCount,
        busyAction: syncDialogState.dangerousSyncDialogBusyAction,
        onContinueWithoutBookmarks: () => {
          void syncActions.handleDangerousSyncDialogContinueWithoutBookmarks();
        },
        onDefer: syncActions.handleDangerousSyncDialogDefer,
        onUseRemote: () => {
          void syncActions.handleDangerousSyncDialogUseRemote();
        },
        onUseLocal: () => {
          void syncActions.handleDangerousSyncDialogUseLocal();
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
});

ShortcutSyncDialogsRoot.displayName = 'ShortcutSyncDialogsRoot';
