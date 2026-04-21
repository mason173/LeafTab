import { Suspense } from 'react';
import { LeafTabDangerousSyncDialog, type LeafTabDangerousSyncDialogProps } from '@/components/sync/LeafTabDangerousSyncDialog';
import type { LeafTabSyncDialogProps } from '@/components/sync/LeafTabSyncDialog';
import type { LeafTabSyncEncryptionDialogProps } from '@/components/sync/LeafTabSyncEncryptionDialog';
import {
  LazyLeafTabSyncDialog,
  LazyLeafTabSyncEncryptionDialog,
} from '@/lazy/components';

type ShortcutSyncDialogsLayerProps = {
  shouldMountLeafTabSyncDialog: boolean;
  leafTabSyncDialogProps: LeafTabSyncDialogProps;
  shouldMountLeafTabSyncEncryptionDialog: boolean;
  leafTabSyncEncryptionDialogProps: LeafTabSyncEncryptionDialogProps;
  dangerousSyncDialogProps?: LeafTabDangerousSyncDialogProps | null;
};

export function ShortcutSyncDialogsLayer({
  shouldMountLeafTabSyncDialog,
  leafTabSyncDialogProps,
  shouldMountLeafTabSyncEncryptionDialog,
  leafTabSyncEncryptionDialogProps,
  dangerousSyncDialogProps = null,
}: ShortcutSyncDialogsLayerProps) {
  return (
    <>
      {shouldMountLeafTabSyncDialog ? (
        <Suspense fallback={null}>
          <LazyLeafTabSyncDialog {...leafTabSyncDialogProps} />
        </Suspense>
      ) : null}
      {shouldMountLeafTabSyncEncryptionDialog ? (
        <Suspense fallback={null}>
          <LazyLeafTabSyncEncryptionDialog {...leafTabSyncEncryptionDialogProps} />
        </Suspense>
      ) : null}
      {dangerousSyncDialogProps?.open ? (
        <LeafTabDangerousSyncDialog {...dangerousSyncDialogProps} />
      ) : null}
    </>
  );
}
