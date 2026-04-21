import { useMemo } from 'react';
import type { ShortcutSyncDialogsRootProps } from '@/features/shortcuts/app/ShortcutSyncDialogsRoot';

export type UseShortcutSyncDialogsRootPropsParams = {
  shouldMountLeafTabSyncDialog: boolean;
  shouldMountLeafTabSyncEncryptionDialog: boolean;
  leafTabSyncDialogOpen: boolean;
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  setSyncConfigBackTarget: (target: 'settings' | 'sync-center') => void;
  user: string | null;
};

export function useShortcutSyncDialogsRootProps(
  params: UseShortcutSyncDialogsRootPropsParams,
): ShortcutSyncDialogsRootProps {
  return useMemo(() => ({
    shouldMountLeafTabSyncDialog: params.shouldMountLeafTabSyncDialog,
    shouldMountLeafTabSyncEncryptionDialog: params.shouldMountLeafTabSyncEncryptionDialog,
    leafTabSyncDialogOpen: params.leafTabSyncDialogOpen,
    setLeafTabSyncDialogOpen: params.setLeafTabSyncDialogOpen,
    setSyncConfigBackTarget: params.setSyncConfigBackTarget,
    user: params.user,
  }), [params]);
}
