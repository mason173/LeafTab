import { Suspense } from 'react';
import { LazyAppDialogs } from '@/lazy/components';
import {
  useShortcutAppDialogsController,
  type AuthDialogInput,
  type ConsentDialogsInput,
  type SettingsDialogsInput,
  type SyncProviderDialogsInput,
  type UtilityDialogsInput,
} from '@/features/shortcuts/app/useShortcutAppDialogsController';

export type ShortcutAppDialogsRootProps = {
  shouldMountAppDialogs: boolean;
  authDialog: AuthDialogInput;
  settingsDialogs: SettingsDialogsInput;
  utilityDialogs: UtilityDialogsInput;
  syncProviderDialogs: SyncProviderDialogsInput;
  consentDialogs: ConsentDialogsInput;
};

export function ShortcutAppDialogsRoot({
  shouldMountAppDialogs,
  authDialog,
  settingsDialogs,
  utilityDialogs,
  syncProviderDialogs,
  consentDialogs,
}: ShortcutAppDialogsRootProps) {
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

  if (!shouldMountAppDialogs) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyAppDialogs {...appDialogsProps} />
    </Suspense>
  );
}
