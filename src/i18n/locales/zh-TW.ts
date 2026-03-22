export default {
  translation: {
    logoutConfirm: {
      title: "登出",
      description: "確定要登出嗎？尚未同步的本地變更可能會遺失。",
      clearLocalLabel: "清除本地資料並恢復初始",
      clearLocalDesc: "將本地捷徑恢復為所選角色的初始配置",
      confirm: "登出",
      cancel: "取消"
    },
    settings: {
      title: "設定",
      profile: {
        loggedInDesc: "已登入",
        daysActive: "活躍天數",
        shortcutsCount: "捷徑數量",
        guest: "訪客",
        guestDesc: "登入以同步資料"
      },
      newTabMode: {
        label: "新分頁開啟",
        description: "捷徑預設在新分頁中開啟"
      },
      searchEngineTabSwitch: {
        label: "Tab 切換搜尋引擎",
        description: "聚焦搜尋框時，按 Tab 可在搜尋引擎間循環切換"
      },
      searchSettings: {
        label: "搜尋設定",
        description: "管理搜尋行為與快捷能力開關",
        open: "開啟",
        title: "搜尋設定",
        items: {
          tabSwitch: {
            label: "Tab 切換搜尋引擎",
            description: "聚焦搜尋框時，按 Tab 可在搜尋引擎間循環切換",
            tooltip: "開啟後，搜尋框聚焦時可用 Tab 或 Shift+Tab 快速切換搜尋引擎。"
          },
          prefix: {
            label: "Prefix 搜尋",
            description: "支援 g / bing / ddg / bd 等前綴暫時切換引擎",
            tooltip: "例如輸入 g AI，會暫時使用 Google 搜尋 AI，不會改變預設引擎。"
          },
          siteDirect: {
            label: "站點直達搜尋",
            description: "輸入「站點 + 關鍵字」，優先開啟該站點搜尋結果",
            tooltip: "支援 GitHub、GitLab、Gitee、知乎、B 站、YouTube、Google、Bing、百度、Wikipedia、Reddit、Amazon 等站點。示例：github react。"
          },
          siteShortcut: {
            label: "站點快捷建議",
            description: "輸入站點名稱時，優先顯示內建站點快捷建議",
            tooltip: "例如輸入 git，可優先顯示 GitHub / GitLab / Gitee。"
          },
          anyKeyCapture: {
            label: "任意鍵直接搜尋",
            description: "開啟新分頁後，直接輸入即可喚起搜尋框",
            tooltip: "開啟後，在頁面空白處輸入字元會自動聚焦搜尋框並寫入內容。"
          },
          calculator: {
            label: "計算器預覽",
            description: "輸入算式時顯示即時計算結果建議",
            tooltip: "例如輸入 12*8，會在下拉建議中顯示結果。"
          }
        }
      },
      timeFormat: {
        label: "24 小時制",
        description: "使用 24 小時制顯示時間"
      },
      showSeconds: {
        label: "顯示秒數",
        description: "在時間組件中顯示秒數"
      },
      visualEffectsLevel: {
        label: "流暢度檔位",
        description: "依裝置效能選擇動效強度",
        low: "低",
        medium: "中",
        high: "高"
      },
      showTime: {
        label: "顯示時間",
        description: "在頁面上顯示時間"
      },
      timeFont: {
        title: "時間字體",
        description: "選擇時間顯示使用的字體"
      },
      autoFocusSearch: {
        label: "自動聚焦搜尋框",
        description: "進入頁面時自動將光標聚焦在搜尋框"
      },
      language: {
        label: "語言",
        description: "選擇介面顯示語言",
        selectPlaceholder: "選擇語言"
      },
      theme: {
        label: "主題",
        description: "切換淺色/深色主題，或跟隨系統自動切換",
        selectPlaceholder: "選擇主題",
        system: "跟隨系統",
        light: "淺色",
        dark: "深色"
      },
      accentColor: {
        label: "主題色",
        description: "選擇應用的主色調"
      },
      accent: {
        dynamic: "動態",
        mono: "黑白",
        green: "綠色",
        blue: "藍色",
        purple: "紫色",
        orange: "橘色",
        pink: "粉色",
        red: "紅色"
      },
      displayMode: {
        title: "版面模式",
        description: "選擇頁面顯示風格",
        blank: "留白",
        blankDesc: "隱藏時間、桌布與捷徑",
        rhythm: "節奏",
        rhythmDesc: "僅保留搜尋與捷徑",
        panoramic: "全景",
        panoramicDesc: "顯示時間、天氣、桌布與捷徑"
      },
      shortcutsLayout: {
        label: "捷徑密度",
        description: "調整每列顯示的捷徑數量",
        set: "設定",
        select: "選擇"
      },
      shortcutsStyle: {
        label: "捷徑樣式",
        entryDescription: "切換捷徑樣式並設定網格列數與基礎行數",
        open: "開啟",
        title: "捷徑樣式設定",
        description: "選擇捷徑樣式，並設定單頁網格的列數與基礎行數",
        rich: "豐富",
        compact: "簡約",
        showName: "顯示名稱",
        showNameDesc: "開啟後在圖示下顯示捷徑標題",
        columns: "網格列數",
        rows: "基礎行數"
      },
      backup: {
        label: "資料備份與還原",
        description: "匯入或匯出本地版面資料 (.leaftab)",
        cloudTab: "雲端同步",
        webdavTab: "WebDAV 同步",
        import: "匯入資料",
        export: "匯出資料",
        importSuccess: "資料匯入成功",
        importError: "資料匯入失敗，請檢查檔案格式",
        exportSuccess: "資料匯出成功",
        webdav: {
          entry: "WebDAV 同步",
          entryDesc: "設定 WebDAV 遠端備份與還原",
          configure: "設定",
          pull: "從雲端拉取",
          push: "推送至雲端",
          sync: "立即同步",
          url: "WebDAV 位址",
          filePath: "遠端檔案路徑",
          username: "帳號",
          password: "密碼",
          profileName: "設定名稱",
          profileNamePlaceholder: "例如：家用 NAS",
          usernamePlaceholder: "可選",
          passwordPlaceholder: "可選",
          syncByScheduleLabel: "定時自動同步",
          syncByScheduleDesc: "依固定時間間隔自動同步，適合長時間開啟頁面",
          autoSyncToastLabel: "自動同步成功提示",
          autoSyncToastDesc: "定時自動同步成功後顯示提示",
          syncIntervalLabel: "同步間隔",
          policyMerge: "盡量合併本地與雲端變更（建議）",
          policyPreferRemote: "優先保留雲端版本（本地會被覆蓋）",
          policyPreferLocal: "優先保留本地版本（會覆蓋雲端）",
          download: "從 WebDAV 拉取",
          upload: "同步到 WebDAV",
          downloading: "拉取中...",
          uploading: "同步中...",
          downloadSuccess: "WebDAV 拉取成功",
          uploadSuccess: "WebDAV 同步成功",
          downloadError: "WebDAV 拉取失敗，請檢查設定",
          uploadError: "WebDAV 同步失敗，請檢查設定",
          syncSuccess: "同步完成",
          syncError: "同步失敗，請檢查設定",
          authFailed: "WebDAV 驗證失敗，請檢查帳號或密碼",
          policyChangeSyncTriggered: "衝突策略已切換，已依目前策略同步一次",
          intervalChangeSyncTriggered: "同步間隔已調整，已立即同步一次",
          urlRequired: "請先填寫 WebDAV 位址",
          defaultProfileName: "預設設定",
          configured: "已設定，可同步到 WebDAV",
          notConfigured: "未設定，請先填寫 WebDAV 資訊",
          disabled: "已關閉，WebDAV 同步已停用",
          lastSyncAt: "上次同步時間",
          notSynced: "未同步",
          justSynced: "剛剛已同步",
          minutesAgo: "{{count}} 分鐘前同步",
          hoursAgo: "{{count}} 小時前同步",
          lastAttemptFailed: "最近一次同步嘗試失敗",
          scheduleRunning: "定時同步執行中",
          nextSyncAtLabel: "下次同步：{{time}}",
          syncDisabled: "請先啟用 WebDAV 同步"
        }
      },
      changelog: {
        title: "更新日誌",
        description: "查看最近的功能與體驗更新",
        open: "查看更新日誌"
      },
      privacyPolicy: "隱私權政策",
      copyright: "保留所有權利。",
      specialThanks: "特別感謝測試人員：yanshuai、Horang、Mling",
      iconAssistant: {
        title: "發送匿名使用統計",
        desc: "幫助我們優化圖標適配（僅發送網域，不含個人資訊）",
        modalTitle: "幫助改進 LeafTab",
        modalDesc: "為了提供更好的圖標適配服務，我們希望收集您新增的捷徑的網域（例如 google.com）。數據完全匿名，不包含任何個人隱私或完整網址。",
        agree: "同意並開啟",
        disagree: "不同意",
        adminKeyLabel: "管理員密鑰",
        adminKeyDesc: "用於匯出全站收集到的網域清單（僅站長/自託管營運者使用）",
        adminKeyPlaceholder: "輸入管理員密鑰",
        adminKeySave: "儲存",
        adminKeyClear: "清除",
        adminKeySaved: "管理員密鑰已儲存",
        adminKeyCleared: "管理員密鑰已清除",
        adminKeyRequired: "需要管理員密鑰",
        adminKeyInvalid: "管理員密鑰無效或無權限",
        confirmClose: "關閉後將無法優先獲得圖標適配服務，是否確認關閉？",
        downloadTitle: "下載已收集的網域清單",
        downloadDesc: "僅網域、去重、排除已有圖標（同一品牌合併）",
        downloadButton: "下載清單",
        reportNow: "立即上報",
        reportTriggered: "已觸發上報（可能受限頻影響）",
        queueStatus: "待上報：{{count}}，上次上報：{{last}}",
        downloadSuccess: "已下載網域清單",
        downloadFailed: "下載失敗，請稍後重試"
      },
      adminMode: {
        tapRemaining: "再點擊{{count}}次進入管理員模式",
        enabled: "您已進入管理員模式",
        alreadyEnabled: "您已處於管理員模式",
        disabled: "管理員模式已關閉",
        switchLabel: "管理員模式",
        switchDesc: "開啟後可設定管理員密鑰並匯出全站網域清單",
        open: "開啟"
      },
      adminPanel: {
        statsTitle: "平台統計",
        statsDesc: "僅顯示非敏感彙總資料",
        refresh: "重新整理",
        loading: "載入中...",
        statsLoadFailed: "統計載入失敗",
        enableHint: "請先在設定中連點版本號開啟管理員模式",
        usersTotal: "註冊使用者",
        domainsUnique: "收集網域數",
        weatherDebugLabel: "天氣除錯",
        weatherDebugDesc: "顯示天氣除錯面板（僅本次會話）"
      },
      about: {
        label: "關於 LeafTab",
        desc: "查看版本資訊與外掛簡介",
        open: "開啟",
        title: "關於 LeafTab",
        content: "LeafTab 是一款瀏覽器新分頁外掛。\n提供簡潔美觀的起始頁體驗，支援捷徑管理、桌布/天氣展示，以及雲端同步與 WebDAV 同步等功能。",
        ackTitle: "致謝與開源聲明",
        ackDesc: "LeafTab 使用了以下開源函式庫與資源（點擊可開啟）：",
        frontend: "前端",
        backend: "後端",
        resources: "圖示與資源"
      }
    },
    changelog: {
      title: "更新日誌",
      description: "最近版本更新",
      version: "版本",
      date: "日期",
      items: {
        release130DynamicEffectsOptimize: "優化全域動態效果體驗，新增「減弱動態效果」開關並統一動畫降級策略。",
        release130DynamicWallpaperTab: "新增「靈動」動態桌布分類，支援 Prism、Silk、Light Rays、Beams、Galaxy、Iridescence 預覽與套用。",
        release130ManualWeatherCity: "天氣功能支援手動選擇城市並持久保存，定位與顯示更可控。",
        release129ModeUiRefactor: "重構「全景 / 節奏 / 留白」三種模式主介面，拆分共用元件並清理歷史冗餘程式碼。",
        release129WallpaperModalRefine: "桌布設定彈窗重構為 Bing / 天氣 / 顏色 / 自訂四分頁，互動與布局統一。",
        release129ColorWallpaperGradients: "新增顏色桌布（12 組可選漸層），並優化漸層強度、色卡圓角與預覽視覺。",
        release129MaskSliderByMode: "新增桌布遮罩透明度滑桿（0-100），僅在目前啟用的桌布類型顯示且懸停出現。",
        release129ContrastAndOpacityTune: "優化節奏/留白模式可讀性：四角模組預設半透明、捷徑文字陰影增強、淺色下關鍵文字固定白色。",
        release128ShortcutStyleDialog: "新增捷徑樣式設定彈窗：支援「豐富 / 簡約」兩種卡片樣式切換。",
        release128CompactLayoutRefine: "簡約捷徑布局優化為 9 欄貼邊排列，並統一網格間距表現。",
        release128CompactHoverOnlyIcon: "簡約卡片懸停互動改為僅圖示放大，不再出現背景高亮或擠壓抖動。",
        release128EmptyIconFallback: "捷徑圖示新增 emptyicon 兜底：無圖示時顯示標題首字；新增/編輯彈窗預覽同步該樣式。",
        release128IgnoreFakeFavicons: "圖示解析新增無效兜底來源過濾（DuckDuckGo / Google / gstatic favicon），避免錯誤占位圖示。",
        release127CaptchaSessionFix: "修復線上註冊驗證碼頻繁誤判：確保驗證碼產生與註冊校驗使用同一會話。",
        release127ProxyCookieDefaults: "優化生產環境會話預設（代理信任 + Cookie 策略），提升擴充到後端的會話穩定性。",
        release127FirstLoginLocalFirst: "新使用者首次登入不再彈出同步衝突視窗，直接以本地資料優先同步到雲端。",
        release127DeployScriptLibUpload: "修復後端部署腳本未上傳 server/lib 的問題，並強化部署環境變數預設補齊。",
        release126UnifiedCompareDialog: "雲端登入衝突檢測流程與 WebDAV 統一，直接進入大型對比彈窗。",
        release126ConflictStrategyTabs: "衝突處理改為頂部 Tab 切換「以雲端為準 / 以本地為準 / 合併」。",
        release126ConflictPendingPersist: "關閉衝突彈窗或重新整理頁面後，未處理衝突會保留並自動恢復。",
        release126ConflictFreezeAutoSync: "存在未處理衝突時自動同步會暫停，確認處理後自動恢復。",
        release126CompareUiRefine: "大型對比彈窗明細區視覺精簡：移除每項外層容器，並採用與設定頁一致的 Tab 樣式。",
        release125ImportLocalFirstSync: "登入狀態下匯入本地資料後，確認匯入即立即同步到雲端（本地優先）。",
        release125ManualCloudLocalFirst: "雲端同步開啟時，手動「立即同步」不再彈出衝突檢測，直接以本地資料覆蓋雲端。",
        release125SyncSettingsUi: "雲端同步與 WebDAV 同步設定彈窗優化：兩個開關移除容器包裹並調整順序。",
        release125WebdavCorsPermission: "WebDAV 同步新增擴充背景代理與按網域動態權限申請（保留 http/https），提升跨域相容性。",
        release125WebdavAuthHint: "WebDAV 新增認證錯誤識別：帳號或密碼錯誤（401/403）將給出明確提示。",
        release124UpdateNotice: "新增社群版 GitHub 新版本檢測與更新提示彈窗，支援直達 Release 下載。",
        release124Snooze24h: "更新提示新增「稍後再說」24 小時冷卻策略，避免頻繁打擾使用者。",
        release124ChangelogEntry: "更新日誌彈窗新增 1.2.4 條目並補充多語言文案。",
        release124ReleasePackaging: "新增標準發佈打包腳本，生成的 zip 根目錄直接包含 manifest.json。",
        release124FirefoxCompat: "修復 Firefox 商店包結構問題並調整 manifest 相容設定。",
        release123WebdavAccessDialog: "WebDAV「開啟同步」改為專用接入彈窗，樣式與登入彈窗一致",
        release123UnifiedSyncSettings: "雲端同步與 WebDAV 同步設定項統一，移除衝突處理下拉項",
        release123AutoSyncToggles: "新增「自動同步開關」與「自動同步成功提示開關」，並支援關閉後禁用間隔滑桿",
        release123ProviderLabel: "WebDAV 卡片標題改為顯示服務商名稱（不再顯示「預設設定」）",
        release123PasswordToggle: "登入/註冊密碼輸入框新增顯示/隱藏密碼按鈕",
        release122Scrollbar: "關於 LeafTab 彈窗捲動條改為與設定彈窗一致",
        release122WelcomePersist: "首次註冊登入引導彈窗狀態支援本地+雲端持久化，重新整理不再閃爍",
        release122RateLimitToast: "修復 429 限流提示未顯示問題，並統一提示樣式",
        release122WebdavSchedule: "WebDAV 定時同步改為系統時間基準，顯示下次同步時間並在關鍵設定變更後立即同步",
        release122CustomServer: "支援切換自訂雲端同步伺服器",
        release122CustomIconSource: "支援自訂圖示來源",
        release122OnlineIconSource: "圖示來源改為線上取得（GitHub Pages）",
        release122DynamicAccent: "新增動態取色主題色",
        release121Webdav: "新增 WebDAV 同步功能",
        release121Ui: "優化 UI 樣式",
        release121Fixes: "修復了一些 bug",
        grid: "底部捷徑重寫為扁平網格",
        carousel: "新增滑動分頁與滑鼠滾輪翻頁",
        entrance: "桌布、搜尋、捷徑的入場動畫優化",
        dots: "分頁圓點居中與樣式優化"
      }
    },
    updateNotice: {
      title: "發現新版本 {{version}}",
      description: "GitHub 上有新版本可用，建議下載更新。",
      currentVersion: "目前版本",
      latestVersion: "最新版本",
      publishedAt: "發佈時間：{{date}}",
      changelogTitle: "本次更新內容",
      noChangelog: "此版本暫未提供詳細更新日誌。",
      later: "稍後再說",
      ignoreThisVersion: "忽略此版本",
      downloadFromGithub: "前往 GitHub 下載"
    },
    languages: {
      zh: "簡體中文",
      "zh-TW": "繁體中文",
      vi: "Tiếng Việt",
      en: "English",
      ja: "日語",
      ko: "韓語"
    },
    weather: {
      refreshing: "正在重新整理天氣和位置...",
      unknown: "未知",
      codes: {
        0: "晴",
        1: "晴",
        2: "多雲",
        3: "陰",
        45: "霧",
        52: "霧",
        53: "小雨",
        51: "小雨",
        54: "中雨",
        55: "大雨",
        56: "凍雨",
        57: "凍雨",
        58: "小雨",
        61: "小雨",
        63: "中雨",
        65: "大雨",
        66: "凍雨",
        67: "凍雨",
        71: "小雪",
        73: "中雪",
        75: "大雪",
        77: "雪粒",
        80: "陣雨",
        81: "陣雨",
        82: "暴雨",
        85: "陣雪",
        86: "陣雪",
        95: "雷陣雨",
        96: "雷陣雨伴有冰雹",
        99: "雷陣雨伴有冰雹"
      },
      defaultCity: "杭州",
      defaultWeather: "多雲",
      unknownLocation: "未知位置",
      local: "本地"
    },
    lunar: {
      label: "農曆"
    },
    common: {
      loading: "載入中...",
      cancel: "取消",
      confirm: "確定",
      delete: "刪除",
      save: "儲存",
      clear: "清空",
      back: "返回",
      more: "更多"
    },
    user: {
      loggedIn: "已登入",
      logout: "登出",
      loggedOut: "已登出"
    },
    search: {
      placeholder: "想找什麼？直接輸入就好",
      placeholderDynamic: "想找什麼？直接輸入，網址也可以",
      placeholderHintTabSwitch: "想換搜尋方式？按 Tab 試試",
      placeholderHintCalculator: "輸入 12*8 這樣也能直接算",
      placeholderHintSiteDirect: "輸入 bilibili 動畫，可直接搜 Bilibili",
      placeholderHintPrefix: "想用 Google 搜？先輸入 g，再空一格後輸入內容",
      systemEngine: "系統預設",
      useEngineSearch: "使用{{engine}} 搜尋",
      prefixEngineInlineHint: "使用{{engine}}搜尋",
      historyTitle: "搜尋歷史",
      clearHistory: "清空",
      noHistory: "暫無搜尋記錄"
    },
    groups: {
      edit: "編輯",
      addShortcut: "新建快捷方式"
    },
    context: {
      open: "開啟",
      edit: "編輯",
      copyLink: "複製連結",
      delete: "刪除",
      addShortcut: "新增捷徑",
      newShortcut: "新建捷徑",
      pinToTop: "置頂"
    },
    sidebar: {
      toggle: "切換側邊欄",
      title: "側邊欄",
      description: "顯示行動版側邊欄。"
    },
    shortcutModal: {
      addTitle: "新增捷徑",
      editTitle: "編輯捷徑",
      nameLabel: "名稱",
      namePlaceholder: "請輸入捷徑標題",
      urlLabel: "網址",
      urlPlaceholder: "請輸入網址",
      errors: {
        fillAll: "請填寫完整資訊",
        fillAllDesc: "請輸入捷徑標題和連結地址",
        duplicateUrl: "此網站已存在捷徑",
        duplicateUrlDesc: "同一網站僅保留一個捷徑，請確認網址後再試"
      }
    },
    onboarding: {
      welcome: "歡迎使用 LeafTab",
      selectRole: "選擇您的角色，開始個人化體驗",
      skip: "跳過",
      start: "開始體驗",
      next: "下一步",
      layoutTip: "版面稍後可在設定中修改",
      stepAppearanceTitle: "設定主題與語言",
      stepAppearanceDesc: "選擇外觀與介面語言，稍後可在設定中修改",
      stepRoleTitle: "選擇你的角色",
      stepRoleDesc: "用於初始化推薦捷徑與版面",
      stepLayoutTitle: "選擇版面樣式",
      stepLayoutDesc: "決定首頁呈現的排版方式",
      stepPermissionsTitle: "授權存取權限",
      stepPermissionsDesc: "完成歷史紀錄與書籤授權後，搜尋與直達能力會更完整",
      historyPermissionTitle: "存取歷史紀錄",
      historyPermissionDesc: "授權後可在 LeafTab 中顯示最近瀏覽與相關搜尋建議",
      bookmarksPermissionTitle: "存取書籤",
      bookmarksPermissionDesc: "授權後可直接搜尋並開啟瀏覽器書籤內容",
      tabsPermissionTitle: "存取瀏覽器分頁",
      tabsPermissionDesc: "授權後可啟用分頁搜尋，並避免重複打開 LeafTab 新分頁",
      authorize: "去授權",
      authorizing: "授權中...",
      authorized: "已授權",
      unsupported: "暫不支援",
      permissionTip: "這兩項也可以稍後在使用過程中再授權，不影響先進入首頁。",
      enterHome: "進入首頁"
    },
    auth: {
      description: "登入或註冊您的帳號以儲存個人化設定。",
      tabs: { login: "登入", register: "註冊" },
      labels: { username: "使用者名稱", password: "密碼", captcha: "驗證碼" },
      placeholders: {
        usernameInput: "請輸入使用者名稱",
        passwordInput: "請輸入密碼",
        usernameSet: "設定使用者名稱",
        passwordSet: "設定密碼",
        captchaInput: "請輸入驗證碼"
      },
      tips: {
        username: "支援英文、數字、信箱格式，長度 2-32 位",
        password: "密碼長度需為 8-24 位",
        refreshCaptcha: "點擊刷新"
      },
      buttons: {
        loggingIn: "登入中...",
        login: "登入",
        registering: "註冊中...",
        register: "註冊"
      },
      toast: {
        loginSuccess: "登入成功！歡迎回來，{{username}}",
        registerSuccess: "註冊成功！請登入，{{username}}"
      },
      errors: {
        usernamePasswordRequired: "請輸入使用者名稱和密碼",
        captchaRequired: "請輸入驗證碼",
        usernameFormatInvalid: "使用者名稱格式錯誤",
        passwordLength: "密碼長度需在 8-24 位之間",
        loginFailed: "登入失敗",
        registerFailed: "註冊失敗",
        loginRequestFailed: "登入請求失敗，請檢查網路或伺服器狀態",
        registerRequestFailed: "註冊請求失敗，請檢查網路或伺服器狀態",
        userExists: "使用者名稱已存在",
        userNotFound: "使用者不存在",
        invalidPassword: "密碼錯誤",
        invalidCredentials: "使用者名稱或密碼錯誤",
        invalidUsernameFormatBackend: "使用者名稱格式錯誤（3-20位英數字底線）",
        passwordTooShort: "密碼長度不足（至少6位）",
        credentialsRequired: "請輸入使用者名稱和密碼",
        invalidCaptcha: "驗證碼錯誤",
        internalError: "伺服器內部錯誤"
      }
    },
    shortcutDelete: {
      title: "刪除捷徑",
      description: "確定要刪除這個捷徑嗎？"
    },
    syncConflict: {
      title: "同步衝突",
      description: "偵測到本地與雲端捷徑不一致，請選擇使用哪一份。",
      useCloud: "以雲端為準",
      useLocal: "以本地為準"
    },
    scenario: {
      title: "情景模式",
      defaultName: "Working mode",
      createTitle: "新建情景模式",
      createDescription: "設定名稱、顏色與圖示",
      editTitle: "編輯情景模式",
      editDescription: "修改名稱、顏色與圖示",
      nameLabel: "模式名稱",
      namePlaceholder: "請輸入模式名稱",
      colorLabel: "顏色",
      iconLabel: "圖示",
      createButton: "新建情景模式",
      addButton: "新增",
      saveButton: "儲存",
      deleteTitle: "刪除情景模式",
      deleteConfirm: "確定要刪除該情景模式嗎？刪除後將同時移除該模式下的所有群組和捷徑，且無法恢復，請謹慎操作。",
      deleteConfirmWithTarget: "確定要刪除「{{name}}」嗎？刪除後將同時移除該模式下的所有群組和捷徑，且無法恢復，請謹慎操作。",
      deleteButton: "刪除",
      toast: {
        created: "已新增情景模式",
        updated: "已更新情景模式",
        deleted: "已刪除情景模式",
        switched: "已切換到：{{name}}"
      }
    },
    toast: {
      cloudSynced: "已同步雲端配置",
      cloudAutoSyncSuccess: "雲端自動同步成功",
      cloudSyncFailed: "同步雲端配置失敗",
      syncFailed: "同步失敗",
      syncCloudApplied: "已使用雲端配置",
      syncLocalApplied: "已使用本地配置",
      linkCopied: "連結已複製",
      linkCopyFailed: "複製連結失敗",
      loadedFromCache: "已載入本地快取（離線模式）",
      sessionExpired: "會話已過期，請重新登入"
    }
  }
};
