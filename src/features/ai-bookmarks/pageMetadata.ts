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
import type {
  BookmarkPageMetadataState,
  BookmarkSemanticDocument,
} from '@/features/ai-bookmarks/types';
import { containsOriginPermission } from '@/platform/permissions';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkPageMetadata = Pick<
  BookmarkSemanticDocument,
  'pageTitle' | 'metaDescription' | 'bodyPreview'
>;

type BookmarkPageMetadataFetchResult =
  | {
    state: 'success';
    fetchedAt: number;
    retryAt: number;
    metadata: BookmarkPageMetadata;
  }
  | {
    state: Exclude<BookmarkPageMetadataState, 'pending' | 'success'>;
    fetchedAt: number;
    retryAt: number;
  };

const PAGE_METADATA_FAILED_RETRY_MS = 30 * 60 * 1000;
const PAGE_METADATA_BLOCKED_RETRY_MS = 6 * 60 * 60 * 1000;

function hasPageMetadata(document: BookmarkSemanticDocument): boolean {
  return Boolean(document.pageTitle || document.metaDescription || document.bodyPreview);
}

export function shouldAttemptPageMetadataRefresh(document: BookmarkSemanticDocument): boolean {
  if (hasPageMetadata(document)) return false;
  if (document.pageMetadataState === 'success' || document.pageMetadataState === 'empty') return false;
  if (
    (document.pageMetadataState === 'failed' || document.pageMetadataState === 'blocked')
    && Number(document.pageMetadataRetryAt || 0) > Date.now()
  ) {
    return false;
  }
  return true;
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

function buildRetryAt(fetchedAt: number, retryDelayMs: number): number {
  return fetchedAt + retryDelayMs;
}

async function fetchBookmarkPageMetadata(url: string): Promise<BookmarkPageMetadataFetchResult> {
  const fetchedAt = Date.now();
  const parsedUrl = safeParseUrl(url);
  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return {
      state: 'empty',
      fetchedAt,
      retryAt: 0,
    };
  }
  if (!(await containsOriginPermission(url))) {
    return {
      state: 'blocked',
      fetchedAt,
      retryAt: buildRetryAt(fetchedAt, PAGE_METADATA_BLOCKED_RETRY_MS),
    };
  }

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
    if (!response.ok) {
      return {
        state: 'failed',
        fetchedAt,
        retryAt: buildRetryAt(fetchedAt, PAGE_METADATA_FAILED_RETRY_MS),
      };
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return {
        state: 'failed',
        fetchedAt,
        retryAt: buildRetryAt(fetchedAt, PAGE_METADATA_FAILED_RETRY_MS),
      };
    }

    const html = (await response.text()).slice(0, 150_000);
    if (!html.trim()) {
      return {
        state: 'empty',
        fetchedAt,
        retryAt: 0,
      };
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pageTitle = sanitizeBookmarkText(doc.title || '').slice(0, 160);
    const metaDescription = sanitizeBookmarkText(extractMetaDescription(doc)).slice(0, 240);
    const bodyPreview = extractBodyPreview(doc);
    if (!pageTitle && !metaDescription && !bodyPreview) {
      return {
        state: 'empty',
        fetchedAt,
        retryAt: 0,
      };
    }

    return {
      state: 'success',
      fetchedAt,
      retryAt: 0,
      metadata: {
        pageTitle,
        metaDescription,
        bodyPreview,
      },
    };
  } catch {
    return {
      state: 'failed',
      fetchedAt,
      retryAt: buildRetryAt(fetchedAt, PAGE_METADATA_FAILED_RETRY_MS),
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function applyPageMetadata(
  document: BookmarkSemanticDocument,
  result: BookmarkPageMetadataFetchResult,
): BookmarkSemanticDocument {
  const nextDocument = {
    ...document,
    pageMetadataState: result.state,
    pageMetadataFetchedAt: result.fetchedAt,
    pageMetadataRetryAt: result.retryAt,
  };
  if (result.state !== 'success') return nextDocument;

  nextDocument.pageTitle = result.metadata.pageTitle;
  nextDocument.metaDescription = result.metadata.metaDescription;
  nextDocument.bodyPreview = result.metadata.bodyPreview;
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
    .filter(({ document }) => shouldAttemptPageMetadataRefresh(document))
    .slice(0, AI_BOOKMARK_PAGE_FETCH_LIMIT_PER_SYNC)
    .map(({ index }) => index);

  if (candidateIndexes.length <= 0) return out;

  for (let start = 0; start < candidateIndexes.length; start += AI_BOOKMARK_PAGE_FETCH_CONCURRENCY) {
    const batchIndexes = candidateIndexes.slice(start, start + AI_BOOKMARK_PAGE_FETCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batchIndexes.map(async (index) => {
        const result = await fetchBookmarkPageMetadata(out[index].url);
        return { index, result };
      }),
    );

    for (const result of batchResults) {
      out[result.index] = applyPageMetadata(out[result.index], result.result);
    }
    await yieldToMainThread();
  }

  return out;
}
