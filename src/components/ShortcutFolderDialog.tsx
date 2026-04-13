import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FolderShortcutSurface,
  type FolderExtractDragStartPayload,
} from '@/features/shortcuts/components/FolderShortcutSurface';
import type { FolderShortcutDropIntent } from '@/features/shortcuts/drag/types';

type ShortcutFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
};

export function ShortcutFolderDialog({
  open,
  onOpenChange,
  shortcut,
  compactIconSize = 72,
  iconCornerRadius,
  iconAppearance,
  onShortcutOpen,
  onShortcutDropIntent,
  onExtractDragStart,
}: ShortcutFolderDialogProps) {
  const { t } = useTranslation();
  const contentBoundaryRef = useRef<HTMLDivElement | null>(null);
  const children = useMemo(
    () => (shortcut && isShortcutFolder(shortcut) ? getShortcutChildren(shortcut) : []),
    [shortcut],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,calc(100vw-24px))] max-w-[720px] rounded-[32px] border-border bg-background p-0 text-foreground">
        <div ref={contentBoundaryRef}>
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
            <FolderShortcutSurface
              folderId={shortcut?.id || ''}
              shortcuts={children}
              emptyText={t('context.folderEmpty', { defaultValue: '这个文件夹里还没有快捷方式' })}
              compactIconSize={compactIconSize}
              iconCornerRadius={iconCornerRadius}
              iconAppearance={iconAppearance}
              maskBoundaryRef={contentBoundaryRef}
              onShortcutOpen={onShortcutOpen}
              onShortcutDropIntent={onShortcutDropIntent}
              onExtractDragStart={onExtractDragStart}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
