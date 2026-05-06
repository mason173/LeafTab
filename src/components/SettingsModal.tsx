import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo, useRef } from "react";
import {
  RiCheckFill,
  RiCheckboxBlankFill,
  RiComputerFill,
  RiDownload2Fill,
  RiFlashlightFill,
  RiMoonFill,
  RiSunFill,
  RiUpload2Fill,
} from "@/icons/ri-compat";
import { useTheme } from "next-themes";
import type { AboutLeafTabModalTab } from "./AboutLeafTabDialog";
import type { WebdavConfig } from "@/types/webdav";
import { toast } from "./ui/sonner";
/// <reference types="chrome" />
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISPLAY_MODE_OPTIONS, type DisplayMode } from "@/displayMode/config";
import type { WallpaperMode } from "@/wallpaper/types";
import type { VisualEffectsLevel } from "@/hooks/useVisualEffectsPolicy";
import { isFirefoxBuildTarget } from "@/platform/browserTarget";
import aboutIcon from "@/assets/abouticon.svg";
import { DIST_CHANNEL } from "@/config/distribution";
import {
  ADAPTIVE_NEUTRAL_ACCENT,
  DEFAULT_ACCENT_COLOR,
  getWallpaperAccentSlotKey,
  resolveAccentDetailColor,
  resolveAdaptiveNeutralAccent,
} from "@/utils/accentColor";
import {
  DEFAULT_WALLPAPER_ACCENT_PALETTE,
  resolveWallpaperAccentPalette,
} from "@/utils/dynamicAccentColor";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string | null;
  onLogin?: () => boolean | void;
  onLogout?: (options?: { clearLocal?: boolean }) => Promise<void> | void;
  shortcutsCount?: number;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
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
  onOpenImportSourceDialog: () => void;
  wallpaperMode: WallpaperMode;
  onWallpaperModeChange: (mode: WallpaperMode) => void;
  bingWallpaper: string;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  weatherCode: number;
  colorWallpaperId: string;
  dynamicWallpaperSrc?: string;
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
  onOpenShortcutIconSettings?: () => void;
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
  onOpenImportSourceDialog,
  wallpaperMode,
  onWallpaperModeChange,
  bingWallpaper,
  customWallpaper,
  onCustomWallpaperChange,
  weatherCode,
  colorWallpaperId,
  dynamicWallpaperSrc,
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
  onOpenShortcutIconSettings,
}: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const firefox = isFirefoxBuildTarget();
  const { theme, setTheme, resolvedTheme } = useTheme();
  void shortcutCompactShowTitle;
  void onShortcutCompactShowTitleChange;
  void shortcutGridColumns;
  void onShortcutGridColumnsChange;
  void onWallpaperModeChange;
  void onCustomWallpaperChange;
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
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [recommendedAccentPalette, setRecommendedAccentPalette] = useState<string[]>(DEFAULT_WALLPAPER_ACCENT_PALETTE);
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

  const isDarkTheme = resolvedTheme === 'dark';
  const colorOptions = useMemo(() => {
    const recommendedOptions = Array.from({ length: 6 }, (_, index) => ({
      name: getWallpaperAccentSlotKey(index),
      value: recommendedAccentPalette[index] || DEFAULT_WALLPAPER_ACCENT_PALETTE[index],
      accentDetailColor: resolveAccentDetailColor(recommendedAccentPalette[index] || DEFAULT_WALLPAPER_ACCENT_PALETTE[index]),
      label: t('settings.accent.recommended', {
        index: index + 1,
        defaultValue: `Recommended ${index + 1}`,
      }),
    }));
    return [
      ...recommendedOptions,
      {
        name: ADAPTIVE_NEUTRAL_ACCENT,
        value: resolveAdaptiveNeutralAccent(isDarkTheme),
        accentDetailColor: resolveAccentDetailColor(resolveAdaptiveNeutralAccent(isDarkTheme)),
        label: t('settings.accent.adaptiveNeutral', {
          defaultValue: 'Adaptive neutral',
        }),
      },
    ];
  }, [isDarkTheme, recommendedAccentPalette, t]);
  const currentThemeValue = mounted ? (theme ?? 'system') : 'system';
  const renderDisplayModeIcon = (mode: DisplayMode, className: string) => {
    if (mode === 'fresh') return <RiFlashlightFill className={className} />;
    return <RiCheckboxBlankFill className={className} />;
  };
  const renderThemeModeIcon = (mode: 'system' | 'light' | 'dark', className: string) => {
    if (mode === 'light') return <RiSunFill className={className} />;
    if (mode === 'dark') return <RiMoonFill className={className} />;
    return <RiComputerFill className={className} />;
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
  const settingsHeroCopy = useMemo(() => {
    const isChinese = languageValue === 'zh' || languageValue === 'zh-TW';
    return {
      title: isChinese ? 'LeafTab 新标签页' : 'LeafTab New Tab',
      subtitle: isChinese ? 'Minimal by Design. Powerful in Use.' : 'Minimal by Design. Powerful in Use.',
      badges: isChinese
        ? ['开源', '端到端加密', 'WebDAV 同步']
        : ['Open Source', 'End-to-End Encryption', 'WebDAV Sync'],
    };
  }, [languageValue]);

  useEffect(() => {
    setMounted(true);
    const syncAccent = () => {
      const savedColor = localStorage.getItem('accentColor') || DEFAULT_ACCENT_COLOR;
      setAccentColor(savedColor);
    };
    syncAccent();
    window.addEventListener('leaftab-accent-color-changed', syncAccent);
    return () => window.removeEventListener('leaftab-accent-color-changed', syncAccent);
  }, []);
  useEffect(() => {
    let canceled = false;
    resolveWallpaperAccentPalette({
      wallpaperMode,
      bingWallpaper,
      customWallpaper,
      weatherCode,
      colorWallpaperId,
      dynamicWallpaperSrc,
    })
      .then((palette) => {
        if (canceled) return;
        setRecommendedAccentPalette(
          palette.length >= 6
            ? palette.slice(0, 6)
            : [...palette, ...DEFAULT_WALLPAPER_ACCENT_PALETTE].slice(0, 6),
        );
      })
      .catch(() => {
        if (canceled) return;
        setRecommendedAccentPalette(DEFAULT_WALLPAPER_ACCENT_PALETTE);
      });
    return () => {
      canceled = true;
    };
  }, [bingWallpaper, colorWallpaperId, customWallpaper, dynamicWallpaperSrc, wallpaperMode, weatherCode]);
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

  const handleOpenShortcutIconSettings = () => {
    onOpenChange(false);
    onOpenShortcutIconSettings?.();
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
        <DialogContent
          data-testid="settings-modal"
          surfaceVariant="frosted"
          className="sm:max-w-[600px] max-h-[calc(100vh-1.5rem)] border-border text-foreground rounded-[32px] overflow-visible"
        >
        <DialogHeader className="pb-3 pr-8">
          <DialogTitle className="text-foreground">{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea
          className="max-h-[78vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="flex flex-col gap-5">
            <div className="relative flex flex-col items-center justify-center px-4 pt-1 text-center">
              {DIST_CHANNEL === 'community' ? (
                <div className="absolute right-0 top-0 rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[9px] font-normal text-foreground/70 backdrop-blur">
                  {languageValue === 'zh' || languageValue === 'zh-TW' ? '社区版' : 'Community'}
                </div>
              ) : null}
              <div className="frosted-control-surface relative flex h-[48px] w-[48px] items-center justify-center rounded-[16px] ring-1 ring-border/60">
                <img
                  src={aboutIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-[26px] w-[26px]"
                  draggable={false}
                />
              </div>
              <div className="relative mt-3 flex w-full max-w-[420px] flex-col items-center gap-0.5">
                <h2 className="max-w-full text-[16px] font-bold leading-none tracking-[-0.03em] text-foreground">
                  {settingsHeroCopy.title}
                </h2>
                <p className="max-w-[240px] text-[10px] font-normal leading-[1.25] text-foreground/78">
                  {settingsHeroCopy.subtitle}
                </p>
              </div>
              <div className="relative mt-1.5 flex flex-wrap items-center justify-center gap-x-2 text-[10px] font-medium text-foreground/70">
                {settingsHeroCopy.badges.map((badge, index) => (
                  <div key={badge} className="inline-flex items-center gap-x-2">
                    {index > 0 ? <span aria-hidden="true" className="text-foreground/35">•</span> : null}
                    <span>{badge}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Display Mode Selection */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                {DISPLAY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex h-11 items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-center transition-all ${displayMode === option.value ? 'bg-primary/10 text-primary' : 'frosted-control-surface text-foreground'}`}
                    onClick={() => { onDisplayModeChange(option.value); onOpenChange(false); }}
                  >
                    {renderDisplayModeIcon(option.value, "size-4.5 shrink-0")}
                    <div className="text-sm font-medium leading-none">
                      {t(option.labelKey)}
                    </div>
                  </button>
                ))}
                <div
                  className="frosted-control-surface inline-flex h-11 items-center gap-1 rounded-full p-1"
                  role="radiogroup"
                  aria-label={t('settings.theme.label')}
                >
                  {([
                    { value: 'system', label: t('settings.theme.system') },
                    { value: 'light', label: t('settings.theme.light') },
                    { value: 'dark', label: t('settings.theme.dark') },
                  ] as const).map((option) => {
                    const selected = currentThemeValue === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={option.label}
                        className={`flex h-full flex-1 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-0 ${selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:bg-background/50 hover:text-foreground'}`}
                        onClick={() => setTheme(option.value)}
                      >
                        {renderThemeModeIcon(option.value, "size-4.5")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
            <div className="flex w-full items-center justify-center px-2">
              <div className="grid w-full grid-cols-4 place-items-center gap-x-3 gap-y-3 sm:grid-cols-7">
                {colorOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleColorChange(option.name)}
                    className={`relative flex size-10 appearance-none items-center justify-center overflow-hidden rounded-full border-none outline-none ring-0 shadow-none transition-transform focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${accentColor === option.name ? 'scale-105 brightness-[1.02]' : 'hover:scale-[1.04]'}`}
                    style={{ backgroundColor: option.value, border: 'none', boxShadow: 'none' }}
                    aria-label={option.label}
                  >
                    {accentColor === option.name ? (
                      <RiCheckFill
                        className="size-5 stroke-[3]"
                        style={{ color: option.accentDetailColor }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
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
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0"
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
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0"
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
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0"
                onClick={handleOpenWallpaperSettings}
                >
                  {t('settings.shortcutsLayout.set')}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col space-y-1 items-start">
                  <span className="text-sm font-medium leading-none">{t('settings.shortcutIconSettings.label', { defaultValue: '图标设置' })}</span>
                  <span className="font-normal text-xs text-muted-foreground">{t('settings.shortcutIconSettings.entryDescription', { defaultValue: '调整快捷方式图标的颜色模式与圆角' })}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0"
                  onClick={handleOpenShortcutIconSettings}
                >
                  {t('settings.shortcutIconSettings.open', { defaultValue: '打开' })}
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
              <SelectTrigger className="w-[126px] border-none text-foreground focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t('settings.language.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent portalled={false} className="bg-popover border-border text-popover-foreground">
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
                <SelectTrigger className="w-[126px] border-none text-foreground focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portalled={false} className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="low" className="focus:bg-accent focus:text-accent-foreground">{t('settings.visualEffectsLevel.low')}</SelectItem>
                  <SelectItem value="medium" className="focus:bg-accent focus:text-accent-foreground">{t('settings.visualEffectsLevel.medium')}</SelectItem>
                  <SelectItem value="high" className="focus:bg-accent focus:text-accent-foreground">{t('settings.visualEffectsLevel.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.backup.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.backup.description')}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 gap-2 rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  onOpenImportSourceDialog();
                }}
              >
                <RiUpload2Fill className="size-4" />
                {t('settings.backup.import')}
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 gap-2 rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  void onExportData();
                }}
              >
                <RiDownload2Fill className="size-4" />
                {t('settings.backup.export')}
              </Button>
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
                className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0"
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
              className="!h-[34px] !min-w-[108px] px-6 gap-2 rounded-xl shrink-0"
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
