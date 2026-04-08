import { useCallback, useRef, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import i18n from '@/i18n';
import {
  clearLeafTabSyncEncryptionConfig,
  emitLeafTabSyncEncryptionChanged,
  readLeafTabSyncEncryptionConfig,
  type LeafTabSyncEncryptionMetadata,
  writeLeafTabSyncEncryptionConfig,
} from '@/utils/leafTabSyncEncryption';
import {
  createLeafTabSyncEncryptionMetadata,
  deriveLeafTabSyncKey,
  parseLeafTabSyncKeyBytes,
  serializeLeafTabSyncKeyBytes,
  verifyLeafTabSyncKey,
} from '@/sync/leaftab';

export type LeafTabSyncEncryptionDialogState = {
  open: boolean;
  mode: 'setup' | 'unlock';
  scopeKey: string;
  scopeLabel: string;
  providerLabel: string;
  metadata: LeafTabSyncEncryptionMetadata | null;
};

type EncryptionTransport = {
  readEncryptionState: () => Promise<{ metadata: LeafTabSyncEncryptionMetadata | null }>;
} | null;

type UseLeafTabSyncEncryptionManagerOptions = {
  setSettingsOpen: (open: boolean) => void;
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  setWebdavDialogOpen: (open: boolean) => void;
  setCloudSyncConfigOpen: (open: boolean) => void;
  leafTabWebdavEncryptionScopeKey: string;
  leafTabWebdavEncryptedTransport: EncryptionTransport;
  cloudSyncEncryptionScopeKey: string;
  cloudSyncEncryptedTransport: EncryptionTransport;
};

export function useLeafTabSyncEncryptionManager({
  setSettingsOpen,
  setLeafTabSyncDialogOpen,
  setWebdavDialogOpen,
  setCloudSyncConfigOpen,
  leafTabWebdavEncryptionScopeKey,
  leafTabWebdavEncryptedTransport,
  cloudSyncEncryptionScopeKey,
  cloudSyncEncryptedTransport,
}: UseLeafTabSyncEncryptionManagerOptions) {
  const [syncEncryptionDialogState, setSyncEncryptionDialogState] = useState<LeafTabSyncEncryptionDialogState | null>(null);
  const [syncEncryptionDialogBusy, setSyncEncryptionDialogBusy] = useState(false);
  const syncEncryptionDialogResolverRef = useRef<((value: boolean) => void) | null>(null);

  const resolveSyncEncryptionDialog = useCallback((confirmed: boolean) => {
    const resolver = syncEncryptionDialogResolverRef.current;
    syncEncryptionDialogResolverRef.current = null;
    setSyncEncryptionDialogState((current) => (current ? { ...current, open: false } : null));
    if (resolver) {
      resolver(confirmed);
    }
  }, []);

  const requestSyncEncryptionDialog = useCallback((params: {
    mode: 'setup' | 'unlock';
    scopeKey: string;
    scopeLabel: string;
    providerLabel: string;
    metadata?: LeafTabSyncEncryptionMetadata | null;
  }) => {
    return new Promise<boolean>((resolve) => {
      syncEncryptionDialogResolverRef.current = resolve;
      setSettingsOpen(false);
      setLeafTabSyncDialogOpen(false);
      setWebdavDialogOpen(false);
      setCloudSyncConfigOpen(false);
      setSyncEncryptionDialogState({
        open: true,
        mode: params.mode,
        scopeKey: params.scopeKey,
        scopeLabel: params.scopeLabel,
        providerLabel: params.providerLabel,
        metadata: params.metadata || null,
      });
    });
  }, [
    setCloudSyncConfigOpen,
    setLeafTabSyncDialogOpen,
    setSettingsOpen,
    setWebdavDialogOpen,
  ]);

  const handleSyncEncryptionDialogOpenChange = useCallback((open: boolean) => {
    if (open) return;
    resolveSyncEncryptionDialog(false);
  }, [resolveSyncEncryptionDialog]);

  const handleSubmitSyncEncryptionDialog = useCallback(async (payload: { passphrase: string }) => {
    const request = syncEncryptionDialogState;
    if (!request) return;
    setSyncEncryptionDialogBusy(true);
    try {
      let metadata = request.metadata;
      let keyBytes: Uint8Array;

      if (request.mode === 'setup') {
        const created = await createLeafTabSyncEncryptionMetadata(payload.passphrase);
        metadata = created.metadata;
        keyBytes = created.keyBytes;
      } else {
        if (!metadata) {
          throw new Error(i18n.t('leaftabSyncEncryption.errors.missingMetadata', { defaultValue: '缺少同步加密元数据' }));
        }
        keyBytes = await deriveLeafTabSyncKey(payload.passphrase, metadata);
        const valid = await verifyLeafTabSyncKey(keyBytes, metadata);
        if (!valid) {
          throw new Error(i18n.t('leaftabSyncEncryption.errors.incorrectPassphrase', { defaultValue: '同步口令不正确' }));
        }
      }

      if (!metadata) {
        throw new Error(i18n.t('leaftabSyncEncryption.errors.invalidConfig', { defaultValue: '同步加密配置无效' }));
      }

      writeLeafTabSyncEncryptionConfig(
        request.scopeKey,
        metadata,
        serializeLeafTabSyncKeyBytes(keyBytes),
      );
      emitLeafTabSyncEncryptionChanged();
      toast.success(request.mode === 'setup'
        ? i18n.t('leaftabSyncEncryption.toast.saved', { defaultValue: '同步口令已保存' })
        : i18n.t('leaftabSyncEncryption.toast.unlocked', { defaultValue: '同步数据已解锁' }));
      resolveSyncEncryptionDialog(true);
    } catch (error) {
      toast.error(String((error as Error)?.message || i18n.t('leaftabSyncEncryption.toast.saveFailed', { defaultValue: '保存同步口令失败' })));
    } finally {
      setSyncEncryptionDialogBusy(false);
    }
  }, [resolveSyncEncryptionDialog, syncEncryptionDialogState]);

  const ensureSyncEncryptionAccess = useCallback(async (params: {
    providerLabel: string;
    scopeKey: string;
    transport: EncryptionTransport;
  }) => {
    if (!params.scopeKey) return false;
    const localConfig = readLeafTabSyncEncryptionConfig(params.scopeKey);
    if (localConfig?.cachedKey && localConfig?.metadata) {
      const keyBytes = parseLeafTabSyncKeyBytes(localConfig.cachedKey);
      const valid = await verifyLeafTabSyncKey(keyBytes, localConfig.metadata).catch(() => false);
      if (valid) return true;
      clearLeafTabSyncEncryptionConfig(params.scopeKey);
      emitLeafTabSyncEncryptionChanged();
    }

    let remoteMetadata: LeafTabSyncEncryptionMetadata | null = null;
    if (params.transport) {
      try {
        const remoteState = await params.transport.readEncryptionState();
        remoteMetadata = remoteState.metadata || null;
      } catch {}
    }

    return requestSyncEncryptionDialog({
      mode: remoteMetadata ? 'unlock' : 'setup',
      scopeKey: params.scopeKey,
      scopeLabel: params.providerLabel,
      providerLabel: params.providerLabel,
      metadata: remoteMetadata,
    });
  }, [requestSyncEncryptionDialog]);

  const handleManageWebdavSyncEncryption = useCallback(async () => {
    setLeafTabSyncDialogOpen(false);
    setWebdavDialogOpen(false);
    return ensureSyncEncryptionAccess({
      providerLabel: i18n.t('leaftabSync.provider.webdav', { defaultValue: 'WebDAV 同步' }),
      scopeKey: leafTabWebdavEncryptionScopeKey,
      transport: leafTabWebdavEncryptedTransport,
    });
  }, [
    ensureSyncEncryptionAccess,
    leafTabWebdavEncryptedTransport,
    leafTabWebdavEncryptionScopeKey,
    setLeafTabSyncDialogOpen,
    setWebdavDialogOpen,
  ]);

  const handleManageCloudSyncEncryption = useCallback(async () => {
    setLeafTabSyncDialogOpen(false);
    setCloudSyncConfigOpen(false);
    return ensureSyncEncryptionAccess({
      providerLabel: i18n.t('leaftabSync.provider.cloud', { defaultValue: '云同步' }),
      scopeKey: cloudSyncEncryptionScopeKey,
      transport: cloudSyncEncryptedTransport,
    });
  }, [
    cloudSyncEncryptedTransport,
    cloudSyncEncryptionScopeKey,
    ensureSyncEncryptionAccess,
    setCloudSyncConfigOpen,
    setLeafTabSyncDialogOpen,
  ]);

  const resolveSyncEncryptionError = useCallback(async (
    providerLabel: string,
    error: unknown,
  ) => {
    if (!(error && typeof error === 'object' && 'mode' in error && 'scopeKey' in error && 'scopeLabel' in error && 'metadata' in error)) {
      return false;
    }

    const typed = error as {
      mode: 'setup' | 'unlock';
      scopeKey: string;
      scopeLabel: string;
      metadata: LeafTabSyncEncryptionMetadata | null;
    };

    return requestSyncEncryptionDialog({
      mode: typed.mode,
      scopeKey: typed.scopeKey,
      scopeLabel: typed.scopeLabel,
      providerLabel,
      metadata: typed.metadata,
    });
  }, [requestSyncEncryptionDialog]);

  return {
    syncEncryptionDialogState,
    syncEncryptionDialogBusy,
    handleSyncEncryptionDialogOpenChange,
    handleSubmitSyncEncryptionDialog,
    ensureSyncEncryptionAccess,
    handleManageWebdavSyncEncryption,
    handleManageCloudSyncEncryption,
    resolveSyncEncryptionError,
  };
}
