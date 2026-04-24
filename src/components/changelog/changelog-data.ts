import type { TFunction } from "i18next";

export type ChangelogChannel = "stable" | "preview";

export interface ChangelogItem {
  version: string;
  date: string;
  notes: string[];
  channel?: ChangelogChannel;
  tag?: "alpha" | "beta" | "rc";
}

export interface ChangelogSection {
  id: ChangelogChannel;
  title: string;
  description?: string;
  items: ChangelogItem[];
}

type ParsedChangelogVersion = {
  major: number;
  minor: number;
  patch: number;
  prereleaseRank: number;
  prereleaseIteration: number;
};

const CHANGELOG_PRERELEASE_RANK: Record<NonNullable<ChangelogItem["tag"]>, number> = {
  rc: 2,
  beta: 1,
  alpha: 0,
};

function parseChangelogVersion(item: ChangelogItem): ParsedChangelogVersion {
  const [corePart, prereleasePart] = item.version.split("-");
  const [major = "0", minor = "0", patch = "0"] = corePart.split(".");
  const prereleasePieces = prereleasePart?.split(".") ?? [];
  const prereleaseTag = (item.tag ?? prereleasePieces[0]) as ChangelogItem["tag"] | undefined;
  const prereleaseIteration = Number.parseInt(prereleasePieces[1] ?? "0", 10);

  return {
    major: Number.parseInt(major, 10) || 0,
    minor: Number.parseInt(minor, 10) || 0,
    patch: Number.parseInt(patch, 10) || 0,
    prereleaseRank: prereleaseTag ? CHANGELOG_PRERELEASE_RANK[prereleaseTag] : 3,
    prereleaseIteration: Number.isFinite(prereleaseIteration) ? prereleaseIteration : 0,
  };
}

function compareChangelogItemsDesc(a: ChangelogItem, b: ChangelogItem) {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;

  const aChannel = a.channel ?? "stable";
  const bChannel = b.channel ?? "stable";
  if (aChannel !== bChannel) {
    return aChannel === "stable" ? -1 : 1;
  }

  const parsedA = parseChangelogVersion(a);
  const parsedB = parseChangelogVersion(b);
  if (parsedA.major !== parsedB.major) return parsedB.major - parsedA.major;
  if (parsedA.minor !== parsedB.minor) return parsedB.minor - parsedA.minor;
  if (parsedA.patch !== parsedB.patch) return parsedB.patch - parsedA.patch;
  if (parsedA.prereleaseRank !== parsedB.prereleaseRank) return parsedB.prereleaseRank - parsedA.prereleaseRank;
  if (parsedA.prereleaseIteration !== parsedB.prereleaseIteration) return parsedB.prereleaseIteration - parsedA.prereleaseIteration;
  return b.version.localeCompare(a.version);
}

function sortChangelogItems(items: ChangelogItem[]) {
  return [...items].sort(compareChangelogItemsDesc);
}

export const buildChangelogItems = (t: TFunction): ChangelogItem[] => sortChangelogItems([
  {
    version: "1.4.8-alpha.3",
    date: "2026-04-19",
    channel: "preview",
    tag: "alpha",
    notes: [
      t("changelog.items.release148Alpha3GridBaseline", { defaultValue: "将当前网格拖拽引擎重构阶段的主仓库代码整理为新的 Alpha 基线版本，便于后续继续推进较大改动" }),
      t("changelog.items.release148Alpha3Tooling", { defaultValue: "补齐基础 typecheck、test 与 release 校验链路，发布前验证流程更完整" }),
      t("changelog.items.release148Alpha3VersionAlign", { defaultValue: "统一 GitHub 预发布版本号、扩展清单版本名与应用内更新记录，减少版本识别混乱" }),
    ],
  },
  {
    version: "1.4.8-alpha.2",
    date: "2026-04-17",
    channel: "preview",
    tag: "alpha",
    notes: [
      t("changelog.items.release148Alpha2WorkspaceInline", { defaultValue: "将快捷方式网格工作区代码正式内联进 LeafTab 主仓库，不再依赖单独的外部 workspace 仓库" }),
      t("changelog.items.release148Alpha2BuildUnify", { defaultValue: "统一 workspace 类型与构建链路，降低主仓库构建和后续维护成本" }),
      t("changelog.items.release148Alpha2DragCheckpoint", { defaultValue: "继续整理抽屉拖拽与网格边界相关实现，为后续稳定版打基础" }),
    ],
  },
  {
    version: "2.0.0",
    date: "2026-04-20",
    notes: [
      t("changelog.items.release200IconColorAndRadius", { defaultValue: "快捷方式图标现支持任意自定义颜色与圆角大小，并新增彩色、单色、强调色三种图标色彩模式" }),
      t("changelog.items.release200FolderStyles", { defaultValue: "文件夹图标现支持小文件夹与大文件夹两种样式，展示更灵活" }),
      t("changelog.items.release200QuickAddFromAction", { defaultValue: "支持点击浏览器右上角的 LeafTab 插件图标，快速将当前网站添加为快捷方式" }),
      t("changelog.items.release200AutoColorAlgorithm", { defaultValue: "优化自动取色算法，自动取色结果更准确、更稳定" }),
      t("changelog.items.release200GridSimplify", { defaultValue: "移除“丰富网格”样式，统一保留当前简洁的网格布局" }),
    ],
  },
  {
    version: "1.4.6",
    date: "2026-04-08",
    notes: [
      t("changelog.items.release146CustomIconPreviewReplace", { defaultValue: "快捷方式自定义图标支持直接点击预览图进行替换，操作更顺手" }),
      t("changelog.items.release146CustomIconLiveRefresh", { defaultValue: "本地自定义图标被替换后，快捷方式图标会立即刷新显示" }),
      t("changelog.items.release146CustomIconTests", { defaultValue: "补充自定义图标替换与刷新相关测试，提升稳定性" }),
    ],
  },
  {
    version: "1.4.5",
    date: "2026-04-08",
    notes: [
      t("changelog.items.release145OnboardingAndThemeDefaults", { defaultValue: "新手引导默认选中“节奏”模式，并调整默认主题为绿色" }),
      t("changelog.items.release145TopNavAndShortcutGuide", { defaultValue: "主页顶部按钮精简为纯图标并优化 hover；快捷键与操作弹窗布局优化" }),
      t("changelog.items.release145SyncI18nPolish", { defaultValue: "同步中心与相关弹窗补齐中英文多语言（含书签同步提示与范围文案）" }),
    ],
  },
  {
    version: "1.4.4",
    date: "2026-04-07",
    notes: [
      t("changelog.items.release144TranslationPromptFix", { defaultValue: "修复每次打开 LeafTab 都可能出现“是否翻译此界面”的浏览器翻译提示" }),
      t("changelog.items.release144AboutQqGroup", { defaultValue: "关于 LeafTab 弹窗新增交流 QQ 群号，方便反馈与交流" }),
      t("changelog.items.release144ReadmeCommunityEntry", { defaultValue: "README 补充社区交流入口，并同步整理 1.4.4 发布信息" }),
    ],
  },
  {
    version: "1.4.3",
    date: "2026-04-07",
    notes: [
      t("changelog.items.release143SyncFlowAlignment", { defaultValue: "对齐云同步与 WebDAV 同步逻辑，危险书签差异时可继续同步快捷方式和设置" }),
      t("changelog.items.release143WebdavProviderPolish", { defaultValue: "WebDAV 新增坚果云内置服务商，并补齐切换服务商、授权、密钥校验与首次同步流程" }),
      t("changelog.items.release143SyncStatusPolish", { defaultValue: "优化同步中心状态、同步范围文案与错误处理，减少误报失败或状态不同步" }),
    ],
  },
  {
    version: "1.4.2",
    date: "2026-03-28",
    notes: [
      t("changelog.items.release142BookmarkSyncDecoupling", { defaultValue: "修复书签同步与快捷方式/设置同步解耦问题" }),
      t("changelog.items.release142DangerousSyncDialogPolish", { defaultValue: "优化书签同步风险拦截弹窗与交互提示" }),
      t("changelog.items.release142SyncTestingBackupNotice", { defaultValue: "数据同步仍处于测试阶段，建议先备份再开启" }),
    ],
  },
  {
    version: "1.4.1",
    date: "2026-03-28",
    notes: [
      t("changelog.items.release141BookmarkSyncFix", { defaultValue: "修复书签同步中的关键问题" }),
      t("changelog.items.release141SyncStability", { defaultValue: "增强数据同步稳定性" }),
      t("changelog.items.release141SyncTestingBackupNotice", { defaultValue: "数据同步仍处于测试阶段，开启前请注意备份" }),
    ],
  },
  {
    version: "1.4.0",
    date: "2026-03-27",
    notes: [
      t("changelog.items.release140CustomShortcutIcons", { defaultValue: "支持自定义快捷方式图标与颜色，个性化展示更灵活" }),
      t("changelog.items.release140BookmarkSyncToggle", { defaultValue: "支持书签同步（默认关闭），可按需开启并与现有同步流程协同" }),
      t("changelog.items.release140E2EEBackup", { defaultValue: "支持端到端加密备份，优先保障数据安全与隐私" }),
      t("changelog.items.release140PerformancePolish", { defaultValue: "优化整体性能表现与交互流畅度，降低卡顿与等待感" }),
    ],
  },
  {
    version: "1.4.0-alpha.5",
    date: "2026-03-24",
    channel: "preview",
    tag: "alpha",
    notes: [
      t("changelog.items.release140AlphaEncryptedBookmarkSync", { defaultValue: "支持书签云同步、WebDAV 同步与书签端到端加密同步" }),
      t("changelog.items.release140AlphaBookmarkSearchPolish", { defaultValue: "回归更稳定的普通书签搜索，并继续优化搜索与同步体验" }),
      t("changelog.items.release140AlphaKnownIssues", { defaultValue: "已知问题：Alpha 版本仍可能继续调整部分交互与文案表现" }),
    ],
  },
  {
    version: "1.3.9",
    date: "2026-03-20",
    notes: [
      t("changelog.items.release139LowEffectsMotion", { defaultValue: "优化低特效模式下的搜索与抽屉动效" }),
      t("changelog.items.release139BuildIsolation", { defaultValue: "改进 Firefox 与 Chrome 的构建隔离" }),
      t("changelog.items.release139Stability", { defaultValue: "提升整体稳定性" }),
    ],
  },
  {
    version: "1.3.8",
    date: "2026-03-19",
    notes: [
      t("changelog.items.release138WeatherAssets", { defaultValue: "天气视频统一压缩为更轻量的 WebM，并进一步下调到 45 帧率" }),
      t("changelog.items.release138WallpaperAssets", { defaultValue: "默认壁纸继续压缩，整体资源体积进一步下降" }),
      t("changelog.items.release138Cleanup", { defaultValue: "清理未使用素材与冗余文件，安装包体积显著缩小" }),
    ],
  },
  {
    version: "1.3.7",
    date: "2026-03-19",
    notes: [
      t("changelog.items.release137PermissionsAndSearch", { defaultValue: "统一商店版与社区版权限策略，搜索引擎切换与提示文案同步优化" }),
      t("changelog.items.release137WallpaperAndMotion", { defaultValue: "默认壁纸、自定义壁纸与首屏动画节奏重新对齐，减少刷新闪动" }),
      t("changelog.items.release137ScenarioAndSync", { defaultValue: "新增情景模式快捷切换，并修复下拉与同步时间显示问题" }),
    ],
  },
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
]);

export const buildChangelogSections = (t: TFunction): ChangelogSection[] => {
  const items = buildChangelogItems(t);
  const stableItems = sortChangelogItems(items.filter((item) => (item.channel || "stable") === "stable"));
  const previewItems = sortChangelogItems(items.filter((item) => item.channel === "preview"));

  const sections = [
    {
      id: "stable",
      title: t("changelog.sections.stable", { defaultValue: "正式版本" }),
      description: t("changelog.sections.stableDescription", { defaultValue: "面向所有用户的稳定更新" }),
      items: stableItems,
    },
    {
      id: "preview",
      title: t("changelog.sections.preview", { defaultValue: "预览版本" }),
      description: t("changelog.sections.previewDescription", { defaultValue: "Alpha / Beta 测试版本，功能和细节可能继续调整" }),
      items: previewItems,
    },
  ] satisfies ChangelogSection[];

  return sections.filter((section) => section.items.length > 0);
};
