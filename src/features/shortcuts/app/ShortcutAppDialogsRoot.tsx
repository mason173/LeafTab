import { Suspense, memo, useEffect, useState } from 'react';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import { LazyAppDialogs } from '@/lazy/components';
import { useShortcutUiContext } from '@/features/shortcuts/app/ShortcutAppContext';
import { useLeafTabSyncDialogContext } from '@/features/sync/app/LeafTabSyncContext';
import {
  useShortcutAppDialogsController,
  type AuthDialogInput,
  type ConsentDialogsInput,
  type SettingsDialogsInput,
  type SyncProviderDialogsInput,
  type UtilityDialogsInput,
} from '@/features/shortcuts/app/useShortcutAppDialogsController';

function useKeepMountedAfterFirstOpen(open: boolean) {
  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  return hasOpened || open;
}

export type ShortcutAppDialogsRootProps = {
  nonSyncExternalDialogActivity: boolean;
  authDialog: AuthDialogInput;
  settingsDialogs: SettingsDialogsInput;
  utilityDialogs: UtilityDialogsInput;
  syncProviderDialogs: SyncProviderDialogsInput;
  consentDialogs: ConsentDialogsInput;
};

export const ShortcutAppDialogsRoot = memo(function ShortcutAppDialogsRoot({
  nonSyncExternalDialogActivity,
  authDialog,
  settingsDialogs,
  utilityDialogs,
  syncProviderDialogs,
  consentDialogs,
}: ShortcutAppDialogsRootProps) {
  const { state: uiState } = useShortcutUiContext();
  const syncDialogState = useLeafTabSyncDialogContext();
  const { appDialogsProps } = useShortcutAppDialogsController({
    shortcutIconCornerRadius: settingsDialogs.shortcutIconCornerRadius,
    shortcutIconScale: settingsDialogs.shortcutIconScale,
    shortcutIconAppearance: settingsDialogs.shortcutIconAppearance,
    authDialog,
    settingsDialogs,
    utilityDialogs,
    syncProviderDialogs,
    consentDialogs,
  });
  const shouldMountAppDialogs = useKeepMountedAfterFirstOpen(
    nonSyncExternalDialogActivity
      || uiState.shortcutEditOpen
      || uiState.shortcutDeleteOpen
      || uiState.scenarioCreateOpen
      || uiState.scenarioEditOpen
      || utilityDialogs.importSourceDialogOpen
      || syncDialogState.exportBackupDialogOpen
      || syncDialogState.importBackupDialogOpen
      || syncDialogState.importConfirmOpen,
  );

  if (!shouldMountAppDialogs) {
    return null;
  }

  return (
    <RenderProfileBoundary id="ShortcutAppDialogsRoot">
      <Suspense fallback={null}>
        <LazyAppDialogs {...appDialogsProps} />
      </Suspense>
    </RenderProfileBoundary>
  );
});

ShortcutAppDialogsRoot.displayName = 'ShortcutAppDialogsRoot';
