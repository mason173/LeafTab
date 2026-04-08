export default {
  translation: {
    logoutConfirm: {
      title: "ログアウト",
      description: "ログアウトしますか？未同期のローカル変更が失われる可能性があります。",
      clearLocalLabel: "ローカルデータを消去して初期状態に戻す",
      clearLocalDesc: "ローカルのショートカットを選択したロールの初期設定に戻します",
      confirm: "ログアウト",
      cancel: "キャンセル"
    },
    settings: {
      title: "設定",
      profile: {
        loggedInDesc: "ログイン中",
        daysActive: "利用日数",
        shortcutsCount: "ショートカット数",
        guest: "ゲスト",
        guestDesc: "ログインしてデータを同期"
      },
      newTabMode: {
        label: "新しいタブで開く",
        description: "ショートカットをデフォルトで新しいタブで開く"
      },
      searchEngineTabSwitch: {
        label: "Tabで検索エンジン切替",
        description: "検索ボックスにフォーカス中、Tabキーで検索エンジンを順番に切り替えます"
      },
      searchSettings: {
        label: "検索設定",
        description: "検索動作と検索機能のオン/オフを管理",
        open: "開く",
        title: "検索設定",
        items: {
          tabSwitch: {
            label: "Tabで検索エンジン切替",
            description: "検索ボックスにフォーカス中、Tabでエンジンを切り替えます",
            tooltip: "検索ボックスがフォーカス中のとき、Tab / Shift+Tab で検索エンジンを順番に切り替えます。"
          },
          prefix: {
            label: "Prefix 検索",
            description: "g / bing / ddg / bd などで一時的にエンジンを指定",
            tooltip: "例: `g AI` と入力すると、その検索だけ Google を使用します。"
          },
          siteDirect: {
            label: "サイト直指定検索",
            description: "「サイト名 + キーワード」でサイト内検索結果を優先表示",
            tooltip: "GitHub、GitLab、Gitee、Zhihu、Bilibili、YouTube、Google、Bing、Baidu、Wikipedia、Reddit、Amazon などに対応。例: `github react`。"
          },
          siteShortcut: {
            label: "サイト候補サジェスト",
            description: "サイト名入力時に内蔵サイト候補を優先表示",
            tooltip: "例: `git` で GitHub / GitLab / Gitee などを優先表示します。"
          },
          anyKeyCapture: {
            label: "任意キーで即検索",
            description: "新しいタブでそのまま入力すると検索欄に反映",
            tooltip: "有効時、ページ上で文字キーを押すと検索ボックスへ自動フォーカスします。"
          },
          calculator: {
            label: "計算プレビュー",
            description: "式を入力すると計算結果を候補に表示",
            tooltip: "例: `12*8` でドロップダウンに計算結果を表示します。"
          },
          rotatingPlaceholder: {
            label: "検索ヒントの切り替え表示",
            description: "検索ボックスのヒントを自動で切り替えます",
            tooltip: "オフにすると、検索ボックスには固定のヒントだけを表示します。"
          }
        }
      },
      timeFormat: {
        label: "24時間表示",
        description: "時間を24時間形式で表示する"
      },
      showSeconds: {
        label: "秒を表示",
        description: "時間コンポーネントに秒を表示します"
      },
      visualEffectsLevel: {
        label: "スムーズさレベル",
        description: "端末性能に合わせてエフェクト強度を選択",
        low: "低",
        medium: "中",
        high: "高"
      },
      showTime: {
        label: "時間を表示",
        description: "ページに時間を表示します"
      },
      timeFont: {
        title: "時刻フォント",
        description: "時刻表示に使用するフォントを選択"
      },
      autoFocusSearch: {
        label: "検索ボックスを自動フォーカス",
        description: "ページに入ったときに検索ボックスに自動的にフォーカスします"
      },
      language: {
        label: "言語",
        description: "表示言語を選択",
        selectPlaceholder: "言語を選択"
      },
      theme: {
        label: "テーマ",
        description: "ライト/ダークモードの切り替え、またはシステム設定に従う",
        selectPlaceholder: "テーマを選択",
        system: "システム",
        light: "ライト",
        dark: "ダーク"
      },
      accentColor: {
        label: "アクセントカラー",
        description: "アプリのメインカラーを選択"
      },
      accent: {
        dynamic: "ダイナミック",
        mono: "モノ",
        green: "グリーン",
        blue: "ブルー",
        purple: "パープル",
        orange: "オレンジ",
        pink: "ピンク",
        red: "レッド"
      },
      displayMode: {
        title: "表示モード",
        description: "ページのレイアウトスタイルを選択",
        blank: "空白",
        blankDesc: "時間・壁紙・ショートカットを非表示",
        rhythm: "リズム",
        rhythmDesc: "検索とショートカットのみ表示",
        panoramic: "パノラマ",
        panoramicDesc: "時間・天気・壁紙・ショートカットを表示"
      },
      shortcutsLayout: {
        label: "ショートカット密度",
        description: "列あたりのショートカット数を調整します",
        set: "設定",
        select: "選択"
      },
      shortcutsStyle: {
        label: "ショートカットスタイル",
        entryDescription: "スタイルを切り替えて、グリッド列数と基本行数を設定します",
        open: "開く",
        title: "ショートカットスタイル設定",
        description: "ショートカットスタイルを選び、単一ページのグリッド列数と基本行数を設定します",
        rich: "リッチ",
        compact: "ミニマル",
        showName: "名前を表示",
        showNameDesc: "オンにするとアイコンの下にショートカット名を表示します",
        columns: "グリッド列数",
        rows: "基本行数"
      },
	      backup: {
        label: "データのバックアップと復元",
        description: "ローカルレイアウトデータをインポート/エクスポート (.leaftab)",
        cloudTab: "クラウド同期",
        webdavTab: "WebDAV 同期",
        import: "データをインポート",
        export: "データをエクスポート",
        importSuccess: "データのインポートに成功しました",
        importError: "データのインポートに失敗しました。ファイル形式を確認してください。",
        exportSuccess: "データのエクスポートに成功しました",
        progress: {
          importPreparingTitle: "インポートを準備中",
          importPreparingDetail: "バックアップファイルを検証しています...",
          importReadingLocalTitle: "現在のローカルデータを読み込み中",
          importReadingLocalDetail: "インポート内容を統合する準備をしています...",
          importWritingLocalTitle: "ローカルデータを書き込み中",
          importWritingLocalDetail: "インポート内容をこの端末に適用しています...",
          importMergingTitle: "インポートデータを統合中",
          importMergingDetail: "ショートカットとブックマークを整合しています...",
          importSyncingTitle: "インポート結果を同期中",
          importSyncingDetail: "最新データをクラウドへ送信しています...",
          importLongTaskTitle: "データをインポート中",
          importLongTaskDetail: "ローカルに書き込み中です。しばらくお待ちください...",

          exportLongTaskTitle: "データをエクスポート中",
          exportLongTaskDetail: "ショートカットとブックマークを準備しています...",
          exportReadingLocalTitle: "ローカルデータを読み込み中",
          exportReadingLocalDetail: "ショートカットとブックマークを収集中...",
          exportAssemblingTitle: "エクスポート内容を組み立て中",
          exportAssemblingDetail: "LeafTab バックアップファイルを生成しています...",
          exportGeneratingTitle: "エクスポートファイルを生成中",
          exportGeneratingDetail: "まもなく保存できます...",

          cloudBackupLongTaskTitle: "クラウドデータをバックアップ中",
          cloudBackupLongTaskDetail: "インポート前にクラウドのバックアップをダウンロードします...",
          cloudBackupReadingTitle: "クラウドデータを読み込み中",
          cloudBackupReadingDetail: "上書きを防ぐため、インポート前バックアップを作成しています...",
          cloudBackupImportingTitle: "バックアップデータをインポート中",
          cloudBackupImportingDetail: "選択したデータをこの端末に書き込んでいます...",
        },
	        webdav: {
          entry: "WebDAV 同期",
          entryDesc: "WebDAV でリモートバックアップと復元を設定",
          configure: "設定",
          pull: "クラウドから取得",
          push: "クラウドへ送信",
          sync: "今すぐ同期",
          url: "WebDAV URL",
          filePath: "リモートファイルパス",
          username: "ユーザー名",
          password: "パスワード",
          profileName: "設定名",
          profileNamePlaceholder: "例：自宅 NAS",
          usernamePlaceholder: "任意",
          passwordPlaceholder: "任意",
          syncByScheduleLabel: "定期的に自動同期",
          syncByScheduleDesc: "一定間隔で自動同期。長時間開く場合に最適",
          autoSyncToastLabel: "自動同期成功トーストを表示",
          autoSyncToastDesc: "定期自動同期が成功した後にトーストを表示します",
          syncIntervalLabel: "同期間隔",
          syncIntervalMinutes: "{{count}} 分",
          enabledLabel: "WebDAV 同期を有効化",
          enabledDesc: "無効化すると WebDAV の自動/手動同期を停止します",
          providerCustom: "カスタムサービス",
          providers: {
            jianguoyun: "Jianguoyun",
          },
          providerLabel: "WebDAV プロバイダー",
          providerPlaceholder: "プロバイダーを選択",
          policyMerge: "可能ならローカルとクラウドの変更を統合（推奨）",
          policyPreferRemote: "クラウド版を優先（ローカルは上書き）",
          policyPreferLocal: "ローカル版を優先（クラウドは上書き）",
          download: "WebDAV から取得",
          upload: "WebDAV に同期",
          downloading: "取得中...",
          uploading: "同期中...",
          downloadSuccess: "WebDAV の取得に成功しました",
          uploadSuccess: "WebDAV の同期に成功しました",
          downloadError: "WebDAV の取得に失敗しました。設定を確認してください。",
          uploadError: "WebDAV の同期に失敗しました。設定を確認してください。",
          syncSuccess: "同期完了",
          syncError: "同期に失敗しました。設定を確認してください。",
	          authFailed: "WebDAV の認証に失敗しました。ユーザー名またはパスワードを確認してください。",
	          policyChangeSyncTriggered: "競合ポリシーを切り替え、現在のポリシーで1回同期しました",
	          intervalChangeSyncTriggered: "同期間隔を変更し、即時に1回同期しました",
	          disableWebdavBeforeCloudLogin: "WebDAV 同期が有効です。クラウド同期にログインする前に WebDAV 同期を無効にしてください。",
	          disableWebdavBeforeCloudManage: "WebDAV 同期が有効です。クラウド同期を管理する前に WebDAV 同期を無効にしてください。",
	          disableCloudBeforeWebdavEnable: "クラウド同期にログイン中です。WebDAV 同期を有効にする前にクラウド同期からログアウトしてください。",
	          disableCloudBeforeWebdavConfig: "クラウド同期が有効です。WebDAV 同期を設定する前にクラウド同期を無効にしてください。",
	          urlRequired: "まず WebDAV URL を入力してください",
	          defaultProfileName: "デフォルト設定",
	          configured: "設定済み、同期可能",
	          notConfigured: "未設定。WebDAV 情報を入力してください",
          lastSyncAt: "最終同期",
          notSynced: "未同期",
          justSynced: "たった今同期",
          minutesAgo: "{{count}} 分前",
          hoursAgo: "{{count}} 時間前",
          disabled: "無効（WebDAV 同期は停止中）",
          lastAttemptFailed: "直近の同期に失敗しました",
          scheduleRunning: "定期同期が実行中",
          nextSyncAtLabel: "次回同期: {{time}}",
          syncDisabled: "まず WebDAV 同期を有効化してください"
        }
      },
      changelog: {
        title: "更新履歴",
        description: "最近の機能・体験の更新を表示",
        open: "更新履歴を見る"
      },
      privacyPolicy: "プライバシーポリシー",
      copyright: "All rights reserved.",
      specialThanks: "テスターに特別感謝：yanshuai、Horang、Mling",
      iconAssistant: {
        title: "匿名の使用統計を送信",
        desc: "アイコンサポートの最適化にご協力ください（ドメインのみ、個人情報なし）",
        modalTitle: "LeafTabの改善にご協力ください",
        modalDesc: "より良いアイコンサポートを提供するために、ショートカットのドメイン（例：google.com）を収集させていただきたいと考えています。データは完全に匿名であり、個人情報や完全なURLは含まれません。",
        agree: "同意して有効にする",
        disagree: "同意しない",
        adminKeyLabel: "管理者キー",
        adminKeyDesc: "全体で収集したドメイン一覧のエクスポートに必要です（運用者/自ホスト向け）",
        adminKeyPlaceholder: "管理者キーを入力",
        adminKeySave: "保存",
        adminKeyClear: "クリア",
        adminKeySaved: "管理者キーを保存しました",
        adminKeyCleared: "管理者キーを削除しました",
        adminKeyRequired: "管理者キーが必要です",
        adminKeyInvalid: "管理者キーが無効、または権限がありません",
        confirmClose: "オフにすると優先アイコンサポートが停止します。無効化しますか？",
        downloadTitle: "収集したドメイン一覧をダウンロード",
        downloadDesc: "ドメインのみ、重複排除、既存アイコンは除外",
        downloadButton: "一覧をダウンロード",
        reportNow: "今すぐ送信",
        reportTriggered: "送信をトリガーしました（レート制限の可能性あり）",
        queueStatus: "未送信: {{count}}、最終送信: {{last}}",
        downloadSuccess: "ドメイン一覧をダウンロードしました",
        downloadFailed: "ダウンロードに失敗しました。しばらくしてから再試行してください"
      },
      adminMode: {
        tapRemaining: "あと{{count}}回タップすると管理者モードになります",
        enabled: "管理者モードに入りました",
        alreadyEnabled: "すでに管理者モードです",
        disabled: "管理者モードをオフにしました",
        switchLabel: "管理者モード",
        switchDesc: "管理者キーの設定と全体ドメイン一覧のエクスポートが可能になります",
        open: "開く"
      },
      adminPanel: {
        statsTitle: "プラットフォーム統計",
        statsDesc: "非機微な集計データのみ",
        refresh: "更新",
        loading: "読み込み中...",
        statsLoadFailed: "統計の取得に失敗しました",
        enableHint: "先に設定でバージョンをタップして管理者モードを有効化してください",
        usersTotal: "登録ユーザー数",
        domainsUnique: "収集ドメイン数",
        weatherDebugLabel: "天気デバッグ",
        weatherDebugDesc: "天気デバッグパネルを表示（セッションのみ）"
      },
      about: {
        label: "LeafTab について",
        desc: "バージョン情報と拡張機能の概要",
        open: "開く",
        title: "LeafTab について",
        versionLabel: "バージョン v{{version}}",
        content: "LeafTab はブラウザーの新しいタブ拡張です。\nショートカット管理、壁紙/天気表示、クラウド同期や WebDAV 同期などの機能を提供します。",
        ackTitle: "謝辞",
        ackDesc: "LeafTab は次のオープンソースライブラリ／リソースを利用しています（タップで開く）：",
        frontend: "フロントエンド",
        backend: "バックエンド",
        resources: "アイコン・リソース"
      }
    },
    changelog: {
      title: "更新履歴",
      description: "最近のバージョン更新",
      version: "バージョン",
      date: "日付",
      items: {
        release144TranslationPromptFix: "LeafTab を開くたびに表示されることがあった「このページを翻訳しますか」のブラウザ翻訳案内を修正",
        release144AboutQqGroup: "About LeafTab ダイアログに交流用 QQ グループ番号を追加し、フィードバックや交流をしやすくしました",
        release144ReadmeCommunityEntry: "README にコミュニティ案内を追加し、1.4.4 のリリース情報も整理しました",
        release143SyncFlowAlignment: "クラウド同期と WebDAV 同期の挙動をそろえ、ブックマーク差分が危険と判定された場合でもショートカットと設定の同期を継続できるようにしました",
        release143WebdavProviderPolish: "WebDAV の内蔵プロバイダーに Jianguoyun を追加し、プロバイダー切り替え、権限許可、キー確認、初回同期フローを改善しました",
        release143SyncStatusPolish: "同期センターの状態表示、同期範囲文言、エラー処理を見直し、誤った失敗表示や状態ずれを減らしました",
        release142BookmarkSyncDecoupling: "ブックマーク同期とショートカット/設定同期の分離不具合を修正",
        release142DangerousSyncDialogPolish: "ブックマーク同期の危険検知ダイアログと案内を改善",
        release142SyncTestingBackupNotice: "データ同期は引き続きテスト段階です。有効化前にバックアップを推奨します",
        release141BookmarkSyncFix: "ブックマーク同期の主要な不具合を修正",
        release141SyncStability: "データ同期の安定性を強化",
        release141SyncTestingBackupNotice: "データ同期は現在もテスト段階です。有効化する前に必ずバックアップしてください",
        release130DynamicEffectsOptimize: "全体の動的エフェクト体験を最適化し、「動的効果を抑える」トグルと統一されたモーション低減挙動を追加",
        release130DynamicWallpaperTab: "新しい「動的」壁紙カテゴリを追加し、Prism / Silk / Light Rays / Beams / Galaxy / Iridescence のプレビューと適用に対応",
        release130ManualWeatherCity: "天気機能で都市を手動選択して保存できるようになり、位置表示をより安定して制御可能に",
        release129ModeUiRefactor: "「パノラマ / リズム / 余白」の3モードUIを再構成し、共通コンポーネント化と旧重複コードの整理を実施",
        release129WallpaperModalRefine: "壁紙設定ダイアログを Bing / 天気 / カラー / カスタム の4タブ構成に再設計し、操作とレイアウトを統一",
        release129ColorWallpaperGradients: "カラー壁紙（12種のグラデーション）を追加し、グラデーション強度・スウォッチ角丸・プレビュー表現を最適化",
        release129MaskSliderByMode: "壁紙マスク不透明度スライダー（0-100）を追加。現在有効な壁紙タイプのみ、ホバー時に表示",
        release129ContrastAndOpacityTune: "リズム/余白モードの可読性を改善：四隅モジュールを既定50%透明にし、ショートカット文字影を強化、ライトテーマ時の主要文字を白で固定",
        release127CaptchaSessionFix: "オンライン登録で CAPTCHA が誤判定される問題を修正（生成と検証を同一セッションで処理）",
        release127ProxyCookieDefaults: "本番環境のセッション既定値（プロキシ信頼 + Cookie ポリシー）を最適化し、拡張機能からバックエンドへのセッション安定性を向上",
        release127FirstLoginLocalFirst: "新規ユーザーの初回ログイン時は競合ダイアログを表示せず、ローカル優先でクラウド同期を実行",
        release127DeployScriptLibUpload: "バックエンド配備スクリプトで server/lib が未アップロードになる問題を修正し、環境変数の既定補完を強化",
        release126UnifiedCompareDialog: "クラウドログイン時の競合処理を WebDAV と統一し、大きな比較ダイアログを直接表示",
        release126ConflictStrategyTabs: "上部タブで「クラウド優先 / ローカル優先 / マージ」を切り替え可能に",
        release126ConflictPendingPersist: "ダイアログを閉じる／ページを再読み込みしても未解決競合を保持して復元",
        release126ConflictFreezeAutoSync: "未解決競合がある間は自動同期を停止し、確定後に再開",
        release126CompareUiRefine: "比較明細 UI を簡素化（各項目の外枠を削除し、設定画面と同じタブスタイルに統一）",
        release125ImportLocalFirstSync: "ログイン状態でローカルデータをインポート後、確定すると即時にクラウドへ同期（ローカル優先）",
        release125ManualCloudLocalFirst: "クラウド同期有効時、手動「今すぐ同期」で競合ダイアログを表示せずローカルデータを直接クラウドへ反映",
        release125SyncSettingsUi: "クラウド/WebDAV 同期設定 UI を調整（2つのスイッチのラッパーを削除し順序を最適化）",
        release125WebdavCorsPermission: "WebDAV 同期に拡張機能バックグラウンドプロキシとドメイン単位の動的権限申請（HTTP/HTTPS）を追加し CORS 互換性を改善",
        release125WebdavAuthHint: "WebDAV 認証失敗（401/403）を検知し、ユーザー名/パスワードエラーを明確に表示",
        release124UpdateNotice: "コミュニティ版に GitHub 新バージョン検知と更新ダイアログを追加（Release へ直接移動）",
        release124Snooze24h: "「あとで」に 24 時間のクールダウンを追加し、繰り返し通知を抑制",
        release124ChangelogEntry: "アプリ内更新履歴に 1.2.4 の項目を追加し、多言語文言を補完",
        release124ReleasePackaging: "zip のルートに manifest.json を含める標準リリースパッケージスクリプトを追加",
        release124FirefoxCompat: "Firefox ストア向けパッケージ構造を修正し、manifest 互換設定を調整",
        release123WebdavAccessDialog: "WebDAV「同期を有効化」を専用接続ダイアログに変更（ログインダイアログと同一スタイル）",
        release123UnifiedSyncSettings: "クラウド/WebDAV の同期設定 UI を統一し、競合処理ドロップダウンを削除",
        release123AutoSyncToggles: "自動同期スイッチと自動同期成功トーストのスイッチを追加し、自動同期オフ時は間隔スライダーを無効化",
        release123ProviderLabel: "WebDAV カードタイトルを「デフォルト設定」からサービスプロバイダー名表示に変更",
        release123PasswordToggle: "ログイン/登録のパスワード入力に表示/非表示トグルを追加",
        release122Scrollbar: "「About LeafTab」モーダルのスクロールバーを設定モーダルと統一",
        release122WelcomePersist: "初回ログイン案内モーダルの状態をローカル＋サーバーに保存し、リロード時のチラつきを解消",
        release122RateLimitToast: "429 レート制限トーストが表示されない問題を修正し、スタイルを統一",
        release122WebdavSchedule: "WebDAV 定期同期をシステム時刻基準に変更し、次回同期時刻表示と主要設定変更時の即時同期に対応",
        release122CustomServer: "カスタムクラウド同期サーバーの切り替えに対応",
        release122CustomIconSource: "カスタムアイコンソース URL に対応",
        release122OnlineIconSource: "アイコンソースを GitHub Pages 経由のオンライン取得に変更",
        release122DynamicAccent: "ダイナミックアクセントカラーに対応",
        release121Webdav: "WebDAV 同期機能を追加",
        release121Ui: "UI スタイルを改善",
        release121Fixes: "いくつかの不具合を修正",
        grid: "下部ショートカットをフラットグリッドに再設計",
        carousel: "スワイプページングとマウスホイールページングを追加",
        entrance: "壁紙・検索・ショートカットの登場アニメーションを改善",
        dots: "ページドットの中央揃えとスタイルを調整"
      }
    },
    updateNotice: {
      title: "新しいバージョン {{version}} が利用可能です",
      description: "GitHub に新しいコミュニティ版が公開されています。",
      currentVersion: "現在のバージョン",
      latestVersion: "最新バージョン",
      publishedAt: "公開日: {{date}}",
      changelogTitle: "更新内容",
      noChangelog: "このバージョンの詳細な更新内容はありません。",
      imageAlt: "LeafTab アップデート",
      badge: "新バージョン v{{version}}",
      later: "あとで",
      ignoreThisVersion: "このバージョンを無視",
      downloadFromGithub: "GitHub からダウンロード",
      openRelease: "GitHub からダウンロード",
      sampleNote1: "クラウド同期と WebDAV 同期の設定操作を統一",
      sampleNote2: "自動更新通知ダイアログを追加（GitHub Release へ）",
      sampleNote3: "更新履歴ダイアログのレイアウト階層を改善"
    },
    languages: {
      zh: "简体中文",
      "zh-TW": "繁體中文",
      en: "English",
      vi: "Tiếng Việt",
      ja: "日本語",
      ko: "한국어"
    },
    weather: {
      refreshing: "天気と位置情報を更新中...",
      unknown: "不明",
      wallpaper: {
        mode: "壁紙モード",
        modeDesc: "ミニマルモードの背景をカスタマイズ",
        bing: "Bing 毎日壁紙",
        weather: "天気壁紙",
        custom: "カスタム壁紙",
        uploadTitle: "カスタム壁紙をアップロード",
        upload: "画像をアップロード",
        uploadDesc: "クリックしてアップロード、または画像をドラッグ＆ドロップ",
        download: "ダウンロード",
        setAsWallpaper: "壁紙に設定",
        apply: "壁紙に設定",
        bingDesc: "Bing から毎日自動更新されます。",
        weatherDesc: "地域の天気に合わせて動的に変化します。",
        customDesc: "自分の画像を壁紙として使用します。",
        customUploaded: "アップロードした壁紙。",
        imageSupport: "JPG、PNG、WEBP に対応",
        maskOpacity: "黒いオーバーレイ",
        colorPresets: {
          "aurora-blush": "オーロラブラッシュ",
          "mist-lilac": "ミストライラック",
          "mint-breeze": "ミントブリーズ",
          "peach-cloud": "ピーチクラウド",
          "glacier-milk": "グレイシャーブルー",
          "rose-water": "ローズウォーター",
          "sage-cream": "セージクリーム",
          "dawn-sand": "ドーンサンド",
          "lavender-snow": "ラベンダースノー",
          "ocean-haze": "オーシャンヘイズ",
          "camellia-silk": "カメリアシルク",
          "tea-ivory": "ティーアイボリー"
        }
      },
      codes: {
        0: "晴れ",
        1: "晴れ",
        2: "曇り",
        3: "曇り",
        45: "霧",
        52: "霧",
        51: "霧雨",
        53: "霧雨",
        54: "激しい霧雨",
        55: "激しい霧雨",
        56: "着氷性の霧雨",
        57: "着氷性の霧雨",
        58: "小雨",
        61: "小雨",
        63: "雨",
        65: "激しい雨",
        66: "着氷性の雨",
        67: "着氷性の雨",
        71: "小雪",
        73: "雪",
        75: "大雪",
        77: "霧雪",
        80: "にわか雨",
        81: "にわか雨",
        82: "激しいにわか雨",
        85: "にわか雪",
        86: "にわか雪",
        95: "雷雨",
        96: "雹を伴う雷雨",
        99: "雹を伴う雷雨"
      },
      defaultCity: "杭州",
      defaultWeather: "曇り",
      unknownLocation: "場所不明",
      local: "現在地"
    },
    lunar: {
      label: "旧暦"
    },
    common: {
      loading: "読み込み中...",
      cancel: "キャンセル",
      confirm: "確認",
      delete: "削除",
      save: "保存",
      clear: "クリア",
      back: "戻る",
      more: "もっと見る"
    },
    user: {
      loggedIn: "ログイン済み",
      logout: "ログアウト",
      loggedOut: "ログアウトしました"
    },
    search: {
      placeholder: "探したいものをそのまま入力",
      placeholderDynamic: "探したいものを入力。URLでもOK",
      placeholderHintTabSwitch: "検索方法を変えたいときは Tab",
      placeholderHintCalculator: "12*8 のように入力すると計算できます",
      placeholderHintSiteDirect: "github react と入力すると GitHub を探せます",
      placeholderHintPrefix: "g AI と入力すると Google で検索できます",
      systemEngine: "システム既定",
      useEngineSearch: "{{engine}} で検索",
      prefixEngineInlineHint: "{{engine}}で検索",
      historyTitle: "検索履歴",
      clearHistory: "クリア",
      noHistory: "検索履歴はありません"
    },
    groups: {
      edit: "編集",
      addShortcut: "新規ショートカット"
    },
    context: {
      open: "開く",
      edit: "編集",
      copyLink: "リンクをコピー",
      delete: "削除",
      addShortcut: "ショートカットを追加",
      newShortcut: "新しいショートカット",
      pinToTop: "固定",
      pinTop: "選択項目を先頭に固定",
      pinBottom: "選択項目を末尾に固定",
      select: "選択",
      unselect: "選択解除",
      selectedCount: "{{count}} 件選択中",
      deleteSelected: "選択した項目を削除",
      moveToScenario: "シナリオに移動",
      noScenarioTarget: "移動先のシナリオがありません",
      selectBeforeMove: "移動する前にショートカットを選択してください",
      multiSelect: "複数選択",
      cancelMultiSelect: "複数選択を終了"
    },
    sidebar: {
      toggle: "サイドバーを切り替え",
      title: "サイドバー",
      description: "モバイル用サイドバーを表示します。"
    },
    shortcutModal: {
      addTitle: "ショートカットを追加",
      editTitle: "ショートカットを編集",
      nameLabel: "名前",
      namePlaceholder: "ショートカット名を入力",
      urlLabel: "URL",
      urlPlaceholder: "URLを入力",
      icon: {
        modeGroup: "アイコンの種類",
        modeOfficialShort: "公式",
        modeFaviconShort: "ネット",
        modeLetterShort: "文字",
        autoOfficial: "対応時に公式アイコンへ自動切り替え",
        officialUnavailable: "このショートカットにはまだ公式アイコンがありません",
        networkHint: "ネットアイコンは読み込みに失敗する場合があり、その際は文字アイコンに戻ります"
      },
      errors: {
        fillAll: "すべての情報を入力してください",
        fillAllDesc: "ショートカット名とURLを入力してください",
        duplicateUrl: "このサイトのショートカットは既に存在します",
        duplicateUrlDesc: "同一サイトのショートカットは1件のみです。URLを確認して再試行してください"
      }
    },
    popupShortcut: {
      title: "現在のページを追加",
      loading: "現在のタブ情報を読み込み中…",
      unsupported: "このページは直接保存できるサイトURLではありません。http または https のURLに変更してから保存してください。",
      targetScenario: "「{{name}}」シナリオに保存されます",
      ready: "現在のタブのタイトルとURLを自動入力しました。",
      saved: "ショートカットを保存しました",
      scenarioLabel: "保存先シナリオ",
      scenarioPlaceholder: "シナリオを選択"
    },
    onboarding: {
      welcome: "LeafTab へようこそ",
      selectRole: "ロールを選択して、パーソナライズを開始",
      skip: "スキップ",
      start: "開始する",
      next: "次へ",
      layoutTip: "レイアウトは後で設定から変更できます",
      stepAppearanceTitle: "テーマと言語を設定",
      stepAppearanceDesc: "外観と言語を選択します。後で設定で変更できます",
      stepRoleTitle: "役割を選択",
      stepRoleDesc: "おすすめのショートカットとレイアウトを初期化します",
      stepLayoutTitle: "レイアウトを選択",
      stepLayoutDesc: "ホーム画面の配置を決定します",
      stepPermissionsTitle: "権限を許可",
      stepPermissionsDesc: "履歴とブックマークへのアクセスを許可すると、検索体験がより完全になります",
      historyPermissionTitle: "閲覧履歴",
      historyPermissionDesc: "許可すると、最近の閲覧履歴や関連検索候補を LeafTab に表示できます",
      bookmarksPermissionTitle: "ブックマーク",
      bookmarksPermissionDesc: "許可すると、ブラウザのブックマークを直接検索して開けます",
      tabsPermissionTitle: "ブラウザタブ",
      tabsPermissionDesc: "許可すると、開いているタブ検索と LeafTab の重複タブ防止を利用できます",
      authorize: "許可する",
      authorizing: "要求中...",
      authorized: "許可済み",
      unsupported: "未対応",
      permissionTip: "この手順はスキップでき、必要になったタイミングで後から許可することもできます。",
      enterHome: "LeafTab を開始"
    },
    auth: {
      description: "ログインまたは登録して個人設定を保存します。",
      tabs: { login: "ログイン", register: "登録" },
      labels: { username: "ユーザー名", password: "パスワード" },
      placeholders: {
        usernameInput: "ユーザー名を入力",
        passwordInput: "パスワードを入力",
        usernameSet: "ユーザー名を設定",
        passwordSet: "パスワードを設定"
      },
      tips: {
        username: "英数字、メール形式、長さ2-32文字",
        password: "パスワードは8-24文字"
      },
      buttons: {
        loggingIn: "ログイン中...",
        login: "ログイン",
        registering: "登録中...",
        register: "登録"
      },
	    toast: {
        loginSuccess: "ログイン成功！おかえりなさい、{{username}}",
        registerSuccess: "登録成功！ログインしてください、{{username}}"
      },
      errors: {
        usernamePasswordRequired: "ユーザー名とパスワードを入力してください",
        captchaRequired: "認証コードを入力してください",
        usernameFormatInvalid: "ユーザー名の形式が無効です",
        passwordLength: "パスワードは8-24文字である必要があります",
        loginFailed: "ログイン失敗",
        registerFailed: "登録失敗",
        loginRequestFailed: "ログイン要求失敗。ネットワークまたはサーバーを確認してください。",
        registerRequestFailed: "登録要求失敗。ネットワークまたはサーバーを確認してください。",
        userExists: "ユーザー名は既に存在します",
        userNotFound: "ユーザーが見つかりません",
        invalidPassword: "パスワードが間違っています",
        invalidCredentials: "ユーザー名またはパスワードが間違っています",
        invalidUsernameFormatBackend: "ユーザー名の形式が無効です（3-20文字の英数字、アンダースコア）",
        passwordTooShort: "パスワードが短すぎます（6文字以上）",
        credentialsRequired: "ユーザー名とパスワードを入力してください",
        invalidCaptcha: "認証コードが無効です",
        internalError: "サーバー内部エラー"
      }
    },
    shortcutDelete: {
      title: "ショートカットを削除",
      description: "このショートカットを削除してもよろしいですか？"
    },
    syncConflict: {
      title: "同期の競合",
      description: "ローカルとクラウドのデータが一致しません。どちらを使用するか選択してください。",
      useCloud: "クラウドを使用",
      useLocal: "ローカルを使用"
    },
    scenario: {
      title: "シナリオモード",
      defaultName: "Working mode",
      unnamed: "無題",
      createTitle: "新しいシナリオ",
      createDescription: "名前、色、アイコンを設定",
      editTitle: "シナリオを編集",
      editDescription: "名前、色、アイコンを変更",
      nameLabel: "シナリオ名",
      namePlaceholder: "シナリオ名を入力",
      colorLabel: "色",
      iconLabel: "アイコン",
      actionEdit: "シナリオを編集",
      actionDelete: "シナリオを削除",
      colorPicker: "色を選択",
      iconPicker: "アイコンを選択",
      createButton: "シナリオを作成",
      addButton: "追加",
      saveButton: "保存",
      deleteTitle: "シナリオを削除",
      deleteConfirm: "このシナリオを削除してもよろしいですか？このモードのすべてのグループとショートカットも削除され、復元できません。",
      deleteConfirmWithTarget: "「{{name}}」を削除してもよろしいですか？このモードのすべてのグループとショートカットも削除され、復元できません。",
      deleteButton: "削除",
      toast: {
        created: "シナリオを作成しました",
        updated: "シナリオを更新しました",
        deleted: "シナリオを削除しました",
        switched: "切り替え先: {{name}}"
      }
    },
    toast: {
      cloudSynced: "クラウド設定を同期しました",
      cloudAutoSyncSuccess: "クラウドの自動同期が完了しました",
      cloudSyncFailed: "クラウド設定の同期に失敗しました",
      syncFailed: "同期に失敗しました",
      syncCloudApplied: "クラウド設定を適用しました",
      syncLocalApplied: "ローカル設定を適用しました",
      linkCopied: "リンクをコピーしました",
      linkCopyFailed: "リンクのコピーに失敗しました",
      loadedFromCache: "ローカルキャッシュから読み込みました（オフラインモード）",
      sessionExpired: "セッションが切れました。もう一度ログインしてください",
      shortcutCreateFailed: "ショートカットを作成できません",
	      alreadyOnPage: "すでにこのページです"
	    },
	    leaftabSync: {
	      provider: {
	        webdav: "WebDAV 同期",
	        cloud: "クラウド同期",
	        generic: "同期"
	      },
	      webdav: {
	        actions: {
	          mkcol: "フォルダ作成",
	          upload: "書き込み",
	          download: "読み取り",
	          delete: "削除"
	        },
	        error: {
	          withPath: "WebDAV {{action}} に失敗（{{status}}）：{{path}}",
	          noPath: "WebDAV {{action}} に失敗（{{status}}）"
	        }
	      },
	      cloud: {
	        error: {
	          lockedTryFix: "クラウド同期が別の端末にロックされています。自動修復を試しました。まだ失敗する場合は再試行してください。",
	          remoteCommitChanged: "クラウドデータが更新されました。もう一度同期してください。",
	          parentCommitRequired: "クラウドに新しいバージョンがあります。上書き前に最新データを取得してください。",
	          httpStatus: "クラウド同期に失敗（{{status}}）",
	          generic: "クラウド同期に失敗しました"
	        }
	      }
	    },
	    leaftabSyncRunner: {
	      progressDetailDefault: "バックグラウンドで同期しています。操作は続けられます。",
	      permissionTitle: "ブックマーク権限を確認中",
	      permissionDetail: "ブックマークへのアクセス権限が必要です。",
	      bookmarksPermissionDeniedToast: "ブックマーク権限がありません。この回はショートカットと設定のみ同期します。",
	      bookmarksPermissionDeniedToastAlt: "ブックマーク権限がありません。現在はショートカットと設定のみ同期します。",
	      successTitle: "同期完了",
	      successToastFallback: "同期完了",
	      successDetailFallback: "ローカルとリモートの処理が完了しました。",
	      webdav: {
	        prepareTitle: "同期の準備中",
	        prepareDetail: "ローカルと WebDAV の状態を読み込み中",
	        disable: {
	          title: "同期を無効化中",
	          detail: "最終同期を実行して同期をオフにしています",
	          finalSyncTitle: "最終変更を同期中",
	          closingTitle: "同期をオフにしています",
	          clearingTitle: "ローカルデータを消去中",
	          doneTitle: "同期を無効化しました"
	        }
	      },
	      cloud: {
	        prepareTitle: "クラウド同期の準備中",
	        prepareDetail: "ローカルとクラウド状態を読み込み中",
	        lockConflict: {
	          autoFixToast: "クラウド同期ロック競合（409）を検出。自動修復して再試行しています...",
	          autoFixTitle: "古いクラウドロックを検出。自動修復中",
	          autoFixDetail: "古いロックを解放して同期を再試行しています",
	          failedToast: "クラウド同期に失敗（409）：同期ロックが他の端末に保持されています。他端末の同期を停止して再試行するか、約 2 分待ってください。"
	        },
	        commitConflict: {
	          realignTitle: "クラウドのバージョン変化を検出。状態を再調整中",
	          realignDetail: "最新状態の反映を待ってから再試行します"
	        }
	      }
	    },
	    leaftabSyncActions: {
	      dataDetail: {
	        withBookmarks: "ショートカットとブックマークを処理中",
	        shortcutsOnly: "ショートカットを処理中"
	      },
	      bookmarksPermissionRequired: "ブックマーク権限がありません。同期の修復を実行できません。",
	      webdav: {
	        inProgress: "WebDAV 同期が進行中です。しばらくお待ちください。",
	        syncingTitle: "WebDAV に同期中",
	        repair: {
	          pullTitle: "WebDAV でローカルを上書き中",
	          pushTitle: "ローカルで WebDAV を上書き中",
	          pullSuccess: "WebDAV データでローカルを上書きしました",
	          pushSuccess: "ローカルデータで WebDAV を上書きしました",
	          pullFailed: "WebDAV でローカルの上書きに失敗しました",
	          pushFailed: "ローカルで WebDAV の上書きに失敗しました"
	        }
	      },
	      cloud: {
	        inProgress: "クラウド同期が進行中です。しばらくお待ちください。",
	        syncingTitle: "クラウドに同期中",
	        repair: {
	          pullTitle: "クラウドでローカルを上書き中",
	          pushTitle: "ローカルでクラウドを上書き中",
	          pullSuccess: "クラウドデータでローカルを上書きしました",
	          pushSuccess: "ローカルデータでクラウドを上書きしました"
	        }
	      }
	    },
	    syncPreview: {
	      hint: {
	        local: "右側の取り消し線の項目は同期後にクラウドから削除されます。",
	        cloud: "左側の取り消し線の項目は同期後にローカルから削除されます。",
	        merge: "マージは両方を保持して重複を除去します（ローカル優先）。"
	      },
	      noComparable: "比較できるショートカットデータが見つかりませんでした。"
	    },
	    leaftabDangerousSync: {
	      toast: {
	        skipBookmarks: "この回はブックマークをスキップし、ショートカットと設定のみ同期します。",
	        cloudBookmarksDisabled: "クラウド同期は有効ですが、「ブックマーク同期」を一時的にオフにしました。",
	        webdavBookmarksDisabled: "WebDAV 同期は有効ですが、「ブックマーク同期」を一時的にオフにしました。"
	      }
	    },
	    leaftabSyncCenter: {
      title: "同期センター",
      description: "WebDAV ベースの同期センター。シナリオ、ショートカット、ブックマークの同期に対応します。",
      bookmarkScope: "ブックマーク同期範囲: {{scope}}",
      summary: "ショートカット {{shortcuts}} 件 / シナリオ {{scenarios}} 件 / ブックマーク {{bookmarks}} 件",
      stateLabel: "状態",
      nav: {
        syncing: "同期中",
        attention: "要確認"
      },
      status: {
        syncing: "同期中",
        conflict: "要対応",
        error: "失敗",
        ready: "準備完了"
      },
      state: {
        analyzing: "同期状態を解析中...",
        syncing: "バックグラウンド同期中",
        syncingDescription: "LeafTab がローカルとクラウドの差分を比較し、必要な更新を書き戻しています。完了までお待ちください。",
        initRequired: "初期化が必要です",
        initDescription: "ローカルとクラウドの両方にデータがあります。初回の初期化方式を選択してから同期を開始してください。",
        ready: "マージ同期の準備完了",
        readyDescription: "新しい同期エンジンで、シナリオ/ショートカット/ブラウザのブックマークを push・pull・マージできます。"
      },
      actions: {
        syncing: "同期中..."
      }
    },
    leaftabSyncDialog: {
      description: "LeafTab の同期状態、手動同期、WebDAV 設定をここで管理します。",
      scopeDefault: "ブックマーク",
      lastSyncEmpty: "記録なし",
      lastSyncUnavailable: "未同期",
      manualSyncOnly: "手動同期のみ",
      autoSyncOn: "自動同期が有効です",
      enableSync: "同期を有効化",
      repair: "同期を修復",
      cloudOverwriteLocal: "クラウドでローカルを上書き",
      localOverwriteCloud: "ローカルでクラウドを上書き",
      remoteOverwriteLocal: "WebDAV でローカルを上書き",
      localOverwriteRemote: "ローカルで WebDAV を上書き",
      tabs: {
        cloud: "クラウド",
        webdav: "WebDAV"
      },
      metrics: {
        localShortcuts: "ローカルショートカット",
        localBookmarks: "ローカルブックマーク",
        remoteShortcuts: "クラウドショートカット",
        remoteBookmarks: "クラウドブックマーク"
      },
      details: {
        lastSync: "前回同期",
        nextSync: "次回同期",
        scope: "同期範囲"
      },
      cloud: {
        bookmarkSyncDisabledBanner: "ブックマーク同期がオフです。現在はショートカットと設定のみ同期します。",
        enableBookmarkSyncAction: "有効にする",
        connectedFallback: "LeafTab アカウント",
        unsignedTitle: "未ログイン",
        unsignedSubtitle: "ログインして同期を有効化",
        loginToStart: "ログインして設定",
        signedOut: "未ログイン",
        connectedSubtitle: "ログイン済み。LeafTab データを同期できます。",
        disabledSubtitle: "ログイン済み。クラウド同期設定で有効化できます。",
        openSettingsToEnable: "有効化する",
        ready: "接続済み",
        disabled: "未有効",
        error: "失敗",
        enableViaSettings: "同期を有効化",
        manage: "クラウド同期を管理",
        scopeRich: "ショートカット、{{scope}}",
        scopeShortcutsOnly: "ショートカットと設定のみ"
      },
      webdav: {
        connectedFallback: "WebDAV",
        unconfiguredTitle: "WebDAV 未有効",
        unconfiguredSubtitle: "未設定です。先に設定してください。",
        enabledSubtitle: "設定済み。WebDAV に同期します。",
        disabledSubtitle: "設定済みですが、同期は無効です。",
        configureToStart: "設定して開始",
        enableToStart: "設定済み。同期を有効化してください。",
        scopeWithLabel: "ショートカット、{{scope}}"
      }
    },
	    leaftabSyncEncryption: {
      cloudNotEnabledTitle: "クラウド同期は無効です",
      cloudNotEnabledPill: "無効",
      webdavNotEnabledTitle: "WebDAV 同期は無効です",
      webdavNotEnabledPill: "無効",
      statusReadyTitle: "エンドツーエンド暗号化が有効です",
      statusMissingTitle: "同期パスフレーズが未設定です",
      statusReadyPill: "保護済み",
      statusMissingPill: "未設定",
      setupTitle: "同期パスフレーズを設定",
      unlockTitle: "同期パスフレーズを入力",
      setupDescription: "{{provider}} のエンドツーエンド暗号化パスフレーズを設定します。サーバーは同期内容を読めず、このパスフレーズも復元できません。",
      unlockDescription: "{{provider}} の同期パスフレーズを入力して、暗号化されたデータをこの端末で復号します。",
      setupConfirm: "保存",
      unlockConfirm: "同期を解錠",
      e2eeSetupDescription: "データはローカルで暗号化されてからクラウド/WebDAV に送信されます。このパスフレーズを持つ端末だけが復号できます。",
      e2eeUnlockDescription: "同期データはクラウド上では暗号化されています。正しいパスフレーズを入力すると、この端末で復号して読み取れます。",
      passphraseLabel: "同期パスフレーズ",
      passphrasePlaceholder: "8 文字以上。英数字の組み合わせを推奨",
      passphraseHint: "これは同期用のパスフレーズで、アカウントのログインパスワードではありません。",
      confirmLabel: "パスフレーズ確認",
      confirmPlaceholder: "もう一度入力して確認",
      setupChecklistTitle: "続行する前に確認してください",
      checklist: {
        serverCannotAccess: "このパスフレーズは保存しません。暗号化された同期内容も閲覧できません。",
        cannotRecover: "パスフレーズを忘れると、既存の暗号化同期データは復元できません。",
        newDeviceUnlock: "端末を変更する、またはローカルデータを消去した場合は再入力が必要です。"
      },
	      deviceUnlockDescription: "この端末で一度解錠すると、以降の同期では再入力不要です。",
	      errors: {
	        missingMetadata: "同期暗号化メタデータがありません",
	        incorrectPassphrase: "同期パスフレーズが正しくありません",
	        invalidConfig: "同期暗号化設定が無効です"
	      },
	      toast: {
	        saved: "同期パスフレーズを保存しました",
	        unlocked: "同期データを解錠しました",
	        saveFailed: "同期パスフレーズの保存に失敗しました"
	      }
	    },
	    leaftabFirstSync: {
      title: "初回同期の初期化",
      description: "初回の LeafTab 同期で、ブラウザのブックマーク、ローカルの LeafTab データ、リモートデータをどう扱うか選択します。",
      recommended: "おすすめ",
      processingBadge: "処理中",
      processingInline: "バックグラウンドで初期同期を実行中です。しばらくお待ちください...",
      processingFooter: "バックグラウンドで初期同期を実行中です。このウィンドウを閉じないでください。完了後に通常の同期状態に戻ります。",
      footer: "このステップは初回同期時のみ表示されます。初期化後、LeafTab はマージ型の新しい同期モードを使用します。",
      bookmarkScopeDescription: "ブックマークは実際のブラウザのルートに対して直接同期され、追加のコピーは作成しません。現在の範囲: {{scope}}。",
      choice: {
        push: {
          title: "ローカルデータをアップロード",
          description: "この端末を基準に、現在の LeafTab データとブラウザのブックマークを WebDAV にアップロードします。"
        },
        pull: {
          title: "リモートデータをダウンロード",
          description: "WebDAV 上の最新のリモートスナップショットで、現在のローカル LeafTab データとブックマークを上書きします。"
        },
        merge: {
          title: "スマート統合",
          description: "ローカルとリモートを統合し、双方にしかないデータを保持しつつ、多くの競合を自動的に解決します。"
        }
      }
    },
    sync: {
      cloud: "クラウド",
      local: "ローカル"
    },
    pagination: {
      page: "{{page}} ページ"
    }
  }
};
