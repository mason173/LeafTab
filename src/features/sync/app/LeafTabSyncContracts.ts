import type { Dispatch, SetStateAction } from 'react';
import type {
  LeafTabLocalBackupExportScope,
  LeafTabLocalBackupImportData,
  LeafTabSyncAnalysis,
  LeafTabSyncEngineResult,
  LeafTabSyncInitialChoice,
} from '@/sync/leaftab';
import type { SyncState } from '@/sync/stateMachine';
import type { WebdavConfig } from '@/types/webdav';
import type { LeafTabSyncEncryptionDialogState } from '@/hooks/useLeafTabSyncEncryptionManager';
import type { LeafTabSyncRunnerOptionsBase } from '@/hooks/useLeafTabSyncRunner';

export type LeafTabTopNavSyncStatus = 'idle' | 'syncing' | 'error' | 'conflict';

export type LeafTabDangerousSyncDialogAction =
  | 'continue-without-bookmarks'
  | 'use-remote'
  | 'use-local'
  | null;

export type LeafTabDangerousSyncDialogState = {
  open: boolean;
  provider: 'cloud' | 'webdav';
  localBookmarkCount: number | null;
  remoteBookmarkCount: number | null;
  detectedFromCount: number;
  detectedToCount: number;
};

export type LeafTabSyncWebdavActionOptions = LeafTabSyncRunnerOptionsBase & {
  enableAfterSuccess?: boolean;
  skipBookmarksForThisRun?: boolean;
  allowConfigPrompt?: boolean;
  allowDangerousSyncPrompt?: boolean;
};

export type LeafTabSyncCloudActionOptions = LeafTabSyncRunnerOptionsBase & {
  mode?: LeafTabSyncInitialChoice | 'auto';
  allowWhenDisabled?: boolean;
  skipBookmarksForThisRun?: boolean;
  forceBookmarksForThisRun?: boolean;
  retryAfterForceUnlock?: boolean;
  retryAfterConflictRefresh?: boolean;
  _retriedAfterForceUnlock?: boolean;
  _retriedAfterConflictRefresh?: boolean;
};

export type LeafTabSyncStatusState = {
  leafTabSyncState: SyncState;
  cloudLeafTabSyncState: SyncState;
  topNavSyncStatus: LeafTabTopNavSyncStatus;
};

export type LeafTabSyncDialogState = {
  syncEncryptionDialogState: LeafTabSyncEncryptionDialogState | null;
  syncEncryptionDialogBusy: boolean;
  importConfirmOpen: boolean;
  importPendingPayload: LeafTabLocalBackupImportData | null;
  importConfirmBusy: boolean;
  exportBackupDialogOpen: boolean;
  importBackupDialogOpen: boolean;
  importBackupScopePayload: LeafTabLocalBackupImportData | null;
  dangerousSyncDialogState: LeafTabDangerousSyncDialogState | null;
  dangerousSyncDialogBusyAction: LeafTabDangerousSyncDialogAction;
};

export type LeafTabSyncConfigState = {
  leafTabSyncAnalysis: LeafTabSyncAnalysis | null;
  leafTabSyncHasConfig: boolean;
  leafTabSyncReady: boolean;
  leafTabSyncLastResult: LeafTabSyncEngineResult | null;
  cloudLeafTabSyncAnalysis: LeafTabSyncAnalysis | null;
  cloudLeafTabSyncHasConfig: boolean;
  cloudLeafTabSyncLastResult: LeafTabSyncEngineResult | null;
  leafTabSyncWebdavConfig: WebdavConfig | null;
  leafTabWebdavEncryptionReady: boolean;
  webdavSyncBookmarksEnabled: boolean;
  cloudSyncBookmarksEnabled: boolean;
  cloudSyncEncryptionReady: boolean;
  leafTabWebdavConfigured: boolean;
  leafTabWebdavEnabled: boolean;
  leafTabWebdavProfileLabel: string;
  leafTabWebdavLastSyncLabel: string;
  leafTabWebdavNextSyncLabel: string;
  cloudSyncEnabled: boolean;
  cloudLastSyncLabel: string;
  cloudNextSyncLabel: string;
  leafTabBookmarkSyncScopeLabel: string;
};

export type LeafTabSyncState =
  & LeafTabSyncStatusState
  & LeafTabSyncDialogState
  & LeafTabSyncConfigState;

export type LeafTabSyncActions = {
  queueCloudLoginSync: (username: string) => void;
  handleSyncEncryptionDialogOpenChange: (open: boolean) => void;
  handleSubmitSyncEncryptionDialog: (payload: { passphrase: string }) => Promise<void>;
  setImportConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setImportPendingPayload: Dispatch<SetStateAction<LeafTabLocalBackupImportData | null>>;
  setImportConfirmBusy: Dispatch<SetStateAction<boolean>>;
  setExportBackupDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleImportBackupDialogOpenChange: (open: boolean) => void;
  handleImportBackupScopeConfirm: (scope: LeafTabLocalBackupExportScope) => Promise<void>;
  handleExportData: () => Promise<void>;
  executeExportData: (exportScope?: LeafTabLocalBackupExportScope) => Promise<void>;
  handleImportData: (data: LeafTabLocalBackupImportData) => Promise<void>;
  handleImportConfirmApply: (payload: LeafTabLocalBackupImportData) => Promise<boolean>;
  handleLeafTabSync: (options?: LeafTabSyncWebdavActionOptions) => Promise<LeafTabSyncEngineResult | null>;
  handleCloudLeafTabSync: (options?: LeafTabSyncCloudActionOptions) => Promise<LeafTabSyncEngineResult | null>;
  handleEnableWebdavSync: () => Promise<void>;
  handleDisableWebdavSync: (options?: { clearLocal?: boolean }) => Promise<void>;
  handleOpenWebdavConfig: (options?: { enableAfterSave?: boolean; showConnectionFields?: boolean }) => boolean;
  handleOpenWebdavConfigFromSyncCenter: (options?: { enableAfterSave?: boolean; showConnectionFields?: boolean }) => void;
  handleLeafTabSyncDialogOpenChange: (open: boolean) => void;
  resolveLegacyCloudMigrationPrompt: (confirmed: boolean) => void;
  handleLeafTabAutoSync: () => Promise<boolean>;
  handleWebdavSyncNowFromCenter: () => Promise<boolean>;
  handleWebdavRepairFromCenter: (mode: LeafTabSyncInitialChoice) => Promise<boolean>;
  resolveWebdavConflict: (config: WebdavConfig) => Promise<void>;
  handleRequestCloudLogin: () => boolean;
  handleOpenCloudSyncConfigFromSyncCenter: () => void;
  handleCloudSyncNowFromCenter: (options?: { allowWhenDisabled?: boolean }) => Promise<boolean>;
  handleCloudRepairFromCenter: (mode: LeafTabSyncInitialChoice) => Promise<boolean>;
  handleCloudSyncConfigSaved: () => Promise<void>;
  closeDangerousSyncDialog: () => void;
  handleDangerousSyncDialogContinueWithoutBookmarks: () => Promise<void>;
  handleDangerousSyncDialogDefer: () => void;
  handleDangerousSyncDialogUseRemote: () => Promise<void>;
  handleDangerousSyncDialogUseLocal: () => Promise<void>;
  syncLocalToCloudBeforeLogout: () => Promise<boolean>;
};

export type LeafTabSyncMeta = {
  resolveLeafTabSyncRootPath: (config: WebdavConfig | null) => string;
};

export type LeafTabSyncFacade = {
  state: LeafTabSyncState;
  actions: LeafTabSyncActions;
  meta: LeafTabSyncMeta;
};
