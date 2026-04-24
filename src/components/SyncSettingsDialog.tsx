import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';

type SyncSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  scrollClassName?: string;
  onBackToParent?: () => void;
  backButtonLabel?: string;
};

export function SyncSettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  scrollClassName = 'max-h-[60vh]',
  onBackToParent,
  backButtonLabel,
}: SyncSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[560px] max-h-[85vh] overflow-visible bg-background border-border text-foreground rounded-[32px] ${contentClassName || ''}`}>
        <DialogHeader className="pb-3 pr-8">
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToParent} label={backButtonLabel} />
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ScrollArea
          className={scrollClassName}
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          {children}
        </ScrollArea>
        {footer ? <DialogFooter className="flex w-full gap-4 sm:gap-4">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
