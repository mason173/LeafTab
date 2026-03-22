import { ScenarioMode } from './scenario/scenario';

export interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
}

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
}

export type ContextMenuState =
  | { x: number; y: number; kind: 'shortcut'; shortcutIndex: number; shortcut: Shortcut }
  | { x: number; y: number; kind: 'grid' };

export type { ScenarioMode };
