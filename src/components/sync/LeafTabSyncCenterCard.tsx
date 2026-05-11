import { RiArrowUpLine, RiCloudFill, RiErrorWarningFill, RiRefreshFill } from '@/icons/ri-compat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import type { LeafTabSyncAnalysis } from '@/sync/leaftab';
import type { SyncState } from '@/sync/stateMachine';
import { useTranslation } from 'react-i18next';

export interface LeafTabSyncCenterCardProps {
  analysis: LeafTabSyncAnalysis | null;
  syncState: SyncState;
  bookmarkScopeLabel?: string;
  ready?: boolean;
  hasConfig?: boolean;
  busy?: boolean;
  onSyncNow: () => void;
  onOpenConfig?: () => void;
}

const formatStatus = (state: SyncState, t: (key: string, options?: Record<string, unknown>) => string) => {
  switch (state.status) {
    case 'syncing':
      return { label: t('leaftabSyncCenter.status.syncing', { defaultValue: '同步中' }), tone: 'info' as const, icon: RiRefreshFill };
    case 'conflict':
      return { label: t('leaftabSyncCenter.status.conflict', { defaultValue: '需要处理' }), tone: 'warning' as const, icon: RiErrorWarningFill };
    case 'error':
      return { label: t('leaftabSyncCenter.status.error', { defaultValue: '同步失败' }), tone: 'danger' as const, icon: RiErrorWarningFill };
    default:
      return { label: t('leaftabSyncCenter.status.ready', { defaultValue: '就绪' }), tone: 'success' as const, icon: RiCloudFill };
  }
};

export function LeafTabSyncCenterCard({
  analysis,
  syncState,
  bookmarkScopeLabel,
  ready = false,
  hasConfig = false,
  busy = false,
  onSyncNow,
  onOpenConfig,
}: LeafTabSyncCenterCardProps) {
  const { t } = useTranslation();
  const status = formatStatus(syncState, t);
  const StatusIcon = status.icon;
  const isSyncing = syncState.status === 'syncing';
  const remoteSummaryKnown = analysis?.remoteSummaryStatus !== 'head-only';
  const stateTitle = !ready
    ? t('leaftabSyncCenter.state.analyzing', { defaultValue: '正在分析同步状态...' })
    : isSyncing
      ? t('leaftabSyncCenter.state.syncing', { defaultValue: '正在后台同步' })
      : t('leaftabSyncCenter.state.ready', { defaultValue: '合并同步已就绪' });
  const stateDescription = isSyncing
    ? t('leaftabSyncCenter.state.syncingDescription', {
        defaultValue: 'LeafTab 正在后台比对本地与云端差异，并写回需要更新的数据。界面没有卡住，等待完成即可。',
      })
    : t('leaftabSyncCenter.state.readyDescription', {
        defaultValue: '新的同步引擎已经可以对场景、快捷方式，以及浏览器真实书签根执行推送、拉取与合并同步。',
      });

  return (
    <Card className="overflow-hidden rounded-[28px] border-border/70 bg-[linear-gradient(135deg,rgba(27,116,228,0.06),rgba(16,185,129,0.04)_45%,rgba(255,255,255,0.7)_100%)] shadow-sm">
      <CardHeader className="gap-3 border-b border-border/60 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">{t('leaftabSyncCenter.title', { defaultValue: '同步中心' })}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {t('leaftabSyncCenter.description', { defaultValue: '基于 WebDAV 的同步中心，当前重点支持场景、快捷方式和浏览器书签同步。' })}
            </CardDescription>
            {bookmarkScopeLabel ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {t('leaftabSyncCenter.bookmarkScope', {
                  defaultValue: '书签同步范围：{{scope}}',
                  scope: bookmarkScopeLabel,
                })}
              </div>
            ) : null}
          </div>
            <SyncStatusBadge
            label={(
              <span className="inline-flex items-center gap-1.5">
                <StatusIcon className={`size-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
                {status.label}
              </span>
            )}
            tone={status.tone}
          />
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
        <div className="rounded-[22px] border border-border/60 bg-background/75 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('sync.local')}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {analysis?.localSummary.shortcuts ?? 0}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t('leaftabSyncCenter.summary', {
              defaultValue: '{{shortcuts}} 个快捷方式，{{scenarios}} 个场景，{{bookmarks}} 个书签',
              shortcuts: analysis?.localSummary.shortcuts ?? 0,
              scenarios: analysis?.localSummary.scenarios ?? 0,
              bookmarks: analysis?.localSummary.bookmarkItems ?? 0,
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-border/60 bg-background/75 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('sync.cloud')}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {remoteSummaryKnown ? (analysis?.remoteSummary.shortcuts ?? 0) : '-'}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {remoteSummaryKnown
              ? t('leaftabSyncCenter.summary', {
                  defaultValue: '{{shortcuts}} 个快捷方式，{{scenarios}} 个场景，{{bookmarks}} 个书签',
                  shortcuts: analysis?.remoteSummary.shortcuts ?? 0,
                  scenarios: analysis?.remoteSummary.scenarios ?? 0,
                  bookmarks: analysis?.remoteSummary.bookmarkItems ?? 0,
                })
              : t('leaftabSyncCenter.remoteHeadOnly', { defaultValue: '已轻量探测远端版本，未读取完整内容' })}
          </div>
        </div>

        <div className="rounded-[22px] border border-border/60 bg-background/75 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('leaftabSyncCenter.stateLabel', { defaultValue: '状态' })}</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <RiArrowUpLine className="size-4 text-primary" />
            {stateTitle}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {stateDescription}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-5">
        <Button onClick={onSyncNow} disabled={!hasConfig || busy || !ready}>
          <RiRefreshFill className={`mr-2 size-4 ${busy ? 'animate-spin' : ''}`} />
          {busy
            ? t('leaftabSyncCenter.actions.syncing', { defaultValue: '后台同步中...' })
            : t('settings.backup.webdav.sync')}
        </Button>
        {onOpenConfig ? (
          <Button variant="ghost" onClick={onOpenConfig} disabled={busy}>
            {t('settings.backup.webdav.configure')}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
