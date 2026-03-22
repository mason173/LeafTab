import {
  AI_BOOKMARK_PAGE_FETCH_CONCURRENCY,
  AI_BOOKMARK_PAGE_FETCH_LIMIT_PER_SYNC,
  AI_BOOKMARK_PAGE_FETCH_TIMEOUT_MS,
} from '@/features/ai-bookmarks/constants';
import {
  buildBookmarkContentHash,
  buildBookmarkSearchText,
  safeParseUrl,
  sanitizeBookmarkText,
} from '@/features/ai-bookmarks/text';
import type { BookmarkSemanticDocument } from '@/features/ai-bookmarks/types';
import { containsOriginPermission } from '@/platform/permissions';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkPageMetadata = Pick<
  BookmarkSemanticDocument,
  'pageTitle' | 'metaDescription' | 'bodyPreview' | 'searchText' | 'contentHash'
>;

function hasPageMetadata(document: BookmarkSemanticDocument): boolean {
  return Boolean(document.pageTitle || document.metaDescription || document.bodyPreview);
}

function extractMetaDescription(doc: Document): string {
  const selectors = [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ];

  for (const selector of selectors) {
    const content = (doc.querySelector(selector)?.getAttribute('content') || '').trim();
    if (content) return content;
  }
  return '';
}

function extractBodyPreview(doc: Document): string {
  doc.querySelectorAll('script, style, noscript, svg, canvas').forEach((node) => node.remove());
  const bodyText = sanitizeBookmarkText(doc.body?.textContent || '');
  return bodyText.slice(0, 320);
}

async function fetchBookmarkPageMetadata(url: string): Promise<BookmarkPageMetadata | null> {
  const parsedUrl = safeParseUrl(url);
  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) return null;
  if (!(await containsOriginPermission(url))) return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_BOOKMARK_PAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'force-cache',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    const html = (await response.text()).slice(0, 150_000);
    if (!html.trim()) return null;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pageTitle = sanitizeBookmarkText(doc.title || '').slice(0, 160);
    const metaDescription = sanitizeBookmarkText(extractMetaDescription(doc)).slice(0, 240);
    const bodyPreview = extractBodyPreview(doc);

    return {
      pageTitle,
      metaDescription,
      bodyPreview,
      searchText: '',
      contentHash: '',
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function applyPageMetadata(
  document: BookmarkSemanticDocument,
  metadata: BookmarkPageMetadata | null,
): BookmarkSemanticDocument {
  if (!metadata) return document;

  const nextDocument = {
    ...document,
    pageTitle: metadata.pageTitle,
    metaDescription: metadata.metaDescription,
    bodyPreview: metadata.bodyPreview,
  };
  nextDocument.searchText = buildBookmarkSearchText({
    title: nextDocument.title,
    url: nextDocument.url,
    domain: nextDocument.domain,
    folderPath: nextDocument.folderPath,
    pageTitle: nextDocument.pageTitle,
    metaDescription: nextDocument.metaDescription,
    bodyPreview: nextDocument.bodyPreview,
  });
  nextDocument.contentHash = buildBookmarkContentHash(nextDocument);
  return nextDocument;
}

export async function enrichBookmarkDocumentsWithPageMetadata(
  documents: BookmarkSemanticDocument[],
): Promise<BookmarkSemanticDocument[]> {
  const out = [...documents];
  const candidateIndexes = out
    .map((document, index) => ({ document, index }))
    .filter(({ document }) => !hasPageMetadata(document))
    .slice(0, AI_BOOKMARK_PAGE_FETCH_LIMIT_PER_SYNC)
    .map(({ index }) => index);

  if (candidateIndexes.length <= 0) return out;

  for (let start = 0; start < candidateIndexes.length; start += AI_BOOKMARK_PAGE_FETCH_CONCURRENCY) {
    const batchIndexes = candidateIndexes.slice(start, start + AI_BOOKMARK_PAGE_FETCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batchIndexes.map(async (index) => {
        const metadata = await fetchBookmarkPageMetadata(out[index].url);
        return { index, metadata };
      }),
    );

    for (const result of batchResults) {
      out[result.index] = applyPageMetadata(out[result.index], result.metadata);
    }
    await yieldToMainThread();
  }

  return out;
}
