import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiDownload2Fill, RiFolderTransferLine, RiLinkM, RiUpload2Fill } from '@/icons/ri-compat';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LeafTabLocalBackupExportScope } from '@/sync/leaftab';

interface BackupScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'export' | 'import';
  availableScope?: Partial<LeafTabLocalBackupExportScope> | null;
  onConfirm: (scope: LeafTabLocalBackupExportScope) => void | Promise<void>;
}

const normalizeScope = (scope?: Partial<LeafTabLocalBackupExportScope> | null): LeafTabLocalBackupExportScope => ({
  shortcuts: scope?.shortcuts !== false,
  bookmarks: scope?.bookmarks !== false,
});

export function BackupScopeDialog({
  open,
  onOpenChange,
  mode,
  availableScope,
  onConfirm,
}: BackupScopeDialogProps) {
  const { t } = useTranslation();
  const resolvedAvailableScope = useMemo(() => normalizeScope(availableScope), [availableScope]);
  const [includeShortcuts, setIncludeShortcuts] = useState(resolvedAvailableScope.shortcuts);
  const [includeBookmarks, setIncludeBookmarks] = useState(resolvedAvailableScope.bookmarks);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIncludeShortcuts(resolvedAvailableScope.shortcuts);
    setIncludeBookmarks(resolvedAvailableScope.bookmarks);
    setSubmitting(false);
  }, [open, resolvedAvailableScope.bookmarks, resolvedAvailableScope.shortcuts]);

  const canConfirm = includeShortcuts || includeBookmarks;
  const nextScope = useMemo(() => ({
    shortcuts: includeShortcuts,
    bookmarks: includeBookmarks,
  }), [includeBookmarks, includeShortcuts]);

  const handleConfirm = async () => {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    onOpenChange(false);
    try {
      await onConfirm(nextScope);
    } finally {
      setSubmitting(false);
    }
  };

  const isExport = mode === 'export';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[32px] border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isExport
              ? t('settings.backup.exportScope.title', { defaultValue: '选择导出内容' })
              : t('settings.backup.importScope.title', { defaultValue: '选择导入内容' })}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isExport
              ? t('settings.backup.exportScope.description', {
                  defaultValue: '可以只导出快捷方式，或只导出书签。至少要保留一项，默认两项都会一起导出。',
                })
              : t('settings.backup.importScope.description', {
                  defaultValue: '这个备份同时包含快捷方式和书签。你可以只导入其中一部分，至少要保留一项。',
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className={`flex items-start gap-3 rounded-[24px] border px-4 py-4 transition-colors ${resolvedAvailableScope.shortcuts ? 'cursor-pointer border-border/70 bg-secondary/35 hover:bg-secondary/55' : 'cursor-not-allowed border-border/40 bg-secondary/15 opacity-55'}`}>
            <Checkbox
              checked={includeShortcuts}
              onCheckedChange={(checked: boolean | 'indeterminate') => setIncludeShortcuts(Boolean(checked))}
              className="mt-0.5"
              disabled={!resolvedAvailableScope.shortcuts}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <RiLinkM className="size-4 text-primary" />
                {t('settings.backup.exportScope.shortcuts', { defaultValue: '快捷方式' })}
              </div>
              <div className="mt-1 text-xs leading-6 text-muted-foreground">
                {resolvedAvailableScope.shortcuts
                  ? t('settings.backup.exportScope.shortcutsDesc', {
                      defaultValue: '导出场景、快捷方式和它们的顺序信息。',
                    })
                  : t('settings.backup.importScope.shortcutsUnavailable', {
                      defaultValue: '这个备份里不包含快捷方式内容。',
                    })}
              </div>
            </div>
          </label>

          <label className={`flex items-start gap-3 rounded-[24px] border px-4 py-4 transition-colors ${resolvedAvailableScope.bookmarks ? 'cursor-pointer border-border/70 bg-secondary/35 hover:bg-secondary/55' : 'cursor-not-allowed border-border/40 bg-secondary/15 opacity-55'}`}>
            <Checkbox
              checked={includeBookmarks}
              onCheckedChange={(checked: boolean | 'indeterminate') => setIncludeBookmarks(Boolean(checked))}
              className="mt-0.5"
              disabled={!resolvedAvailableScope.bookmarks}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <RiFolderTransferLine className="size-4 text-primary" />
                {t('settings.backup.exportScope.bookmarks', { defaultValue: '书签' })}
              </div>
              <div className="mt-1 text-xs leading-6 text-muted-foreground">
                {resolvedAvailableScope.bookmarks
                  ? t('settings.backup.exportScope.bookmarksDesc', {
                      defaultValue: '导出当前同步范围内的浏览器书签树与顺序信息。',
                    })
                  : t('settings.backup.importScope.bookmarksUnavailable', {
                      defaultValue: '这个备份里不包含书签内容。',
                    })}
              </div>
            </div>
          </label>

          {!canConfirm ? (
            <div className="rounded-[20px] border border-destructive/25 bg-destructive/8 px-4 py-3 text-xs leading-6 text-destructive">
              {t('settings.backup.exportScope.requireOne', { defaultValue: '至少选择一项导出内容。' })}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="secondary"
            className="rounded-[18px]"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel', { defaultValue: '取消' })}
          </Button>
          <Button
            className="gap-2 rounded-[18px]"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || submitting}
          >
            {isExport ? <RiDownload2Fill className="size-4" /> : <RiUpload2Fill className="size-4" />}
            {isExport
              ? t('settings.backup.export', { defaultValue: '导出' })
              : t('settings.backup.import', { defaultValue: '导入' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
