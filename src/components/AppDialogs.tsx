import type { ComponentProps } from 'react';
import { RiShieldCrossFill } from '@remixicon/react';
import { useTranslation } from 'react-i18next';
import { AboutLeafTabModal } from './AboutLeafTabModal';
import { AdminModal } from './AdminModal';
import AuthModal from './AuthModal';
import ConfirmDialog from './ConfirmDialog';
import ScenarioModeCreateDialog from './ScenarioModeCreateDialog';
import SettingsModal from './SettingsModal';
import ShortcutModal from './ShortcutModal';
import { WebdavConfigDialog } from './WebdavConfigDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import type { Shortcut } from '../types';

type ShortcutModalProps = ComponentProps<typeof ShortcutModal>;
type ConfirmDialogProps = ComponentProps<typeof ConfirmDialog>;
type ScenarioModeCreateDialogProps = ComponentProps<typeof ScenarioModeCreateDialog>;
type AuthModalProps = ComponentProps<typeof AuthModal>;
type SettingsModalProps = ComponentProps<typeof SettingsModal>;
type AdminModalProps = ComponentProps<typeof AdminModal>;
type AboutLeafTabModalProps = ComponentProps<typeof AboutLeafTabModal>;
type WebdavConfigDialogProps = ComponentProps<typeof WebdavConfigDialog>;

type SyncChoice = 'cloud' | 'local' | null;

type MovePageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moveDialogData: { sourceIndex: number; sourceShortcutId?: string } | null;
  getMaxPageIndex: (length: number) => number;
  shortcuts: Shortcut[];
  shortcutsPageCapacity: number;
  moveShortcutToPage: (sourceIndex: number, targetPage: number, options: { strict: boolean; sourceShortcutId?: string }) => void;
  onTargetPageSelected: (page: number) => void;
};

type ConflictChoiceDialogProps = {
  open: boolean;
  onUseCloud: () => void;
  onUseLocal: () => void;
};

type ConfirmSyncDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmChoice: SyncChoice;
  cloudCount: number;
  cloudTime: string;
  localCount: number;
  localTime: string;
  pendingLocalPayload: any;
  pendingCloudPayload: any;
  downloadBackupPayload: (payload: any, source: 'cloud' | 'local') => void;
  resolveWithCloud: () => void;
  resolveWithLocal: () => void;
  onCancel: () => void;
};

type ImportConfirmDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  payload: any | null;
  setPayload: (payload: any | null) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  downloadCloudBackupEnvelope: () => Promise<void>;
  applyUndoPayload: (payload: any) => void;
  onSuccess: () => void;
};

type DisableConsentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
  onDisagree: () => void;
};

interface AppDialogsProps {
  movePageDialog: MovePageDialogProps;
  shortcutModalProps: ShortcutModalProps;
  shortcutDeleteDialogProps: ConfirmDialogProps;
  scenarioCreateDialogProps: ScenarioModeCreateDialogProps;
  scenarioEditDialogProps: ScenarioModeCreateDialogProps;
  authModalProps: AuthModalProps;
  settingsModalProps: SettingsModalProps;
  adminModalProps: AdminModalProps;
  aboutModalProps: AboutLeafTabModalProps;
  webdavConfigDialogProps: WebdavConfigDialogProps;
  conflictChoiceDialog: ConflictChoiceDialogProps;
  confirmSyncDialog: ConfirmSyncDialogProps;
  importConfirmDialog: ImportConfirmDialogProps;
  pageDeleteDialogProps: ConfirmDialogProps;
  disableConsentDialog: DisableConsentDialogProps;
}

export function AppDialogs({
  movePageDialog,
  shortcutModalProps,
  shortcutDeleteDialogProps,
  scenarioCreateDialogProps,
  scenarioEditDialogProps,
  authModalProps,
  settingsModalProps,
  adminModalProps,
  aboutModalProps,
  webdavConfigDialogProps,
  conflictChoiceDialog,
  confirmSyncDialog,
  importConfirmDialog,
  pageDeleteDialogProps,
  disableConsentDialog,
}: AppDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Dialog open={movePageDialog.open} onOpenChange={movePageDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[480px] bg-background border-border text-foreground rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{t('context.moveToPage')}</DialogTitle>
            <DialogDescription>{t('context.moveToPageDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: movePageDialog.getMaxPageIndex(movePageDialog.shortcuts.length) + 1 }, (_, p) => p).map((p) => {
              const resolvedSourceIndex = (() => {
                if (!movePageDialog.moveDialogData) return -1;
                if (movePageDialog.moveDialogData.sourceShortcutId) {
                  const idx = movePageDialog.shortcuts.findIndex((item) => item.id === movePageDialog.moveDialogData?.sourceShortcutId);
                  if (idx >= 0) return idx;
                }
                const fallback = movePageDialog.moveDialogData.sourceIndex;
                if (fallback < 0 || fallback >= movePageDialog.shortcuts.length) return -1;
                return fallback;
              })();
              const srcPage = (() => {
                if (resolvedSourceIndex < 0) return -1;
                return Math.floor(resolvedSourceIndex / movePageDialog.shortcutsPageCapacity);
              })();
              const count = (() => {
                const start = p * movePageDialog.shortcutsPageCapacity;
                const end = Math.min(start + movePageDialog.shortcutsPageCapacity, movePageDialog.shortcuts.length);
                return Math.max(0, end - start);
              })();
              const disabled = p === srcPage;
              return (
                <PageChip
                  key={p}
                  page={p}
                  count={count}
                  pageCapacity={movePageDialog.shortcutsPageCapacity}
                  disabled={disabled}
                  onClick={() => {
                    if (!movePageDialog.moveDialogData) return;
                    if (resolvedSourceIndex < 0) return;
                    if (p === srcPage) {
                      toast.error(t('toast.alreadyOnPage'));
                      return;
                    }
                    movePageDialog.moveShortcutToPage(resolvedSourceIndex, p, {
                      strict: true,
                      sourceShortcutId: movePageDialog.moveDialogData.sourceShortcutId,
                    });
                    movePageDialog.onTargetPageSelected(p);
                    movePageDialog.onOpenChange(false);
                  }}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ShortcutModal {...shortcutModalProps} />
      <ConfirmDialog {...shortcutDeleteDialogProps} />
      <ScenarioModeCreateDialog {...scenarioCreateDialogProps} />
      <ScenarioModeCreateDialog {...scenarioEditDialogProps} />
      <AuthModal {...authModalProps} />
      <SettingsModal {...settingsModalProps} />
      <AdminModal {...adminModalProps} />
      <AboutLeafTabModal {...aboutModalProps} />
      <WebdavConfigDialog {...webdavConfigDialogProps} />

      <Dialog open={conflictChoiceDialog.open}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{t('syncConflict.title')}</DialogTitle>
            <DialogDescription>{t('syncConflict.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={conflictChoiceDialog.onUseCloud}>{t('syncConflict.useCloud')}</Button>
            <Button onClick={conflictChoiceDialog.onUseLocal}>{t('syncConflict.useLocal')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSyncDialog.open} onOpenChange={confirmSyncDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{t('syncConflict.title')}</DialogTitle>
            <DialogDescription>{t('syncConflict.description')}</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground">{t('sync.cloud')}</span>
              <span>{confirmSyncDialog.cloudCount} / {confirmSyncDialog.cloudTime || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground">{t('sync.local')}</span>
              <span>{confirmSyncDialog.localCount} / {confirmSyncDialog.localTime || '—'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={confirmSyncDialog.onCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                const chosen = confirmSyncDialog.confirmChoice;
                if (!chosen) {
                  confirmSyncDialog.onOpenChange(false);
                  return;
                }
                const backupTarget = chosen === 'cloud' ? 'local' : 'cloud';
                const backupPayload = chosen === 'cloud'
                  ? confirmSyncDialog.pendingLocalPayload
                  : confirmSyncDialog.pendingCloudPayload;
                if (backupPayload) {
                  confirmSyncDialog.downloadBackupPayload(backupPayload, backupTarget);
                  toast.success(t('syncUndo.backupToast', { backup: t(backupTarget === 'cloud' ? 'sync.cloud' : 'sync.local') }));
                }
                if (chosen === 'cloud') confirmSyncDialog.resolveWithCloud();
                else confirmSyncDialog.resolveWithLocal();
                confirmSyncDialog.onOpenChange(false);
              }}
            >
              {confirmSyncDialog.confirmChoice === 'cloud' ? t('syncConflict.useCloud') : t('syncConflict.useLocal')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importConfirmDialog.open}
        onOpenChange={(open) => {
          importConfirmDialog.setOpen(open);
          if (!open) {
            importConfirmDialog.setPayload(null);
            importConfirmDialog.setBusy(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{t('settings.backup.importConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('settings.backup.importConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={importConfirmDialog.busy}
              onClick={() => {
                importConfirmDialog.setOpen(false);
                importConfirmDialog.setPayload(null);
                importConfirmDialog.setBusy(false);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              disabled={importConfirmDialog.busy || !importConfirmDialog.payload}
              onClick={async () => {
                if (!importConfirmDialog.payload) return;
                importConfirmDialog.setBusy(true);
                await importConfirmDialog.downloadCloudBackupEnvelope();
                importConfirmDialog.applyUndoPayload(importConfirmDialog.payload);
                toast.success(t('settings.backup.importSuccess'));
                importConfirmDialog.onSuccess();
                importConfirmDialog.setOpen(false);
                importConfirmDialog.setPayload(null);
                importConfirmDialog.setBusy(false);
              }}
            >
              {t('settings.backup.importConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...pageDeleteDialogProps} />

      <Dialog open={disableConsentDialog.open} onOpenChange={disableConsentDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4">
              <RiShieldCrossFill className="w-10 h-10 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">
              {t('settings.iconAssistant.modalTitle')}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {t('settings.iconAssistant.confirmClose')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6 items-center">
            <Button className="w-full py-6 rounded-xl font-medium" onClick={disableConsentDialog.onAgree}>
              {t('settings.iconAssistant.agree')}
            </Button>
            <span
              className="text-sm text-muted-foreground cursor-pointer hover:underline px-4 py-2"
              onClick={disableConsentDialog.onDisagree}
            >
              {t('settings.iconAssistant.disagree')}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PageChip({
  page,
  count,
  pageCapacity,
  onClick,
  disabled,
}: {
  page: number;
  count: number;
  pageCapacity: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      className={`justify-between ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={onClick}
    >
      <span>{t('pagination.page', { page: page + 1 })}</span>
      <span className="text-xs text-muted-foreground">{count}/{pageCapacity}</span>
    </Button>
  );
}
