import { listBookmarkCorpus } from '@/features/ai-bookmarks/corpus';
import { buildBookmarkContentHash, buildBookmarkSearchText } from '@/features/ai-bookmarks/text';
import type { BookmarkSemanticDocument } from '@/features/ai-bookmarks/types';

type BookmarkApi = typeof chrome.bookmarks;

export async function loadBookmarkSemanticDocuments(
  bookmarksApi: BookmarkApi,
  options?: {
    onProgress?: (progress: { processed: number }) => void;
  },
): Promise<BookmarkSemanticDocument[]> {
  const corpusEntries = await listBookmarkCorpus(bookmarksApi, options);
  return corpusEntries.map((entry) => {
    const pageTitle = '';
    const metaDescription = '';
    const bodyPreview = '';
    const searchText = buildBookmarkSearchText({
      title: entry.title,
      url: entry.url,
      domain: entry.domain,
      folderPath: entry.folderPath,
      pageTitle,
      metaDescription,
      bodyPreview,
    });
    const baseDocument = {
      bookmarkId: entry.bookmarkId,
      url: entry.url,
      title: entry.title,
      domain: entry.domain,
      folderPath: entry.folderPath,
      pageTitle,
      metaDescription,
      bodyPreview,
      pageMetadataState: 'pending' as const,
      pageMetadataFetchedAt: 0,
      pageMetadataRetryAt: 0,
      faviconUrl: entry.faviconUrl,
      searchText,
    };
    return {
      ...baseDocument,
      contentHash: buildBookmarkContentHash(baseDocument),
      indexedAt: 0,
    };
  });
}
