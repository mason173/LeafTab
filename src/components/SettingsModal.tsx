import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef, useMemo } from "react";
import {
  RiCheckboxBlankFill,
  RiDashboardFill,
  RiDownload2Fill,
  RiFlashlightFill,
  RiUpload2Fill,
} from "@/icons/ri-compat";
import { useTheme } from "next-themes";
import type { AboutLeafTabModalTab } from "./AboutLeafTabModal";
import type { WebdavConfig } from "@/types/webdav";
import { toast } from "./ui/sonner";
import { parseLeafTabLocalBackupImport, type LeafTabLocalBackupImportData } from "@/sync/leaftab";
/// <reference types="chrome" />
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ShortcutCardVariant } from "./shortcuts/shortcutCardVariant";
import { DISPLAY_MODE_OPTIONS, type DisplayMode } from "@/displayMode/config";
import type { WallpaperMode } from "@/wallpaper/types";
import type { VisualEffectsLevel } from "@/hooks/useVisualEffectsPolicy";
import { isFirefoxBuildTarget } from "@/platform/browserTarget";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string | null;
  onLogin?: () => boolean | void;
  onLogout?: (options?: { clearLocal?: boolean }) => Promise<void> | void;
  shortcutsCount?: number;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  shortcutCardVariant: ShortcutCardVariant;
  onShortcutCardVariantChange: (variant: ShortcutCardVariant) => void;
  shortcutCompactShowTitle: boolean;
  onShortcutCompactShowTitleChange: (show: boolean) => void;
  shortcutGridColumns: number;
  onShortcutGridColumnsChange: (columns: number) => void;
  openInNewTab: boolean;
  onOpenInNewTabChange: (checked: boolean) => void;
  preventDuplicateNewTab: boolean;
  onPreventDuplicateNewTabChange: (checked: boolean) => void;
  onOpenSearchSettings?: () => void;
  visualEffectsLevel: VisualEffectsLevel;
  onVisualEffectsLevelChange: (level: VisualEffectsLevel) => void;
  disableSyncCardAccentAnimation: boolean;
  showTime: boolean;
  onShowTimeChange: (checked: boolean) => void;
  onExportData: () => void | Promise<void>;
  onImportData: (data: LeafTabLocalBackupImportData) => void | Promise<void>;
  wallpaperMode: WallpaperMode;
  onWallpaperModeChange: (mode: WallpaperMode) => void;
  bingWallpaper: string;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  weatherCode: number;
  colorWallpaperId: string;
  onColorWallpaperIdChange: (id: string) => void;
  wallpaperMaskOpacity: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  privacyConsent: boolean | null;
  onPrivacyConsentChange: (checked: boolean) => void;
  onOpenSyncCenter?: () => void;
  onOpenWebdavConfig?: (options?: { enableAfterSave?: boolean; showConnectionFields?: boolean }) => void;
  onWebdavSync?: (config: WebdavConfig) => Promise<void>;
  onWebdavEnable?: () => Promise<void> | void;
  onWebdavDisable?: (options?: { clearLocal?: boolean }) => Promise<void> | void;
  onCloudSyncNow?: () => Promise<boolean>;
  onVersionClick?: () => void;
  onOpenAdminModal?: () => void;
  onOpenAboutModal?: (tab?: AboutLeafTabModalTab) => void;
  onOpenWallpaperSettings?: () => void;
  onOpenShortcutGuide?: () => void;
  onOpenShortcutStyleSettings?: () => void;
}

export default function SettingsModal({
  isOpen,
  onOpenChange,
  username,
  onLogin,
  onLogout,
  shortcutsCount = 0,
  displayMode,
  onDisplayModeChange,
  shortcutCardVariant,
  onShortcutCardVariantChange,
  shortcutCompactShowTitle,
  onShortcutCompactShowTitleChange,
  shortcutGridColumns,
  onShortcutGridColumnsChange,
  openInNewTab,
  onOpenInNewTabChange,
  preventDuplicateNewTab,
  onPreventDuplicateNewTabChange,
  onOpenSearchSettings,
  visualEffectsLevel,
  onVisualEffectsLevelChange,
  disableSyncCardAccentAnimation,
  showTime,
  onShowTimeChange,
  onExportData,
  onImportData,
  wallpaperMode,
  onWallpaperModeChange,
  bingWallpaper,
  customWallpaper,
  onCustomWallpaperChange,
  weatherCode,
  colorWallpaperId,
  onColorWallpaperIdChange,
  wallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  privacyConsent,
  onPrivacyConsentChange,
  onOpenSyncCenter,
  onOpenWebdavConfig,
  onWebdavSync,
  onWebdavEnable,
  onWebdavDisable,
  onCloudSyncNow,
  onVersionClick,
  onOpenAdminModal,
  onOpenAboutModal,
  onOpenWallpaperSettings,
  onOpenShortcutGuide,
  onOpenShortcutStyleSettings,
}: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const firefox = isFirefoxBuildTarget();
  const { theme, setTheme } = useTheme();
  void shortcutCardVariant;
  void onShortcutCardVariantChange;
  void shortcutCompactShowTitle;
  void onShortcutCompactShowTitleChange;
  void shortcutGridColumns;
  void onShortcutGridColumnsChange;
  void wallpaperMode;
  void onWallpaperModeChange;
  void bingWallpaper;
  void customWallpaper;
  void onCustomWallpaperChange;
  void weatherCode;
  void colorWallpaperId;
  void onColorWallpaperIdChange;
  void wallpaperMaskOpacity;
  void onWallpaperMaskOpacityChange;
  void shortcutsCount;
  void disableSyncCardAccentAnimation;
  void onLogin;
  void onLogout;
  void onOpenSyncCenter;
  void onOpenWebdavConfig;
  void onWebdavSync;
  void onWebdavEnable;
  void onWebdavDisable;
  void onCloudSyncNow;
  const [mounted, setMounted] = useState(false);
  const [accentColor, setAccentColor] = useState<string>('green');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appVersion, setAppVersion] = useState<string>('—');
  const adminModeTapCountRef = useRef(0);
  const adminModeTapTimerRef = useRef<number | null>(null);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    try {
      setAdminModeEnabled(localStorage.getItem('leaftab_admin_mode_enabled') === 'true');
    } catch {}
  }, [isOpen]);
  useEffect(() => {
    const onAdminModeChanged = () => {
      try {
        setAdminModeEnabled(localStorage.getItem('leaftab_admin_mode_enabled') === 'true');
      } catch {}
    };
    window.addEventListener('leaftab-admin-mode-changed', onAdminModeChanged);
    return () => window.removeEventListener('leaftab-admin-mode-changed', onAdminModeChanged);
  }, []);

  const colorOptions = [
    { name: 'dynamic', value: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 45%, #a855f7 100%)', label: t('settings.accent.dynamic') },
    { name: 'mono', value: 'linear-gradient(135deg, #0f0f10 0%, #ffffff 100%)', label: t('settings.accent.mono') },
    { name: 'green', value: '#22c55e', label: t('settings.accent.green') },
    { name: 'blue', value: '#3b82f6', label: t('settings.accent.blue') },
    { name: 'purple', value: '#a855f7', label: t('settings.accent.purple') },
    { name: 'orange', value: '#f97316', label: t('settings.accent.orange') },
    { name: 'pink', value: '#ec4899', label: t('settings.accent.pink') },
    { name: 'red', value: '#ef4444', label: t('settings.accent.red') },
  ];
  const renderDisplayModeIcon = (mode: DisplayMode, className: string) => {
    if (mode === 'panoramic') return <RiDashboardFill className={className} />;
    if (mode === 'fresh') return <RiFlashlightFill className={className} />;
    return <RiCheckboxBlankFill className={className} />;
  };

  const changeLanguage = (value: string) => {
    i18n.changeLanguage(value);
    localStorage.setItem('i18nextLng', value);
  };
  const languageValue = useMemo(() => {
    const raw = (i18n.language || '').trim();
    if (!raw) return 'zh';
    const lowered = raw.toLowerCase();
    if (lowered.startsWith('zh-tw') || lowered.startsWith('zh-hk')) return 'zh-TW';
    if (lowered.startsWith('zh')) return 'zh';
    if (lowered.startsWith('en')) return 'en';
    if (lowered.startsWith('vi')) return 'vi';
    if (lowered.startsWith('ja')) return 'ja';
    if (lowered.startsWith('ko')) return 'ko';
    return 'zh';
  }, [i18n.language]);

  useEffect(() => {
    setMounted(true);
    const syncAccent = () => {
      const savedColor = localStorage.getItem('accentColor') || 'green';
      setAccentColor(savedColor);
    };
    syncAccent();
    window.addEventListener('leaftab-accent-color-changed', syncAccent);
    return () => window.removeEventListener('leaftab-accent-color-changed', syncAccent);
  }, []);
  useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        const manifest = chrome.runtime.getManifest();
        const v = manifest.version_name || manifest.version || '—';
        setAppVersion(v);
        return;
      }
    } catch {}
    try {
      fetch('/manifest.json')
        .then((r) => r.json())
        .then((m) => setAppVersion(m?.version_name || m?.version || '—'))
        .catch(() => setAppVersion('1.2.1'));
    } catch {
      setAppVersion('1.2.1');
    }
  }, []);

  const handleColorChange = (colorName: string) => {
    setAccentColor(colorName);
    localStorage.setItem('accentColor', colorName);
    document.documentElement.setAttribute('data-accent-color', colorName);
    window.dispatchEvent(new Event('leaftab-accent-color-changed'));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      let payload: any = null;
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        payload = parseLeafTabLocalBackupImport(data);
        if (!payload) throw new Error('Invalid format');
      } catch (err) {
        console.error('Import failed:', err);
        toast.error(t('settings.backup.importError'));
        event.target.value = '';
        return;
      }

      Promise.resolve(onImportData(payload))
        .catch((err) => {
          // apply/import flow already reports toast in upper layer.
          console.error('Apply imported data failed:', err);
        })
        .finally(() => {
          event.target.value = '';
        });
    };
    reader.onerror = () => {
      toast.error(t('settings.backup.importError'));
      event.target.value = '';
    };
    reader.readAsText(file);
  };
  const shortcutStyleDisabled = displayMode === 'minimalist';

  const handleOpenShortcutStyleSettings = () => {
    if (shortcutStyleDisabled) return;
    onOpenChange(false);
    onOpenShortcutStyleSettings?.();
  };

  const handleOpenWallpaperSettings = () => {
    onOpenChange(false);
    onOpenWallpaperSettings?.();
  };

  const handleOpenSearchSettings = () => {
    onOpenChange(false);
    onOpenSearchSettings?.();
  };

  const handleOpenShortcutGuide = () => {
    onOpenChange(false);
    onOpenShortcutGuide?.();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border text-foreground rounded-[32px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea
          className="max-h-[60vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="flex flex-col gap-6">
            {/* Display Mode Selection */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                {DISPLAY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex h-11 items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-center border transition-all ${displayMode === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'}`}
                    onClick={() => { onDisplayModeChange(option.value); onOpenChange(false); }}
                  >
                    {renderDisplayModeIcon(option.value, "size-4.5 shrink-0")}
                    <div className="text-sm font-medium leading-none">
                      {t(option.labelKey)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
            <div className="flex justify-between w-full px-[12px]">
              {colorOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => handleColorChange(option.name)}
                  className={`w-8 h-8 rounded-full overflow-hidden transition-all ${accentColor === option.name ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  style={option.name === 'dynamic'
                    ? { backgroundImage: option.value }
                    : option.name === 'mono'
                    ? { backgroundImage: 'linear-gradient(90deg, #111111 0 50%, #ffffff 50% 100%)', boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.45)' }
                    : { backgroundColor: option.value }}
                  aria-label={`Select ${option.label} color`}
                />
              ))}
            </div>
          </div>
            <Separator className="bg-border/60" />

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.searchSettings.label')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.searchSettings.description')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                onClick={handleOpenSearchSettings}
              >
                {t('settings.searchSettings.open')}
              </Button>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.shortcutGuide.label')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.shortcutGuide.description')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                onClick={handleOpenShortcutGuide}
              >
                {t('settings.shortcutGuide.open')}
              </Button>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('weather.wallpaper.mode')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('weather.wallpaper.modeDesc')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                onClick={handleOpenWallpaperSettings}
              >
                {t('settings.shortcutsLayout.set')}
              </Button>
            </div>
              <div className={`flex items-center justify-between gap-3 ${shortcutStyleDisabled ? 'opacity-55' : ''}`}>
                <div className="flex flex-col space-y-1 items-start">
                  <span className="text-sm font-medium leading-none">{t('settings.shortcutsStyle.label')}</span>
                  <span className="font-normal text-xs text-muted-foreground">{t('settings.shortcutsStyle.entryDescription')}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className={`!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0 ${shortcutStyleDisabled ? 'bg-secondary/35 text-muted-foreground cursor-not-allowed hover:bg-secondary/35' : 'bg-secondary/50 hover:bg-secondary'}`}
                  disabled={shortcutStyleDisabled}
                  onClick={handleOpenShortcutStyleSettings}
                >
                  {t('settings.shortcutsStyle.open')}
                </Button>
              </div>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.newTabMode.label')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.newTabMode.description')}</span>
              </div>
              <Switch
                id="new-tab-mode"
                checked={openInNewTab}
                onCheckedChange={onOpenInNewTabChange}
                className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
              >
                <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
              </Switch>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.preventDuplicateNewTab.label')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.preventDuplicateNewTab.description')}</span>
              </div>
              <Switch
                id="prevent-duplicate-newtab"
                checked={preventDuplicateNewTab}
                onCheckedChange={onPreventDuplicateNewTabChange}
                className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
              >
                <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
              </Switch>
            </div>

            {displayMode !== 'panoramic' && (
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1 items-start">
                  <span className="text-sm font-medium leading-none">{t('settings.showTime.label')}</span>
                  <span className="font-normal text-xs text-muted-foreground">{t('settings.showTime.description')}</span>
                </div>
                <Switch
                  id="show-time"
                  checked={showTime}
                  onCheckedChange={onShowTimeChange}
                  className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                >
                  <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
                </Switch>
              </div>
            )}

          {username && (
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.iconAssistant.title')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.iconAssistant.desc')}</span>
              </div>
              <Switch
                id="privacy-consent"
                checked={!!privacyConsent}
                onCheckedChange={onPrivacyConsentChange}
                className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
              >
                <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
              </Switch>
            </div>
          )}
          <Separator className="bg-border/60" />
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.language.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.language.description')}</span>
            </div>
            <Select value={languageValue} onValueChange={changeLanguage}>
              <SelectTrigger className="w-[126px] bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t('settings.language.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="zh" className="focus:bg-accent focus:text-accent-foreground">{t('languages.zh')}</SelectItem>
                <SelectItem value="zh-TW" className="focus:bg-accent focus:text-accent-foreground">{t('languages.zh-TW')}</SelectItem>
                <SelectItem value="en" className="focus:bg-accent focus:text-accent-foreground">{t('languages.en')}</SelectItem>
                <SelectItem value="vi" className="focus:bg-accent focus:text-accent-foreground">{t('languages.vi')}</SelectItem>
                <SelectItem value="ja" className="focus:bg-accent focus:text-accent-foreground">{t('languages.ja')}</SelectItem>
                <SelectItem value="ko" className="focus:bg-accent focus:text-accent-foreground">{t('languages.ko')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!firefox ? (
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.visualEffectsLevel.label')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.visualEffectsLevel.description')}</span>
              </div>
	              <Select value={visualEffectsLevel} onValueChange={(value: string) => onVisualEffectsLevelChange(value as VisualEffectsLevel)}>
                <SelectTrigger className="w-[126px] bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="low" className="focus:bg-accent focus:text-accent-foreground">{t('settings.visualEffectsLevel.low')}</SelectItem>
                  <SelectItem value="medium" className="focus:bg-accent focus:text-accent-foreground">{t('settings.visualEffectsLevel.medium')}</SelectItem>
                  <SelectItem value="high" className="focus:bg-accent focus:text-accent-foreground">{t('settings.visualEffectsLevel.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.theme.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.theme.description')}</span>
            </div>
            <Select value={mounted ? theme : "system"} onValueChange={setTheme}>
              <SelectTrigger className="w-[126px] bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t('settings.theme.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="system" className="focus:bg-accent focus:text-accent-foreground">{t('settings.theme.system')}</SelectItem>
                <SelectItem value="light" className="focus:bg-accent focus:text-accent-foreground">{t('settings.theme.light')}</SelectItem>
                <SelectItem value="dark" className="focus:bg-accent focus:text-accent-foreground">{t('settings.theme.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.backup.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.backup.description')}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary"
                onClick={handleImportClick}
              >
                <RiUpload2Fill className="size-4" />
                {t('settings.backup.import')}
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary"
                onClick={() => {
                  onOpenChange(false);
                  void onExportData();
                }}
              >
                <RiDownload2Fill className="size-4" />
                {t('settings.backup.export')}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".leaftab"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <Separator className="bg-border/60" />
          {adminModeEnabled && (
            <div className="flex items-center justify-between space-x-2 pt-3">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.adminMode.switchLabel')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.adminMode.switchDesc')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                onClick={() => onOpenAdminModal?.()}
              >
                {t('settings.adminMode.open')}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between space-x-2 pt-3">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.about.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.about.desc')}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
              onClick={() => onOpenAboutModal?.('about')}
            >
              {t('settings.about.open')}
            </Button>
          </div>

          <div className="pt-1 flex flex-col items-center">
            <a 
              href="https://mason173.github.io/leaf-tab-privacy/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline"
            >
              {t('settings.privacyPolicy')}
            </a>
            <div className="text-[10px] text-muted-foreground/60">
              &copy; {new Date().getFullYear()} LeafTab. {t('settings.copyright')}
            </div>
            <div className="text-[10px] text-muted-foreground/60 flex items-center gap-2">
              <button
                type="button"
                className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                onClick={() => {
                  if (adminModeEnabled) {
                    toast(t('settings.adminMode.alreadyEnabled'));
                    onVersionClick?.();
                    return;
                  }
                  adminModeTapCountRef.current += 1;
                  if (adminModeTapTimerRef.current) {
                    window.clearTimeout(adminModeTapTimerRef.current);
                  }
                  adminModeTapTimerRef.current = window.setTimeout(() => {
                    adminModeTapCountRef.current = 0;
                    adminModeTapTimerRef.current = null;
                  }, 1800);

                  if (adminModeTapCountRef.current >= 3 && adminModeTapCountRef.current < 6) {
                    toast(t('settings.adminMode.tapRemaining', { count: 6 - adminModeTapCountRef.current }));
                  }
                  if (adminModeTapCountRef.current >= 6) {
                    adminModeTapCountRef.current = 0;
                    if (adminModeTapTimerRef.current) {
                      window.clearTimeout(adminModeTapTimerRef.current);
                      adminModeTapTimerRef.current = null;
                    }
                    setAdminModeEnabled(true);
                    try { localStorage.setItem('leaftab_admin_mode_enabled', 'true'); } catch {}
                    window.dispatchEvent(new Event('leaftab-admin-mode-changed'));
                    toast.success(t('settings.adminMode.enabled'));
                  }
                  onVersionClick?.();
                }}
              >
                v{appVersion}
              </button>
            </div>
          </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
