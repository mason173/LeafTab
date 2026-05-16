const { webcrypto } = require('node:crypto');
const { test, expect } = require('@playwright/test');

const APP_URL = process.env.PLAYWRIGHT_APP_URL
  || 'http://127.0.0.1:4173/index.html';
const CLOUD_ENCRYPTION_LABEL = 'LeafTab Sync E2EE Verifier v1';
const CLOUD_ENCRYPTION_PREFIX = 'leaftab_sync_e2ee_v1:';
const DEFAULT_USERNAME = 'test-user';
const DEFAULT_WEBDAV_URL = 'http://127.0.0.1:4173/__mock_webdav__';
const DEFAULT_WEBDAV_ROOT_PATH = 'leaftab/v1';

function createShortcut(id, title) {
  return {
    id,
    title,
    url: `https://${id}.example`,
    icon: '',
  };
}

function createSeedSnapshot() {
  return {
    scenarioModes: [
      { id: 'life-mode-001', name: '生活模式', color: '#3DD6C5', icon: 'leaf' },
    ],
    selectedScenarioId: 'life-mode-001',
    scenarioShortcuts: {
      'life-mode-001': [
        createShortcut('docs', 'Docs'),
      ],
    },
  };
}

function encodeBase64(value) {
  return Buffer.from(value).toString('base64');
}

function normalizeEncryptionScopeSegment(value) {
  return (value || '')
    .trim()
    .replace(/[^a-zA-Z0-9:_|.-]+/g, '_')
    .slice(0, 240);
}

async function createCloudEncryptionRecord(username = DEFAULT_USERNAME, passphrase = 'test-passphrase') {
  const scopeKey = `cloud:${username}`;
  return createEncryptionRecord(scopeKey, passphrase);
}

async function createWebdavEncryptionRecord(
  webdavUrl = DEFAULT_WEBDAV_URL,
  rootPath = DEFAULT_WEBDAV_ROOT_PATH,
  passphrase = 'test-passphrase',
) {
  const scopeKey = `webdav:${webdavUrl.replace(/\/+$/, '')}|${rootPath.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  return createEncryptionRecord(scopeKey, passphrase);
}

async function createEncryptionRecord(scopeKey, passphrase = 'test-passphrase') {
  const salt = Uint8Array.from(Array.from({ length: 16 }, (_value, index) => index + 1));
  const encoder = new TextEncoder();
  const baseKey = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const keyBits = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 250000,
      salt,
    },
    baseKey,
    256,
  );
  const keyBytes = new Uint8Array(keyBits);
  const verifierInput = new Uint8Array(encoder.encode(CLOUD_ENCRYPTION_LABEL).length + keyBytes.length);
  verifierInput.set(encoder.encode(CLOUD_ENCRYPTION_LABEL), 0);
  verifierInput.set(keyBytes, encoder.encode(CLOUD_ENCRYPTION_LABEL).length);
  const verifierDigest = new Uint8Array(
    await webcrypto.subtle.digest('SHA-256', verifierInput),
  );
  const now = new Date().toISOString();
  return {
    storageKey: `${CLOUD_ENCRYPTION_PREFIX}${normalizeEncryptionScopeSegment(scopeKey)}`,
    config: {
      version: 1,
      scopeKey,
      metadata: {
        version: 1,
        algorithm: 'AES-GCM',
        keyDerivation: {
          algorithm: 'PBKDF2',
          hash: 'SHA-256',
          iterations: 250000,
          salt: encodeBase64(salt),
        },
        verifier: encodeBase64(verifierDigest),
      },
      cachedKey: encodeBase64(keyBytes),
      createdAt: now,
      updatedAt: now,
    },
  };
}

async function createMockDevice(browser, options) {
  const context = await browser.newContext();
  await context.addInitScript((seed) => {
    const listenerMap = {
      created: new Set(),
      removed: new Set(),
      changed: new Set(),
      moved: new Set(),
      childrenReordered: new Set(),
      importEnded: new Set(),
    };
    const bookmarksState = {
      nextId: 100,
      nodes: {},
    };
    const permissionState = {
      extensionPermissions: new Set(seed.permissionsGranted ? ['bookmarks'] : []),
      originPermissions: new Set(seed.originPermissionsGranted ? [`${new URL(seed.webdavUrl).origin}/*`] : []),
    };

    const createEventApi = (eventName) => ({
      addListener(listener) {
        listenerMap[eventName].add(listener);
      },
      removeListener(listener) {
        listenerMap[eventName].delete(listener);
      },
    });

    const emit = (eventName, ...args) => {
      Array.from(listenerMap[eventName]).forEach((listener) => listener(...args));
    };

    const cloneNode = (nodeId) => {
      const node = bookmarksState.nodes[nodeId];
      if (!node) return null;
      return {
        id: node.id,
        parentId: node.parentId ?? undefined,
        index: 0,
        title: node.title,
        url: node.url,
        children: node.children ? node.children.map((childId, index) => {
          const child = cloneNode(childId);
          if (!child) return null;
          child.index = index;
          return child;
        }).filter(Boolean) : undefined,
      };
    };

    const resetBookmarkTree = (count = 0) => {
      bookmarksState.nextId = 100;
      bookmarksState.nodes = {
        '0': { id: '0', title: '', children: ['1', '2', '3'] },
        '1': { id: '1', parentId: '0', title: 'Bookmarks Bar', children: [] },
        '2': { id: '2', parentId: '0', title: 'Other Bookmarks', children: [] },
        '3': { id: '3', parentId: '0', title: 'Mobile Bookmarks', children: [] },
      };
      for (let index = 0; index < count; index += 1) {
        const id = String(bookmarksState.nextId++);
        bookmarksState.nodes[id] = {
          id,
          parentId: '1',
          title: `Bookmark ${index + 1}`,
          url: `https://bookmark-${index + 1}.example`,
        };
        bookmarksState.nodes['1'].children.push(id);
      }
      emit('importEnded');
    };

    const countBookmarkItems = () => {
      const countDescendants = (nodeId) => {
        const node = bookmarksState.nodes[nodeId];
        if (!node) return 0;
        if (node.url) return 1;
        return (node.children || []).reduce((sum, childId) => sum + countDescendants(childId), 0);
      };
      return countDescendants('1') + countDescendants('2');
    };

    const removeNodeRecursive = (nodeId) => {
      const node = bookmarksState.nodes[nodeId];
      if (!node) return;
      (node.children || []).forEach((childId) => removeNodeRecursive(childId));
      delete bookmarksState.nodes[nodeId];
    };

    const detachFromParent = (nodeId) => {
      const node = bookmarksState.nodes[nodeId];
      const parent = node?.parentId ? bookmarksState.nodes[node.parentId] : null;
      if (!node || !parent?.children) return { node, parent, index: -1 };
      const index = parent.children.indexOf(nodeId);
      if (index >= 0) {
        parent.children.splice(index, 1);
      }
      return { node, parent, index };
    };

    const runtime = {
      id: 'mock-extension-id',
      lastError: null,
      getManifest() {
        return {
          optional_permissions: ['bookmarks'],
          optional_host_permissions: ['<all_urls>'],
        };
      },
      getURL(input = '') {
        return `chrome-extension://mock-extension-id/${String(input).replace(/^\/+/, '')}`;
      },
    };

    const permissionsApi = {
      contains(query, callback) {
        const granted = !(query?.permissions || []).some((permission) => !permissionState.extensionPermissions.has(permission))
          && !(query?.origins || []).some((origin) => !permissionState.originPermissions.has(origin));
        queueMicrotask(() => callback(granted));
      },
      request(query, callback) {
        (query?.permissions || []).forEach((permission) => {
          permissionState.extensionPermissions.add(permission);
        });
        (query?.origins || []).forEach((origin) => {
          permissionState.originPermissions.add(origin);
        });
        queueMicrotask(() => callback(true));
      },
    };

    const bookmarksApi = {
      getTree(callback) {
        queueMicrotask(() => callback([cloneNode('0')]));
      },
      create(details, callback) {
        const parentId = String(details?.parentId || '1');
        const parent = bookmarksState.nodes[parentId];
        const id = String(bookmarksState.nextId++);
        const nextNode = {
          id,
          parentId,
          title: String(details?.title || ''),
          url: typeof details?.url === 'string' ? details.url : undefined,
          children: typeof details?.url === 'string' ? undefined : [],
        };
        bookmarksState.nodes[id] = nextNode;
        parent.children = parent.children || [];
        parent.children.push(id);
        const cloned = cloneNode(id);
        emit('created', id, cloned);
        queueMicrotask(() => callback(cloned));
      },
      remove(nodeId, callback) {
        const { node, parent, index } = detachFromParent(String(nodeId));
        if (node) {
          removeNodeRecursive(String(nodeId));
          emit('removed', String(nodeId), {
            parentId: parent?.id,
            index,
            node: cloneNode(String(nodeId)),
          });
        }
        queueMicrotask(() => callback());
      },
      removeTree(nodeId, callback) {
        const { node, parent, index } = detachFromParent(String(nodeId));
        const snapshot = cloneNode(String(nodeId));
        if (node) {
          removeNodeRecursive(String(nodeId));
          emit('removed', String(nodeId), {
            parentId: parent?.id,
            index,
            node: snapshot,
          });
        }
        queueMicrotask(() => callback());
      },
      onCreated: createEventApi('created'),
      onRemoved: createEventApi('removed'),
      onChanged: createEventApi('changed'),
      onMoved: createEventApi('moved'),
      onChildrenReordered: createEventApi('childrenReordered'),
      onImportEnded: createEventApi('importEnded'),
    };

    window.chrome = window.chrome || {};
    window.chrome.runtime = runtime;
    window.chrome.permissions = permissionsApi;
    window.chrome.bookmarks = bookmarksApi;

    window.__mockBookmarks = {
      countSyncItems() {
        return countBookmarkItems();
      },
      reset(count = 0) {
        resetBookmarkTree(count);
      },
      snapshot() {
        return cloneNode('0');
      },
    };

    window.__mockPermissions = {
      has(permission) {
        return permissionState.extensionPermissions.has(permission);
      },
    };

    resetBookmarkTree(seed.bookmarkCount);

    window.localStorage.clear();
    window.localStorage.setItem('i18nextLng', 'zh');
    window.localStorage.setItem('has_visited', 'true');
    window.localStorage.setItem('role', 'tester');
    window.localStorage.setItem('displayMode', 'fresh');
    window.localStorage.setItem('privacy_consent', 'true');
    window.localStorage.setItem('leaftab_top_nav_layout_intro_seen_v1', 'true');
    window.localStorage.setItem('token', seed.syncProvider === 'webdav' ? '' : 'test-token');
    window.localStorage.setItem('username', seed.syncProvider === 'webdav' ? '' : seed.username);
    window.localStorage.setItem('cloud_sync_enabled', seed.syncProvider === 'webdav' ? 'false' : 'true');
    window.localStorage.setItem('cloud_sync_bookmarks_enabled', seed.syncProvider === 'webdav' ? 'false' : 'true');
    window.localStorage.setItem('webdav_sync_enabled', seed.syncProvider === 'webdav' ? 'true' : 'false');
    window.localStorage.setItem('webdav_sync_bookmarks_enabled', seed.syncProvider === 'webdav' ? 'true' : 'false');
    window.localStorage.setItem('webdav_url', seed.webdavUrl);
    window.localStorage.setItem('webdav_username', 'mason');
    window.localStorage.setItem('webdav_password', 'secret');
    window.localStorage.setItem('webdav_file_path', seed.webdavFilePath);
    window.localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(seed.seedSnapshot));
    window.localStorage.setItem('scenario_modes_v1', JSON.stringify(seed.seedSnapshot.scenarioModes));
    window.localStorage.setItem('scenario_selected_v1', seed.seedSnapshot.selectedScenarioId);
    window.localStorage.setItem(
      'local_shortcuts_v3',
      JSON.stringify(seed.seedSnapshot.scenarioShortcuts),
    );
    window.localStorage.setItem(seed.encryptionRecord.storageKey, JSON.stringify(seed.encryptionRecord.config));
  }, {
    bookmarkCount: options.bookmarkCount ?? 0,
    permissionsGranted: options.permissionsGranted !== false,
    originPermissionsGranted: options.originPermissionsGranted !== false,
    encryptionRecord: options.encryptionRecord,
    seedSnapshot: options.seedSnapshot ?? createSeedSnapshot(),
    syncProvider: options.syncProvider ?? 'cloud',
    username: options.username ?? DEFAULT_USERNAME,
    webdavFilePath: options.webdavFilePath ?? 'leaftab_sync.leaftab',
    webdavUrl: options.webdavUrl ?? DEFAULT_WEBDAV_URL,
  });
  const page = await context.newPage();
  return { context, page };
}

async function openSyncCenter(page) {
  await page.goto(APP_URL, { waitUntil: 'load' });
  const syncButton = page.getByTestId('top-nav-sync-button');
  await syncButton.hover();
  await syncButton.click();
  await expect(page.getByRole('heading', { name: '同步中心' })).toBeVisible();
}

async function reopenSyncCenter(page) {
  const syncButton = page.getByTestId('top-nav-sync-button');
  await syncButton.hover();
  await syncButton.click();
  await expect(page.getByRole('heading', { name: '同步中心' })).toBeVisible();
}

async function seedCloudBookmarks(browser, request, encryptionRecord, bookmarkCount) {
  const sourceDevice = await createMockDevice(browser, {
    bookmarkCount,
    encryptionRecord,
  });

  try {
    await openSyncCenter(sourceDevice.page);
    await expect.poll(
      async () => sourceDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
    ).toBe(bookmarkCount);

    await sourceDevice.page.getByRole('button', { name: '修复同步' }).click();
    await sourceDevice.page.getByRole('button', { name: '本地覆盖云端' }).click();

    await expect.poll(async () => {
      const response = await request.get('/__mock/admin/state');
      const state = await response.json();
      return state.cloud.commit?.id || null;
    }).not.toBeNull();
  } finally {
    await sourceDevice.context.close();
  }
}

async function seedWebdavBookmarks(browser, request, encryptionRecord, bookmarkCount) {
  const sourceDevice = await createMockDevice(browser, {
    bookmarkCount,
    encryptionRecord,
    syncProvider: 'webdav',
  });

  try {
    await openSyncCenter(sourceDevice.page);
    await sourceDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();
    await expect.poll(
      async () => sourceDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
    ).toBe(bookmarkCount);

    await sourceDevice.page.getByRole('button', { name: '修复同步' }).click();
    await sourceDevice.page.getByRole('button', { name: '本地覆盖 WebDAV' }).click();

    await expect.poll(async () => {
      const response = await request.get('/__mock/admin/state');
      const state = await response.json();
      return state.webdav.entries['leaftab/v1/head.json']?.body || null;
    }).not.toBeNull();
  } finally {
    await sourceDevice.context.close();
  }
}

test.describe('sync center smoke', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/__mock/admin/reset');

    const snapshot = createSeedSnapshot();

    await page.addInitScript((seedSnapshot) => {
      window.localStorage.clear();
      window.localStorage.setItem('i18nextLng', 'zh');
      window.localStorage.setItem('has_visited', 'true');
      window.localStorage.setItem('role', 'tester');
      window.localStorage.setItem('displayMode', 'fresh');
      window.localStorage.setItem('privacy_consent', 'true');
      window.localStorage.setItem('leaftab_top_nav_layout_intro_seen_v1', 'true');
      window.localStorage.setItem('token', 'test-token');
      window.localStorage.setItem('username', 'test-user');
      window.localStorage.setItem('cloud_sync_enabled', 'true');
      window.localStorage.setItem('cloud_sync_bookmarks_enabled', 'false');
      window.localStorage.setItem('webdav_sync_enabled', 'true');
      window.localStorage.setItem('webdav_sync_bookmarks_enabled', 'false');
      window.localStorage.setItem('webdav_url', 'https://dav.example.com');
      window.localStorage.setItem('webdav_username', 'mason');
      window.localStorage.setItem('webdav_password', 'secret');
      window.localStorage.setItem('webdav_file_path', 'leaftab_sync.leaftab');
      window.localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(seedSnapshot));
      window.localStorage.setItem('scenario_modes_v1', JSON.stringify(seedSnapshot.scenarioModes));
      window.localStorage.setItem('scenario_selected_v1', seedSnapshot.selectedScenarioId);
      window.localStorage.setItem(
        'local_shortcuts_v3',
        JSON.stringify(seedSnapshot.scenarioShortcuts),
      );
    }, snapshot);
  });

  test('opens sync center and saves cloud bookmark sync preference', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    await page.evaluate(() => {
      window.localStorage.setItem('cloud_sync_enabled', 'true');
      window.localStorage.setItem('webdav_sync_enabled', 'false');
    });

    await page.getByTestId('top-nav-sync-button').click({ force: true });
    await expect(page.getByRole('heading', { name: '同步中心' })).toBeVisible();

    await page.getByLabel('管理云同步').click();
    await expect(page.getByText('云同步设置')).toBeVisible();

    const cloudBookmarkToggle = page.getByRole('dialog', { name: '云同步设置' }).getByRole('switch').nth(1);
    await cloudBookmarkToggle.click();
    await expect(page.getByText('开启前提醒')).toBeVisible();
    await page.getByRole('button', { name: '继续开启' }).click();
    await page.getByRole('button', { name: '保存' }).click();

    await expect.poll(async () => page.evaluate(() => (
      window.localStorage.getItem('cloud_sync_bookmarks_enabled')
    ))).toBe('true');
  });

  test('opens webdav sync settings and saves bookmark sync preference', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    await page.evaluate(() => {
      window.localStorage.setItem('cloud_sync_enabled', 'false');
      window.localStorage.setItem('webdav_sync_enabled', 'true');
    });

    await page.getByTestId('top-nav-sync-button').click({ force: true });
    await expect(page.getByRole('heading', { name: '同步中心' })).toBeVisible();

    await page.getByRole('tab', { name: 'WebDAV 同步' }).click();
    await page.getByRole('button', { name: '配置' }).click();
    await expect(page.getByText('同步书签')).toBeVisible();

    const webdavBookmarkToggle = page.getByRole('dialog', { name: 'WebDAV 同步' }).getByRole('switch').first();
    await webdavBookmarkToggle.click();
    await expect(page.getByText('开启前提醒')).toBeVisible();
    await page.getByRole('button', { name: '继续开启' }).click();
    await page.getByRole('button', { name: '保存' }).click();

    await expect.poll(async () => page.evaluate(() => (
      window.localStorage.getItem('webdav_sync_bookmarks_enabled')
    ))).toBe('true');
  });

  test('keeps cloud bookmarks after local deletion without reopening sync settings', async ({ browser, request }) => {
    test.setTimeout(120000);

    const encryptionRecord = await createCloudEncryptionRecord();
    await seedCloudBookmarks(browser, request, encryptionRecord, 378);

    const targetDevice = await createMockDevice(browser, {
      bookmarkCount: 0,
      encryptionRecord,
    });

    try {
      await openSyncCenter(targetDevice.page);

      const syncNowButton = targetDevice.page.getByRole('button', { name: '立即同步' }).first();

      await syncNowButton.click();
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);
      await expect(targetDevice.page.getByText('已拦截危险同步')).toHaveCount(0);

      await targetDevice.page.evaluate(() => {
        window.__mockBookmarks.reset(0);
      });
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
      ).toBe(0);

      await reopenSyncCenter(targetDevice.page);
      const syncNowButtonAfterLocalDeletion = targetDevice.page.getByRole('button', { name: '立即同步' }).first();

      await syncNowButtonAfterLocalDeletion.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toBeVisible();

      await targetDevice.page.getByRole('button', { name: '保留云端书签（本地将被替换）' }).click();
      await expect(targetDevice.page.getByRole('heading', { name: '同步中心' })).toHaveCount(0);
      await expect(targetDevice.page.getByText('云同步设置')).toHaveCount(0);

      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);

      await reopenSyncCenter(targetDevice.page);

      const syncNowButtonAfterRepair = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await expect(syncNowButtonAfterRepair).toBeEnabled();
      await syncNowButtonAfterRepair.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toHaveCount(0);
    } finally {
      await targetDevice.context.close();
    }
  });

  test('pulls cloud bookmarks from repair even when cloud bookmark sync preference is off', async ({ browser, request }) => {
    test.setTimeout(120000);

    const encryptionRecord = await createCloudEncryptionRecord();
    await seedCloudBookmarks(browser, request, encryptionRecord, 378);

    const targetDevice = await createMockDevice(browser, {
      bookmarkCount: 0,
      encryptionRecord,
    });

    try {
      await targetDevice.page.addInitScript(() => {
        window.localStorage.setItem('cloud_sync_bookmarks_enabled', 'false');
      });
      await openSyncCenter(targetDevice.page);
      await targetDevice.page.evaluate(() => {
        window.localStorage.setItem('cloud_sync_bookmarks_enabled', 'false');
      });

      await targetDevice.page.getByRole('button', { name: '修复同步' }).click();
      await targetDevice.page.getByRole('button', { name: '云端覆盖本地' }).click();

      await expect(targetDevice.page.getByRole('heading', { name: '同步中心' })).toHaveCount(0);
      await expect(targetDevice.page.getByText('云同步设置')).toHaveCount(0);
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);
    } finally {
      await targetDevice.context.close();
    }
  });

  test('keeps local bookmark deletion after dangerous sync confirmation without reopening sync settings', async ({ browser, request }) => {
    test.setTimeout(120000);

    const encryptionRecord = await createCloudEncryptionRecord();
    await seedCloudBookmarks(browser, request, encryptionRecord, 378);

    const targetDevice = await createMockDevice(browser, {
      bookmarkCount: 0,
      encryptionRecord,
    });

    try {
      await openSyncCenter(targetDevice.page);

      const syncNowButton = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await syncNowButton.click();
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);

      const remoteCommitBeforeLocalDeletion = await (await request.get('/__mock/admin/state')).json()
        .then((state) => state.cloud.commit?.id || null);

      await targetDevice.page.evaluate(() => {
        window.__mockBookmarks.reset(0);
      });
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
      ).toBe(0);

      await reopenSyncCenter(targetDevice.page);
      const syncNowButtonAfterLocalDeletion = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await syncNowButtonAfterLocalDeletion.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toBeVisible();

      await targetDevice.page.getByRole('button', { name: '保留本地书签（云端将被替换）' }).click();
      await expect(targetDevice.page.getByRole('heading', { name: '同步中心' })).toHaveCount(0);
      await expect(targetDevice.page.getByText('云同步设置')).toHaveCount(0);

      await expect.poll(async () => {
        const response = await request.get('/__mock/admin/state');
        const state = await response.json();
        return state.cloud.commit?.id || null;
      }, { timeout: 30000 }).not.toBe(remoteCommitBeforeLocalDeletion);

      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(0);

      await reopenSyncCenter(targetDevice.page);

      const syncNowButtonAfterRepair = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await expect(syncNowButtonAfterRepair).toBeEnabled();
      await syncNowButtonAfterRepair.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toHaveCount(0);
    } finally {
      await targetDevice.context.close();
    }
  });

  test('keeps WebDAV bookmarks after local deletion without reopening sync settings', async ({ browser, request }) => {
    test.setTimeout(120000);

    const encryptionRecord = await createWebdavEncryptionRecord();
    await seedWebdavBookmarks(browser, request, encryptionRecord, 378);

    const targetDevice = await createMockDevice(browser, {
      bookmarkCount: 0,
      encryptionRecord,
      syncProvider: 'webdav',
    });

    try {
      await openSyncCenter(targetDevice.page);
      await targetDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();

      const syncNowButton = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await syncNowButton.click();
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);
      await expect(targetDevice.page.getByText('已拦截危险同步')).toHaveCount(0);

      await targetDevice.page.evaluate(() => {
        window.__mockBookmarks.reset(0);
      });
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
      ).toBe(0);

      await reopenSyncCenter(targetDevice.page);
      await targetDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();
      const syncNowButtonAfterLocalDeletion = targetDevice.page.getByRole('button', { name: '立即同步' }).first();

      await syncNowButtonAfterLocalDeletion.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toBeVisible();

      await targetDevice.page.getByRole('button', { name: '保留WebDAV书签（本地将被替换）' }).click();
      await expect(targetDevice.page.getByRole('heading', { name: '同步中心' })).toHaveCount(0);
      await expect(targetDevice.page.getByText('WebDAV 同步')).toHaveCount(0);

      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);

      await reopenSyncCenter(targetDevice.page);
      await targetDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();

      const syncNowButtonAfterRepair = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await expect(syncNowButtonAfterRepair).toBeEnabled();
      await syncNowButtonAfterRepair.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toHaveCount(0);
    } finally {
      await targetDevice.context.close();
    }
  });

  test('keeps local bookmark deletion in WebDAV after dangerous sync confirmation without reopening sync settings', async ({ browser, request }) => {
    test.setTimeout(120000);

    const encryptionRecord = await createWebdavEncryptionRecord();
    await seedWebdavBookmarks(browser, request, encryptionRecord, 378);

    const targetDevice = await createMockDevice(browser, {
      bookmarkCount: 0,
      encryptionRecord,
      syncProvider: 'webdav',
    });

    try {
      await openSyncCenter(targetDevice.page);
      await targetDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();

      const syncNowButton = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await syncNowButton.click();
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(378);

      const headBeforeLocalDeletion = await (await request.get('/__mock/admin/state')).json()
        .then((state) => state.webdav.entries['leaftab/v1/head.json']?.body || null);

      await targetDevice.page.evaluate(() => {
        window.__mockBookmarks.reset(0);
      });
      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
      ).toBe(0);

      await reopenSyncCenter(targetDevice.page);
      await targetDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();
      const syncNowButtonAfterLocalDeletion = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await syncNowButtonAfterLocalDeletion.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toBeVisible();

      await targetDevice.page.getByRole('button', { name: '保留本地书签（WebDAV将被替换）' }).click();
      await expect(targetDevice.page.getByRole('heading', { name: '同步中心' })).toHaveCount(0);
      await expect(targetDevice.page.getByText('WebDAV 同步')).toHaveCount(0);

      await expect.poll(async () => {
        const response = await request.get('/__mock/admin/state');
        const state = await response.json();
        return state.webdav.entries['leaftab/v1/head.json']?.body || null;
      }, { timeout: 30000 }).not.toBe(headBeforeLocalDeletion);

      await expect.poll(
        async () => targetDevice.page.evaluate(() => window.__mockBookmarks.countSyncItems()),
        { timeout: 30000 },
      ).toBe(0);

      await reopenSyncCenter(targetDevice.page);
      await targetDevice.page.getByRole('tab', { name: 'WebDAV 同步' }).click();

      const syncNowButtonAfterRepair = targetDevice.page.getByRole('button', { name: '立即同步' }).first();
      await expect(syncNowButtonAfterRepair).toBeEnabled();
      await syncNowButtonAfterRepair.click();
      await expect(targetDevice.page.getByText('已拦截危险同步')).toHaveCount(0);
    } finally {
      await targetDevice.context.close();
    }
  });
});
