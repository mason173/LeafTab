import { useEffect, useState } from 'react';

export type LeafTabSyncRuntimeModule = typeof import('@/sync/leaftab/runtime');
export type LeafTabSyncSnapshotRuntimeModule = typeof import('@/sync/leaftab/snapshotRuntime');
export type LeafTabSyncEncryptionRuntimeModule = typeof import('@/sync/leaftab/encryptionRuntime');
export type LeafTabLocalBackupRuntimeModule = typeof import('@/sync/leaftab/localBackupRuntime');

let syncRuntimePromise: Promise<LeafTabSyncRuntimeModule> | null = null;
let snapshotRuntimePromise: Promise<LeafTabSyncSnapshotRuntimeModule> | null = null;
let encryptionRuntimePromise: Promise<LeafTabSyncEncryptionRuntimeModule> | null = null;
let localBackupRuntimePromise: Promise<LeafTabLocalBackupRuntimeModule> | null = null;

export const importLeafTabSyncRuntime = () => {
  if (!syncRuntimePromise) {
    syncRuntimePromise = import('@/sync/leaftab/runtime');
  }
  return syncRuntimePromise;
};

export const importLeafTabSyncSnapshotRuntime = () => {
  if (!snapshotRuntimePromise) {
    snapshotRuntimePromise = import('@/sync/leaftab/snapshotRuntime');
  }
  return snapshotRuntimePromise;
};

export const importLeafTabSyncEncryptionRuntime = () => {
  if (!encryptionRuntimePromise) {
    encryptionRuntimePromise = import('@/sync/leaftab/encryptionRuntime');
  }
  return encryptionRuntimePromise;
};

export const importLeafTabLocalBackupRuntime = () => {
  if (!localBackupRuntimePromise) {
    localBackupRuntimePromise = import('@/sync/leaftab/localBackupRuntime');
  }
  return localBackupRuntimePromise;
};

export function useLeafTabSyncRuntime(enabled: boolean) {
  const [runtime, setRuntime] = useState<LeafTabSyncRuntimeModule | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    void importLeafTabSyncRuntime().then((loaded) => {
      if (!disposed) {
        setRuntime(loaded);
      }
    });

    return () => {
      disposed = true;
    };
  }, [enabled]);

  return runtime;
}
