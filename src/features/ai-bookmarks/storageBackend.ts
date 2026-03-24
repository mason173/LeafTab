import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { AI_BOOKMARK_INDEX_PGLITE_DATA_DIR } from '@/features/ai-bookmarks/constants';
import type {
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
  BookmarkSemanticSearchCandidate,
} from '@/features/ai-bookmarks/types';

type BookmarkIndexDb = Awaited<ReturnType<typeof PGlite.create>>;

type BookmarkSemanticEntryRow = {
  sort_order: number;
  bookmark_id: string;
  url: string;
  title: string;
  domain: string;
  folder_path: string;
  page_title: string;
  meta_description: string;
  body_preview: string;
  page_metadata_state: BookmarkSemanticIndexEntry['pageMetadataState'];
  page_metadata_fetched_at: number;
  page_metadata_retry_at: number;
  favicon_url: string;
  search_text: string;
  content_hash: string;
  indexed_at: number;
  embedding_model: BookmarkSemanticIndexEntry['embeddingModel'];
  embedding_text: string;
};

type BookmarkSemanticSearchCandidateRow = Omit<BookmarkSemanticEntryRow, 'sort_order' | 'embedding_text'> & {
  semantic_score: number;
};

type BookmarkSemanticMetaRow = {
  id: 'meta';
  schema_version: number;
  embedding_model: BookmarkSemanticIndexMeta['embeddingModel'];
  source_signature: string;
  bookmark_count: number;
  built_at: number;
};

let dbPromise: Promise<BookmarkIndexDb> | null = null;

function resolveBookmarkIndexDataDir(): string {
  if (typeof window !== 'undefined' && /\/ai-sandbox\.html$/i.test(window.location.pathname)) {
    return 'memory://LeafTabAiBookmarkIndexSandbox';
  }
  return AI_BOOKMARK_INDEX_PGLITE_DATA_DIR;
}

function toVectorLiteral(embedding: readonly number[]): string {
  return `[${embedding.map((value) => {
    const safeValue = Number(value);
    return Number.isFinite(safeValue) ? String(safeValue) : '0';
  }).join(',')}]`;
}

function parseVectorLiteral(value: string): number[] {
  const normalized = value.trim();
  if (!normalized.startsWith('[') || !normalized.endsWith(']')) return [];
  const body = normalized.slice(1, -1).trim();
  if (!body) return [];
  return body
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

function normalizeBookmarkSemanticIndexEntry(
  entry: BookmarkSemanticIndexEntry,
): BookmarkSemanticIndexEntry {
  return {
    ...entry,
    pageMetadataState: entry.pageMetadataState || 'pending',
    pageMetadataFetchedAt: Number(entry.pageMetadataFetchedAt || 0),
    pageMetadataRetryAt: Number(entry.pageMetadataRetryAt || 0),
  };
}

function mapEntryRow(row: BookmarkSemanticEntryRow): BookmarkSemanticIndexEntry {
  return normalizeBookmarkSemanticIndexEntry({
    bookmarkId: row.bookmark_id,
    url: row.url,
    title: row.title,
    domain: row.domain,
    folderPath: row.folder_path,
    pageTitle: row.page_title,
    metaDescription: row.meta_description,
    bodyPreview: row.body_preview,
    pageMetadataState: row.page_metadata_state,
    pageMetadataFetchedAt: Number(row.page_metadata_fetched_at || 0),
    pageMetadataRetryAt: Number(row.page_metadata_retry_at || 0),
    faviconUrl: row.favicon_url,
    searchText: row.search_text,
    contentHash: row.content_hash,
    indexedAt: Number(row.indexed_at || 0),
    embedding: parseVectorLiteral(row.embedding_text),
    embeddingModel: row.embedding_model,
  });
}

function mapMetaRow(row: BookmarkSemanticMetaRow): BookmarkSemanticIndexMeta {
  return {
    id: 'meta',
    schemaVersion: Number(row.schema_version || 0),
    embeddingModel: row.embedding_model,
    sourceSignature: row.source_signature,
    bookmarkCount: Number(row.bookmark_count || 0),
    builtAt: Number(row.built_at || 0),
  };
}

function mapSearchCandidateRow(row: BookmarkSemanticSearchCandidateRow): BookmarkSemanticSearchCandidate {
  return {
    bookmarkId: row.bookmark_id,
    url: row.url,
    title: row.title,
    domain: row.domain,
    folderPath: row.folder_path,
    pageTitle: row.page_title,
    metaDescription: row.meta_description,
    bodyPreview: row.body_preview,
    pageMetadataState: row.page_metadata_state,
    pageMetadataFetchedAt: Number(row.page_metadata_fetched_at || 0),
    pageMetadataRetryAt: Number(row.page_metadata_retry_at || 0),
    faviconUrl: row.favicon_url,
    searchText: row.search_text,
    contentHash: row.content_hash,
    indexedAt: Number(row.indexed_at || 0),
    embeddingModel: row.embedding_model,
    semanticScore: Number(row.semantic_score || 0),
  };
}

async function initializeBookmarkIndexDb(db: BookmarkIndexDb): Promise<void> {
  await db.exec(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS leaftab_ai_bookmark_index_entries (
      bookmark_id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      page_title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      body_preview TEXT NOT NULL,
      page_metadata_state TEXT NOT NULL,
      page_metadata_fetched_at BIGINT NOT NULL,
      page_metadata_retry_at BIGINT NOT NULL,
      favicon_url TEXT NOT NULL,
      search_text TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      indexed_at BIGINT NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding vector NOT NULL
    );

    CREATE INDEX IF NOT EXISTS leaftab_ai_bookmark_entries_sort_order_idx
      ON leaftab_ai_bookmark_index_entries (sort_order);

    CREATE INDEX IF NOT EXISTS leaftab_ai_bookmark_entries_embedding_model_idx
      ON leaftab_ai_bookmark_index_entries (embedding_model);

    CREATE INDEX IF NOT EXISTS leaftab_ai_bookmark_entries_url_idx
      ON leaftab_ai_bookmark_index_entries (url);

    CREATE TABLE IF NOT EXISTS leaftab_ai_bookmark_index_meta (
      id TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      embedding_model TEXT NOT NULL,
      source_signature TEXT NOT NULL,
      bookmark_count INTEGER NOT NULL,
      built_at BIGINT NOT NULL
    );
  `);
}

async function openBookmarkIndexDb(): Promise<BookmarkIndexDb> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await PGlite.create(resolveBookmarkIndexDataDir(), {
      extensions: { vector },
      relaxedDurability: true,
    });
    await initializeBookmarkIndexDb(db);
    return db;
  })().catch((error) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

export async function readBookmarkSemanticIndexEntries(): Promise<BookmarkSemanticIndexEntry[]> {
  const db = await openBookmarkIndexDb();
  const result = await db.query<BookmarkSemanticEntryRow>(`
    SELECT
      sort_order,
      bookmark_id,
      url,
      title,
      domain,
      folder_path,
      page_title,
      meta_description,
      body_preview,
      page_metadata_state,
      page_metadata_fetched_at,
      page_metadata_retry_at,
      favicon_url,
      search_text,
      content_hash,
      indexed_at,
      embedding_model,
      embedding::text AS embedding_text
    FROM leaftab_ai_bookmark_index_entries
    ORDER BY sort_order ASC
  `);
  return result.rows.map(mapEntryRow);
}

export async function readBookmarkSemanticIndexMeta(): Promise<BookmarkSemanticIndexMeta | null> {
  const db = await openBookmarkIndexDb();
  const result = await db.query<BookmarkSemanticMetaRow>(`
    SELECT
      id,
      schema_version,
      embedding_model,
      source_signature,
      bookmark_count,
      built_at
    FROM leaftab_ai_bookmark_index_meta
    WHERE id = 'meta'
    LIMIT 1
  `);
  return result.rows[0] ? mapMetaRow(result.rows[0]) : null;
}

export async function searchBookmarkSemanticIndex(args: {
  embeddingModel: BookmarkSemanticIndexEntry['embeddingModel'];
  queryEmbedding: readonly number[];
  limit: number;
}): Promise<BookmarkSemanticSearchCandidate[]> {
  const db = await openBookmarkIndexDb();
  const safeLimit = Math.max(1, Math.floor(args.limit));
  const vectorLiteral = toVectorLiteral(args.queryEmbedding);
  const result = await db.query<BookmarkSemanticSearchCandidateRow>(`
    SELECT
      bookmark_id,
      url,
      title,
      domain,
      folder_path,
      page_title,
      meta_description,
      body_preview,
      page_metadata_state,
      page_metadata_fetched_at,
      page_metadata_retry_at,
      favicon_url,
      search_text,
      content_hash,
      indexed_at,
      embedding_model,
      GREATEST(0, 1 - (embedding <=> $2::vector)) AS semantic_score
    FROM leaftab_ai_bookmark_index_entries
    WHERE embedding_model = $1
    ORDER BY embedding <=> $2::vector ASC
    LIMIT $3
  `, [args.embeddingModel, vectorLiteral, safeLimit]);
  return result.rows.map(mapSearchCandidateRow);
}

export async function replaceBookmarkSemanticIndex(args: {
  entries: BookmarkSemanticIndexEntry[];
  meta: BookmarkSemanticIndexMeta;
}): Promise<void> {
  const db = await openBookmarkIndexDb();
  await db.transaction(async (tx) => {
    await tx.exec(`
      DELETE FROM leaftab_ai_bookmark_index_entries;
      DELETE FROM leaftab_ai_bookmark_index_meta;
    `);

    for (let index = 0; index < args.entries.length; index += 1) {
      const entry = args.entries[index];
      await tx.query(`
        INSERT INTO leaftab_ai_bookmark_index_entries (
          bookmark_id,
          sort_order,
          url,
          title,
          domain,
          folder_path,
          page_title,
          meta_description,
          body_preview,
          page_metadata_state,
          page_metadata_fetched_at,
          page_metadata_retry_at,
          favicon_url,
          search_text,
          content_hash,
          indexed_at,
          embedding_model,
          embedding
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18::vector
        )
      `, [
        entry.bookmarkId,
        index,
        entry.url,
        entry.title,
        entry.domain,
        entry.folderPath,
        entry.pageTitle,
        entry.metaDescription,
        entry.bodyPreview,
        entry.pageMetadataState,
        entry.pageMetadataFetchedAt,
        entry.pageMetadataRetryAt,
        entry.faviconUrl,
        entry.searchText,
        entry.contentHash,
        entry.indexedAt,
        entry.embeddingModel,
        toVectorLiteral(entry.embedding),
      ]);
    }

    await tx.query(`
      INSERT INTO leaftab_ai_bookmark_index_meta (
        id,
        schema_version,
        embedding_model,
        source_signature,
        bookmark_count,
        built_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
    `, [
      args.meta.id,
      args.meta.schemaVersion,
      args.meta.embeddingModel,
      args.meta.sourceSignature,
      args.meta.bookmarkCount,
      args.meta.builtAt,
    ]);
  });
}

export async function clearBookmarkSemanticIndex(): Promise<void> {
  const db = await openBookmarkIndexDb();
  await db.exec(`
    DELETE FROM leaftab_ai_bookmark_index_entries;
    DELETE FROM leaftab_ai_bookmark_index_meta;
  `);
}
