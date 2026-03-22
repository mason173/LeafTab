import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiCloudFill,
  RiErrorWarningFill,
  RiHardDrive3Fill,
  RiLoginBoxFill,
  RiLogoutBoxRFill,
  RiRefreshFill,
  RiSettings4Fill,
} from '@/icons/ri-compat';
import { useTranslation } from 'react-i18next';
import type { LeafTabSyncAnalysis } from '@/sync/leaftab';
import type { SyncState } from '@/sync/stateMachine';
import { cn } from '@/components/ui/utils';

export interface LeafTabSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: LeafTabSyncAnalysis | null;
  syncState: SyncState;
  cloudSyncState: SyncState;
  ready?: boolean;
  hasConfig?: boolean;
  busy?: boolean;
  bookmarkScopeLabel?: string;
  summaryText?: string;
  cloudSignedIn?: boolean;
  cloudEnabled?: boolean;
  cloudUsername?: string;
  cloudLastSyncLabel?: string;
  cloudNextSyncLabel?: string;
  cloudEncryptionLabel?: string;
  webdavConfigured?: boolean;
  webdavEnabled?: boolean;
  webdavProfileLabel?: string;
  webdavUrlLabel?: string;
  webdavLastSyncLabel?: string;
  webdavNextSyncLabel?: string;
  webdavEncryptionLabel?: string;
  onCloudSyncNow?: () => void;
  onOpenCloudConfig?: () => void;
  onCloudLogin?: () => void;
  onCloudLogout?: () => void;
  onSyncNow: () => void;
  onEnableSync?: () => void;
  onDisableSync?: () => void;
  onOpenConfig?: () => void;
}

type ProviderTab = 'cloud' | 'webdav';
type StatusTone = 'neutral' | 'info' | 'success' | 'danger';

type ProviderAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  spin?: boolean;
};

type ProviderModel = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  shortcutCount: string;
  bookmarkCount: string;
  lastSyncLabel: string;
  nextSyncLabel: string;
  statusLabel: string;
  statusTone: StatusTone;
  statusIcon: ComponentType<{ className?: string }>;
  statusSpin?: boolean;
  scopeLabel: string;
  encryptionLabel: string;
  actions: ProviderAction[];
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
    <div className="rounded-[20px] border border-border/70 bg-background/70 px-4 py-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight text-foreground">{value}</div>
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

function ProviderCard({ model }: { model: ProviderModel }) {
  const ProviderIcon = model.icon;

  return (
    <section className="overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-border/60 bg-background/70 text-primary">
              <ProviderIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight text-foreground">
                {model.title}
              </div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">
                {model.subtitle}
              </div>
            </div>
          </div>
          <StatusBadge
            tone={model.statusTone}
            icon={model.statusIcon}
            label={model.statusLabel}
            spin={model.statusSpin}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricTile label="快捷方式" value={model.shortcutCount} />
          <MetricTile label="书签" value={model.bookmarkCount} />
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 px-5 pt-4">
        <div className="space-y-1">
          <DetailRow label="上次同步" value={model.lastSyncLabel} />
          <DetailRow label="下次同步" value={model.nextSyncLabel} />
          <DetailRow label="同步口令" value={model.encryptionLabel} />
          <DetailRow label="同步范围" value={model.scopeLabel} />
        </div>
      </div>

      {model.actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 px-5 pt-4">
          {model.actions.map((action, index) => {
            const Icon = action.icon;
            const isPrimary = action.variant === 'default' || (!action.variant && index === 0);
            return (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? (index === 0 ? 'default' : 'outline')}
                className={cn(
                  'h-11',
                  isPrimary ? 'min-w-[160px] flex-1' : 'border-border/70 bg-background text-foreground hover:bg-accent/60 hover:text-foreground dark:border-border/70 dark:bg-background dark:hover:bg-accent/50 px-4',
                )}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <Icon className={cn('size-4', action.spin ? 'animate-spin' : '')} />
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function LeafTabSyncDialog({
  open,
  onOpenChange,
  analysis,
  syncState,
  cloudSyncState,
  ready = false,
  hasConfig = false,
  busy = false,
  bookmarkScopeLabel,
  summaryText,
  cloudSignedIn = false,
  cloudEnabled = false,
  cloudUsername,
  cloudLastSyncLabel,
  cloudNextSyncLabel,
  cloudEncryptionLabel,
  webdavConfigured = false,
  webdavEnabled = false,
  webdavProfileLabel,
  webdavUrlLabel,
  webdavLastSyncLabel,
  webdavNextSyncLabel,
  webdavEncryptionLabel,
  onCloudSyncNow,
  onOpenCloudConfig,
  onCloudLogin,
  onCloudLogout,
  onSyncNow,
  onEnableSync,
  onDisableSync,
  onOpenConfig,
}: LeafTabSyncDialogProps) {
  const { t } = useTranslation();
  void hasConfig;
  void summaryText;
  void webdavUrlLabel;

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

  const shortcutCount = String(analysis?.localSummary.shortcuts ?? 0);
  const bookmarkCount = String(analysis?.localSummary.bookmarkItems ?? 0);

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
      shortcutCount,
      bookmarkCount,
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
      encryptionLabel: cloudSignedIn
        ? (cloudEncryptionLabel || t('leaftabSyncEncryption.missingShortLabel', { defaultValue: '未设置' }))
        : t('leaftabSyncDialog.cloud.loginToStart', { defaultValue: '登录后设置' }),
      scopeLabel: t('leaftabSyncDialog.cloud.scopeRich', {
        defaultValue: '快捷方式、书签',
      }),
      actions: cloudSignedIn ? [
        ...(enabled ? [{
          label: syncing
            ? t('leaftabSyncCenter.actions.syncing', { defaultValue: '同步中' })
            : t('settings.backup.webdav.sync', { defaultValue: '立即同步' }),
          icon: RiRefreshFill,
          variant: 'default' as const,
          onClick: onCloudSyncNow,
          disabled: syncing,
          spin: syncing,
        }] : [{
          label: t('leaftabSyncDialog.cloud.enableViaSettings', { defaultValue: '前往开启同步' }),
          icon: RiSettings4Fill,
          variant: 'default' as const,
          onClick: onOpenCloudConfig,
        }]),
        {
          label: t('leaftabSyncDialog.cloud.manage', { defaultValue: '管理云同步' }),
          icon: RiSettings4Fill,
          variant: 'outline' as const,
          onClick: onOpenCloudConfig,
        },
        {
          label: t('settings.profile.logout', { defaultValue: '退出账号' }),
          icon: RiLogoutBoxRFill,
          variant: 'ghost' as const,
          onClick: onCloudLogout,
        },
      ] : [{
        label: t('auth.buttons.login', { defaultValue: '登录' }),
        icon: RiLoginBoxFill,
        variant: 'default' as const,
        onClick: onCloudLogin,
      }],
    };
  }, [
    bookmarkCount,
    cloudEnabled,
    cloudEncryptionLabel,
    cloudLastSyncLabel,
    cloudNextSyncLabel,
    cloudSignedIn,
    cloudSyncState.status,
    cloudUsername,
    onCloudLogin,
    onCloudLogout,
    onCloudSyncNow,
    onOpenCloudConfig,
    shortcutCount,
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
      shortcutCount,
      bookmarkCount,
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
      statusIcon: !webdavConfigured ? RiHardDrive3Fill : error ? RiErrorWarningFill : syncing ? RiRefreshFill : webdavEnabled ? RiCheckboxCircleFill : RiHardDrive3Fill,
      statusSpin: syncing,
      encryptionLabel: webdavConfigured
        ? (webdavEncryptionLabel || t('leaftabSyncEncryption.missingShortLabel', { defaultValue: '未设置' }))
        : t('leaftabSyncDialog.webdav.configureToStart', { defaultValue: '配置后设置' }),
      scopeLabel: bookmarkScopeLabel
        ? t('leaftabSyncDialog.webdav.scopeWithLabel', {
            defaultValue: '快捷方式、{{scope}}',
            scope: bookmarkScopeLabel.replace(/\s*\/\s*/g, '、'),
          })
        : t('leaftabSyncDialog.webdav.scope', {
            defaultValue: '快捷方式、书签',
          }),
      actions: !webdavConfigured ? [{
        label: t('settings.backup.webdav.configureAction', { defaultValue: '去配置' }),
        icon: RiSettings4Fill,
        variant: 'default' as const,
        onClick: onOpenConfig,
        disabled: busy,
      }] : webdavEnabled ? [
        {
          label: syncing
            ? t('leaftabSyncCenter.actions.syncing', { defaultValue: '同步中' })
            : t('settings.backup.webdav.sync', { defaultValue: '立即同步' }),
          icon: RiRefreshFill,
          variant: 'default' as const,
          onClick: onSyncNow,
          disabled: busy || !ready,
          spin: syncing,
        },
        {
          label: t('settings.backup.webdav.configure', { defaultValue: '配置 WebDAV' }),
          icon: RiSettings4Fill,
          variant: 'outline' as const,
          onClick: onOpenConfig,
          disabled: busy,
        },
        {
          label: t('leaftabSyncDialog.disableSync', { defaultValue: '停用同步' }),
          icon: RiCloseCircleFill,
          variant: 'ghost' as const,
          onClick: onDisableSync,
          disabled: busy,
        },
      ] : [
        {
          label: t('leaftabSyncDialog.enableSync', { defaultValue: '启用同步' }),
          icon: RiCheckboxCircleFill,
          variant: 'default' as const,
          onClick: onEnableSync,
          disabled: busy || !ready,
        },
        {
          label: t('settings.backup.webdav.configure', { defaultValue: '配置 WebDAV' }),
          icon: RiSettings4Fill,
          variant: 'outline' as const,
          onClick: onOpenConfig,
          disabled: busy,
        },
      ],
    };
  }, [
    bookmarkCount,
    bookmarkScopeLabel,
    busy,
    onDisableSync,
    onEnableSync,
    onOpenConfig,
    onSyncNow,
    ready,
    shortcutCount,
    syncState.status,
    t,
    webdavConfigured,
    webdavEncryptionLabel,
    webdavEnabled,
    webdavLastSyncLabel,
    webdavNextSyncLabel,
    webdavProfileLabel,
  ]);

  const activeModel = activeTab === 'cloud' ? cloudModel : webdavModel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border text-foreground rounded-[32px] overflow-visible">
        <DialogHeader>
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

          <ProviderCard model={activeModel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
