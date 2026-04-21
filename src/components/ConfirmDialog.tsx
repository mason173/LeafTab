import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SettingsDialogContent } from "@/components/settings/SettingsDialogSurface";
import { useTranslation } from "react-i18next";

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText,
  confirmText,
  onConfirm,
  cancelButtonClassName,
  confirmButtonClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm: () => void;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
}) {
  const { t } = useTranslation();
  const resolvedCancelText = cancelText ?? t('common.cancel');
  const resolvedConfirmText = confirmText ?? t('common.confirm');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SettingsDialogContent className="sm:max-w-[420px] rounded-[32px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex w-full gap-4 sm:gap-4">
          <Button data-testid="confirm-dialog-cancel" className={cancelButtonClassName ?? "flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80"} onClick={() => onOpenChange(false)}>
            {resolvedCancelText}
          </Button>
          <Button data-testid="confirm-dialog-confirm" className={confirmButtonClassName ?? "flex-1 bg-primary text-primary-foreground hover:bg-primary/90"} onClick={onConfirm}>
            {resolvedConfirmText}
          </Button>
        </DialogFooter>
      </SettingsDialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
