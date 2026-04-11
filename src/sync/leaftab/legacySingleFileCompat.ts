import {
  buildBackupDataV4,
  mergeWebdavPayload,
  type WebdavPayload,
} from '@/utils/backupData';
import {
  createLeafTabSyncBaseline,
  type LeafTabSyncBaselineStore,
} from './baseline';
import {
  buildLeafTabSyncSnapshot,
} from './snapshot';
import type { LeafTabSyncSnapshot, LeafTabSyncTombstone } from './schema';
import type { LeafTabSyncRemoteStore } from './remoteStore';
import { getDefaultSyncablePreferences } from '@/utils/syncablePreferences';

export interface LeafTabLegacySingleFileDriver {
  scopeKey?: string;
  readLegacyPayload: () => Promise<WebdavPayload | null>;
  writeLegacyPayload: (payload: WebdavPayload) => Promise<void>;
}

export interface LeafTabLegacySingleFileCompatOptions {
  deviceId: string;
  rootPath?: string;
  bridgeEnabled?: boolean;
  buildLegacyPayload?: () => WebdavPayload;
  baselineStore: LeafTabSyncBaselineStore;
  remoteStore: LeafTabSyncRemoteStore;
  legacyDriver: LeafTabLegacySingleFileDriver;
  buildLocalSnapshot: () => Promise<LeafTabSyncSnapshot>;
  applyLocalSnapshot: (snapshot: LeafTabSyncSnapshot) => Promise<void>;
}

export interface LeafTabLegacySingleFileMigrationResult {
  migrated: boolean;
  legacyPayloadFound: boolean;
  snapshot: LeafTabSyncSnapshot | null;
  commitId: string | null;
}

export interface LeafTabLegacySingleFilePreparedSnapshotResult {
  migrated: boolean;
  importedLegacy: boolean;
  legacyPayloadFound: boolean;
  snapshot: LeafTabSyncSnapshot;
  legacyHash: string | null;
}

type LeafTabLegacySingleFileBridgeState = {
  lastImportedHash: string | null;
  lastMirroredHash: string | null;
  updatedAt: string;
};

type LeafTabLegacyMirrorOptions = {
  importedLegacyHash?: string | null;
};

const LEGACY_SINGLE_FILE_BRIDGE_STATE_PREFIX = 'leaftab_sync_legacy_single_file_bridge_v1:';

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
};

const shortHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const createBridgeStateStorageKey = (scopeKey?: string, rootPath?: string) => {
  const suffix = `${scopeKey || ''}|${rootPath || ''}`
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${LEGACY_SINGLE_FILE_BRIDGE_STATE_PREFIX}${suffix}`;
};

const fingerprintLegacyPayload = (payload: WebdavPayload) => {
  return shortHash(stableStringify({
    scenarioModes: Array.isArray(payload.scenarioModes) ? payload.scenarioModes : [],
    selectedScenarioId: payload.selectedScenarioId || '',
    scenarioShortcuts: Object.fromEntries(
      Object.entries(payload.scenarioShortcuts || {})
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  }));
};

const projectSnapshotToLegacyPayload = (snapshot: LeafTabSyncSnapshot): WebdavPayload => {
  const orderedScenarioIds = snapshot.scenarioOrder.ids.filter((id: string) => snapshot.scenarios[id]);
  const remainingScenarioIds = Object.keys(snapshot.scenarios)
    .filter((id: string) => !orderedScenarioIds.includes(id))
    .sort();
  const scenarioModes = orderedScenarioIds
    .concat(remainingScenarioIds)
    .map((scenarioId) => {
      const scenario = snapshot.scenarios[scenarioId];
      return {
        id: scenario.id,
        name: scenario.name,
        color: scenario.color,
        icon: scenario.icon,
      };
    });

  const scenarioShortcuts = Object.fromEntries(
    scenarioModes.map((scenario: { id: string }) => {
      const orderedShortcutIds = snapshot.shortcutOrders[scenario.id]?.ids || [];
      const remainingShortcutIds = Object.keys(snapshot.shortcuts)
        .filter((id: string) => snapshot.shortcuts[id]?.scenarioId === scenario.id && !orderedShortcutIds.includes(id))
        .sort();
      const shortcutIds = orderedShortcutIds
        .concat(remainingShortcutIds)
        .filter((id: string) => snapshot.shortcuts[id]?.scenarioId === scenario.id);

		      return [scenario.id, shortcutIds.map((shortcutId: string) => {
		        const shortcut = snapshot.shortcuts[shortcutId];
		        return {
		          id: shortcut.id,
		          title: shortcut.title,
		          url: shortcut.url,
		          icon: shortcut.icon,
		          kind: shortcut.kind || 'link',
		          children: shortcut.children,
		          useOfficialIcon: shortcut.useOfficialIcon,
		          autoUseOfficialIcon: shortcut.autoUseOfficialIcon,
		          officialIconAvailableAtSave: shortcut.officialIconAvailableAtSave,
	          iconRendering: shortcut.iconRendering,
	          iconColor: shortcut.iconColor,
	        };
	      })];
	    }),
	  );

  return {
    scenarioModes,
    selectedScenarioId: scenarioModes[0]?.id || '',
    scenarioShortcuts,
  };
};

const preserveBookmarkTombstones = (snapshot: LeafTabSyncSnapshot) => {
  return Object.fromEntries(
    Object.entries(snapshot.tombstones).filter(([, tombstone]: [string, LeafTabSyncTombstone]) => (
      tombstone.type === 'bookmark-folder' || tombstone.type === 'bookmark-item'
    )),
  );
};

const mergeLegacyPayloadIntoSnapshot = (params: {
  localSnapshot: LeafTabSyncSnapshot;
  mergedPayload: WebdavPayload;
  deviceId: string;
}) => {
  const generatedAt = new Date().toISOString();
  const legacySubsetSnapshot = buildLeafTabSyncSnapshot({
    preferences: params.localSnapshot.preferences?.value || getDefaultSyncablePreferences(),
    scenarioModes: params.mergedPayload.scenarioModes as any,
    scenarioShortcuts: params.mergedPayload.scenarioShortcuts as any,
    deviceId: params.deviceId,
    generatedAt,
  });

  return {
    meta: legacySubsetSnapshot.meta,
    preferences: params.localSnapshot.preferences,
    scenarios: legacySubsetSnapshot.scenarios,
    shortcuts: legacySubsetSnapshot.shortcuts,
    bookmarkFolders: params.localSnapshot.bookmarkFolders,
    bookmarkItems: params.localSnapshot.bookmarkItems,
    scenarioOrder: legacySubsetSnapshot.scenarioOrder,
    shortcutOrders: legacySubsetSnapshot.shortcutOrders,
    bookmarkOrders: params.localSnapshot.bookmarkOrders,
    tombstones: preserveBookmarkTombstones(params.localSnapshot),
  } satisfies LeafTabSyncSnapshot;
};

const sameSnapshotContent = (left: LeafTabSyncSnapshot, right: LeafTabSyncSnapshot) => {
  return JSON.stringify({
    preferences: left.preferences,
    scenarios: left.scenarios,
    shortcuts: left.shortcuts,
    bookmarkFolders: left.bookmarkFolders,
    bookmarkItems: left.bookmarkItems,
    scenarioOrder: left.scenarioOrder,
    shortcutOrders: left.shortcutOrders,
    bookmarkOrders: left.bookmarkOrders,
    tombstones: left.tombstones,
  }) === JSON.stringify({
    preferences: right.preferences,
    scenarios: right.scenarios,
    shortcuts: right.shortcuts,
    bookmarkFolders: right.bookmarkFolders,
    bookmarkItems: right.bookmarkItems,
    scenarioOrder: right.scenarioOrder,
    shortcutOrders: right.shortcutOrders,
    bookmarkOrders: right.bookmarkOrders,
    tombstones: right.tombstones,
  });
};

export class LeafTabLegacySingleFileCompat {
  private readonly options: LeafTabLegacySingleFileCompatOptions;
  private readonly bridgeStateStorageKey: string;
  private static readonly memoryBridgeState = new Map<string, LeafTabLegacySingleFileBridgeState>();

  constructor(options: LeafTabLegacySingleFileCompatOptions) {
    this.options = options;
    this.bridgeStateStorageKey = createBridgeStateStorageKey(
      options.legacyDriver.scopeKey,
      options.rootPath,
    );
  }

  private readBridgeState(): LeafTabLegacySingleFileBridgeState | null {
    const inMemory = LeafTabLegacySingleFileCompat.memoryBridgeState.get(this.bridgeStateStorageKey);
    if (inMemory) return inMemory;

    try {
      const raw = globalThis.localStorage?.getItem(this.bridgeStateStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LeafTabLegacySingleFileBridgeState | null;
      if (!parsed) return null;
      LeafTabLegacySingleFileCompat.memoryBridgeState.set(this.bridgeStateStorageKey, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private writeBridgeState(state: LeafTabLegacySingleFileBridgeState) {
    LeafTabLegacySingleFileCompat.memoryBridgeState.set(this.bridgeStateStorageKey, state);
    try {
      globalThis.localStorage?.setItem(this.bridgeStateStorageKey, JSON.stringify(state));
    } catch {}
  }

  private buildLegacyPayloadFromSnapshot(snapshot: LeafTabSyncSnapshot) {
    const projected = projectSnapshotToLegacyPayload(snapshot);
    const current = this.options.buildLegacyPayload?.();
    const selectedScenarioId = current?.selectedScenarioId
      && projected.scenarioModes.some((scenario) => scenario?.id === current.selectedScenarioId)
      ? current.selectedScenarioId
      : projected.selectedScenarioId;

    return {
      scenarioModes: projected.scenarioModes,
      selectedScenarioId,
      scenarioShortcuts: projected.scenarioShortcuts,
    } satisfies WebdavPayload;
  }

  async prepareLocalSnapshot(
    localSnapshotInput?: LeafTabSyncSnapshot,
  ): Promise<LeafTabLegacySingleFilePreparedSnapshotResult> {
    const localSnapshot = localSnapshotInput
      ? JSON.parse(JSON.stringify(localSnapshotInput)) as LeafTabSyncSnapshot
      : await this.options.buildLocalSnapshot();

    const [baseline, remoteState, legacyPayload] = await Promise.all([
      this.options.baselineStore.load(),
      this.options.remoteStore.readState(),
      this.options.legacyDriver.readLegacyPayload(),
    ]);

    if (!legacyPayload) {
      return {
        migrated: false,
        importedLegacy: false,
        legacyPayloadFound: false,
        snapshot: localSnapshot,
        legacyHash: null,
      };
    }

    const hasNewEngineState = Boolean(
      baseline?.snapshot || baseline?.commitId || remoteState.head?.commitId || remoteState.snapshot,
    );
    const legacyHash = fingerprintLegacyPayload(legacyPayload);

    // Once the new sync engine has baseline or remote state, treat the legacy
    // payload as a downstream mirror only. Re-importing stale legacy ordering
    // can overwrite newer local layout changes before the mirror is refreshed.
    if (hasNewEngineState) {
      return {
        migrated: false,
        importedLegacy: false,
        legacyPayloadFound: true,
        snapshot: localSnapshot,
        legacyHash,
      };
    }

    const bridgeState = this.readBridgeState();

    if (
      bridgeState?.lastImportedHash === legacyHash
      || bridgeState?.lastMirroredHash === legacyHash
    ) {
      return {
        migrated: false,
        importedLegacy: false,
        legacyPayloadFound: true,
        snapshot: localSnapshot,
        legacyHash,
      };
    }

    const localLegacyPayload = this.options.buildLegacyPayload?.() || this.buildLegacyPayloadFromSnapshot(localSnapshot);
    const mergedPayload = mergeWebdavPayload(localLegacyPayload, legacyPayload);
    const preparedSnapshot = mergeLegacyPayloadIntoSnapshot({
      localSnapshot,
      mergedPayload,
      deviceId: this.options.deviceId,
    });

    return {
      migrated: !hasNewEngineState,
      importedLegacy: !sameSnapshotContent(localSnapshot, preparedSnapshot),
      legacyPayloadFound: true,
      snapshot: preparedSnapshot,
      legacyHash,
    };
  }

  async ensureMigrated(): Promise<LeafTabLegacySingleFileMigrationResult> {
    const localSnapshot = await this.options.buildLocalSnapshot();
    const prepared = await this.prepareLocalSnapshot(localSnapshot);
    if (!prepared.migrated) {
      return {
        migrated: false,
        legacyPayloadFound: prepared.legacyPayloadFound,
        snapshot: prepared.snapshot,
        commitId: null,
      };
    }

    await this.options.remoteStore.acquireLock(this.options.deviceId);
    try {
      const writeResult = await this.options.remoteStore.writeState({
        snapshot: prepared.snapshot,
        previousSnapshot: null,
        deviceId: this.options.deviceId,
        parentCommitId: null,
      });

      await this.options.baselineStore.save(createLeafTabSyncBaseline({
        snapshot: prepared.snapshot,
        commitId: writeResult.commit.id,
        rootPath: this.options.rootPath,
      }));

      if (!sameSnapshotContent(localSnapshot, prepared.snapshot)) {
        await this.options.applyLocalSnapshot(prepared.snapshot);
      }

      await this.writeLegacyMirrorFromSnapshot(prepared.snapshot, {
        importedLegacyHash: prepared.importedLegacy ? prepared.legacyHash : null,
      });

      return {
        migrated: true,
        legacyPayloadFound: true,
        snapshot: prepared.snapshot,
        commitId: writeResult.commit.id,
      };
    } finally {
      await this.options.remoteStore.releaseLock();
    }
  }

  async writeLegacyMirrorFromSnapshot(
    snapshot: LeafTabSyncSnapshot,
    mirrorOptions?: LeafTabLegacyMirrorOptions,
  ) {
    const nextBridgeState: LeafTabLegacySingleFileBridgeState = {
      lastImportedHash: mirrorOptions?.importedLegacyHash ?? this.readBridgeState()?.lastImportedHash ?? null,
      lastMirroredHash: this.readBridgeState()?.lastMirroredHash ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (this.options.bridgeEnabled !== false) {
      const legacyPayload = this.buildLegacyPayloadFromSnapshot(snapshot);
      await this.options.legacyDriver.writeLegacyPayload(legacyPayload);
      nextBridgeState.lastMirroredHash = fingerprintLegacyPayload(legacyPayload);
    }

    this.writeBridgeState(nextBridgeState);
  }
}
