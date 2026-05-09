// @vitest-environment node

import { webcrypto } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startMockSyncService } from '../../../tests/support/mockSyncService.mjs';
import { LeafTabSyncMemoryBaselineStore } from './baseline';
import { LeafTabSyncCloudRemoteStoreError } from './cloudRemoteStore';
import { LeafTabDestructiveBookmarkChangeError, LeafTabSyncEngine } from './engine';
import {
  createLeafTabSyncEncryptionMetadata,
  LeafTabSyncCloudEncryptedTransport,
  LeafTabSyncEncryptedRemoteStore,
  LeafTabSyncWebdavEncryptedTransport,
  serializeLeafTabSyncKeyBytes,
} from './encryption';
import type { LeafTabSyncSnapshot } from './schema';
import { LeafTabSyncWebdavLockError, LeafTabSyncWebdavStore, LeafTabSyncWebdavTimeoutError } from './webdavStore';
import {
  createLeafTabCloudEncryptionScopeKey,
  createLeafTabWebdavEncryptionScopeKey,
  writeLeafTabSyncEncryptionConfig,
} from '@/utils/leafTabSyncEncryption';

type MockSyncService = Awaited<ReturnType<typeof startMockSyncService>>;

function cloneSnapshot(snapshot: LeafTabSyncSnapshot) {
  return JSON.parse(JSON.stringify(snapshot)) as LeafTabSyncSnapshot;
}

function createEmptySnapshot(deviceId: string): LeafTabSyncSnapshot {
  const now = new Date().toISOString();
  return {
    meta: {
      version: 2,
      deviceId,
      generatedAt: now,
    },
    preferences: null,
    scenarios: {},
    shortcuts: {},
    customShortcutIcons: {},
    bookmarkFolders: {},
    bookmarkItems: {},
    scenarioOrder: {
      type: 'scenario-order',
      ids: [],
      updatedAt: now,
      updatedBy: deviceId,
      revision: 1,
    },
    shortcutOrders: {},
    bookmarkOrders: {},
    tombstones: {},
  };
}

function createSnapshot(params: {
  deviceId: string;
  shortcutTitles?: string[];
  bookmarkCount?: number;
}): LeafTabSyncSnapshot {
  const { deviceId } = params;
  const shortcutTitles = params.shortcutTitles ?? ['Docs'];
  const bookmarkCount = params.bookmarkCount ?? 0;
  const now = new Date().toISOString();
  const scenarioId = 'life-mode-001';
  const bookmarkRootId = 'bookmark-root';

  const snapshot = createEmptySnapshot(deviceId);
  snapshot.scenarios[scenarioId] = {
    id: scenarioId,
    type: 'scenario',
    name: 'Life',
    color: '#3DD6C5',
    icon: 'leaf',
    archived: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: deviceId,
    revision: 1,
  };
  snapshot.scenarioOrder = {
    type: 'scenario-order',
    ids: [scenarioId],
    updatedAt: now,
    updatedBy: deviceId,
    revision: 1,
  };

  const shortcutIds: string[] = [];
  shortcutTitles.forEach((title, index) => {
    const shortcutId = `shortcut-${index + 1}`;
    shortcutIds.push(shortcutId);
    snapshot.shortcuts[shortcutId] = {
      id: shortcutId,
      type: 'shortcut',
      scenarioId,
      title,
      url: `https://${title.toLowerCase()}.example`,
      icon: '',
      description: '',
      createdAt: now,
      updatedAt: now,
      updatedBy: deviceId,
      revision: 1,
    };
  });
  snapshot.shortcutOrders[scenarioId] = {
    type: 'shortcut-order',
    scenarioId,
    ids: shortcutIds,
    updatedAt: now,
    updatedBy: deviceId,
    revision: 1,
  };

  if (bookmarkCount > 0) {
    snapshot.bookmarkFolders[bookmarkRootId] = {
      id: bookmarkRootId,
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: now,
      updatedAt: now,
      updatedBy: deviceId,
      revision: 1,
    };
    const bookmarkIds: string[] = [];
    for (let index = 0; index < bookmarkCount; index += 1) {
      const bookmarkId = `bookmark-${index + 1}`;
      bookmarkIds.push(bookmarkId);
      snapshot.bookmarkItems[bookmarkId] = {
        id: bookmarkId,
        type: 'bookmark-item',
        parentId: bookmarkRootId,
        title: `Bookmark ${index + 1}`,
        url: `https://bookmark-${index + 1}.example`,
        createdAt: now,
        updatedAt: now,
        updatedBy: deviceId,
        revision: 1,
      };
    }
    snapshot.bookmarkOrders[bookmarkRootId] = {
      type: 'bookmark-order',
      parentId: bookmarkRootId,
      ids: bookmarkIds,
      updatedAt: now,
      updatedBy: deviceId,
      revision: 1,
    };
  }

  snapshot.meta.generatedAt = now;
  return snapshot;
}

function addShortcut(snapshot: LeafTabSyncSnapshot, deviceId: string, title: string) {
  const now = new Date().toISOString();
  const baseId = `${String(deviceId || 'device').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-${title.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}`;
  let shortcutId = `shortcut-${baseId}`;
  let suffix = 1;
  while (snapshot.shortcuts[shortcutId]) {
    suffix += 1;
    shortcutId = `shortcut-${baseId}-${suffix}`;
  }
  const scenarioId = snapshot.scenarioOrder.ids[0] || 'life-mode-001';
  snapshot.shortcuts[shortcutId] = {
    id: shortcutId,
    type: 'shortcut',
    scenarioId,
    title,
    url: `https://${title.toLowerCase()}.example`,
    icon: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    updatedBy: deviceId,
    revision: 1,
  };
  const currentOrder = snapshot.shortcutOrders[scenarioId];
  snapshot.shortcutOrders[scenarioId] = {
    type: 'shortcut-order',
    scenarioId,
    ids: [...(currentOrder?.ids || []), shortcutId],
    updatedAt: now,
    updatedBy: deviceId,
    revision: (currentOrder?.revision || 0) + 1,
  };
  snapshot.meta.generatedAt = now;
}

function listShortcutTitles(snapshot: LeafTabSyncSnapshot) {
  return Object.values(snapshot.shortcuts)
    .map((shortcut) => shortcut.title)
    .sort();
}

function getBookmarkItemCount(snapshot: LeafTabSyncSnapshot) {
  return Object.keys(snapshot.bookmarkItems).length;
}

async function seedEncryption(scopeKey: string) {
  const { metadata, keyBytes } = await createLeafTabSyncEncryptionMetadata('test-passphrase');
  writeLeafTabSyncEncryptionConfig(
    scopeKey,
    metadata,
    serializeLeafTabSyncKeyBytes(keyBytes),
  );
}

function createEngine(params: {
  deviceId: string;
  remoteStore: LeafTabSyncEncryptedRemoteStore;
  initialSnapshot: LeafTabSyncSnapshot;
}) {
  const snapshotRef = {
    current: cloneSnapshot(params.initialSnapshot),
  };
  const appliedSnapshots: LeafTabSyncSnapshot[] = [];
  const engine = new LeafTabSyncEngine({
    deviceId: params.deviceId,
    remoteStore: params.remoteStore,
    baselineStore: new LeafTabSyncMemoryBaselineStore(),
    buildLocalSnapshot: async () => cloneSnapshot(snapshotRef.current),
    applyLocalSnapshot: async (snapshot) => {
      snapshotRef.current = cloneSnapshot(snapshot);
      appliedSnapshots.push(cloneSnapshot(snapshot));
    },
    createEmptySnapshot: () => createEmptySnapshot(params.deviceId),
    rootPath: 'leaftab/v1',
  });
  return {
    engine,
    snapshotRef,
    appliedSnapshots,
  };
}

describe('encrypted sync remote integration', () => {
  let service: MockSyncService;
  let originalCrypto: Crypto | undefined;

  beforeAll(async () => {
    originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        clear() {
          storage.clear();
        },
        getItem(key: string) {
          return storage.has(key) ? storage.get(key) ?? null : null;
        },
        key(index: number) {
          return Array.from(storage.keys())[index] ?? null;
        },
        removeItem(key: string) {
          storage.delete(key);
        },
        setItem(key: string, value: string) {
          storage.set(String(key), String(value));
        },
        get length() {
          return storage.size;
        },
      } satisfies Storage,
    });
    service = await startMockSyncService();
  });

  afterAll(async () => {
    await service.close();
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  beforeEach(() => {
    localStorage.clear();
    service.resetState();
  });

  it('round-trips cloud sync data through the virtual cloud service', async () => {
    const scopeKey = createLeafTabCloudEncryptionScopeKey('test-user');
    await seedEncryption(scopeKey);

    const cloudTransport = new LeafTabSyncCloudEncryptedTransport({
      apiUrl: `${service.url}/api`,
      token: 'test-token',
    });
    const remoteStore = new LeafTabSyncEncryptedRemoteStore({
      transport: cloudTransport,
      scopeKey,
      scopeLabel: 'Cloud',
      rootPath: 'leaftab/v1',
    });

    const localSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Docs', 'Mail'],
      bookmarkCount: 8,
    });
    const pushEngine = createEngine({
      deviceId: 'device-a',
      remoteStore,
      initialSnapshot: localSnapshot,
    });

    const pushResult = await pushEngine.engine.sync('push-local');
    expect(pushResult.kind).toBe('push');

    const cloudStateAfterPush = service.getState().cloud;
    expect(cloudStateAfterPush.commit?.id).toBe(pushResult.remoteCommitId);
    expect(Object.keys(cloudStateAfterPush.files)).not.toHaveLength(0);

    const pullEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: createEmptySnapshot('device-b'),
    });

    const pullResult = await pullEngine.engine.sync('pull-remote');
    expect(pullResult.kind).toBe('pull');
    expect(pullEngine.appliedSnapshots).toHaveLength(1);
    expect(pullEngine.snapshotRef.current.shortcuts).toEqual(localSnapshot.shortcuts);
    expect(pullEngine.snapshotRef.current.bookmarkItems).toEqual(localSnapshot.bookmarkItems);
  });

  it('blocks destructive cloud bookmark pushes and preserves remote data', async () => {
    const scopeKey = createLeafTabCloudEncryptionScopeKey('test-user');
    await seedEncryption(scopeKey);

    const remoteStore = new LeafTabSyncEncryptedRemoteStore({
      transport: new LeafTabSyncCloudEncryptedTransport({
        apiUrl: `${service.url}/api`,
        token: 'test-token',
      }),
      scopeKey,
      scopeLabel: 'Cloud',
      rootPath: 'leaftab/v1',
    });

    const safeSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Docs'],
      bookmarkCount: 120,
    });
    const initialEngine = createEngine({
      deviceId: 'device-a',
      remoteStore,
      initialSnapshot: safeSnapshot,
    });
    const initialPush = await initialEngine.engine.sync('push-local');
    const initialCommitId = initialPush.remoteCommitId;

    const riskySnapshot = createSnapshot({
      deviceId: 'device-b',
      shortcutTitles: ['Docs'],
      bookmarkCount: 2,
    });
    const riskyEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: riskySnapshot,
    });

    await expect(riskyEngine.engine.sync('push-local')).rejects.toBeInstanceOf(
      LeafTabDestructiveBookmarkChangeError,
    );

    const cloudStateAfterFailure = service.getState().cloud;
    expect(cloudStateAfterFailure.commit?.id).toBe(initialCommitId);
  });

  it('allows destructive cloud bookmark pull only when explicitly requested', async () => {
    const scopeKey = createLeafTabCloudEncryptionScopeKey('test-user');
    await seedEncryption(scopeKey);

    const remoteStore = new LeafTabSyncEncryptedRemoteStore({
      transport: new LeafTabSyncCloudEncryptedTransport({
        apiUrl: `${service.url}/api`,
        token: 'test-token',
      }),
      scopeKey,
      scopeLabel: 'Cloud',
      rootPath: 'leaftab/v1',
    });

    const remoteSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Docs'],
      bookmarkCount: 2,
    });
    const remoteEngine = createEngine({
      deviceId: 'device-a',
      remoteStore,
      initialSnapshot: remoteSnapshot,
    });
    await remoteEngine.engine.sync('push-local');

    const localSnapshot = createSnapshot({
      deviceId: 'device-b',
      shortcutTitles: ['Docs'],
      bookmarkCount: 120,
    });
    const localEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: localSnapshot,
    });

    await expect(localEngine.engine.sync('pull-remote')).rejects.toBeInstanceOf(
      LeafTabDestructiveBookmarkChangeError,
    );
    expect(getBookmarkItemCount(localEngine.snapshotRef.current)).toBe(120);

    const pullResult = await localEngine.engine.sync('pull-remote', {
      allowDestructiveBookmarkChanges: true,
    });
    expect(pullResult.kind).toBe('pull');
    expect(getBookmarkItemCount(localEngine.snapshotRef.current)).toBe(2);
  });

  it('merges concurrent cloud edits from local and remote without dropping either side', async () => {
    const scopeKey = createLeafTabCloudEncryptionScopeKey('test-user');
    await seedEncryption(scopeKey);

    const baseSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Docs'],
      bookmarkCount: 4,
    });

    const initialPushEngine = createEngine({
      deviceId: 'device-a',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: baseSnapshot,
    });
    await initialPushEngine.engine.sync('push-local');

    const mergeEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: cloneSnapshot(baseSnapshot),
    });
    await mergeEngine.engine.sync('pull-remote');

    addShortcut(mergeEngine.snapshotRef.current, 'device-b', 'Mail');

    const remoteChangedSnapshot = cloneSnapshot(baseSnapshot);
    addShortcut(remoteChangedSnapshot, 'device-a', 'Calendar');
    const remoteChangedEngine = createEngine({
      deviceId: 'device-a',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: remoteChangedSnapshot,
    });
    await remoteChangedEngine.engine.sync('push-local');

    const mergeResult = await mergeEngine.engine.sync('auto');
    expect(mergeResult.kind).toBe('merge');
    expect(listShortcutTitles(mergeEngine.snapshotRef.current)).toEqual(['Calendar', 'Docs', 'Mail']);

    const verifyEngine = createEngine({
      deviceId: 'device-c',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: createEmptySnapshot('device-c'),
    });
    await verifyEngine.engine.sync('pull-remote', {
      allowDestructiveBookmarkChanges: true,
    });
    expect(listShortcutTitles(verifyEngine.snapshotRef.current)).toEqual(['Calendar', 'Docs', 'Mail']);
  });

  it('self-heals corrupted cloud encrypted payloads by re-uploading local data', async () => {
    const scopeKey = createLeafTabCloudEncryptionScopeKey('test-user');
    await seedEncryption(scopeKey);

    const localSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Docs', 'Mail'],
      bookmarkCount: 30,
    });
    const initialEngine = createEngine({
      deviceId: 'device-a',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: localSnapshot,
    });
    await initialEngine.engine.sync('push-local');

    const corruptedState = service.getState();
    const manifestPath = corruptedState.cloud.commit?.manifestPath;
    if (!manifestPath) {
      throw new Error('Missing manifest path in corrupted cloud state test');
    }
    corruptedState.cloud.files[manifestPath] = '{"kind":"corrupted"}';
    service.resetState(corruptedState);

    const recoveryEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: cloneSnapshot(localSnapshot),
    });

    const recoveryResult = await recoveryEngine.engine.sync('auto');
    expect(['push', 'merge', 'noop']).toContain(recoveryResult.kind);
    expect(listShortcutTitles(recoveryEngine.snapshotRef.current)).toEqual(['Docs', 'Mail']);
    expect(getBookmarkItemCount(recoveryEngine.snapshotRef.current)).toBe(30);

    const verifyEngine = createEngine({
      deviceId: 'device-c',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncCloudEncryptedTransport({
          apiUrl: `${service.url}/api`,
          token: 'test-token',
        }),
        scopeKey,
        scopeLabel: 'Cloud',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: createEmptySnapshot('device-c'),
    });
    await verifyEngine.engine.sync('pull-remote', {
      allowDestructiveBookmarkChanges: true,
    });
    expect(listShortcutTitles(verifyEngine.snapshotRef.current)).toEqual(['Docs', 'Mail']);
    expect(getBookmarkItemCount(verifyEngine.snapshotRef.current)).toBe(30);
  });

  it('round-trips WebDAV sync data through the virtual WebDAV service', async () => {
    const webdavUrl = `${service.url}/__mock_webdav__`;
    const scopeKey = createLeafTabWebdavEncryptionScopeKey(webdavUrl, 'leaftab/v1');
    await seedEncryption(scopeKey);

    const webdavStore = new LeafTabSyncWebdavStore({
      url: webdavUrl,
      username: 'mason',
      password: 'secret',
      rootPath: 'leaftab/v1',
      requestPermission: false,
    });
    const remoteStore = new LeafTabSyncEncryptedRemoteStore({
      transport: new LeafTabSyncWebdavEncryptedTransport({
        webdavStore,
        rootPath: 'leaftab/v1',
      }),
      scopeKey,
      scopeLabel: 'WebDAV',
      rootPath: 'leaftab/v1',
    });

    const localSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Inbox', 'Calendar'],
      bookmarkCount: 6,
    });
    const pushEngine = createEngine({
      deviceId: 'device-a',
      remoteStore,
      initialSnapshot: localSnapshot,
    });

    const pushResult = await pushEngine.engine.sync('push-local');
    expect(pushResult.kind).toBe('push');

    const webdavStateAfterPush = service.getState().webdav.entries;
    expect(webdavStateAfterPush['leaftab/v1/head.json']).toBeTruthy();

    const pullEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncWebdavEncryptedTransport({
          webdavStore: new LeafTabSyncWebdavStore({
            url: webdavUrl,
            username: 'mason',
            password: 'secret',
            rootPath: 'leaftab/v1',
            requestPermission: false,
          }),
          rootPath: 'leaftab/v1',
        }),
        scopeKey,
        scopeLabel: 'WebDAV',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: createEmptySnapshot('device-b'),
    });

    const pullResult = await pullEngine.engine.sync('pull-remote');
    expect(pullResult.kind).toBe('pull');
    expect(pullEngine.snapshotRef.current.shortcuts).toEqual(localSnapshot.shortcuts);
    expect(pullEngine.snapshotRef.current.bookmarkItems).toEqual(localSnapshot.bookmarkItems);
  });

  it('rejects a second active WebDAV lock from another device', async () => {
    const webdavUrl = `${service.url}/__mock_webdav__`;
    const primaryStore = new LeafTabSyncWebdavStore({
      url: webdavUrl,
      username: 'mason',
      password: 'secret',
      rootPath: 'leaftab/v1',
      requestPermission: false,
    });
    const competingStore = new LeafTabSyncWebdavStore({
      url: webdavUrl,
      username: 'mason',
      password: 'secret',
      rootPath: 'leaftab/v1',
      requestPermission: false,
    });

    await primaryStore.acquireLock('device-a', 60_000);
    await expect(competingStore.acquireLock('device-b', 60_000)).rejects.toBeInstanceOf(
      LeafTabSyncWebdavLockError,
    );
    await primaryStore.releaseLock();
  });

  it('times out stalled WebDAV requests', async () => {
    const server = await new Promise<import('node:http').Server>((resolve) => {
      void import('node:http').then(({ createServer }) => {
        const nextServer = createServer((_req, _res) => {});
        nextServer.listen(0, '127.0.0.1', () => resolve(nextServer));
      });
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('missing test server address');
      }
      const store = new LeafTabSyncWebdavStore({
        url: `http://127.0.0.1:${address.port}`,
        rootPath: 'leaftab/v1',
        requestPermission: false,
        requestTimeoutMs: 25,
      });

      await expect(store.readJsonFile('leaftab/v1/head.json')).rejects.toBeInstanceOf(
        LeafTabSyncWebdavTimeoutError,
      );
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  it('rejects a second active cloud lock from another device', async () => {
    const primaryTransport = new LeafTabSyncCloudEncryptedTransport({
      apiUrl: `${service.url}/api`,
      token: 'test-token',
    });
    const competingTransport = new LeafTabSyncCloudEncryptedTransport({
      apiUrl: `${service.url}/api`,
      token: 'test-token',
    });

    await primaryTransport.acquireLock('device-a', 60_000);
    await expect(competingTransport.acquireLock('device-b', 60_000)).rejects.toBeInstanceOf(
      LeafTabSyncCloudRemoteStoreError,
    );
    await primaryTransport.releaseLock();
  });

  it('allows destructive WebDAV bookmark pull only when explicitly requested', async () => {
    const webdavUrl = `${service.url}/__mock_webdav__`;
    const scopeKey = createLeafTabWebdavEncryptionScopeKey(webdavUrl, 'leaftab/v1');
    await seedEncryption(scopeKey);

    const remoteStore = new LeafTabSyncEncryptedRemoteStore({
      transport: new LeafTabSyncWebdavEncryptedTransport({
        webdavStore: new LeafTabSyncWebdavStore({
          url: webdavUrl,
          username: 'mason',
          password: 'secret',
          rootPath: 'leaftab/v1',
          requestPermission: false,
        }),
        rootPath: 'leaftab/v1',
      }),
      scopeKey,
      scopeLabel: 'WebDAV',
      rootPath: 'leaftab/v1',
    });

    const remoteSnapshot = createSnapshot({
      deviceId: 'device-a',
      shortcutTitles: ['Docs'],
      bookmarkCount: 3,
    });
    const remoteEngine = createEngine({
      deviceId: 'device-a',
      remoteStore,
      initialSnapshot: remoteSnapshot,
    });
    await remoteEngine.engine.sync('push-local');

    const localSnapshot = createSnapshot({
      deviceId: 'device-b',
      shortcutTitles: ['Docs'],
      bookmarkCount: 140,
    });
    const localEngine = createEngine({
      deviceId: 'device-b',
      remoteStore: new LeafTabSyncEncryptedRemoteStore({
        transport: new LeafTabSyncWebdavEncryptedTransport({
          webdavStore: new LeafTabSyncWebdavStore({
            url: webdavUrl,
            username: 'mason',
            password: 'secret',
            rootPath: 'leaftab/v1',
            requestPermission: false,
          }),
          rootPath: 'leaftab/v1',
        }),
        scopeKey,
        scopeLabel: 'WebDAV',
        rootPath: 'leaftab/v1',
      }),
      initialSnapshot: localSnapshot,
    });

    await expect(localEngine.engine.sync('pull-remote')).rejects.toBeInstanceOf(
      LeafTabDestructiveBookmarkChangeError,
    );
    expect(getBookmarkItemCount(localEngine.snapshotRef.current)).toBe(140);

    const pullResult = await localEngine.engine.sync('pull-remote', {
      allowDestructiveBookmarkChanges: true,
    });
    expect(pullResult.kind).toBe('pull');
    expect(getBookmarkItemCount(localEngine.snapshotRef.current)).toBe(3);
  });
});
