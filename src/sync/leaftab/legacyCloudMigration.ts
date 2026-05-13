import type { CloudShortcutsPayloadV3 } from '@/types';
import { createCloudSyncAdapter } from '@/hooks/cloudSync/cloudSyncAdapter';
import type { WebdavPayload } from '@/utils/backupData';
import type { LeafTabSyncBaselineStore } from './baseline';
import type { LeafTabSyncSnapshot } from './schema';
import type { LeafTabSyncRemoteStore } from './remoteStore';
import { LeafTabLegacySingleFileCompat, type LeafTabLegacySingleFileDriver } from './legacySingleFileCompat';

export interface LeafTabLegacyCloudCompatOptions {
  deviceId: string;
  apiUrl: string;
  token: string;
  storageScopeKey?: string;
  rootPath?: string;
  bridgeEnabled?: boolean;
  buildLegacyPayload?: () => WebdavPayload;
  baselineStore: LeafTabSyncBaselineStore;
  remoteStore: LeafTabSyncRemoteStore;
  buildLocalSnapshot: () => Promise<LeafTabSyncSnapshot>;
  applyLocalSnapshot: (snapshot: LeafTabSyncSnapshot) => Promise<void>;
  normalizeCloudShortcutsPayload: (raw: unknown) => CloudShortcutsPayloadV3 | null;
}

const toLegacyPayload = (payload: CloudShortcutsPayloadV3 | null): WebdavPayload | null => {
  if (!payload) return null;
  return {
    scenarioModes: payload.scenarioModes,
    selectedScenarioId: payload.selectedScenarioId,
    scenarioShortcuts: payload.scenarioShortcuts,
    customShortcutIcons: payload.customShortcutIcons,
  };
};

const createLegacyDriver = (
  options: Pick<LeafTabLegacyCloudCompatOptions, 'apiUrl' | 'token' | 'normalizeCloudShortcutsPayload' | 'storageScopeKey'>,
): LeafTabLegacySingleFileDriver => {
  const adapter = createCloudSyncAdapter({
    API_URL: options.apiUrl,
    token: options.token,
    normalizeCloudShortcutsPayload: options.normalizeCloudShortcutsPayload,
  });

  return {
    scopeKey: options.storageScopeKey || options.apiUrl,
    readLegacyPayload: async () => {
      const result = await adapter.pull();
      if (result.status !== 200) return null;
      return toLegacyPayload(result.payload);
    },
    writeLegacyPayload: async (payload) => {
      const latest = await adapter.pull();
      const expectedVersion = Number.isFinite(latest.version as number) ? Number(latest.version) : undefined;
      const writePayload: CloudShortcutsPayloadV3 = {
        version: 3,
        scenarioModes: payload.scenarioModes as CloudShortcutsPayloadV3['scenarioModes'],
        selectedScenarioId: payload.selectedScenarioId,
        scenarioShortcuts: payload.scenarioShortcuts as CloudShortcutsPayloadV3['scenarioShortcuts'],
        customShortcutIcons: payload.customShortcutIcons,
      };
      const response = await adapter.push(writePayload, {
        expectedVersion,
        mode: 'prefer_local',
      });
      if (!response.ok && response.status === 409) {
        const retryLatest = await adapter.pull();
        const retryExpectedVersion = Number.isFinite(retryLatest.version as number)
          ? Number(retryLatest.version)
          : undefined;
        await adapter.push(writePayload, {
          expectedVersion: retryExpectedVersion,
          mode: 'prefer_local',
        });
      }
    },
  };
};

export class LeafTabLegacyCloudCompat extends LeafTabLegacySingleFileCompat {
  constructor(options: LeafTabLegacyCloudCompatOptions) {
    super({
      deviceId: options.deviceId,
      rootPath: options.rootPath,
      bridgeEnabled: options.bridgeEnabled,
      buildLegacyPayload: options.buildLegacyPayload,
      baselineStore: options.baselineStore,
      remoteStore: options.remoteStore,
      legacyDriver: createLegacyDriver(options),
      buildLocalSnapshot: options.buildLocalSnapshot,
      applyLocalSnapshot: options.applyLocalSnapshot,
    });
  }
}
