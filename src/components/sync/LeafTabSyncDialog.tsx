import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RiCheckboxCircleFill,
  RiCloudFill,
  RiErrorWarningFill,
  RiHardDrive3Fill,
  RiLoginBoxFill,
  RiRefreshFill,
  RiSettings4Fill,
  RiToolsFill,
} from '@/icons/ri-compat';
import { useTranslation } from 'react-i18next';
import type { LeafTabSyncAnalysis } from '@/sync/leaftab';
import type { SyncState } from '@/sync/stateMachine';
import { cn } from '@/components/ui/utils';
import { SyncEncryptionStatusCard } from './SyncEncryptionStatusCard';

export interface LeafTabSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cloudAnalysis: LeafTabSyncAnalysis | null;
  webdavAnalysis: LeafTabSyncAnalysis | null;
  syncState: SyncState;
  cloudSyncState: SyncState;
  ready?: boolean;
  hasConfig?: boolean;
  busy?: boolean;
  bookmarkScopeLabel?: string;
  summaryText?: string;
  cloudSignedIn?: boolean;
  cloudEnabled?: boolean;
  cloudSyncBookmarksEnabled?: boolean;
  cloudUsername?: string;
  cloudLastSyncLabel?: string;
  cloudNextSyncLabel?: string;
  cloudEncryptionReady?: boolean;
  webdavConfigured?: boolean;
  webdavEnabled?: boolean;
  webdavSyncBookmarksEnabled?: boolean;
  webdavProfileLabel?: string;
  webdavUrlLabel?: string;
  webdavLastSyncLabel?: string;
  webdavNextSyncLabel?: string;
  webdavEncryptionReady?: boolean;
  onCloudSyncNow?: () => void;
  onOpenCloudConfig?: () => void;
  onCloudLogin?: () => void;
  onCloudRepairPull?: () => void;
  onCloudRepairPush?: () => void;
  onSyncNow: () => void;
  onOpenSetupConfig?: () => void;
  onOpenConfig?: () => void;
  onWebdavRepairPull?: () => void;
  onWebdavRepairPush?: () => void;
}

type ProviderTab = 'cloud' | 'webdav';
type StatusTone = 'neutral' | 'info' | 'success' | 'danger';

type ProviderModel = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  localShortcutCount: string;
  localBookmarkCount: string;
  remoteShortcutCount: string;
  remoteBookmarkCount: string;
  lastSyncLabel: string;
  nextSyncLabel: string;
  statusLabel: string;
  statusTone: StatusTone;
  statusIcon: ComponentType<{ className?: string }>;
  statusSpin?: boolean;
  scopeLabel: string;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-border/60 bg-background text-muted-foreground',
  info: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  danger: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300',
};

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-[24px] font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({
  tone,
  icon: Icon,
  label,
  spin = false,
}: {
  tone: StatusTone;
  icon: ComponentType<{ className?: string }>;
  label: string;
  spin?: boolean;
}) {
  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', toneClasses[tone])}>
      <Icon className={cn('size-3.5', spin ? 'animate-spin' : '')} />
      <span>{label}</span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm leading-6 text-foreground sm:max-w-[70%] sm:text-right', valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function IconActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 dark:border-border/70 dark:bg-background dark:hover:bg-accent/50"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" />
    </button>
  );
}

function RepairPopover({
  label,
  disabled = false,
  overwriteRemoteLabel,
  overwriteLocalLabel,
  onOverwriteRemote,
  onOverwriteLocal,
}: {
  label: string;
  disabled?: boolean;
  overwriteRemoteLabel: string;
  overwriteLocalLabel: string;
  onOverwriteRemote?: () => void;
  onOverwriteLocal?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (callback?: () => void) => {
    setOpen(false);
    callback?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 dark:border-border/70 dark:bg-background dark:hover:bg-accent/50"
          disabled={disabled}
          aria-label={label}
          title={label}
        >
          <RiToolsFill className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[220px] rounded-[20px] p-2 !bg-popover !backdrop-blur-none">
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 grid gap-1">
          <Button
            type="button"
            variant="ghost"
            className="justify-start rounded-[14px] px-3 text-sm"
            onClick={() => handleSelect(onOverwriteLocal)}
          >
            {overwriteLocalLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="justify-start rounded-[14px] px-3 text-sm"
            onClick={() => handleSelect(onOverwriteRemote)}
          >
            {overwriteRemoteLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProviderCard({
  model,
  securityCard,
  actionArea,
}: {
  model: ProviderModel;
  securityCard?: ReactNode;
  actionArea?: ReactNode;
}) {
  const { t } = useTranslation();
  const ProviderIcon = model.icon;

  return (
    <section className="overflow-hidden px-0">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 py-2">
        <div className="mx-auto grid w-full max-w-[520px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-border/60 bg-background/70 text-primary">
              <ProviderIcon className="size-5" />
            </div>
            <div className="flex min-w-0 min-h-12 flex-col justify-center">
              <div className="truncate text-lg font-semibold tracking-tight text-foreground">
                {model.title}
              </div>
              <div className="mt-0.5 text-sm leading-5 text-muted-foreground">
                {model.subtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end self-center">
            <StatusBadge
              tone={model.statusTone}
              icon={model.statusIcon}
              label={model.statusLabel}
              spin={model.statusSpin}
            />
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[520px] grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <MetricTile
            label={t('leaftabSyncDialog.metrics.localShortcuts', { defaultValue: '本地快捷方式' })}
            value={model.localShortcutCount}
          />
          <MetricTile
            label={t('leaftabSyncDialog.metrics.localBookmarks', { defaultValue: '本地书签' })}
            value={model.localBookmarkCount}
          />
          <MetricTile
            label={t('leaftabSyncDialog.metrics.remoteShortcuts', { defaultValue: '云端快捷方式' })}
            value={model.remoteShortcutCount}
          />
          <MetricTile
            label={t('leaftabSyncDialog.metrics.remoteBookmarks', { defaultValue: '云端书签' })}
            value={model.remoteBookmarkCount}
          />
        </div>

        {securityCard ? (
          <div>
            {securityCard}
          </div>
        ) : null}

        <div className="space-y-1">
          <DetailRow
            label={t('leaftabSyncDialog.details.lastSync', { defaultValue: '上次同步' })}
            value={model.lastSyncLabel}
          />
          <DetailRow
            label={t('leaftabSyncDialog.details.nextSync', { defaultValue: '下次同步' })}
            value={model.nextSyncLabel}
          />
          <DetailRow
            label={t('leaftabSyncDialog.details.scope', { defaultValue: '同步范围' })}
            value={model.scopeLabel}
          />
        </div>
      </div>

      {actionArea ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {actionArea}
        </div>
      ) : null}
    </section>
  );
}

export function LeafTabSyncDialog({
  open,
  onOpenChange,
  cloudAnalysis,
  webdavAnalysis,
  syncState,
  cloudSyncState,
  ready = false,
  hasConfig = false,
  busy = false,
  bookmarkScopeLabel,
  summaryText,
  cloudSignedIn = false,
  cloudEnabled = false,
  cloudSyncBookmarksEnabled = false,
  cloudUsername,
  cloudLastSyncLabel,
  cloudNextSyncLabel,
  cloudEncryptionReady = false,
  webdavConfigured = false,
  webdavEnabled = false,
  webdavSyncBookmarksEnabled = false,
  webdavProfileLabel,
  webdavUrlLabel,
  webdavLastSyncLabel,
  webdavNextSyncLabel,
  webdavEncryptionReady = false,
  onCloudSyncNow,
  onOpenCloudConfig,
  onCloudLogin,
  onCloudRepairPull,
  onCloudRepairPush,
  onSyncNow,
  onOpenSetupConfig,
  onOpenConfig,
  onWebdavRepairPull,
  onWebdavRepairPush,
}: LeafTabSyncDialogProps) {
  const { t } = useTranslation();
  void hasConfig;
  void summaryText;
  void webdavUrlLabel;
  const resolvedBookmarkScope = bookmarkScopeLabel || t('leaftabSyncDialog.scopeDefault', { defaultValue: '书签' });

  const [activeTab, setActiveTab] = useState<ProviderTab>('cloud');

  useEffect(() => {
    if (!open) return;
    if (cloudSignedIn) {
      setActiveTab('cloud');
      return;
    }
    if (webdavConfigured || webdavEnabled) {
      setActiveTab('webdav');
    }
  }, [cloudSignedIn, open, webdavConfigured, webdavEnabled]);

  const cloudModel = useMemo<ProviderModel>(() => {
    const syncing = cloudSyncState.status === 'syncing';
    const error = cloudSyncState.status === 'error';
    const enabled = cloudSignedIn && cloudEnabled;

    return {
      icon: RiCloudFill,
      title: cloudSignedIn
        ? (cloudUsername || t('leaftabSyncDialog.cloud.connectedFallback', { defaultValue: 'LeafTab 账号' }))
        : t('leaftabSyncDialog.cloud.unsignedTitle', { defaultValue: '未登录' }),
      subtitle: cloudSignedIn
        ? enabled
          ? t('leaftabSyncDialog.cloud.connectedSubtitle', { defaultValue: '已登录，可同步 LeafTab 数据' })
          : t('leaftabSyncDialog.cloud.disabledSubtitle', { defaultValue: '已登录，可在云同步设置里开启同步' })
        : t('leaftabSyncDialog.cloud.unsignedSubtitle', { defaultValue: '登录以同步数据' }),
      localShortcutCount: String(cloudAnalysis?.localSummary.shortcuts ?? 0),
      localBookmarkCount: cloudSyncBookmarksEnabled
        ? String(cloudAnalysis?.localSummary.bookmarkItems ?? 0)
        : '-',
      remoteShortcutCount: String(cloudAnalysis?.remoteSummary.shortcuts ?? 0),
      remoteBookmarkCount: cloudSyncBookmarksEnabled
        ? String(cloudAnalysis?.remoteSummary.bookmarkItems ?? 0)
        : '-',
      lastSyncLabel: cloudSignedIn
        ? (cloudLastSyncLabel || t('leaftabSyncDialog.lastSyncEmpty', { defaultValue: '暂无记录' }))
        : t('leaftabSyncDialog.lastSyncUnavailable', { defaultValue: '未同步' }),
      nextSyncLabel: enabled
        ? (cloudNextSyncLabel
          ? cloudNextSyncLabel
          : t('leaftabSyncDialog.manualSyncOnly', { defaultValue: '当前仅手动同步' }))
        : cloudSignedIn
          ? t('leaftabSyncDialog.cloud.openSettingsToEnable', { defaultValue: '前往开启' })
          : t('leaftabSyncDialog.cloud.loginToStart', { defaultValue: '登录后设置' }),
      statusLabel: !cloudSignedIn
        ? t('leaftabSyncDialog.cloud.signedOut', { defaultValue: '未登录' })
        : error
          ? t('leaftabSyncDialog.cloud.error', { defaultValue: '同步失败' })
          : syncing
            ? t('leaftabSyncCenter.status.syncing', { defaultValue: '同步中' })
            : enabled
              ? t('leaftabSyncDialog.cloud.ready', { defaultValue: '已连接' })
              : t('leaftabSyncDialog.cloud.disabled', { defaultValue: '未启用' }),
      statusTone: !cloudSignedIn ? 'neutral' : error ? 'danger' : syncing ? 'info' : enabled ? 'success' : 'neutral',
      statusIcon: !cloudSignedIn ? RiCloudFill : error ? RiErrorWarningFill : syncing ? RiRefreshFill : RiCheckboxCircleFill,
      statusSpin: syncing,
      scopeLabel: cloudSyncBookmarksEnabled
        ? t('leaftabSyncDialog.cloud.scopeRich', {
            defaultValue: '快捷方式、{{scope}}',
            scope: resolvedBookmarkScope,
          })
        : t('leaftabSyncDialog.cloud.scopeShortcutsOnly', {
            defaultValue: '仅快捷方式和设置',
          }),
    };
  }, [
    cloudAnalysis,
    cloudEnabled,
    cloudLastSyncLabel,
    cloudNextSyncLabel,
    cloudSignedIn,
    cloudSyncBookmarksEnabled,
    cloudSyncState.status,
    cloudUsername,
    resolvedBookmarkScope,
    t,
  ]);

  const webdavModel = useMemo<ProviderModel>(() => {
    const syncing = syncState.status === 'syncing';
    const error = syncState.status === 'error';

    return {
      icon: RiHardDrive3Fill,
      title: webdavConfigured
        ? (webdavProfileLabel || t('leaftabSyncDialog.webdav.connectedFallback', { defaultValue: 'WebDAV' }))
        : t('leaftabSyncDialog.webdav.unconfiguredTitle', { defaultValue: 'WebDAV 未开启' }),
      subtitle: !webdavConfigured
        ? t('leaftabSyncDialog.webdav.unconfiguredSubtitle', { defaultValue: '未配置，先去配置' })
        : webdavEnabled
          ? t('leaftabSyncDialog.webdav.enabledSubtitle', { defaultValue: '已配置，可同步到 WebDAV' })
          : t('leaftabSyncDialog.webdav.disabledSubtitle', { defaultValue: '已配置，尚未启用同步' }),
      localShortcutCount: String(webdavAnalysis?.localSummary.shortcuts ?? 0),
      localBookmarkCount: webdavSyncBookmarksEnabled
        ? String(webdavAnalysis?.localSummary.bookmarkItems ?? 0)
        : '-',
      remoteShortcutCount: String(webdavAnalysis?.remoteSummary.shortcuts ?? 0),
      remoteBookmarkCount: webdavSyncBookmarksEnabled
        ? String(webdavAnalysis?.remoteSummary.bookmarkItems ?? 0)
        : '-',
      lastSyncLabel: webdavConfigured
        ? (webdavLastSyncLabel || t('leaftabSyncDialog.lastSyncEmpty', { defaultValue: '暂无记录' }))
        : t('leaftabSyncDialog.lastSyncUnavailable', { defaultValue: '未同步' }),
      nextSyncLabel: !webdavConfigured
        ? t('leaftabSyncDialog.webdav.configureToStart', { defaultValue: '配置后设置' })
        : webdavEnabled
          ? (webdavNextSyncLabel
            ? webdavNextSyncLabel
            : t('leaftabSyncDialog.autoSyncOn', { defaultValue: '自动同步已开启' }))
          : t('leaftabSyncDialog.webdav.enableToStart', { defaultValue: '已配置，待启用' }),
      statusLabel: !webdavConfigured
        ? t('settings.backup.webdav.notConfigured', { defaultValue: '未配置' })
        : error
          ? t('leaftabSyncCenter.status.error', { defaultValue: '同步失败' })
          : syncing
            ? t('leaftabSyncCenter.status.syncing', { defaultValue: '同步中' })
            : webdavEnabled
              ? t('settings.backup.webdav.enabled', { defaultValue: '已启用' })
              : t('settings.backup.webdav.disabled', { defaultValue: '未启用' }),
      statusTone: !webdavConfigured ? 'neutral' : error ? 'danger' : syncing ? 'info' : webdavEnabled ? 'success' : 'neutral',
      statusIcon: !webdavConfigured ? RiHardDrive3Fill : error ? RiErrorWarningFill : syncing ? RiRefreshFill : RiCheckboxCircleFill,
      statusSpin: syncing,
      scopeLabel: webdavSyncBookmarksEnabled
        ? t('leaftabSyncDialog.webdav.scopeWithLabel', {
            defaultValue: '快捷方式、{{scope}}',
            scope: resolvedBookmarkScope,
          })
        : t('leaftabSyncDialog.cloud.scopeShortcutsOnly', {
            defaultValue: '仅快捷方式和设置',
          }),
    };
  }, [
    resolvedBookmarkScope,
    syncState.status,
    t,
    webdavAnalysis,
    webdavConfigured,
    webdavEnabled,
    webdavLastSyncLabel,
    webdavNextSyncLabel,
    webdavProfileLabel,
    webdavSyncBookmarksEnabled,
  ]);

  const activeModel = activeTab === 'cloud' ? cloudModel : webdavModel;
  const cloudBookmarksBanner = activeTab === 'cloud' && cloudSignedIn && !cloudSyncBookmarksEnabled
    ? (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3">
        <div className="min-w-0 text-sm text-muted-foreground">
          {t('leaftabSyncDialog.cloud.bookmarkSyncDisabledBanner', {
            defaultValue: '未开启书签同步，当前只会同步快捷方式和设置。',
          })}
        </div>
        <button
          type="button"
          className="shrink-0 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          onClick={onOpenCloudConfig}
        >
          {t('leaftabSyncDialog.cloud.enableBookmarkSyncAction', {
            defaultValue: '去开启',
          })}
        </button>
      </div>
    )
    : null;
  const securityCard = activeTab === 'cloud'
    ? (
      <SyncEncryptionStatusCard
        ready={cloudSignedIn ? cloudEncryptionReady : false}
        title={cloudSignedIn
          ? undefined
          : t('leaftabSyncEncryption.cloudNotEnabledTitle', { defaultValue: '当前未开启云同步' })}
        pillLabel={cloudSignedIn
          ? undefined
          : t('leaftabSyncEncryption.cloudNotEnabledPill', { defaultValue: '未开启' })}
      />
    )
    : (
        <SyncEncryptionStatusCard
          ready={webdavConfigured ? webdavEncryptionReady : false}
          title={webdavConfigured
            ? undefined
            : t('leaftabSyncEncryption.webdavNotEnabledTitle', { defaultValue: '当前未开启 WebDAV 同步' })}
          pillLabel={webdavConfigured
            ? undefined
            : t('leaftabSyncEncryption.webdavNotEnabledPill', { defaultValue: '未开启' })}
        />
    );
  const webdavNeedsConfiguration = !webdavConfigured || !webdavEnabled;
  const webdavPrimaryConfigureAction = webdavNeedsConfiguration ? (onOpenSetupConfig || onOpenConfig) : onOpenConfig;
  const webdavSettingsAction = webdavConfigured ? onOpenConfig : (onOpenSetupConfig || onOpenConfig);

  const actionArea = activeTab === 'cloud'
    ? (
      cloudSignedIn ? (
        <>
          <Button
            type="button"
            className="h-11 min-w-[160px] flex-1"
            onClick={cloudEnabled ? onCloudSyncNow : onOpenCloudConfig}
            disabled={busy || (cloudEnabled && cloudSyncState.status === 'syncing')}
          >
            <RiRefreshFill className={cn('size-4', cloudSyncState.status === 'syncing' ? 'animate-spin' : '')} />
            {cloudEnabled
              ? (cloudSyncState.status === 'syncing'
                ? t('leaftabSyncCenter.actions.syncing', { defaultValue: '同步中' })
                : t('settings.backup.webdav.sync', { defaultValue: '立即同步' }))
              : t('leaftabSyncDialog.cloud.enableViaSettings', { defaultValue: '前往开启同步' })}
          </Button>
          <IconActionButton
            icon={RiSettings4Fill}
            label={t('leaftabSyncDialog.cloud.manage', { defaultValue: '管理云同步' })}
            onClick={onOpenCloudConfig}
            disabled={busy}
          />
          <RepairPopover
            label={t('leaftabSyncDialog.repair', { defaultValue: '修复同步' })}
            disabled={busy}
            overwriteLocalLabel={t('leaftabSyncDialog.cloudOverwriteLocal', { defaultValue: '云端覆盖本地' })}
            overwriteRemoteLabel={t('leaftabSyncDialog.localOverwriteCloud', { defaultValue: '本地覆盖云端' })}
            onOverwriteLocal={onCloudRepairPull}
            onOverwriteRemote={onCloudRepairPush}
          />
        </>
      ) : (
        <>
          <Button type="button" className="h-11 min-w-[160px] flex-1" onClick={onCloudLogin}>
            <RiLoginBoxFill className="size-4" />
            {t('auth.buttons.login', { defaultValue: '登录' })}
          </Button>
          <IconActionButton
            icon={RiSettings4Fill}
            label={t('leaftabSyncDialog.cloud.manage', { defaultValue: '管理云同步' })}
            disabled
          />
          <RepairPopover
            label={t('leaftabSyncDialog.repair', { defaultValue: '修复同步' })}
            disabled
            overwriteLocalLabel={t('leaftabSyncDialog.cloudOverwriteLocal', { defaultValue: '云端覆盖本地' })}
            overwriteRemoteLabel={t('leaftabSyncDialog.localOverwriteCloud', { defaultValue: '本地覆盖云端' })}
          />
        </>
      )
    )
    : (
      <>
        <Button
          type="button"
          className="h-11 min-w-[160px] flex-1"
          onClick={webdavNeedsConfiguration ? webdavPrimaryConfigureAction : onSyncNow}
          disabled={busy || (webdavEnabled && !ready) || (webdavNeedsConfiguration && !webdavPrimaryConfigureAction)}
        >
          {webdavNeedsConfiguration ? (
            <RiSettings4Fill className="size-4" />
          ) : webdavEnabled ? (
            <RiRefreshFill className={cn('size-4', syncState.status === 'syncing' ? 'animate-spin' : '')} />
          ) : (
            <RiCheckboxCircleFill className="size-4" />
          )}
          {webdavNeedsConfiguration
            ? t('settings.backup.webdav.configureAction', { defaultValue: '去配置' })
            : webdavEnabled
              ? (syncState.status === 'syncing'
                ? t('leaftabSyncCenter.actions.syncing', { defaultValue: '同步中' })
                : t('settings.backup.webdav.sync', { defaultValue: '立即同步' }))
              : t('leaftabSyncDialog.enableSync', { defaultValue: '启用同步' })}
        </Button>
        <IconActionButton
          icon={RiSettings4Fill}
          label={t('settings.backup.webdav.configure', { defaultValue: '配置 WebDAV' })}
          onClick={webdavSettingsAction}
          disabled={busy || !webdavSettingsAction}
        />
        <RepairPopover
          label={t('leaftabSyncDialog.repair', { defaultValue: '修复同步' })}
          disabled={busy || !webdavEnabled}
          overwriteLocalLabel={t('leaftabSyncDialog.remoteOverwriteLocal', { defaultValue: 'WebDAV 覆盖本地' })}
          overwriteRemoteLabel={t('leaftabSyncDialog.localOverwriteRemote', { defaultValue: '本地覆盖 WebDAV' })}
          onOverwriteLocal={onWebdavRepairPull}
          onOverwriteRemote={onWebdavRepairPush}
        />
      </>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible rounded-[32px] border-border bg-background text-foreground sm:max-w-[560px]">
        <DialogHeader className="pb-3 pr-8">
          <DialogTitle>{t('leaftabSyncCenter.title', { defaultValue: '同步中心' })}</DialogTitle>
          <DialogDescription>
            {t('leaftabSyncDialog.description', { defaultValue: '统一管理云同步与 WebDAV 同步。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as ProviderTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-[16px]">
              <TabsTrigger value="cloud" className="rounded-xl">
                {t('leaftabSyncDialog.tabs.cloud', { defaultValue: '云同步' })}
              </TabsTrigger>
              <TabsTrigger value="webdav" className="rounded-xl">
                {t('leaftabSyncDialog.tabs.webdav', { defaultValue: 'WebDAV 同步' })}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {cloudBookmarksBanner}

          <ProviderCard model={activeModel} securityCard={securityCard} actionArea={actionArea} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
