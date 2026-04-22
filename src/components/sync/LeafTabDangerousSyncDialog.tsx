import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RiArrowDownLine, RiErrorWarningFill } from '@/icons/ri-compat';

type DangerousSyncDialogAction = 'continue-without-bookmarks' | 'use-remote' | 'use-local' | null;

export interface LeafTabDangerousSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'cloud' | 'webdav';
  localBookmarkCount: number | null;
  remoteBookmarkCount: number | null;
  detectedFromCount: number;
  detectedToCount: number;
  busyAction?: DangerousSyncDialogAction;
  onContinueWithoutBookmarks: () => void;
  onDefer: () => void;
  onUseRemote: () => void;
  onUseLocal: () => void;
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
  onContinueWithoutBookmarks,
  onDefer,
  onUseRemote,
  onUseLocal,
}: LeafTabDangerousSyncDialogProps) {
  const { t } = useTranslation();
  const busy = Boolean(busyAction);
  const remoteShortLabel = provider === 'cloud'
    ? t('sync.cloud', { defaultValue: '云端' })
    : 'WebDAV';
  const safeContinueLabel = t('leaftabDangerousSync.continueWithoutBookmarks', {
    defaultValue: '继续同步快捷方式和设置',
  });
  const deferLabel = t('leaftabDangerousSync.deferBookmarks', {
    defaultValue: '稍后处理书签',
  });
  const remoteActionLabel = t('leaftabDangerousSync.useRemotePlain', {
    defaultValue: '保留{{provider}}书签（本地将被替换）',
    provider: remoteShortLabel,
  });
  const localActionLabel = t('leaftabDangerousSync.useLocalPlain', {
    defaultValue: '保留本地书签（{{provider}}将被替换）',
    provider: remoteShortLabel,
  });
  const estimatedLoss = useMemo(() => {
    if (detectedFromCount <= detectedToCount) return 0;
    return detectedFromCount - detectedToCount;
  }, [detectedFromCount, detectedToCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl border-border bg-background text-foreground">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2 text-foreground">
            <RiErrorWarningFill className="size-5 text-muted-foreground" />
            <DialogTitle>{t('leaftabDangerousSync.title', { defaultValue: '已拦截危险同步' })}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('leaftabDangerousSync.description', {
              defaultValue: '书签数量变化异常，已暂停自动同步。',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-foreground">
          {t('leaftabDangerousSync.riskDescription', {
            defaultValue: '预计书签会从 {{from}} 变成 {{to}}，可能误删约 {{loss}} 条。',
            from: detectedFromCount,
            to: detectedToCount,
            loss: estimatedLoss,
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">{t('leaftabDangerousSync.localBookmarks', { defaultValue: '本地书签' })}</div>
            <div className="mt-1 text-2xl font-semibold leading-none">{localBookmarkCount ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-border/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {t('leaftabDangerousSync.remoteBookmarks', {
                defaultValue: '{{provider}}书签',
                provider: remoteShortLabel,
              })}
            </div>
            <div className="mt-1 text-2xl font-semibold leading-none">{remoteBookmarkCount ?? '—'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('leaftabDangerousSync.advancedActions', { defaultValue: '高级设置' })}
                  <RiArrowDownLine className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={6} className="w-[280px]">
                <DropdownMenuItem onSelect={onUseRemote} disabled={busy} className="whitespace-normal leading-5">
                  {remoteActionLabel}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUseLocal} disabled={busy} className="whitespace-normal leading-5">
                  {localActionLabel}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onContinueWithoutBookmarks}
              disabled={busy}
              className="w-full justify-center"
            >
              {safeContinueLabel}
            </Button>
            <Button
              variant="outline"
              onClick={onDefer}
              disabled={busy}
              className="w-full justify-center"
            >
              {deferLabel}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {t('leaftabDangerousSync.continueWithoutBookmarksHint', {
              defaultValue: '本次不改动书签，只同步快捷方式和设置',
            })}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
