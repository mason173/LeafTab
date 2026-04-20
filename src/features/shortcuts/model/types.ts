import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ScenarioMode, ScenarioShortcuts, Shortcut } from '@/types';

export type NormalizeScenarioModesList = (raw: unknown) => ScenarioMode[];
export type NormalizeScenarioShortcuts = (raw: unknown) => ScenarioShortcuts;

export type ShortcutStoreSnapshot = {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
};

export interface ShortcutStoreRefs {
  scenarioModesRef: MutableRefObject<ScenarioMode[]>;
  selectedScenarioIdRef: MutableRefObject<string>;
  scenarioShortcutsRef: MutableRefObject<ScenarioShortcuts>;
}

export interface ShortcutStoreSetters {
  setScenarioModes: Dispatch<SetStateAction<ScenarioMode[]>>;
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setScenarioShortcuts: Dispatch<SetStateAction<ScenarioShortcuts>>;
}

export interface ShortcutStoreState extends ShortcutStoreSnapshot {
  shortcuts: Shortcut[];
  totalShortcuts: number;
}

export type SelectedShortcutState = {
  index: number;
  shortcut: Shortcut;
  parentFolderId?: string | null;
} | null;

export interface ShortcutStoreActions {
  updateScenarioShortcuts: (updater: (prev: Shortcut[]) => Shortcut[]) => void;
}

export interface UseShortcutStoreParams {
  normalizeScenarioModesList: NormalizeScenarioModesList;
  normalizeScenarioShortcuts: NormalizeScenarioShortcuts;
  defaultScenarioShortcuts?: unknown;
  onScenarioShortcutsDirty?: () => void;
}

export type UseShortcutStoreResult = ShortcutStoreState
  & ShortcutStoreRefs
  & ShortcutStoreSetters
  & ShortcutStoreActions;
