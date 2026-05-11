import { useTranslation } from 'react-i18next';
import type { AppDialogsProps } from '@/components/AppDialogs';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';
import {
  useShortcutDomainContext,
  useShortcutFeatureActionsContext,
  useShortcutUiContext,
} from '@/features/shortcuts/app/ShortcutAppContext';
import { resetShortcutEditorState } from '@/features/shortcuts/app/shortcutEditorState';
import {
  useLeafTabSyncActionsContext,
  useLeafTabSyncConfigContext,
  useLeafTabSyncDialogContext,
  useLeafTabSyncMetaContext,
} from '@/features/sync/app/LeafTabSyncContext';
import { getDefaultLocalBackupExportScope } from '@/utils/localBackupScopePolicy';
import { createLeafTabWebdavEncryptionScopeKey } from '@/utils/leafTabSyncEncryption';
import { isShortcutFolder } from '@/utils/shortcutFolders';
import { readWebdavConfigFromStorage } from '@/utils/webdavConfig';

type AuthModalProps = AppDialogsProps['authModalProps'];
type ShortcutModalProps = AppDialogsProps['shortcutModalProps'];
type ScenarioEditDialogProps = AppDialogsProps['scenarioEditDialogProps'];
type SettingsModalProps = AppDialogsProps['settingsModalProps'];
type SearchSettingsModalProps = AppDialogsProps['searchSettingsModalProps'];
type ShortcutGuideDialogProps = AppDialogsProps['shortcutGuideDialogProps'];
type ShortcutIconSettingsDialogProps = AppDialogsProps['shortcutIconSettingsDialogProps'];
type AdminModalProps = AppDialogsProps['adminModalProps'];
type AboutModalProps = AppDialogsProps['aboutModalProps'];
type BackupDialogProps = AppDialogsProps['exportBackupDialogProps'];
type ImportSourceDialogProps = AppDialogsProps['importSourceDialogProps'];
type WebdavConfigDialogProps = AppDialogsProps['webdavConfigDialogProps'];
type CloudSyncConfigDialogProps = AppDialogsProps['cloudSyncConfigDialogProps'];
type ImportConfirmDialogProps = AppDialogsProps['importConfirmDialog'];
type DisableConsentDialogProps = AppDialogsProps['disableConsentDialog'];
type ConfirmSyncDialogProps = AppDialogsProps['confirmSyncDialog'];

export type AuthDialogInput = {
  isAuthModalOpen: AuthModalProps['isOpen'];
  onOpenChange: AuthModalProps['onOpenChange'];
  onLoginSuccess: AuthModalProps['onLoginSuccess'];
  setAuthModalMode: (mode: Exclude<AuthModalProps['mode'], undefined>) => void;
  apiServer: AuthModalProps['apiServer'];
  onApiServerChange: AuthModalProps['onApiServerChange'];
  customApiUrl: AuthModalProps['customApiUrl'];
  customApiName: AuthModalProps['customApiName'];
  defaultApiBase: AuthModalProps['defaultApiBase'];
  authModalMode: AuthModalProps['mode'];
  linkedUsername: AuthModalProps['linkedUsername'];
};

export type SettingsDialogsInput = {
  settingsOpen: SettingsModalProps['isOpen'];
  setSettingsOpen: SettingsModalProps['onOpenChange'];
  username: SettingsModalProps['username'];
  onLogout: SettingsModalProps['onLogout'];
  shortcutsCount: SettingsModalProps['shortcutsCount'];
  displayMode: SettingsModalProps['displayMode'];
  onDisplayModeChange: SettingsModalProps['onDisplayModeChange'];
  shortcutIconCornerRadius: Exclude<ShortcutModalProps['iconCornerRadius'], undefined>;
  onShortcutIconCornerRadiusChange: (cornerRadius: Exclude<ShortcutModalProps['iconCornerRadius'], undefined>) => void;
  shortcutIconScale: Exclude<ShortcutModalProps['iconScale'], undefined>;
  onShortcutIconScaleChange: (scale: Exclude<ShortcutModalProps['iconScale'], undefined>) => void;
  shortcutIconAppearance: Exclude<ShortcutModalProps['iconAppearance'], undefined>;
  onShortcutIconAppearanceChange: (appearance: Exclude<ShortcutModalProps['iconAppearance'], undefined>) => void;
  shortcutCompactShowTitle: SettingsModalProps['shortcutCompactShowTitle'];
  onShortcutCompactShowTitleChange: SettingsModalProps['onShortcutCompactShowTitleChange'];
  shortcutGridColumns: SettingsModalProps['shortcutGridColumns'];
  onShortcutGridColumnsChange: SettingsModalProps['onShortcutGridColumnsChange'];
  onOpenShortcutIconSettings: SettingsModalProps['onOpenShortcutIconSettings'];
  openInNewTab: SettingsModalProps['openInNewTab'];
  onOpenInNewTabChange: SettingsModalProps['onOpenInNewTabChange'];
  preventDuplicateNewTab: SettingsModalProps['preventDuplicateNewTab'];
  onPreventDuplicateNewTabChange: SettingsModalProps['onPreventDuplicateNewTabChange'];
  onOpenSearchSettings: SettingsModalProps['onOpenSearchSettings'];
  visualEffectsLevel: SettingsModalProps['visualEffectsLevel'];
  onVisualEffectsLevelChange: SettingsModalProps['onVisualEffectsLevelChange'];
  disableSyncCardAccentAnimation: SettingsModalProps['disableSyncCardAccentAnimation'];
  showTime: SettingsModalProps['showTime'];
  onShowTimeChange: SettingsModalProps['onShowTimeChange'];
  wallpaperMode: SettingsModalProps['wallpaperMode'];
  onWallpaperModeChange: SettingsModalProps['onWallpaperModeChange'];
  bingWallpaper: SettingsModalProps['bingWallpaper'];
  customWallpaper: SettingsModalProps['customWallpaper'];
  onCustomWallpaperChange: SettingsModalProps['onCustomWallpaperChange'];
  weatherCode: SettingsModalProps['weatherCode'];
  colorWallpaperId: SettingsModalProps['colorWallpaperId'];
  dynamicWallpaperSrc: SettingsModalProps['dynamicWallpaperSrc'];
  onColorWallpaperIdChange: SettingsModalProps['onColorWallpaperIdChange'];
  wallpaperMaskOpacity: SettingsModalProps['wallpaperMaskOpacity'];
  onWallpaperMaskOpacityChange: SettingsModalProps['onWallpaperMaskOpacityChange'];
  setWallpaperSettingsOpen: (open: boolean) => void;
  privacyConsent: SettingsModalProps['privacyConsent'];
  onPrivacyConsentChange: SettingsModalProps['onPrivacyConsentChange'];
  onOpenAdminModal: SettingsModalProps['onOpenAdminModal'];
  onOpenAboutModal: SettingsModalProps['onOpenAboutModal'];
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  setShortcutGuideOpen: (open: boolean) => void;
};

export type UtilityDialogsInput = {
  importSourceDialogOpen: boolean;
  setImportSourceDialogOpen: (open: boolean) => void;
  searchSettingsOpen: SearchSettingsModalProps['isOpen'];
  setSearchSettingsOpen: SearchSettingsModalProps['onOpenChange'];
  onBackToSettings: SearchSettingsModalProps['onBackToSettings'];
  tabSwitchSearchEngine: SearchSettingsModalProps['tabSwitchSearchEngine'];
  onTabSwitchSearchEngineChange: SearchSettingsModalProps['onTabSwitchSearchEngineChange'];
  searchPrefixEnabled: SearchSettingsModalProps['searchPrefixEnabled'];
  onSearchPrefixEnabledChange: SearchSettingsModalProps['onSearchPrefixEnabledChange'];
  searchSiteDirectEnabled: SearchSettingsModalProps['searchSiteDirectEnabled'];
  onSearchSiteDirectEnabledChange: SearchSettingsModalProps['onSearchSiteDirectEnabledChange'];
  searchSiteShortcutEnabled: SearchSettingsModalProps['searchSiteShortcutEnabled'];
  onSearchSiteShortcutEnabledChange: SearchSettingsModalProps['onSearchSiteShortcutEnabledChange'];
  searchAnyKeyCaptureEnabled: SearchSettingsModalProps['searchAnyKeyCaptureEnabled'];
  onSearchAnyKeyCaptureEnabledChange: SearchSettingsModalProps['onSearchAnyKeyCaptureEnabledChange'];
  searchCalculatorEnabled: SearchSettingsModalProps['searchCalculatorEnabled'];
  onSearchCalculatorEnabledChange: SearchSettingsModalProps['onSearchCalculatorEnabledChange'];
  searchRotatingPlaceholderEnabled: SearchSettingsModalProps['searchRotatingPlaceholderEnabled'];
  onSearchRotatingPlaceholderEnabledChange: SearchSettingsModalProps['onSearchRotatingPlaceholderEnabledChange'];
  searchBarPosition: SearchSettingsModalProps['searchBarPosition'];
  onSearchBarPositionChange: SearchSettingsModalProps['onSearchBarPositionChange'];
  shortcutGuideOpen: ShortcutGuideDialogProps['open'];
  setShortcutGuideOpen: ShortcutGuideDialogProps['onOpenChange'];
  shortcutIconSettingsOpen: ShortcutIconSettingsDialogProps['open'];
  setShortcutIconSettingsOpen: ShortcutIconSettingsDialogProps['onOpenChange'];
  adminModalOpen: AdminModalProps['open'];
  setAdminModalOpen: AdminModalProps['onOpenChange'];
  onExportDomains: AdminModalProps['onExportDomains'];
  gridHitDebugEnabled: AdminModalProps['gridHitDebugEnabled'];
  onGridHitDebugEnabledChange: AdminModalProps['onGridHitDebugEnabledChange'];
  weatherDebugEnabled: AdminModalProps['weatherDebugEnabled'];
  onWeatherDebugEnabledChange: AdminModalProps['onWeatherDebugEnabledChange'];
  onWeatherDebugApply: AdminModalProps['onWeatherDebugApply'];
  customApiUrl: AdminModalProps['customApiUrl'];
  onCustomApiUrlChange: AdminModalProps['onCustomApiUrlChange'];
  customApiName: AdminModalProps['customApiName'];
  onCustomApiNameChange: AdminModalProps['onCustomApiNameChange'];
  aboutModalOpen: AboutModalProps['open'];
  setAboutModalOpen: AboutModalProps['onOpenChange'];
  defaultAboutTab: AboutModalProps['defaultTab'];
};

export type SyncProviderDialogsInput = {
  webdavDialogOpen: WebdavConfigDialogProps['open'];
  onBackToParent: WebdavConfigDialogProps['onBackToParent'];
  setWebdavDialogOpen: WebdavConfigDialogProps['onOpenChange'];
  enableAfterSave: WebdavConfigDialogProps['enableAfterSave'];
  showConnectionFields: WebdavConfigDialogProps['showConnectionFields'];
  setWebdavEnableAfterConfigSave: (open: boolean) => void;
  setWebdavShowConnectionFields: (open: boolean) => void;
  setPendingWebdavEnableScopeKey: (scopeKey: string | null) => void;
  setConfirmDisableWebdavSyncOpen: (open: boolean) => void;
  cloudSyncConfigOpen: CloudSyncConfigDialogProps['open'];
  setCloudSyncConfigOpen: CloudSyncConfigDialogProps['onOpenChange'];
  onLinkGoogle: CloudSyncConfigDialogProps['onLinkGoogle'];
  onCloudSyncLogout: CloudSyncConfigDialogProps['onLogout'];
};

export type ConsentDialogsInput = {
  confirmDisableConsentOpen: DisableConsentDialogProps['open'];
  setConfirmDisableConsentOpen: DisableConsentDialogProps['onOpenChange'];
  onPrivacyConsent: (value: boolean) => void;
};

export function useShortcutAppDialogsController({
  shortcutIconCornerRadius,
  shortcutIconScale,
  shortcutIconAppearance,
  authDialog,
  settingsDialogs,
  utilityDialogs,
  syncProviderDialogs,
  consentDialogs,
}: {
  shortcutIconCornerRadius: ShortcutModalProps['iconCornerRadius'];
  shortcutIconScale: ShortcutModalProps['iconScale'];
  shortcutIconAppearance: ShortcutModalProps['iconAppearance'];
  authDialog: AuthDialogInput;
  settingsDialogs: SettingsDialogsInput;
  utilityDialogs: UtilityDialogsInput;
  syncProviderDialogs: SyncProviderDialogsInput;
  consentDialogs: ConsentDialogsInput;
}) {
  const { t } = useTranslation();
  const { state: domainState } = useShortcutDomainContext();
  const { state: uiState, actions: uiActions } = useShortcutUiContext();
  const shortcutActions = useShortcutFeatureActionsContext();
  const syncActions = useLeafTabSyncActionsContext();
  const syncConfigState = useLeafTabSyncConfigContext();
  const syncDialogState = useLeafTabSyncDialogContext();
  const syncMeta = useLeafTabSyncMetaContext();
  const scenarioEditMode = domainState.scenarioModes.find(
    (mode) => mode.id === uiState.currentEditScenarioId,
  ) ?? null;

  const shortcutModalProps = {
    isOpen: uiState.shortcutEditOpen,
    onOpenChange: (open) => {
      uiActions.setShortcutEditOpen(open);
      if (!open) {
        resetShortcutEditorState({
          setShortcutModalMode: uiActions.setShortcutModalMode,
          setSelectedShortcut: uiActions.setSelectedShortcut,
          setEditingTitle: uiActions.setEditingTitle,
          setEditingUrl: uiActions.setEditingUrl,
          setCurrentInsertIndex: uiActions.setCurrentInsertIndex,
        });
      }
    },
    mode: uiState.shortcutModalMode,
    initialShortcut: uiState.selectedShortcut?.shortcut
      ? {
          ...uiState.selectedShortcut.shortcut,
          title: uiState.editingTitle,
          url: uiState.editingUrl,
        }
      : {
          title: uiState.editingTitle,
          url: uiState.editingUrl,
          icon: '',
        },
    iconCornerRadius: shortcutIconCornerRadius,
    iconScale: shortcutIconScale,
    iconAppearance: shortcutIconAppearance,
    onSave: shortcutActions.handleSaveShortcutEdit,
  } satisfies ShortcutModalProps;

  const shortcutDeleteDialogProps = {
    open: uiState.shortcutDeleteOpen,
    onOpenChange: uiActions.setShortcutDeleteOpen,
    title: isShortcutFolder(uiState.selectedShortcut?.shortcut)
      ? t('shortcutDelete.folderTitle', { defaultValue: '删除文件夹' })
      : t('shortcutDelete.title'),
    description: isShortcutFolder(uiState.selectedShortcut?.shortcut)
      ? t('shortcutDelete.folderDescription', { defaultValue: '删除后，文件夹里的快捷方式也会一起删除。' })
      : t('shortcutDelete.description'),
    onConfirm: shortcutActions.handleConfirmDeleteShortcut,
  } satisfies AppDialogsProps['shortcutDeleteDialogProps'];

  const scenarioCreateDialogProps = {
    open: uiState.scenarioCreateOpen,
    onOpenChange: uiActions.setScenarioCreateOpen,
    onSubmit: shortcutActions.handleCreateScenarioMode,
  } satisfies AppDialogsProps['scenarioCreateDialogProps'];

  const scenarioEditDialogProps = {
    open: uiState.scenarioEditOpen,
    onOpenChange: uiActions.setScenarioEditOpen,
    onSubmit: shortcutActions.handleUpdateScenarioMode,
    title: t('scenario.editTitle'),
    submitText: t('common.save'),
    mode: scenarioEditMode as ScenarioEditDialogProps['mode'],
  } satisfies AppDialogsProps['scenarioEditDialogProps'];

  const authModalProps = {
    isOpen: authDialog.isAuthModalOpen,
    onOpenChange: authDialog.onOpenChange,
    onLoginSuccess: authDialog.onLoginSuccess,
    onGoogleLinkSuccess: () => {
      authDialog.setAuthModalMode('login');
    },
    apiServer: authDialog.apiServer,
    onApiServerChange: authDialog.onApiServerChange,
    customApiUrl: authDialog.customApiUrl,
    customApiName: authDialog.customApiName,
    defaultApiBase: authDialog.defaultApiBase,
    allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
    mode: authDialog.authModalMode,
    linkedUsername: authDialog.linkedUsername,
  } satisfies AuthModalProps;

  const settingsModalProps = {
    isOpen: settingsDialogs.settingsOpen,
    onOpenChange: settingsDialogs.setSettingsOpen,
    username: settingsDialogs.username,
    onLogin: syncActions.handleRequestCloudLogin,
    onLogout: settingsDialogs.onLogout,
    shortcutsCount: settingsDialogs.shortcutsCount,
    displayMode: settingsDialogs.displayMode,
    onDisplayModeChange: settingsDialogs.onDisplayModeChange,
    shortcutCompactShowTitle: settingsDialogs.shortcutCompactShowTitle,
    onShortcutCompactShowTitleChange: settingsDialogs.onShortcutCompactShowTitleChange,
    shortcutGridColumns: settingsDialogs.shortcutGridColumns,
    onShortcutGridColumnsChange: settingsDialogs.onShortcutGridColumnsChange,
    onOpenShortcutIconSettings: settingsDialogs.onOpenShortcutIconSettings,
    openInNewTab: settingsDialogs.openInNewTab,
    onOpenInNewTabChange: settingsDialogs.onOpenInNewTabChange,
    preventDuplicateNewTab: settingsDialogs.preventDuplicateNewTab,
    onPreventDuplicateNewTabChange: settingsDialogs.onPreventDuplicateNewTabChange,
    onOpenSearchSettings: settingsDialogs.onOpenSearchSettings,
    visualEffectsLevel: settingsDialogs.visualEffectsLevel,
    onVisualEffectsLevelChange: settingsDialogs.onVisualEffectsLevelChange,
    disableSyncCardAccentAnimation: settingsDialogs.disableSyncCardAccentAnimation,
    showTime: settingsDialogs.showTime,
    onShowTimeChange: settingsDialogs.onShowTimeChange,
    onExportData: syncActions.handleExportData,
    onOpenImportSourceDialog: () => utilityDialogs.setImportSourceDialogOpen(true),
    wallpaperMode: settingsDialogs.wallpaperMode,
    onWallpaperModeChange: settingsDialogs.onWallpaperModeChange,
    bingWallpaper: settingsDialogs.bingWallpaper,
    customWallpaper: settingsDialogs.customWallpaper,
    onCustomWallpaperChange: settingsDialogs.onCustomWallpaperChange,
    weatherCode: settingsDialogs.weatherCode,
    colorWallpaperId: settingsDialogs.colorWallpaperId,
    dynamicWallpaperSrc: settingsDialogs.dynamicWallpaperSrc,
    onColorWallpaperIdChange: settingsDialogs.onColorWallpaperIdChange,
    wallpaperMaskOpacity: settingsDialogs.wallpaperMaskOpacity,
    onWallpaperMaskOpacityChange: settingsDialogs.onWallpaperMaskOpacityChange,
    onOpenWallpaperSettings: () => settingsDialogs.setWallpaperSettingsOpen(true),
    privacyConsent: settingsDialogs.privacyConsent,
    onPrivacyConsentChange: settingsDialogs.onPrivacyConsentChange,
    onOpenAdminModal: settingsDialogs.onOpenAdminModal,
    onOpenAboutModal: settingsDialogs.onOpenAboutModal,
    onCloudSyncNow: syncActions.handleCloudSyncNowFromCenter,
    onOpenSyncCenter: () => {
      settingsDialogs.setSettingsOpen(false);
      settingsDialogs.setLeafTabSyncDialogOpen(true);
    },
    onOpenWebdavConfig: syncActions.handleOpenWebdavConfig,
    onWebdavSync: syncActions.resolveWebdavConflict,
    onWebdavEnable: syncActions.handleEnableWebdavSync,
    onWebdavDisable: syncActions.handleDisableWebdavSync,
    onOpenShortcutGuide: () => settingsDialogs.setShortcutGuideOpen(true),
  } satisfies SettingsModalProps;

  const searchSettingsModalProps = {
    isOpen: utilityDialogs.searchSettingsOpen,
    onOpenChange: utilityDialogs.setSearchSettingsOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
    tabSwitchSearchEngine: utilityDialogs.tabSwitchSearchEngine,
    onTabSwitchSearchEngineChange: utilityDialogs.onTabSwitchSearchEngineChange,
    searchPrefixEnabled: utilityDialogs.searchPrefixEnabled,
    onSearchPrefixEnabledChange: utilityDialogs.onSearchPrefixEnabledChange,
    searchSiteDirectEnabled: utilityDialogs.searchSiteDirectEnabled,
    onSearchSiteDirectEnabledChange: utilityDialogs.onSearchSiteDirectEnabledChange,
    searchSiteShortcutEnabled: utilityDialogs.searchSiteShortcutEnabled,
    onSearchSiteShortcutEnabledChange: utilityDialogs.onSearchSiteShortcutEnabledChange,
    searchAnyKeyCaptureEnabled: utilityDialogs.searchAnyKeyCaptureEnabled,
    onSearchAnyKeyCaptureEnabledChange: utilityDialogs.onSearchAnyKeyCaptureEnabledChange,
    searchCalculatorEnabled: utilityDialogs.searchCalculatorEnabled,
    onSearchCalculatorEnabledChange: utilityDialogs.onSearchCalculatorEnabledChange,
    searchRotatingPlaceholderEnabled: utilityDialogs.searchRotatingPlaceholderEnabled,
    onSearchRotatingPlaceholderEnabledChange: utilityDialogs.onSearchRotatingPlaceholderEnabledChange,
    searchBarPosition: utilityDialogs.searchBarPosition,
    onSearchBarPositionChange: utilityDialogs.onSearchBarPositionChange,
  } satisfies SearchSettingsModalProps;

  const shortcutGuideDialogProps = {
    open: utilityDialogs.shortcutGuideOpen,
    onOpenChange: utilityDialogs.setShortcutGuideOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
  } satisfies ShortcutGuideDialogProps;

  const shortcutIconSettingsDialogProps = {
    open: utilityDialogs.shortcutIconSettingsOpen,
    onOpenChange: utilityDialogs.setShortcutIconSettingsOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
    compactShowTitle: settingsDialogs.shortcutCompactShowTitle,
    columns: settingsDialogs.shortcutGridColumns,
    onSaveStyle: ({ compactShowTitle, columns }) => {
      settingsDialogs.onShortcutCompactShowTitleChange(compactShowTitle);
      settingsDialogs.onShortcutGridColumnsChange(columns);
    },
    appearance: settingsDialogs.shortcutIconAppearance,
    cornerRadius: settingsDialogs.shortcutIconCornerRadius,
    scale: settingsDialogs.shortcutIconScale,
    onSave: ({ appearance, cornerRadius, scale }) => {
      settingsDialogs.onShortcutIconAppearanceChange(appearance);
      settingsDialogs.onShortcutIconCornerRadiusChange(cornerRadius);
      settingsDialogs.onShortcutIconScaleChange(scale);
    },
  } satisfies ShortcutIconSettingsDialogProps;

  const adminModalProps = {
    open: utilityDialogs.adminModalOpen,
    onOpenChange: utilityDialogs.setAdminModalOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
    onExportDomains: utilityDialogs.onExportDomains,
    gridHitDebugEnabled: utilityDialogs.gridHitDebugEnabled,
    onGridHitDebugEnabledChange: utilityDialogs.onGridHitDebugEnabledChange,
    weatherDebugEnabled: utilityDialogs.weatherDebugEnabled,
    onWeatherDebugEnabledChange: utilityDialogs.onWeatherDebugEnabledChange,
    onWeatherDebugApply: utilityDialogs.onWeatherDebugApply,
    customApiUrl: utilityDialogs.customApiUrl,
    onCustomApiUrlChange: utilityDialogs.onCustomApiUrlChange,
    customApiName: utilityDialogs.customApiName,
    onCustomApiNameChange: utilityDialogs.onCustomApiNameChange,
    allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
  } satisfies AdminModalProps;

  const aboutModalProps = {
    open: utilityDialogs.aboutModalOpen,
    onOpenChange: utilityDialogs.setAboutModalOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
    defaultTab: utilityDialogs.defaultAboutTab,
  } satisfies AboutModalProps;

  const exportBackupDialogProps = {
    open: syncDialogState.exportBackupDialogOpen,
    onOpenChange: syncActions.setExportBackupDialogOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
    mode: 'export',
    availableScope: {
      shortcuts: true,
      bookmarks: true,
    },
    defaultScope: {
      ...getDefaultLocalBackupExportScope(),
    },
    onConfirm: syncActions.executeExportData,
  } satisfies BackupDialogProps;

  const importSourceDialogProps = {
    open: utilityDialogs.importSourceDialogOpen,
    onOpenChange: utilityDialogs.setImportSourceDialogOpen,
    onBackToSettings: utilityDialogs.onBackToSettings,
    onImportData: syncActions.handleImportData,
  } satisfies ImportSourceDialogProps;

  const importBackupDialogProps = {
    open: syncDialogState.importBackupDialogOpen,
    onOpenChange: syncActions.handleImportBackupDialogOpenChange,
    onBackToSettings: utilityDialogs.onBackToSettings,
    mode: 'import',
    availableScope: syncDialogState.importBackupScopePayload
      ? {
          shortcuts: Boolean(syncDialogState.importBackupScopePayload.exportScope.shortcuts),
          bookmarks: Boolean(syncDialogState.importBackupScopePayload.exportScope.bookmarks),
        }
      : {
          shortcuts: true,
          bookmarks: true,
        },
    defaultScope: syncDialogState.importBackupScopePayload
      ? {
          shortcuts: true,
          bookmarks: syncConfigState.cloudSyncBookmarksEnabled
            && Boolean(syncDialogState.importBackupScopePayload.exportScope.bookmarks),
        }
      : {
          shortcuts: true,
          bookmarks: syncConfigState.cloudSyncBookmarksEnabled,
        },
    onConfirm: syncActions.handleImportBackupScopeConfirm,
  } satisfies BackupDialogProps;

  const webdavConfigDialogProps = {
    open: syncProviderDialogs.webdavDialogOpen,
    onBackToParent: syncProviderDialogs.onBackToParent,
    onOpenChange: (open) => {
      syncProviderDialogs.setWebdavDialogOpen(open);
      if (!open) {
        syncProviderDialogs.setWebdavEnableAfterConfigSave(false);
        syncProviderDialogs.setWebdavShowConnectionFields(false);
        syncProviderDialogs.setPendingWebdavEnableScopeKey(null);
      }
    },
    enableAfterSave: syncProviderDialogs.enableAfterSave,
    showConnectionFields: syncProviderDialogs.showConnectionFields,
    onEnableAfterSave: async () => {
      const nextConfig = readWebdavConfigFromStorage({ allowDisabled: true });
      const nextScopeKey = createLeafTabWebdavEncryptionScopeKey(
        nextConfig?.url || '',
        syncMeta.resolveLeafTabSyncRootPath(nextConfig),
      );
      syncProviderDialogs.setWebdavEnableAfterConfigSave(false);
      syncProviderDialogs.setWebdavShowConnectionFields(false);
      syncProviderDialogs.setPendingWebdavEnableScopeKey(nextScopeKey || null);
    },
    onSaveSuccess: async () => {
      return;
    },
    onDisableSync: async () => {
      syncProviderDialogs.setConfirmDisableWebdavSyncOpen(true);
    },
  } satisfies WebdavConfigDialogProps;

  const cloudSyncConfigDialogProps = {
    open: syncProviderDialogs.cloudSyncConfigOpen,
    onBackToParent: syncProviderDialogs.onBackToParent,
    onOpenChange: syncProviderDialogs.setCloudSyncConfigOpen,
    onSaveSuccess: syncActions.handleCloudSyncConfigSaved,
    onLinkGoogle: syncProviderDialogs.onLinkGoogle,
    onLogout: syncProviderDialogs.onCloudSyncLogout,
  } satisfies CloudSyncConfigDialogProps;

  const confirmSyncDialog = {
    open: false,
    onOpenChange: () => {},
    confirmChoice: null,
    onChoiceChange: () => {},
    enableChoiceSwitch: false,
    requireDecision: false,
    title: t('syncConflict.title'),
    description: t('syncConflict.description'),
    confirmCloudLabel: t('syncConflict.useCloud'),
    confirmLocalLabel: t('syncConflict.useLocal'),
    confirmMergeLabel: t('syncConflict.merge'),
    cloudCount: 0,
    cloudTime: '',
    cloudPayload: null,
    localCount: 0,
    localTime: '',
    localPayload: null,
    onConfirm: () => {},
    onCancel: () => {},
  } satisfies ConfirmSyncDialogProps;

  const importConfirmDialog = {
    open: syncDialogState.importConfirmOpen,
    setOpen: syncActions.setImportConfirmOpen,
    payload: syncDialogState.importPendingPayload,
    setPayload: syncActions.setImportPendingPayload,
    busy: syncDialogState.importConfirmBusy,
    setBusy: syncActions.setImportConfirmBusy,
    downloadCloudBackupEnvelope: async () => {},
    applyUndoPayload: syncActions.handleImportConfirmApply,
    onSuccess: () => settingsDialogs.setSettingsOpen(false),
  } satisfies ImportConfirmDialogProps;

  const disableConsentDialog = {
    open: consentDialogs.confirmDisableConsentOpen,
    onOpenChange: consentDialogs.setConfirmDisableConsentOpen,
    onAgree: () => {
      consentDialogs.setConfirmDisableConsentOpen(false);
      consentDialogs.onPrivacyConsent(true);
    },
    onDisagree: () => {
      consentDialogs.setConfirmDisableConsentOpen(false);
      consentDialogs.onPrivacyConsent(false);
    },
  } satisfies DisableConsentDialogProps;

  return {
    appDialogsProps: {
      shortcutModalProps,
      shortcutDeleteDialogProps,
      scenarioCreateDialogProps,
      scenarioEditDialogProps,
      authModalProps,
      settingsModalProps,
      searchSettingsModalProps,
      shortcutGuideDialogProps,
      shortcutIconSettingsDialogProps,
      adminModalProps,
      aboutModalProps,
      exportBackupDialogProps,
      importBackupDialogProps,
      importSourceDialogProps,
      webdavConfigDialogProps,
      cloudSyncConfigDialogProps,
      confirmSyncDialog,
      importConfirmDialog,
      disableConsentDialog,
    } satisfies AppDialogsProps,
  };
}
