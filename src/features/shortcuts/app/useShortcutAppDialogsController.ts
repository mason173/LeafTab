import type { AppDialogsProps } from '@/components/AppDialogs';
import { useShortcutAppContext } from '@/features/shortcuts/app/ShortcutAppContext';

type ShortcutModalProps = AppDialogsProps['shortcutModalProps'];
type ScenarioEditDialogProps = AppDialogsProps['scenarioEditDialogProps'];
type SearchSettingsModalProps = AppDialogsProps['searchSettingsModalProps'];
type ShortcutGuideDialogProps = AppDialogsProps['shortcutGuideDialogProps'];
type ShortcutIconSettingsDialogProps = AppDialogsProps['shortcutIconSettingsDialogProps'];
type AdminModalProps = AppDialogsProps['adminModalProps'];
type AboutModalProps = AppDialogsProps['aboutModalProps'];
type DisableConsentDialogProps = AppDialogsProps['disableConsentDialog'];

type ShortcutDialogVisualConfig = {
  shortcutIconCornerRadius: ShortcutModalProps['iconCornerRadius'];
  shortcutIconScale: ShortcutModalProps['iconScale'];
  shortcutIconAppearance: ShortcutModalProps['iconAppearance'];
};

type UtilityDialogControllerInput = {
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
  compactShowTitle: Exclude<ShortcutIconSettingsDialogProps['compactShowTitle'], undefined>;
  onCompactShowTitleChange: (compactShowTitle: boolean) => void;
  columns: Exclude<ShortcutIconSettingsDialogProps['columns'], undefined>;
  onColumnsChange: (columns: number) => void;
  appearance: Exclude<ShortcutIconSettingsDialogProps['appearance'], undefined>;
  onAppearanceChange: (appearance: Exclude<ShortcutIconSettingsDialogProps['appearance'], undefined>) => void;
  cornerRadius: Exclude<ShortcutIconSettingsDialogProps['cornerRadius'], undefined>;
  onCornerRadiusChange: (cornerRadius: Exclude<ShortcutIconSettingsDialogProps['cornerRadius'], undefined>) => void;
  scale: Exclude<ShortcutIconSettingsDialogProps['scale'], undefined>;
  onScaleChange: (scale: Exclude<ShortcutIconSettingsDialogProps['scale'], undefined>) => void;
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

type ConsentDialogControllerInput = {
  confirmDisableConsentOpen: DisableConsentDialogProps['open'];
  setConfirmDisableConsentOpen: DisableConsentDialogProps['onOpenChange'];
  onPrivacyConsent: (value: boolean) => void;
};

export function useShortcutAppDialogsController({
  shortcutIconCornerRadius,
  shortcutIconScale,
  shortcutIconAppearance,
  utilityDialogs,
  consentDialogs,
}: ShortcutDialogVisualConfig & {
  utilityDialogs: UtilityDialogControllerInput;
  consentDialogs: ConsentDialogControllerInput;
}) {
  const shortcutApp = useShortcutAppContext();
  const scenarioEditMode = shortcutApp.state.domain.scenarioModes.find(
    (mode) => mode.id === shortcutApp.state.ui.currentEditScenarioId,
  ) ?? null;

  return {
    shortcutDialogs: {
      shortcutEditOpen: shortcutApp.state.ui.shortcutEditOpen,
      setShortcutEditOpen: shortcutApp.actions.ui.setShortcutEditOpen,
      shortcutModalMode: shortcutApp.state.ui.shortcutModalMode,
      setShortcutModalMode: shortcutApp.actions.ui.setShortcutModalMode,
      selectedShortcut: shortcutApp.state.ui.selectedShortcut,
      setSelectedShortcut: shortcutApp.actions.ui.setSelectedShortcut,
      editingTitle: shortcutApp.state.ui.editingTitle,
      setEditingTitle: shortcutApp.actions.ui.setEditingTitle,
      editingUrl: shortcutApp.state.ui.editingUrl,
      setEditingUrl: shortcutApp.actions.ui.setEditingUrl,
      setCurrentInsertIndex: shortcutApp.actions.ui.setCurrentInsertIndex,
      shortcutIconCornerRadius,
      shortcutIconScale,
      shortcutIconAppearance,
      onSaveShortcutEdit: shortcutApp.actions.shortcuts.handleSaveShortcutEdit,
      shortcutDeleteOpen: shortcutApp.state.ui.shortcutDeleteOpen,
      setShortcutDeleteOpen: shortcutApp.actions.ui.setShortcutDeleteOpen,
      onConfirmDeleteShortcut: shortcutApp.actions.shortcuts.handleConfirmDeleteShortcut,
    },
    scenarioDialogs: {
      scenarioCreateOpen: shortcutApp.state.ui.scenarioCreateOpen,
      setScenarioCreateOpen: shortcutApp.actions.ui.setScenarioCreateOpen,
      onCreateScenarioMode: shortcutApp.actions.shortcuts.handleCreateScenarioMode,
      scenarioEditOpen: shortcutApp.state.ui.scenarioEditOpen,
      setScenarioEditOpen: shortcutApp.actions.ui.setScenarioEditOpen,
      onUpdateScenarioMode: shortcutApp.actions.shortcuts.handleUpdateScenarioMode,
      scenarioEditMode: scenarioEditMode as ScenarioEditDialogProps['mode'],
    },
    utilityDialogs: {
      searchSettingsModalProps: {
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
      } satisfies SearchSettingsModalProps,
      shortcutGuideDialogProps: {
        open: utilityDialogs.shortcutGuideOpen,
        onOpenChange: utilityDialogs.setShortcutGuideOpen,
        onBackToSettings: utilityDialogs.onBackToSettings,
      } satisfies ShortcutGuideDialogProps,
      shortcutIconSettingsDialogProps: {
        open: utilityDialogs.shortcutIconSettingsOpen,
        onOpenChange: utilityDialogs.setShortcutIconSettingsOpen,
        onBackToSettings: utilityDialogs.onBackToSettings,
        compactShowTitle: utilityDialogs.compactShowTitle,
        columns: utilityDialogs.columns,
        onSaveStyle: ({ compactShowTitle, columns }) => {
          utilityDialogs.onCompactShowTitleChange(compactShowTitle);
          utilityDialogs.onColumnsChange(columns);
        },
        appearance: utilityDialogs.appearance,
        cornerRadius: utilityDialogs.cornerRadius,
        scale: utilityDialogs.scale,
        onSave: ({ appearance, cornerRadius, scale }) => {
          utilityDialogs.onAppearanceChange(appearance);
          utilityDialogs.onCornerRadiusChange(cornerRadius);
          utilityDialogs.onScaleChange(scale);
        },
      } satisfies ShortcutIconSettingsDialogProps,
      adminModalProps: {
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
      } satisfies Omit<AdminModalProps, 'allowCustomApiServer'>,
      aboutModalProps: {
        open: utilityDialogs.aboutModalOpen,
        onOpenChange: utilityDialogs.setAboutModalOpen,
        onBackToSettings: utilityDialogs.onBackToSettings,
        defaultTab: utilityDialogs.defaultAboutTab,
      } satisfies AboutModalProps,
    },
    consentDialogs: {
      disableConsentDialogProps: {
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
      } satisfies DisableConsentDialogProps,
    },
  };
}
