import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import type { Shortcut, ShortcutDraft } from '@/types';
import { ShortcutEditorPanel } from '@/components/ShortcutEditorPanel';

interface ShortcutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  initialShortcut?: Partial<Shortcut> | null;
  onSave: (
    value: ShortcutDraft,
    localOnly?: {
      useCustomIcon?: boolean;
      customIconDataUrl?: string | null;
    },
  ) => void;
}

export default function ShortcutModal({
  isOpen,
  onOpenChange,
  mode,
  initialShortcut,
  onSave,
}: ShortcutModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ width: 'min(520px, calc(100vw - 32px))', maxWidth: 'min(520px, calc(100vw - 32px))' }}
        data-testid="shortcut-modal"
        className="w-full sm:max-w-[520px] max-w-[calc(100vw-32px)] bg-background border-border text-foreground rounded-[32px] overflow-hidden p-6 flex flex-col"
      >
        <DialogHeader className="sr-only">
          <DialogTitle className="text-foreground">{mode === 'add' ? t('shortcutModal.addTitle') : t('shortcutModal.editTitle')}</DialogTitle>
        </DialogHeader>
        <ShortcutEditorPanel
          mode={mode}
          open={isOpen}
          initialShortcut={initialShortcut}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
