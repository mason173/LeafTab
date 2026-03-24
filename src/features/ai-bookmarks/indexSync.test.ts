import { describe, expect, it } from 'vitest';
import { shouldReuseExistingSemanticIndex } from '@/features/ai-bookmarks/indexSync';
import type {
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
} from '@/features/ai-bookmarks/types';

const existingEntry: BookmarkSemanticIndexEntry = {
  bookmarkId: 'bookmark-1',
  url: 'https://leaf.example/docs',
  title: 'LeafTab Docs',
  domain: 'leaf.example',
  folderPath: 'Docs',
  pageTitle: '',
  metaDescription: '',
  bodyPreview: '',
  pageMetadataState: 'pending',
  pageMetadataFetchedAt: 0,
  pageMetadataRetryAt: 0,
  faviconUrl: '',
  searchText: 'LeafTab Docs https://leaf.example/docs',
  contentHash: 'content-hash-1',
  indexedAt: 1,
  embedding: [0.1, 0.2, 0.3],
  embeddingModel: 'paraphrase-multilingual-minilm-l12-v2',
};

const existingMeta: BookmarkSemanticIndexMeta = {
  id: 'meta',
  schemaVersion: 3,
  embeddingModel: 'paraphrase-multilingual-minilm-l12-v2',
  sourceSignature: 'source-signature-1',
  bookmarkCount: 1,
  builtAt: 1,
};

describe('ai bookmark indexSync shouldReuseExistingSemanticIndex', () => {
  it('reuses the existing index when the source signature still matches', () => {
    expect(shouldReuseExistingSemanticIndex({
      existingMeta,
      existingEntries: [existingEntry],
      sourceSignature: 'source-signature-1',
      bookmarkCount: 1,
    })).toBe(true);
  });

  it('does not reuse the existing index when the bookmark source signature changed', () => {
    expect(shouldReuseExistingSemanticIndex({
      existingMeta,
      existingEntries: [existingEntry],
      sourceSignature: 'source-signature-2',
      bookmarkCount: 1,
    })).toBe(false);
  });

  it('does not reuse the existing index when the bookmark count drifted', () => {
    expect(shouldReuseExistingSemanticIndex({
      existingMeta,
      existingEntries: [existingEntry],
      sourceSignature: 'source-signature-1',
      bookmarkCount: 2,
    })).toBe(false);
  });

  it('does not reuse the existing index when the persisted entries are empty', () => {
    expect(shouldReuseExistingSemanticIndex({
      existingMeta,
      existingEntries: [],
      sourceSignature: 'source-signature-1',
      bookmarkCount: 0,
    })).toBe(false);
  });
});
