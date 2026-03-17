import type { TFunction } from "i18next";

export interface ChangelogItem {
  version: string;
  date: string;
  notes: string[];
}

export const buildChangelogItems = (t: TFunction): ChangelogItem[] => [
  {
    version: "1.3.6",
    date: "2026-03-17",
    notes: [
      t("changelog.items.release136LicenseGplv3", { defaultValue: "开源协议切换到 GPLv3" }),
      t("changelog.items.release136SystemEffectsLevel", { defaultValue: "新增系统特效强度档位选择" }),
      t("changelog.items.release136UiPolish", { defaultValue: "优化界面显示效果" }),
      t("changelog.items.release136RemoveDynamicWallpaper", { defaultValue: "移除灵动壁纸（因性能原因）" }),
    ],
  },
  {
    version: "1.3.5",
    date: "2026-03-16",
    notes: [
      t("changelog.items.release135UiPolish", { defaultValue: "优化界面效果" }),
      t("changelog.items.release135VisualRefine", { defaultValue: "优化交互与视觉细节" }),
      t("changelog.items.release135KnownIssuesFix", { defaultValue: "修复一些已知问题" }),
    ],
  },
  {
    version: "1.3.3",
    date: "2026-03-15",
    notes: [
      t("changelog.items.release133MultiEngineSwitcher", { defaultValue: "支持多搜索引擎切换，搜索选择更灵活" }),
      t("changelog.items.release133ManifestCopyPolish", { defaultValue: "精简扩展描述文案，整体表达更清晰" }),
      t("changelog.items.release133Stability", { defaultValue: "例行修复与稳定性优化" }),
    ],
  },
  {
    version: "1.3.2",
    date: "2026-03-15",
    notes: [
      t("changelog.items.release132UiPolish", { defaultValue: "优化设置面板与交互细节，整体风格更统一" }),
      t("changelog.items.release132SearchAndDrawer", { defaultValue: "改进搜索与抽屉联动体验，操作更顺滑" }),
      t("changelog.items.release132Stability", { defaultValue: "修复若干已知问题并提升稳定性" }),
    ],
  },
  {
    version: "1.3.1",
    date: "2026-03-13",
    notes: [
      t("changelog.items.release131DynamicWallpaperFlickerFix"),
      t("changelog.items.release131TimeSecondsDefaultOn"),
      t("changelog.items.release131AdminDomainsBoard"),
      t("changelog.items.release131DomainCountUniqueUsers"),
      t("changelog.items.release131BackendModularDeploy"),
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03-13",
    notes: [
      t("changelog.items.release130DynamicEffectsOptimize"),
      t("changelog.items.release130DynamicWallpaperTab"),
      t("changelog.items.release130ManualWeatherCity"),
    ],
  },
  {
    version: "1.2.9",
    date: "2026-03-12",
    notes: [
      t("changelog.items.release129ModeUiRefactor"),
      t("changelog.items.release129WallpaperModalRefine"),
      t("changelog.items.release129ColorWallpaperGradients"),
      t("changelog.items.release129MaskSliderByMode"),
      t("changelog.items.release129ContrastAndOpacityTune"),
    ],
  },
  {
    version: "1.2.8",
    date: "2026-03-11",
    notes: [
      t("changelog.items.release128ShortcutStyleDialog"),
      t("changelog.items.release128CompactLayoutRefine"),
      t("changelog.items.release128CompactHoverOnlyIcon"),
      t("changelog.items.release128EmptyIconFallback"),
      t("changelog.items.release128IgnoreFakeFavicons"),
    ],
  },
  {
    version: "1.2.7",
    date: "2026-03-11",
    notes: [
      t("changelog.items.release127CaptchaSessionFix"),
      t("changelog.items.release127ProxyCookieDefaults"),
      t("changelog.items.release127FirstLoginLocalFirst"),
      t("changelog.items.release127DeployScriptLibUpload"),
    ],
  },
  {
    version: "1.2.6",
    date: "2026-03-11",
    notes: [
      t("changelog.items.release126UnifiedCompareDialog"),
      t("changelog.items.release126ConflictStrategyTabs"),
      t("changelog.items.release126ConflictPendingPersist"),
      t("changelog.items.release126ConflictFreezeAutoSync"),
      t("changelog.items.release126CompareUiRefine"),
    ],
  },
  {
    version: "1.2.5",
    date: "2026-03-11",
    notes: [
      t("changelog.items.release125ImportLocalFirstSync"),
      t("changelog.items.release125ManualCloudLocalFirst"),
      t("changelog.items.release125SyncSettingsUi"),
      t("changelog.items.release125WebdavCorsPermission"),
      t("changelog.items.release125WebdavAuthHint"),
    ],
  },
  {
    version: "1.2.4",
    date: "2026-03-11",
    notes: [
      t("changelog.items.release124UpdateNotice"),
      t("changelog.items.release124Snooze24h"),
      t("changelog.items.release124ChangelogEntry"),
      t("changelog.items.release124ReleasePackaging"),
      t("changelog.items.release124FirefoxCompat"),
    ],
  },
  {
    version: "1.2.3",
    date: "2026-03-10",
    notes: [
      t("changelog.items.release123WebdavAccessDialog"),
      t("changelog.items.release123UnifiedSyncSettings"),
      t("changelog.items.release123AutoSyncToggles"),
      t("changelog.items.release123ProviderLabel"),
      t("changelog.items.release123PasswordToggle"),
    ],
  },
  {
    version: "1.2.2",
    date: "2026-03-09",
    notes: [
      t("changelog.items.release122Scrollbar"),
      t("changelog.items.release122WelcomePersist"),
      t("changelog.items.release122RateLimitToast"),
      t("changelog.items.release122WebdavSchedule"),
      t("changelog.items.release122CustomServer"),
      t("changelog.items.release122CustomIconSource"),
      t("changelog.items.release122OnlineIconSource"),
      t("changelog.items.release122DynamicAccent"),
    ],
  },
  {
    version: "1.2.1",
    date: "2026-03-07",
    notes: [
      t("changelog.items.release121Webdav"),
      t("changelog.items.release121Ui"),
      t("changelog.items.release121Fixes"),
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-05",
    notes: [
      t("changelog.items.grid"),
      t("changelog.items.carousel"),
      t("changelog.items.entrance"),
      t("changelog.items.dots"),
    ],
  },
];
