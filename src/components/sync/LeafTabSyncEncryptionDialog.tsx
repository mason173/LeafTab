import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SyncSettingsDialog } from '@/components/SyncSettingsDialog';
import { RiEyeFill, RiEyeOffFill } from '@/icons/ri-compat';

export interface LeafTabSyncEncryptionDialogSubmitPayload {
  passphrase: string;
}

export interface LeafTabSyncEncryptionDialogProps {
  open: boolean;
  mode: 'setup' | 'unlock';
  providerLabel: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: LeafTabSyncEncryptionDialogSubmitPayload) => void | Promise<void>;
}

export function LeafTabSyncEncryptionDialog({
  open,
  mode,
  providerLabel,
  busy = false,
  onOpenChange,
  onSubmit,
}: LeafTabSyncEncryptionDialogProps) {
  const { t } = useTranslation();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [confirmServerCannotAccess, setConfirmServerCannotAccess] = useState(false);
  const [confirmCannotRecover, setConfirmCannotRecover] = useState(false);
  const [confirmNeedReenterOnNewDevice, setConfirmNeedReenterOnNewDevice] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassphrase('');
    setConfirmPassphrase('');
    setShowPassphrase(false);
    setConfirmServerCannotAccess(false);
    setConfirmCannotRecover(false);
    setConfirmNeedReenterOnNewDevice(false);
  }, [open, mode]);

  const isSetup = mode === 'setup';
  const submitDisabled = useMemo(() => {
    if (busy) return true;
    const normalized = passphrase.trim();
    if (normalized.length < 8) return true;
    if (isSetup && confirmPassphrase !== passphrase) return true;
    if (isSetup && (!confirmServerCannotAccess || !confirmCannotRecover || !confirmNeedReenterOnNewDevice)) {
      return true;
    }
    return false;
  }, [
    busy,
    confirmCannotRecover,
    confirmNeedReenterOnNewDevice,
    confirmPassphrase,
    confirmServerCannotAccess,
    isSetup,
    passphrase,
  ]);

  return (
    <SyncSettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isSetup
        ? t('leaftabSyncEncryption.setupTitle', { defaultValue: '设置同步口令' })
        : t('leaftabSyncEncryption.unlockTitle', { defaultValue: '输入同步口令' })}
      description={isSetup
        ? t('leaftabSyncEncryption.setupDescription', {
            defaultValue: '为 {{provider}} 设置端到端加密口令。服务器无法查看你的同步内容，也无法帮你找回这个口令。',
            provider: providerLabel,
          })
        : t('leaftabSyncEncryption.unlockDescription', {
            defaultValue: '请输入 {{provider}} 的同步口令以解锁云端密文数据。',
            provider: providerLabel,
          })}
      contentClassName="sm:max-w-[480px]"
      footer={(
        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-[18px]"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel', { defaultValue: '取消' })}
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-[18px]"
            disabled={submitDisabled}
            onClick={() => void onSubmit({ passphrase })}
          >
            {busy
              ? t('common.loading', { defaultValue: '处理中...' })
              : isSetup
                ? t('leaftabSyncEncryption.setupConfirm', { defaultValue: '保存口令' })
                : t('leaftabSyncEncryption.unlockConfirm', { defaultValue: '解锁同步' })}
          </Button>
        </div>
      )}
    >
      <div className="flex flex-col gap-4 px-1">
        <div className="rounded-[22px] border border-border/70 bg-background/80 p-4">
          <div className="space-y-1.5">
            <div className="text-sm leading-6 text-muted-foreground">
              {isSetup
                ? t('leaftabSyncEncryption.e2eeSetupDescription', {
                    defaultValue: '你的数据会先在本地加密，再上传到云端或 WebDAV。只有输入这组同步口令的设备，才能解锁和读取同步内容。',
                  })
                : t('leaftabSyncEncryption.e2eeUnlockDescription', {
                    defaultValue: '同步数据在云端保存的是加密内容。输入正确的同步口令后，当前设备才能在本地解锁并读取这些数据。',
                  })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">
            {t('leaftabSyncEncryption.passphraseLabel', { defaultValue: '同步口令' })}
          </Label>
          <div className="relative">
            <Input
              type={showPassphrase ? 'text' : 'password'}
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={t('leaftabSyncEncryption.passphrasePlaceholder', { defaultValue: '至少 8 位，建议包含字母和数字' })}
              className="rounded-[18px] bg-secondary border-border pr-10"
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[12px] text-muted-foreground hover:bg-background/80 hover:text-foreground"
              onClick={() => setShowPassphrase((value) => !value)}
            >
              {showPassphrase ? <RiEyeOffFill className="size-4" /> : <RiEyeFill className="size-4" />}
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            {t('leaftabSyncEncryption.passphraseHint', { defaultValue: '这是同步专用口令，不是账号登录密码。' })}
          </div>
        </div>

        {isSetup ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">
                {t('leaftabSyncEncryption.confirmLabel', { defaultValue: '再次输入同步口令' })}
              </Label>
              <Input
                type={showPassphrase ? 'text' : 'password'}
                value={confirmPassphrase}
                onChange={(event) => setConfirmPassphrase(event.target.value)}
                placeholder={t('leaftabSyncEncryption.confirmPlaceholder', { defaultValue: '再次输入用于确认' })}
                className="rounded-[18px] bg-secondary border-border"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-sm font-medium text-foreground">
                {t('leaftabSyncEncryption.setupChecklistTitle', { defaultValue: '继续前请确认以下事项' })}
              </div>

              <label className="flex cursor-pointer items-start gap-3 px-1 py-1">
                <Checkbox
                  checked={confirmServerCannotAccess}
                  onCheckedChange={(checked: boolean | 'indeterminate') => setConfirmServerCannotAccess(Boolean(checked))}
                  className="mt-0.5"
                />
                <span className="text-sm leading-6 text-muted-foreground">
                  {t('leaftabSyncEncryption.checklist.serverCannotAccess', {
                    defaultValue: '我们不保存这组同步口令，也无法看到你加密后的同步内容。',
                  })}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 px-1 py-1">
                <Checkbox
                  checked={confirmCannotRecover}
                  onCheckedChange={(checked: boolean | 'indeterminate') => setConfirmCannotRecover(Boolean(checked))}
                  className="mt-0.5"
                />
                <span className="text-sm leading-6 text-muted-foreground">
                  {t('leaftabSyncEncryption.checklist.cannotRecover', {
                    defaultValue: '忘记这组同步口令后，已有加密同步数据将无法恢复。',
                  })}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 px-1 py-1">
                <Checkbox
                  checked={confirmNeedReenterOnNewDevice}
                  onCheckedChange={(checked: boolean | 'indeterminate') => setConfirmNeedReenterOnNewDevice(Boolean(checked))}
                  className="mt-0.5"
                />
                <span className="text-sm leading-6 text-muted-foreground">
                  {t('leaftabSyncEncryption.checklist.newDeviceUnlock', {
                    defaultValue: '更换设备或清除本地数据后，需要重新输入这组同步口令。',
                  })}
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-6 text-muted-foreground">
            {t('leaftabSyncEncryption.deviceUnlockDescription', {
              defaultValue: '当前设备解锁后，后续同步无需重复输入。',
            })}
          </div>
        )}
      </div>
    </SyncSettingsDialog>
  );
}
