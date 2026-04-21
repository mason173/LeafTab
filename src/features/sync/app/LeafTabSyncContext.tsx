import { createContext, useContext, type ReactNode } from 'react';
import type { LeafTabSyncRuntimeController } from '@/features/sync/app/useLeafTabSyncRuntimeController';

const LeafTabSyncContext = createContext<LeafTabSyncRuntimeController | null>(null);

export function LeafTabSyncProvider({
  value,
  children,
}: {
  value: LeafTabSyncRuntimeController;
  children: ReactNode;
}) {
  return (
    <LeafTabSyncContext.Provider value={value}>
      {children}
    </LeafTabSyncContext.Provider>
  );
}

export function useLeafTabSyncContext() {
  const value = useContext(LeafTabSyncContext);
  if (!value) {
    throw new Error('useLeafTabSyncContext must be used within LeafTabSyncProvider');
  }
  return value;
}
