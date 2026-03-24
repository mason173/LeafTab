import { buildBookmarkContentHash, buildBookmarkSearchText, buildFaviconUrl, extractDomain } from '@/features/ai-bookmarks/text';
import type { BookmarkSemanticDocument } from '@/features/ai-bookmarks/types';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkApi = typeof chrome.bookmarks;

const BOOKMARK_TREE_YIELD_INTERVAL = 250;

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

type BookmarkTreeCursor = {
  node: chrome.bookmarks.BookmarkTreeNode;
  folders: string[];
};

export async function loadBookmarkSemanticDocuments(
  bookmarksApi: BookmarkApi,
  options?: {
    onProgress?: (progress: { processed: number }) => void;
  },
): Promise<BookmarkSemanticDocument[]> {
  const tree = await getBookmarkTree(bookmarksApi);
  const stack: BookmarkTreeCursor[] = tree
    .slice()
    .reverse()
    .map((node) => ({ node, folders: [] }));
  const dedupedByUrl = new Map<string, BookmarkSemanticDocument>();
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
        const folderPath = folders.join(' / ');
        const pageTitle = '';
        const metaDescription = '';
        const bodyPreview = '';
        const faviconUrl = buildFaviconUrl(url);
        const searchText = buildBookmarkSearchText({
          title: title || domain || url,
          url,
          domain,
          folderPath,
          pageTitle,
          metaDescription,
          bodyPreview,
        });
        const baseDocument = {
          bookmarkId: String(node.id || url),
          url,
          title: title || domain || url,
          domain,
          folderPath,
          pageTitle,
          metaDescription,
          bodyPreview,
          faviconUrl,
          searchText,
        };
        dedupedByUrl.set(url, {
          ...baseDocument,
          contentHash: buildBookmarkContentHash(baseDocument),
          indexedAt: 0,
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

  return Array.from(dedupedByUrl.values());
}
