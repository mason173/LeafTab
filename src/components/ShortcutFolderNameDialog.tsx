import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type ShortcutFolderNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  initialName?: string;
  onSubmit: (name: string) => void;
};

export function ShortcutFolderNameDialog({
  open,
  onOpenChange,
  title,
  description,
  initialName = '',
  onSubmit,
}: ShortcutFolderNameDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
  }, [initialName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[32px] border-border bg-background text-foreground">
        <DialogHeader className="pb-3 pr-8">
          <DialogTitle>{title || t('context.renameFolder', { defaultValue: '重命名文件夹' })}</DialogTitle>
          <DialogDescription>{description || t('context.renameFolderDesc', { defaultValue: '给这个文件夹起一个好记的名字。' })}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('context.folderPlaceholder', { defaultValue: '例如：工作 / 工具 / 娱乐' })}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const nextName = name.trim();
            if (!nextName) return;
            onSubmit(nextName);
          }}
        />
        <DialogFooter className="mt-2 flex w-full gap-4 sm:gap-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel', { defaultValue: '取消' })}
          </Button>
          <Button
            className="flex-1"
            disabled={!name.trim()}
            onClick={() => {
              const nextName = name.trim();
              if (!nextName) return;
              onSubmit(nextName);
            }}
          >
            {t('common.save', { defaultValue: '保存' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
