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
            description: "支援 !g / !b / !d / !bd 等前綴暫時切換引擎",
            tooltip: "例如輸入 !g AI，會暫時使用 Google 搜尋 AI，不會改變預設引擎。"
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
          },
          rotatingPlaceholder: {
            label: "搜尋框提示輪播",
            description: "讓搜尋框提示自動切換\n關閉後固定顯示預設提示",
            tooltip: "關閉後，搜尋框只會固定顯示「想找什麼？直接輸入，網址也可以」這一條提示。"
          },
          position: {
            label: "搜尋框位置",
            description: "選擇搜尋框顯示在捷徑區域的上方或下方",
            tooltip: "切換後會立即生效，並記住你目前選擇的位置。",
            top: "上方",
            bottom: "下方"
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
        rhythmDesc: "僅保留搜尋與捷徑"
      },
      shortcutsLayout: {
        label: "捷徑密度",
        description: "調整每列顯示的捷徑數量",
        set: "設定",
        select: "選擇"
      },
      shortcutsStyle: {
        label: "捷徑版面",
        entryDescription: "設定網格列數與名稱顯示方式",
        open: "開啟",
        title: "捷徑版面設定",
        description: "設定單頁網格的列數與捷徑名稱顯示方式",
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
        progress: {
          importPreparingTitle: "正在整理匯入資料",
          importPreparingDetail: "正在驗證備份檔內容",
          importReadingLocalTitle: "正在讀取目前本地資料",
          importReadingLocalDetail: "正在準備合併匯入內容",
          importWritingLocalTitle: "正在寫入本地資料",
          importWritingLocalDetail: "正在將匯入資料套用到此裝置",
          importMergingTitle: "正在合併匯入資料",
          importMergingDetail: "正在對齊捷徑與書籤的最新狀態",
          importSyncingTitle: "正在同步匯入結果",
          importSyncingDetail: "正在將最新資料寫回雲端",
          importLongTaskTitle: "正在匯入資料",
          importLongTaskDetail: "正在寫入本地資料，請稍候",

          exportLongTaskTitle: "正在匯出資料",
          exportLongTaskDetail: "正在準備捷徑與書籤內容",
          exportReadingLocalTitle: "正在讀取本地資料",
          exportReadingLocalDetail: "正在收集此裝置上的捷徑與書籤",
          exportAssemblingTitle: "正在整理匯出內容",
          exportAssemblingDetail: "正在組裝 LeafTab 備份檔",
          exportGeneratingTitle: "正在產生匯出檔案",
          exportGeneratingDetail: "馬上就可以儲存到本地",

          cloudBackupLongTaskTitle: "正在備份雲端目前資料",
          cloudBackupLongTaskDetail: "匯入前會先保存一份目前帳號的雲端副本",
          cloudBackupReadingTitle: "正在讀取雲端目前資料",
          cloudBackupReadingDetail: "正在產生匯入前備份，避免誤覆蓋",
          cloudBackupImportingTitle: "正在匯入備份資料",
          cloudBackupImportingDetail: "正在將你選擇的資料寫入此裝置",
        },
        webdav: {
          entry: "WebDAV 同步",
          entryDesc: "設定 WebDAV 遠端備份與還原",
          configure: "設定",
          providers: {
            jianguoyun: "堅果雲",
          },
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
          disableWebdavBeforeCloudLogin: "目前已啟用 WebDAV 同步，請先停用 WebDAV 同步後再登入雲同步",
          disableWebdavBeforeCloudManage: "目前已啟用 WebDAV 同步，請先停用 WebDAV 同步後再管理雲同步",
          disableCloudBeforeWebdavEnable: "目前已登入雲同步，請先登出雲同步後再啟用 WebDAV 同步",
          disableCloudBeforeWebdavConfig: "目前已啟用雲同步，請先停用雲同步後再設定 WebDAV 同步",
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
        versionLabel: "版本 v{{version}}",
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
        release144TranslationPromptFix: "修復每次打開 LeafTab 都可能出現「是否翻譯此介面」的瀏覽器翻譯提示。",
        release144AboutQqGroup: "關於 LeafTab 彈窗新增交流 QQ 群號，方便回饋與交流。",
        release144ReadmeCommunityEntry: "README 補充社群交流入口，並同步整理 1.4.4 發佈資訊。",
        release143SyncFlowAlignment: "對齊雲端同步與 WebDAV 同步邏輯，在書籤差異風險較高時仍可繼續同步捷徑與設定。",
        release143WebdavProviderPolish: "WebDAV 新增堅果雲內建服務商，並補齊切換服務商、授權、密鑰校驗與首次同步流程。",
        release143SyncStatusPolish: "優化同步中心狀態、同步範圍文案與錯誤處理，減少誤報失敗或狀態不同步。",
        release142BookmarkSyncDecoupling: "修復書籤同步與捷徑/設定同步解耦問題。",
        release142DangerousSyncDialogPolish: "優化書籤同步風險攔截彈窗與提示文案。",
        release142SyncTestingBackupNotice: "資料同步仍處於測試階段，建議先備份再開啟。",
        release130DynamicEffectsOptimize: "優化全域動態效果體驗，新增「減弱動態效果」開關並統一動畫降級策略。",
        release130DynamicWallpaperTab: "新增「靈動」動態桌布分類，支援 Prism、Silk、Light Rays、Beams、Galaxy、Iridescence 預覽與套用。",
        release130ManualWeatherCity: "天氣功能支援手動選擇城市並持久保存，定位與顯示更可控。",
        release129ModeUiRefactor: "重構「節奏 / 留白」兩種模式主介面，拆分共用元件並清理歷史冗餘程式碼。",
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
      imageAlt: "LeafTab 更新",
      badge: "新版本 v{{version}}",
      later: "稍後再說",
      ignoreThisVersion: "忽略此版本",
      downloadFromGithub: "前往 GitHub 下載",
      openRelease: "前往 GitHub 下載",
      sampleNote1: "統一雲同步與 WebDAV 同步設定項互動",
      sampleNote2: "新增自動更新提示彈窗，可直達 GitHub Release",
      sampleNote3: "優化更新日誌彈窗排版層級"
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
      wallpaper: {
        colorPresets: {
          "aurora-blush": "極光粉霧",
          "mist-lilac": "晨霧紫",
          "mint-breeze": "薄荷風",
          "peach-cloud": "蜜桃雲",
          "glacier-milk": "冰川奶藍",
          "rose-water": "玫瑰水",
          "sage-cream": "鼠尾奶綠",
          "dawn-sand": "晨砂",
          "lavender-snow": "薰衣雪",
          "ocean-haze": "海霧",
          "camellia-silk": "山茶絹",
          "tea-ivory": "茶米白"
        }
      },
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
      placeholderHintPrefix: "想用 Google 搜？先輸入 !g，再空一格後輸入內容",
      enterKey: "Enter",
      actionOpen: "開啟",
      actionClose: "關閉",
      actionSelect: "選擇",
      authorizeHistoryPermission: "去授權",
      historyPermissionBanner: "授權後可顯示瀏覽器歷史記錄",
      historyPermissionPending: "正在等待歷史記錄權限確認...",
      historyPreparing: "正在載入瀏覽器歷史記錄...",
      bookmarksPermissionBanner: "授權後可搜尋瀏覽器書籤",
      bookmarksPermissionPending: "正在等待書籤權限確認...",
      bookmarksPreparing: "正在整理書籤，請稍候...",
      tabsPermissionBanner: "授權後可搜尋已開啟分頁",
      tabsPermissionPending: "正在等待分頁權限確認...",
      tabsPreparing: "正在整理已開啟分頁，請稍候...",
      permissionHistoryDenied: "未授予歷史記錄權限，你可以在下拉面板頂部再次授權。",
      permissionBookmarksDenied: "未授予書籤權限，下次使用 /b 時可以再次申請。",
      permissionTabsDenied: "未授予分頁權限，下次使用 /t 時可以再次申請。",
      permissionRequestFailed: "權限申請失敗，請重試。",
      noBookmarks: "沒有找到相符的書籤",
      noTabs: "沒有找到相符的分頁",
      currentTabLabel: "目前分頁",
      systemEngine: "系統預設",
      useEngineSearch: "使用{{engine}} 搜尋",
      prefixEngineInlineHint: "使用{{engine}}搜尋",
      historyTitle: "搜尋歷史",
      clearHistory: "清空",
      noHistory: "暫無搜尋記錄",
      remoteSuggestionSource: "搜尋建議",
      justNow: "剛剛",
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
      pinToTop: "置頂",
      pinTop: "置頂已選",
      pinBottom: "置底已選",
      select: "選擇",
      unselect: "取消選擇",
      selectedCount: "已選 {{count}} 項",
      deleteSelected: "刪除已選",
      moveToScenario: "移動到情景模式",
      noScenarioTarget: "暫無可移動的目標情景模式",
      selectBeforeMove: "請先選擇捷徑",
      multiSelect: "多選",
      cancelMultiSelect: "退出多選"
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
      icon: {
        modeGroup: "圖示來源",
        modeOfficialShort: "系統",
        modeFaviconShort: "網路",
        modeLetterShort: "文字",
        modeCustomShort: "自訂",
        modeCustomReplaceShort: "更改",
        modeCustomLoadingShort: "處理中",
        autoOfficial: "支援後自動切換官方圖示",
        officialUnavailable: "這個捷徑目前還沒有官方圖示",
        networkHint: "網路圖示可能載入失敗，失敗時會自動退回文字圖示",
        customFileInvalid: "這張圖片暫時無法作為圖示，請換一張試試"
      },
      errors: {
        fillAll: "請填寫完整資訊",
        fillAllDesc: "請輸入捷徑標題和連結地址",
        duplicateUrl: "此網站已存在捷徑",
        duplicateUrlDesc: "同一網站僅保留一個捷徑，請確認網址後再試"
      }
    },
    popupShortcut: {
      title: "新增目前頁面",
      loading: "正在讀取目前分頁資訊…",
      unsupported: "目前頁面不是可直接儲存的網站連結，請改成 http 或 https 網址後再儲存。",
      targetScenario: "將儲存到「{{name}}」情境",
      ready: "已自動填入目前分頁標題與網址。",
      saved: "捷徑已儲存",
      scenarioLabel: "儲存到情境模式",
      scenarioPlaceholder: "選擇情境模式"
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
	    leaftabSyncCenter: {
      title: "同步中心",
      description: "基於 WebDAV 的同步中心，目前重點支援情景、捷徑與書籤同步。",
      bookmarkScope: "書籤同步範圍：{{scope}}",
      summary: "{{shortcuts}} 個捷徑，{{scenarios}} 個情景，{{bookmarks}} 個書籤",
      stateLabel: "狀態",
      nav: {
        syncing: "同步中",
        attention: "同步異常"
      },
      status: {
        syncing: "同步中",
        conflict: "需要處理",
        error: "同步失敗",
        ready: "就緒"
      },
      state: {
        analyzing: "正在分析同步狀態...",
        syncing: "正在背景同步",
        syncingDescription: "LeafTab 正在背景比對本地與雲端差異，並寫回需要更新的資料。畫面沒有卡住，等待完成即可。",
        initRequired: "需要初始化",
        initDescription: "本地與雲端都已經有資料，請先選擇首次初始化方式，再開啟背景同步。",
        ready: "合併同步已就緒",
        readyDescription: "新的同步引擎已可對情景、捷徑，以及瀏覽器書籤根執行推送、拉取與合併同步。"
      },
	      actions: {
	        syncing: "背景同步中..."
	      }
	    },
	    leaftabSync: {
	      provider: {
	        webdav: "WebDAV 同步",
	        cloud: "雲同步",
	        generic: "同步"
	      },
	      webdav: {
	        actions: {
	          mkcol: "建立目錄",
	          upload: "寫入",
	          download: "讀取",
	          delete: "刪除"
	        },
	        error: {
	          withPath: "WebDAV {{action}}失敗（{{status}}）：{{path}}",
	          noPath: "WebDAV {{action}}失敗（{{status}}）"
	        }
	      },
	      cloud: {
	        error: {
	          lockedTryFix: "雲同步被其他裝置鎖定，已嘗試自動修復；若仍失敗請再試一次",
	          remoteCommitChanged: "雲端資料剛剛發生變化，請重新同步一次",
	          parentCommitRequired: "雲端已有新版本，請先拉取最新資料後再覆蓋",
	          httpStatus: "雲同步失敗（{{status}}）",
	          generic: "雲同步失敗"
	        }
	      }
	    },
	    leaftabSyncRunner: {
	      progressDetailDefault: "正在背景同步，你可以繼續進行其他操作",
	      permissionTitle: "正在檢查書籤權限",
	      permissionDetail: "需要確認目前瀏覽器允許存取書籤資料",
	      bookmarksPermissionDeniedToast: "未授予書籤權限，本次僅同步捷徑與設定",
	      bookmarksPermissionDeniedToastAlt: "書籤權限未授權，目前僅同步捷徑與設定",
	      successTitle: "同步完成",
	      successToastFallback: "同步完成",
	      successDetailFallback: "本地與雲端已處理完成",
	      webdav: {
	        prepareTitle: "正在準備同步資料",
	        prepareDetail: "正在讀取本地與雲端狀態",
	        disable: {
	          title: "正在停用同步",
	          detail: "正在處理最後一次同步與關閉操作",
	          finalSyncTitle: "正在同步最後的變更",
	          closingTitle: "正在關閉同步",
	          clearingTitle: "正在清理本地資料",
	          doneTitle: "同步已停用"
	        }
	      },
	      cloud: {
	        prepareTitle: "正在準備雲同步",
	        prepareDetail: "正在讀取本地與帳號雲端狀態",
	        lockConflict: {
	          autoFixToast: "檢測到雲同步鎖衝突（409），正在自動修復後重試",
	          autoFixTitle: "檢測到舊雲端鎖，正在自動修復",
	          autoFixDetail: "正在釋放舊鎖並重新嘗試同步",
	          failedToast: "雲同步失敗（409）：目前帳號同步鎖被其他裝置占用。請關閉其他裝置同步後重試，或等待約 2 分鐘再試。"
	        },
	        commitConflict: {
	          realignTitle: "檢測到雲端版本變化，正在重新對齊狀態",
	          realignDetail: "正在等待最新狀態生效後重試"
	        }
	      }
	    },
	    leaftabSyncActions: {
	      dataDetail: {
	        withBookmarks: "正在處理捷徑與書籤資料",
	        shortcutsOnly: "正在處理捷徑資料"
	      },
	      bookmarksPermissionRequired: "未授予書籤權限，無法執行修復同步",
	      webdav: {
	        inProgress: "WebDAV 同步正在進行中，請稍候",
	        syncingTitle: "正在同步到 WebDAV",
	        repair: {
	          pullTitle: "正在用 WebDAV 覆蓋本地",
	          pushTitle: "正在用本地覆蓋 WebDAV",
	          pullSuccess: "已用 WebDAV 資料覆蓋本地",
	          pushSuccess: "已用本地資料覆蓋 WebDAV",
	          pullFailed: "WebDAV 覆蓋本地失敗",
	          pushFailed: "本地覆蓋 WebDAV 失敗"
	        }
	      },
	      cloud: {
	        inProgress: "雲同步正在進行中，請稍候",
	        syncingTitle: "正在同步到雲端",
	        repair: {
	          pullTitle: "正在用雲端覆蓋本地",
	          pushTitle: "正在用本地覆蓋雲端",
	          pullSuccess: "已用雲端資料覆蓋本地",
	          pushSuccess: "已用本地資料覆蓋雲端"
	        }
	      }
	    },
	    syncPreview: {
	      hint: {
	        local: "右側刪除線項目將在同步後從雲端刪除",
	        cloud: "左側刪除線項目將在同步後從本地刪除",
	        merge: "合併會保留兩側內容並去重（本地優先）"
	      },
	      noComparable: "未讀取到可對比的捷徑資料"
	    },
	    leaftabDangerousSync: {
	      title: "已攔截危險同步",
	      description: "偵測到書籤數量出現明顯異常，已暫停自動同步。",
	      riskDescription: "預計書籤會從 {{from}} 變成 {{to}}，可能誤刪約 {{loss}} 筆。",
	      localBookmarks: "本地書籤",
	      remoteBookmarks: "{{provider}}書籤",
	      continueWithoutBookmarks: "繼續同步捷徑與設定",
	      continueWithoutBookmarksHint: "本次不會變更書籤，只會同步捷徑與設定。",
	      deferBookmarks: "稍後處理書籤",
	      advancedActions: "進階選項",
	      useRemotePlain: "保留{{provider}}書籤（本地將被取代）",
	      useLocalPlain: "保留本地書籤（{{provider}}將被取代）",
	      toast: {
	        skipBookmarks: "本次將跳過書籤，僅同步捷徑與設定",
	        cloudBookmarksDisabled: "已啟用雲同步，並暫時關閉「同步書籤」",
	        webdavBookmarksDisabled: "已啟用 WebDAV 同步，並暫時關閉「同步書籤」"
	      }
	    },
	    leaftabSyncDialog: {
      description: "這裡單獨管理 LeafTab 的同步狀態、手動同步與 WebDAV 設定。",
      scopeDefault: "書籤",
      lastSyncEmpty: "暫無紀錄",
      lastSyncUnavailable: "未同步",
      manualSyncOnly: "目前僅手動同步",
      autoSyncOn: "自動同步已開啟",
      enableSync: "啟用同步",
      repair: "修復同步",
      cloudOverwriteLocal: "雲端覆蓋本地",
      localOverwriteCloud: "本地覆蓋雲端",
      remoteOverwriteLocal: "WebDAV 覆蓋本地",
      localOverwriteRemote: "本地覆蓋 WebDAV",
      tabs: {
        cloud: "雲同步",
        webdav: "WebDAV 同步"
      },
      metrics: {
        localShortcuts: "本地捷徑",
        localBookmarks: "本地書籤",
        remoteShortcuts: "雲端捷徑",
        remoteBookmarks: "雲端書籤"
      },
      details: {
        lastSync: "上次同步",
        nextSync: "下次同步",
        scope: "同步範圍"
      },
      cloud: {
        bookmarkSyncDisabledBanner: "未開啟書籤同步，目前只會同步捷徑與設定。",
        enableBookmarkSyncAction: "去開啟",
        connectedFallback: "LeafTab 帳號",
        unsignedTitle: "未登入",
        unsignedSubtitle: "登入以同步資料",
        loginToStart: "登入後設定",
        signedOut: "未登入",
        connectedSubtitle: "已登入，可同步 LeafTab 資料",
        disabledSubtitle: "已登入，可在雲同步設定中開啟同步",
        openSettingsToEnable: "前往開啟",
        ready: "已連線",
        disabled: "未啟用",
        error: "同步失敗",
        enableViaSettings: "前往開啟同步",
        manage: "管理雲同步",
        scopeRich: "捷徑、{{scope}}",
        scopeShortcutsOnly: "僅捷徑與設定"
      },
      webdav: {
        connectedFallback: "WebDAV",
        unconfiguredTitle: "WebDAV 未開啟",
        unconfiguredSubtitle: "未配置，先去配置",
        enabledSubtitle: "已配置，可同步到 WebDAV",
        disabledSubtitle: "已配置，尚未啟用同步",
        configureToStart: "配置後設定",
        enableToStart: "已配置，待啟用",
        scopeWithLabel: "捷徑、{{scope}}"
      }
    },
	    leaftabSyncEncryption: {
      cloudNotEnabledTitle: "當前未開啟雲同步",
      cloudNotEnabledPill: "未開啟",
      webdavNotEnabledTitle: "當前未開啟 WebDAV 同步",
      webdavNotEnabledPill: "未開啟",
      statusReadyTitle: "端到端加密已開啟",
      statusMissingTitle: "同步口令尚未設定",
      statusReadyPill: "已保護",
      statusMissingPill: "未設定",
      setupTitle: "設定同步口令",
      unlockTitle: "輸入同步口令",
      setupDescription: "為 {{provider}} 設定端到端加密口令。伺服器無法查看你的同步內容，也無法幫你找回這個口令。",
      unlockDescription: "請輸入 {{provider}} 的同步口令以解鎖雲端密文資料。",
      setupConfirm: "儲存口令",
      unlockConfirm: "解鎖同步",
      e2eeSetupDescription: "你的資料會先在本地加密，再上傳到雲端或 WebDAV。只有輸入這組同步口令的裝置，才能解鎖並讀取同步內容。",
      e2eeUnlockDescription: "同步資料在雲端保存的是加密內容。輸入正確的同步口令後，當前裝置才能在本地解鎖並讀取這些資料。",
      passphraseLabel: "同步口令",
      passphrasePlaceholder: "至少 8 位，建議包含字母與數字",
      passphraseHint: "這是同步專用口令，不是帳號登入密碼。",
      confirmLabel: "再次輸入口令",
      confirmPlaceholder: "再次輸入用於確認",
      setupChecklistTitle: "繼續前請確認以下事項",
      checklist: {
        serverCannotAccess: "我們不保存這組同步口令，也無法看到你加密後的同步內容。",
        cannotRecover: "忘記這組同步口令後，已有加密同步資料將無法恢復。",
        newDeviceUnlock: "更換裝置或清除本地資料後，需要重新輸入這組同步口令。"
      },
	      deviceUnlockDescription: "當前裝置解鎖後，後續同步無需重複輸入。",
	      errors: {
	        missingMetadata: "缺少同步加密中繼資料",
	        incorrectPassphrase: "同步口令不正確",
	        invalidConfig: "同步加密設定無效"
	      },
	      toast: {
	        saved: "同步口令已儲存",
	        unlocked: "同步資料已解鎖",
	        saveFailed: "儲存同步口令失敗"
	      }
	    },
	    leaftabFirstSync: {
      title: "初始化同步",
      description: "選擇第一次 LeafTab 同步時，應該如何處理目前瀏覽器書籤、本地 LeafTab 資料與雲端資料。",
      recommended: "推薦",
      processingBadge: "處理中",
      processingInline: "正在背景執行初始化同步，請稍候...",
      processingFooter: "正在背景初始化同步，請不要關閉目前視窗。完成後會自動回到正常同步狀態。",
      footer: "這一步只會在首次同步時出現。初始化完成後，LeafTab 將進入基於合併的新同步模式。",
      bookmarkScopeDescription: "書籤會直接以真實瀏覽器根目錄為同步對象，不再額外複製一份。當前同步範圍：{{scope}}。",
      choice: {
        push: {
          title: "上傳本地資料",
          description: "以目前裝置為準，將現在的 LeafTab 資料與瀏覽器書籤寫入 WebDAV。"
        },
        pull: {
          title: "下載雲端資料",
          description: "用 WebDAV 上最新的遠端快照覆蓋目前本地 LeafTab 資料與瀏覽器書籤。"
        },
        merge: {
          title: "智慧合併",
          description: "合併本地與雲端資料，保留雙方各自獨有的 LeafTab 資料與瀏覽器書籤，並自動處理多數衝突。"
        }
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
