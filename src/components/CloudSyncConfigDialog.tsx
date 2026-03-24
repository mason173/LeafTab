import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { SyncSettingsDialog } from './SyncSettingsDialog';
import {
  SyncIntervalSliderField,
  SyncSettingsActionButtons,
  SyncToggleField,
} from './sync/SyncSettingsFields';
import {
  emitCloudSyncConfigChanged,
  readCloudSyncConfigFromStorage,
  writeCloudSyncConfigToStorage,
} from '@/utils/cloudSyncConfig';

interface CloudSyncConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void | Promise<void>;
  encryptionReady?: boolean;
  onManageEncryption?: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}

export function CloudSyncConfigDialog({
  open,
  onOpenChange,
  onSaveSuccess,
  encryptionReady = false,
  onManageEncryption,
  onLogout,
}: CloudSyncConfigDialogProps) {
  const { t } = useTranslation();
  const syncIntervalOptions = [5, 10, 15, 30, 60];
  const [saving, setSaving] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [autoSyncToastEnabled, setAutoSyncToastEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    const config = readCloudSyncConfigFromStorage();
    setEnabled(config.enabled);
    setAutoSyncToastEnabled(config.autoSyncToastEnabled);
    setIntervalMinutes(config.intervalMinutes);
  }, [open]);

  const handleSave = async () => {
    if (enabled && !encryptionReady) {
      toast.error(t('leaftabSyncEncryption.requiredBeforeSync', { defaultValue: '请先设置同步口令' }));
      await onManageEncryption?.();
      return;
    }
    setSaving(true);
    try {
      writeCloudSyncConfigToStorage({
        enabled,
        autoSyncToastEnabled,
        intervalMinutes,
      });
      emitCloudSyncConfigChanged();
      toast.success(t('settings.backup.cloud.configSaved'));
      onOpenChange(false);
      await onSaveSuccess?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SyncSettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.backup.cloud.configTitle', { defaultValue: '云同步设置' })}
      description={t('settings.backup.cloud.configDesc', {
        defaultValue: '调整 LeafTab 云同步的自动同步频率和提醒方式。',
      })}
      contentClassName="sm:max-w-[500px]"
      footer={(
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full gap-4 sm:gap-4">
            <SyncSettingsActionButtons
              cancelLabel={t('common.cancel')}
              saveLabel={t('common.save')}
              onCancel={() => onOpenChange(false)}
              onSave={() => void handleSave()}
              cancelDisabled={saving}
              saveDisabled={saving}
            />
          </div>
          {onLogout ? (
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-red-500 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                onOpenChange(false);
                void onLogout();
              }}
              disabled={saving}
            >
              {t('settings.profile.logout', { defaultValue: '退出账号' })}
            </button>
          ) : null}
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <SyncToggleField
          label={t('settings.backup.cloud.autoSyncToastLabel')}
          description={t('settings.backup.cloud.autoSyncToastDesc')}
          checked={autoSyncToastEnabled}
          onCheckedChange={setAutoSyncToastEnabled}
        />
        <SyncToggleField
          label={t('settings.backup.cloud.enabledLabel')}
          description={t('settings.backup.cloud.enabledDesc')}
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <SyncIntervalSliderField
          label={t('settings.backup.cloud.intervalLabel')}
          options={syncIntervalOptions}
          value={intervalMinutes}
          valueLabel={t('settings.backup.cloud.intervalMinutes', { count: intervalMinutes })}
          onChange={setIntervalMinutes}
          disabled={!enabled}
        />
      </div>
    </SyncSettingsDialog>
  );
}
