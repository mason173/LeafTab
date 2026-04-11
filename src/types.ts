import { ScenarioMode } from './scenario/scenario';
import type { ShortcutCardVariant } from '@/components/shortcuts/shortcutCardVariant';
import type { DisplayMode } from '@/displayMode/config';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import type { VisualEffectsLevel } from '@/hooks/useVisualEffectsPolicy';

export type ShortcutVisualMode = 'favicon' | 'letter';
export type ShortcutIconAppearance = 'colorful' | 'monochrome' | 'accent';
export type SyncableWallpaperMode = 'bing' | 'weather' | 'color' | null;
export type ShortcutKind = 'link' | 'folder';

export interface WeatherManualLocation {
  city: string;
  latitude?: number;
  longitude?: number;
}

export interface SyncablePreferences {
  displayMode: DisplayMode;
  openInNewTab: boolean;
  searchTabSwitchEngine: boolean;
  searchPrefixEnabled: boolean;
  searchSiteDirectEnabled: boolean;
  searchSiteShortcutEnabled: boolean;
  searchAnyKeyCaptureEnabled: boolean;
  searchCalculatorEnabled: boolean;
  searchRotatingPlaceholderEnabled: boolean;
  searchEngine: SearchEngine;
  preventDuplicateNewTab: boolean;
  is24Hour: boolean;
  showDate: boolean;
  showWeekday: boolean;
  showLunar: boolean;
  timeAnimationMode: TimeAnimationMode;
  timeFont: string;
  showSeconds: boolean;
  visualEffectsLevel: VisualEffectsLevel;
  showTime: boolean;
  shortcutCardVariant: ShortcutCardVariant;
  shortcutCompactShowTitle: boolean;
  shortcutGridColumnsByVariant: Record<ShortcutCardVariant, number>;
  shortcutIconAppearance: ShortcutIconAppearance;
  shortcutIconCornerRadius: number;
  shortcutIconScale: number;
  shortcutsRowsPerColumn: number;
  privacyConsent: boolean | null;
  theme: 'system' | 'light' | 'dark';
  language: string;
  accentColor: string;
  wallpaperMode: SyncableWallpaperMode;
  wallpaperMaskOpacity: number;
  darkModeAutoDimWallpaperEnabled: boolean;
  colorWallpaperId: string;
  weatherManualLocation: WeatherManualLocation | null;
}

export interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
  kind?: ShortcutKind;
  children?: Shortcut[];
  useOfficialIcon?: boolean;
  autoUseOfficialIcon?: boolean;
  officialIconAvailableAtSave?: boolean;
  iconRendering?: ShortcutVisualMode;
  iconColor?: string;
}

export type ShortcutDraft = Omit<Shortcut, 'id' | 'kind' | 'children'>;

export type ScenarioShortcuts = Record<string, Shortcut[]>;

export type SearchEngine = 'system' | 'google' | 'bing' | 'duckduckgo' | 'baidu';

type SearchSuggestionBase = {
  label: string;
  value: string;
};

export type HistorySearchSuggestionItem = SearchSuggestionBase & {
  type: 'history';
  timestamp: number;
  historySource: 'local' | 'browser';
};

export type ShortcutSearchSuggestionItem = SearchSuggestionBase & {
  type: 'shortcut';
  shortcutId?: string;
  icon: string;
};

export type BookmarkSearchSuggestionItem = SearchSuggestionBase & {
  type: 'bookmark';
  icon: string;
};

export type TabSearchSuggestionItem = SearchSuggestionBase & {
  type: 'tab';
  icon: string;
  tabId: number;
  windowId?: number;
};

export type EnginePrefixSearchSuggestionItem = SearchSuggestionBase & {
  type: 'engine-prefix';
  engine: SearchEngine;
  formattedValue?: string;
};

export type CalculatorSearchSuggestionItem = SearchSuggestionBase & {
  type: 'calculator';
  formattedValue: string;
};

export type SearchSuggestionItem =
  | HistorySearchSuggestionItem
  | ShortcutSearchSuggestionItem
  | BookmarkSearchSuggestionItem
  | TabSearchSuggestionItem
  | EnginePrefixSearchSuggestionItem
  | CalculatorSearchSuggestionItem;

export interface SearchEngineConfig {
  name: string;
  url: string;
}

export interface CloudShortcutsPayloadV3 {
  version: 3;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  preferences?: SyncablePreferences;
}

export type ContextMenuState =
  | { x: number; y: number; kind: 'shortcut'; shortcutIndex: number; shortcut: Shortcut }
  | { x: number; y: number; kind: 'folder-shortcut'; folderId: string; shortcut: Shortcut }
  | { x: number; y: number; kind: 'grid' };

export type { ScenarioMode };
