import type { BookmarkSemanticDocument } from '@/features/ai-bookmarks/types';

const CJK_RE = /[\u3400-\u9fff]/;

export function hasCjkText(value: string): boolean {
  return CJK_RE.test(value);
}

export function safeParseUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

export function extractDomain(rawUrl: string): string {
  return safeParseUrl(rawUrl)?.hostname || '';
}

export function buildFaviconUrl(rawUrl: string): string {
  const parsedUrl = safeParseUrl(rawUrl);
  if (!parsedUrl) return '';
  return `${parsedUrl.origin}/favicon.ico`;
}

export function sanitizeBookmarkText(rawValue: string): string {
  return rawValue
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
}

export function buildBookmarkSearchText(args: {
  title: string;
  url: string;
  domain: string;
  folderPath: string;
  pageTitle?: string;
  metaDescription?: string;
  bodyPreview?: string;
}): string {
  const parts = [
    args.title,
    args.domain,
    args.folderPath,
    args.pageTitle || '',
    args.metaDescription || '',
    args.bodyPreview || '',
    args.url,
  ]
    .map(sanitizeBookmarkText)
    .filter(Boolean);

  return parts.join('\n');
}

export function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function buildBookmarkContentHash(document: Omit<BookmarkSemanticDocument, 'contentHash' | 'indexedAt'>): string {
  return hashString([
    document.bookmarkId,
    document.url,
    document.title,
    document.domain,
    document.folderPath,
    document.pageTitle,
    document.metaDescription,
    document.bodyPreview,
  ].join('|'));
}

export function buildBookmarkSourceSignature(contentHashes: readonly string[]): string {
  return hashString(contentHashes.join('||'));
}
