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
      minimalistMode: {
        label: "Minimalist Mode",
        description: "Hide time, wallpaper, and shortcuts when enabled"
      },
      freshMode: {
        label: "Fresh Mode",
        description: "Move Settings and User icons to top-right, hide time/weather/wallpaper, keep search and shortcuts only"
      },
      newTabMode: {
        label: "Open in New Tab",
        description: "Shortcuts open in a new tab by default"
      },
      timeFormat: {
        label: "24-Hour Clock",
        description: "Display time in 24-hour format"
      },
      showSeconds: {
        label: "Show Seconds",
        description: "Display seconds in the time component"
      },
      showTime: {
        label: "Show Time",
        description: "Display time on the page"
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
        webdav: {
          entry: "WebDAV Sync",
          entryDesc: "Configure remote backup and restore via WebDAV",
          configure: "Configure",
          pull: "Pull from Cloud",
          push: "Push to Cloud",
          sync: "Sync Now",
          url: "WebDAV URL",
          filePath: "Remote File Path",
          username: "Username",
          password: "Password",
          profileName: "Config Name",
          profileNamePlaceholder: "e.g. Home NAS",
          usernamePlaceholder: "Optional",
          passwordPlaceholder: "Optional",
          syncModeLabel: "Sync mode (choose one)",
          syncOnChangeLabel: "Auto sync on change",
          syncOnChangeDesc: "Automatically sync to WebDAV after local changes",
          syncByScheduleLabel: "Scheduled auto sync",
          syncByScheduleDesc: "Sync at a fixed interval, good for long sessions",
          syncIntervalLabel: "Sync interval",
          syncIntervalMinutes: "{{count}} minutes",
          enabledLabel: "Enable WebDAV Sync",
          enabledDesc: "Disable to pause WebDAV automatic and manual sync",
          providerCustom: "Custom provider",
          providerLabel: "WebDAV provider",
          providerPlaceholder: "Select provider",
          conflictPolicyLabel: "Conflict handling",
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
          lastAttemptFailed: "Last sync attempt failed",
          scheduleRunning: "Scheduled sync running",
          syncDisabled: "Enable WebDAV sync first"
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
        domainsUnique: "Unique domains",
        weatherDebugLabel: "Weather Debug",
        weatherDebugDesc: "Show weather debug panel (session only)"
      },
      about: {
        label: "About LeafTab",
        desc: "Version info and extension overview",
        open: "Open",
        title: "About LeafTab",
        content: "LeafTab is a browser new-tab extension.\nIt provides a clean start page with shortcuts, wallpaper/weather, and sync features including Cloud Sync and WebDAV.",
        ackTitle: "Acknowledgements",
        ackDesc: "LeafTab is built with the following open-source libraries and resources (tap to open):",
        frontend: "Frontend",
        backend: "Backend",
        resources: "Icons & Resources"
      }
    },
    changelog: {
      title: "Changelog",
      description: "Recent version updates",
      version: "Version",
      date: "Date",
      items: {
        grid: "Shortcut area redesigned into a flat grid",
        carousel: "Added swipe pagination and mouse-wheel paging",
        entrance: "Improved entrance animations for wallpaper, search, shortcuts",
        dots: "Centered pagination dots and refined styling"
      }
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
      wallpaper: {
        mode: "Wallpaper Mode",
        modeDesc: "Customize minimalist mode background",
        bing: "Daily Bing Wallpaper",
        weather: "Weather Wallpaper",
        custom: "Custom Wallpaper",
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
        imageSupport: "Supports JPG, PNG, WEBP"
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
      confirm: "Confirm",
      delete: "Delete",
      save: "Save",
      current: "Current",
      clear: "Clear",
      back: "Back",
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
      placeholder: "Search for content...",
      placeholderDynamic: "Search for content or enter URL...",
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
      addPage: "New Page",
      move: "Move to",
      newShortcut: "New Shortcut",
      pinToTop: "Pin to top",
      moveToPageDesc: "Select destination page"
    },
    pageDelete: {
      title: "Delete Page",
      description: "Are you sure you want to delete this page? This will remove all shortcuts on the page."
    },
    shortcutModal: {
      addTitle: "Add Shortcut",
      editTitle: "Edit Shortcut",
      nameLabel: "Name",
      namePlaceholder: "Enter shortcut title",
      urlLabel: "URL",
      urlPlaceholder: "Enter URL",
      errors: {
        fillAll: "Please fill in all fields",
        fillAllDesc: "Enter shortcut title and URL"
      }
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
      stepLayoutDesc: "Decide how the home page is arranged"
    },
    auth: {
      description: "Log in or register to save your preferences.",
      tabs: { login: "Login", register: "Register" },
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
        tooManyRequests: "Too many requests, please try again later"
      }
    },
    shortcutDelete: {
      confirm: "Delete",
      cancel: "Cancel",
      title: "Delete Shortcut",
      description: "Are you sure you want to delete this shortcut?"
    },
    syncConflict: {
      title: "Sync Conflict",
      description: "Local and cloud shortcuts differ. Please choose which one to use.",
      useCloud: "Use Cloud",
      useLocal: "Use Local"
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
        deleted: "Scenario mode deleted"
      }
    },
    toast: {
      cloudSynced: "Cloud configuration synced",
      cloudSyncFailed: "Failed to sync cloud configuration",
      syncFailed: "Sync failed",
      syncCloudApplied: "Cloud configuration applied",
      syncLocalApplied: "Local configuration applied",
      linkCopied: "Link copied",
      linkCopyFailed: "Failed to copy link",
      loadedFromCache: "Loaded from local cache (Offline Mode)",
      sessionExpired: "Session expired, please log in again",
      shortcutCreateFailed: "Unable to create shortcut",
      alreadyOnPage: "Already on the current page"
    },
    sync: {
      cloud: "Cloud",
      local: "Local"
    },
    pagination: {
      page: "Page {{page}}"
    }
  }
};
