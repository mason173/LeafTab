import { ScenarioMode } from './scenario/scenario';

export interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
}

export type ScenarioShortcuts = Record<string, Shortcut[]>;

export type SearchEngine = 'system' | 'google' | 'bing' | 'duckduckgo' | 'baidu';

export type SearchSuggestionItem = {
  type: 'history' | 'shortcut' | 'bookmark' | 'tab' | 'engine-prefix' | 'calculator';
  label: string;
  value: string;
  icon?: string;
  timestamp?: number;
  historySource?: 'local' | 'browser';
  engine?: SearchEngine;
  formattedValue?: string;
  tabId?: number;
  windowId?: number;
};

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
