import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RiQuestionLine } from "@remixicon/react";
import { useTranslation } from "react-i18next";
import { ENABLE_SEARCH_ENGINE_SWITCHER } from "@/config/featureFlags";

type SearchSettingRowProps = {
  id: string;
  label: string;
  description: string;
  tooltip: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

function SearchSettingRow({
  id,
  label,
  description,
  tooltip,
  checked,
  onCheckedChange,
  disabled = false,
}: SearchSettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col space-y-1 items-start min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium leading-none truncate">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={tooltip}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <RiQuestionLine className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="max-w-[220px] px-3 py-2 leading-[1.45] text-left">
              <span className="block whitespace-normal break-words [text-wrap:wrap]">{tooltip}</span>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="font-normal text-xs text-muted-foreground text-left">{description}</span>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-[disabled]:opacity-50"
      >
        <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
      </Switch>
    </div>
  );
}

interface SearchSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
}

export function SearchSettingsModal({
  isOpen,
  onOpenChange,
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
}: SearchSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border text-foreground rounded-[32px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('settings.searchSettings.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]" scrollBarClassName="data-[orientation=vertical]:translate-x-4">
          <div className="flex flex-col gap-5">
            <SearchSettingRow
              id="search-engine-tab-switch"
              label={t('settings.searchSettings.items.tabSwitch.label')}
              description={t('settings.searchSettings.items.tabSwitch.description')}
              tooltip={t('settings.searchSettings.items.tabSwitch.tooltip')}
              checked={tabSwitchSearchEngine}
              onCheckedChange={onTabSwitchSearchEngineChange}
              disabled={!ENABLE_SEARCH_ENGINE_SWITCHER}
            />

            <SearchSettingRow
              id="search-prefix-enabled"
              label={t('settings.searchSettings.items.prefix.label')}
              description={t('settings.searchSettings.items.prefix.description')}
              tooltip={t('settings.searchSettings.items.prefix.tooltip')}
              checked={searchPrefixEnabled}
              onCheckedChange={onSearchPrefixEnabledChange}
            />

            <SearchSettingRow
              id="search-site-direct-enabled"
              label={t('settings.searchSettings.items.siteDirect.label')}
              description={t('settings.searchSettings.items.siteDirect.description')}
              tooltip={t('settings.searchSettings.items.siteDirect.tooltip')}
              checked={searchSiteDirectEnabled}
              onCheckedChange={onSearchSiteDirectEnabledChange}
            />

            <SearchSettingRow
              id="search-site-shortcut-enabled"
              label={t('settings.searchSettings.items.siteShortcut.label')}
              description={t('settings.searchSettings.items.siteShortcut.description')}
              tooltip={t('settings.searchSettings.items.siteShortcut.tooltip')}
              checked={searchSiteShortcutEnabled}
              onCheckedChange={onSearchSiteShortcutEnabledChange}
            />

            <SearchSettingRow
              id="search-any-key-capture-enabled"
              label={t('settings.searchSettings.items.anyKeyCapture.label')}
              description={t('settings.searchSettings.items.anyKeyCapture.description')}
              tooltip={t('settings.searchSettings.items.anyKeyCapture.tooltip')}
              checked={searchAnyKeyCaptureEnabled}
              onCheckedChange={onSearchAnyKeyCaptureEnabledChange}
            />

            <SearchSettingRow
              id="search-calculator-enabled"
              label={t('settings.searchSettings.items.calculator.label')}
              description={t('settings.searchSettings.items.calculator.description')}
              tooltip={t('settings.searchSettings.items.calculator.tooltip')}
              checked={searchCalculatorEnabled}
              onCheckedChange={onSearchCalculatorEnabledChange}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
