import { RiCheckFill, RiErrorWarningFill, RiRefreshFill } from '@/icons/ri-compat';
import type { LongTaskIndicatorState } from '@/hooks/useLongTaskIndicator';
import { cn } from '@/components/ui/utils';

interface LongTaskIndicatorProps {
  task: LongTaskIndicatorState | null;
  className?: string;
}

export function LongTaskIndicator({ task, className }: LongTaskIndicatorProps) {
  if (!task) return null;

  const icon = task.tone === 'error'
    ? <RiErrorWarningFill className="size-4" />
    : task.tone === 'success'
      ? <RiCheckFill className="size-4" />
      : <RiRefreshFill className="size-4 animate-spin" />;
  const iconClassName = task.tone === 'error'
    ? 'bg-destructive/12 text-destructive'
    : task.tone === 'success'
      ? 'bg-emerald-500/12 text-emerald-600'
      : 'bg-primary/10 text-primary';

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-1/2 top-0 z-[16020] w-full max-w-[calc(100vw-1.5rem)] -translate-x-1/2 px-3 pt-3 sm:max-w-[460px]',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={cn(
        'overflow-hidden rounded-[18px] border bg-background/96 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl animate-in slide-in-from-top-2 fade-in',
        task.tone === 'error' ? 'border-destructive/30' : 'border-border/70',
      )}>
        <div className="flex min-h-[52px] items-center gap-3 px-3.5 py-2.5">
          <div className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            iconClassName,
          )}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium leading-5 text-foreground">
              {task.title}
            </div>
            {task.detail ? (
              <div className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
                {task.detail}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums text-muted-foreground">
              {task.progress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
