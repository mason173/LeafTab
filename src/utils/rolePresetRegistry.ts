import { defaultScenarioModes, type ScenarioMode } from '@/scenario/scenario';
import {
  parseLeafTabLocalBackupImport,
  projectLeafTabSyncSnapshotToAppState,
} from '@/sync/leaftab';
import type { ScenarioShortcuts } from '@/types';
import { parseLeafTabBackup } from './backupData';

export const ROLE_PRESET_VERSION_STORAGE_KEY = 'leaftab_role_preset_version';

export type RolePresetFormat = 'legacy-backup' | 'engine-bundle';

export type RolePresetSnapshot = {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
};

export type RolePresetRegistryEntry = {
  roleId: string;
  version: number;
  format: RolePresetFormat;
  files: {
    zh: string;
    en: string;
  };
};

const createLegacyEntry = (
  roleId: string,
  baseFileName: string,
  version = 1,
): RolePresetRegistryEntry => ({
  roleId,
  version,
  format: 'legacy-backup',
  files: {
    zh: `${baseFileName}.leaftab`,
    en: `${baseFileName}_en.leaftab`,
  },
});

export const ROLE_PRESET_REGISTRY: Record<string, RolePresetRegistryEntry> = {
  general: createLegacyEntry('general', 'leaftab_backup_general'),
  programmer: createLegacyEntry('programmer', 'leaftab_backup_Programmer'),
  product_manager: createLegacyEntry('product_manager', 'leaftab_backup_product_manager'),
  designer: createLegacyEntry('designer', 'leaftab_backup_designer'),
  student: createLegacyEntry('student', 'leaftab_backup_student'),
  marketer: createLegacyEntry('marketer', 'leaftab_backup_marketer'),
  finance: createLegacyEntry('finance', 'leaftab_backup_finance'),
  hr: createLegacyEntry('hr', 'leaftab_backup_hr'),
  admin: createLegacyEntry('admin', 'leaftab_backup_admin'),
};

const normalizeRolePresetLanguage = (language: string) => {
  const normalized = String(language || '').trim().toLowerCase();
  return normalized === 'zh' || normalized === 'zh-cn' ? 'zh' : 'en';
};

const normalizeSelectedScenarioId = (
  selectedScenarioId: string,
  scenarioModes: ScenarioMode[],
) => {
  if (scenarioModes.some((mode) => mode.id === selectedScenarioId)) {
    return selectedScenarioId;
  }
  return scenarioModes[0]?.id || defaultScenarioModes[0].id;
};

export const getRolePresetRegistryEntry = (roleId?: string | null) => {
  const normalizedRoleId = String(roleId || '').trim().toLowerCase();
  return normalizedRoleId ? ROLE_PRESET_REGISTRY[normalizedRoleId] || null : null;
};

export const resolveRolePresetFile = (
  roleId?: string | null,
  language = 'zh',
) => {
  const entry = getRolePresetRegistryEntry(roleId);
  if (!entry) return null;
  return normalizeRolePresetLanguage(language) === 'zh'
    ? entry.files.zh
    : entry.files.en;
};

export const buildRolePresetSnapshotFromData = (
  raw: unknown,
): RolePresetSnapshot | null => {
  const imported = parseLeafTabLocalBackupImport(raw);
  if (imported?.kind === 'engine-bundle') {
    const projected = projectLeafTabSyncSnapshotToAppState(imported.snapshot);
    const scenarioModes = projected.scenarioModes.length > 0
      ? projected.scenarioModes
      : defaultScenarioModes;
    return {
      scenarioModes,
      selectedScenarioId: normalizeSelectedScenarioId(imported.selectedScenarioId, scenarioModes),
      scenarioShortcuts: projected.scenarioShortcuts,
    };
  }

  const legacy = parseLeafTabBackup(raw);
  if (legacy) {
    const scenarioModes = Array.isArray(legacy.scenarioModes) && legacy.scenarioModes.length > 0
      ? legacy.scenarioModes as ScenarioMode[]
      : defaultScenarioModes;
    return {
      scenarioModes,
      selectedScenarioId: normalizeSelectedScenarioId(legacy.selectedScenarioId, scenarioModes),
      scenarioShortcuts: legacy.scenarioShortcuts || {},
    };
  }

  return null;
};

export const loadRolePresetSnapshot = async (params: {
  roleId?: string | null;
  language: string;
  fetchImpl?: typeof fetch;
}) => {
  const entry = getRolePresetRegistryEntry(params.roleId);
  if (!entry) return null;

  const file = resolveRolePresetFile(entry.roleId, params.language);
  if (!file) return null;

  const response = await (params.fetchImpl || fetch)(`./profiles/${file}`);
  if (!response.ok) {
    throw new Error(`Failed to load role preset: ${entry.roleId}`);
  }

  const data = await response.json();
  const snapshot = buildRolePresetSnapshotFromData(data);
  if (!snapshot) {
    throw new Error(`Invalid role preset payload: ${entry.roleId}`);
  }

  return {
    entry,
    file,
    snapshot,
  };
};
