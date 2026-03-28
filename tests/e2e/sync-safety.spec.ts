import { createLeafTabSyncBaseline } from '@/sync/leaftab/baseline';
import {
  buildLeafTabSyncSnapshot,
  createLeafTabSyncEncryptionMetadata,
  createLeafTabSyncHeadFile,
  createLeafTabSyncCommitFile,
  serializeLeafTabSyncKeyBytes,
} from '@/sync/leaftab';
import { createLeafTabSyncSerializedSnapshot } from '@/sync/leaftab/fileMap';
import { materializeLeafTabSyncSnapshotFromPayloadMap } from '@/sync/leaftab/snapshotCodec';
import type { LeafTabSyncCommitFile, LeafTabSyncHeadFile, LeafTabSyncSnapshot } from '@/sync/leaftab/schema';
import { createLeafTabCloudEncryptionScopeKey, LEAFTAB_SYNC_ENCRYPTION_STORAGE_PREFIX } from '@/utils/leafTabSyncEncryption';
import { getDefaultSyncablePreferences } from '@/utils/syncablePreferences';
import { expect, test } from './extension.fixtures';
import type { BrowserContext, Page, Route } from '@playwright/test';

type ScenarioMode = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type ShortcutItem = {
  id: string;
  title: string;
  url: string;
  icon: string;
  useOfficialIcon?: boolean;
  autoUseOfficialIcon?: boolean;
  officialIconAvailableAtSave?: boolean;
  iconRendering?: string;
  iconColor?: string;
};

type BookmarkSummary = {
  totalItems: number;
  toolbarItems: number;
  otherItems: number;
  titles: string[];
};

type SyncSeedOptions = {
  username: string;
  token: string;
  deviceId: string;
  profile: {
    scenarioModes: ScenarioMode[];
    selectedScenarioId: string;
    scenarioShortcuts: Record<string, ShortcutItem[]>;
  };
  bookmarkCount: number;
  cloudSyncEnabled: boolean;
  cloudSyncBookmarksEnabled: boolean;
  grantBookmarkPermission?: boolean;
  allowBookmarkPermissionRequest?: boolean;
  encryption: {
    scopeKey: string;
    metadata: unknown;
    cachedKey: string;
  };
  baselineSnapshot?: LeafTabSyncSnapshot | null;
};

type MockCloudState = {
  head: LeafTabSyncHeadFile | null;
  commit: LeafTabSyncCommitFile | null;
  files: Record<string, string | null>;
  snapshot: LeafTabSyncSnapshot | null;
  metadata: Awaited<ReturnType<typeof createLeafTabSyncEncryptionMetadata>>['metadata'];
  keyBytes: Uint8Array;
  writeCount: number;
};

const API_BASE = 'https://www.leaftab.cc/api';
const CLOUD_BASELINE_PREFIX = 'leaftab_cloud_sync_v1_baseline';
const TEST_PASSPHRASE = 'sync-safety-passphrase';
const ROOT_ORDER_KEY = '__root__';
const ROOT_FOLDERS = [
  { id: 'browser_root_toolbar', title: 'Bookmarks Bar' },
  { id: 'browser_root_other', title: 'Other Bookmarks' },
] as const;
const SCENARIO_MODES: ScenarioMode[] = [
  {
    id: 'life-mode-001',
    name: '生活模式',
    color: '#3DD6C5',
    icon: 'leaf',
  },
];

const createScenarioShortcuts = (titleSuffix: string): Record<string, ShortcutItem[]> => ({
  'life-mode-001': [
    {
      id: 'shortcut-gh',
      title: `GitHub ${titleSuffix}`,
      url: 'https://github.com',
      icon: '',
      iconColor: '',
    },
  ],
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const shortHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const slugify = (value: string) => {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'bookmark';
};

const createBookmarkEntityId = (
  parentId: string | null,
  title: string,
  url: string,
  occurrence: number,
) => {
  return `bkm_${slugify(title || url || 'item')}_${shortHash(`${parentId || ROOT_ORDER_KEY}|${title}|${url}|${occurrence}`)}`;
};

const createBookmarkTreeDraft = (count: number) => {
  const generatedItems = Array.from({ length: count }, (_, index) => {
    const title = `QA-${String(index + 1).padStart(3, '0')}`;
    const url = `https://qa-${String(index + 1).padStart(3, '0')}.example.com`;
    return {
      entityId: createBookmarkEntityId('browser_root_toolbar', title, url, 1),
      localNodeId: `toolbar-bookmark-${index + 1}`,
      parentId: 'browser_root_toolbar',
      title,
      url,
    };
  });

  return {
    folders: ROOT_FOLDERS.map((folder, index) => ({
      entityId: folder.id,
      localNodeId: String(index + 1),
      parentId: null,
      title: folder.title,
    })),
    items: generatedItems,
    orderIdsByParent: {
      __root__: ROOT_FOLDERS.map((folder) => folder.id),
      browser_root_toolbar: generatedItems.map((item) => item.entityId),
      browser_root_other: [],
    },
    nodeIdToEntityId: Object.fromEntries([
      ['1', 'browser_root_toolbar'],
      ['2', 'browser_root_other'],
      ...generatedItems.map((item) => [item.localNodeId, item.entityId]),
    ]),
  };
};

const buildSnapshot = (params: {
  deviceId: string;
  generatedAt: string;
  shortcutTitleSuffix: string;
  bookmarkCount: number;
}) => {
  return buildLeafTabSyncSnapshot({
    preferences: getDefaultSyncablePreferences(),
    scenarioModes: clone(SCENARIO_MODES),
    scenarioShortcuts: createScenarioShortcuts(params.shortcutTitleSuffix),
    bookmarkTree: createBookmarkTreeDraft(params.bookmarkCount),
    deviceId: params.deviceId,
    generatedAt: params.generatedAt,
  });
};

const encryptPayload = async (
  payload: unknown,
  keyBytes: Uint8Array,
) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintext,
  );
  const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
  return {
    kind: 'leaftab-sync-e2ee-file',
    version: 1,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
};

const decryptPayload = async (
  envelopeJson: string,
  keyBytes: Uint8Array,
) => {
  const envelope = JSON.parse(envelopeJson) as {
    iv: string;
    ciphertext: string;
  };
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: Buffer.from(envelope.iv, 'base64'),
    },
    aesKey,
    Buffer.from(envelope.ciphertext, 'base64'),
  );
  return JSON.parse(Buffer.from(plaintext).toString('utf8')) as unknown;
};

const buildEncryptedRemoteState = async (
  snapshot: LeafTabSyncSnapshot | null,
  keyBytes: Uint8Array,
  metadata: Awaited<ReturnType<typeof createLeafTabSyncEncryptionMetadata>>['metadata'],
): Promise<Pick<MockCloudState, 'head' | 'commit' | 'files' | 'snapshot'>> => {
  if (!snapshot) {
    return {
      head: null,
      commit: null,
      files: {},
      snapshot: null,
    };
  }

  const commit = createLeafTabSyncCommitFile({
    deviceId: snapshot.meta.deviceId,
    createdAt: snapshot.meta.generatedAt,
    parentCommitId: null,
    snapshot,
    rootPath: 'leaftab/v1',
  });
  commit.encryption = {
    mode: 'encrypted-sharded-v1',
    metadata,
  };
  const head = createLeafTabSyncHeadFile(commit.id, commit.createdAt);
  const serialized = createLeafTabSyncSerializedSnapshot(snapshot, {
    rootPath: 'leaftab/v1',
    commit,
    head,
  });
  const encryptedEntries = await Promise.all(
    Object.entries(serialized.payloads).map(async ([path, payload]) => {
      const envelope = await encryptPayload(payload, keyBytes);
      return [path, JSON.stringify(envelope)] as const;
    }),
  );

  return {
    head,
    commit,
    files: Object.fromEntries(encryptedEntries),
    snapshot,
  };
};

const sanitizeScopeSegment = (value: string) => value.trim().replace(/[^a-zA-Z0-9:_|.-]+/g, '_').slice(0, 240);

const createEncryptionStorageKey = (scopeKey: string) => {
  return `${LEAFTAB_SYNC_ENCRYPTION_STORAGE_PREFIX}${sanitizeScopeSegment(scopeKey)}`;
};

const createCloudBaselineStorageKey = (username: string) => {
  const suffix = (username || 'anonymous').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${CLOUD_BASELINE_PREFIX}:${suffix}`;
};

const installSyncApiMocks = async (context: BrowserContext) => {
  await context.addInitScript(() => {
    const guardKey = '__leaftabE2eSyncMocksInstalled';
    if ((globalThis as any)[guardKey]) return;
    (globalThis as any)[guardKey] = true;

    const STORAGE_KEY = '__leaftab_e2e_bookmarks_state_v1';
    const PERMISSIONS_KEY = '__leaftab_e2e_permissions_v1';
    const PERMISSION_REQUEST_POLICY_KEY = '__leaftab_e2e_permission_request_policy_v1';
    const ROOTS = [
      { id: '1', title: 'Bookmarks Bar' },
      { id: '2', title: 'Other Bookmarks' },
      { id: '3', title: 'Mobile Bookmarks' },
    ];

    type BookmarkNodeState = {
      id: string;
      title: string;
      parentId: string | null;
      url?: string;
      children?: string[];
    };

    const readPermissions = (): string[] => {
      try {
        return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || '[]');
      } catch {
        return [];
      }
    };

    const writePermissions = (permissions: string[]) => {
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(Array.from(new Set(permissions))));
    };

    const readPermissionRequestPolicy = (): Record<string, boolean> => {
      try {
        const parsed = JSON.parse(localStorage.getItem(PERMISSION_REQUEST_POLICY_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    };

    const writePermissionRequestPolicy = (policy: Record<string, boolean>) => {
      localStorage.setItem(PERMISSION_REQUEST_POLICY_KEY, JSON.stringify(policy));
    };

    const createEmptyBookmarkState = () => {
      const nodes: Record<string, BookmarkNodeState> = {
        '0': { id: '0', title: '', parentId: null, children: ROOTS.map((root) => root.id) },
      };
      ROOTS.forEach((root) => {
        nodes[root.id] = {
          id: root.id,
          title: root.title,
          parentId: '0',
          children: [],
        };
      });
      return {
        nextId: 1000,
        nodes,
      };
    };

    const readBookmarkState = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (parsed?.nodes && parsed?.nextId) return parsed;
      } catch {}
      const initial = createEmptyBookmarkState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    };

    const writeBookmarkState = (state: any) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };

    const materializeNode = (state: any, nodeId: string): chrome.bookmarks.BookmarkTreeNode => {
      const node = state.nodes[nodeId];
      return {
        id: node.id,
        title: node.title,
        parentId: node.parentId || undefined,
        url: node.url,
        children: node.children?.map((childId: string) => materializeNode(state, childId)),
      } as chrome.bookmarks.BookmarkTreeNode;
    };

    const createBookmarkSeed = (count: number) => {
      const state = createEmptyBookmarkState();
      for (let index = 0; index < count; index += 1) {
        const id = `toolbar-bookmark-${index + 1}`;
        const title = `QA-${String(index + 1).padStart(3, '0')}`;
        state.nodes[id] = {
          id,
          title,
          parentId: '1',
          url: `https://qa-${String(index + 1).padStart(3, '0')}.example.com`,
        };
        state.nodes['1'].children!.push(id);
      }
      writeBookmarkState(state);
    };

    const addPermission = (permission: string) => {
      const next = readPermissions();
      next.push(permission);
      writePermissions(next);
    };

    const removePermission = (permission: string) => {
      writePermissions(readPermissions().filter((item) => item !== permission));
    };

    const setPermissionRequestAllowed = (permission: string, allowed: boolean) => {
      const policy = readPermissionRequestPolicy();
      policy[permission] = allowed;
      writePermissionRequestPolicy(policy);
    };

    const api = (globalThis as any).chrome || {};
    api.permissions = {
      contains(query: chrome.permissions.Permissions, callback: (granted: boolean) => void) {
        const granted = readPermissions();
        const requiredPermissions = query.permissions || [];
        callback(requiredPermissions.every((permission) => granted.includes(permission)));
      },
      request(query: chrome.permissions.Permissions, callback: (granted: boolean) => void) {
        const requestedPermissions = query.permissions || [];
        const policy = readPermissionRequestPolicy();
        const denied = requestedPermissions.some((permission) => policy[permission] === false);
        if (denied) {
          callback(false);
          return;
        }
        requestedPermissions.forEach((permission) => addPermission(permission));
        callback(true);
      },
    };
    api.bookmarks = {
      getTree(callback: (nodes: chrome.bookmarks.BookmarkTreeNode[]) => void) {
        const state = readBookmarkState();
        callback([materializeNode(state, '0')]);
      },
      create(details: chrome.bookmarks.CreateDetails, callback: (node: chrome.bookmarks.BookmarkTreeNode) => void) {
        const state = readBookmarkState();
        const id = `node-${state.nextId++}`;
        const parentId = details.parentId || '1';
        state.nodes[id] = {
          id,
          title: details.title || '',
          parentId,
          url: details.url,
          children: details.url ? undefined : [],
        };
        state.nodes[parentId].children = state.nodes[parentId].children || [];
        state.nodes[parentId].children.push(id);
        writeBookmarkState(state);
        callback(materializeNode(state, id));
      },
      remove(id: string, callback: () => void) {
        const state = readBookmarkState();
        const node = state.nodes[id];
        if (node?.parentId && state.nodes[node.parentId]?.children) {
          state.nodes[node.parentId].children = state.nodes[node.parentId].children.filter((childId: string) => childId !== id);
        }
        delete state.nodes[id];
        writeBookmarkState(state);
        callback();
      },
      removeTree(id: string, callback: () => void) {
        const state = readBookmarkState();
        const removeRecursively = (targetId: string) => {
          const target = state.nodes[targetId];
          (target?.children || []).forEach((childId: string) => removeRecursively(childId));
          delete state.nodes[targetId];
        };
        const parentId = state.nodes[id]?.parentId;
        if (parentId && state.nodes[parentId]?.children) {
          state.nodes[parentId].children = state.nodes[parentId].children.filter((childId: string) => childId !== id);
        }
        removeRecursively(id);
        writeBookmarkState(state);
        callback();
      },
      onCreated: { addListener() {} },
      onRemoved: { addListener() {} },
      onChanged: { addListener() {} },
      onMoved: { addListener() {} },
      onChildrenReordered: { addListener() {} },
      onImportEnded: { addListener() {} },
    };

    (globalThis as any).chrome = api;
    (globalThis as any).__leaftabE2eSync = {
      resetBookmarks(count: number) {
        createBookmarkSeed(count);
      },
      resetPermissions(permissions: string[] = []) {
        writePermissions(permissions);
        writePermissionRequestPolicy({});
      },
      getBookmarkSummary(): BookmarkSummary {
        const state = readBookmarkState();
        const toolbarIds = state.nodes['1']?.children || [];
        const otherIds = state.nodes['2']?.children || [];
        const titles = toolbarIds.map((id: string) => state.nodes[id]?.title).filter(Boolean);
        return {
          totalItems: toolbarIds.length + otherIds.length,
          toolbarItems: toolbarIds.length,
          otherItems: otherIds.length,
          titles,
        };
      },
      grantBookmarkPermission() {
        addPermission('bookmarks');
      },
      revokeBookmarkPermission() {
        removePermission('bookmarks');
      },
      allowBookmarkPermissionRequest() {
        setPermissionRequestAllowed('bookmarks', true);
      },
      denyBookmarkPermissionRequest() {
        setPermissionRequestAllowed('bookmarks', false);
      },
    };
  });
};

const registerCloudRoutes = async (
  context: BrowserContext,
  state: MockCloudState,
) => {
  const handlers: Array<{ url: string | RegExp; handler: (route: Route) => Promise<void> | void }> = [];

  const addRoute = async (
    url: string | RegExp,
    handler: (route: Route) => Promise<void> | void,
  ) => {
    handlers.push({ url, handler });
    await context.route(url, handler);
  };

  await addRoute(`${API_BASE}/user/leaftab-sync/state`, async (route) => {
    const method = route.request().method();
    if (method !== 'GET') {
      await route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        head: state.head,
        commit: state.commit,
      }),
    });
  });

  await addRoute(`${API_BASE}/user/leaftab-sync/files/read`, async (route) => {
    const payload = route.request().postDataJSON() as { paths?: string[] };
    const files = Object.fromEntries(
      (payload.paths || []).map((path) => [path, state.files[path] ?? null]),
    );
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files }),
    });
  });

  await addRoute(`${API_BASE}/user/leaftab-sync/files/write`, async (route) => {
    const payload = route.request().postDataJSON() as {
      head: LeafTabSyncHeadFile;
      commit: LeafTabSyncCommitFile;
      files: Record<string, string>;
    };
    const mergedFiles = {
      ...state.files,
      ...(payload.files || {}),
    };
    const payloadMap: Record<string, unknown> = {};
    await Promise.all(
      Object.entries(mergedFiles).map(async ([path, body]) => {
        if (!body) return;
        payloadMap[path] = await decryptPayload(body, state.keyBytes);
      }),
    );
    const snapshot = materializeLeafTabSyncSnapshotFromPayloadMap(payloadMap, payload.commit);
    state.head = payload.head;
    state.commit = payload.commit;
    state.files = mergedFiles;
    state.snapshot = snapshot;
    state.writeCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        head: payload.head,
        commit: payload.commit,
      }),
    });
  });

  await addRoute(`${API_BASE}/user/leaftab-sync/lock`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          deviceId: 'mock-lock-device',
          acquiredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 120_000).toISOString(),
        }),
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await addRoute(`${API_BASE}/user/shortcuts`, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not found' }),
    });
  });

  await addRoute(`${API_BASE}/user/privacy`, async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  return async () => {
    await Promise.all(handlers.map(({ url, handler }) => context.unroute(url, handler)));
  };
};

const createMockCloudState = async (remoteSnapshot: LeafTabSyncSnapshot | null) => {
  const { metadata, keyBytes } = await createLeafTabSyncEncryptionMetadata(TEST_PASSPHRASE);
  const encryptedState = await buildEncryptedRemoteState(remoteSnapshot, keyBytes, metadata);
  return {
    ...encryptedState,
    metadata,
    keyBytes,
    writeCount: 0,
  } satisfies MockCloudState;
};

const createSeedProfile = (shortcutTitleSuffix: string) => ({
  scenarioModes: clone(SCENARIO_MODES),
  selectedScenarioId: 'life-mode-001',
  scenarioShortcuts: createScenarioShortcuts(shortcutTitleSuffix),
});

const seedSyncPage = async (page: Page, options: SyncSeedOptions) => {
  await page.evaluate((payload) => {
    localStorage.setItem('i18nextLng', 'zh');
    localStorage.setItem('has_visited', 'true');
    localStorage.setItem('privacy_consent', 'true');
    localStorage.setItem('role', 'programmer');
    localStorage.setItem('token', payload.token);
    localStorage.setItem('username', payload.username);
    localStorage.setItem('leaftab_sync_v1_device_id', payload.deviceId);
    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(payload.profile));
    localStorage.setItem('scenario_modes_v1', JSON.stringify(payload.profile.scenarioModes));
    localStorage.setItem('scenario_selected_v1', payload.profile.selectedScenarioId);
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(payload.profile.scenarioShortcuts));
    localStorage.setItem('cloud_sync_enabled', String(payload.cloudSyncEnabled));
    localStorage.setItem('cloud_sync_bookmarks_enabled', String(payload.cloudSyncBookmarksEnabled));
    localStorage.setItem('cloud_auto_sync_toast_enabled', 'true');
    localStorage.setItem('cloud_sync_interval_minutes', '10');
    localStorage.setItem(payload.encryption.storageKey, JSON.stringify({
      version: 1,
      scopeKey: payload.encryption.scopeKey,
      metadata: payload.encryption.metadata,
      cachedKey: payload.encryption.cachedKey,
      createdAt: '2026-03-27T10:00:00.000Z',
      updatedAt: '2026-03-27T10:00:00.000Z',
    }));
    if (payload.baselineStorageKey && payload.baseline) {
      localStorage.setItem(payload.baselineStorageKey, JSON.stringify(payload.baseline));
    } else if (payload.baselineStorageKey) {
      localStorage.removeItem(payload.baselineStorageKey);
    }
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.removeItem('leaf_tab_shortcuts_cache');
    (window as any).__leaftabE2eSync.resetBookmarks(payload.bookmarkCount);
    (window as any).__leaftabE2eSync.resetPermissions([]);
    if (payload.allowBookmarkPermissionRequest) {
      (window as any).__leaftabE2eSync.allowBookmarkPermissionRequest();
    } else {
      (window as any).__leaftabE2eSync.denyBookmarkPermissionRequest();
    }
    if (payload.grantBookmarkPermission) {
      (window as any).__leaftabE2eSync.grantBookmarkPermission();
    } else {
      (window as any).__leaftabE2eSync.revokeBookmarkPermission();
    }
  }, {
    username: options.username,
    token: options.token,
    deviceId: options.deviceId,
    profile: options.profile,
    bookmarkCount: options.bookmarkCount,
    cloudSyncEnabled: options.cloudSyncEnabled,
    cloudSyncBookmarksEnabled: options.cloudSyncBookmarksEnabled,
    grantBookmarkPermission: options.grantBookmarkPermission !== false,
    allowBookmarkPermissionRequest: options.allowBookmarkPermissionRequest !== false,
    encryption: {
      scopeKey: options.encryption.scopeKey,
      metadata: options.encryption.metadata,
      cachedKey: options.encryption.cachedKey,
      storageKey: createEncryptionStorageKey(options.encryption.scopeKey),
    },
    baselineStorageKey: createCloudBaselineStorageKey(options.username),
    baseline: options.baselineSnapshot
      ? createLeafTabSyncBaseline({
          snapshot: options.baselineSnapshot,
          commitId: 'baseline-commit',
          rootPath: 'leaftab/v1',
        })
      : null,
  });
  await page.reload({ waitUntil: 'networkidle' });
};

const createSyncPage = async (params: {
  context: BrowserContext;
  extensionId: string;
  seed: SyncSeedOptions;
}) => {
  const page = await params.context.newPage();
  await page.goto(`chrome-extension://${params.extensionId}/index.html?nt=1`);
  await page.waitForLoadState('networkidle');
  await seedSyncPage(page, params.seed);
  await dismissPrivacyConsentIfVisible(page);
  return page;
};

const dismissPrivacyConsentIfVisible = async (page: Page) => {
  const consentDialog = page.getByRole('dialog').filter({
    hasText: /帮助改进 LeafTab|Help improve LeafTab/i,
  }).first();
  const visible = await consentDialog.isVisible({ timeout: 800 }).catch(() => false);
  if (!visible) return;
  await consentDialog.getByRole('button', { name: /不同意|Disagree|Not now|同意并开启|Agree/i }).first().click();
};

const openSyncCenter = async (page: Page) => {
  await dismissPrivacyConsentIfVisible(page);
  await page.locator('button[title="同步中心"], button[title="Sync Center"]').first().evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toContainText(/同步中心|Sync Center/);
  return dialog;
};

const clickCloudSyncNow = async (page: Page) => {
  const dialog = await openSyncCenter(page);
  const cloudTab = dialog.getByRole('tab', { name: /云同步|Cloud/ });
  await cloudTab.evaluate((node: HTMLElement) => {
    node.click();
  });
  await dialog.getByRole('button', { name: /立即同步|同步中|Sync/i }).first().evaluate((node: HTMLButtonElement) => {
    node.click();
  });
};

const readBookmarkSummary = async (page: Page): Promise<BookmarkSummary> => {
  return page.evaluate(() => (window as any).__leaftabE2eSync.getBookmarkSummary());
};

const expectUiMessage = async (page: Page, pattern: RegExp) => {
  await expect.poll(async () => {
    const text = await page.locator('body').innerText().catch(() => '');
    return text.replace(/\s+/g, ' ').trim();
  }, {
    timeout: 10_000,
  }).toMatch(pattern);
};

test.describe.serial('LeafTab sync safety flows', () => {
  test.beforeEach(async ({ extensionContext }) => {
    await installSyncApiMocks(extensionContext);
  });

  test('pulls remote bookmarks into an empty device through normal sync', async ({ extensionContext, extensionId }) => {
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Remote',
      bookmarkCount: 200,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Local'),
        bookmarkCount: 0,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot: null,
      },
    });

    try {
      await clickCloudSyncNow(page);
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(200);
      const summary = await readBookmarkSummary(page);
      expect(summary.titles).toContain('QA-001');
      expect(summary.titles).toContain('QA-200');
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('pushes local bookmarks to an empty cloud during first sync', async ({ extensionContext, extensionId }) => {
    const cloudState = await createMockCloudState(null);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Local'),
        bookmarkCount: 200,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot: null,
      },
    });

    try {
      await clickCloudSyncNow(page);
      await expect.poll(() => cloudState.writeCount).toBe(1);
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(200);
      expect(cloudState.snapshot ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(200);
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('blocks a dangerous remote bookmark drop during normal sync', async ({ extensionContext, extensionId }) => {
    const baselineSnapshot = buildSnapshot({
      deviceId: 'local-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Stable',
      bookmarkCount: 200,
    });
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:05:00.000Z',
      shortcutTitleSuffix: 'Remote',
      bookmarkCount: 1,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Stable'),
        bookmarkCount: 200,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot,
      },
    });

    try {
      await clickCloudSyncNow(page);
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(200);
      await expect.poll(() => cloudState.writeCount).toBe(1);
      const dialog = page.getByRole('dialog').last();
      await expect(dialog).toContainText(/已拦截危险同步/);
      await expect(dialog).toContainText(/本地书签/);
      await expect(dialog).toContainText(/云端书签/);
      await expect(dialog).toContainText(/200/);
      await expect(dialog).toContainText(/1/);
      await expect(dialog.getByRole('button', { name: /继续同步快捷方式和设置/ })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /稍后处理书签/ })).toBeVisible();
      await dialog.getByRole('button', { name: /高级设置/ }).click();
      await expect(page.getByRole('menuitem', { name: /保留云端书签/ })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /保留本地书签/ })).toBeVisible();
      expect(cloudState.snapshot ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(1);
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('blocks a dangerous local bookmark drop during normal sync and keeps remote intact', async ({ extensionContext, extensionId }) => {
    const stableSnapshot = buildSnapshot({
      deviceId: 'local-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Stable',
      bookmarkCount: 200,
    });
    const cloudState = await createMockCloudState(clone(stableSnapshot));
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Stable'),
        bookmarkCount: 1,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot: stableSnapshot,
      },
    });

    try {
      await clickCloudSyncNow(page);
      const dialog = page.getByRole('dialog').last();
      await expect(dialog).toContainText(/已拦截危险同步/);
      expect(cloudState.writeCount).toBe(0);
      expect(cloudState.snapshot?.bookmarkItems ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(200);
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(1);
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('continues non-bookmark sync when bookmark permission is denied', async ({ extensionContext, extensionId }) => {
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Remote',
      bookmarkCount: 200,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Local'),
        bookmarkCount: 0,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        grantBookmarkPermission: false,
        allowBookmarkPermissionRequest: false,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot: null,
      },
    });

    try {
      await clickCloudSyncNow(page);
      await expect.poll(() => cloudState.writeCount).toBeGreaterThanOrEqual(1);
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(0);
      expect(cloudState.snapshot ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(200);
      expect(Object.values(cloudState.snapshot?.shortcuts || {})[0]?.title).toBe('GitHub Local');
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('allows explicit cloud overwrite local through repair flow', async ({ extensionContext, extensionId }) => {
    const baselineSnapshot = buildSnapshot({
      deviceId: 'local-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Stable',
      bookmarkCount: 200,
    });
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:05:00.000Z',
      shortcutTitleSuffix: 'Remote',
      bookmarkCount: 1,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Stable'),
        bookmarkCount: 200,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot,
      },
    });

    try {
      const dialog = await openSyncCenter(page);
      await dialog.getByRole('button', { name: /修复同步|Repair/ }).click();
      await page.getByRole('button', { name: /云端覆盖本地|保留云端书签（本地将被替换）|Overwrite Local/i }).click();
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(1);
      await expectUiMessage(page, /已用云端数据覆盖本地/);
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('blocks repair sync when bookmark permission is denied', async ({ extensionContext, extensionId }) => {
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:05:00.000Z',
      shortcutTitleSuffix: 'Remote',
      bookmarkCount: 1,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Stable'),
        bookmarkCount: 200,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        grantBookmarkPermission: false,
        allowBookmarkPermissionRequest: false,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot: null,
      },
    });

    try {
      const dialog = await openSyncCenter(page);
      await dialog.getByRole('button', { name: /修复同步|Repair/ }).click();
      await page.getByRole('button', { name: /云端覆盖本地|保留云端书签（本地将被替换）|Overwrite Local/i }).click();
      await dismissPrivacyConsentIfVisible(page);
      expect(cloudState.writeCount).toBe(0);
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(200);
      expect(cloudState.snapshot ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(1);
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('allows one-time safe sync without touching bookmarks after dangerous-drop intercept', async ({ extensionContext, extensionId }) => {
    const baselineSnapshot = buildSnapshot({
      deviceId: 'local-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Stable',
      bookmarkCount: 200,
    });
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:05:00.000Z',
      shortcutTitleSuffix: 'Remote Updated',
      bookmarkCount: 1,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Stable'),
        bookmarkCount: 200,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: true,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot,
      },
    });

    try {
      await clickCloudSyncNow(page);
      const dangerDialog = page.getByRole('dialog').last();
      await expect(dangerDialog).toContainText(/已拦截危险同步/);
      await dangerDialog.getByRole('button', { name: /继续同步快捷方式和设置/ }).click();
      await expectUiMessage(page, /本次将跳过书签，仅同步快捷方式和设置/);
      await expect.poll(() => cloudState.writeCount).toBe(2);
      expect(cloudState.snapshot ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(1);
      expect(Object.values(cloudState.snapshot?.shortcuts || {})[0]?.title).toBe('GitHub Stable');
      await expect.poll(() => readBookmarkSummary(page).then((value) => value.totalItems)).toBe(200);
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });

  test('keeps remote bookmarks when bookmark sync is disabled and only shortcuts are synced', async ({ extensionContext, extensionId }) => {
    const remoteSnapshot = buildSnapshot({
      deviceId: 'remote-device',
      generatedAt: '2026-03-27T10:00:00.000Z',
      shortcutTitleSuffix: 'Remote',
      bookmarkCount: 200,
    });
    const cloudState = await createMockCloudState(remoteSnapshot);
    const cleanupRoutes = await registerCloudRoutes(extensionContext, cloudState);
    const scopeKey = createLeafTabCloudEncryptionScopeKey('sync-user');
    const page = await createSyncPage({
      context: extensionContext,
      extensionId,
      seed: {
        username: 'sync-user',
        token: 'token-sync-user',
        deviceId: 'local-device',
        profile: createSeedProfile('Local Updated'),
        bookmarkCount: 1,
        cloudSyncEnabled: true,
        cloudSyncBookmarksEnabled: false,
        encryption: {
          scopeKey,
          metadata: cloudState.metadata,
          cachedKey: serializeLeafTabSyncKeyBytes(cloudState.keyBytes),
        },
        baselineSnapshot: null,
      },
    });

    try {
      await clickCloudSyncNow(page);
      await expect.poll(() => cloudState.writeCount).toBe(1);
      expect(cloudState.snapshot ? Object.keys(cloudState.snapshot.bookmarkItems).length : 0).toBe(200);
      expect(Object.values(cloudState.snapshot?.shortcuts || {})[0]?.title).toBe('GitHub Local Updated');
    } finally {
      await page.close();
      await cleanupRoutes();
    }
  });
});
