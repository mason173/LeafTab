import { useTranslation } from 'react-i18next';
import { RiShieldCheckFill, RiShieldCrossFill } from '@/icons/ri-compat';
import { cn } from '@/components/ui/utils';

interface SyncEncryptionStatusCardProps {
  ready?: boolean;
  title?: string;
  pillLabel?: string;
}

export function SyncEncryptionStatusCard({
  ready = false,
  title,
  pillLabel,
}: SyncEncryptionStatusCardProps) {
  const { t } = useTranslation();
  const ShieldIcon = ready ? RiShieldCheckFill : RiShieldCrossFill;
  const resolvedTitle = title || (ready
    ? t('leaftabSyncEncryption.statusReadyTitle', { defaultValue: '端到端加密已开启' })
    : t('leaftabSyncEncryption.statusMissingTitle', { defaultValue: '同步口令尚未设置' }));
  const resolvedPillLabel = pillLabel || (ready
    ? t('leaftabSyncEncryption.statusReadyPill', { defaultValue: '已保护' })
    : t('leaftabSyncEncryption.statusMissingPill', { defaultValue: '未设置' }));

  return (
    <div
      className={cn(
        'relative h-8 overflow-hidden rounded-[16px] border px-2',
        ready
          ? 'border-border bg-background text-black dark:border-border dark:bg-background dark:text-white'
          : 'border-border/70 bg-secondary/25',
      )}
    >
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldIcon
            className={cn(
              'size-4 shrink-0',
              ready ? 'text-black dark:text-white' : 'text-muted-foreground',
            )}
          />

          <div className={cn('truncate text-xs font-medium leading-none', ready ? 'text-black dark:text-white' : 'text-foreground')}>
            {resolvedTitle}
          </div>
        </div>

        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5 text-xs font-medium leading-none',
            ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              ready ? 'bg-emerald-500' : 'bg-muted-foreground/45',
            )}
          />
          <span>{resolvedPillLabel}</span>
        </div>
      </div>
    </div>
  );
}
