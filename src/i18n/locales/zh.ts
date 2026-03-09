export default {
  translation: {logoutConfirm: {
        title: "确认退出",
        description: "您确定要退出登录吗？退出后，本地未同步的快捷方式更改可能会丢失。",
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
      minimalistMode: {
        label: "极简模式",
        description: "开启后隐藏时间、壁纸和快捷方式"
      },
      freshMode: {
        label: "清爽模式",
        description: "将设置与我的图标移至右上角，隐藏时间/天气/壁纸，仅保留搜索和快捷方式"
      },
      newTabMode: {
        label: "新标签页打开",
        description: "快捷方式默认在新标签页中打开"
      },
      timeFormat: {
        label: "24 小时制",
        description: "使用 24 小时制显示时间"
      },
      showSeconds: {
        label: "显示秒数",
        description: "在时间组件中显示秒数"
      },
      showTime: {
        label: "显示时间",
        description: "在页面中显示时间组件"
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
          syncModeLabel: "同步方式（二选一）",
          syncOnChangeLabel: "有改动就自动同步",
          syncOnChangeDesc: "每次你改动本地数据后，自动尝试同步到 WebDAV",
          syncByScheduleLabel: "定时自动同步",
          syncByScheduleDesc: "按固定时间间隔自动同步，适合长期开着页面",
          syncIntervalLabel: "同步间隔",
          syncIntervalMinutes: "{{count}} 分钟",
          enabledLabel: "开启 WebDAV 同步",
          enabledDesc: "关闭后将暂停 WebDAV 自动与手动同步",
          providerCustom: "自定义服务",
          providerLabel: "WebDAV 服务商",
          providerPlaceholder: "选择服务商",
          conflictPolicyLabel: "冲突时怎么处理",
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
          policyChangeSyncTriggered: "冲突策略已切换，已按当前策略同步一次",
          intervalChangeSyncTriggered: "同步间隔已调整，已立即同步一次",
          disableWebdavBeforeCloudLogin: "当前已开启 WebDAV 同步，请先关闭 WebDAV 同步后再登录云同步",
          logoutRequiredForWebdav: "当前已登录云同步，请先退出登录后再开启 WebDAV 同步",
          disableConfirmTitle: "关闭 WebDAV 同步",
          disableConfirmDesc: "确定要关闭 WebDAV 同步吗？关闭后仅保留本地数据。",
          clearLocalLabel: "清除本地数据并恢复初始",
          clearLocalDesc: "将本地快捷方式恢复为角色初始配置",
          urlRequired: "请先填写 WebDAV 地址",
          defaultProfileName: "默认配置",
          configured: "已配置，可同步到 WebDAV",
          disabled: "已关闭，WebDAV 同步已停用",
          notConfigured: "未配置，请先填写 WebDAV 信息",
          lastSyncAt: "上次同步时间",
          notSynced: "未同步",
          justSynced: "刚刚同步",
          minutesAgo: "{{count}} 分钟前",
          hoursAgo: "{{count}} 小时前",
          lastAttemptFailed: "最近尝试同步失败",
          scheduleRunning: "定时同步运行中",
          nextSyncAtLabel: "下次同步：{{time}}",
          syncDisabled: "请先开启 WebDAV 同步"
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
        modalDesc: "为了提供更好的图标适配服务，我们希望收集您添加的快捷方式的域名（例如 google.com）。数据完全匿名，不包含任何个人隐私或完整网址。",
        agree: "同意并开启",
        disagree: "不同意",
        confirmClose: "关闭后将无法优先获得图标适配服务，是否确认关闭？",
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
        domainsUnique: "收集域名数",
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
        content: "LeafTab 是一款浏览器新标签页插件。\n它提供简洁美观的起始页体验，支持快捷方式管理、壁纸/天气展示，以及云同步与 WebDAV 同步等能力。",
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
      items: {
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
      wallpaper: {
        mode: "壁纸模式",
        modeDesc: "自定义极简模式背景",
        bing: "每日Bing壁纸",
        weather: "天气壁纸",
        custom: "自定义壁纸",
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
        imageSupport: "支持 JPG, PNG, WEBP 格式"
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
      confirm: "确定",
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
      logoutOfflineWarning: "当前处于离线状态或有未同步的更改，退出登录将导致未保存的数据丢失。确定要退出吗？"
    },
    search: {
      placeholder: "搜索你想找的内容...",
      placeholderDynamic: "搜索你想找的内容或输入网址...",
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
      addPage: "新建页面",
      move: "移动到",
      newShortcut: "新建快捷方式",
      pinToTop: "置顶",
      movePrevPage: "移动到上一页",
      moveNextPage: "移动到下一页",
      moveToPage: "移动到指定页…",
      moveToPageDesc: "选择目标页"
    },
    pageDelete: {
      title: "删除页面",
      description: "确定要删除当前页面吗？此操作会删除该页下的所有快捷方式。"
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
        fillAllDesc: "请输入快捷方式标题和链接地址"
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
      stepLayoutDesc: "确定首页展示的排布方式"
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
      useCloud: "以云端为准",
      useLocal: "以本地为准"
    },
    syncUndo: {
      message: "已使用{{chosen}}配置，已备份{{backup}}配置，可在 {{seconds}} 秒内撤销。",
      undo: "撤销",
      undone: "已撤销同步选择",
      backupToast: "已自动备份{{backup}}配置"
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
        deleted: "已删除情景模式"
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
