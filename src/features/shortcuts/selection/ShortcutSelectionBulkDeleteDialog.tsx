import ConfirmDialog from '@/components/ConfirmDialog';

type ShortcutSelectionBulkDeleteDialogProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  open: boolean;
  selectedShortcutCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ShortcutSelectionBulkDeleteDialog({
  t,
  open,
  selectedShortcutCount,
  onOpenChange,
  onConfirm,
}: ShortcutSelectionBulkDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('shortcutDelete.bulkTitle', { count: selectedShortcutCount, defaultValue: '批量删除快捷方式' })}
      description={t('shortcutDelete.bulkDescription', {
        count: selectedShortcutCount,
        defaultValue: '确定要删除已选的 {{count}} 个快捷方式吗？',
      })}
      confirmText={t('shortcutDelete.confirm')}
      cancelText={t('shortcutDelete.cancel')}
      onConfirm={onConfirm}
      confirmButtonClassName="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
    />
  );
}
