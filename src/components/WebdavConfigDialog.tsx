import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { RiEyeFill, RiEyeOffFill } from "@/icons/ri-compat";
import { toast } from "./ui/sonner";
import { BackToSettingsButton } from "@/components/BackToSettingsButton";
import { ensureExtensionPermission, ensureOriginPermission } from "@/utils/extensionPermissions";
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
  onBackToParent?: () => void;
  enableAfterSave?: boolean;
  showConnectionFields?: boolean;
  onEnableAfterSave?: () => void | Promise<void>;
  onSaveSuccess?: () => void | Promise<void>;
  onDisableSync?: () => void | Promise<void>;
}

export interface WebdavProviderOption {
  id: string;
  label: string;
  url?: string;
}

export function getWebdavProviderChangeState({
  currentUrl,
  providers,
  value,
}: {
  currentUrl: string;
  providers: WebdavProviderOption[];
  value: string;
}) {
  const selected = providers.find((provider) => provider.id === value);
  return {
    password: "",
    provider: value,
    url: selected?.url ?? currentUrl,
    username: "",
  };
}

export function WebdavConfigDialog({
  open,
  onOpenChange,
  onBackToParent,
  enableAfterSave = false,
  showConnectionFields = false,
  onEnableAfterSave,
  onSaveSuccess,
  onDisableSync,
}: WebdavConfigDialogProps) {
  const { t } = useTranslation();
  const syncIntervalOptions = [5, 10, 15, 30, 60];
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [webdavFilePath, setWebdavFilePath] = useState("leaftab_sync.leaftab");
  const [syncBookmarksEnabled, setSyncBookmarksEnabled] = useState(false);
  const [syncBySchedule, setSyncBySchedule] = useState(true);
  const [autoSyncToastEnabled, setAutoSyncToastEnabled] = useState(true);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES);
  const [syncConflictPolicy, setSyncConflictPolicy] = useState<WebdavConflictPolicy>("merge");
  const [webdavProvider, setWebdavProvider] = useState("custom");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookmarkSyncSafetyDialogOpen, setBookmarkSyncSafetyDialogOpen] = useState(false);
  const canDisableSync = !showConnectionFields && isWebdavSyncEnabledFromStorage();

  const webdavProviders = useMemo<WebdavProviderOption[]>(() => ([
    { id: "custom", label: t("settings.backup.webdav.providerCustom") },
    { id: "jianguoyun", label: t("settings.backup.webdav.providers.jianguoyun", { defaultValue: "Jianguoyun" }), url: "https://dav.jianguoyun.com/dav/" },
    { id: "pcloud-us", label: "pCloud (US)", url: "https://webdav.pcloud.com" },
    { id: "pcloud-eu", label: "pCloud (EU)", url: "https://ewebdav.pcloud.com" },
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
    let disposed = false;
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
    setSyncIntervalMinutes(normalizeSyncInterval(defaults.syncIntervalMinutes));
    setSyncConflictPolicy(defaults.syncConflictPolicy);
    void ensureExtensionPermission("bookmarks", { requestIfNeeded: false })
      .then((granted) => {
        if (disposed) return;
        setSyncBookmarksEnabled(defaults.syncBookmarksEnabled && Boolean(granted));
      })
      .catch(() => {
        if (disposed) return;
        setSyncBookmarksEnabled(false);
      });
    return () => {
      disposed = true;
    };
  }, [open, t, webdavProviders]);

  useEffect(() => {
    if (open) return;
    setBookmarkSyncSafetyDialogOpen(false);
  }, [open]);

  const handleProviderChange = (value: string) => {
    const nextState = getWebdavProviderChangeState({
      currentUrl: webdavUrl,
      providers: webdavProviders,
      value,
    });
    setWebdavProvider(nextState.provider);
    setWebdavUrl(nextState.url);
    setWebdavUsername(nextState.username);
    setWebdavPassword(nextState.password);
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
        syncBookmarksEnabled,
        syncBySchedule,
        autoSyncToastEnabled,
        syncIntervalMinutes,
        syncConflictPolicy,
      }, t("settings.backup.webdav.defaultProfileName"));
      window.dispatchEvent(new CustomEvent("webdav-config-changed"));
      toast.success(t("settings.backup.webdav.configSaved"));
      onOpenChange(false);
      await onSaveSuccess?.();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConnectionConfig = async () => {
    setSaving(true);
    try {
      const defaults = readWebdavStorageStateFromStorage(t("settings.backup.webdav.defaultProfileName"));
      if (!webdavUrl.trim()) {
        toast.error(t("settings.backup.webdav.urlRequired"));
        return;
      }
      if (enableAfterSave) {
        const granted = await ensureOriginPermission(webdavUrl.trim(), { requestIfNeeded: true }).catch(() => false);
        if (!granted) {
          toast.error(t("settings.backup.webdav.originPermissionDenied", {
            defaultValue: "未授予 WebDAV 站点访问权限，无法启用同步。请在授权弹窗中允许该域名后重试。",
          }));
          return;
        }
      }
      writeWebdavStorageStateToStorage({
        profileName: defaults.profileName,
        url: webdavUrl,
        username: webdavUsername,
        password: webdavPassword,
        filePath: webdavFilePath,
        syncEnabled: enableAfterSave ? false : isWebdavSyncEnabledFromStorage(),
        syncBookmarksEnabled,
        syncBySchedule,
        autoSyncToastEnabled,
        syncIntervalMinutes,
        syncConflictPolicy,
      }, t("settings.backup.webdav.defaultProfileName"));
      window.dispatchEvent(new CustomEvent("webdav-config-changed"));
      toast.success(t("settings.backup.webdav.configSaved"));
      onOpenChange(false);
      if (enableAfterSave) {
        await onEnableAfterSave?.();
      } else {
        await onSaveSuccess?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBookmarksToggleChange = async (checked: boolean) => {
    if (!checked) {
      setSyncBookmarksEnabled(false);
      return;
    }

    const granted = await ensureExtensionPermission("bookmarks", { requestIfNeeded: true }).catch(() => false);
    setSyncBookmarksEnabled(Boolean(granted));
    if (!granted) {
      toast.info(t("settings.backup.webdav.bookmarkPermissionDenied", {
        defaultValue: "未授予书签权限，已保持“同步书签”关闭。再次打开会重新请求授权。",
      }));
    }
  };

  const handleBookmarksToggleIntent = (checked: boolean) => {
    if (!checked) {
      void handleBookmarksToggleChange(false);
      return;
    }
    if (syncBookmarksEnabled) return;
    setBookmarkSyncSafetyDialogOpen(true);
  };

  const handleConfirmEnableBookmarkSync = () => {
    setBookmarkSyncSafetyDialogOpen(false);
    void handleBookmarksToggleChange(true);
  };

  const dialogBody = showConnectionFields ? (
    <Dialog open={open && !bookmarkSyncSafetyDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToParent} label={t('common.back', { defaultValue: '返回' })} />
            <DialogTitle className="text-foreground">{t("settings.backup.webdav.entry")}</DialogTitle>
          </div>
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
              <SelectContent portalled={false} className="bg-popover border-border text-popover-foreground">
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
            onClick={() => void handleSaveConnectionConfig()}
          >
            {saving
              ? t("common.loading")
              : enableAfterSave
                ? t("settings.backup.webdav.enableSyncAction")
                : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  ) : (
    <SyncSettingsDialog
      open={open && !bookmarkSyncSafetyDialogOpen}
      onOpenChange={onOpenChange}
      title={t("settings.backup.webdav.entry")}
      description={t("settings.backup.webdav.entryDesc")}
      onBackToParent={onBackToParent}
      backButtonLabel={t('common.back', { defaultValue: '返回' })}
      contentClassName="sm:max-w-[500px]"
      footer={(
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full gap-4 sm:gap-4">
            <SyncSettingsActionButtons
              cancelLabel={t("common.cancel")}
              saveLabel={t("common.save")}
              onCancel={() => onOpenChange(false)}
              onSave={() => void handleSaveSyncSettings()}
              cancelDisabled={saving}
              saveDisabled={saving}
            />
          </div>
          {canDisableSync && onDisableSync ? (
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-red-500 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                onOpenChange(false);
                void onDisableSync();
              }}
              disabled={saving}
            >
              {t("leaftabSyncDialog.disableSync", { defaultValue: "关闭 WebDAV 同步" })}
            </button>
          ) : null}
        </div>
      )}
    >
      <div className="grid gap-3">
        <SyncToggleField
          label={t("settings.backup.webdav.syncBookmarksLabel", { defaultValue: "同步书签" })}
          description={t("settings.backup.webdav.syncBookmarksDesc", {
            defaultValue: "关闭后 WebDAV 只同步快捷方式和设置，不读取或写入浏览器书签。",
          })}
          checked={syncBookmarksEnabled}
          onCheckedChange={handleBookmarksToggleIntent}
        />
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

  return (
    <>
      {dialogBody}
      <AlertDialog open={bookmarkSyncSafetyDialogOpen} onOpenChange={setBookmarkSyncSafetyDialogOpen}>
        <AlertDialogContent className="sm:max-w-[480px] rounded-[28px] border-0 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderTitle", { defaultValue: "开启前提醒" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderA11yDescription", {
                defaultValue: "开启书签同步前的提醒说明",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 text-sm leading-6 text-muted-foreground">
            <p>
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderLine1", {
                defaultValue: "同步用于多设备保持一致，不等同于备份。",
              })}
            </p>
            <p>
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderLine2", {
                defaultValue: "书签同步仍处于测试阶段，少数情况下可能出现延迟或异常。",
              })}
            </p>
            <p>
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderLine3", {
                defaultValue: "建议先导出本地备份，再开启书签同步。",
              })}
            </p>
          </div>

          <AlertDialogFooter className="w-full flex-row gap-3">
            <AlertDialogCancel className="flex-1 rounded-[16px]">
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderCancel", { defaultValue: "我先备份" })}
            </AlertDialogCancel>
            <AlertDialogAction className="flex-1 rounded-[16px]" onClick={handleConfirmEnableBookmarkSync}>
              {t("settings.backup.webdav.bookmarkSyncSafetyReminderConfirm", { defaultValue: "继续开启" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
