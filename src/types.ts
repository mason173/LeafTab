import { ScenarioMode } from './scenario/scenario';

export interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
}

export type ScenarioShortcuts = Record<string, Shortcut[]>;

export type SearchEngine = 'google' | 'bing' | 'baidu' | 'sougou' | '360' | 'duckduckgo' | 'yandex';

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
  | { x: number; y: number; kind: 'page' };

export type { ScenarioMode };
