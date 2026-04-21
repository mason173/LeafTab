import { useMemo, type ReactNode } from 'react';
import { getStrictContext } from '@/lib/get-strict-context';
import type { LeafTabSyncRuntimeController } from '@/features/sync/app/useLeafTabSyncRuntimeController';

export type LeafTabSyncStatusState = Pick<
  LeafTabSyncRuntimeController['state'],
  | 'leafTabSyncState'
  | 'cloudLeafTabSyncState'
  | 'topNavSyncStatus'
>;

export type LeafTabSyncDialogState = Pick<
  LeafTabSyncRuntimeController['state'],
  | 'syncEncryptionDialogState'
  | 'syncEncryptionDialogBusy'
  | 'importConfirmOpen'
  | 'importPendingPayload'
  | 'importConfirmBusy'
  | 'exportBackupDialogOpen'
  | 'importBackupDialogOpen'
  | 'importBackupScopePayload'
  | 'dangerousSyncDialogState'
  | 'dangerousSyncDialogBusyAction'
>;

export type LeafTabSyncConfigState = Pick<
  LeafTabSyncRuntimeController['state'],
  | 'leafTabSyncAnalysis'
  | 'leafTabSyncHasConfig'
  | 'leafTabSyncReady'
  | 'leafTabSyncLastResult'
  | 'cloudLeafTabSyncAnalysis'
  | 'cloudLeafTabSyncHasConfig'
  | 'cloudLeafTabSyncLastResult'
  | 'leafTabSyncWebdavConfig'
  | 'leafTabWebdavEncryptionReady'
  | 'webdavSyncBookmarksEnabled'
  | 'cloudSyncBookmarksEnabled'
  | 'cloudSyncEncryptionReady'
  | 'leafTabWebdavConfigured'
  | 'leafTabWebdavEnabled'
  | 'leafTabWebdavProfileLabel'
  | 'leafTabWebdavLastSyncLabel'
  | 'leafTabWebdavNextSyncLabel'
  | 'cloudSyncEnabled'
  | 'cloudLastSyncLabel'
  | 'cloudNextSyncLabel'
  | 'leafTabBookmarkSyncScopeLabel'
>;

export type LeafTabSyncActions = LeafTabSyncRuntimeController['actions'];
export type LeafTabSyncMeta = LeafTabSyncRuntimeController['meta'];

const [LeafTabSyncControllerProvider, useLeafTabSyncContext] =
  getStrictContext<LeafTabSyncRuntimeController>('LeafTabSyncProvider');
const [LeafTabSyncStatusProvider, useLeafTabSyncStatusContext] =
  getStrictContext<LeafTabSyncStatusState>('LeafTabSyncStatusProvider');
const [LeafTabSyncDialogProvider, useLeafTabSyncDialogContext] =
  getStrictContext<LeafTabSyncDialogState>('LeafTabSyncDialogProvider');
const [LeafTabSyncConfigProvider, useLeafTabSyncConfigContext] =
  getStrictContext<LeafTabSyncConfigState>('LeafTabSyncConfigProvider');
const [LeafTabSyncActionsProvider, useLeafTabSyncActionsContext] =
  getStrictContext<LeafTabSyncActions>('LeafTabSyncActionsProvider');
const [LeafTabSyncMetaProvider, useLeafTabSyncMetaContext] =
  getStrictContext<LeafTabSyncMeta>('LeafTabSyncMetaProvider');

export {
  useLeafTabSyncContext,
  useLeafTabSyncStatusContext,
  useLeafTabSyncDialogContext,
  useLeafTabSyncConfigContext,
  useLeafTabSyncActionsContext,
  useLeafTabSyncMetaContext,
};

export function LeafTabSyncProvider({
  value,
  children,
}: {
  value: LeafTabSyncRuntimeController;
  children: ReactNode;
}) {
  const status = useMemo<LeafTabSyncStatusState>(() => ({
    leafTabSyncState: value.state.leafTabSyncState,
    cloudLeafTabSyncState: value.state.cloudLeafTabSyncState,
    topNavSyncStatus: value.state.topNavSyncStatus,
  }), [
    value.state.leafTabSyncState,
    value.state.cloudLeafTabSyncState,
    value.state.topNavSyncStatus,
  ]);

  const dialogs = useMemo<LeafTabSyncDialogState>(() => ({
    syncEncryptionDialogState: value.state.syncEncryptionDialogState,
    syncEncryptionDialogBusy: value.state.syncEncryptionDialogBusy,
    importConfirmOpen: value.state.importConfirmOpen,
    importPendingPayload: value.state.importPendingPayload,
    importConfirmBusy: value.state.importConfirmBusy,
    exportBackupDialogOpen: value.state.exportBackupDialogOpen,
    importBackupDialogOpen: value.state.importBackupDialogOpen,
    importBackupScopePayload: value.state.importBackupScopePayload,
    dangerousSyncDialogState: value.state.dangerousSyncDialogState,
    dangerousSyncDialogBusyAction: value.state.dangerousSyncDialogBusyAction,
  }), [
    value.state.syncEncryptionDialogState,
    value.state.syncEncryptionDialogBusy,
    value.state.importConfirmOpen,
    value.state.importPendingPayload,
    value.state.importConfirmBusy,
    value.state.exportBackupDialogOpen,
    value.state.importBackupDialogOpen,
    value.state.importBackupScopePayload,
    value.state.dangerousSyncDialogState,
    value.state.dangerousSyncDialogBusyAction,
  ]);

  const config = useMemo<LeafTabSyncConfigState>(() => ({
    leafTabSyncAnalysis: value.state.leafTabSyncAnalysis,
    leafTabSyncHasConfig: value.state.leafTabSyncHasConfig,
    leafTabSyncReady: value.state.leafTabSyncReady,
    leafTabSyncLastResult: value.state.leafTabSyncLastResult,
    cloudLeafTabSyncAnalysis: value.state.cloudLeafTabSyncAnalysis,
    cloudLeafTabSyncHasConfig: value.state.cloudLeafTabSyncHasConfig,
    cloudLeafTabSyncLastResult: value.state.cloudLeafTabSyncLastResult,
    leafTabSyncWebdavConfig: value.state.leafTabSyncWebdavConfig,
    leafTabWebdavEncryptionReady: value.state.leafTabWebdavEncryptionReady,
    webdavSyncBookmarksEnabled: value.state.webdavSyncBookmarksEnabled,
    cloudSyncBookmarksEnabled: value.state.cloudSyncBookmarksEnabled,
    cloudSyncEncryptionReady: value.state.cloudSyncEncryptionReady,
    leafTabWebdavConfigured: value.state.leafTabWebdavConfigured,
    leafTabWebdavEnabled: value.state.leafTabWebdavEnabled,
    leafTabWebdavProfileLabel: value.state.leafTabWebdavProfileLabel,
    leafTabWebdavLastSyncLabel: value.state.leafTabWebdavLastSyncLabel,
    leafTabWebdavNextSyncLabel: value.state.leafTabWebdavNextSyncLabel,
    cloudSyncEnabled: value.state.cloudSyncEnabled,
    cloudLastSyncLabel: value.state.cloudLastSyncLabel,
    cloudNextSyncLabel: value.state.cloudNextSyncLabel,
    leafTabBookmarkSyncScopeLabel: value.state.leafTabBookmarkSyncScopeLabel,
  }), [
    value.state.leafTabSyncAnalysis,
    value.state.leafTabSyncHasConfig,
    value.state.leafTabSyncReady,
    value.state.leafTabSyncLastResult,
    value.state.cloudLeafTabSyncAnalysis,
    value.state.cloudLeafTabSyncHasConfig,
    value.state.cloudLeafTabSyncLastResult,
    value.state.leafTabSyncWebdavConfig,
    value.state.leafTabWebdavEncryptionReady,
    value.state.webdavSyncBookmarksEnabled,
    value.state.cloudSyncBookmarksEnabled,
    value.state.cloudSyncEncryptionReady,
    value.state.leafTabWebdavConfigured,
    value.state.leafTabWebdavEnabled,
    value.state.leafTabWebdavProfileLabel,
    value.state.leafTabWebdavLastSyncLabel,
    value.state.leafTabWebdavNextSyncLabel,
    value.state.cloudSyncEnabled,
    value.state.cloudLastSyncLabel,
    value.state.cloudNextSyncLabel,
    value.state.leafTabBookmarkSyncScopeLabel,
  ]);

  const actions = useMemo<LeafTabSyncActions>(() => value.actions, [value.actions]);
  const meta = useMemo<LeafTabSyncMeta>(() => value.meta, [value.meta]);

  return (
    <LeafTabSyncControllerProvider value={value}>
      <LeafTabSyncStatusProvider value={status}>
        <LeafTabSyncDialogProvider value={dialogs}>
          <LeafTabSyncConfigProvider value={config}>
            <LeafTabSyncActionsProvider value={actions}>
              <LeafTabSyncMetaProvider value={meta}>
                {children}
              </LeafTabSyncMetaProvider>
            </LeafTabSyncActionsProvider>
          </LeafTabSyncConfigProvider>
        </LeafTabSyncDialogProvider>
      </LeafTabSyncStatusProvider>
    </LeafTabSyncControllerProvider>
  );
}
