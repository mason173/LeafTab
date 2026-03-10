import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SyncConflictDialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  tertiaryLabel?: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onTertiary?: () => void;
};

export function SyncConflictDialog({
  open,
  onOpenChange,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimary,
  onSecondary,
  onTertiary,
}: SyncConflictDialogProps) {
  const hasTertiary = Boolean(tertiaryLabel && onTertiary);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className={hasTertiary ? 'grid w-full grid-cols-1 gap-1.5 sm:grid-cols-3' : 'flex w-full gap-2 sm:gap-2'}>
          {hasTertiary ? (
            <>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  className="h-auto w-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                  onClick={onPrimary}
                >
                  {primaryLabel}
                </button>
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  className="h-auto w-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                  onClick={onSecondary}
                >
                  {secondaryLabel}
                </button>
              </div>
              <Button className="w-full" onClick={onTertiary}>
                {tertiaryLabel}
              </Button>
            </>
          ) : (
            <>
              <Button className="flex-1" onClick={onPrimary}>{primaryLabel}</Button>
              <Button className="flex-1" onClick={onSecondary}>{secondaryLabel}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
