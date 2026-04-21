import { useMemo } from 'react';
import type { ShortcutAppDialogsRootProps } from '@/features/shortcuts/app/ShortcutAppDialogsRoot';
import type {
  AuthDialogInput,
  ConsentDialogsInput,
  SettingsDialogsInput,
  SyncProviderDialogsInput,
  UtilityDialogsInput,
} from '@/features/shortcuts/app/useShortcutAppDialogsController';

export type UseShortcutAppDialogsRootPropsParams = {
  shouldMountAppDialogs: boolean;
  authDialog: AuthDialogInput;
  settingsDialogs: SettingsDialogsInput;
  utilityDialogs: UtilityDialogsInput;
  syncProviderDialogs: SyncProviderDialogsInput;
  consentDialogs: ConsentDialogsInput;
};

export function useShortcutAppDialogsRootProps(
  params: UseShortcutAppDialogsRootPropsParams,
): ShortcutAppDialogsRootProps {
  return useMemo(() => ({
    shouldMountAppDialogs: params.shouldMountAppDialogs,
    authDialog: params.authDialog,
    settingsDialogs: params.settingsDialogs,
    utilityDialogs: params.utilityDialogs,
    syncProviderDialogs: params.syncProviderDialogs,
    consentDialogs: params.consentDialogs,
  }), [params]);
}
