export default {
  translation: {logoutConfirm: {
        title: "确认退出",
        description: "退出前会先尝试同步一次；如果当前离线或未能完成同步，本地改动会保留到下次继续。",
      clearLocalLabel: "清除本地数据并恢复初始",
      clearLocalDesc: "将本地快捷方式恢复为角色初始配置",
        confirm: "退出登录",
        cancel: "取消"
      },
    settings: {
      profile: {
        loggedInDesc: "已登录",
        daysActive: "加入天数",
        shortcutsCount: "快捷方式",
        guest: "未登录",
        guestDesc: "登录以同步数据"
      },
      title: "设置",
      newTabMode: {
        label: "新标签页打开",
        description: "快捷方式默认在新标签页中打开"
      },
      preventDuplicateNewTab: {
        label: "避免重复打开 LeafTab",
        description: "新建标签页时，若当前窗口已有 LeafTab，则直接切换过去并关闭新开的重复页",
        permissionDenied: "未授予标签页权限，无法启用避免重复打开 LeafTab。",
        permissionFailed: "申请标签页权限失败，请重试。"
      },
      searchEngineTabSwitch: {
        label: "Tab 切换搜索引擎",
        description: "聚焦搜索框时，按 Tab 在搜索引擎间循环切换"
      },
      searchSettings: {
        label: "搜索设置",
        description: "把搜索功能调成你习惯的方式",
        open: "打开",
        title: "搜索设置",
        items: {
          tabSwitch: {
            label: "Tab 切换搜索引擎",
            description: "搜索框聚焦后按 Tab 切换引擎\n按 Shift+Tab 可切回上一个",
            tooltip: "先点一下搜索框，再按 Tab 切到下一个引擎；按 Shift+Tab 切回上一个。"
          },
          prefix: {
            label: "快速指定搜索引擎",
            description: "输入引擎简称加空格，临时切换\n只影响本次搜索，不改默认引擎",
            tooltip: "例如：g AI 用 Google 搜，bd 天气 用百度搜。只影响这一次，不会改默认引擎。"
          },
          siteDirect: {
            label: "站点直达搜索",
            description: "输入“站点名 + 关键词”，优先站内搜索\n若站点不支持模板会自动回退为 site: 搜索",
            tooltip: "支持 GitHub、GitLab、Gitee、知乎、B站、YouTube、Google、Bing、百度、Wikipedia、Reddit、Amazon 等站点。若站点不支持模板会自动回退为 site: 搜索。"
          },
          siteShortcut: {
            label: "站点快捷建议",
            description: "输入站点名时优先匹配关键词\n先给出常用站点建议，回车可直达",
            tooltip: "例如输入 git，会优先出现 GitHub / GitLab / Gitee，回车可直接打开。"
          },
          anyKeyCapture: {
            label: "任意键直接搜索",
            description: "打开新标签页后直接打字\n自动聚焦搜索框并开始输入",
            tooltip: "不用先点击搜索框，在页面空白处输入字符会自动聚焦并开始输入。"
          },
          calculator: {
            label: "计算器预览",
            description: "输入算式会实时显示结果\n回车可填入并复制计算值",
            tooltip: "例如 12*8、(3+5)/2 会显示计算结果；按回车会把结果填入并复制到剪贴板。"
          },
          rotatingPlaceholder: {
            label: "搜索框提示轮播",
            description: "让搜索框占位提示自动切换\n关闭后固定显示默认提示",
            tooltip: "关闭后，搜索框里只固定显示“想找什么？直接输入，网址也可以”这一条提示。"
          }
        }
      },
      shortcutGuide: {
        label: "快捷键与操作",
        description: "查看常用快捷方式和对应操作",
        open: "查看",
        title: "快捷键与操作",
        dialogDescription: "LeafTab 快捷键与操作说明",
        helper: "以下内容只展示当前版本已经支持的快捷操作，方便随时查阅。",
        countSuffix: "项",
        columns: {
          shortcut: "快捷键",
          action: "对应操作"
        },
        sections: {
          search: "搜索",
          results: "结果列表"
        },
        items: {
          focusSearch: "聚焦搜索框并选中当前内容",
          switchEngine: "在搜索框中按 Tab 或 Shift+Tab 切换搜索引擎",
          switchScenarioNext: "不在输入状态时，循环切换到下一个情景模式",
          bookmarksMode: "进入书签搜索模式，首次使用时可能会请求书签权限",
          tabsMode: "进入标签页搜索模式，首次使用时可能会请求标签页权限",
          navigateResults: "在结果列表中上下移动选择",
          openResult: "打开当前选中的结果",
          closePanel: "关闭当前结果面板",
          showNumberHints: "在结果列表中显示数字提示",
          openNumberedResult: "按对应数字直接打开结果"
        },
        footer: "提示：数字提示和数字直达只在结果列表打开时生效；/t 与 /b 模式依赖浏览器权限。"
      },
      timeFormat: {
        label: "24 小时制",
        description: "使用 24 小时制显示时间"
      },
      showSeconds: {
        label: "显示秒数",
        description: "在时间组件中显示秒数"
      },
      showLunar: {
        label: "显示农历",
        description: "在时间下方显示农历日期"
      },
      timeAnimation: {
        label: "动画效果",
        description: "时间切换滚动动画",
        followSystemBadge: "跟随系统",
        followSystemAction: "恢复跟随系统",
        followSystemEnabled: "当前跟随系统：已开启",
        followSystemReduced: "当前跟随系统：已关闭",
        overrideOn: "已单独开启，不受系统限制",
        overrideOff: "已单独关闭"
      },
      visualEffectsLevel: {
        label: "系统特效强度",
        description: "选择低/中/高档位，平衡流畅度与视觉效果",
        low: "低",
        medium: "中",
        high: "高"
      },
      showTime: {
        label: "显示时间",
        description: "在页面中显示时间组件"
      },
      timeDisplay: {
        title: "时间显示",
        description: "设置时间样式与显示内容"
      },
      autoFocusSearch: {
        label: "自动聚焦搜索框",
        description: "进入页面时自动将光标聚焦在搜索框"
      },
      language: {
        label: "语言",
        description: "选择界面显示语言",
        selectPlaceholder: "选择语言"
      },
      openSyncCenter: "打开同步中心",
      syncCenterMoved: "同步入口已从设置中拆出。现在可以在主页右上角直接打开同步中心，处理手动同步和书签同步状态。",
      syncCenterShortcut: "完整同步状态与书签同步范围，请直接从主页右上角进入同步中心。",
      theme: {
        label: "主题",
        description: "切换浅色/深色主题，或跟随系统自动切换",
        selectPlaceholder: "选择主题",
        system: "跟随系统",
        light: "浅色",
        dark: "深色"
      },
      accentColor: {
        label: "主题色",
        description: "选择应用的主色调"
      },
      accent: {
        dynamic: "动态",
        mono: "黑白",
        green: "绿色",
        blue: "蓝色",
        purple: "紫色",
        orange: "橙色",
        pink: "粉色",
        red: "红色"
      },
      displayMode: {
        title: "布局模式",
        description: "选择页面显示风格",
        blank: "留白",
        blankDesc: "隐藏时间、壁纸与快捷方式",
        rhythm: "节奏",
        rhythmDesc: "仅保留搜索与快捷方式",
        panoramic: "全景",
        panoramicDesc: "显示时间、天气、壁纸与快捷方式"
      },
      shortcutsLayout: {
        label: "快捷方式密度",
        description: "调整每列显示的快捷方式数量",
        set: "设置",
        select: "选择"
      },
      shortcutsStyle: {
        label: "快捷方式样式",
        entryDescription: "切换快捷方式样式并设置网格列数与基础行数",
        open: "打开",
        title: "快捷方式样式设置",
        description: "选择快捷方式样式，并设置单页网格的列数和基础行数",
        rich: "丰富",
        compact: "简约",
        showName: "显示名称",
        showNameDesc: "开启后在图标下显示快捷方式标题",
        columns: "网格列数",
        rows: "基础行数"
      },
      backup: {
        label: "数据备份与恢复",
        description: "导入或导出本地布局数据 (.leaftab)",
        cloudTab: "云同步",
        webdavTab: "WebDAV 同步",
        import: "导入数据",
        export: "导出数据",
        importSuccess: "数据导入成功",
        importError: "数据导入失败，请检查文件格式",
        exportSuccess: "数据导出成功",
        importConfirmTitle: "导入并覆盖云端？",
        importConfirmDesc: "导入后将以导入文件为准并覆盖云端配置。系统会先自动下载一份云端备份。",
        importConfirmAction: "确认导入",
        cloudBackupDownloaded: "已下载云端备份",
        cloud: {
          configTitle: "云同步设置",
          configDesc: "设置自动同步开关、提示与间隔",
          enabledLabel: "开启云同步",
          enabledDesc: "关闭后将暂停自动同步，仍可手动同步",
          autoSyncToastLabel: "自动同步成功提示",
          autoSyncToastDesc: "定时自动同步成功后显示提示",
          intervalLabel: "自动同步间隔",
          intervalMinutes: "{{count}} 分钟",
          configSaved: "云同步设置已保存",
        },
        webdav: {
          entry: "WebDAV 同步",
          entryDesc: "配置 WebDAV 远程备份与恢复",
          configure: "配置",
          pull: "从云端拉取",
          push: "推送至云端",
          sync: "立即同步",
          url: "WebDAV 地址",
          filePath: "远程文件路径",
          username: "用户名",
          password: "密码",
          profileName: "配置名称",
          profileNamePlaceholder: "例如：家庭 NAS",
          usernamePlaceholder: "可选",
          passwordPlaceholder: "可选",
          syncByScheduleLabel: "定时自动同步",
          syncByScheduleDesc: "按固定时间间隔自动同步，适合长期开着页面",
          autoSyncToastLabel: "自动同步成功提示",
          autoSyncToastDesc: "定时自动同步成功后显示提示",
          syncIntervalLabel: "同步间隔",
          syncIntervalMinutes: "{{count}} 分钟",
          enabledLabel: "开启 WebDAV 同步",
          enabledDesc: "关闭后将暂停 WebDAV 自动与手动同步",
          providerCustom: "自定义服务",
          providerLabel: "WebDAV 服务商",
          providerPlaceholder: "选择服务商",
          policyMerge: "尽量合并本地和云端改动（推荐）",
          policyPreferRemote: "优先保留云端版本（本地会被覆盖）",
          policyPreferLocal: "优先保留本地版本（会覆盖云端）",
          download: "从 WebDAV 拉取",
          upload: "同步到 WebDAV",
          downloading: "拉取中...",
          uploading: "同步中...",
          downloadSuccess: "WebDAV 拉取成功",
          uploadSuccess: "WebDAV 同步成功",
          downloadError: "WebDAV 拉取失败，请检查配置",
          uploadError: "WebDAV 同步失败，请检查配置",
          syncSuccess: "数据同步成功",
          syncError: "同步失败，请检查配置",
          authFailed: "WebDAV 认证失败，请检查账号或密码",
          configSaved: "WebDAV 设置已保存",
          policyChangeSyncTriggered: "冲突策略已切换，已按当前策略同步一次",
          intervalChangeSyncTriggered: "同步间隔已调整，已立即同步一次",
          disableWebdavBeforeCloudLogin: "当前已开启 WebDAV 同步，请先关闭 WebDAV 同步后再登录云同步",
          disableWebdavBeforeCloudManage: "当前已开启 WebDAV 同步，请先关闭 WebDAV 同步后再管理云同步",
          disableCloudBeforeWebdavEnable: "当前已登录云同步，请先退出云同步后再开启 WebDAV 同步",
          disableCloudBeforeWebdavConfig: "当前已启用云同步，请先退出云同步后再配置 WebDAV 同步",
          logoutRequiredForWebdav: "当前已登录云同步，请先退出登录后再开启 WebDAV 同步",
          disableConfirmTitle: "关闭 WebDAV 同步",
          disableConfirmDesc: "确定要关闭 WebDAV 同步吗？关闭后仅保留本地数据。",
          clearLocalLabel: "清除本地数据并恢复初始",
          clearLocalDesc: "将本地快捷方式恢复为角色初始配置",
          urlRequired: "请先填写 WebDAV 地址",
          defaultProfileName: "默认配置",
          configured: "已配置，可同步到 WebDAV",
          disabled: "已停用",
          syncOffTitle: "WebDAV 未开启",
          configureAction: "去配置",
          enableSyncAction: "开启同步",
          notConfigured: "未配置，先去配置",
          lastSyncAt: "上次同步时间",
          notSynced: "未同步",
          justSynced: "刚刚已同步",
          minutesAgo: "{{count}} 分钟前同步",
          hoursAgo: "{{count}} 小时前同步",
          lastAttemptFailed: "最近尝试同步失败",
          scheduleRunning: "定时同步运行中",
          nextSyncAtLabel: "下次同步：{{time}}",
          syncDisabled: "请先开启 WebDAV 同步",
          disableFinalSyncFailed: "关闭前最后一次同步失败，已按你的操作关闭同步",
          enableConflictTitle: "检测到同步冲突",
          enableConflictDesc: "WebDAV 与本地数据不一致，请选择处理方式。"
        }
      },
      changelog: {
        title: "更新日志",
        description: "查看最近的功能与体验更新",
        open: "查看更新日志"
      },
      privacyPolicy: "隐私政策",
      copyright: "保留所有权利。",
      specialThanks: "特别感谢测试人员：yanshuai、Horang、Mling",
      iconAssistant: {
        title: "发送匿名使用统计",
        desc: "帮助我们优化图标适配（仅发送域名，不含个人信息）",
        modalTitle: "帮助改进 LeafTab",
        modalDesc: "我们仅收集“快捷方式对应的网站域名”（例如：google.com），用于统计哪些网站最常被添加，以便优先做图标适配和质量优化。\n\n不会收集：\n- 账号、密码、邮箱、姓名\n- 页面完整链接、路径、参数、搜索词\n- 浏览历史内容\n\n你可以随时在设置中关闭该选项；关闭后将停止后续上报。",
        agree: "同意并开启",
        disagree: "不同意",
        confirmClose: "关闭后将停止后续域名上报，我们将无法继续根据你的使用情况优先优化图标适配。\n\n已收集的数据仅为匿名域名统计，不包含个人信息。\n\n确定要关闭吗？",
        adminKeyLabel: "管理员密钥",
        adminKeyDesc: "用于导出全站收集到的域名清单（仅站长/自托管运营者使用）",
        adminKeyPlaceholder: "输入管理员密钥",
        adminKeySave: "保存",
        adminKeyClear: "清除",
        adminKeySaved: "管理员密钥已保存",
        adminKeyCleared: "管理员密钥已清除",
        adminKeyRequired: "需要管理员密钥",
        adminKeyInvalid: "管理员密钥无效或无权限",
        downloadTitle: "下载已收集的域名清单",
        downloadDesc: "仅域名、去重、排除已有图标（同一品牌合并）",
        downloadButton: "下载清单",
        viewerTitle: "打开域名后台管理页",
        viewerDesc: "在网页中查看全站域名数据（支持搜索、排序、分页与复制）",
        viewerButton: "打开管理页",
        viewerOpenFailed: "打开管理页失败，请检查浏览器弹窗拦截",
        reportNow: "立即上报",
        reportTriggered: "已触发上报（可能受限频影响）",
        queueStatus: "待上报：{{count}}，上次上报：{{last}}",
        downloadSuccess: "已下载域名清单",
        downloadFailed: "下载失败，请稍后重试"
      },
      adminMode: {
        tapRemaining: "再点击{{count}}次进入管理员模式",
        enabled: "您已进入管理员模式",
        alreadyEnabled: "您已经处于管理员模式",
        disabled: "管理员模式已关闭",
        switchLabel: "管理员模式",
        switchDesc: "开启后可配置管理员密钥并导出全站域名清单",
        open: "打开"
      },
      adminPanel: {
        statsTitle: "平台统计",
        statsDesc: "仅展示非敏感汇总数据",
        refresh: "刷新",
        loading: "加载中...",
        statsLoadFailed: "统计加载失败",
        enableHint: "请先在设置里连点版本号开启管理员模式",
        usersTotal: "注册用户",
        usersToday: "今日新增用户",
        usersYesterday: "昨日新增用户",
        usersLast7d: "近7天新增",
        usersLast30d: "近30天新增",
        privacyConsentRate: "匿名统计开启率",
        privacyConsentUsers: "{{count}} / {{total}} 位用户已开启",
        domainsUnique: "收集域名数",
        topUnsupportedTitle: "热门未适配域名 Top 10",
        topUnsupportedDesc: "按用户覆盖优先级排序，优先补这些站点的图标最划算。",
        topUnsupportedEmpty: "当前热门域名基本都已适配。",
        topUnsupportedUsers: "{{count}} 位用户",
        topUnsupportedLastSeen: "最近出现：{{time}}",
        weatherDebugLabel: "天气调试",
        weatherDebugDesc: "显示天气调试面板（仅当前会话）"
      },
      server: {
        customUrlLabel: "自定义后端地址",
        customUrlDesc: "用于登录与同步。留空则仅显示官方服务器。",
        customNamePlaceholder: "名称（可选）",
        customUrlPlaceholder: "地址（例如：https://example.com/api）",
        customSave: "保存",
        customClear: "清除",
        customSaved: "自定义后端地址已保存",
        customCleared: "自定义后端地址已清除",
        customInvalid: "地址格式不正确"
      },
      iconLibrary: {
        label: "图标库地址",
        desc: "用于优先加载 LeafTab 风格图标（GitHub Pages）",
        placeholder: "地址（例如：https://xxx.github.io/icons）",
        save: "保存",
        saved: "图标库地址已保存",
        restore: "恢复默认",
        restored: "已恢复默认图标库地址",
        invalid: "图标库地址格式不正确"
      },
      about: {
        label: "关于 LeafTab",
        desc: "查看版本信息与插件简介",
        open: "打开",
        title: "关于 LeafTab",
        versionLabel: "版本 v{{version}}",
        content: "LeafTab，一个由 AI 协助开发的、极简主义的新标签页插件。它不试图成为臃肿的浏览器操作系统，而是回归“新标签页”这一动作的本质——一个高效的起点。它不追求花哨，而是追求稳定、顺手、可控。",
        openSourceNoticePrefix: "LeafTab 社区版已开源（",
        openSourceNoticeSuffix: "），欢迎在 GitHub 提交 Issue / PR。",
        thirdPartyLicenseNotice: "部分第三方组件遵循其各自许可证。",
        ackTitle: "致谢与开源声明",
        ackDesc: "LeafTab 使用了以下开源库与资源（点击可跳转）：",
        frontend: "前端",
        backend: "后端",
        resources: "图标与资源",
        chromeStore: "Chrome 商店",
        edgeStore: "Edge 商店",
        firefoxStore: "Firefox 商店",
        github: "GitHub"
      }
    },
    changelog: {
      title: "更新日志",
      description: "记录最近的版本更新",
      version: "版本",
      date: "日期",
      sections: {
        stable: "正式版本",
        stableDescription: "面向所有用户的稳定更新",
        preview: "预览版本",
        previewDescription: "Alpha / Beta 测试版本，功能和细节仍可能继续调整",
      },
      items: {
        release144TranslationPromptFix: "修复每次打开 LeafTab 都可能出现“是否翻译此界面”的浏览器翻译提示",
        release144AboutQqGroup: "关于 LeafTab 弹窗新增交流 QQ 群号，方便反馈与交流",
        release144ReadmeCommunityEntry: "README 补充社区交流入口，并同步整理 1.4.4 发布信息",
        release143SyncFlowAlignment: "对齐云同步与 WebDAV 同步逻辑，危险书签差异时可继续同步快捷方式和设置",
        release143WebdavProviderPolish: "WebDAV 新增坚果云内置服务商，并补齐切换服务商、授权、密钥校验与首次同步流程",
        release143SyncStatusPolish: "优化同步中心状态、同步范围文案与错误处理，减少误报失败或状态不同步",
        release142BookmarkSyncDecoupling: "修复书签同步与快捷方式/设置同步解耦问题",
        release142DangerousSyncDialogPolish: "优化书签同步风险拦截弹窗与交互提示",
        release142SyncTestingBackupNotice: "数据同步仍处于测试阶段，建议先备份再开启",
        release141BookmarkSyncFix: "修复书签同步中的关键问题",
        release141SyncStability: "增强数据同步稳定性",
        release141SyncTestingBackupNotice: "数据同步仍处于测试阶段，开启前请注意备份",
        release140AlphaEncryptedBookmarkSync: "支持书签云同步、WebDAV 同步与书签端到端加密同步",
        release140AlphaBookmarkSearchPolish: "回归更稳定的普通书签搜索，并继续优化搜索与同步体验",
        release140AlphaKnownIssues: "已知问题：Alpha 版本仍可能继续调整部分交互与文案表现",
        release139LowEffectsMotion: "优化低特效模式下的搜索与抽屉动效",
        release139BuildIsolation: "改进 Firefox 与 Chrome 的构建隔离",
        release139Stability: "提升整体稳定性",
        release137PermissionsAndSearch: "统一商店版与社区版权限策略，搜索引擎切换与提示文案同步优化",
        release137WallpaperAndMotion: "默认壁纸、自定义壁纸与首屏动画节奏重新对齐，减少刷新闪动",
        release137ScenarioAndSync: "新增情景模式快捷切换，并修复下拉与同步时间显示问题",
        release135UiPolish: "优化界面效果",
        release135VisualRefine: "优化交互与视觉细节",
        release135KnownIssuesFix: "修复一些已知问题",
        release131DynamicWallpaperFlickerFix: "修复 Galaxy / Iridescence 灵动壁纸在部分设备上的闪烁，并对同类动态组件做一轮依赖稳定性排查。",
        release131TimeSecondsDefaultOn: "时间设置项“显示秒数”默认开启，新用户无需手动打开。",
        release131AdminDomainsBoard: "管理员模式新增域名后台管理页，支持搜索、排序、分页、复制与 CSV 导出。",
        release131DomainCountUniqueUsers: "域名 Count 语义调整为“唯一用户数”，同一用户重复上报不再累加，并统一主域匹配（如 index.baidu.com 归并为 baidu.com）。",
        release131BackendModularDeploy: "后端从单文件 index.js 拆分为 app/routes/lib 模块化结构，部署脚本与 HTTPS 文档同步对齐新流程。",
        release130DynamicEffectsOptimize: "优化全局动态效果体验，新增“减弱动态效果”开关并统一动画降级策略。",
        release130DynamicWallpaperTab: "新增“灵动”动态壁纸分类，支持 Prism、Silk、Light Rays、Beams、Galaxy、Iridescence 预览与应用。",
        release130ManualWeatherCity: "天气功能支持手动选择城市并持久保存，定位与展示更可控。",
        release129ModeUiRefactor: "重构“全景 / 节奏 / 留白”三种模式主界面，拆分复用组件并清理历史冗余代码。",
        release129WallpaperModalRefine: "壁纸设置弹窗重构为 Bing / 天气 / 颜色 / 自定义四标签，交互与布局统一。",
        release129ColorWallpaperGradients: "新增颜色壁纸（12 组可选渐变），并优化渐变强度、色卡圆角与预览视觉。",
        release129MaskSliderByMode: "新增壁纸遮罩透明度滑块（0-100），仅当前启用壁纸类型显示且悬停出现。",
        release129ContrastAndOpacityTune: "优化节奏/留白模式可读性：四角模块默认半透明、快捷方式文字阴影增强、浅色下关键文字保持白色。",
        release128ShortcutStyleDialog: "新增快捷方式样式设置弹窗：支持“丰富 / 简约”两种卡片样式切换。",
        release128CompactLayoutRefine: "简约快捷方式布局优化为 9 列贴边排布，并统一网格间距表现。",
        release128CompactHoverOnlyIcon: "简约卡片悬停交互改为仅图标放大，不再出现背景高亮或挤占抖动。",
        release128EmptyIconFallback: "快捷方式图标新增 emptyicon 兜底：无图标显示标题首字；添加/编辑弹窗预览同步该样式。",
        release128IgnoreFakeFavicons: "图标解析新增无效兜底源过滤（DuckDuckGo / Google / gstatic favicon），避免错误占位图标。",
        release127CaptchaSessionFix: "修复线上注册验证码频繁误判：确保验证码生成与注册校验使用同一会话。",
        release127ProxyCookieDefaults: "优化生产环境会话默认配置（代理信任 + Cookie 策略），提升扩展到后端的会话稳定性。",
        release127FirstLoginLocalFirst: "新用户首次登录不再弹同步冲突窗口，直接以本地数据优先同步到云端。",
        release127DeployScriptLibUpload: "修复后端部署脚本未上传 server/lib 的问题，并强化部署环境变量默认补全。",
        release126UnifiedCompareDialog: "云端登录冲突检测流程与 WebDAV 统一，直接进入大对比弹窗。",
        release126ConflictStrategyTabs: "冲突处理改为顶部 Tab 切换“以云端为准 / 以本地为准 / 合并”。",
        release126ConflictPendingPersist: "关闭冲突弹窗或刷新页面后，未处理冲突会保留并自动恢复。",
        release126ConflictFreezeAutoSync: "存在未处理冲突时自动同步会暂停，确认处理后自动恢复。",
        release126CompareUiRefine: "大对比弹窗明细区视觉精简：去掉每项外层容器，并采用与设置页一致的 Tab 样式。",
        release125ImportLocalFirstSync: "登录状态下导入本地数据后，确认导入即立即同步到云端（本地优先）。",
        release125ManualCloudLocalFirst: "云同步开启时，手动“立即同步”不再弹冲突检测，直接以本地数据覆盖云端。",
        release125SyncSettingsUi: "云同步与 WebDAV 同步设置弹窗优化：两个开关去掉容器包裹并调整顺序。",
        release125WebdavCorsPermission: "WebDAV 同步新增扩展后台代理与按域名动态权限申请（保留 http/https），提升跨域兼容性。",
        release125WebdavAuthHint: "WebDAV 新增认证错误识别：账号或密码错误（401/403）将给出明确提示。",
        release124UpdateNotice: "新增社区版 GitHub 新版本检测与更新提示弹窗，支持直达 Release 下载。",
        release124Snooze24h: "更新提示新增“稍后再说”24 小时冷却策略，避免频繁打扰用户。",
        release124ChangelogEntry: "更新日志弹窗新增 1.2.4 条目并补充多语言文案。",
        release124ReleasePackaging: "新增标准发布打包脚本，生成的 zip 根目录直接包含 manifest.json。",
        release124FirefoxCompat: "修复 Firefox 商店包结构问题并调整 manifest 兼容配置。",
        release123WebdavAccessDialog: "WebDAV“开启同步”改为专用接入弹窗，样式与登录弹窗统一",
        release123UnifiedSyncSettings: "云同步与 WebDAV 同步设置项统一，移除冲突处理下拉项",
        release123AutoSyncToggles: "新增“自动同步开关”和“自动同步成功提示开关”，并支持关闭后禁用间隔滑块",
        release123ProviderLabel: "WebDAV 卡片标题改为显示服务商名称（不再显示“默认配置”）",
        release123PasswordToggle: "登录/注册密码输入框新增显示/隐藏密码按钮",
        release122Scrollbar: "关于 LeafTab 弹窗滚动条改为与设置弹窗一致",
        release122WelcomePersist: "首次注册登录引导弹窗状态支持本地+云端持久化，刷新不再闪烁",
        release122RateLimitToast: "修复 429 限流提示不显示的问题，并统一提示样式",
        release122WebdavSchedule: "WebDAV 定时同步改为系统时间基准，展示下次同步时间并在关键配置变更后立即同步",
        release122CustomServer: "支持切换自定义云同步服务器",
        release122CustomIconSource: "支持自定义图标源",
        release122OnlineIconSource: "图标源更新为在线获取（GitHub Pages）",
        release122DynamicAccent: "新增动态取色主题色",
        release121Webdav: "新增 WebDAV 同步功能",
        release121Ui: "优化 UI 样式",
        release121Fixes: "修复了一些 bug",
        grid: "底部快捷方式重写为扁平网格",
        carousel: "新增滑动分页与鼠标滚轮翻页",
        entrance: "壁纸、搜索、快捷方式入场动画优化",
        dots: "分页圆点居中与样式优化"
      }
    },
    updateNotice: {
      title: "发现新版本 {{version}}",
      description: "GitHub 上有新版本可用，建议下载更新。",
      currentVersion: "当前版本",
      latestVersion: "最新版本",
      publishedAt: "发布时间：{{date}}",
      changelogTitle: "本次更新内容",
      noChangelog: "该版本暂未提供详细更新日志。",
      imageAlt: "LeafTab 更新",
      badge: "新版本 v{{version}}",
      later: "稍后再说",
      ignoreThisVersion: "忽略此版本",
      downloadFromGithub: "前往 GitHub 下载",
      openRelease: "前往 GitHub 下载",
      sampleNote1: "统一云同步与 WebDAV 同步设置项交互",
      sampleNote2: "新增自动更新提示弹窗，可直达 GitHub Release",
      sampleNote3: "优化更新日志弹窗排版层级"
    },
    roles: {
      programmer: "程序员",
      product_manager: "产品经理",
      designer: "设计师",
      student: "学生",
      marketer: "市场运营",
      finance: "金融投资",
      hr: "人力资源",
      admin: "行政文职",
      general: "通用"
    },
    banner: {
      syncPrompt: "登录以同步您的数据",
      loginNow: "立即登录"
    },
    languages: {
      zh: "中文",
      "zh-TW": "繁体中文",
      en: "English",
      vi: "越南语",
      ja: "日语",
      ko: "韩语"
    },
    weather: {
      refreshing: "正在刷新天气和位置...",
      unknown: "未知",
      openLocationDialog: "点击打开天气定位设置",
      locationSettingsTitle: "天气定位",
      locationSettingsDesc: "可手动设置城市并保存",
      manualCityLabel: "手动城市（最高优先级）",
      manualCityPlaceholder: "搜索城市，例如：上海",
      manualCityApply: "设置手动城市",
      manualCityClear: "使用自动定位",
      manualCityRequired: "请输入城市名称",
      manualCitySet: "手动城市已更新",
      manualCityCleared: "已切换为自动定位",
      manualCityInvalid: "城市搜索失败，请检查拼写",
      manualCityNeedSelect: "请从下拉候选列表中选择城市",
      manualCitySearchHint: "至少输入 2 个字符开始搜索",
      manualCitySearching: "正在搜索城市...",
      manualCityNoResult: "未找到匹配城市",
      browserApplied: "已使用浏览器定位",
      browserUnavailable: "浏览器定位不可用，已切换为兜底定位",
      ipApplied: "已使用 IP 定位",
      ipUnavailable: "IP 定位不可用，已切换为兜底定位",
      autoSourceLabel: "自动定位来源",
      autoSourceIp: "使用 IP 定位",
      autoSourceBrowser: "使用浏览器定位",
      refreshNow: "立即刷新",
      source: {
        manual: "手动城市",
        browser: "浏览器定位",
        ip: "IP 定位",
        timezone: "时区兜底"
      },
      wallpaper: {
        mode: "壁纸设置",
        modeDesc: "设置页面壁纸",
        bing: "bing",
        weather: "天气",
        custom: "自定义",
        dynamic: "灵动",
        uploadTitle: "上传自定义壁纸",
        upload: "上传图片",
        uploadDesc: "点击上传或者拖动图像到此区域都可以",
        download: "下载",
        setAsWallpaper: "设为壁纸",
        apply: "设为壁纸",
        bingDesc: "每天自动更新来自 Bing 的壁纸。",
        weatherDesc: "根据当地天气情况动态变化。",
        customDesc: "上传您自己的图片作为壁纸。",
        customUploaded: "您上传的壁纸。",
        imageSupport: "支持 JPG, PNG, WEBP 格式",
        maskOpacity: "黑色遮罩",
        autoDimInDarkMode: "深色模式自动调暗壁纸",
        autoDimInDarkModeDesc: "深色模式下自动额外增加黑色遮罩，提升可读性。"
      },
      codes: {
        0: "晴",
        1: "晴",
        2: "多云",
        3: "阴",
        45: "雾",
        48: "雾",
        51: "小雨",
        53: "中雨",
        55: "大雨",
        56: "冻雨",
        57: "冻雨",
        61: "小雨",
        63: "中雨",
        65: "大雨",
        66: "冻雨",
        67: "冻雨",
        71: "小雪",
        73: "中雪",
        75: "大雪",
        77: "雪粒",
        80: "阵雨",
        81: "阵雨",
        82: "暴雨",
        85: "阵雪",
        86: "阵雪",
        95: "雷阵雨",
        96: "雷阵雨伴有冰雹",
        99: "雷阵雨伴有冰雹"
      },
      defaultCity: "杭州",
      defaultWeather: "多云",
      unknownLocation: "未知位置",
      local: "本地"
    },
    common: {
      loading: "加载中...",
      cancel: "取消",
      close: "关闭",
      confirm: "确定",
      settings: "设置",
      sync: "同步",
      delete: "删除",
      save: "保存",
      current: "当前使用",
      clear: "清空",
      back: "返回",
      more: "更多"
    },
    lunar: {
      label: "农历"
    },
	    user: {
	      loggedIn: "已登录",
	      logout: "退出登录",
	      loggedOut: "已退出登录",
	      days: "天",
	      shortcutsCount: "个快捷方式",
	      logoutOfflineWarning: "退出前会先尝试同步一次；如果当前离线或未能完成同步，本地改动会保留到下次继续。确定要退出吗？"
	    },
	    leaftabSync: {
	      provider: {
	        webdav: "WebDAV 同步",
	        cloud: "云同步",
	        generic: "同步"
	      },
	      webdav: {
	        actions: {
	          mkcol: "创建目录",
	          upload: "写入",
	          download: "读取",
	          delete: "删除"
	        },
	        error: {
	          withPath: "WebDAV {{action}}失败（{{status}}）：{{path}}",
	          noPath: "WebDAV {{action}}失败（{{status}}）"
	        }
	      },
	      cloud: {
	        error: {
	          lockedTryFix: "云同步被旧设备锁定，已尝试自动修复；如果仍失败请再试一次",
	          remoteCommitChanged: "云端数据刚刚发生变化，请重新同步一次",
	          parentCommitRequired: "云端已有新版本，请先拉取最新数据后再覆盖",
	          httpStatus: "云同步失败（{{status}}）",
	          generic: "云同步失败"
	        }
	      }
	    },
	    leaftabSyncRunner: {
	      progressDetailDefault: "正在后台同步，你可以继续进行其他操作",
	      permissionTitle: "正在检查书签权限",
	      permissionDetail: "需要确认当前浏览器允许访问书签数据",
	      bookmarksPermissionDeniedToast: "未授予书签权限，本次仅同步快捷方式和设置",
	      bookmarksPermissionDeniedToastAlt: "书签权限未授权，当前仅同步快捷方式和设置",
	      successTitle: "同步完成",
	      successToastFallback: "同步完成",
	      successDetailFallback: "本地与云端已经处理完成",
	      webdav: {
	        prepareTitle: "正在准备同步数据",
	        prepareDetail: "正在读取本地与云端状态",
	        disable: {
	          title: "正在停用同步",
	          detail: "正在处理最后一次同步和关闭操作",
	          finalSyncTitle: "正在同步最后的变更",
	          closingTitle: "正在关闭同步",
	          clearingTitle: "正在清理本地数据",
	          doneTitle: "同步已停用"
	        }
	      },
	      cloud: {
	        prepareTitle: "正在准备云同步",
	        prepareDetail: "正在读取本地与账号云端状态",
	        lockConflict: {
	          autoFixToast: "检测到云同步锁冲突（409），正在自动修复后重试",
	          autoFixTitle: "检测到旧云端锁，正在自动修复",
	          autoFixDetail: "正在释放旧锁并重新尝试同步",
	          failedToast: "云同步失败（409）：当前账号同步锁被其他设备占用。请关闭其他设备同步后重试，或等待约 2 分钟再试。"
	        },
	        commitConflict: {
	          realignTitle: "检测到云端版本变化，正在重新对齐状态",
	          realignDetail: "正在等待最新状态生效后重试"
	        }
	      }
	    },
	    leaftabSyncActions: {
	      dataDetail: {
	        withBookmarks: "正在处理快捷方式和书签数据",
	        shortcutsOnly: "正在处理快捷方式数据"
	      },
	      bookmarksPermissionRequired: "未授予书签权限，无法执行修复同步",
	      webdav: {
	        inProgress: "WebDAV 同步正在进行中，请稍候",
	        syncingTitle: "正在同步到 WebDAV",
	        repair: {
	          pullTitle: "正在用 WebDAV 覆盖本地",
	          pushTitle: "正在用本地覆盖 WebDAV",
	          pullSuccess: "已用 WebDAV 数据覆盖本地",
	          pushSuccess: "已用本地数据覆盖 WebDAV",
	          pullFailed: "WebDAV 覆盖本地失败",
	          pushFailed: "本地覆盖 WebDAV 失败"
	        }
	      },
	      cloud: {
	        inProgress: "云同步正在进行中，请稍候",
	        syncingTitle: "正在同步到云端",
	        repair: {
	          pullTitle: "正在用云端覆盖本地",
	          pushTitle: "正在用本地覆盖云端",
	          pullSuccess: "已用云端数据覆盖本地",
	          pushSuccess: "已用本地数据覆盖云端"
	        }
	      }
	    },
	    syncPreview: {
	      hint: {
	        local: "右侧划线项将在同步后从云端删除",
	        cloud: "左侧划线项将在同步后从本地删除",
	        merge: "合并会保留两侧内容并去重（本地优先）"
	      },
	      noComparable: "未读取到可对比的快捷方式数据"
	    },
	    leaftabDangerousSync: {
	      toast: {
	        skipBookmarks: "本次将跳过书签，仅同步快捷方式和设置",
	        cloudBookmarksDisabled: "已启用云同步，并暂时关闭“同步书签”",
	        webdavBookmarksDisabled: "已启用 WebDAV 同步，并暂时关闭“同步书签”"
	      }
	    },
	    leaftabSyncCenter: {
      title: "同步中心",
      description: "基于 WebDAV 的同步中心，当前重点支持场景、快捷方式和书签同步。",
      bookmarkScope: "书签同步范围：{{scope}}",
      summary: "{{shortcuts}} 个快捷方式，{{scenarios}} 个场景，{{bookmarks}} 个书签",
      stateLabel: "状态",
      initAction: "初始化同步",
      nav: {
        syncing: "同步中",
        attention: "同步异常"
      },
      status: {
        syncing: "同步中",
        conflict: "需要处理",
        error: "同步失败",
        ready: "就绪"
      },
      state: {
        analyzing: "正在分析同步状态...",
        syncing: "正在后台同步",
        syncingDescription: "LeafTab 正在后台比对本地与云端差异，并写回需要更新的数据。界面没有卡住，等待完成即可。",
        initRequired: "需要初始化",
        initDescription: "本地和云端都已经有数据，请先选择首次初始化方式，再开启后台同步。",
        ready: "合并同步已就绪",
        readyDescription: "新的同步引擎已经可以对场景、快捷方式，以及浏览器真实书签根执行推送、拉取与合并同步。"
      },
      actions: {
        syncing: "后台同步中..."
      }
    },
    leaftabSyncDialog: {
      description: "这里单独管理 LeafTab 的同步状态、手动同步与 WebDAV 配置。",
      scopeTitle: "当前纳入同步的数据",
      scopeDescription: "当前重点同步场景、快捷方式，以及浏览器里的书签栏和其他书签。",
      scopeBadge: "新引擎",
      scopeScenarios: "场景 {{count}}",
      scopeShortcuts: "快捷方式 {{count}}",
      scopeBookmarks: "书签 {{count}}",
      bookmarkScopeNote: "书签同步范围：{{scope}}",
      runtimeTitle: "运行状态",
      runtimeBusy: "正在后台执行同步，请等待当前轮次完成。",
      runtimeIdle: "当前界面可随时查看状态、手动触发同步，或调整 WebDAV 配置。",
      runtimeBusyNote: "如果你刚刚点了“立即同步”或“启用同步”，现在不是卡住了，而是在后台读取本地数据、对比云端快照并写回差异。",
      runtimeReadyNote: "建议先完成 WebDAV 配置。之后所有同步都会默认自动合并本地与云端数据。",
      webdavPath: "地址：{{value}}",
      webdavLastSync: "上次同步：{{value}}",
      lastError: "最近一次错误",
      disableSync: "停用同步",
      enableSync: "启用同步",
      scopeDefault: "书签",
      lastSyncEmpty: "暂无记录",
      lastSyncUnavailable: "未同步",
      manualSyncOnly: "当前仅手动同步",
      autoSyncOn: "自动同步已开启",
      repair: "修复同步",
      cloudOverwriteLocal: "云端覆盖本地",
      localOverwriteCloud: "本地覆盖云端",
      remoteOverwriteLocal: "WebDAV 覆盖本地",
      localOverwriteRemote: "本地覆盖 WebDAV",
      tabs: {
        cloud: "云同步",
        webdav: "WebDAV 同步"
      },
      metrics: {
        localShortcuts: "本地快捷方式",
        localBookmarks: "本地书签",
        remoteShortcuts: "云端快捷方式",
        remoteBookmarks: "云端书签"
      },
      details: {
        lastSync: "上次同步",
        nextSync: "下次同步",
        scope: "同步范围"
      },
      cloud: {
        bookmarkSyncDisabledBanner: "未开启书签同步，当前只会同步快捷方式和设置。",
        enableBookmarkSyncAction: "去开启",
        connectedFallback: "LeafTab 账号",
        unsignedTitle: "未登录",
        unsignedSubtitle: "登录以同步数据",
        loginToStart: "登录后设置",
        signedOut: "未登录",
        connectedSubtitle: "已登录，可同步 LeafTab 数据",
        disabledSubtitle: "已登录，可在云同步设置里开启同步",
        openSettingsToEnable: "前往开启",
        ready: "已连接",
        disabled: "未启用",
        error: "同步失败",
        enableViaSettings: "前往开启同步",
        manage: "管理云同步",
        scopeRich: "快捷方式、{{scope}}",
        scopeShortcutsOnly: "仅快捷方式和设置"
      },
      webdav: {
        connectedFallback: "WebDAV",
        unconfiguredTitle: "WebDAV 未开启",
        unconfiguredSubtitle: "未配置，先去配置",
        enabledSubtitle: "已配置，可同步到 WebDAV",
        disabledSubtitle: "已配置，尚未启用同步",
        configureToStart: "配置后设置",
        enableToStart: "已配置，待启用",
        scopeWithLabel: "快捷方式、{{scope}}"
      }
    },
	    leaftabSyncEncryption: {
      cloudNotEnabledTitle: "当前未开启云同步",
      cloudNotEnabledPill: "未开启",
      webdavNotEnabledTitle: "当前未开启 WebDAV 同步",
      webdavNotEnabledPill: "未开启",
      statusReadyTitle: "端到端加密已开启",
      statusMissingTitle: "同步口令尚未设置",
      statusReadyPill: "已保护",
      statusMissingPill: "未设置",
      setupTitle: "设置同步口令",
      unlockTitle: "输入同步口令",
      setupDescription: "为 {{provider}} 设置端到端加密口令。服务器无法查看你的同步内容，也无法帮你找回这个口令。",
      unlockDescription: "请输入 {{provider}} 的同步口令以解锁云端密文数据。",
      setupConfirm: "保存口令",
      unlockConfirm: "解锁同步",
      e2eeSetupDescription: "你的数据会先在本地加密，再上传到云端或 WebDAV。只有输入这组同步口令的设备，才能解锁和读取同步内容。",
      e2eeUnlockDescription: "同步数据在云端保存的是加密内容。输入正确的同步口令后，当前设备才能在本地解锁并读取这些数据。",
      passphraseLabel: "同步口令",
      passphrasePlaceholder: "至少 8 位，建议包含字母和数字",
      passphraseHint: "这是同步专用口令，不是账号登录密码。",
      confirmLabel: "再次输入同步口令",
      confirmPlaceholder: "再次输入用于确认",
      setupChecklistTitle: "继续前请确认以下事项",
	      checklist: {
	        serverCannotAccess: "我们不保存这组同步口令，也无法看到你加密后的同步内容。",
	        cannotRecover: "忘记这组同步口令后，已有加密同步数据将无法恢复。",
	        newDeviceUnlock: "更换设备或清除本地数据后，需要重新输入这组同步口令。"
	      },
	      deviceUnlockDescription: "当前设备解锁后，后续同步无需重复输入。",
	      errors: {
	        missingMetadata: "缺少同步加密元数据",
	        incorrectPassphrase: "同步口令不正确",
	        invalidConfig: "同步加密配置无效"
	      },
	      toast: {
	        saved: "同步口令已保存",
	        unlocked: "同步数据已解锁",
	        saveFailed: "保存同步口令失败"
	      }
	    },
	    leaftabFirstSync: {
      title: "初始化同步",
      description: "选择第一次 LeafTab 同步时，应该如何处理当前浏览器书签、本地 LeafTab 数据与云端数据。",
      recommended: "推荐",
      processingToastTitle: "正在处理初始化同步...",
      processingToastDescription: "LeafTab 正在后台同步浏览器书签与云端数据，完成前这个提示会一直保留。",
      processingBadge: "处理中",
      processingInline: "正在后台执行初始化同步，请稍候...",
      processingFooter: "正在后台初始化同步，请不要关闭当前窗口。完成后会自动返回正常同步状态。",
      footer: "这一步只在首次同步时出现。初始化完成后，LeafTab 会继续基于合并模型同步浏览器书签、快捷方式与场景。",
      choice: {
        push: {
          title: "上传本地数据",
          description: "以当前设备为准，把现在的 LeafTab 数据和浏览器书签写入 WebDAV。"
        },
        pull: {
          title: "下载云端数据",
          description: "用 WebDAV 上最新的远端快照覆盖当前本地 LeafTab 数据和浏览器书签。"
        },
        merge: {
          title: "智能合并",
          description: "合并本地和云端数据，保留双方各自独有的 LeafTab 数据与浏览器书签，并自动处理大多数冲突。"
        }
      }
    },
    search: {
      placeholder: "想找什么？直接输入就行",
      placeholderDynamic: "想找什么？直接输入，网址也可以",
      placeholderHintTabSwitch: "想换搜索方式？按 Tab 试试",
      placeholderHintCalculator: "输入 12*8 这样也能直接算",
      placeholderHintSiteDirect: "输入 bilibili 动画，可直接搜 Bilibili",
      placeholderHintPrefix: "想用 Google 搜？先输入 g，再空一格后输入内容",
      systemEngine: "系统默认",
      useEngineSearch: "使用{{engine}} 搜索",
      prefixEngineInlineHint: "用{{engine}}搜索",
      historyTitle: "搜索历史",
      clearHistory: "清空",
      noHistory: "暂无搜索记录"
    },
    groups: {
      edit: "编辑",
      addShortcut: "新建快捷方式"
    },
    context: {
      open: "打开",
      edit: "编辑",
      copyLink: "复制链接",
      delete: "删除",
      addShortcut: "添加快捷方式",
      newShortcut: "新建快捷方式",
      pinToTop: "置顶",
      multiSelect: "多选",
      cancelMultiSelect: "退出多选"
    },
    sidebar: {
      toggle: "切换侧边栏",
      title: "侧边栏",
      description: "显示移动端侧边栏。"
    },
    shortcutModal: {
      addTitle: "添加快捷方式",
      editTitle: "编辑快捷方式",
      nameLabel: "名称",
      namePlaceholder: "请输入快捷方式标题",
      urlLabel: "网址",
      urlPlaceholder: "请输入网址",
      errors: {
        fillAll: "请填写完整信息",
        fillAllDesc: "请输入快捷方式标题和链接地址",
        duplicateUrl: "该网站已存在快捷方式",
        duplicateUrlDesc: "同一网站仅保留一个快捷方式，请检查网址后重试"
      }
    },
    onboarding: {
      welcome: "欢迎使用 LeafTab",
      selectRole: "选择您的角色，开始个性化体验",
      skip: "跳过",
      start: "开始体验",
      next: "下一步",
      layoutTip: "布局稍后可在设置中修改",
      stepAppearanceTitle: "设置主题与语言",
      stepAppearanceDesc: "选择外观与界面语言，稍后可在设置中修改",
      stepRoleTitle: "选择你的角色",
      stepRoleDesc: "用于初始化推荐快捷方式与布局",
      stepLayoutTitle: "选择布局样式",
      stepLayoutDesc: "确定首页展示的排布方式",
      stepPermissionsTitle: "授权访问权限",
      stepPermissionsDesc: "完成历史记录与书签授权后，搜索与直达能力会更完整",
      historyPermissionTitle: "访问历史记录",
      historyPermissionDesc: "授权后可在 LeafTab 中显示最近浏览与相关搜索建议",
      bookmarksPermissionTitle: "访问书签",
      bookmarksPermissionDesc: "授权后可直接搜索和打开浏览器书签内容",
      tabsPermissionTitle: "访问浏览器标签页",
      tabsPermissionDesc: "授权后可启用标签页搜索，并避免重复打开 LeafTab 新标签页",
      authorize: "去授权",
      authorizing: "授权中...",
      authorized: "已授权",
      unsupported: "暂不支持",
      permissionTip: "这两项都可以稍后在使用过程中再授权，不会影响先进入主页。",
      enterHome: "进入首页"
    },
    auth: {
      description: "登录或注册您的账号以保存个性化设置。",
      tabs: { login: "登录", register: "注册" },
      server: { label: "服务器", official: "官方服务器", custom: "自定义服务器" },
      labels: { username: "用户名", password: "密码", captcha: "验证码" },
      placeholders: {
        usernameInput: "请输入用户名",
        passwordInput: "请输入密码",
        usernameSet: "设置用户名",
        passwordSet: "设置密码",
        captchaInput: "请输入验证码"
      },
      tips: {
        username: "支持英文、数字、邮箱格式，长度3-32位",
        password: "密码长度需为8-24位",
        refreshCaptcha: "点击刷新"
      },
      buttons: {
        loggingIn: "登录中...",
        login: "登录",
        registering: "注册中...",
        register: "注册"
      },
      toast: {
        loginSuccess: "登录成功！欢迎回来，{{username}}",
        registerSuccess: "注册成功！请登录，{{username}}"
      },
      errors: {
        usernamePasswordRequired: "请输入用户名和密码",
        captchaRequired: "请输入验证码",
        usernameFormatInvalid: "用户名格式错误",
        passwordLength: "密码长度需在8-24位之间",
        loginFailed: "登录失败",
        registerFailed: "注册失败",
        loginRequestFailed: "登录请求失败，请检查网络或服务器状态",
        registerRequestFailed: "注册请求失败，请检查网络或服务器状态",
        userExists: "用户名已存在",
        userNotFound: "用户不存在",
        invalidPassword: "密码错误",
        invalidCredentials: "用户名或密码错误",
        invalidUsernameFormatBackend: "用户名格式错误（3-20位字母数字下划线）",
        passwordTooShort: "密码长度不足（至少6位）",
        credentialsRequired: "请输入用户名和密码",
        invalidCaptcha: "验证码错误",
        internalError: "服务器内部错误",
        tooManyRequests: "请求过于频繁，请稍后再试"
      }
    },
    shortcutDelete: {
      confirm: "删除",
      cancel: "取消",
      title: "删除快捷方式",
      description: "确定要删除这个快捷方式吗？"
    },
    syncConflict: {
      title: "同步冲突",
      description: "检测到本地与云端快捷方式不一致，请选择使用哪一份。",
      merge: "合并两者",
      useCloud: "以云端为准",
      useLocal: "以本地为准"
    },
    syncUndo: {
      message: "已使用{{chosen}}配置，已备份{{backup}}配置，可在 {{seconds}} 秒内撤销。",
      undo: "撤销",
      undone: "已撤销同步选择",
      backupToast: "已自动备份{{backup}}配置",
      backupToastBoth: "已自动备份云端与本地配置"
    },
    scenario: {
      title: "情景模式",
      defaultName: "Working mode",
      unnamed: "未命名",
      createTitle: "新建情景模式",
      createDescription: "设置名称、颜色与图标",
      editTitle: "编辑情景模式",
      editDescription: "修改名称、颜色与图标",
      nameLabel: "模式名称",
      namePlaceholder: "请输入模式名称",
      colorLabel: "颜色",
      iconLabel: "图标",
      actionEdit: "编辑情景模式",
      actionDelete: "删除情景模式",
      colorPicker: "选择颜色",
      iconPicker: "选择图标",
      createButton: "新建情景模式",
      addButton: "添加",
      saveButton: "保存",
      deleteTitle: "删除情景模式",
      deleteConfirm: "确定要删除该情景模式吗？删除后将同时移除该模式下的所有分组和快捷方式，且无法恢复，请谨慎操作。",
      deleteConfirmWithTarget: "确定要删除「{{name}}」吗？删除后将同时移除该模式下的所有分组和快捷方式，且无法恢复，请谨慎操作。",
      deleteButton: "删除",
      toast: {
        created: "已添加情景模式",
        updated: "已更新情景模式",
        deleted: "已删除情景模式",
        switched: "已切换到：{{name}}"
      }
    },
    toast: {
      cloudSynced: "已同步云端配置",
      cloudAutoSyncSuccess: "云端自动同步成功",
      cloudSyncFailed: "同步云端配置失败",
      cloudSyncRateLimited: "本地已保存，云端同步过于频繁，将稍后重试",
      syncFailed: "同步失败",
      syncCloudApplied: "已使用云端配置",
      syncLocalApplied: "已使用本地配置",
      syncMergeApplied: "已合并云端与本地配置",
      linkCopied: "链接已复制",
      linkCopyFailed: "复制链接失败",
      loadedFromCache: "已加载本地缓存（离线模式）",
      sessionExpired: "会话已过期，请重新登录",
      shortcutCreateFailed: "无法创建快捷方式",
      alreadyOnPage: "已在当前页"
    },
    sync: {
      cloud: "云端",
      local: "本地"
    },
    pagination: {
      page: "第 {{page}} 页"
    }
  }
};
