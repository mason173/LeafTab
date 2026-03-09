import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import ShortcutIcon from './ShortcutIcon';
import { useTranslation } from 'react-i18next';

interface ShortcutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  initialTitle?: string;
  initialUrl?: string;
  initialIcon?: string;
  onSave: (title: string, url: string) => void;
}

export default function ShortcutModal({ 
  isOpen, 
  onOpenChange, 
  mode, 
  initialTitle = '', 
  initialUrl = '', 
  initialIcon = 'chatgpt',
  onSave 
}: ShortcutModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setUrl(initialUrl);
    }
  }, [isOpen, initialTitle, initialUrl]);

  const handleSave = () => {
    if (!title.trim() || !url.trim()) {
      toast.error(t('shortcutModal.errors.fillAll'), {
        description: t('shortcutModal.errors.fillAllDesc'),
      });
      return;
    }
    onSave(title, url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ width: 'min(420px, calc(100vw - 32px))', maxWidth: 'min(420px, calc(100vw - 32px))' }}
        className="w-full sm:max-w-[420px] max-w-[calc(100vw-32px)] bg-background border-border text-foreground rounded-[24px] overflow-hidden p-6 block"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{mode === 'add' ? t('shortcutModal.addTitle') : t('shortcutModal.editTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-[16px] items-center w-full mt-6">
          <ShortcutIcon icon={initialIcon} url={url} size={36} frame="auto" />
          <div className="flex flex-col gap-[4px] items-start w-full">
            <p className="font-['PingFang_SC:Regular',sans-serif] text-muted-foreground text-[12px] w-full">{t('shortcutModal.nameLabel')}</p>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('shortcutModal.namePlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-[4px] items-start w-full">
            <p className="font-['PingFang_SC:Regular',sans-serif] text-muted-foreground text-[12px] w-full">{t('shortcutModal.urlLabel')}</p>
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('shortcutModal.urlPlaceholder')}
            />
          </div>
          <div className="flex w-full gap-4 mt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-colors text-[14px]"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors text-[14px] font-medium"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
