import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BackToSettingsButton } from "@/components/BackToSettingsButton";
import {
  RiCalculatorLine,
  RiCodeSSlashFill,
  RiComputerFill,
  RiDashboardFill,
  RiFileTextFill,
  RiLinkM,
  RiQuestionLine,
  RiRefreshFill,
} from "@/icons/ri-compat";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { ENABLE_SEARCH_ENGINE_SWITCHER } from "@/config/featureFlags";
import type { SearchBarPosition } from "@/types";

type SearchSettingRowProps = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  tooltip: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

function SearchSettingRow({
  id,
  icon: Icon,
  label,
  description,
  tooltip,
  checked,
  onCheckedChange,
  disabled = false,
}: SearchSettingRowProps) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border p-3 transition-all",
        "border-border/70 bg-card hover:bg-[var(--frosted-ui-card-hover)]",
        disabled ? "opacity-55" : "",
      ].join(" ")}
    >
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="absolute right-3 top-3 z-10 flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-[disabled]:opacity-50"
      >
        <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
      </Switch>
      <div className="relative flex min-h-[96px] flex-col gap-1.5">
        <div className="frosted-control-surface flex h-7 w-7 items-center justify-center rounded-lg border border-border/70">
          <Icon className="size-4 text-foreground" />
        </div>
        <div className="min-w-0 pr-12">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold leading-none truncate">{label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={tooltip}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RiQuestionLine className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-[220px] px-3 py-2 leading-[1.45] text-left">
                <span className="block whitespace-normal break-words [text-wrap:wrap]">{tooltip}</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="mt-auto">
          <span className="font-normal text-xs leading-[1.4] text-muted-foreground text-left line-clamp-2 whitespace-pre-line">{description}</span>
        </div>
      </div>
    </div>
  );
}

interface SearchSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSettings?: () => void;
  tabSwitchSearchEngine: boolean;
  onTabSwitchSearchEngineChange: (checked: boolean) => void;
  searchPrefixEnabled: boolean;
  onSearchPrefixEnabledChange: (checked: boolean) => void;
  searchSiteDirectEnabled: boolean;
  onSearchSiteDirectEnabledChange: (checked: boolean) => void;
  searchSiteShortcutEnabled: boolean;
  onSearchSiteShortcutEnabledChange: (checked: boolean) => void;
  searchAnyKeyCaptureEnabled: boolean;
  onSearchAnyKeyCaptureEnabledChange: (checked: boolean) => void;
  searchCalculatorEnabled: boolean;
  onSearchCalculatorEnabledChange: (checked: boolean) => void;
  searchRotatingPlaceholderEnabled: boolean;
  onSearchRotatingPlaceholderEnabledChange: (checked: boolean) => void;
  searchBarPosition: SearchBarPosition;
  onSearchBarPositionChange: (value: SearchBarPosition) => void;
}

export function SearchSettingsModal({
  isOpen,
  onOpenChange,
  onBackToSettings,
  tabSwitchSearchEngine,
  onTabSwitchSearchEngineChange,
  searchPrefixEnabled,
  onSearchPrefixEnabledChange,
  searchSiteDirectEnabled,
  onSearchSiteDirectEnabledChange,
  searchSiteShortcutEnabled,
  onSearchSiteShortcutEnabledChange,
  searchAnyKeyCaptureEnabled,
  onSearchAnyKeyCaptureEnabledChange,
  searchCalculatorEnabled,
  onSearchCalculatorEnabledChange,
  searchRotatingPlaceholderEnabled,
  onSearchRotatingPlaceholderEnabledChange,
  searchBarPosition,
  onSearchBarPositionChange,
}: SearchSettingsModalProps) {
  const { t } = useTranslation();
  void searchBarPosition;
  void onSearchBarPositionChange;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        surfaceVariant="frosted"
        className="sm:max-w-[560px] border-border text-foreground rounded-[32px] overflow-visible"
      >
        <DialogHeader className="pb-3 pr-8">
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToSettings} />
            <DialogTitle className="text-foreground">{t('settings.searchSettings.title')}</DialogTitle>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[68vh]" scrollBarClassName="data-[orientation=vertical]:translate-x-4">
          <div className="mx-auto w-full max-w-[500px] grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SearchSettingRow
              id="search-engine-tab-switch"
              icon={RiRefreshFill}
              label={t('settings.searchSettings.items.tabSwitch.label')}
              description={t('settings.searchSettings.items.tabSwitch.description')}
              tooltip={t('settings.searchSettings.items.tabSwitch.tooltip')}
              checked={tabSwitchSearchEngine}
              onCheckedChange={onTabSwitchSearchEngineChange}
              disabled={!ENABLE_SEARCH_ENGINE_SWITCHER}
            />

            <SearchSettingRow
              id="search-prefix-enabled"
              icon={RiCodeSSlashFill}
              label={t('settings.searchSettings.items.prefix.label')}
              description={t('settings.searchSettings.items.prefix.description')}
              tooltip={t('settings.searchSettings.items.prefix.tooltip')}
              checked={searchPrefixEnabled}
              onCheckedChange={onSearchPrefixEnabledChange}
            />

            <SearchSettingRow
              id="search-site-direct-enabled"
              icon={RiLinkM}
              label={t('settings.searchSettings.items.siteDirect.label')}
              description={t('settings.searchSettings.items.siteDirect.description')}
              tooltip={t('settings.searchSettings.items.siteDirect.tooltip')}
              checked={searchSiteDirectEnabled}
              onCheckedChange={onSearchSiteDirectEnabledChange}
            />

            <SearchSettingRow
              id="search-site-shortcut-enabled"
              icon={RiDashboardFill}
              label={t('settings.searchSettings.items.siteShortcut.label')}
              description={t('settings.searchSettings.items.siteShortcut.description')}
              tooltip={t('settings.searchSettings.items.siteShortcut.tooltip')}
              checked={searchSiteShortcutEnabled}
              onCheckedChange={onSearchSiteShortcutEnabledChange}
            />

            <SearchSettingRow
              id="search-any-key-capture-enabled"
              icon={RiComputerFill}
              label={t('settings.searchSettings.items.anyKeyCapture.label')}
              description={t('settings.searchSettings.items.anyKeyCapture.description')}
              tooltip={t('settings.searchSettings.items.anyKeyCapture.tooltip')}
              checked={searchAnyKeyCaptureEnabled}
              onCheckedChange={onSearchAnyKeyCaptureEnabledChange}
            />

            <SearchSettingRow
              id="search-calculator-enabled"
              icon={RiCalculatorLine}
              label={t('settings.searchSettings.items.calculator.label')}
              description={t('settings.searchSettings.items.calculator.description')}
              tooltip={t('settings.searchSettings.items.calculator.tooltip')}
              checked={searchCalculatorEnabled}
              onCheckedChange={onSearchCalculatorEnabledChange}
            />

            <SearchSettingRow
              id="search-rotating-placeholder-enabled"
              icon={RiFileTextFill}
              label={t('settings.searchSettings.items.rotatingPlaceholder.label')}
              description={t('settings.searchSettings.items.rotatingPlaceholder.description')}
              tooltip={t('settings.searchSettings.items.rotatingPlaceholder.tooltip')}
              checked={searchRotatingPlaceholderEnabled}
              onCheckedChange={onSearchRotatingPlaceholderEnabledChange}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
