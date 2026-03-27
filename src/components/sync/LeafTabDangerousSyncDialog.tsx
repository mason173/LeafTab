import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RiCloudFill,
  RiErrorWarningFill,
  RiFolderTransferLine,
  RiRefreshFill,
} from '@/icons/ri-compat';

type DangerousSyncDialogAction = 'recheck' | 'use-remote' | 'use-local' | null;

export interface LeafTabDangerousSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'cloud' | 'webdav';
  localBookmarkCount: number | null;
  remoteBookmarkCount: number | null;
  detectedFromCount: number;
  detectedToCount: number;
  busyAction?: DangerousSyncDialogAction;
  onCancel: () => void;
  onRecheck: () => void;
  onUseRemote: () => void;
  onUseLocal: () => void;
}

function CountCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number | null;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-[30px] font-semibold tracking-tight text-foreground">
        {value ?? '—'}
      </div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{caption}</div>
    </div>
  );
}

export function LeafTabDangerousSyncDialog({
  open,
  onOpenChange,
  provider,
  localBookmarkCount,
  remoteBookmarkCount,
  detectedFromCount,
  detectedToCount,
  busyAction = null,
  onCancel,
  onRecheck,
  onUseRemote,
  onUseLocal,
}: LeafTabDangerousSyncDialogProps) {
  const { t } = useTranslation();
  const remoteLabel = provider === 'cloud'
    ? t('sync.cloud', { defaultValue: '云端' })
    : 'WebDAV';
  const remoteShortLabel = provider === 'cloud'
    ? t('sync.cloud', { defaultValue: '云端' })
    : 'WebDAV';
  const remoteActionLabel = provider === 'cloud'
    ? t('leaftabSyncDialog.cloudOverwriteLocal', { defaultValue: '云端覆盖本地' })
    : t('leaftabSyncDialog.remoteOverwriteLocal', { defaultValue: 'WebDAV 覆盖本地' });
  const localActionLabel = provider === 'cloud'
    ? t('leaftabSyncDialog.localOverwriteCloud', { defaultValue: '本地覆盖云端' })
    : t('leaftabSyncDialog.localOverwriteRemote', { defaultValue: '本地覆盖 WebDAV' });
  const recheckLabel = provider === 'cloud'
    ? t('leaftabDangerousSync.recheckCloud', { defaultValue: '重新检查云端' })
    : t('leaftabDangerousSync.recheckWebdav', { defaultValue: '重新检查 WebDAV' });

  const estimatedLoss = useMemo(() => {
    if (detectedFromCount <= detectedToCount) return 0;
    return detectedFromCount - detectedToCount;
  }, [detectedFromCount, detectedToCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] rounded-[32px] border-border bg-background text-foreground">
        <DialogHeader className="gap-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[18px] border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300 sm:mx-0">
            <RiErrorWarningFill className="size-5" />
          </div>
          <DialogTitle>{t('leaftabDangerousSync.title', { defaultValue: '已拦截危险同步' })}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            {t('leaftabDangerousSync.description', {
              defaultValue: '检测到本地与{{provider}}书签差异过大。为避免误删，LeafTab 已暂停这次同步，当前不会自动覆盖任意一侧数据。',
              provider: remoteShortLabel,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <RiErrorWarningFill className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-300" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                {t('leaftabDangerousSync.riskTitle', { defaultValue: '本次同步已被安全阀拦截' })}
              </div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">
                {t('leaftabDangerousSync.riskDescription', {
                  defaultValue: '同步过程中检测到书签数量可能从 {{from}} 降到 {{to}}。如果继续自动处理，可能会误删约 {{loss}} 个书签。',
                  from: detectedFromCount,
                  to: detectedToCount,
                  loss: estimatedLoss,
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/60 bg-secondary/25 p-4 md:grid-cols-2">
          <CountCard
            label={t('leaftabDangerousSync.localBookmarks', { defaultValue: '本地书签' })}
            value={localBookmarkCount}
            caption={t('leaftabDangerousSync.localBookmarksHint', { defaultValue: '当前设备读取到的浏览器书签数量' })}
          />
          <CountCard
            label={t('leaftabDangerousSync.remoteBookmarks', {
              defaultValue: '{{provider}}书签',
              provider: remoteShortLabel,
            })}
            value={remoteBookmarkCount}
            caption={t('leaftabDangerousSync.remoteBookmarksHint', {
              defaultValue: '这次同步读取到的{{provider}}书签数量',
              provider: remoteLabel,
            })}
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4 text-sm leading-6 text-muted-foreground">
          <div className="font-medium text-foreground">
            {t('leaftabDangerousSync.nextStepTitle', { defaultValue: '接下来怎么处理？' })}
          </div>
          <div className="mt-2">
            {t('leaftabDangerousSync.nextStepDescription', {
              defaultValue: '如果你怀疑远端状态不完整，先重新检查一次；如果你已经确认哪一侧才是正确数据，再明确选择覆盖方向。',
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onUseRemote}
            disabled={Boolean(busyAction)}
            className="group overflow-hidden rounded-[24px] border border-border/70 bg-background px-5 py-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RiCloudFill className="size-4" />
              {remoteActionLabel}
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              {t('leaftabDangerousSync.useRemoteHint', {
                defaultValue: '确认远端才是正确数据后，直接用远端覆盖当前设备。',
              })}
            </div>
          </button>
          <button
            type="button"
            onClick={onUseLocal}
            disabled={Boolean(busyAction)}
            className="group overflow-hidden rounded-[24px] border border-border/70 bg-background px-5 py-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RiFolderTransferLine className="size-4" />
              {localActionLabel}
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              {t('leaftabDangerousSync.useLocalHint', {
                defaultValue: '确认当前设备才是正确数据后，直接把本地状态覆盖到远端。',
              })}
            </div>
          </button>
        </div>

        <DialogFooter className="flex w-full gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={Boolean(busyAction)}
            className="flex-1 sm:flex-none"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={onRecheck}
            disabled={Boolean(busyAction)}
            className="flex-1"
          >
            {busyAction === 'recheck' ? (
              <>
                <RiRefreshFill className="size-4 animate-spin" />
                {t('leaftabDangerousSync.rechecking', { defaultValue: '重新检查中' })}
              </>
            ) : (
              recheckLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
