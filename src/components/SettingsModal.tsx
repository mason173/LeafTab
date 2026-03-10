import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { animate, useMotionValue } from "framer-motion";
import {
  RiCheckFill,
  RiCheckboxBlankFill,
  RiCloudFill,
  RiDashboardFill,
  RiDownload2Fill,
  RiCloseCircleFill,
  RiFlashlightFill,
  RiHardDrive3Fill,
  RiLoginBoxFill,
  RiLogoutBoxRFill,
  RiRefreshFill,
  RiSettings4Fill,
  RiUpload2Fill,
  RiLayoutGridFill,
} from "@remixicon/react";
import { useTheme } from "next-themes";
import WallpaperSelector from "./WallpaperSelector";
import { ChangelogModal } from "./ChangelogModal";
import ConfirmDialog from "./ConfirmDialog";
import type { WebdavConfig } from "@/hooks/useWebdavSync";
import type { SyncStateStatus } from "@/sync/stateMachine";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { toast } from "./ui/sonner";
import { applyDynamicAccentColor, clearDynamicAccentColor, resolveDynamicAccentColor } from "@/utils/dynamicAccentColor";
import { parseLeafTabBackup } from "@/utils/backupData";
import { CLOUD_SYNC_STORAGE_KEYS, emitCloudSyncConfigChanged, readCloudSyncConfigFromStorage, writeCloudSyncConfigToStorage } from "@/utils/cloudSyncConfig";
import { hasWebdavUrlConfiguredFromStorage, isWebdavSyncEnabledFromStorage, readWebdavConfigFromStorage, WEBDAV_STORAGE_KEYS } from "@/utils/webdavConfig";
/// <reference types="chrome" />
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SyncSettingsDialog } from "./SyncSettingsDialog";
import {
  SyncIntervalSliderField,
  SyncSettingsActionButtons,
  SyncToggleField,
} from "./sync/SyncSettingsFields";

function RollingNumber({
  value,
  trigger,
  className,
}: {
  value: number;
  trigger: number;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    motionValue.set(0);
    setDisplay('0');
    const controls = animate(motionValue, Number.isFinite(value) ? value : 0, {
      duration: 0.6,
      ease: "easeOut",
    });
    const unsubscribe = motionValue.on("change", (latest) => {
      const n = Math.max(0, Math.round(latest));
      setDisplay(String(n));
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [motionValue, trigger, value]);
  return <span className={className}>{display}</span>;
}
import { Checkbox } from "@/components/ui/checkbox";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string | null;
  onLogin?: () => boolean | void;
  onLogout?: (options?: { clearLocal?: boolean }) => Promise<void> | void;
  shortcutsCount?: number;
  minimalistMode: boolean;
  onMinimalistModeChange: (checked: boolean) => void;
  freshMode: boolean;
  onFreshModeChange: (checked: boolean) => void;
  displayMode: 'panoramic' | 'minimalist' | 'fresh';
  onDisplayModeChange: (mode: 'panoramic' | 'minimalist' | 'fresh') => void;
  shortcutsRowsPerColumn: number;
  onShortcutsRowsPerColumnChange: (rows: number) => void;
  openInNewTab: boolean;
  onOpenInNewTabChange: (checked: boolean) => void;
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showTime: boolean;
  onShowTimeChange: (checked: boolean) => void;
  onExportData: () => void;
  onImportData: (data: any) => void;
  wallpaperMode: 'bing' | 'weather' | 'custom';
  onWallpaperModeChange: (mode: 'bing' | 'weather' | 'custom') => void;
  bingWallpaper: string;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  weatherCode: number;
  privacyConsent: boolean | null;
  onPrivacyConsentChange: (checked: boolean) => void;
  onOpenWebdavConfig?: (options?: { enableAfterSave?: boolean }) => void;
  onWebdavSync?: (config: WebdavConfig) => Promise<void>;
  onWebdavEnable?: () => Promise<void> | void;
  onWebdavDisable?: (options?: { clearLocal?: boolean }) => Promise<void> | void;
  onCloudSyncNow?: () => Promise<boolean>;
  onVersionClick?: () => void;
  onOpenAdminModal?: () => void;
  onOpenAboutModal?: () => void;
  cloudSyncStatus?: SyncStateStatus;
}

export default function SettingsModal({
  isOpen,
  onOpenChange,
  username,
  onLogin,
  onLogout,
  shortcutsCount = 0,
  minimalistMode,
  onMinimalistModeChange,
  freshMode,
  onFreshModeChange,
  displayMode,
  onDisplayModeChange,
  shortcutsRowsPerColumn,
  onShortcutsRowsPerColumnChange,
  openInNewTab,
  onOpenInNewTabChange,
  is24Hour,
  onIs24HourChange,
  showSeconds,
  onShowSecondsChange,
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
  privacyConsent,
  onPrivacyConsentChange,
  onOpenWebdavConfig,
  onWebdavSync,
  onWebdavEnable,
  onWebdavDisable,
  onCloudSyncNow,
  onVersionClick,
  onOpenAdminModal,
  onOpenAboutModal,
  cloudSyncStatus = 'idle',
}: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
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
  const [shortcutsLayoutPickerOpen, setShortcutsLayoutPickerOpen] = useState(false);
  const [hoveredShortcutsRows, setHoveredShortcutsRows] = useState<number | null>(null);

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
      document.documentElement.setAttribute('data-accent-color', savedColor);
      if (savedColor !== 'dynamic') clearDynamicAccentColor();
    };
    syncAccent();
    window.addEventListener('leaftab-accent-color-changed', syncAccent);
    return () => window.removeEventListener('leaftab-accent-color-changed', syncAccent);
  }, []);
  useEffect(() => {
    let canceled = false;
    if (accentColor !== 'dynamic') {
      clearDynamicAccentColor();
      return;
    }
    document.documentElement.setAttribute('data-accent-color', 'dynamic');
    resolveDynamicAccentColor({
      wallpaperMode,
      bingWallpaper,
      customWallpaper,
      weatherCode,
    }).then((hex) => {
      if (canceled) return;
      applyDynamicAccentColor(hex);
    }).catch(() => {
      if (canceled) return;
      applyDynamicAccentColor('#3b82f6');
    });
    return () => {
      canceled = true;
    };
  }, [accentColor, wallpaperMode, bingWallpaper, customWallpaper, weatherCode]);
  useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        const v = chrome.runtime.getManifest().version || '—';
        setAppVersion(v);
        return;
      }
    } catch {}
    try {
      fetch('/manifest.json')
        .then((r) => r.json())
        .then((m) => setAppVersion(m?.version || '—'))
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
        payload = parseLeafTabBackup(data);
        if (!payload) throw new Error('Invalid format');
      } catch (err) {
        console.error('Import failed:', err);
        toast.error(t('settings.backup.importError'));
        event.target.value = '';
        return;
      }

      try {
        onImportData(payload);
      } catch (err) {
        // apply/import flow already reports toast in upper layer.
        console.error('Apply imported data failed:', err);
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      toast.error(t('settings.backup.importError'));
      event.target.value = '';
    };
    reader.readAsText(file);
  };
  const shortcutsRowsPreview = hoveredShortcutsRows ?? shortcutsRowsPerColumn;

  const [changelogOpen, setChangelogOpen] = useState(false);
  const changelogOpenTimerRef = useRef<number | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutConfirmTarget, setLogoutConfirmTarget] = useState<'cloud' | 'webdav'>('cloud');
  const [logoutClearLocal, setLogoutClearLocal] = useState(false);
  const [syncTab, setSyncTab] = useState<'cloud' | 'webdav'>('cloud');
  const [webdavProfileName, setWebdavProfileName] = useState('');
  const [webdavLastSyncAt, setWebdavLastSyncAt] = useState('');
  const [webdavNextSyncAt, setWebdavNextSyncAt] = useState('');
  const [cloudLastSyncAt, setCloudLastSyncAt] = useState('');
  const [cloudNextSyncAt, setCloudNextSyncAt] = useState('');
  const [relativeNow, setRelativeNow] = useState(() => Date.now());
  const [syncCardAnimSeq, setSyncCardAnimSeq] = useState(0);
  const [cloudSyncConfigOpen, setCloudSyncConfigOpen] = useState(false);
  const cloudSyncIntervalOptions = [5, 10, 15, 30, 60];
  const normalizeCloudSyncInterval = (value: number) => {
    if (cloudSyncIntervalOptions.includes(value)) return value;
    let closest = cloudSyncIntervalOptions[0];
    let minGap = Number.POSITIVE_INFINITY;
    cloudSyncIntervalOptions.forEach((candidate) => {
      const gap = Math.abs(candidate - value);
      if (gap < minGap) {
        minGap = gap;
        closest = candidate;
      }
    });
    return closest;
  };
  const [cloudSyncIntervalDraft, setCloudSyncIntervalDraft] = useState<number>(() => readCloudSyncConfigFromStorage().intervalMinutes);
  const [cloudSyncEnabledDraft, setCloudSyncEnabledDraft] = useState<boolean>(() => readCloudSyncConfigFromStorage().enabled);
  const [cloudAutoSyncToastEnabledDraft, setCloudAutoSyncToastEnabledDraft] = useState<boolean>(() => readCloudSyncConfigFromStorage().autoSyncToastEnabled);
  const [webdavToggleBusy, setWebdavToggleBusy] = useState(false);
  const resolveWebdavProviderLabel = useCallback(() => {
    const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, '');
    const savedUrl = normalizeUrl(localStorage.getItem(WEBDAV_STORAGE_KEYS.url) || '');
    if (!savedUrl) return '';
    const providers: Array<{ url: string; label: string }> = [
      { url: 'https://ewebdav.pcloud.com', label: 'pCloud (EU)' },
      { url: 'https://webdav.pcloud.com', label: 'pCloud (US)' },
      { url: 'https://webdav.mc.gmx.net', label: 'GMX MediaCenter' },
      { url: 'https://webdav.icedrive.io', label: 'IceDrive' },
      { url: 'https://connect.drive.infomaniak.com', label: 'kDrive' },
      { url: 'https://app.koofr.net/dav/Koofr', label: 'Koofr' },
      { url: 'https://magentacloud.de/remote.php/webdav', label: 'MagentaCLOUD' },
      { url: 'https://dav.mailbox.org/servlet/webdav.infostore/', label: 'Mailbox.org' },
      { url: 'https://webdav.smartdrive.web.de', label: 'WEB.DE Online–Speicher' },
    ];
    const matched = providers.find((provider) => normalizeUrl(provider.url) === savedUrl);
    return matched?.label || t('settings.backup.webdav.providerCustom');
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;
    setWebdavProfileName(resolveWebdavProviderLabel());
    setWebdavLastSyncAt(localStorage.getItem('webdav_last_sync_at') || '');
    setWebdavNextSyncAt(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt) || '');
    setCloudLastSyncAt(
      localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.lastSyncAt)
        || localStorage.getItem('cloud_shortcuts_updated_at')
        || localStorage.getItem('cloud_shortcuts_fetched_at')
        || ''
    );
    setCloudNextSyncAt(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt) || '');
    setRelativeNow(Date.now());
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    setSyncCardAnimSeq((v) => v + 1);
  }, [isOpen, syncTab]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => {
      setRelativeNow(Date.now());
      setWebdavLastSyncAt(localStorage.getItem('webdav_last_sync_at') || '');
      setWebdavNextSyncAt(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt) || '');
      setCloudLastSyncAt(
        localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.lastSyncAt)
          || localStorage.getItem('cloud_shortcuts_updated_at')
          || localStorage.getItem('cloud_shortcuts_fetched_at')
          || ''
      );
      setCloudNextSyncAt(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt) || '');
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const onStatusChanged = () => {
      setWebdavProfileName(resolveWebdavProviderLabel());
      setWebdavLastSyncAt(localStorage.getItem('webdav_last_sync_at') || '');
      setWebdavNextSyncAt(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt) || '');
      setRelativeNow(Date.now());
    };
    const onCloudStatusChanged = () => {
      setCloudLastSyncAt(
        localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.lastSyncAt)
          || localStorage.getItem('cloud_shortcuts_updated_at')
          || localStorage.getItem('cloud_shortcuts_fetched_at')
          || ''
      );
      setCloudNextSyncAt(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt) || '');
      setRelativeNow(Date.now());
    };
    window.addEventListener('webdav-sync-status-changed', onStatusChanged);
    window.addEventListener('cloud-sync-status-changed', onCloudStatusChanged);
    return () => {
      window.removeEventListener('webdav-sync-status-changed', onStatusChanged);
      window.removeEventListener('cloud-sync-status-changed', onCloudStatusChanged);
    };
  }, [isOpen, resolveWebdavProviderLabel]);

  const formatAbsoluteTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const webdavLastSyncLabel = useMemo(() => {
    if (!webdavLastSyncAt) return t('settings.backup.webdav.notSynced');
    const ts = new Date(webdavLastSyncAt).getTime();
    if (Number.isNaN(ts)) return t('settings.backup.webdav.notSynced');
    const diff = Math.max(0, relativeNow - ts);
    if (diff < 60 * 1000) return t('settings.backup.webdav.justSynced');
    if (diff < 60 * 60 * 1000) {
      const m = Math.floor(diff / (60 * 1000));
      return t('settings.backup.webdav.minutesAgo', { count: m });
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const h = Math.floor(diff / (60 * 60 * 1000));
      return t('settings.backup.webdav.hoursAgo', { count: h });
    }
    return formatAbsoluteTime(webdavLastSyncAt);
  }, [relativeNow, t, webdavLastSyncAt]);
  const webdavNextSyncLabel = useMemo(() => {
    if (!webdavNextSyncAt) return '';
    const ts = new Date(webdavNextSyncAt).getTime();
    if (Number.isNaN(ts)) return '';
    return formatAbsoluteTime(webdavNextSyncAt);
  }, [webdavNextSyncAt]);
  const webdavLastSyncTitleLabel = useMemo(() => {
    return `${t('settings.backup.webdav.lastSyncAt')}·${webdavLastSyncLabel}`;
  }, [t, webdavLastSyncLabel]);
  const webdavNextSyncBadgeLabel = useMemo(() => {
    return t('settings.backup.webdav.nextSyncAtLabel', { time: webdavNextSyncLabel || '--' });
  }, [t, webdavNextSyncLabel]);
  const cloudLastSyncLabel = useMemo(() => {
    if (!cloudLastSyncAt) return t('settings.backup.webdav.notSynced');
    const ts = new Date(cloudLastSyncAt).getTime();
    if (Number.isNaN(ts)) return t('settings.backup.webdav.notSynced');
    const diff = Math.max(0, relativeNow - ts);
    if (diff < 60 * 1000) return t('settings.backup.webdav.justSynced');
    if (diff < 60 * 60 * 1000) {
      const m = Math.floor(diff / (60 * 1000));
      return t('settings.backup.webdav.minutesAgo', { count: m });
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const h = Math.floor(diff / (60 * 60 * 1000));
      return t('settings.backup.webdav.hoursAgo', { count: h });
    }
    return formatAbsoluteTime(cloudLastSyncAt);
  }, [cloudLastSyncAt, relativeNow, t]);
  const cloudNextSyncLabel = useMemo(() => {
    if (!cloudNextSyncAt) return '';
    const ts = new Date(cloudNextSyncAt).getTime();
    if (Number.isNaN(ts)) return '';
    return formatAbsoluteTime(cloudNextSyncAt);
  }, [cloudNextSyncAt]);
  const cloudLastSyncTitleLabel = useMemo(() => {
    return `${t('settings.backup.webdav.lastSyncAt')}·${cloudLastSyncLabel}`;
  }, [cloudLastSyncLabel, t]);
  const cloudNextSyncBadgeLabel = useMemo(() => {
    return t('settings.backup.webdav.nextSyncAtLabel', { time: cloudNextSyncLabel || '--' });
  }, [cloudNextSyncLabel, t]);

  const webdavConfigured = useMemo(() => {
    return hasWebdavUrlConfiguredFromStorage();
  }, [isOpen, webdavProfileName, webdavLastSyncAt]);
  const webdavEnabled = useMemo(() => {
    return isWebdavSyncEnabledFromStorage();
  }, [isOpen, webdavProfileName, webdavLastSyncAt]);

  const handleWebdavAction = async (action?: (config: WebdavConfig) => Promise<void>, successKey?: string, errorKey?: string) => {
    if (!action) return;
    const config = readWebdavConfigFromStorage();
    if (!config) {
      const enabled = isWebdavSyncEnabledFromStorage();
      toast.error(enabled
        ? t("settings.backup.webdav.urlRequired")
        : t("settings.backup.webdav.syncDisabled"));
      return;
    }
    try {
      localStorage.setItem("webdav_last_attempt_at", new Date().toISOString());
      await action(config);
      const now = new Date().toISOString();
      localStorage.setItem("webdav_last_sync_at", now);
      localStorage.removeItem("webdav_last_error_at");
      localStorage.removeItem("webdav_last_error_message");
      setWebdavLastSyncAt(now);
      if (successKey) toast.success(t(successKey));
    } catch {
      const failedAt = new Date().toISOString();
      localStorage.setItem("webdav_last_error_at", failedAt);
      if (errorKey) toast.error(t(errorKey));
    }
  };
  const handleCloudLogin = () => {
    const opened = onLogin?.();
    if (opened === false) {
      setSyncTab('webdav');
      return;
    }
    onOpenChange(false);
  };

  const openCloudSyncConfig = () => {
    const config = readCloudSyncConfigFromStorage();
    setCloudSyncEnabledDraft(config.enabled);
    setCloudAutoSyncToastEnabledDraft(config.autoSyncToastEnabled);
    setCloudSyncIntervalDraft(normalizeCloudSyncInterval(config.intervalMinutes));
    setCloudSyncConfigOpen(true);
    onOpenChange(false);
  };

  const handleSaveCloudSyncConfig = () => {
    const currentConfig = readCloudSyncConfigFromStorage();
    writeCloudSyncConfigToStorage({
      enabled: cloudSyncEnabledDraft,
      autoSyncToastEnabled: cloudAutoSyncToastEnabledDraft,
      intervalMinutes: cloudSyncIntervalDraft,
      conflictPolicy: currentConfig.conflictPolicy,
      nickname: currentConfig.nickname,
    });
    emitCloudSyncConfigChanged();
    setCloudSyncConfigOpen(false);
    toast.success(t('settings.backup.cloud.configSaved'));
    if (username && onCloudSyncNow) {
      void onCloudSyncNow();
    }
  };

  const handleCloudManualSync = async () => {
    if (!username || !onCloudSyncNow) {
      toast.error(t('toast.sessionExpired'));
      return;
    }
    const ok = await onCloudSyncNow();
    if (ok) {
      toast.success(t('toast.cloudAutoSyncSuccess'));
    } else {
      toast.error(t('toast.cloudSyncFailed'));
    }
  };

  const handleToggleWebdavEnabled = async () => {
    if (webdavToggleBusy) return;
    if (webdavEnabled) {
      setLogoutConfirmTarget('webdav');
      setLogoutConfirmOpen(true);
      return;
    }
    setWebdavToggleBusy(true);
    try {
      await onWebdavEnable?.();
      setRelativeNow(Date.now());
    } finally {
      setWebdavToggleBusy(false);
    }
  };

  const logoutConfirmTitle = logoutConfirmTarget === 'webdav'
    ? t('settings.backup.webdav.disableConfirmTitle', { defaultValue: t('logoutConfirm.title') })
    : t('logoutConfirm.title');
  const logoutConfirmDescription = logoutConfirmTarget === 'webdav'
    ? t('settings.backup.webdav.disableConfirmDesc', { defaultValue: t('logoutConfirm.description') })
    : t('logoutConfirm.description');
  const logoutConfirmClearLocalLabel = logoutConfirmTarget === 'webdav'
    ? t('settings.backup.webdav.clearLocalLabel', { defaultValue: t('logoutConfirm.clearLocalLabel') })
    : t('logoutConfirm.clearLocalLabel');
  const logoutConfirmActionLabel = logoutConfirmTarget === 'webdav'
    ? t('common.confirm')
    : t('logoutConfirm.confirm');

  const handleOpenChangelog = () => {
    onOpenChange(false);
    if (changelogOpenTimerRef.current) {
      window.clearTimeout(changelogOpenTimerRef.current);
      changelogOpenTimerRef.current = null;
    }
    changelogOpenTimerRef.current = window.setTimeout(() => {
      setChangelogOpen(true);
      changelogOpenTimerRef.current = null;
    }, 0);
  };

  useEffect(() => {
    return () => {
      if (changelogOpenTimerRef.current) {
        window.clearTimeout(changelogOpenTimerRef.current);
        changelogOpenTimerRef.current = null;
      }
    };
  }, []);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border text-foreground rounded-[24px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea
          className="max-h-[60vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Tabs value={syncTab} onValueChange={(value: string) => setSyncTab(value as 'cloud' | 'webdav')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-[16px]">
                  <TabsTrigger value="cloud" className="rounded-xl">{t('settings.backup.cloudTab')}</TabsTrigger>
                  <TabsTrigger value="webdav" className="rounded-xl">{t('settings.backup.webdavTab')}</TabsTrigger>
                </TabsList>
              </Tabs>

              {syncTab === 'cloud' ? (
                <div className="flex h-[132px] flex-col justify-between gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3">
                  {username ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <RiCloudFill className="size-4.5" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-sm">{username}</span>
                            <span className="text-xs text-muted-foreground">{t('settings.profile.loggedInDesc')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={openCloudSyncConfig}
                            className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-accent"
                          >
                            <RiSettings4Fill className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCloudManualSync}
                            className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-accent"
                          >
                            <RiRefreshFill className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setLogoutConfirmTarget('cloud');
                              setLogoutConfirmOpen(true);
                            }}
                            className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-accent"
                          >
                            <RiLogoutBoxRFill className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{t('settings.profile.shortcutsCount')}</span>
                          <RollingNumber value={shortcutsCount} trigger={syncCardAnimSeq} className="text-lg font-semibold" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{cloudLastSyncTitleLabel}</span>
                          <SyncStatusBadge label={cloudNextSyncBadgeLabel} tone='info' className="mt-1.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-1 flex-col justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                          <RiCloudFill className="size-4.5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-sm">{t('settings.profile.guest')}</span>
                          <span className="text-xs text-muted-foreground">{t('settings.profile.guestDesc')}</span>
                        </div>
                      </div>
                      <Button onClick={handleCloudLogin} className="h-8 w-full gap-2 text-xs">
                        <RiLoginBoxFill className="size-4" />
                        {t('auth.buttons.login')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[132px] flex-col justify-between gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3">
                  {webdavEnabled ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <RiHardDrive3Fill className="size-4.5" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-sm">{webdavProfileName || t('settings.backup.webdav.defaultProfileName')}</span>
                            <span className="text-xs text-muted-foreground">{t('settings.backup.webdav.configured')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-accent"
                            onClick={() => {
                              onOpenWebdavConfig?.();
                              onOpenChange(false);
                            }}
                          >
                            <RiSettings4Fill className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-accent"
                            onClick={() => {
                              handleWebdavAction(onWebdavSync, "settings.backup.webdav.syncSuccess", "settings.backup.webdav.syncError");
                            }}
                          >
                            <RiRefreshFill className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-accent"
                            onClick={() => void handleToggleWebdavEnabled()}
                            disabled={webdavToggleBusy}
                          >
                            <RiCloseCircleFill className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{t('settings.profile.shortcutsCount')}</span>
                          <RollingNumber value={shortcutsCount} trigger={syncCardAnimSeq} className="text-lg font-semibold" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{webdavLastSyncTitleLabel}</span>
                          <SyncStatusBadge label={webdavNextSyncBadgeLabel} tone='info' className="mt-1.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-1 flex-col justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                          <RiHardDrive3Fill className="size-4.5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-sm">
                            {webdavConfigured
                              ? (webdavProfileName || t('settings.backup.webdav.defaultProfileName'))
                              : t('settings.backup.webdav.syncOffTitle')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {webdavConfigured
                              ? t('settings.backup.webdav.disabled')
                              : t('settings.backup.webdav.notConfigured')}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (username) {
                            toast.error(t('settings.backup.webdav.disableCloudBeforeWebdavEnable'));
                            setSyncTab('cloud');
                            return;
                          }
                          onOpenWebdavConfig?.({ enableAfterSave: true });
                          onOpenChange(false);
                        }}
                        className="h-8 w-full gap-2 text-xs"
                        disabled={webdavToggleBusy}
                      >
                        {webdavConfigured ? <RiLoginBoxFill className="size-4" /> : <RiSettings4Fill className="size-4" />}
                        {webdavConfigured
                          ? t('settings.backup.webdav.enableSyncAction')
                          : t('settings.backup.webdav.configureAction')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Display Mode Selection */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.displayMode.title')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.displayMode.description')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center border transition-all ${displayMode === 'panoramic' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'}`}
                  onClick={() => { onDisplayModeChange('panoramic'); onOpenChange(false); }}
                >
                  <RiDashboardFill className="size-5 mb-0.5" />
                  <div className="text-xs font-medium">
                    {t('settings.displayMode.panoramic')}
                  </div>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center border transition-all ${displayMode === 'fresh' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'}`}
                  onClick={() => { onDisplayModeChange('fresh'); onOpenChange(false); }}
                >
                  <RiFlashlightFill className="size-5 mb-0.5" />
                  <div className="text-xs font-medium">
                    {t('settings.displayMode.rhythm')}
                  </div>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center border transition-all ${displayMode === 'minimalist' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'}`}
                  onClick={() => { onDisplayModeChange('minimalist'); onOpenChange(false); }}
                >
                  <RiCheckboxBlankFill className="size-5 mb-0.5" />
                  <div className="text-xs font-medium">
                    {t('settings.displayMode.blank')}
                  </div>
                </button>
              </div>
            </div>
            {displayMode !== 'minimalist' && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col space-y-1 items-start">
                  <span className="text-sm font-medium leading-none">{t('settings.shortcutsLayout.label')}</span>
                  <span className="font-normal text-xs text-muted-foreground">{t('settings.shortcutsLayout.description')}</span>
                </div>
                <Popover
                  open={shortcutsLayoutPickerOpen}
                  onOpenChange={(open: boolean) => {
                    setShortcutsLayoutPickerOpen(open);
                    if (!open) setHoveredShortcutsRows(null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 min-w-[118px] items-center justify-center rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground transition-colors hover:bg-secondary/70"
                    >
                      <span>{`3*${shortcutsRowsPerColumn}`}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={8} className="w-[176px] rounded-2xl border-border bg-popover/95 p-3 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
                    <div className="mb-2.5 flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-center">
                      <span className="inline-flex min-w-[56px] items-center justify-center text-base font-semibold leading-none text-primary tabular-nums">{`3*${shortcutsRowsPreview}`}</span>
                      <span className="text-xs text-muted-foreground">{t('settings.shortcutsLayout.select')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5" onMouseLeave={() => setHoveredShortcutsRows(null)}>
                      {Array.from({ length: 11 }, (_, index) => index + 1).flatMap((rows) =>
                        Array.from({ length: 3 }, (_, columnIndex) => {
                          const selectable = rows >= 1;
                          const active = selectable && rows <= shortcutsRowsPreview;
                          const selected = rows === shortcutsRowsPerColumn;
                          return (
                            <button
                              key={`${rows}-${columnIndex}`}
                              type="button"
                              aria-label={selectable ? `3*${rows}` : `3*${rows} unavailable`}
                              disabled={!selectable}
                              onMouseEnter={() => selectable && setHoveredShortcutsRows(rows)}
                              onFocus={() => selectable && setHoveredShortcutsRows(rows)}
                              onClick={() => {
                                if (!selectable) return;
                                onShortcutsRowsPerColumnChange(rows);
                                setShortcutsLayoutPickerOpen(false);
                                setHoveredShortcutsRows(null);
                              }}
                              className={`relative h-3.5 w-full rounded-md border transition-all duration-150 ${
                                selectable
                                  ? active
                                    ? 'border-primary/75 bg-primary/35 shadow-[0_0_0_1px_rgba(99,102,241,0.28)]'
                                    : 'border-border bg-secondary/60 hover:border-primary/40 hover:bg-primary/15'
                                  : 'cursor-not-allowed border-border/50 bg-secondary/20 opacity-35'
                              } ${selected ? 'ring-1 ring-primary/60 ring-offset-1 ring-offset-popover' : ''}`}
                            >
                              {selected && columnIndex === 2 && rows === shortcutsRowsPerColumn && (
                                <RiCheckFill className="absolute -right-1 -top-1 size-3 rounded-full bg-primary text-primary-foreground" />
                              )}
                            </button>
                          );
                        }),
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {/* Theme Color Selection */}
            {!minimalistMode && (
            <div className="flex flex-col gap-3">
             <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.accentColor.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.accentColor.description')}</span>
            </div>
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
          )}

          

          
          
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.newTabMode.label')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.newTabMode.description')}</span>
              </div>
              <Switch
                id="new-tab-mode"
                checked={openInNewTab}
                onCheckedChange={onOpenInNewTabChange}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
              />
            </div>

            {(displayMode === 'minimalist' || displayMode === 'fresh') && (
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1 items-start">
                  <span className="text-sm font-medium leading-none">{t('settings.showTime.label')}</span>
                  <span className="font-normal text-xs text-muted-foreground">{t('settings.showTime.description')}</span>
                </div>
                <Switch
                  id="show-time"
                  checked={showTime}
                  onCheckedChange={onShowTimeChange}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
                />
              </div>
            )}

            {(displayMode === 'panoramic' || ((displayMode === 'minimalist' || displayMode === 'fresh') && showTime)) && (
              <>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">{t('settings.timeFormat.label')}</span>
                    <span className="font-normal text-xs text-muted-foreground">{t('settings.timeFormat.description')}</span>
                  </div>
                  <Switch
                    id="time-format"
                    checked={is24Hour}
                    onCheckedChange={onIs24HourChange}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">{t('settings.showSeconds.label')}</span>
                    <span className="font-normal text-xs text-muted-foreground">{t('settings.showSeconds.description')}</span>
                  </div>
                  <Switch
                    id="show-seconds"
                    checked={showSeconds}
                    onCheckedChange={onShowSecondsChange}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
                  />
                </div>
              </>
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
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
              />
            </div>
          )}

          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.language.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.language.description')}</span>
            </div>
            <Select value={languageValue} onValueChange={changeLanguage}>
              <SelectTrigger className="w-[120px] bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0">
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
          {!minimalistMode && (
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-sm font-medium leading-none">{t('settings.theme.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">{t('settings.theme.description')}</span>
            </div>
            <Select value={mounted ? theme : "system"} onValueChange={setTheme}>
              <SelectTrigger className="w-[120px] bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t('settings.theme.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="system" className="focus:bg-accent focus:text-accent-foreground">{t('settings.theme.system')}</SelectItem>
                <SelectItem value="light" className="focus:bg-accent focus:text-accent-foreground">{t('settings.theme.light')}</SelectItem>
                <SelectItem value="dark" className="focus:bg-accent focus:text-accent-foreground">{t('settings.theme.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          {!minimalistMode && (
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
                onClick={onExportData}
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
          )}

          {minimalistMode && (
            <>
              <div className="flex items-center justify-between space-x-2 py-2">
                <div className="flex flex-col space-y-1 items-start">
                  <span className="text-sm font-medium leading-none">{t('weather.wallpaper.mode')}</span>
                  <span className="font-normal text-xs text-muted-foreground">{t('weather.wallpaper.modeDesc')}</span>
                </div>
                <WallpaperSelector 
                  mode={wallpaperMode === 'weather' ? 'bing' : wallpaperMode}
                  onModeChange={onWallpaperModeChange}
                  bingWallpaper={bingWallpaper}
                  weatherCode={weatherCode}
                  customWallpaper={customWallpaper}
                  onCustomWallpaperChange={onCustomWallpaperChange}
                  hideWeather={true}
                  trigger={
                    <Button variant="secondary" size="sm" className="bg-secondary/50 hover:bg-secondary">{t('settings.shortcutsLayout.set')}</Button>
                  }
                />
              </div>
            </>
          )}

          {adminModeEnabled && (
            <div className="flex items-center justify-between space-x-2 pt-3">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t('settings.adminMode.switchLabel')}</span>
                <span className="font-normal text-xs text-muted-foreground">{t('settings.adminMode.switchDesc')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
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
              className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
              onClick={() => onOpenAboutModal?.()}
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
              <button 
                type="button"
                className="text-[10px] text-muted-foreground/80 hover:text-primary hover:underline transition-colors"
                onClick={handleOpenChangelog}
              >
                {t('settings.changelog.open')}
              </button>
            </div>
          </div>

          </div>
        </ScrollArea>
      </DialogContent>
      <SyncSettingsDialog
        open={cloudSyncConfigOpen}
        onOpenChange={setCloudSyncConfigOpen}
        title={t('settings.backup.cloud.configTitle')}
        description={t('settings.backup.cloud.configDesc')}
        contentClassName="sm:max-w-[500px]"
        footer={(
          <SyncSettingsActionButtons
            cancelLabel={t('common.cancel')}
            saveLabel={t('common.save')}
            onCancel={() => setCloudSyncConfigOpen(false)}
            onSave={handleSaveCloudSyncConfig}
          />
        )}
      >
        <div className="flex flex-col gap-4">
          <SyncToggleField
            label={t('settings.backup.cloud.enabledLabel')}
            description={t('settings.backup.cloud.enabledDesc')}
            checked={cloudSyncEnabledDraft}
            onCheckedChange={setCloudSyncEnabledDraft}
          />
          <SyncToggleField
            label={t('settings.backup.cloud.autoSyncToastLabel')}
            description={t('settings.backup.cloud.autoSyncToastDesc')}
            checked={cloudAutoSyncToastEnabledDraft}
            onCheckedChange={setCloudAutoSyncToastEnabledDraft}
          />
          <SyncIntervalSliderField
            label={t('settings.backup.cloud.intervalLabel')}
            options={cloudSyncIntervalOptions}
            value={cloudSyncIntervalDraft}
            valueLabel={t('settings.backup.cloud.intervalMinutes', { count: cloudSyncIntervalDraft })}
            onChange={setCloudSyncIntervalDraft}
            disabled={!cloudSyncEnabledDraft}
          />
          </div>
      </SyncSettingsDialog>
      <Dialog open={logoutConfirmOpen} onOpenChange={(open: boolean) => {
        setLogoutConfirmOpen(open);
        if (!open) {
          setLogoutClearLocal(false);
          setLogoutConfirmTarget('cloud');
        }
      }}>
        <DialogContent className="sm:max-w-[420px] bg-background border-border text-foreground rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{logoutConfirmTitle}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {logoutConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox checked={logoutClearLocal} onCheckedChange={(checked: boolean | "indeterminate") => setLogoutClearLocal(checked === true)} />
            <div className="flex flex-col gap-1">
              <span className="text-foreground">
                {logoutConfirmClearLocalLabel}
              </span>
            </div>
          </div>
          <DialogFooter className="flex w-full gap-4 sm:gap-4">
            <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => { setLogoutConfirmOpen(false); setLogoutClearLocal(false); }}>
              {t('logoutConfirm.cancel')}
            </Button>
            <Button className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (logoutConfirmTarget === 'webdav') {
                setWebdavToggleBusy(true);
                try {
                  await onWebdavDisable?.({ clearLocal: logoutClearLocal });
                  setRelativeNow(Date.now());
                } finally {
                  setWebdavToggleBusy(false);
                }
              } else {
                await onLogout?.({ clearLocal: logoutClearLocal });
              }
              setLogoutConfirmOpen(false);
              setLogoutClearLocal(false);
              setLogoutConfirmTarget('cloud');
              onOpenChange(false);
            }}>
              {logoutConfirmActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
    <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}
