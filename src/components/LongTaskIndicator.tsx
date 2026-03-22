import { RiRefreshFill } from '@/icons/ri-compat';
import type { LongTaskIndicatorState } from '@/hooks/useLongTaskIndicator';
import { cn } from '@/components/ui/utils';

interface LongTaskIndicatorProps {
  task: LongTaskIndicatorState | null;
  className?: string;
}

export function LongTaskIndicator({ task, className }: LongTaskIndicatorProps) {
  if (!task) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-1/2 top-0 z-[16020] w-full max-w-[calc(100vw-1.5rem)] -translate-x-1/2 px-3 pt-3 sm:max-w-[460px]',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="overflow-hidden rounded-[18px] border border-border/70 bg-background/96 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl animate-in slide-in-from-top-2 fade-in">
        <div className="flex min-h-[52px] items-center gap-3 px-3.5 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <RiRefreshFill className="size-4 animate-spin" />
          </div>
          <div className="min-w-0 flex-1 truncate text-sm font-medium leading-5 text-foreground">
            {task.title}
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
