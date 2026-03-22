import type { SyncConflictPolicy } from '@/sync/core';

export type WebdavConfig = {
  url: string;
  username: string;
  password: string;
  filePath: string;
  syncOptions?: {
    enabled?: boolean;
    syncBySchedule: boolean;
    syncIntervalMinutes: number;
    syncConflictPolicy: SyncConflictPolicy;
  };
};
