import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Shortcut } from '@/types';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';

type ShortcutFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
  iconCornerRadius?: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
};

export function ShortcutFolderDialog({
  open,
  onOpenChange,
  shortcut,
  iconCornerRadius,
  onShortcutOpen,
}: ShortcutFolderDialogProps) {
  const { t } = useTranslation();
  const children = useMemo(
    () => (shortcut && isShortcutFolder(shortcut) ? getShortcutChildren(shortcut) : []),
    [shortcut],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,calc(100vw-24px))] max-w-[720px] rounded-[32px] border-border bg-background p-0 text-foreground">
        <DialogHeader className="border-b border-border/70 px-6 pb-4 pt-6">
          <DialogTitle>{shortcut?.title || t('context.folder', { defaultValue: '文件夹' })}</DialogTitle>
          <DialogDescription>
            {t('context.folderCount', {
              count: children.length,
              defaultValue: `${children.length} 个快捷方式`,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 pt-5">
          {children.length > 0 ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4">
              {children.map((child) => (
                <div key={child.id} className="flex justify-center">
                  <ShortcutCardCompact
                    shortcut={child}
                    showTitle
                    iconSize={72}
                    iconCornerRadius={iconCornerRadius}
                    titleFontSize={12}
                    onOpen={() => onShortcutOpen(child)}
                    onContextMenu={(event) => event.preventDefault()}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-secondary/20 text-sm text-muted-foreground">
              {t('context.folderEmpty', { defaultValue: '这个文件夹里还没有快捷方式' })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
