import {
  buildBackupDataV4,
  type WebdavPayload,
} from '@/utils/backupData';
import type { LeafTabSyncBaselineStore } from './baseline';
import type { LeafTabSyncSnapshot } from './schema';
import type { LeafTabSyncRemoteStore } from './remoteStore';
import { LeafTabLegacySingleFileCompat, type LeafTabLegacySingleFileDriver } from './legacySingleFileCompat';
import type { LeafTabSyncWebdavStore } from './webdavStore';

export interface LeafTabLegacyWebdavCompatOptions {
  deviceId: string;
  storageScopeKey?: string;
  rootPath?: string;
  legacyFilePath?: string | null;
  bridgeEnabled?: boolean;
  buildLegacyPayload?: () => WebdavPayload;
  baselineStore: LeafTabSyncBaselineStore;
  remoteStore?: LeafTabSyncRemoteStore;
  webdavStore: LeafTabSyncWebdavStore;
  buildLocalSnapshot: () => Promise<LeafTabSyncSnapshot>;
  applyLocalSnapshot: (snapshot: LeafTabSyncSnapshot) => Promise<void>;
}

export type LeafTabLegacyWebdavMigrationResult = Awaited<ReturnType<LeafTabLegacySingleFileCompat['ensureMigrated']>>;
export type LeafTabLegacyWebdavPreparedSnapshotResult = Awaited<ReturnType<LeafTabLegacySingleFileCompat['prepareLocalSnapshot']>>;

const normalizeLegacyPath = (filePath?: string | null) => {
  return (filePath || '').trim().replace(/^\/+/, '');
};

const normalizeLegacyPayload = (raw: unknown): WebdavPayload | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const candidate = (
    (raw as { type?: unknown }).type === 'leaftab_backup'
    && raw
    && typeof (raw as { data?: unknown }).data === 'object'
    && !Array.isArray((raw as { data?: unknown }).data)
  )
    ? (raw as { data: unknown }).data
    : raw;

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const scenarioModes = Array.isArray((candidate as { scenarioModes?: unknown }).scenarioModes)
    ? (candidate as { scenarioModes: any[] }).scenarioModes
    : [];
  const selectedScenarioId = typeof (candidate as { selectedScenarioId?: unknown }).selectedScenarioId === 'string'
    ? String((candidate as { selectedScenarioId?: unknown }).selectedScenarioId)
    : '';
  const scenarioShortcutsRaw = (candidate as { scenarioShortcuts?: unknown }).scenarioShortcuts;
  if (!scenarioShortcutsRaw || typeof scenarioShortcutsRaw !== 'object' || Array.isArray(scenarioShortcutsRaw)) {
    return null;
  }

  const scenarioShortcuts = Object.fromEntries(
    Object.entries(scenarioShortcutsRaw as Record<string, unknown>)
      .filter(([, value]) => Array.isArray(value))
      .map(([scenarioId, value]) => [scenarioId, value as any[]]),
  );

  return {
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
  };
};

const createLegacyDriver = (
  webdavStore: LeafTabSyncWebdavStore,
  legacyFilePath?: string | null,
  storageScopeKey?: string,
): LeafTabLegacySingleFileDriver => {
  const normalizedPath = normalizeLegacyPath(legacyFilePath);
  return {
    scopeKey: `${storageScopeKey || ''}|${normalizedPath}`,
    readLegacyPayload: async () => {
      if (!normalizedPath) return null;
      const raw = await webdavStore.readJsonFile<unknown>(normalizedPath);
      return normalizeLegacyPayload(raw);
    },
    writeLegacyPayload: async (payload) => {
      if (!normalizedPath) return;
      await webdavStore.writeJsonFile(normalizedPath, buildBackupDataV4({
        scenarioModes: payload.scenarioModes,
        selectedScenarioId: payload.selectedScenarioId,
        scenarioShortcuts: payload.scenarioShortcuts,
        customShortcutIcons: payload.customShortcutIcons,
      }));
    },
  };
};

export class LeafTabLegacyWebdavCompat extends LeafTabLegacySingleFileCompat {
  constructor(options: LeafTabLegacyWebdavCompatOptions) {
    super({
      deviceId: options.deviceId,
      rootPath: options.rootPath,
      bridgeEnabled: options.bridgeEnabled,
      buildLegacyPayload: options.buildLegacyPayload,
      baselineStore: options.baselineStore,
      remoteStore: options.remoteStore || options.webdavStore,
      legacyDriver: createLegacyDriver(
        options.webdavStore,
        options.legacyFilePath,
        options.storageScopeKey,
      ),
      buildLocalSnapshot: options.buildLocalSnapshot,
      applyLocalSnapshot: options.applyLocalSnapshot,
    });
  }
}
