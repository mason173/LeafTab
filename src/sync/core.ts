export type SyncConflictPolicy = 'prefer_local' | 'prefer_remote' | 'merge';

export type SyncConflictResolution<T> = {
  resolvedPayload: T;
  source: 'local' | 'remote' | 'merged';
};

export const toSyncPayloadJson = (payload: unknown) => JSON.stringify(payload);

export const areSyncPayloadsEqual = (left: unknown, right: unknown) => {
  return toSyncPayloadJson(left) === toSyncPayloadJson(right);
};

export const resolveSyncConflictPayload = <T>(
  localPayload: T,
  remotePayload: T,
  policy: SyncConflictPolicy,
  mergePayload?: (local: T, remote: T) => T
): SyncConflictResolution<T> => {
  if (policy === 'prefer_remote') {
    return { resolvedPayload: remotePayload, source: 'remote' };
  }
  if (policy === 'merge') {
    if (!mergePayload) {
      return { resolvedPayload: localPayload, source: 'local' };
    }
    return { resolvedPayload: mergePayload(localPayload, remotePayload), source: 'merged' };
  }
  return { resolvedPayload: localPayload, source: 'local' };
};

export const getAlignedNextRunAt = (intervalMs: number, nowMs = Date.now()) => {
  const safeIntervalMs = Math.max(1, Math.floor(intervalMs));
  const slot = Math.floor(nowMs / safeIntervalMs);
  return (slot + 1) * safeIntervalMs;
};

export const getRandomJitterMs = (maxJitterMs: number) => {
  const safeMax = Math.max(0, Math.floor(maxJitterMs));
  if (safeMax === 0) return 0;
  return Math.floor(Math.random() * (safeMax + 1));
};
