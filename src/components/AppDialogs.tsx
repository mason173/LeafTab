import { Suspense, lazy, type ComponentProps } from 'react';
import { RiShieldCrossFill } from '@remixicon/react';
import { useTranslation } from 'react-i18next';
import type { AboutLeafTabModal } from './AboutLeafTabModal';
import type { AdminModal } from './AdminModal';
import type AuthModal from './AuthModal';
import ConfirmDialog from './ConfirmDialog';
import type ScenarioModeCreateDialog from './ScenarioModeCreateDialog';
import type SettingsModal from './SettingsModal';
import type { SearchSettingsModal } from './SearchSettingsModal';
import type { ShortcutStyleSettingsDialog } from './ShortcutStyleSettingsDialog';
import type ShortcutModal from './ShortcutModal';
import type { SyncPreviewConfirmDialog } from './SyncPreviewConfirmDialog';
import type { WebdavConfigDialog } from './WebdavConfigDialog';
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

const LazyShortcutModal = lazy(() => import('./ShortcutModal'));
const LazyScenarioModeCreateDialog = lazy(() => import('./ScenarioModeCreateDialog'));
const LazyAuthModal = lazy(() => import('./AuthModal'));
const LazySettingsModal = lazy(() => import('./SettingsModal'));
const LazySearchSettingsModal = lazy(() => import('./SearchSettingsModal').then((module) => ({ default: module.SearchSettingsModal })));
const LazyShortcutStyleSettingsDialog = lazy(() => import('./ShortcutStyleSettingsDialog').then((module) => ({ default: module.ShortcutStyleSettingsDialog })));
const LazyAdminModal = lazy(() => import('./AdminModal').then((module) => ({ default: module.AdminModal })));
const LazyAboutLeafTabModal = lazy(() => import('./AboutLeafTabModal').then((module) => ({ default: module.AboutLeafTabModal })));
const LazyWebdavConfigDialog = lazy(() => import('./WebdavConfigDialog').then((module) => ({ default: module.WebdavConfigDialog })));
const LazySyncPreviewConfirmDialog = lazy(() => import('./SyncPreviewConfirmDialog').then((module) => ({ default: module.SyncPreviewConfirmDialog })));

type ShortcutModalProps = ComponentProps<typeof ShortcutModal>;
type ConfirmDialogProps = ComponentProps<typeof ConfirmDialog>;
type ScenarioModeCreateDialogProps = ComponentProps<typeof ScenarioModeCreateDialog>;
type AuthModalProps = ComponentProps<typeof AuthModal>;
type SettingsModalProps = ComponentProps<typeof SettingsModal>;
type SearchSettingsModalProps = ComponentProps<typeof SearchSettingsModal>;
type ShortcutStyleSettingsDialogProps = ComponentProps<typeof ShortcutStyleSettingsDialog>;
type AdminModalProps = ComponentProps<typeof AdminModal>;
type AboutLeafTabModalProps = ComponentProps<typeof AboutLeafTabModal>;
type WebdavConfigDialogProps = ComponentProps<typeof WebdavConfigDialog>;

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
  shortcutStyleSettingsDialogProps: ShortcutStyleSettingsDialogProps;
  adminModalProps: AdminModalProps;
  aboutModalProps: AboutLeafTabModalProps;
  webdavConfigDialogProps: WebdavConfigDialogProps;
  confirmSyncDialog: ConfirmSyncDialogProps;
  webdavConfirmSyncDialog: ConfirmSyncDialogProps;
  importConfirmDialog: ImportConfirmDialogProps;
  disableConsentDialog: DisableConsentDialogProps;
}

export function AppDialogs({
  shortcutModalProps,
  shortcutDeleteDialogProps,
  scenarioCreateDialogProps,
  scenarioEditDialogProps,
  authModalProps,
  settingsModalProps,
  searchSettingsModalProps,
  shortcutStyleSettingsDialogProps,
  adminModalProps,
  aboutModalProps,
  webdavConfigDialogProps,
  confirmSyncDialog,
  webdavConfirmSyncDialog,
  importConfirmDialog,
  disableConsentDialog,
}: AppDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      {shortcutModalProps.isOpen ? (
        <Suspense fallback={null}>
          <LazyShortcutModal {...shortcutModalProps} />
        </Suspense>
      ) : null}
      <ConfirmDialog {...shortcutDeleteDialogProps} />
      {scenarioCreateDialogProps.open ? (
        <Suspense fallback={null}>
          <LazyScenarioModeCreateDialog {...scenarioCreateDialogProps} />
        </Suspense>
      ) : null}
      {scenarioEditDialogProps.open ? (
        <Suspense fallback={null}>
          <LazyScenarioModeCreateDialog {...scenarioEditDialogProps} />
        </Suspense>
      ) : null}
      {authModalProps.isOpen ? (
        <Suspense fallback={null}>
          <LazyAuthModal {...authModalProps} />
        </Suspense>
      ) : null}
      {settingsModalProps.isOpen ? (
        <Suspense fallback={null}>
          <LazySettingsModal {...settingsModalProps} />
        </Suspense>
      ) : null}
      {searchSettingsModalProps.isOpen ? (
        <Suspense fallback={null}>
          <LazySearchSettingsModal {...searchSettingsModalProps} />
        </Suspense>
      ) : null}
      {shortcutStyleSettingsDialogProps.open ? (
        <Suspense fallback={null}>
          <LazyShortcutStyleSettingsDialog {...shortcutStyleSettingsDialogProps} />
        </Suspense>
      ) : null}
      {adminModalProps.open ? (
        <Suspense fallback={null}>
          <LazyAdminModal {...adminModalProps} />
        </Suspense>
      ) : null}
      {aboutModalProps.open ? (
        <Suspense fallback={null}>
          <LazyAboutLeafTabModal {...aboutModalProps} />
        </Suspense>
      ) : null}
      {webdavConfigDialogProps.open ? (
        <Suspense fallback={null}>
          <LazyWebdavConfigDialog {...webdavConfigDialogProps} />
        </Suspense>
      ) : null}

      {confirmSyncDialog.open ? (
        <Suspense fallback={null}>
          <LazySyncPreviewConfirmDialog {...confirmSyncDialog} />
        </Suspense>
      ) : null}
      {webdavConfirmSyncDialog.open ? (
        <Suspense fallback={null}>
          <LazySyncPreviewConfirmDialog {...webdavConfirmSyncDialog} />
        </Suspense>
      ) : null}

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
              onClick={async () => {
                if (!importConfirmDialog.payload) return;
                importConfirmDialog.setBusy(true);
                try {
                  await importConfirmDialog.downloadCloudBackupEnvelope();
                  const synced = await importConfirmDialog.applyUndoPayload(importConfirmDialog.payload);
                  toast.success(t('settings.backup.importSuccess'));
                  if (!synced) {
                    toast.error(t('toast.cloudSyncFailed'));
                  }
                  importConfirmDialog.onSuccess();
                  importConfirmDialog.setOpen(false);
                  importConfirmDialog.setPayload(null);
                } catch {
                  toast.error(t('settings.backup.importError'));
                } finally {
                  importConfirmDialog.setBusy(false);
                }
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
