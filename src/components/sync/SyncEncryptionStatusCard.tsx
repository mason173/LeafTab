import { useTranslation } from 'react-i18next';
import { RiShieldCheckFill, RiShieldCrossFill } from '@/icons/ri-compat';
import { cn } from '@/components/ui/utils';

interface SyncEncryptionStatusCardProps {
  ready?: boolean;
  title?: string;
  description?: string;
  pillLabel?: string;
}

export function SyncEncryptionStatusCard({
  ready = false,
  title,
  description,
  pillLabel,
}: SyncEncryptionStatusCardProps) {
  const { t } = useTranslation();
  const ShieldIcon = ready ? RiShieldCheckFill : RiShieldCrossFill;
  const resolvedTitle = title || (ready
    ? t('leaftabSyncEncryption.statusReadyTitle', { defaultValue: '端到端加密已开启' })
    : t('leaftabSyncEncryption.statusMissingTitle', { defaultValue: '同步口令尚未设置' }));
  const resolvedDescription = description || (ready
    ? t('leaftabSyncEncryption.statusReadyDescription', {
        defaultValue: '只有已解锁设备才能读取同步内容。',
      })
    : t('leaftabSyncEncryption.statusMissingDescription', {
        defaultValue: '启用同步前，需要先设置这组同步口令。',
      }));
  const resolvedPillLabel = pillLabel || (ready
    ? t('leaftabSyncEncryption.statusReadyPill', { defaultValue: '已保护' })
    : t('leaftabSyncEncryption.statusMissingPill', { defaultValue: '未设置' }));

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border px-4 py-3',
        ready
          ? 'border-border bg-background text-black dark:border-border dark:bg-background dark:text-white'
          : 'border-border/70 bg-secondary/25',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border',
              ready
                ? 'border-border/80 bg-black/[0.03] text-black dark:border-border/80 dark:bg-white/[0.04] dark:text-white'
                : 'border-border/70 bg-background/60 text-muted-foreground',
            )}
          >
            <ShieldIcon className="size-5" />
          </div>

          <div className="min-w-0">
            <div className={cn('text-sm font-semibold', ready ? 'text-black dark:text-white' : 'text-foreground')}>
              {resolvedTitle}
            </div>
            <div className={cn('mt-1 text-xs leading-5', ready ? 'text-black/72 dark:text-white/78' : 'text-muted-foreground')}>
              {resolvedDescription}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
              ready
                ? 'border-border/80 bg-black/[0.03] text-black dark:border-border/80 dark:bg-white/[0.04] dark:text-white'
                : 'border-border/70 bg-background/50 text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                ready ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.12)] dark:bg-white dark:shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-muted-foreground/45',
              )}
            />
            {resolvedPillLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
