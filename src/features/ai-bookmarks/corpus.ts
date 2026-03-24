import { buildFaviconUrl, extractDomain } from '@/features/ai-bookmarks/text';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkApi = typeof chrome.bookmarks;

export type BookmarkCorpusEntry = {
  bookmarkId: string;
  url: string;
  title: string;
  domain: string;
  folderPath: string;
  dateAdded: number;
  faviconUrl: string;
};

type BookmarkTreeCursor = {
  node: chrome.bookmarks.BookmarkTreeNode;
  folders: string[];
};

const BOOKMARK_TREE_YIELD_INTERVAL = 250;
const BOOKMARK_CORPUS_CACHE_TTL_MS = 60_000;

let bookmarkCorpusCache: { builtAt: number; entries: BookmarkCorpusEntry[] } | null = null;
let bookmarkCorpusPromise: Promise<BookmarkCorpusEntry[]> | null = null;
let attachedListeners = false;
const invalidationListeners = new Set<() => void>();

function hasBookmarkRuntimeError(): boolean {
  return Boolean(globalThis.chrome?.runtime?.lastError);
}

function getBookmarkTree(
  bookmarksApi: BookmarkApi,
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    bookmarksApi.getTree((nodes) => {
      if (hasBookmarkRuntimeError()) {
        resolve([]);
        return;
      }
      resolve(nodes || []);
    });
  });
}

function invalidateBookmarkCorpus() {
  bookmarkCorpusCache = null;
  bookmarkCorpusPromise = null;
  for (const listener of invalidationListeners) {
    listener();
  }
}

function ensureBookmarkCorpusListeners(bookmarksApi: BookmarkApi) {
  if (attachedListeners) return;

  bookmarksApi.onCreated?.addListener?.(invalidateBookmarkCorpus);
  bookmarksApi.onRemoved?.addListener?.(invalidateBookmarkCorpus);
  bookmarksApi.onChanged?.addListener?.(invalidateBookmarkCorpus);
  bookmarksApi.onMoved?.addListener?.(invalidateBookmarkCorpus);
  bookmarksApi.onChildrenReordered?.addListener?.(invalidateBookmarkCorpus);
  bookmarksApi.onImportBegan?.addListener?.(invalidateBookmarkCorpus);
  bookmarksApi.onImportEnded?.addListener?.(invalidateBookmarkCorpus);
  attachedListeners = true;
}

export function subscribeBookmarkCorpusInvalidation(
  bookmarksApi: BookmarkApi,
  listener: () => void,
): () => void {
  ensureBookmarkCorpusListeners(bookmarksApi);
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

export async function listBookmarkCorpus(
  bookmarksApi: BookmarkApi,
  options?: {
    maxAgeMs?: number;
    onProgress?: (progress: { processed: number }) => void;
  },
): Promise<BookmarkCorpusEntry[]> {
  ensureBookmarkCorpusListeners(bookmarksApi);

  const maxAgeMs = options?.maxAgeMs ?? BOOKMARK_CORPUS_CACHE_TTL_MS;
  const now = Date.now();
  if (
    maxAgeMs > 0
    && bookmarkCorpusCache
    && now - bookmarkCorpusCache.builtAt < maxAgeMs
  ) {
    return bookmarkCorpusCache.entries;
  }
  if (bookmarkCorpusPromise) return bookmarkCorpusPromise;

  bookmarkCorpusPromise = (async () => {
    const tree = await getBookmarkTree(bookmarksApi);
    const stack: BookmarkTreeCursor[] = tree
      .slice()
      .reverse()
      .map((node) => ({ node, folders: [] }));
    const dedupedByUrl = new Map<string, BookmarkCorpusEntry>();
    let processedCount = 0;

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      const { node, folders } = current;
      const title = (node.title || '').trim();
      const nextFolders = !node.url && title ? [...folders, title] : folders;

      if (node.url) {
        const url = node.url.trim();
        if (url && !dedupedByUrl.has(url)) {
          const domain = extractDomain(url);
          dedupedByUrl.set(url, {
            bookmarkId: String(node.id || url),
            url,
            title: title || domain || url,
            domain,
            folderPath: folders.join(' / '),
            dateAdded: Number(node.dateAdded || 0),
            faviconUrl: buildFaviconUrl(url),
          });
        }
      }

      if (node.children?.length) {
        for (let index = node.children.length - 1; index >= 0; index -= 1) {
          stack.push({
            node: node.children[index],
            folders: nextFolders,
          });
        }
      }

      processedCount += 1;
      options?.onProgress?.({ processed: processedCount });
      if (processedCount % BOOKMARK_TREE_YIELD_INTERVAL === 0) {
        await yieldToMainThread();
      }
    }

    const entries = Array.from(dedupedByUrl.values());
    bookmarkCorpusCache = {
      builtAt: Date.now(),
      entries,
    };
    return entries;
  })();

  try {
    return await bookmarkCorpusPromise;
  } finally {
    bookmarkCorpusPromise = null;
  }
}
