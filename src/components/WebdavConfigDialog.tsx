import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiEyeFill, RiEyeOffFill } from "@remixicon/react";
import { toast } from "./ui/sonner";
import {
  isWebdavSyncEnabledFromStorage,
  readWebdavStorageStateFromStorage,
  writeWebdavStorageStateToStorage,
  WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES,
  type WebdavConflictPolicy,
} from "@/utils/webdavConfig";
import { SyncSettingsDialog } from "./SyncSettingsDialog";
import {
  SyncIntervalSliderField,
  SyncSettingsActionButtons,
  SyncToggleField,
} from "./sync/SyncSettingsFields";

interface WebdavConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enableAfterSave?: boolean;
  onEnableAfterSave?: () => void | Promise<void>;
}

export function WebdavConfigDialog({
  open,
  onOpenChange,
  enableAfterSave = false,
  onEnableAfterSave,
}: WebdavConfigDialogProps) {
  const { t } = useTranslation();
  const syncIntervalOptions = [5, 10, 15, 30, 60];
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [webdavFilePath, setWebdavFilePath] = useState("leaftab_sync.leaftab");
  const [syncBySchedule, setSyncBySchedule] = useState(true);
  const [autoSyncToastEnabled, setAutoSyncToastEnabled] = useState(true);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES);
  const [syncConflictPolicy, setSyncConflictPolicy] = useState<WebdavConflictPolicy>("merge");
  const [webdavProvider, setWebdavProvider] = useState("custom");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const webdavProviders = useMemo(() => ([
    { id: "custom", label: t("settings.backup.webdav.providerCustom") },
    { id: "pcloud-eu", label: "pCloud (EU)", url: "https://ewebdav.pcloud.com" },
    { id: "pcloud-us", label: "pCloud (US)", url: "https://webdav.pcloud.com" },
    { id: "gmx", label: "GMX MediaCenter", url: "https://webdav.mc.gmx.net" },
    { id: "icedrive", label: "IceDrive", url: "https://webdav.icedrive.io" },
    { id: "kdrive", label: "kDrive", url: "https://connect.drive.infomaniak.com" },
    { id: "koofr", label: "Koofr", url: "https://app.koofr.net/dav/Koofr" },
    { id: "magentacloud", label: "MagentaCLOUD", url: "https://magentacloud.de/remote.php/webdav" },
    { id: "mailbox", label: "Mailbox.org", url: "https://dav.mailbox.org/servlet/webdav.infostore/" },
    { id: "webde", label: "WEB.DE Online–Speicher", url: "https://webdav.smartdrive.web.de" },
  ]), [t]);

  const normalizeSyncInterval = (value: number) => {
    if (syncIntervalOptions.includes(value)) return value;
    return WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES;
  };

  useEffect(() => {
    if (!open) return;
    const defaults = readWebdavStorageStateFromStorage(t("settings.backup.webdav.defaultProfileName"));
    setWebdavUrl(defaults.url);
    const normalizedUrl = defaults.url.trim();
    const matchedProvider = webdavProviders.find((provider) => provider.url === normalizedUrl);
    setWebdavProvider(matchedProvider?.id || "custom");
    setWebdavUsername(defaults.username);
    setWebdavPassword(defaults.password);
    setWebdavFilePath(defaults.filePath);
    setSyncBySchedule(defaults.syncBySchedule);
    setAutoSyncToastEnabled(defaults.autoSyncToastEnabled);
    const normalizedInterval = normalizeSyncInterval(defaults.syncIntervalMinutes);
    setSyncIntervalMinutes(normalizedInterval);
    setSyncConflictPolicy(defaults.syncConflictPolicy);
  }, [open, t, webdavProviders]);

  const handleProviderChange = (value: string) => {
    setWebdavProvider(value);
    const selected = webdavProviders.find((provider) => provider.id === value);
    if (selected?.url) {
      setWebdavUrl(selected.url);
    }
  };

  const handleSaveSyncSettings = async () => {
    setSaving(true);
    try {
      const defaults = readWebdavStorageStateFromStorage(t("settings.backup.webdav.defaultProfileName"));
      writeWebdavStorageStateToStorage({
        profileName: defaults.profileName,
        url: defaults.url,
        username: defaults.username,
        password: defaults.password,
        filePath: defaults.filePath,
        syncEnabled: isWebdavSyncEnabledFromStorage(),
        syncBySchedule,
        autoSyncToastEnabled,
        syncIntervalMinutes,
        syncConflictPolicy,
      }, t("settings.backup.webdav.defaultProfileName"));
      window.dispatchEvent(new CustomEvent('webdav-config-changed'));
      toast.success(t('settings.backup.webdav.configSaved'));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableSync = async () => {
    setSaving(true);
    try {
      const defaults = readWebdavStorageStateFromStorage(t("settings.backup.webdav.defaultProfileName"));
      if (!webdavUrl.trim()) {
        toast.error(t("settings.backup.webdav.urlRequired"));
        return;
      }
      writeWebdavStorageStateToStorage({
        profileName: defaults.profileName,
        url: webdavUrl,
        username: webdavUsername,
        password: webdavPassword,
        filePath: webdavFilePath,
        syncEnabled: false,
        syncBySchedule: defaults.syncBySchedule,
        autoSyncToastEnabled: defaults.autoSyncToastEnabled,
        syncIntervalMinutes,
        syncConflictPolicy,
      }, t("settings.backup.webdav.defaultProfileName"));
      window.dispatchEvent(new CustomEvent('webdav-config-changed'));
      onOpenChange(false);
      if (enableAfterSave) {
        await onEnableAfterSave?.();
      }
    } finally {
      setSaving(false);
    }
  };

  if (enableAfterSave) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("settings.backup.webdav.entry")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("settings.backup.webdav.entryDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-foreground">{t("settings.backup.webdav.providerLabel")}</Label>
              <Select value={webdavProvider} onValueChange={handleProviderChange}>
                <SelectTrigger className="bg-secondary border-border text-foreground rounded-[16px]">
                  <SelectValue placeholder={t("settings.backup.webdav.providerPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {webdavProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t("settings.backup.webdav.url")}</Label>
              <Input
                value={webdavUrl}
                onChange={(e) => setWebdavUrl(e.target.value)}
                placeholder="https://example.com/dav"
                className="bg-secondary border-border rounded-[16px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t("settings.backup.webdav.filePath")}</Label>
              <Input
                value={webdavFilePath}
                onChange={(e) => setWebdavFilePath(e.target.value)}
                placeholder="leaftab_sync.leaftab"
                className="bg-secondary border-border rounded-[16px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t("settings.backup.webdav.username")}</Label>
              <Input
                value={webdavUsername}
                onChange={(e) => setWebdavUsername(e.target.value)}
                placeholder={t("settings.backup.webdav.usernamePlaceholder")}
                className="bg-secondary border-border rounded-[16px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t("settings.backup.webdav.password")}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={webdavPassword}
                  onChange={(e) => setWebdavPassword(e.target.value)}
                  placeholder={t("settings.backup.webdav.passwordPlaceholder")}
                  className="bg-secondary border-border rounded-[16px] pr-9"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <RiEyeOffFill className="size-4" /> : <RiEyeFill className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-[16px]"
              disabled={saving}
              onClick={() => void handleEnableSync()}
            >
              {saving ? t("common.loading") : t("settings.backup.webdav.enableSyncAction")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SyncSettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("settings.backup.webdav.entry")}
      description={t("settings.backup.webdav.entryDesc")}
      contentClassName="sm:max-w-[500px]"
      footer={(
        <SyncSettingsActionButtons
          cancelLabel={t('common.cancel')}
          saveLabel={t('common.save')}
          onCancel={() => onOpenChange(false)}
          onSave={() => void handleSaveSyncSettings()}
          cancelDisabled={saving}
          saveDisabled={saving}
        />
      )}
    >
      <div className="grid gap-3">
        <SyncToggleField
          label={t("settings.backup.webdav.autoSyncToastLabel")}
          description={t("settings.backup.webdav.autoSyncToastDesc")}
          checked={autoSyncToastEnabled}
          onCheckedChange={setAutoSyncToastEnabled}
        />
        <SyncToggleField
          label={t("settings.backup.webdav.syncByScheduleLabel")}
          description={t("settings.backup.webdav.syncByScheduleDesc")}
          checked={syncBySchedule}
          onCheckedChange={setSyncBySchedule}
        />
        <SyncIntervalSliderField
          label={t("settings.backup.webdav.syncIntervalLabel")}
          options={syncIntervalOptions}
          value={syncIntervalMinutes}
          valueLabel={t("settings.backup.webdav.syncIntervalMinutes", { count: syncIntervalMinutes })}
          onChange={setSyncIntervalMinutes}
          disabled={!syncBySchedule}
        />
      </div>
    </SyncSettingsDialog>
  );
}
