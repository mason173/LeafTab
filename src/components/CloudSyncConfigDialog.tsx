import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import {
  resolveCloudSyncBookmarksEnabled,
  resolveCloudSyncBookmarksToggleIntent,
} from '@/utils/cloudSyncBookmarksPolicy';

interface CloudSyncConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToParent?: () => void;
  onSaveSuccess?: () => void | Promise<void>;
  onLinkGoogle?: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}

export function CloudSyncConfigDialog({
  open,
  onOpenChange,
  onBackToParent,
  onSaveSuccess,
  onLinkGoogle,
  onLogout,
}: CloudSyncConfigDialogProps) {
  const { t } = useTranslation();
  const syncIntervalOptions = [5, 10, 15, 30, 60];
  const [saving, setSaving] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [syncBookmarksEnabled, setSyncBookmarksEnabled] = useState(false);
  const [autoSyncToastEnabled, setAutoSyncToastEnabled] = useState(true);
  const [bookmarkSyncSafetyDialogOpen, setBookmarkSyncSafetyDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const config = readCloudSyncConfigFromStorage();
    setEnabled(config.enabled);
    setAutoSyncToastEnabled(config.autoSyncToastEnabled);
    setIntervalMinutes(config.intervalMinutes);
    void ensureExtensionPermission('bookmarks', { requestIfNeeded: false })
      .then((granted) => {
        if (disposed) return;
        setSyncBookmarksEnabled(resolveCloudSyncBookmarksEnabled(config.syncBookmarksEnabled, Boolean(granted)));
      })
      .catch(() => {
        if (disposed) return;
        setSyncBookmarksEnabled(false);
      });
    return () => {
      disposed = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setBookmarkSyncSafetyDialogOpen(false);
  }, [open]);

  const handleBookmarksToggleChange = async (checked: boolean) => {
    const result = await resolveCloudSyncBookmarksToggleIntent({
      nextChecked: checked,
      requestPermission: () => ensureExtensionPermission('bookmarks', { requestIfNeeded: true }).catch(() => false),
    });
    setSyncBookmarksEnabled(result.enabled);
    if (result.permissionDenied) {
      toast.info(t('settings.backup.cloud.bookmarkPermissionDenied', {
        defaultValue: '未授予书签权限，已保持“同步书签”关闭。再次打开会重新请求授权。',
      }));
    }
  };

  const handleBookmarksToggleIntent = (checked: boolean) => {
    if (!checked) {
      void handleBookmarksToggleChange(false);
      return;
    }

    if (syncBookmarksEnabled) return;
    setBookmarkSyncSafetyDialogOpen(true);
  };

  const handleConfirmEnableBookmarkSync = () => {
    setBookmarkSyncSafetyDialogOpen(false);
    void handleBookmarksToggleChange(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      writeCloudSyncConfigToStorage({
        enabled,
        syncBookmarksEnabled,
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
    <>
      <SyncSettingsDialog
        open={open && !bookmarkSyncSafetyDialogOpen}
        onOpenChange={onOpenChange}
        title={t('settings.backup.cloud.configTitle', { defaultValue: '云同步设置' })}
        description={t('settings.backup.cloud.configDesc', {
          defaultValue: '调整 LeafTab 云同步的自动同步频率和提醒方式。',
        })}
        onBackToParent={onBackToParent}
        backButtonLabel={t('common.back', { defaultValue: '返回' })}
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
            {onLinkGoogle ? (
              <button
                type="button"
                className="w-full text-center text-sm font-medium text-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  onOpenChange(false);
                  void onLinkGoogle();
                }}
                disabled={saving}
              >
                {t('settings.backup.cloud.linkGoogle', { defaultValue: '绑定 Google 登录' })}
              </button>
            ) : null}
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
            label={t('settings.backup.cloud.enabledLabel')}
            description={t('settings.backup.cloud.enabledDesc')}
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <SyncToggleField
            label={t('settings.backup.cloud.syncBookmarksLabel', { defaultValue: '同步书签' })}
            description={t('settings.backup.cloud.syncBookmarksDesc', {
              defaultValue: '关闭后云同步只处理快捷方式，不读取或写入浏览器书签。',
            })}
            checked={syncBookmarksEnabled}
            onCheckedChange={handleBookmarksToggleIntent}
          />
          <SyncToggleField
            label={t('settings.backup.cloud.autoSyncToastLabel')}
            description={t('settings.backup.cloud.autoSyncToastDesc')}
            checked={autoSyncToastEnabled}
            onCheckedChange={setAutoSyncToastEnabled}
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

      <AlertDialog open={bookmarkSyncSafetyDialogOpen} onOpenChange={setBookmarkSyncSafetyDialogOpen}>
        <AlertDialogContent className="sm:max-w-[480px] rounded-[28px] border-0 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderTitle', { defaultValue: '开启前提醒' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderA11yDescription', {
                defaultValue: '开启书签同步前的提醒说明',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 text-sm leading-6 text-muted-foreground">
            <p>
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderLine1', {
                defaultValue: '同步用于多设备保持一致，不等同于备份。',
              })}
            </p>
            <p>
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderLine2', {
                defaultValue: '书签同步仍处于测试阶段，少数情况下可能出现延迟或异常。',
              })}
            </p>
            <p>
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderLine3', {
                defaultValue: '建议先导出本地备份，再开启书签同步。',
              })}
            </p>
          </div>

          <AlertDialogFooter className="w-full flex-row gap-3">
            <AlertDialogCancel className="flex-1 rounded-[16px]">
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderCancel', { defaultValue: '我先备份' })}
            </AlertDialogCancel>
            <AlertDialogAction className="flex-1 rounded-[16px]" onClick={handleConfirmEnableBookmarkSync}>
              {t('settings.backup.cloud.bookmarkSyncSafetyReminderConfirm', { defaultValue: '继续开启' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
