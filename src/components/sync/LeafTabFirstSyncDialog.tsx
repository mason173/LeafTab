import { Button } from '@/components/ui/button';
import { RiRefreshFill } from '@/icons/ri-compat';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SettingsDialogContent } from '@/components/settings/SettingsDialogSurface';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import type {
  LeafTabSyncAnalysis,
  LeafTabSyncInitialChoice,
} from '@/sync/leaftab';
import { useTranslation } from 'react-i18next';

export interface LeafTabFirstSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: LeafTabSyncAnalysis | null;
  bookmarkScopeLabel?: string;
  busy?: boolean;
  pendingChoice?: LeafTabSyncInitialChoice | null;
  onSelect: (choice: LeafTabSyncInitialChoice) => void;
}

const choiceCards: Array<{
  choice: LeafTabSyncInitialChoice;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
}> = [
  {
    choice: 'push-local',
    titleKey: 'leaftabFirstSync.choice.push.title',
    titleDefault: '上传本地数据',
    descriptionKey: 'leaftabFirstSync.choice.push.description',
    descriptionDefault: '以当前设备为准，把现在的 LeafTab 数据和浏览器书签写入 WebDAV。',
  },
  {
    choice: 'pull-remote',
    titleKey: 'leaftabFirstSync.choice.pull.title',
    titleDefault: '下载云端数据',
    descriptionKey: 'leaftabFirstSync.choice.pull.description',
    descriptionDefault: '用 WebDAV 上最新的远端快照覆盖当前本地 LeafTab 数据和浏览器书签。',
  },
  {
    choice: 'merge',
    titleKey: 'leaftabFirstSync.choice.merge.title',
    titleDefault: '智能合并',
    descriptionKey: 'leaftabFirstSync.choice.merge.description',
    descriptionDefault: '合并本地和云端数据，保留双方各自独有的 LeafTab 数据与浏览器书签，并自动处理大多数冲突。',
  },
];

export function LeafTabFirstSyncDialog({
  open,
  onOpenChange,
  analysis,
  bookmarkScopeLabel,
  busy = false,
  pendingChoice = null,
  onSelect,
}: LeafTabFirstSyncDialogProps) {
  const { t } = useTranslation();
  const suggested = analysis?.suggestedInitialChoice || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SettingsDialogContent className="sm:max-w-[720px] rounded-[32px]">
        <DialogHeader>
          <DialogTitle>{t('leaftabFirstSync.title', { defaultValue: '初始化同步' })}</DialogTitle>
          <DialogDescription>
            {t('leaftabFirstSync.description', { defaultValue: '选择第一次 LeafTab 同步时，应该如何处理当前浏览器书签、本地 LeafTab 数据与云端数据。' })}
          </DialogDescription>
        </DialogHeader>

        {bookmarkScopeLabel ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm leading-6 text-muted-foreground">
            {t('leaftabFirstSync.bookmarkScopeDescription', {
              defaultValue: '书签会直接以真实浏览器根目录为同步对象，不再额外复制一份。当前同步范围：{{scope}}。',
              scope: bookmarkScopeLabel,
            })}
          </div>
        ) : null}

        <div className="grid gap-3 rounded-2xl border border-border/60 bg-secondary/25 p-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="text-sm font-medium text-foreground">{t('sync.local')}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {analysis?.localSummary.shortcuts ?? 0}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t('leaftabSyncCenter.summary', {
                defaultValue: '{{shortcuts}} 个快捷方式，{{scenarios}} 个场景，{{bookmarks}} 个书签',
                shortcuts: analysis?.localSummary.shortcuts ?? 0,
                scenarios: analysis?.localSummary.scenarios ?? 0,
                bookmarks: analysis?.localSummary.bookmarkItems ?? 0,
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="text-sm font-medium text-foreground">{t('sync.cloud')}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {analysis?.remoteSummary.shortcuts ?? 0}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t('leaftabSyncCenter.summary', {
                defaultValue: '{{shortcuts}} 个快捷方式，{{scenarios}} 个场景，{{bookmarks}} 个书签',
                shortcuts: analysis?.remoteSummary.shortcuts ?? 0,
                scenarios: analysis?.remoteSummary.scenarios ?? 0,
                bookmarks: analysis?.remoteSummary.bookmarkItems ?? 0,
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {choiceCards.map((item) => {
            const recommended = suggested === item.choice;
            const processing = busy && pendingChoice === item.choice;
            return (
              <button
                key={item.choice}
                type="button"
                disabled={busy}
                onClick={() => onSelect(item.choice)}
                className={`group overflow-hidden rounded-[24px] border bg-background px-5 py-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] disabled:cursor-not-allowed disabled:opacity-100 ${
                  processing
                    ? 'border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(132,204,22,0.22)]'
                    : 'border-border/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-foreground">
                    {t(item.titleKey, { defaultValue: item.titleDefault })}
                  </div>
                  {processing ? (
                    <SyncStatusBadge
                      label={(
                        <span className="inline-flex items-center gap-1.5">
                          <RiRefreshFill className="size-3.5 animate-spin" />
                          {t('leaftabFirstSync.processingBadge', { defaultValue: '处理中' })}
                        </span>
                      )}
                      tone="info"
                    />
                  ) : recommended ? (
                    <SyncStatusBadge label={t('leaftabFirstSync.recommended', { defaultValue: '推荐' })} tone="info" />
                  ) : null}
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t(item.descriptionKey, { defaultValue: item.descriptionDefault })}
                </div>
                {processing ? (
                  <div className="mt-4 text-xs text-primary/90">
                    {t('leaftabFirstSync.processingInline', { defaultValue: '正在后台执行初始化同步，请稍候...' })}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex w-full gap-3 sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {busy
              ? t('leaftabFirstSync.processingFooter', { defaultValue: '正在后台初始化同步，请不要关闭当前窗口。完成后会自动返回正常同步状态。' })
              : t('leaftabFirstSync.footer', { defaultValue: '这一步只在首次同步时出现。初始化完成后，LeafTab 将进入基于合并的新同步模式。' })}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </SettingsDialogContent>
    </Dialog>
  );
}
