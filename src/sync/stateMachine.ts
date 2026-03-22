export type SyncStateStatus = 'idle' | 'syncing' | 'conflict' | 'error';

export type SyncState = {
  status: SyncStateStatus;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage: string;
};

type SyncStateEvent =
  | { type: 'start' }
  | { type: 'success'; at?: number }
  | { type: 'conflict' }
  | { type: 'error'; message?: string; at?: number }
  | { type: 'idle' };

export const createInitialSyncState = (): SyncState => ({
  status: 'idle',
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: '',
});

export const reduceSyncState = (state: SyncState, event: SyncStateEvent): SyncState => {
  switch (event.type) {
    case 'start':
      return { ...state, status: 'syncing' };
    case 'success':
      return {
        ...state,
        status: 'idle',
        lastSuccessAt: Number.isFinite(event.at as number) ? Number(event.at) : Date.now(),
        lastErrorAt: null,
        lastErrorMessage: '',
      };
    case 'conflict':
      return { ...state, status: 'conflict' };
    case 'error':
      return {
        ...state,
        status: 'error',
        lastErrorAt: Number.isFinite(event.at as number) ? Number(event.at) : Date.now(),
        lastErrorMessage: (event.message || '').trim(),
      };
    case 'idle':
      return { ...state, status: 'idle' };
    default:
      return state;
  }
};
