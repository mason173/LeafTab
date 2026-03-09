import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RiEyeFill, RiEyeOffFill } from "@remixicon/react";
import { toast } from "./ui/sonner";
import { readWebdavStorageStateFromStorage, writeWebdavStorageStateToStorage, type WebdavConflictPolicy } from "@/utils/webdavConfig";

interface WebdavConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCloudLoggedIn?: boolean;
  onClearLocalData?: () => void | Promise<void>;
  onConflictPolicyChanged?: (policy: WebdavConflictPolicy) => void | Promise<void>;
  onSyncIntervalChanged?: (minutes: number) => void | Promise<void>;
}

export function WebdavConfigDialog({
  open,
  onOpenChange,
  isCloudLoggedIn = false,
  onClearLocalData,
  onConflictPolicyChanged,
  onSyncIntervalChanged,
}: WebdavConfigDialogProps) {
  const { t } = useTranslation();
  const syncIntervalOptions = [5, 10, 15, 30, 60];
  const [profileName, setProfileName] = useState("");
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [webdavFilePath, setWebdavFilePath] = useState("leaftab_sync.leaftab");
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(15);
  const [syncConflictPolicy, setSyncConflictPolicy] = useState<WebdavConflictPolicy>("merge");
  const [webdavSyncEnabled, setWebdavSyncEnabled] = useState(false);
  const [webdavProvider, setWebdavProvider] = useState("custom");
  const [showPassword, setShowPassword] = useState(false);
  const lastCommittedIntervalRef = useRef(15);
  const hasWebdavConfigured = useMemo(() => {
    if (webdavUrl.trim()) return true;
    if (webdavUsername.trim()) return true;
    if (webdavPassword) return true;
    if (profileName.trim()) return true;
    return false;
  }, [webdavUrl, webdavUsername, webdavPassword, profileName]);
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
    return 15;
  };

  useEffect(() => {
    if (!open) return;
    const defaults = readWebdavStorageStateFromStorage(t("settings.backup.webdav.defaultProfileName"));
    setProfileName(defaults.profileName);
    setWebdavUrl(defaults.url);
    const normalizedUrl = defaults.url.trim();
    const matchedProvider = webdavProviders.find((provider) => provider.url === normalizedUrl);
    setWebdavProvider(matchedProvider?.id || "custom");
    setWebdavUsername(defaults.username);
    setWebdavPassword(defaults.password);
    setWebdavFilePath(defaults.filePath);
    setWebdavSyncEnabled(defaults.syncEnabled);
    const normalizedInterval = normalizeSyncInterval(defaults.syncIntervalMinutes);
    setSyncIntervalMinutes(normalizedInterval);
    lastCommittedIntervalRef.current = normalizedInterval;
    setSyncConflictPolicy(defaults.syncConflictPolicy);
  }, [open, t, webdavProviders]);

  useEffect(() => {
    if (!open) return;
    writeWebdavStorageStateToStorage({
      profileName,
      url: webdavUrl,
      username: webdavUsername,
      password: webdavPassword,
      filePath: webdavFilePath,
      syncEnabled: webdavSyncEnabled,
      syncIntervalMinutes,
      syncConflictPolicy,
    }, t("settings.backup.webdav.defaultProfileName"));
    window.dispatchEvent(new CustomEvent('webdav-config-changed'));
  }, [
    open,
    profileName,
    webdavUrl,
    webdavUsername,
    webdavPassword,
    webdavFilePath,
    webdavSyncEnabled,
    syncIntervalMinutes,
    syncConflictPolicy,
  ]);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [disableClearLocal, setDisableClearLocal] = useState(false);
  const handleWebdavEnabledChange = (checked: boolean) => {
    if (checked && isCloudLoggedIn) {
      toast.error(t("settings.backup.webdav.logoutRequiredForWebdav"));
      setWebdavSyncEnabled(false);
      return;
    }
    if (!checked && webdavSyncEnabled) {
      if (!hasWebdavConfigured) {
        setWebdavSyncEnabled(false);
        return;
      }
      setDisableConfirmOpen(true);
      return;
    }
    setWebdavSyncEnabled(checked);
  };
  const handleProviderChange = (value: string) => {
    setWebdavProvider(value);
    const selected = webdavProviders.find((provider) => provider.id === value);
    if (selected?.url) {
      setWebdavUrl(selected.url);
    }
  };
  const handleConflictPolicyChange = (value: WebdavConflictPolicy) => {
    if (value === syncConflictPolicy) return;
    setSyncConflictPolicy(value);
    void onConflictPolicyChanged?.(value);
  };
  const handleSyncIntervalCommit = (v: number[]) => {
    const value = syncIntervalOptions[v[0]] ?? 15;
    if (value === lastCommittedIntervalRef.current) return;
    lastCommittedIntervalRef.current = value;
    void onSyncIntervalChanged?.(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle>
            {t("settings.backup.webdav.entry")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.backup.webdav.entryDesc")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{t("settings.backup.webdav.enabledLabel")}</span>
                <span className="text-xs text-muted-foreground">{t("settings.backup.webdav.enabledDesc")}</span>
              </div>
              <Switch
                checked={webdavSyncEnabled}
                onCheckedChange={handleWebdavEnabledChange}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
              />
            </div>
            <div
              className={`grid gap-3 transition-opacity ${webdavSyncEnabled ? "opacity-100" : "pointer-events-none select-none opacity-40"}`}
              aria-disabled={!webdavSyncEnabled}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="grid gap-2 sm:w-[240px] sm:flex-none">
                  <Label className="text-xs text-muted-foreground">
                    {t("settings.backup.webdav.providerLabel")}
                  </Label>
                  <Select value={webdavProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="bg-secondary/40 border-border/60 w-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border/60">
                      <SelectValue placeholder={t("settings.backup.webdav.providerPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="border-border/60">
                      {webdavProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 min-w-0 flex-1">
                  <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.profileName")}</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder={t("settings.backup.webdav.profileNamePlaceholder")}
                    className="bg-secondary/40 border-border"
                  />
                </div>
              </div>
              <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.url")}</Label>
              <Input
                value={webdavUrl}
                onChange={(e) => setWebdavUrl(e.target.value)}
                placeholder="https://example.com/dav"
                className="bg-secondary/40 border-border"
              />
              <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.filePath")}</Label>
              <Input
                value={webdavFilePath}
                onChange={(e) => setWebdavFilePath(e.target.value)}
                placeholder="leaftab_sync.leaftab"
                className="bg-secondary/40 border-border"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.username")}</Label>
                  <Input
                    value={webdavUsername}
                    onChange={(e) => setWebdavUsername(e.target.value)}
                    placeholder={t("settings.backup.webdav.usernamePlaceholder")}
                    className="bg-secondary/40 border-border"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={webdavPassword}
                      onChange={(e) => setWebdavPassword(e.target.value)}
                      placeholder={t("settings.backup.webdav.passwordPlaceholder")}
                      className="bg-secondary/40 border-border pr-9"
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
              </div>

              <div className="grid gap-2 pt-2">
                <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.syncIntervalLabel")}</Label>
                <Slider
                  min={0}
                  max={syncIntervalOptions.length - 1}
                  step={1}
                  value={[syncIntervalOptions.indexOf(syncIntervalMinutes)]}
                  onValueChange={(v: number[]) => setSyncIntervalMinutes(syncIntervalOptions[v[0]] ?? 15)}
                  onValueCommit={handleSyncIntervalCommit}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {syncIntervalOptions.map((item) => (
                    <span key={item}>{item}m</span>
                  ))}
                </div>
                <div className="text-sm font-medium">{t("settings.backup.webdav.syncIntervalMinutes", { count: syncIntervalMinutes })}</div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("settings.backup.webdav.conflictPolicyLabel")}</Label>
                <RadioGroup
                  value={syncConflictPolicy}
                  onValueChange={(v: string) => handleConflictPolicyChange(v as WebdavConflictPolicy)}
                  className="gap-2"
                >
                  <div
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3"
                    onClick={() => handleConflictPolicyChange("merge")}
                  >
                    <RadioGroupItem value="merge" id="policy-merge" />
                    <Label htmlFor="policy-merge" className="cursor-pointer text-sm leading-5">
                      {t("settings.backup.webdav.policyMerge")}
                    </Label>
                  </div>
                  <div
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3"
                    onClick={() => handleConflictPolicyChange("prefer_remote")}
                  >
                    <RadioGroupItem value="prefer_remote" id="policy-remote" />
                    <Label htmlFor="policy-remote" className="cursor-pointer text-sm leading-5">
                      {t("settings.backup.webdav.policyPreferRemote")}
                    </Label>
                  </div>
                  <div
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3"
                    onClick={() => handleConflictPolicyChange("prefer_local")}
                  >
                    <RadioGroupItem value="prefer_local" id="policy-local" />
                    <Label htmlFor="policy-local" className="cursor-pointer text-sm leading-5">
                      {t("settings.backup.webdav.policyPreferLocal")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog open={disableConfirmOpen} onOpenChange={(openValue: boolean) => { setDisableConfirmOpen(openValue); if (!openValue) setDisableClearLocal(false); }}>
        <DialogContent className="sm:max-w-[420px] bg-background border-border text-foreground rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("settings.backup.webdav.disableConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("settings.backup.webdav.disableConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox checked={disableClearLocal} onCheckedChange={(checked: boolean | "indeterminate") => setDisableClearLocal(checked === true)} />
            <div className="flex flex-col gap-1">
              <span className="text-foreground">
              {t('settings.backup.webdav.clearLocalLabel')}
              </span>
            </div>
          </div>
          <DialogFooter className="flex w-full gap-4 sm:gap-4">
            <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => { setDisableConfirmOpen(false); setDisableClearLocal(false); }}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={async () => {
              if (disableClearLocal) {
                await onClearLocalData?.();
              }
              setWebdavSyncEnabled(false);
              setDisableConfirmOpen(false);
              setDisableClearLocal(false);
            }}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
