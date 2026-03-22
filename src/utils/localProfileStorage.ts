import { SCENARIO_MODES_KEY, SCENARIO_SELECTED_KEY } from '@/scenario/scenario';
import type { ScenarioMode } from '@/scenario/scenario';
import type { ScenarioShortcuts } from '@/types';

export const LOCAL_SHORTCUTS_KEY = 'local_shortcuts_v3';
export const LEGACY_SHORTCUTS_KEY = 'local_shortcuts';
export const LOCAL_PROFILE_SNAPSHOT_KEY = 'leaf_tab_local_profile_v1';
export const ROLE_SEED_PROFILE_KEY = 'leaf_tab_role_seed_v1';
export const LOCAL_NEEDS_CLOUD_RECONCILE_KEY = 'leaf_tab_local_needs_cloud_reconcile_v1';
export const LOCAL_CLOUD_RECONCILE_REASON_KEY = 'leaf_tab_local_needs_cloud_reconcile_reason_v1';

export type LocalProfileSnapshot = {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
};


export type LocalCloudReconcileReason = 'signed_out_edit' | 'logout_keep_local';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const readLocalProfileSnapshot = (): LocalProfileSnapshot | null => {
  const snapshot = parseJson<LocalProfileSnapshot>(localStorage.getItem(LOCAL_PROFILE_SNAPSHOT_KEY));
  if (snapshot && Array.isArray(snapshot.scenarioModes) && typeof snapshot.selectedScenarioId === 'string' && isObject(snapshot.scenarioShortcuts)) {
    return snapshot;
  }

  const scenarioModes = parseJson<ScenarioMode[]>(localStorage.getItem(SCENARIO_MODES_KEY));
  const selectedScenarioId = localStorage.getItem(SCENARIO_SELECTED_KEY);
  const scenarioShortcuts = parseJson<ScenarioShortcuts>(localStorage.getItem(LOCAL_SHORTCUTS_KEY));
  if (!Array.isArray(scenarioModes) || !selectedScenarioId || !isObject(scenarioShortcuts)) return null;

  return {
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
  };
};

export const persistLocalProfileSnapshot = (snapshot: LocalProfileSnapshot) => {
  const serialized = JSON.stringify(snapshot);
  localStorage.setItem(LOCAL_PROFILE_SNAPSHOT_KEY, serialized);
  localStorage.setItem(SCENARIO_MODES_KEY, JSON.stringify(snapshot.scenarioModes));
  localStorage.setItem(SCENARIO_SELECTED_KEY, snapshot.selectedScenarioId);
  localStorage.setItem(LOCAL_SHORTCUTS_KEY, JSON.stringify(snapshot.scenarioShortcuts));
  localStorage.removeItem(LEGACY_SHORTCUTS_KEY);
  localStorage.setItem('local_shortcuts_updated_at', new Date().toISOString());
};

export const clearLocalProfileSnapshot = () => {
  localStorage.removeItem(LOCAL_PROFILE_SNAPSHOT_KEY);
  localStorage.removeItem(LOCAL_SHORTCUTS_KEY);
  localStorage.removeItem(LEGACY_SHORTCUTS_KEY);
  localStorage.removeItem(SCENARIO_MODES_KEY);
  localStorage.removeItem(SCENARIO_SELECTED_KEY);
  localStorage.removeItem('local_shortcuts_updated_at');
};

export const readRoleSeedSnapshot = (): LocalProfileSnapshot | null => {
  const snapshot = parseJson<LocalProfileSnapshot>(localStorage.getItem(ROLE_SEED_PROFILE_KEY));
  if (!snapshot || !Array.isArray(snapshot.scenarioModes) || typeof snapshot.selectedScenarioId !== 'string' || !isObject(snapshot.scenarioShortcuts)) {
    return null;
  }
  return snapshot;
};

export const persistRoleSeedSnapshot = (snapshot: LocalProfileSnapshot) => {
  localStorage.setItem(ROLE_SEED_PROFILE_KEY, JSON.stringify(snapshot));
};


export const markLocalNeedsCloudReconcile = (reason: LocalCloudReconcileReason) => {
  localStorage.setItem(LOCAL_NEEDS_CLOUD_RECONCILE_KEY, 'true');
  localStorage.setItem(LOCAL_CLOUD_RECONCILE_REASON_KEY, reason);
};

export const clearLocalNeedsCloudReconcile = () => {
  localStorage.removeItem(LOCAL_NEEDS_CLOUD_RECONCILE_KEY);
  localStorage.removeItem(LOCAL_CLOUD_RECONCILE_REASON_KEY);
};

export const readLocalNeedsCloudReconcileReason = (): LocalCloudReconcileReason | null => {
  if (localStorage.getItem(LOCAL_NEEDS_CLOUD_RECONCILE_KEY) !== 'true') return null;
  const reason = localStorage.getItem(LOCAL_CLOUD_RECONCILE_REASON_KEY);
  return reason === 'signed_out_edit' || reason === 'logout_keep_local' ? reason : null;
};
