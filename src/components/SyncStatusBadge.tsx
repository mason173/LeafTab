import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/utils';

type SyncStatusBadgeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const toneClasses: Record<SyncStatusBadgeTone, string> = {
  info: 'border-primary/25 bg-primary/15 text-primary hover:bg-primary/20',
  success: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20',
  warning: 'border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
  danger: 'border-red-500/25 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/20',
  neutral: 'border-border bg-secondary/70 text-muted-foreground hover:bg-secondary',
};

export function SyncStatusBadge({
  label,
  tone = 'info',
  className,
}: {
  label: string;
  tone?: SyncStatusBadgeTone;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        'w-fit rounded-md border px-2 py-0.5 text-[11px] font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </Badge>
  );
}
