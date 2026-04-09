export default {
  translation: {logoutConfirm: {
        title: "Logout",
        description: "Are you sure you want to log out? Unsynced local changes might be lost.",
      clearLocalLabel: "Clear local data and restore defaults",
      clearLocalDesc: "Restore local shortcuts to the selected role profile",
        confirm: "Logout",
        cancel: "Cancel"
      },
    settings: {
      profile: {
        loggedInDesc: "Logged In",
        daysActive: "Days Active",
        shortcutsCount: "Shortcuts",
        guest: "Guest",
        guestDesc: "Login to sync data"
      },
      title: "Settings",
      newTabMode: {
        label: "Open in New Tab",
        description: "Shortcuts open in a new tab by default"
      },
      preventDuplicateNewTab: {
        label: "Avoid Duplicate LeafTab Tabs",
        description: "When opening a new tab, switch to the existing LeafTab in this window and close the duplicate one",
        permissionDenied: "Tabs permission is required to enable duplicate LeafTab prevention.",
        permissionFailed: "Failed to request tabs permission. Please try again."
      },
      searchEngineTabSwitch: {
        label: "Tab Engine Switch",
        description: "When the search box is focused, press Tab to cycle search engines"
      },
      searchSettings: {
        label: "Search Settings",
        description: "Manage search behaviors and smart search capabilities",
        open: "Open",
        title: "Search Settings",
        items: {
          tabSwitch: {
            label: "Tab Engine Switch",
            description: "Press Tab in the focused search box to cycle engines",
            tooltip: "Use Tab or Shift+Tab to quickly switch search engines while the search box is focused."
          },
          prefix: {
            label: "Prefix Search",
            description: "Use prefixes like g / bing / ddg / bd to override engine",
            tooltip: "Example: `g AI` searches with Google just for this query without changing your default engine."
          },
          siteDirect: {
            label: "Site Direct Search",
            description: "Use `site + keywords` to jump to a site's own search page first",
            tooltip: "Supports GitHub, GitLab, Gitee, Zhihu, Bilibili, YouTube, Google, Bing, Baidu, Wikipedia, Reddit, Amazon, and more. Example: `yt loagao`. If a site has no template, it falls back to `site:domain` search."
          },
          siteShortcut: {
            label: "Site Shortcut Suggestions",
            description: "Show built-in site shortcuts when typing site names",
            tooltip: "Typing `git` can prioritize suggestions like GitHub, GitLab, and Gitee."
          },
          anyKeyCapture: {
            label: "Any-Key Search Capture",
            description: "Start typing anywhere to focus and fill the search box",
            tooltip: "When enabled, pressing printable keys on a new tab auto-focuses the search input."
          },
          calculator: {
            label: "Calculator Preview",
            description: "Show live math result suggestions while typing expressions",
            tooltip: "Example: `12*8` shows a computed result in the dropdown."
          },
          rotatingPlaceholder: {
            label: "Rotating Search Hints",
            description: "Rotate the search box placeholder hints automatically",
            tooltip: "When turned off, the search box keeps a single fixed hint instead of rotating through multiple tips."
          }
        }
      },
      shortcutGuide: {
        label: "Shortcuts & Actions",
        description: "View common shortcuts and what they do",
        open: "View",
        title: "Shortcuts & Actions",
        dialogDescription: "LeafTab shortcut and interaction guide",
        helper: "This panel only lists shortcuts that are already supported in the current version.",
        countSuffix: "items",
        columns: {
          shortcut: "Shortcut",
          action: "Action"
        },
        sections: {
          search: "Search",
          results: "Results"
        },
        items: {
          focusSearch: "Focus the search box and select the current text",
          switchEngine: "Press Tab or Shift+Tab in the search box to switch engines",
          switchScenarioNext: "When not typing, cycle to the next scenario mode",
          bookmarksMode: "Enter bookmark search mode; browser permission may be requested on first use",
          tabsMode: "Enter tab search mode; browser permission may be requested on first use",
          navigateResults: "Move selection up or down in the results list",
          openResult: "Open the currently selected result",
          closePanel: "Close the current results panel",
          showNumberHints: "Show number hints in the results list",
          openNumberedResult: "Open the result using its number"
        },
        footer: "Tip: number hints and number shortcuts only work while the results list is open; /t and /b depend on browser permissions."
      },
      timeFormat: {
        label: "24-Hour Clock",
        description: "Display time in 24-hour format"
      },
      showSeconds: {
        label: "Show Seconds",
        description: "Display seconds in the time component"
      },
      showLunar: {
        label: "Show Lunar",
        description: "Display the lunar date below the time"
      },
      timeAnimation: {
        label: "Animation",
        description: "Rolling time transition",
        followSystemBadge: "Follow system",
        followSystemAction: "Follow system again",
        followSystemEnabled: "Following system: currently on",
        followSystemReduced: "Following system: currently off",
        overrideOn: "Individually enabled",
        overrideOff: "Individually disabled"
      },
      visualEffectsLevel: {
        label: "Smoothness Level",
        description: "Choose effect intensity based on device performance",
        low: "Low",
        medium: "Medium",
        high: "High"
      },
      showTime: {
        label: "Show Time",
        description: "Display time on the page"
      },
      timeDisplay: {
        title: "Time Display",
        description: "Customize the time style and visible details"
      },
      autoFocusSearch: {
        label: "Auto-focus Search Box",
        description: "Automatically focus the search box when entering the page"
      },
      language: {
        label: "Language",
        description: "Select interface language",
        selectPlaceholder: "Select language"
      },
      theme: {
        label: "Theme",
        description: "Switch light/dark theme or follow system",
        selectPlaceholder: "Select theme",
        system: "System",
        light: "Light",
        dark: "Dark"
      },
      accentColor: {
        label: "Accent Color",
        description: "Choose the primary color for the application"
      },
      accent: {
        dynamic: "Dynamic",
        mono: "Mono",
        green: "Green",
        blue: "Blue",
        purple: "Purple",
        orange: "Orange",
        pink: "Pink",
        red: "Red"
      },
      displayMode: {
        title: "Display Mode",
        description: "Choose the page layout style",
        blank: "Blank",
        blankDesc: "Hide time, wallpaper and shortcuts",
        rhythm: "Rhythm",
        rhythmDesc: "Keep search and shortcuts only",
        panoramic: "Panoramic",
        panoramicDesc: "Show time, weather, wallpaper and shortcuts"
      },
      shortcutsLayout: {
        label: "Shortcut Density",
        description: "Adjust the number of shortcuts per column",
        set: "Set",
        select: "Select"
      },
      shortcutsStyle: {
        label: "Shortcut Style",
        entryDescription: "Switch shortcut style and set grid columns and base rows",
        open: "Open",
        title: "Shortcut Style Settings",
        description: "Choose a shortcut style and set single-page grid columns and base rows",
        rich: "Rich",
        compact: "Minimal",
        showName: "Show Name",
        showNameDesc: "Display shortcut title below icon",
        columns: "Grid Columns",
        rows: "Base Rows"
      },
      backup: {
        label: "Data Backup & Recovery",
        description: "Import or export local layout data (.leaftab)",
        cloudTab: "Cloud Sync",
        webdavTab: "WebDAV Sync",
        import: "Import Data",
        export: "Export Data",
        importSuccess: "Data imported successfully",
        importError: "Failed to import data. Please check the file format.",
        exportSuccess: "Data exported successfully",
        importConfirmTitle: "Import and overwrite cloud?",
        importConfirmDesc: "The imported file will overwrite your cloud configuration. A cloud backup will be downloaded first.",
        importConfirmAction: "Import",
        cloudBackupDownloaded: "Cloud backup downloaded",
        progress: {
          importPreparingTitle: "Preparing import",
          importPreparingDetail: "Validating backup file...",
          importReadingLocalTitle: "Reading local data",
          importReadingLocalDetail: "Preparing to merge imported content...",
          importWritingLocalTitle: "Writing local data",
          importWritingLocalDetail: "Applying imported data to this device...",
          importMergingTitle: "Merging imported data",
          importMergingDetail: "Aligning shortcuts and bookmarks...",
          importSyncingTitle: "Syncing imported data",
          importSyncingDetail: "Uploading latest data to cloud...",
          importLongTaskTitle: "Importing data",
          importLongTaskDetail: "Writing to local data, please wait...",

          exportLongTaskTitle: "Exporting data",
          exportLongTaskDetail: "Preparing shortcuts and bookmarks...",
          exportReadingLocalTitle: "Reading local data",
          exportReadingLocalDetail: "Collecting shortcuts and bookmarks...",
          exportAssemblingTitle: "Assembling export",
          exportAssemblingDetail: "Building LeafTab backup file...",
          exportGeneratingTitle: "Generating export file",
          exportGeneratingDetail: "Almost ready to save...",

          cloudBackupLongTaskTitle: "Backing up cloud data",
          cloudBackupLongTaskDetail: "Downloading a backup snapshot before import...",
          cloudBackupReadingTitle: "Reading cloud data",
          cloudBackupReadingDetail: "Creating a pre-import backup to prevent overwrites...",
          cloudBackupImportingTitle: "Importing backup data",
          cloudBackupImportingDetail: "Writing your selected data to this device...",
        },
        cloud: {
          configTitle: "Cloud Sync Settings",
          configDesc: "Configure auto sync options and interval",
          enabledLabel: "Enable cloud sync",
          enabledDesc: "Disable to pause automatic sync; manual sync is still available",
          syncBookmarksLabel: "Sync bookmarks",
          syncBookmarksDesc: "When off, cloud sync will only sync shortcuts and settings; it won't read or write browser bookmarks.",
          bookmarkSyncSafetyReminderTitle: "Reminder",
          bookmarkSyncSafetyReminderA11yDescription: "Reminder before enabling bookmark sync",
          bookmarkSyncSafetyReminderLine1: "Sync keeps devices consistent; it is not a backup.",
          bookmarkSyncSafetyReminderLine2: "Bookmark sync is still in beta. Delays or unexpected behavior may occur in rare cases.",
          bookmarkSyncSafetyReminderLine3: "We recommend exporting a local backup before enabling bookmark sync.",
          bookmarkSyncSafetyReminderCancel: "Back up first",
          bookmarkSyncSafetyReminderConfirm: "Enable anyway",
          autoSyncToastLabel: "Show auto-sync success toast",
          autoSyncToastDesc: "Show a toast notification after scheduled auto sync succeeds",
          intervalLabel: "Auto-sync interval",
          intervalMinutes: "{{count}} minutes",
          configSaved: "Cloud sync settings saved",
        },
        webdav: {
          entry: "WebDAV Sync",
          entryDesc: "Configure remote backup and restore via WebDAV",
          configure: "Configure",
          pull: "Pull from Cloud",
          push: "Push to Cloud",
          sync: "Sync Now",
          syncBookmarksLabel: "Sync bookmarks",
          syncBookmarksDesc: "When off, WebDAV sync will only sync shortcuts and settings; it won't read or write browser bookmarks.",
          bookmarkSyncSafetyReminderTitle: "Reminder",
          bookmarkSyncSafetyReminderA11yDescription: "Reminder before enabling bookmark sync",
          bookmarkSyncSafetyReminderLine1: "Sync keeps devices consistent; it is not a backup.",
          bookmarkSyncSafetyReminderLine2: "Bookmark sync is still in beta. Delays or unexpected behavior may occur in rare cases.",
          bookmarkSyncSafetyReminderLine3: "We recommend exporting a local backup before enabling bookmark sync.",
          bookmarkSyncSafetyReminderCancel: "Back up first",
          bookmarkSyncSafetyReminderConfirm: "Enable anyway",
          url: "WebDAV URL",
          filePath: "Remote File Path",
          username: "Username",
          password: "Password",
          profileName: "Config Name",
          profileNamePlaceholder: "e.g. Home NAS",
          usernamePlaceholder: "Optional",
          passwordPlaceholder: "Optional",
          syncByScheduleLabel: "Scheduled auto sync",
          syncByScheduleDesc: "Sync at a fixed interval, good for long sessions",
          autoSyncToastLabel: "Show auto-sync success toast",
          autoSyncToastDesc: "Show a toast notification after scheduled auto sync succeeds",
          syncIntervalLabel: "Sync interval",
          syncIntervalMinutes: "{{count}} minutes",
          enabledLabel: "Enable WebDAV Sync",
          enabledDesc: "Disable to pause WebDAV automatic and manual sync",
          providerCustom: "Custom provider",
          providers: {
            jianguoyun: "Jianguoyun",
          },
          providerLabel: "WebDAV provider",
          providerPlaceholder: "Select provider",
          policyMerge: "Merge local and cloud changes when possible (recommended)",
          policyPreferRemote: "Prefer cloud version (local will be overwritten)",
          policyPreferLocal: "Prefer local version (cloud will be overwritten)",
          download: "Pull from WebDAV",
          upload: "Sync to WebDAV",
          downloading: "Pulling...",
          uploading: "Syncing...",
          downloadSuccess: "WebDAV pull succeeded",
          uploadSuccess: "WebDAV sync succeeded",
          downloadError: "WebDAV pull failed. Check your settings.",
          uploadError: "WebDAV sync failed. Check your settings.",
          syncSuccess: "Sync completed",
          syncError: "Sync failed. Check your settings.",
          authFailed: "WebDAV authentication failed. Check username or password.",
          configSaved: "WebDAV settings saved",
          policyChangeSyncTriggered: "Conflict policy updated. Synced once with the selected policy.",
          intervalChangeSyncTriggered: "Sync interval updated. Triggered one immediate sync.",
          disableWebdavBeforeCloudLogin: "WebDAV sync is currently enabled. Disable WebDAV sync before signing in to cloud sync.",
          disableWebdavBeforeCloudManage: "WebDAV sync is currently enabled. Disable WebDAV sync before managing cloud sync.",
          disableCloudBeforeWebdavEnable: "Cloud sync is currently signed in. Sign out from cloud sync before enabling WebDAV sync.",
          disableCloudBeforeWebdavConfig: "Cloud sync is currently enabled. Disable cloud sync before configuring WebDAV sync.",
          disableConfirmTitle: "Disable WebDAV Sync",
          disableConfirmDesc: "Disable WebDAV sync? Local data will remain on this device.",
          clearLocalLabel: "Clear local data and restore defaults",
          clearLocalDesc: "Restore local shortcuts to the selected role profile",
          urlRequired: "Please enter WebDAV URL first",
          defaultProfileName: "Default Profile",
          configured: "Configured and ready to sync",
          notConfigured: "Not configured yet",
          lastSyncAt: "Last sync",
          notSynced: "Not synced",
          justSynced: "Just synced",
          minutesAgo: "{{count}} minutes ago",
          hoursAgo: "{{count}} hours ago",
          disabled: "Disabled, WebDAV sync paused",
          syncOffTitle: "WebDAV is off",
          configureAction: "Configure",
          enableSyncAction: "Enable Sync",
          lastAttemptFailed: "Last sync attempt failed",
          scheduleRunning: "Scheduled sync running",
          nextSyncAtLabel: "Next sync: {{time}}",
          syncDisabled: "Enable WebDAV sync first",
          disableFinalSyncFailed: "Final sync before disabling failed. Sync has still been disabled.",
          enableConflictTitle: "Sync conflict detected",
          enableConflictDesc: "WebDAV and local data differ. Choose how to resolve."
        }
      },
      changelog: {
        title: "Changelog",
        description: "See recent feature and UX updates",
        open: "View Changelog"
      },
      privacyPolicy: "Privacy Policy",
      copyright: "All rights reserved.",
      specialThanks: "Special thanks to testers: yanshuai, Horang, Mling",
      iconAssistant: {
        title: "Send Anonymous Usage Statistics",
        desc: "Help us optimize icon support (domains only, no personal info)",
        modalTitle: "Help Improve LeafTab",
        modalDesc: "To provide better icon support, we would like to collect the domains of your shortcuts (e.g., google.com). Data is fully anonymous and contains no personal privacy or full URLs.",
        agree: "Agree and Enable",
        disagree: "Disagree",
        confirmClose: "Turning off will stop prioritized icon support. Confirm to disable?",
        adminKeyLabel: "Admin Key",
        adminKeyDesc: "Required to export the global collected domain list (self-hosting operator only)",
        adminKeyPlaceholder: "Enter admin key",
        adminKeySave: "Save",
        adminKeyClear: "Clear",
        adminKeySaved: "Admin key saved",
        adminKeyCleared: "Admin key cleared",
        adminKeyRequired: "Admin key required",
        adminKeyInvalid: "Admin key invalid or not authorized",
        downloadTitle: "Download Collected Domains",
        downloadDesc: "Domains only, deduplicated, excluding already-supported icons",
        downloadButton: "Download List",
        viewerTitle: "Open Domains Admin Page",
        viewerDesc: "View collected domains in a web dashboard with search, sort, paging, and copy",
        viewerButton: "Open Admin Page",
        viewerOpenFailed: "Failed to open admin page. Please check popup blocking.",
        reportNow: "Report Now",
        reportTriggered: "Report triggered (may be rate-limited)",
        queueStatus: "Pending: {{count}}, last report: {{last}}",
        downloadSuccess: "Domain list downloaded",
        downloadFailed: "Download failed, please try again"
      },
      adminMode: {
        tapRemaining: "Tap {{count}} more times to enter admin mode",
        enabled: "Admin mode enabled",
        alreadyEnabled: "Already in admin mode",
        disabled: "Admin mode disabled",
        switchLabel: "Admin Mode",
        switchDesc: "Enable to configure admin key and export global domain list",
        open: "Open"
      },
      adminPanel: {
        statsTitle: "Platform Stats",
        statsDesc: "Aggregated, non-sensitive metrics only",
        refresh: "Refresh",
        loading: "Loading...",
        statsLoadFailed: "Failed to load stats",
        enableHint: "Enable admin mode by tapping version in Settings first",
        usersTotal: "Registered users",
        usersToday: "New users today",
        usersYesterday: "New users yesterday",
        usersLast7d: "New users (last 7d)",
        usersLast30d: "New users (last 30d)",
        privacyConsentRate: "Anonymous analytics opt-in",
        privacyConsentUsers: "{{count}} of {{total}} users opted in",
        domainsUnique: "Unique domains",
        topUnsupportedTitle: "Top 10 Unsupported Domains",
        topUnsupportedDesc: "Sorted by user reach so we can prioritize the most valuable icon support next.",
        topUnsupportedEmpty: "Most high-traffic domains are already supported.",
        topUnsupportedUsers: "{{count}} users",
        topUnsupportedLastSeen: "Last seen: {{time}}",
        weatherDebugLabel: "Weather Debug",
        weatherDebugDesc: "Show weather debug panel (session only)"
      },
      server: {
        customUrlLabel: "Custom Backend URL",
        customUrlDesc: "Used for login and sync. Leave empty to use official server only.",
        customNamePlaceholder: "Name (optional)",
        customUrlPlaceholder: "URL (e.g. https://example.com/api)",
        customSave: "Save",
        customClear: "Clear",
        customSaved: "Custom backend URL saved",
        customCleared: "Custom backend URL cleared",
        customInvalid: "Invalid URL format"
      },
      iconLibrary: {
        label: "Icon Library URL",
        desc: "Prefer LeafTab-style icons (GitHub Pages)",
        placeholder: "URL (e.g. https://xxx.github.io/icons)",
        save: "Save",
        saved: "Icon library URL saved",
        restore: "Restore Default",
        restored: "Default icon library URL restored",
        invalid: "Invalid icon library URL"
      },
      about: {
        label: "About LeafTab",
        desc: "Version info and extension overview",
        open: "Open",
        title: "About LeafTab",
        versionLabel: "Version v{{version}}",
        content: "LeafTab is a browser new-tab extension.\nIt provides a clean start page with shortcuts, wallpaper/weather, and sync features including Cloud Sync and WebDAV.",
        openSourceNoticePrefix: "LeafTab Community Edition is open source under ",
        openSourceNoticeSuffix: ". Issues and PRs are welcome on GitHub.",
        thirdPartyLicenseNotice: "Some third-party components follow their own licenses.",
        ackTitle: "Acknowledgements",
        ackDesc: "LeafTab is built with the following open-source libraries and resources (tap to open):",
        frontend: "Frontend",
        backend: "Backend",
        resources: "Icons & Resources",
        chromeStore: "Chrome Web Store",
        edgeStore: "Edge Add-ons",
        firefoxStore: "Firefox Add-ons",
        github: "GitHub"
      }
    },
    changelog: {
      title: "Changelog",
      description: "Recent version updates",
      version: "Version",
      date: "Date",
      sections: {
        stable: "Stable Releases",
        stableDescription: "Production-ready updates for all users",
        preview: "Preview Releases",
        previewDescription: "Alpha / Beta builds for testing. Features and details may still change",
      },
      items: {
        release145OnboardingAndThemeDefaults: "Onboarding defaults: “Rhythm” mode is selected by default and the default theme color is set to green",
        release145TopNavAndShortcutGuide: "Top navigation buttons are icon-only with improved hover behavior; shortcuts guide layout is refined",
        release145SyncI18nPolish: "Sync Center and related dialogs now support bilingual copy (including bookmark sync tips and scope labels)",
        release144TranslationPromptFix: "Fixed the browser translation prompt that could appear every time LeafTab opened",
        release144AboutQqGroup: "Added the community QQ group number to the About LeafTab dialog for easier feedback and discussion",
        release144ReadmeCommunityEntry: "Added a community section to the README and aligned the 1.4.4 release information",
        release143SyncFlowAlignment: "Aligned cloud sync and WebDAV sync behavior so shortcut/settings sync can continue when bookmark differences are considered risky",
        release143WebdavProviderPolish: "Added Jianguoyun as a built-in WebDAV provider and polished provider switching, permission prompts, key checks, and first-sync flow",
        release143SyncStatusPolish: "Refined sync-center status, scope copy, and error handling to reduce false failures and stale states",
        release142BookmarkSyncDecoupling: "Fixed decoupling issues between bookmark sync and shortcut/settings sync",
        release142DangerousSyncDialogPolish: "Refined risky bookmark-sync interception dialog and guidance",
        release142SyncTestingBackupNotice: "Data sync is still in testing. Back up your data before enabling",
        release141BookmarkSyncFix: "Fixed key issues in bookmark sync",
        release141SyncStability: "Improved overall data sync stability",
        release141SyncTestingBackupNotice: "Data sync is still in testing. Please back up your data before enabling it",
        release140AlphaEncryptedBookmarkSync: "Added bookmark cloud sync, WebDAV sync, and end-to-end encrypted bookmark sync",
        release140AlphaBookmarkSearchPolish: "Returned to a simpler, more stable bookmark search flow while continuing to polish search and sync UX",
        release140AlphaKnownIssues: "Known issue: this Alpha build may still adjust some interactions and copy details",
        release137PermissionsAndSearch: "Unified store/community permission strategy and refined search engine switching with clearer hints",
        release137WallpaperAndMotion: "Aligned default wallpaper, custom wallpaper, and first-screen reveal timing to reduce refresh flicker",
        release137ScenarioAndSync: "Added scenario mode hotkey switching and fixed the dropdown plus sync-time display issues",
        release136LicenseGplv3: "Switched open-source license to GPLv3",
        release136SystemEffectsLevel: "Added a system effects intensity setting",
        release136UiPolish: "Polished UI visuals",
        release136RemoveDynamicWallpaper: "Removed the live wallpaper (performance reasons)",
        release140BookmarkSyncToggle: "Added bookmark sync (off by default); can be enabled as needed and works with the existing sync flow",
        release140CustomShortcutIcons: "Added custom shortcut icons and colors for more flexible personalization",
        release140E2EEBackup: "Added end-to-end encrypted backups to better protect privacy and security",
        release140PerformancePolish: "Improved overall performance and interaction smoothness to reduce jank and waiting",
        release139BuildIsolation: "Improved Firefox and Chrome build isolation",
        release139LowEffectsMotion: "Improved search and drawer animations in Low Effects mode",
        release139Stability: "Improved overall stability",
        release138Cleanup: "Removed unused assets and redundant files to significantly reduce package size",
        release138WallpaperAssets: "Further compressed the default wallpaper to reduce asset size",
        release138WeatherAssets: "Compressed weather videos into lighter WebM and reduced to 45 FPS",
        release133MultiEngineSwitcher: "Added multi search-engine switching for more flexible search selection",
        release133ManifestCopyPolish: "Simplified extension description copy for clearer messaging",
        release133Stability: "Routine fixes and stability improvements",
        release132UiPolish: "Refined the Settings UI and interaction details for a more consistent look",
        release132SearchAndDrawer: "Improved search and drawer interactions for smoother operations",
        release132Stability: "Fixed known issues and improved stability",
        release135UiPolish: "Optimized interface effects",
        release135VisualRefine: "Refined interaction and visual details",
        release135KnownIssuesFix: "Fixed some known issues",
        release131DynamicWallpaperFlickerFix: "Fixed Galaxy/Iridescence dynamic wallpaper flicker on some devices and completed a dependency-stability sweep for similar visual components",
        release131TimeSecondsDefaultOn: "Time setting now shows seconds by default (enabled for new users)",
        release131AdminDomainsBoard: "Admin mode now opens a dedicated domains board page with search, sorting, paging, copy, and CSV export",
        release131DomainCountUniqueUsers: "Domain count semantics now track unique users per domain; repeated reports by the same user no longer increase count, with registrable-domain matching unified (for example index.baidu.com -> baidu.com)",
        release131BackendModularDeploy: "Backend refactored from a monolithic index.js into app/routes/lib modules, with deploy script and HTTPS docs aligned to the new flow",
        release130DynamicEffectsOptimize: "Optimized global motion experience with a new Reduce Dynamic Effects toggle and unified motion-reduction behavior",
        release130DynamicWallpaperTab: "Added the new Dynamic wallpaper category with Prism, Silk, Light Rays, Beams, Galaxy, and Iridescence previews",
        release130ManualWeatherCity: "Weather now supports manual city selection with persistent storage for more predictable location display",
        release129ModeUiRefactor: "Refactored the Panorama / Rhythm / Blank mode UI with shared components and removed legacy duplicate code",
        release129WallpaperModalRefine: "Reworked the wallpaper settings dialog into four unified tabs: Bing / Weather / Color / Custom",
        release129ColorWallpaperGradients: "Added Color Wallpaper presets (12 gradients) and tuned gradient intensity, swatch radius, and preview visuals",
        release129MaskSliderByMode: "Added a wallpaper mask opacity slider (0-100) that appears only for the currently active wallpaper type on hover",
        release129ContrastAndOpacityTune: "Improved readability in Rhythm/Blank modes: default 50% corner-module opacity, stronger shortcut text shadow, and fixed white key text in light theme",
        release128ShortcutStyleDialog: "Added a dedicated shortcut style dialog with two card variants: Rich and Compact",
        release128CompactLayoutRefine: "Refined compact shortcut layout to a 9-column edge-aligned grid with consistent spacing",
        release128CompactHoverOnlyIcon: "Changed compact hover interaction to icon-only scale, removing background highlight and layout jitter",
        release128EmptyIconFallback: "Added emptyicon fallback for shortcut icons: show title initial when missing, and align Add/Edit preview with the same style",
        release128IgnoreFakeFavicons: "Filtered unreliable fallback favicon sources (DuckDuckGo / Google / gstatic favicon) to avoid false placeholder icons",
        release127CaptchaSessionFix: "Fixed frequent false captcha failures during online registration by keeping captcha generation and register validation in the same session",
        release127ProxyCookieDefaults: "Improved production session defaults (trusted proxy + cookie policy) for more stable extension-to-backend sessions",
        release127FirstLoginLocalFirst: "New users no longer see a sync conflict dialog on first login; local data is pushed to cloud with local-first priority",
        release127DeployScriptLibUpload: "Fixed backend deploy script to upload server/lib and hardened default env patching during deployment",
        release126UnifiedCompareDialog: "Unified cloud-login conflict handling with WebDAV and now open the large compare dialog directly",
        release126ConflictStrategyTabs: "Added top Tabs to switch strategy: Use Cloud / Use Local / Merge",
        release126ConflictPendingPersist: "Unresolved conflicts are preserved when closing the dialog or refreshing the page",
        release126ConflictFreezeAutoSync: "Auto-sync pauses while a conflict is pending and resumes after confirmation",
        release126CompareUiRefine: "Refined compare-detail UI by removing per-item wrappers and matching Settings-tab style",
        release125ImportLocalFirstSync: "When signed in, importing local data now syncs to cloud immediately with local-first priority",
        release125ManualCloudLocalFirst: "Manual Cloud Sync now skips conflict prompts and directly pushes local data to cloud",
        release125SyncSettingsUi: "Refined Cloud/WebDAV sync settings UI: removed extra wrappers around toggles and reordered them",
        release125WebdavCorsPermission: "WebDAV now uses extension background proxy plus per-domain runtime permission request (HTTP/HTTPS kept) for better CORS compatibility",
        release125WebdavAuthHint: "WebDAV auth failures (401/403) are now detected with a clear username/password error hint",
        release124UpdateNotice: "Added GitHub new-version detection and update prompt dialog for community builds, with direct Release link",
        release124Snooze24h: "Added a 24-hour snooze policy for “Later” to reduce repetitive prompts",
        release124ChangelogEntry: "Added a 1.2.4 entry to the in-app changelog and completed multilingual copy",
        release124ReleasePackaging: "Added a standard release packaging script so zip artifacts contain manifest.json at root",
        release124FirefoxCompat: "Fixed Firefox store package structure and adjusted manifest compatibility settings",
        release123WebdavAccessDialog: "WebDAV \"Enable Sync\" now opens a dedicated access dialog with the same style as Auth",
        release123UnifiedSyncSettings: "Unified Cloud/WebDAV sync settings UI and removed the conflict policy dropdown",
        release123AutoSyncToggles: "Added auto-sync toggle and auto-sync success toast toggle, and disable interval slider when auto-sync is off",
        release123ProviderLabel: "WebDAV card title now shows provider name instead of \"Default Profile\"",
        release123PasswordToggle: "Added show/hide password toggle to login and register password fields",
        release122Scrollbar: "Unified the About LeafTab modal scrollbar style with the Settings modal",
        release122WelcomePersist: "Persisted first-login welcome modal state to local and cloud to prevent refresh flicker",
        release122RateLimitToast: "Fixed missing 429 rate-limit toast and aligned its visual style",
        release122WebdavSchedule: "WebDAV scheduled sync now follows system time, shows next sync time, and triggers immediate sync after key config changes",
        release122CustomServer: "Added support for switching custom cloud sync server",
        release122CustomIconSource: "Added support for custom icon source URL",
        release122OnlineIconSource: "Icon source now fetches online via GitHub Pages",
        release122DynamicAccent: "Added dynamic accent color support",
        release121Webdav: "Added WebDAV sync feature",
        release121Ui: "Refined UI styles",
        release121Fixes: "Fixed several bugs",
        grid: "Shortcut area redesigned into a flat grid",
        carousel: "Added swipe pagination and mouse-wheel paging",
        entrance: "Improved entrance animations for wallpaper, search, shortcuts",
        dots: "Centered pagination dots and refined styling"
      }
    },
    updateNotice: {
      title: "New Version Available {{version}}",
      description: "A newer community build is available on GitHub.",
      currentVersion: "Current version",
      latestVersion: "Latest version",
      publishedAt: "Published: {{date}}",
      changelogTitle: "What's new",
      noChangelog: "No detailed release notes were provided.",
      imageAlt: "LeafTab Update",
      badge: "New v{{version}}",
      later: "Later",
      ignoreThisVersion: "Ignore this version",
      downloadFromGithub: "Download from GitHub",
      openRelease: "Download from GitHub",
      sampleNote1: "Unified cloud sync and WebDAV sync settings interactions",
      sampleNote2: "Added update notice dialog that links to GitHub Release",
      sampleNote3: "Improved changelog dialog layout hierarchy"
    },
    roles: {
      programmer: "Programmer",
      product_manager: "Product Manager",
      designer: "Designer",
      student: "Student",
      marketer: "Marketer",
      finance: "Finance",
      hr: "Human Resources",
      admin: "Admin",
      general: "General"
    },
    banner: {
      syncPrompt: "Sign in to sync your data",
      loginNow: "Sign in now"
    },
    languages: {
      zh: "Chinese (Simplified)",
      "zh-TW": "Chinese (Traditional)",
      en: "English",
      vi: "Vietnamese",
      ja: "Japanese",
      ko: "Korean"
    },
    weather: {
      refreshing: "Refreshing weather and location...",
      unknown: "Unknown",
      openLocationDialog: "Click to open weather location settings",
      locationSettingsTitle: "Weather Location",
      locationSettingsDesc: "Set a manual city and save",
      manualCityLabel: "Manual city (highest priority)",
      manualCityPlaceholder: "Search city, e.g. Shanghai",
      manualCityApply: "Set manual city",
      manualCityClear: "Use auto location",
      manualCityRequired: "Please enter a city name",
      manualCitySet: "Manual city updated",
      manualCityCleared: "Switched back to auto location",
      manualCityInvalid: "City lookup failed, please check the spelling",
      manualCityNeedSelect: "Please select a city from the dropdown list",
      manualCitySearchHint: "Type at least 2 characters to search",
      manualCitySearching: "Searching cities...",
      manualCityNoResult: "No matching city found",
      browserApplied: "Using browser location",
      browserUnavailable: "Browser location unavailable, switched to fallback",
      ipApplied: "Using IP location",
      ipUnavailable: "IP location unavailable, switched to fallback",
      autoSourceLabel: "Auto source",
      autoSourceIp: "Use IP location",
      autoSourceBrowser: "Use browser location",
      refreshNow: "Refresh now",
      source: {
        manual: "Manual city",
        browser: "Browser location",
        ip: "IP location",
        timezone: "Timezone fallback"
      },
      wallpaper: {
        mode: "Wallpaper Mode",
        modeDesc: "Customize minimalist mode background",
        dynamic: "Dynamic",
        bing: "Bing",
        weather: "Weather",
        color: "Color",
        custom: "Custom",
        uploadTitle: "Upload Custom Wallpaper",
        upload: "Upload Image",
        uploadDesc: "Click to upload or drag and drop images here",
        download: "Download",
        setAsWallpaper: "Set as Wallpaper",
        apply: "Set as Wallpaper",
        bingDesc: "Updates automatically every day from Bing.",
        weatherDesc: "Dynamically changes based on local weather conditions.",
        customDesc: "Upload your own image to use as wallpaper.",
        customUploaded: "Your uploaded wallpaper.",
        imageSupport: "Supports JPG, PNG, WEBP",
        maskOpacity: "Black Overlay",
        autoDimInDarkMode: "Auto-dim in Dark Mode",
        autoDimInDarkModeDesc: "When dark mode is on, increase wallpaper overlay automatically for readability.",
        colorPresets: {
          "aurora-blush": "Aurora Blush",
          "mist-lilac": "Mist Lilac",
          "mint-breeze": "Mint Breeze",
          "peach-cloud": "Peach Cloud",
          "glacier-milk": "Glacier Blue",
          "rose-water": "Rose Water",
          "sage-cream": "Sage Cream",
          "dawn-sand": "Dawn Sand",
          "lavender-snow": "Lavender Snow",
          "ocean-haze": "Ocean Haze",
          "camellia-silk": "Camellia Silk",
          "tea-ivory": "Tea Ivory"
        }
      },
      codes: {
        0: "Sunny",
        1: "Sunny",
        2: "Cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Fog",
        51: "Light Drizzle",
        53: "Moderate Drizzle",
        55: "Heavy Drizzle",
        56: "Freezing Drizzle",
        57: "Freezing Drizzle",
        61: "Light Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",
        66: "Freezing Rain",
        67: "Freezing Rain",
        71: "Light Snow",
        73: "Moderate Snow",
        75: "Heavy Snow",
        77: "Snow Grains",
        80: "Rain Showers",
        81: "Rain Showers",
        82: "Violent Rain Showers",
        85: "Snow Showers",
        86: "Snow Showers",
        95: "Thunderstorm",
        96: "Thunderstorm with Hail",
        99: "Thunderstorm with Hail"
      },
      defaultCity: "Hangzhou",
      defaultWeather: "Cloudy",
      unknownLocation: "Unknown Location",
      local: "Local"
    },
    lunar: {
      label: "Lunar"
    },
    common: {
      loading: "Loading...",
      cancel: "Cancel",
      close: "Close",
      confirm: "Confirm",
      delete: "Delete",
      save: "Save",
      current: "Current",
      clear: "Clear",
      back: "Back",
      prev: "Previous",
      next: "Next",
      refresh: "Refresh",
      settings: "Settings",
      more: "More"
    },
    user: {
      loggedIn: "Logged In",
      logout: "Log Out",
      loggedOut: "Logged out",
      days: "days",
      shortcutsCount: "shortcuts",
      logoutOfflineWarning: "You are offline or have unsynced changes. Logging out will cause data loss. Are you sure?"
    },
    search: {
      placeholder: "Type what you want to find",
      placeholderDynamic: "Type what you want to find, or paste a web address",
      placeholderHintTabSwitch: "Want a different search engine? Press Tab",
      placeholderHintCalculator: "Type 12*8 to calculate",
      placeholderHintSiteDirect: "Type github react to search GitHub",
      placeholderHintPrefix: "Type g AI to search with Google",
      enterKey: "Enter",
      actionOpen: "Open",
      actionClose: "Close",
      actionSelect: "Select",
      authorizeHistoryPermission: "Authorize",
      historyPermissionBanner: "Authorize to show browser history",
      historyPermissionPending: "Waiting for history permission...",
      historyPreparing: "Loading browser history...",
      bookmarksPermissionBanner: "Authorize to search browser bookmarks",
      bookmarksPermissionPending: "Waiting for bookmarks permission...",
      bookmarksPreparing: "Preparing bookmarks...",
      tabsPermissionBanner: "Authorize to search open tabs",
      tabsPermissionPending: "Waiting for tabs permission...",
      tabsPreparing: "Preparing open tabs...",
      permissionHistoryDenied: "History permission not granted. You can authorize again from the top of the dropdown.",
      permissionBookmarksDenied: "Bookmarks permission not granted. You can request it again next time you use /b.",
      permissionTabsDenied: "Tabs permission not granted. You can request it again next time you use /t.",
      permissionRequestFailed: "Permission request failed. Please try again.",
      noBookmarks: "No matching bookmarks found",
      noTabs: "No matching tabs found",
      currentTabLabel: "Current tab",
      justNow: "Just now",
      calculatorCopied: "Result copied to clipboard",
      calculatorCopyFailed: "Copy failed. Please copy manually.",
      systemEngine: "System default",
      useEngineSearch: "Search with {{engine}}",
      prefixEngineInlineHint: "Search with {{engine}}",
      historyTitle: "Recent searches",
      clearHistory: "Clear",
      noHistory: "No recent searches"
    },
    groups: {
      edit: "Edit",
      addShortcut: "New Shortcut"
    },
    sidebar: {
      toggle: "Toggle Sidebar",
      title: "Sidebar",
      description: "Displays the mobile sidebar."
    },
    context: {
      open: "Open",
      edit: "Edit",
      copyLink: "Copy link",
      delete: "Delete",
      addShortcut: "Add Shortcut",
      newShortcut: "New Shortcut",
      pinToTop: "Pin to top",
      pinTop: "Pin selected to top",
      pinBottom: "Pin selected to bottom",
      select: "Select",
      unselect: "Unselect",
      selectedCount: "{{count}} selected",
      deleteSelected: "Delete selected",
      moveToScenario: "Move to scenario",
      noScenarioTarget: "No scenario to move to",
      selectBeforeMove: "Select shortcuts first",
      multiSelect: "Multi-select",
      cancelMultiSelect: "Exit multi-select"
    },
    shortcutModal: {
      addTitle: "Add Shortcut",
      editTitle: "Edit Shortcut",
      nameLabel: "Name",
      namePlaceholder: "Enter shortcut title",
      urlLabel: "URL",
      urlPlaceholder: "Enter URL",
      icon: {
        modeGroup: "Icon source",
        modeOfficialShort: "Official",
        modeFaviconShort: "Online",
        modeLetterShort: "Letter",
        modeCustomShort: "Custom",
        modeCustomReplaceShort: "Change",
        modeCustomLoadingShort: "Processing",
        autoOfficial: "Auto switch to official icon when available",
        officialUnavailable: "An official icon is not available for this shortcut yet",
        networkHint: "Online icons may fail to load; if so, it will fall back to a letter icon",
        customFileInvalid: "This image can't be used as an icon right now. Please try another one."
      },
      errors: {
        fillAll: "Please fill in all fields",
        fillAllDesc: "Enter shortcut title and URL",
        duplicateUrl: "A shortcut for this site already exists",
        duplicateUrlDesc: "Only one shortcut per site is allowed. Please use a different URL."
      }
    },
    popupShortcut: {
      title: "Add Current Page",
      loading: "Reading current tab information...",
      unsupported: "This page can't be saved directly. Switch to an http or https page and try again.",
      targetScenario: "Will be saved to \"{{name}}\"",
      ready: "The current tab title and URL were filled automatically.",
      saved: "Shortcut saved",
      scenarioLabel: "Save to scenario",
      scenarioPlaceholder: "Choose a scenario"
    },
    onboarding: {
      welcome: "Welcome to LeafTab",
      selectRole: "Select your role to start a personalized experience",
      skip: "Skip",
      start: "Start",
      next: "Next",
      layoutTip: "Layout can be changed later in settings",
      stepAppearanceTitle: "Set theme & language",
      stepAppearanceDesc: "Choose appearance and language, you can change later in Settings",
      stepRoleTitle: "Choose your role",
      stepRoleDesc: "Used to initialize recommended shortcuts and layout",
      stepLayoutTitle: "Choose layout style",
      stepLayoutDesc: "Decide how the home page is arranged",
      stepPermissionsTitle: "Grant permissions",
      stepPermissionsDesc: "Enable history and bookmarks access to unlock the full search experience",
      historyPermissionTitle: "Browser history",
      historyPermissionDesc: "Allow LeafTab to show recent browsing records and related search suggestions",
      bookmarksPermissionTitle: "Bookmarks",
      bookmarksPermissionDesc: "Allow LeafTab to search and open your browser bookmarks directly",
      tabsPermissionTitle: "Browser tabs",
      tabsPermissionDesc: "Allow LeafTab to search open tabs and prevent duplicate LeafTab tabs",
      authorize: "Authorize",
      authorizing: "Requesting...",
      authorized: "Authorized",
      unsupported: "Unavailable",
      permissionTip: "You can skip this step and grant these permissions later from normal use.",
      enterHome: "Enter LeafTab"
    },
    auth: {
      description: "Log in or register to save your preferences.",
      tabs: { login: "Login", register: "Register" },
      server: { label: "Server", official: "Official Server", custom: "Custom Server" },
      labels: { username: "Username", password: "Password", captcha: "Captcha" },
      placeholders: {
        usernameInput: "Enter username",
        passwordInput: "Enter password",
        usernameSet: "Set username",
        passwordSet: "Set password",
        captchaInput: "Enter captcha"
      },
      tips: {
        username: "Supports letters, numbers, email format; length 2–32",
        password: "Password length must be 8–24",
        refreshCaptcha: "Click to refresh"
      },
      buttons: {
        loggingIn: "Logging in...",
        login: "Login",
        googleLogin: "Continue with Google",
        registering: "Registering...",
        register: "Register"
      },
      toast: {
        loginSuccess: "Logged in! Welcome back, {{username}}",
        registerSuccess: "Registered successfully! Please log in, {{username}}"
      },
      errors: {
        usernamePasswordRequired: "Please enter username and password",
        captchaRequired: "Please enter captcha",
        usernameFormatInvalid: "Invalid username format",
        passwordLength: "Password must be 8–24 characters",
        loginFailed: "Login failed",
        registerFailed: "Registration failed",
        loginRequestFailed: "Login request failed. Check network or server.",
        registerRequestFailed: "Registration request failed. Check network or server.",
        userExists: "Username already exists",
        userNotFound: "User not found",
        invalidPassword: "Invalid password",
        invalidCredentials: "Invalid username or password",
        invalidUsernameFormatBackend: "Invalid username format. Use 3-20 alphanumeric characters or underscores.",
        passwordTooShort: "Password must be at least 6 characters long.",
        credentialsRequired: "Username and password are required",
        invalidCaptcha: "Invalid captcha",
        internalError: "Internal server error",
        tooManyRequests: "Too many requests, please try again later",
        googleLoginFailed: "Google login failed",
        googleUnsupported: "Google sign-in is not supported in this browser",
        googleUnsupportedDetailed: "Google sign-in is not available in the current environment: {{reason}}",
        googleCanceled: "Google login canceled",
        googleTimedOut: "Google login timed out. Please try again.",
        googlePopupBlocked: "Google login popup was blocked. Please allow popups and try again.",
        googleOAuthFailed: "Google OAuth failed. Please try again.",
        googleParseFailed: "Failed to complete Google sign-in callback",
        googleClientIdMissing: "Google client ID is missing in extension config",
        googleWebClientIdMissing: "Google sign-in is not configured for web mode. Set VITE_GOOGLE_WEB_OAUTH_CLIENT_ID.",
        googleRedirectMismatch: "This extension ID is not allowed in Google OAuth callbacks yet. Current redirect URI: {{redirectUri}}",
        googleNotEnabled: "Google login is not enabled on this server",
        invalidGoogleToken: "Google token verification failed, please sign in again",
        googleTokenMissing: "Google token is missing",
        googleUserIdMissing: "Google account identifier is missing",
        googleStateMismatch: "Google sign-in state validation failed. Please try again."
      }
    },
    shortcutDelete: {
      confirm: "Delete",
      cancel: "Cancel",
      title: "Delete Shortcut",
      description: "Are you sure you want to delete this shortcut?",
      bulkTitle: "Delete shortcuts",
      bulkDescription: "Are you sure you want to delete the selected {{count}} shortcuts?"
    },
    syncConflict: {
      title: "Sync Conflict",
      description: "Local and cloud shortcuts differ. Please choose which one to use.",
      merge: "Merge Both",
      useCloud: "Use Cloud",
      useLocal: "Use Local"
    },
    syncUndo: {
      message: "Using {{chosen}} config. Backed up {{backup}} config. Undo within {{seconds}}s.",
      undo: "Undo",
      undone: "Sync choice undone",
      backupToast: "Auto-backed up {{backup}} config",
      backupToastBoth: "Auto-backed up both cloud and local configs"
    },
    scenario: {
      title: "Scenario Mode",
      defaultName: "Working mode",
      unnamed: "Untitled",
      createTitle: "New Scenario Mode",
      createDescription: "Set name, color and icon",
      editTitle: "Edit Scenario Mode",
      editDescription: "Modify name, color and icon",
      nameLabel: "Mode Name",
      namePlaceholder: "Enter mode name",
      colorLabel: "Color",
      iconLabel: "Icon",
      actionEdit: "Edit scenario mode",
      actionDelete: "Delete scenario mode",
      colorPicker: "Pick a color",
      iconPicker: "Pick an icon",
      createButton: "New Scenario Mode",
      addButton: "Add",
      saveButton: "Save",
      deleteTitle: "Delete Scenario Mode",
      deleteConfirm: "Are you sure you want to delete this scenario mode? This will permanently delete all groups and shortcuts within this mode. Please proceed with caution.",
      deleteConfirmWithTarget: "Are you sure you want to delete \"{{name}}\"? This will permanently delete all groups and shortcuts within this mode. Please proceed with caution.",
      deleteButton: "Delete",
      toast: {
        created: "Scenario mode created",
        updated: "Scenario mode updated",
        deleted: "Scenario mode deleted",
        switched: "Switched to: {{name}}"
      }
    },
    toast: {
      cloudSynced: "Cloud configuration synced",
      cloudAutoSyncSuccess: "Cloud auto-sync completed",
      cloudSyncFailed: "Failed to sync cloud configuration",
      cloudSyncRateLimited: "Saved locally. Cloud sync is rate limited and will retry later.",
      syncFailed: "Sync failed",
      syncCloudApplied: "Cloud configuration applied",
      syncLocalApplied: "Local configuration applied",
      syncMergeApplied: "Cloud and local configurations merged",
      linkCopied: "Link copied",
      linkCopyFailed: "Failed to copy link",
      loadedFromCache: "Loaded from local cache (Offline Mode)",
      sessionExpired: "Session expired, please log in again",
      shortcutCreateFailed: "Unable to create shortcut",
        alreadyOnPage: "Already on the current page"
      },
      leaftabSync: {
        provider: {
          webdav: "WebDAV sync",
          cloud: "Cloud sync",
          generic: "Sync"
        },
        webdav: {
          actions: {
            mkcol: "Create folder",
            upload: "Write",
            download: "Read",
            delete: "Delete"
          },
          error: {
            withPath: "WebDAV {{action}} failed ({{status}}): {{path}}",
            noPath: "WebDAV {{action}} failed ({{status}})"
          }
        },
        cloud: {
          error: {
            lockedTryFix: "Cloud sync was locked by another device. Tried to auto-fix; please retry if it still fails.",
            remoteCommitChanged: "Cloud data just changed. Please sync again.",
            parentCommitRequired: "A newer cloud version exists. Pull the latest data before overwriting.",
            httpStatus: "Cloud sync failed ({{status}})",
            generic: "Cloud sync failed"
          }
        }
      },
      leaftabSyncRunner: {
        progressDetailDefault: "Syncing in background. You can continue using LeafTab.",
        permissionTitle: "Checking bookmark permission",
        permissionDetail: "LeafTab needs permission to access bookmarks.",
        bookmarksPermissionDeniedToast: "Bookmark permission not granted. This run will sync shortcuts and settings only.",
        bookmarksPermissionDeniedToastAlt: "Bookmark permission not granted. Only shortcuts and settings will be synced.",
        successTitle: "Sync complete",
        successToastFallback: "Sync complete",
        successDetailFallback: "Local and remote data have been processed.",
        webdav: {
          prepareTitle: "Preparing sync",
          prepareDetail: "Reading local and WebDAV status",
          disable: {
            title: "Disabling sync",
            detail: "Running the final sync and turning off sync",
            finalSyncTitle: "Syncing final changes",
            closingTitle: "Turning off sync",
            clearingTitle: "Clearing local data",
            doneTitle: "Sync disabled"
          }
        },
        cloud: {
          prepareTitle: "Preparing cloud sync",
          prepareDetail: "Reading local and cloud account status",
          lockConflict: {
            autoFixToast: "Detected a cloud sync lock conflict (409). Auto-fixing and retrying...",
            autoFixTitle: "Detected stale cloud lock, auto-fixing",
            autoFixDetail: "Releasing the old lock and retrying sync",
            failedToast: "Cloud sync failed (409): The sync lock is held by another device. Close sync on other devices and retry, or wait about 2 minutes."
          },
          commitConflict: {
            realignTitle: "Detected cloud version change, realigning state",
            realignDetail: "Waiting for the latest state to take effect before retrying"
          }
        }
      },
      leaftabSyncActions: {
        dataDetail: {
          withBookmarks: "Processing shortcuts and bookmarks",
          shortcutsOnly: "Processing shortcuts"
        },
        bookmarksPermissionRequired: "Bookmark permission not granted. Unable to repair sync.",
        webdav: {
          inProgress: "WebDAV sync is in progress. Please wait.",
          syncingTitle: "Syncing to WebDAV",
          repair: {
            pullTitle: "Overwriting local data with WebDAV",
            pushTitle: "Overwriting WebDAV with local data",
            pullSuccess: "Local data overwritten with WebDAV data",
            pushSuccess: "WebDAV overwritten with local data",
            pullFailed: "Failed to overwrite local data with WebDAV",
            pushFailed: "Failed to overwrite WebDAV with local data"
          }
        },
        cloud: {
          inProgress: "Cloud sync is in progress. Please wait.",
          syncingTitle: "Syncing to cloud",
          repair: {
            pullTitle: "Overwriting local data with cloud data",
            pushTitle: "Overwriting cloud with local data",
            pullSuccess: "Local data overwritten with cloud data",
            pushSuccess: "Cloud overwritten with local data"
          }
        }
      },
      syncPreview: {
        hint: {
          local: "Strikethrough items on the right will be removed from cloud after sync.",
          cloud: "Strikethrough items on the left will be removed from local after sync.",
          merge: "Merge keeps both sides with deduplication (local-first)."
        },
        noComparable: "No comparable shortcuts were found."
      },
      leaftabSyncCenter: {
      title: "Sync Center",
      description: "A WebDAV-based sync center focused on scenarios, shortcuts, and bookmarks.",
      bookmarkScope: "Bookmark sync scope: {{scope}}",
      summary: "{{shortcuts}} shortcuts, {{scenarios}} scenarios, {{bookmarks}} bookmarks",
      stateLabel: "Status",
      nav: {
        syncing: "Syncing",
        attention: "Needs attention"
      },
      status: {
        syncing: "Syncing",
        conflict: "Action required",
        error: "Failed",
        ready: "Ready"
      },
      state: {
        analyzing: "Analyzing sync status...",
        syncing: "Syncing in background",
        syncingDescription: "LeafTab is comparing local and remote data and writing back changes. Just wait for it to finish.",
        initRequired: "Initialization required",
        initDescription: "Both local and remote have data. Choose an initialization strategy first, then background sync can start.",
        ready: "Merge sync is ready",
        readyDescription: "The new sync engine can push, pull, and merge scenarios, shortcuts, and your browser bookmarks root."
      },
      actions: {
        syncing: "Syncing..."
      }
    },
    leaftabSyncDialog: {
      description: "Manage LeafTab sync status, manual sync, and WebDAV configuration here.",
      scopeDefault: "Bookmarks",
      lastSyncEmpty: "No records",
      lastSyncUnavailable: "Not synced",
      manualSyncOnly: "Manual sync only",
      autoSyncOn: "Auto sync is on",
      enableSync: "Enable sync",
      disableSync: "Disable sync",
      repair: "Repair sync",
      cloudOverwriteLocal: "Cloud overwrites local",
      localOverwriteCloud: "Local overwrites cloud",
      remoteOverwriteLocal: "WebDAV overwrites local",
      localOverwriteRemote: "Local overwrites WebDAV",
      tabs: {
        cloud: "Cloud",
        webdav: "WebDAV"
      },
      metrics: {
        localShortcuts: "Local shortcuts",
        localBookmarks: "Local bookmarks",
        remoteShortcuts: "Remote shortcuts",
        remoteBookmarks: "Remote bookmarks"
      },
      details: {
        lastSync: "Last sync",
        nextSync: "Next sync",
        scope: "Scope"
      },
      cloud: {
        bookmarkSyncDisabledBanner: "Bookmark sync is off. Currently only shortcuts and settings will be synced.",
        enableBookmarkSyncAction: "Turn on",
        connectedFallback: "LeafTab account",
        unsignedTitle: "Signed out",
        unsignedSubtitle: "Sign in to sync",
        loginToStart: "Sign in to configure",
        signedOut: "Signed out",
        connectedSubtitle: "Signed in, syncing LeafTab data",
        disabledSubtitle: "Signed in, enable sync in Cloud settings",
        openSettingsToEnable: "Enable",
        ready: "Connected",
        disabled: "Disabled",
        error: "Failed",
        enableViaSettings: "Enable sync",
        manage: "Manage cloud sync",
        scopeRich: "Shortcuts, {{scope}}",
        scopeShortcutsOnly: "Shortcuts & settings only"
      },
      webdav: {
        connectedFallback: "WebDAV",
        unconfiguredTitle: "WebDAV not enabled",
        unconfiguredSubtitle: "Not configured, set it up first",
        enabledSubtitle: "Configured, syncing to WebDAV",
        disabledSubtitle: "Configured, sync is disabled",
        configureToStart: "Configure",
        enableToStart: "Configured, enable to start",
        scopeWithLabel: "Shortcuts, {{scope}}"
      }
    },
      leaftabSyncEncryption: {
      cloudNotEnabledTitle: "Cloud sync is off",
      cloudNotEnabledPill: "Off",
      webdavNotEnabledTitle: "WebDAV sync is off",
      webdavNotEnabledPill: "Off",
      statusReadyTitle: "End-to-end encryption is on",
      statusMissingTitle: "Sync passphrase not set",
      statusReadyPill: "Protected",
      statusMissingPill: "Not set",
      setupTitle: "Set sync passphrase",
      unlockTitle: "Enter sync passphrase",
      setupDescription: "Set an end-to-end encryption passphrase for {{provider}}. The server can't read your data or recover this passphrase.",
      unlockDescription: "Enter the sync passphrase for {{provider}} to unlock encrypted cloud data.",
      setupConfirm: "Save passphrase",
      unlockConfirm: "Unlock sync",
      e2eeSetupDescription: "Your data is encrypted locally before being uploaded to cloud or WebDAV. Only devices with this passphrase can decrypt it.",
      e2eeUnlockDescription: "Synced data is stored encrypted in the cloud. Enter the correct passphrase to decrypt it on this device.",
      passphraseLabel: "Sync passphrase",
      passphrasePlaceholder: "At least 8 characters; letters and numbers recommended",
      passphraseHint: "This is for sync encryption, not your account password.",
      confirmLabel: "Confirm passphrase",
      confirmPlaceholder: "Re-enter to confirm",
      setupChecklistTitle: "Before you continue",
	      checklist: {
	        serverCannotAccess: "We do not store this passphrase and cannot read your encrypted sync data.",
	        cannotRecover: "If you forget this passphrase, existing encrypted sync data cannot be recovered.",
	        newDeviceUnlock: "When you switch devices or clear local data, you'll need to enter this passphrase again."
	      },
	      deviceUnlockDescription: "After this device is unlocked, you won't need to enter it again for future sync.",
	      errors: {
	        missingMetadata: "Missing sync encryption metadata",
	        incorrectPassphrase: "Incorrect sync passphrase",
	        invalidConfig: "Invalid sync encryption configuration"
	      },
	      toast: {
	        saved: "Sync passphrase saved",
	        unlocked: "Sync data unlocked",
	        saveFailed: "Failed to save sync passphrase"
	      }
	    },
	    leaftabDangerousSync: {
	      title: "Risky Sync Intercepted",
	      description: "A significant change in bookmark counts was detected. Auto-sync has been paused.",
	      riskDescription: "Bookmarks are expected to change from {{from}} to {{to}}, potentially removing about {{loss}} items.",
	      localBookmarks: "Local bookmarks",
	      remoteBookmarks: "{{provider}} bookmarks",
	      continueWithoutBookmarks: "Continue syncing shortcuts and settings",
	      continueWithoutBookmarksHint: "This will not change bookmarks in this run; only shortcuts and settings will be synced.",
	      deferBookmarks: "Handle bookmarks later",
	      advancedActions: "Advanced",
	      useRemotePlain: "Keep {{provider}} bookmarks (local will be replaced)",
	      useLocalPlain: "Keep local bookmarks ({{provider}} will be replaced)",
	      toast: {
	        skipBookmarks: "This run will skip bookmarks and sync shortcuts and settings only.",
	        cloudBookmarksDisabled: "Cloud sync is enabled, but “Sync bookmarks” is temporarily turned off.",
	        webdavBookmarksDisabled: "WebDAV sync is enabled, but “Sync bookmarks” is temporarily turned off."
	      }
	    },
	    leaftabFirstSync: {
      title: "Initialize Sync",
      description: "Choose how the first LeafTab sync should handle your browser bookmarks, local LeafTab data, and remote data.",
      recommended: "Recommended",
      processingBadge: "Processing",
      processingInline: "Initializing sync in background, please wait...",
      processingFooter: "Initializing sync in background. Please do not close this window. You'll be returned to normal sync status when finished.",
      footer: "This step only appears for the first sync. After initialization, LeafTab will use the new merge-based sync mode.",
      bookmarkScopeDescription: "Bookmarks are synced directly against the real browser root, without making an extra copy. Current scope: {{scope}}.",
      choice: {
        push: {
          title: "Upload local data",
          description: "Use this device as the source of truth and upload your current LeafTab data and browser bookmarks to WebDAV."
        },
        pull: {
          title: "Download remote data",
          description: "Overwrite the current local LeafTab data and browser bookmarks with the latest remote snapshot on WebDAV."
        },
        merge: {
          title: "Smart merge",
          description: "Merge local and remote data, keeping items unique to each side and automatically resolving most conflicts."
        }
      }
    },
    sync: {
      cloud: "Cloud",
      local: "Local"
    },
    pagination: {
      page: "Page {{page}}"
    },
    bookmarks: {
      roots: {
        toolbar: "Bookmarks bar",
        other: "Other bookmarks",
        mobile: "Mobile bookmarks"
      },
      scope: {
        rootsLabel: "Bookmarks bar, Other bookmarks"
      },
      errors: {
        permissionDenied: "Bookmarks permission not granted. Sync stopped to protect existing bookmarks.",
        apiUnsupported: "Bookmarks API is not available in this environment.",
        apiCallFailed: "Bookmarks API call failed"
      }
    }
  }
};
