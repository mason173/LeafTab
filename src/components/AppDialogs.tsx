import { useEffect, useState, type ComponentProps } from 'react';
import { RiShieldCrossFill } from '@/icons/ri-compat';
import { useTranslation } from 'react-i18next';
import { AboutLeafTabModal } from './AboutLeafTabModal';
import { AdminModal } from './AdminModal';
import AuthModal from './AuthModal';
import ConfirmDialog from './ConfirmDialog';
import ScenarioModeCreateDialog from './ScenarioModeCreateDialog';
import SettingsModal from './SettingsModal';
import { SearchSettingsModal } from './SearchSettingsModal';
import { ShortcutGuideDialog } from './ShortcutGuideDialog';
import { ShortcutIconSettingsDialog } from './ShortcutIconSettingsDialog';
import { ShortcutStyleSettingsDialog } from './ShortcutStyleSettingsDialog';
import ShortcutModal from './ShortcutModal';
import { SyncPreviewConfirmDialog } from './SyncPreviewConfirmDialog';
import { BackupScopeDialog } from './BackupScopeDialog';
import { WebdavConfigDialog } from './WebdavConfigDialog';
import { CloudSyncConfigDialog } from './CloudSyncConfigDialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ShortcutModalProps = ComponentProps<typeof ShortcutModal>;
type ConfirmDialogProps = ComponentProps<typeof ConfirmDialog>;
type ScenarioModeCreateDialogProps = ComponentProps<typeof ScenarioModeCreateDialog>;
type AuthModalProps = ComponentProps<typeof AuthModal>;
type SettingsModalProps = ComponentProps<typeof SettingsModal>;
type SearchSettingsModalProps = ComponentProps<typeof SearchSettingsModal>;
type ShortcutGuideDialogProps = ComponentProps<typeof ShortcutGuideDialog>;
type ShortcutIconSettingsDialogProps = ComponentProps<typeof ShortcutIconSettingsDialog>;
type ShortcutStyleSettingsDialogProps = ComponentProps<typeof ShortcutStyleSettingsDialog>;
type AdminModalProps = ComponentProps<typeof AdminModal>;
type AboutLeafTabModalProps = ComponentProps<typeof AboutLeafTabModal>;
type WebdavConfigDialogProps = ComponentProps<typeof WebdavConfigDialog>;
type CloudSyncConfigDialogProps = ComponentProps<typeof CloudSyncConfigDialog>;
type BackupScopeDialogProps = ComponentProps<typeof BackupScopeDialog>;

type SyncChoice = 'cloud' | 'local' | 'merge' | null;

type ConfirmSyncDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmChoice: SyncChoice;
  onChoiceChange?: (choice: Exclude<SyncChoice, null>) => void;
  enableChoiceSwitch?: boolean;
  title: string;
  description: string;
  confirmCloudLabel: string;
  confirmLocalLabel: string;
  confirmMergeLabel?: string;
  cloudCount: number;
  cloudTime: string;
  cloudPayload?: any | null;
  localCount: number;
  localTime: string;
  localPayload?: any | null;
  onConfirm: () => void;
  onCancel: () => void;
  requireDecision?: boolean;
};

type ImportConfirmDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  payload: any | null;
  setPayload: (payload: any | null) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  downloadCloudBackupEnvelope: () => Promise<void>;
  applyUndoPayload: (payload: any) => Promise<boolean>;
  onSuccess: () => void;
};

type DisableConsentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
  onDisagree: () => void;
};

interface AppDialogsProps {
  shortcutModalProps: ShortcutModalProps;
  shortcutDeleteDialogProps: ConfirmDialogProps;
  scenarioCreateDialogProps: ScenarioModeCreateDialogProps;
  scenarioEditDialogProps: ScenarioModeCreateDialogProps;
  authModalProps: AuthModalProps;
  settingsModalProps: SettingsModalProps;
  searchSettingsModalProps: SearchSettingsModalProps;
  shortcutGuideDialogProps: ShortcutGuideDialogProps;
  shortcutIconSettingsDialogProps: ShortcutIconSettingsDialogProps;
  shortcutStyleSettingsDialogProps: ShortcutStyleSettingsDialogProps;
  adminModalProps: AdminModalProps;
  aboutModalProps: AboutLeafTabModalProps;
  exportBackupDialogProps: BackupScopeDialogProps;
  importBackupDialogProps: BackupScopeDialogProps;
  webdavConfigDialogProps: WebdavConfigDialogProps;
  cloudSyncConfigDialogProps: CloudSyncConfigDialogProps;
  confirmSyncDialog: ConfirmSyncDialogProps;
  importConfirmDialog: ImportConfirmDialogProps;
  disableConsentDialog: DisableConsentDialogProps;
}

function useKeepMountedAfterFirstOpen(open: boolean) {
  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  return hasOpened || open;
}

export function AppDialogs({
  shortcutModalProps,
  shortcutDeleteDialogProps,
  scenarioCreateDialogProps,
  scenarioEditDialogProps,
  authModalProps,
  settingsModalProps,
  searchSettingsModalProps,
  shortcutGuideDialogProps,
  shortcutIconSettingsDialogProps,
  shortcutStyleSettingsDialogProps,
  adminModalProps,
  aboutModalProps,
  exportBackupDialogProps,
  importBackupDialogProps,
  webdavConfigDialogProps,
  cloudSyncConfigDialogProps,
  confirmSyncDialog,
  importConfirmDialog,
  disableConsentDialog,
}: AppDialogsProps) {
  const { t } = useTranslation();
  const shouldMountShortcutModal = useKeepMountedAfterFirstOpen(shortcutModalProps.isOpen);
  const shouldMountScenarioCreateDialog = useKeepMountedAfterFirstOpen(scenarioCreateDialogProps.open);
  const shouldMountScenarioEditDialog = useKeepMountedAfterFirstOpen(scenarioEditDialogProps.open);
  const shouldMountAuthModal = useKeepMountedAfterFirstOpen(authModalProps.isOpen);
  const shouldMountSettingsModal = useKeepMountedAfterFirstOpen(settingsModalProps.isOpen);
  const shouldMountSearchSettingsModal = useKeepMountedAfterFirstOpen(searchSettingsModalProps.isOpen);
  const shouldMountShortcutGuideDialog = useKeepMountedAfterFirstOpen(shortcutGuideDialogProps.open);
  const shouldMountShortcutIconSettingsDialog = useKeepMountedAfterFirstOpen(shortcutIconSettingsDialogProps.open);
  const shouldMountShortcutStyleDialog = useKeepMountedAfterFirstOpen(shortcutStyleSettingsDialogProps.open);
  const shouldMountAdminModal = useKeepMountedAfterFirstOpen(adminModalProps.open);
  const shouldMountAboutModal = useKeepMountedAfterFirstOpen(aboutModalProps.open);
  const shouldMountExportBackupDialog = useKeepMountedAfterFirstOpen(exportBackupDialogProps.open);
  const shouldMountImportBackupDialog = useKeepMountedAfterFirstOpen(importBackupDialogProps.open);
  const shouldMountWebdavConfigDialog = useKeepMountedAfterFirstOpen(webdavConfigDialogProps.open);
  const shouldMountCloudSyncConfigDialog = useKeepMountedAfterFirstOpen(cloudSyncConfigDialogProps.open);
  const shouldMountConfirmSyncDialog = useKeepMountedAfterFirstOpen(confirmSyncDialog.open);

  return (
    <>
      {shouldMountShortcutModal ? (
        <ShortcutModal {...shortcutModalProps} />
      ) : null}
      <ConfirmDialog {...shortcutDeleteDialogProps} />
      {shouldMountScenarioCreateDialog ? (
        <ScenarioModeCreateDialog {...scenarioCreateDialogProps} />
      ) : null}
      {shouldMountScenarioEditDialog ? (
        <ScenarioModeCreateDialog {...scenarioEditDialogProps} />
      ) : null}
      {shouldMountAuthModal ? <AuthModal {...authModalProps} /> : null}
      {shouldMountSettingsModal ? <SettingsModal {...settingsModalProps} /> : null}
      {shouldMountSearchSettingsModal ? <SearchSettingsModal {...searchSettingsModalProps} /> : null}
      {shouldMountShortcutGuideDialog ? <ShortcutGuideDialog {...shortcutGuideDialogProps} /> : null}
      {shouldMountShortcutIconSettingsDialog ? <ShortcutIconSettingsDialog {...shortcutIconSettingsDialogProps} /> : null}
      {shouldMountShortcutStyleDialog ? <ShortcutStyleSettingsDialog {...shortcutStyleSettingsDialogProps} /> : null}
      {shouldMountAdminModal ? <AdminModal {...adminModalProps} /> : null}
      {shouldMountAboutModal ? <AboutLeafTabModal {...aboutModalProps} /> : null}
      {shouldMountExportBackupDialog ? <BackupScopeDialog {...exportBackupDialogProps} /> : null}
      {shouldMountImportBackupDialog ? <BackupScopeDialog {...importBackupDialogProps} /> : null}
      {shouldMountWebdavConfigDialog ? <WebdavConfigDialog {...webdavConfigDialogProps} /> : null}
      {shouldMountCloudSyncConfigDialog ? <CloudSyncConfigDialog {...cloudSyncConfigDialogProps} /> : null}

      {shouldMountConfirmSyncDialog ? <SyncPreviewConfirmDialog {...confirmSyncDialog} /> : null}

      <Dialog
        open={importConfirmDialog.open}
        onOpenChange={(open: boolean) => {
          importConfirmDialog.setOpen(open);
          if (!open) {
            importConfirmDialog.setPayload(null);
            importConfirmDialog.setBusy(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[32px]">
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
              onClick={() => {
                const payload = importConfirmDialog.payload;
                if (!payload) return;
                importConfirmDialog.setBusy(true);
                importConfirmDialog.setOpen(false);
                importConfirmDialog.setPayload(null);
                void (async () => {
                  try {
                    await importConfirmDialog.downloadCloudBackupEnvelope();
                    const synced = await importConfirmDialog.applyUndoPayload(payload);
                    toast.success(t('settings.backup.importSuccess'));
                    if (!synced) {
                      toast.error(t('toast.cloudSyncFailed'));
                    }
                    importConfirmDialog.onSuccess();
                  } catch {
                    toast.error(t('settings.backup.importError'));
                  } finally {
                    importConfirmDialog.setBusy(false);
                  }
                })();
              }}
            >
              {t('settings.backup.importConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableConsentDialog.open} onOpenChange={disableConsentDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4">
              <RiShieldCrossFill className="w-10 h-10 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">
              {t('settings.iconAssistant.modalTitle')}
            </DialogTitle>
            <DialogDescription className="not-sr-only whitespace-pre-line text-left text-sm leading-6 text-muted-foreground pt-2">
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
