import { useCallback, useState } from 'react';
import { createInitialSyncState, reduceSyncState, type SyncState } from './stateMachine';

export const useSyncState = () => {
  const [syncState, setSyncState] = useState<SyncState>(() => createInitialSyncState());

  const markSyncStart = useCallback(() => {
    setSyncState((prev) => reduceSyncState(prev, { type: 'start' }));
  }, []);

  const markSyncSuccess = useCallback(() => {
    setSyncState((prev) => reduceSyncState(prev, { type: 'success' }));
  }, []);

  const markSyncConflict = useCallback(() => {
    setSyncState((prev) => reduceSyncState(prev, { type: 'conflict' }));
  }, []);

  const markSyncError = useCallback((message?: string) => {
    setSyncState((prev) => reduceSyncState(prev, { type: 'error', message }));
  }, []);

  const markSyncIdle = useCallback(() => {
    setSyncState((prev) => reduceSyncState(prev, { type: 'idle' }));
  }, []);

  return {
    syncState,
    markSyncStart,
    markSyncSuccess,
    markSyncConflict,
    markSyncError,
    markSyncIdle,
  };
};
