import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ensureExtensionPermissionMock = vi.fn();
const getBookmarksApiMock = vi.fn();
const createMemoryLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

vi.mock('@/utils/extensionPermissions', () => ({
  ensureExtensionPermission: (...args: unknown[]) => ensureExtensionPermissionMock(...args),
}));

vi.mock('@/platform/runtime', () => ({
  getBookmarksApi: () => getBookmarksApiMock(),
}));

type BookmarkTreeNode = {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNode[];
};

const createBookmarkApi = () => {
  const tree: BookmarkTreeNode[] = [
    {
      id: '0',
      title: 'root',
      children: [
        {
          id: '1',
          title: 'Bookmarks Bar',
          children: [
            {
              id: '10',
              title: 'Work',
              children: [
                {
                  id: '100',
                  title: 'GitHub',
                  url: 'https://github.com',
                },
              ],
            },
          ],
        },
        {
          id: '2',
          title: 'Other Bookmarks',
          children: [
            {
              id: '200',
              title: 'Docs',
              url: 'https://example.com/docs',
            },
          ],
        },
      ],
    },
  ];

  const removedTrees: string[] = [];
  const removedNodes: string[] = [];
  const createdNodes: Array<{ parentId?: string; title?: string; url?: string }> = [];
  const listeners: Array<() => void> = [];
  let createCounter = 0;

  return {
    api: {
      getTree: (callback: (nodes: BookmarkTreeNode[]) => void) => callback(tree),
      create: (details: { parentId?: string; title?: string; url?: string }, callback: (node: BookmarkTreeNode) => void) => {
        createdNodes.push(details);
        createCounter += 1;
        callback({
          id: `created-${createCounter}`,
          title: details.title || '',
          ...(details.url ? { url: details.url } : {}),
          children: details.url ? undefined : [],
        });
      },
      removeTree: (id: string, callback: () => void) => {
        removedTrees.push(id);
        callback();
      },
      remove: (id: string, callback: () => void) => {
        removedNodes.push(id);
        callback();
      },
      onCreated: {
        addListener: (listener: () => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
      onRemoved: {
        addListener: (listener: () => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
      onChanged: {
        addListener: (listener: () => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
      onMoved: {
        addListener: (listener: () => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
      onChildrenReordered: {
        addListener: (listener: () => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
      onImportEnded: {
        addListener: (listener: () => void) => listeners.push(listener),
        removeListener: vi.fn(),
      },
    },
    removedTrees,
    removedNodes,
    createdNodes,
    listeners,
  };
};

describe('bookmark tree integration helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as typeof globalThis & { localStorage?: ReturnType<typeof createMemoryLocalStorage> }).localStorage = createMemoryLocalStorage();
    globalThis.localStorage.clear();
    ensureExtensionPermissionMock.mockReset();
    getBookmarksApiMock.mockReset();
    ensureExtensionPermissionMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('captures toolbar and other bookmark roots into a sync draft', async () => {
    const { api } = createBookmarkApi();
    getBookmarksApiMock.mockReturnValue(api);

    const { captureLeafTabBookmarkTreeDraft } = await import('./bookmarks');
    const draft = await captureLeafTabBookmarkTreeDraft();

    expect(draft.orderIdsByParent.__root__).toEqual(['browser_root_toolbar', 'browser_root_other']);
    expect(draft.folders).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityId: 'browser_root_toolbar', title: '书签栏' }),
      expect.objectContaining({ entityId: 'browser_root_other', title: '其他书签' }),
      expect.objectContaining({ localNodeId: '10', title: 'Work' }),
    ]));
    expect(draft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ localNodeId: '100', title: 'GitHub', url: 'https://github.com' }),
      expect.objectContaining({ localNodeId: '200', title: 'Docs', url: 'https://example.com/docs' }),
    ]));
  });

  it('replaces bookmark roots according to the provided snapshot ordering', async () => {
    const runtime = createBookmarkApi();
    getBookmarksApiMock.mockReturnValue(runtime.api);

    const { replaceLeafTabBookmarkTree } = await import('./bookmarks');
    const result = await replaceLeafTabBookmarkTree({
      folderLookup: {
        browser_root_toolbar: { title: '书签栏', parentId: null },
        browser_root_other: { title: '其他书签', parentId: null },
        folder_work: { title: 'Work', parentId: 'browser_root_toolbar' },
      },
      itemLookup: {
        bookmark_a: { title: 'GitHub', parentId: 'folder_work', url: 'https://github.com' },
        bookmark_b: { title: 'Docs', parentId: 'browser_root_other', url: 'https://example.com/docs' },
      },
      orderIdsByParent: {
        __root__: ['browser_root_toolbar', 'browser_root_other'],
        browser_root_toolbar: ['folder_work'],
        folder_work: ['bookmark_a'],
        browser_root_other: ['bookmark_b'],
      },
      requestPermission: false,
    });

    expect(result).toBe(true);
    expect(runtime.removedTrees).toEqual(['10']);
    expect(runtime.removedNodes).toEqual(['200']);
    expect(runtime.createdNodes).toEqual([
      { parentId: '1', title: 'Work' },
      { parentId: 'created-1', title: 'GitHub', url: 'https://github.com' },
      { parentId: '2', title: 'Docs', url: 'https://example.com/docs' },
    ]);
  });

  it('returns an empty draft when bookmark permission is unavailable', async () => {
    const { api } = createBookmarkApi();
    getBookmarksApiMock.mockReturnValue(api);
    ensureExtensionPermissionMock.mockResolvedValue(false);

    const { captureLeafTabBookmarkTreeDraft } = await import('./bookmarks');
    const draft = await captureLeafTabBookmarkTreeDraft();

    expect(draft).toEqual({
      folders: [],
      items: [],
      orderIdsByParent: { __root__: [] },
      nodeIdToEntityId: {},
    });
  });

  it('throws instead of returning an empty draft when the caller requires bookmark access', async () => {
    const { api } = createBookmarkApi();
    getBookmarksApiMock.mockReturnValue(api);
    ensureExtensionPermissionMock.mockResolvedValue(false);

    const {
      captureLeafTabBookmarkTreeDraft,
      LeafTabBookmarkPermissionDeniedError,
    } = await import('./bookmarks');

    await expect(captureLeafTabBookmarkTreeDraft({
      requestPermission: false,
      throwOnPermissionDenied: true,
    })).rejects.toBeInstanceOf(LeafTabBookmarkPermissionDeniedError);
  });
});
