import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppDialogsProps } from '@/components/AppDialogs';
import { ENABLE_CUSTOM_API_SERVER } from '@/config/distribution';
import { LazyAppDialogs } from '@/lazy/components';
import type { WebdavConfig } from '@/types/webdav';
import { getDefaultLocalBackupExportScope } from '@/utils/localBackupScopePolicy';
import { createLeafTabWebdavEncryptionScopeKey } from '@/utils/leafTabSyncEncryption';
import { isShortcutFolder } from '@/utils/shortcutFolders';
import { readWebdavConfigFromStorage } from '@/utils/webdavConfig';
import { resetShortcutEditorState } from '@/features/shortcuts/app/shortcutEditorState';
import { useShortcutAppDialogsController } from '@/features/shortcuts/app/useShortcutAppDialogsController';

type ShortcutModalProps = AppDialogsProps['shortcutModalProps'];
type AuthModalProps = AppDialogsProps['authModalProps'];
type SettingsModalProps = AppDialogsProps['settingsModalProps'];
type SearchSettingsModalProps = AppDialogsProps['searchSettingsModalProps'];
type ShortcutGuideDialogProps = AppDialogsProps['shortcutGuideDialogProps'];
type ShortcutIconSettingsDialogProps = AppDialogsProps['shortcutIconSettingsDialogProps'];
type AdminModalProps = AppDialogsProps['adminModalProps'];
type AboutModalProps = AppDialogsProps['aboutModalProps'];
type BackupDialogProps = AppDialogsProps['exportBackupDialogProps'];
type WebdavConfigDialogProps = AppDialogsProps['webdavConfigDialogProps'];
type CloudSyncConfigDialogProps = AppDialogsProps['cloudSyncConfigDialogProps'];
type ImportConfirmDialogProps = AppDialogsProps['importConfirmDialog'];
type DisableConsentDialogProps = AppDialogsProps['disableConsentDialog'];

type BackupScopePayload = {
  exportScope: {
    shortcuts?: boolean;
    bookmarks?: boolean;
  };
} | null;

type AuthDialogInput = {
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

type SettingsDialogsInput = {
  settingsOpen: SettingsModalProps['isOpen'];
  setSettingsOpen: SettingsModalProps['onOpenChange'];
  username: SettingsModalProps['username'];
  onLogin: SettingsModalProps['onLogin'];
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
  onExportData: SettingsModalProps['onExportData'];
  onImportData: SettingsModalProps['onImportData'];
  wallpaperMode: SettingsModalProps['wallpaperMode'];
  onWallpaperModeChange: SettingsModalProps['onWallpaperModeChange'];
  bingWallpaper: SettingsModalProps['bingWallpaper'];
  customWallpaper: SettingsModalProps['customWallpaper'];
  onCustomWallpaperChange: SettingsModalProps['onCustomWallpaperChange'];
  weatherCode: SettingsModalProps['weatherCode'];
  colorWallpaperId: SettingsModalProps['colorWallpaperId'];
  onColorWallpaperIdChange: SettingsModalProps['onColorWallpaperIdChange'];
  wallpaperMaskOpacity: SettingsModalProps['wallpaperMaskOpacity'];
  onWallpaperMaskOpacityChange: SettingsModalProps['onWallpaperMaskOpacityChange'];
  setWallpaperSettingsOpen: (open: boolean) => void;
  privacyConsent: SettingsModalProps['privacyConsent'];
  onPrivacyConsentChange: SettingsModalProps['onPrivacyConsentChange'];
  onOpenAdminModal: SettingsModalProps['onOpenAdminModal'];
  onOpenAboutModal: SettingsModalProps['onOpenAboutModal'];
  onCloudSyncNow: SettingsModalProps['onCloudSyncNow'];
  setLeafTabSyncDialogOpen: (open: boolean) => void;
  onOpenWebdavConfig: SettingsModalProps['onOpenWebdavConfig'];
  onWebdavSync: SettingsModalProps['onWebdavSync'];
  onWebdavEnable: SettingsModalProps['onWebdavEnable'];
  onWebdavDisable: SettingsModalProps['onWebdavDisable'];
  setShortcutGuideOpen: (open: boolean) => void;
};

type UtilityDialogsInput = {
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

type BackupDialogsInput = {
  exportBackupDialogOpen: BackupDialogProps['open'];
  setExportBackupDialogOpen: BackupDialogProps['onOpenChange'];
  onExportBackupConfirm: BackupDialogProps['onConfirm'];
  importBackupDialogOpen: BackupDialogProps['open'];
  onImportBackupDialogOpenChange: BackupDialogProps['onOpenChange'];
  importBackupScopePayload: BackupScopePayload;
  cloudSyncBookmarksEnabled: boolean;
  onImportBackupConfirm: BackupDialogProps['onConfirm'];
  importConfirmOpen: ImportConfirmDialogProps['open'];
  setImportConfirmOpen: ImportConfirmDialogProps['setOpen'];
  importPendingPayload: ImportConfirmDialogProps['payload'];
  setImportPendingPayload: ImportConfirmDialogProps['setPayload'];
  importConfirmBusy: ImportConfirmDialogProps['busy'];
  setImportConfirmBusy: ImportConfirmDialogProps['setBusy'];
  onApplyImportUndoPayload: ImportConfirmDialogProps['applyUndoPayload'];
  setSettingsOpen: (open: boolean) => void;
};

type SyncProviderDialogsInput = {
  webdavDialogOpen: WebdavConfigDialogProps['open'];
  onBackToParent: WebdavConfigDialogProps['onBackToParent'];
  setWebdavDialogOpen: WebdavConfigDialogProps['onOpenChange'];
  enableAfterSave: WebdavConfigDialogProps['enableAfterSave'];
  showConnectionFields: WebdavConfigDialogProps['showConnectionFields'];
  setWebdavEnableAfterConfigSave: (open: boolean) => void;
  setWebdavShowConnectionFields: (open: boolean) => void;
  setPendingWebdavEnableScopeKey: (scopeKey: string | null) => void;
  resolveLeafTabSyncRootPath: (config: WebdavConfig | null) => string;
  leafTabWebdavEnabled: boolean;
  webdavSyncing: boolean;
  onWebdavSaveSuccessAutoSync: () => Promise<unknown>;
  setConfirmDisableWebdavSyncOpen: (open: boolean) => void;
  cloudSyncConfigOpen: CloudSyncConfigDialogProps['open'];
  setCloudSyncConfigOpen: CloudSyncConfigDialogProps['onOpenChange'];
  onCloudSyncConfigSaved: CloudSyncConfigDialogProps['onSaveSuccess'];
  onLinkGoogle: CloudSyncConfigDialogProps['onLinkGoogle'];
  onCloudSyncLogout: CloudSyncConfigDialogProps['onLogout'];
};

type ConsentDialogsInput = {
  confirmDisableConsentOpen: DisableConsentDialogProps['open'];
  setConfirmDisableConsentOpen: DisableConsentDialogProps['onOpenChange'];
  onPrivacyConsent: (value: boolean) => void;
};

export type ShortcutAppDialogsLayerProps = {
  shouldMountAppDialogs: boolean;
  authDialog: AuthDialogInput;
  settingsDialogs: SettingsDialogsInput;
  utilityDialogs: UtilityDialogsInput;
  backupDialogs: BackupDialogsInput;
  syncProviderDialogs: SyncProviderDialogsInput;
  consentDialogs: ConsentDialogsInput;
};

export function ShortcutAppDialogsLayer({
  shouldMountAppDialogs,
  authDialog,
  settingsDialogs,
  utilityDialogs,
  backupDialogs,
  syncProviderDialogs,
  consentDialogs,
}: ShortcutAppDialogsLayerProps) {
  const { t } = useTranslation();
  const {
    shortcutDialogs,
    scenarioDialogs,
    utilityDialogs: controlledUtilityDialogs,
    consentDialogs: controlledConsentDialogs,
  } = useShortcutAppDialogsController({
    shortcutIconCornerRadius: settingsDialogs.shortcutIconCornerRadius,
    shortcutIconScale: settingsDialogs.shortcutIconScale,
    shortcutIconAppearance: settingsDialogs.shortcutIconAppearance,
    utilityDialogs: {
      searchSettingsOpen: utilityDialogs.searchSettingsOpen,
      setSearchSettingsOpen: utilityDialogs.setSearchSettingsOpen,
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
      shortcutGuideOpen: utilityDialogs.shortcutGuideOpen,
      setShortcutGuideOpen: utilityDialogs.setShortcutGuideOpen,
      shortcutIconSettingsOpen: utilityDialogs.shortcutIconSettingsOpen,
      setShortcutIconSettingsOpen: utilityDialogs.setShortcutIconSettingsOpen,
      compactShowTitle: settingsDialogs.shortcutCompactShowTitle,
      onCompactShowTitleChange: settingsDialogs.onShortcutCompactShowTitleChange,
      columns: settingsDialogs.shortcutGridColumns,
      onColumnsChange: settingsDialogs.onShortcutGridColumnsChange,
      appearance: settingsDialogs.shortcutIconAppearance,
      onAppearanceChange: settingsDialogs.onShortcutIconAppearanceChange,
      cornerRadius: settingsDialogs.shortcutIconCornerRadius,
      onCornerRadiusChange: settingsDialogs.onShortcutIconCornerRadiusChange,
      scale: settingsDialogs.shortcutIconScale,
      onScaleChange: settingsDialogs.onShortcutIconScaleChange,
      adminModalOpen: utilityDialogs.adminModalOpen,
      setAdminModalOpen: utilityDialogs.setAdminModalOpen,
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
      aboutModalOpen: utilityDialogs.aboutModalOpen,
      setAboutModalOpen: utilityDialogs.setAboutModalOpen,
      defaultAboutTab: utilityDialogs.defaultAboutTab,
    },
    consentDialogs: {
      confirmDisableConsentOpen: consentDialogs.confirmDisableConsentOpen,
      setConfirmDisableConsentOpen: consentDialogs.setConfirmDisableConsentOpen,
      onPrivacyConsent: consentDialogs.onPrivacyConsent,
    },
  });

  if (!shouldMountAppDialogs) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyAppDialogs
        shortcutModalProps={{
          isOpen: shortcutDialogs.shortcutEditOpen,
          onOpenChange: (open) => {
            shortcutDialogs.setShortcutEditOpen(open);
            if (!open) {
              resetShortcutEditorState({
                setShortcutModalMode: shortcutDialogs.setShortcutModalMode,
                setSelectedShortcut: shortcutDialogs.setSelectedShortcut,
                setEditingTitle: shortcutDialogs.setEditingTitle,
                setEditingUrl: shortcutDialogs.setEditingUrl,
                setCurrentInsertIndex: shortcutDialogs.setCurrentInsertIndex,
              });
            }
          },
          mode: shortcutDialogs.shortcutModalMode,
          initialShortcut: shortcutDialogs.selectedShortcut?.shortcut
            ? {
                ...shortcutDialogs.selectedShortcut.shortcut,
                title: shortcutDialogs.editingTitle,
                url: shortcutDialogs.editingUrl,
              }
            : {
                title: shortcutDialogs.editingTitle,
                url: shortcutDialogs.editingUrl,
                icon: '',
              },
          iconCornerRadius: shortcutDialogs.shortcutIconCornerRadius,
          iconScale: shortcutDialogs.shortcutIconScale,
          iconAppearance: shortcutDialogs.shortcutIconAppearance,
          onSave: shortcutDialogs.onSaveShortcutEdit,
        }}
        shortcutDeleteDialogProps={{
          open: shortcutDialogs.shortcutDeleteOpen,
          onOpenChange: shortcutDialogs.setShortcutDeleteOpen,
          title: isShortcutFolder(shortcutDialogs.selectedShortcut?.shortcut)
            ? t('shortcutDelete.folderTitle', { defaultValue: '删除文件夹' })
            : t('shortcutDelete.title'),
          description: isShortcutFolder(shortcutDialogs.selectedShortcut?.shortcut)
            ? t('shortcutDelete.folderDescription', { defaultValue: '删除后，文件夹里的快捷方式也会一起删除。' })
            : t('shortcutDelete.description'),
          onConfirm: shortcutDialogs.onConfirmDeleteShortcut,
        }}
        scenarioCreateDialogProps={{
          open: scenarioDialogs.scenarioCreateOpen,
          onOpenChange: scenarioDialogs.setScenarioCreateOpen,
          onSubmit: scenarioDialogs.onCreateScenarioMode,
        }}
        scenarioEditDialogProps={{
          open: scenarioDialogs.scenarioEditOpen,
          onOpenChange: scenarioDialogs.setScenarioEditOpen,
          onSubmit: scenarioDialogs.onUpdateScenarioMode,
          title: t('scenario.editTitle'),
          submitText: t('common.save'),
          mode: scenarioDialogs.scenarioEditMode,
        }}
        authModalProps={{
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
        }}
        settingsModalProps={{
          isOpen: settingsDialogs.settingsOpen,
          onOpenChange: settingsDialogs.setSettingsOpen,
          username: settingsDialogs.username,
          onLogin: settingsDialogs.onLogin,
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
          onExportData: settingsDialogs.onExportData,
          onImportData: settingsDialogs.onImportData,
          wallpaperMode: settingsDialogs.wallpaperMode,
          onWallpaperModeChange: settingsDialogs.onWallpaperModeChange,
          bingWallpaper: settingsDialogs.bingWallpaper,
          customWallpaper: settingsDialogs.customWallpaper,
          onCustomWallpaperChange: settingsDialogs.onCustomWallpaperChange,
          weatherCode: settingsDialogs.weatherCode,
          colorWallpaperId: settingsDialogs.colorWallpaperId,
          onColorWallpaperIdChange: settingsDialogs.onColorWallpaperIdChange,
          wallpaperMaskOpacity: settingsDialogs.wallpaperMaskOpacity,
          onWallpaperMaskOpacityChange: settingsDialogs.onWallpaperMaskOpacityChange,
          onOpenWallpaperSettings: () => settingsDialogs.setWallpaperSettingsOpen(true),
          privacyConsent: settingsDialogs.privacyConsent,
          onPrivacyConsentChange: settingsDialogs.onPrivacyConsentChange,
          onOpenAdminModal: settingsDialogs.onOpenAdminModal,
          onOpenAboutModal: settingsDialogs.onOpenAboutModal,
          onCloudSyncNow: settingsDialogs.onCloudSyncNow,
          onOpenSyncCenter: () => {
            settingsDialogs.setSettingsOpen(false);
            settingsDialogs.setLeafTabSyncDialogOpen(true);
          },
          onOpenWebdavConfig: settingsDialogs.onOpenWebdavConfig,
          onWebdavSync: settingsDialogs.onWebdavSync,
          onWebdavEnable: settingsDialogs.onWebdavEnable,
          onWebdavDisable: settingsDialogs.onWebdavDisable,
          onOpenShortcutGuide: () => settingsDialogs.setShortcutGuideOpen(true),
        }}
        searchSettingsModalProps={controlledUtilityDialogs.searchSettingsModalProps}
        shortcutGuideDialogProps={controlledUtilityDialogs.shortcutGuideDialogProps}
        shortcutIconSettingsDialogProps={controlledUtilityDialogs.shortcutIconSettingsDialogProps}
        adminModalProps={{
          ...controlledUtilityDialogs.adminModalProps,
          allowCustomApiServer: ENABLE_CUSTOM_API_SERVER,
        }}
        aboutModalProps={controlledUtilityDialogs.aboutModalProps}
        exportBackupDialogProps={{
          open: backupDialogs.exportBackupDialogOpen,
          onOpenChange: backupDialogs.setExportBackupDialogOpen,
          onBackToSettings: utilityDialogs.onBackToSettings,
          mode: 'export',
          availableScope: {
            shortcuts: true,
            bookmarks: true,
          },
          defaultScope: {
            ...getDefaultLocalBackupExportScope(),
          },
          onConfirm: backupDialogs.onExportBackupConfirm,
        }}
        importBackupDialogProps={{
          open: backupDialogs.importBackupDialogOpen,
          onOpenChange: backupDialogs.onImportBackupDialogOpenChange,
          onBackToSettings: utilityDialogs.onBackToSettings,
          mode: 'import',
          availableScope: backupDialogs.importBackupScopePayload
            ? {
                shortcuts: Boolean(backupDialogs.importBackupScopePayload.exportScope.shortcuts),
                bookmarks: Boolean(backupDialogs.importBackupScopePayload.exportScope.bookmarks),
              }
            : {
                shortcuts: true,
                bookmarks: true,
              },
          defaultScope: backupDialogs.importBackupScopePayload
            ? {
                shortcuts: true,
                bookmarks: backupDialogs.cloudSyncBookmarksEnabled
                  && Boolean(backupDialogs.importBackupScopePayload.exportScope.bookmarks),
              }
            : {
                shortcuts: true,
                bookmarks: backupDialogs.cloudSyncBookmarksEnabled,
              },
          onConfirm: backupDialogs.onImportBackupConfirm,
        }}
        webdavConfigDialogProps={{
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
              syncProviderDialogs.resolveLeafTabSyncRootPath(nextConfig),
            );
            syncProviderDialogs.setWebdavEnableAfterConfigSave(false);
            syncProviderDialogs.setWebdavShowConnectionFields(false);
            syncProviderDialogs.setPendingWebdavEnableScopeKey(nextScopeKey || null);
          },
          onSaveSuccess: async () => {
            if (!syncProviderDialogs.leafTabWebdavEnabled || syncProviderDialogs.webdavSyncing) {
              return;
            }
            await syncProviderDialogs.onWebdavSaveSuccessAutoSync();
          },
          onDisableSync: async () => {
            syncProviderDialogs.setConfirmDisableWebdavSyncOpen(true);
          },
        }}
        cloudSyncConfigDialogProps={{
          open: syncProviderDialogs.cloudSyncConfigOpen,
          onBackToParent: syncProviderDialogs.onBackToParent,
          onOpenChange: syncProviderDialogs.setCloudSyncConfigOpen,
          onSaveSuccess: syncProviderDialogs.onCloudSyncConfigSaved,
          onLinkGoogle: syncProviderDialogs.onLinkGoogle,
          onLogout: syncProviderDialogs.onCloudSyncLogout,
        }}
        confirmSyncDialog={{
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
        }}
        importConfirmDialog={{
          open: backupDialogs.importConfirmOpen,
          setOpen: backupDialogs.setImportConfirmOpen,
          payload: backupDialogs.importPendingPayload,
          setPayload: backupDialogs.setImportPendingPayload,
          busy: backupDialogs.importConfirmBusy,
          setBusy: backupDialogs.setImportConfirmBusy,
          downloadCloudBackupEnvelope: async () => {},
          applyUndoPayload: backupDialogs.onApplyImportUndoPayload,
          onSuccess: () => backupDialogs.setSettingsOpen(false),
        }}
        disableConsentDialog={controlledConsentDialogs.disableConsentDialogProps}
      />
    </Suspense>
  );
}
