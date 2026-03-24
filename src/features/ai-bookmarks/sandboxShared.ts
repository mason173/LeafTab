import type { AiBookmarkModelId } from '@/features/ai-bookmarks/types';
import type {
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
  BookmarkSemanticSearchCandidate,
} from '@/features/ai-bookmarks/types';

export const AI_BOOKMARK_SANDBOX_READY_TYPE = 'leaftab-ai-bookmarks:sandbox-ready';
export const AI_BOOKMARK_SANDBOX_EMBED_TYPE = 'leaftab-ai-bookmarks:embed';
export const AI_BOOKMARK_SANDBOX_STORAGE_TYPE = 'leaftab-ai-bookmarks:storage';

export type AiBookmarkSandboxEmbedRequest = {
  modelId: AiBookmarkModelId;
  texts: string[];
  isQuery?: boolean;
};

export type AiBookmarkSandboxEmbedProgressEvent = {
  kind: 'progress';
  progress: number;
  label?: string;
};

export type AiBookmarkSandboxEmbedResponse =
  | {
      kind: 'result';
      ok: true;
      embeddings: number[][];
    }
  | {
      kind: 'result';
      ok: false;
      error: string;
    };

export type AiBookmarkSandboxStorageRequest =
  | {
      operation: 'read-index-entries';
    }
  | {
      operation: 'read-index-meta';
    }
  | {
      operation: 'replace-index';
      entries: BookmarkSemanticIndexEntry[];
      meta: BookmarkSemanticIndexMeta;
    }
  | {
      operation: 'clear-index';
    }
  | {
      operation: 'search-index';
      embeddingModel: AiBookmarkModelId;
      queryEmbedding: number[];
      limit: number;
    };

export type AiBookmarkSandboxStorageResponse =
  | {
      ok: true;
      operation: 'read-index-entries';
      entries: BookmarkSemanticIndexEntry[];
    }
  | {
      ok: true;
      operation: 'read-index-meta';
      meta: BookmarkSemanticIndexMeta | null;
    }
  | {
      ok: true;
      operation: 'replace-index';
    }
  | {
      ok: true;
      operation: 'clear-index';
    }
  | {
      ok: true;
      operation: 'search-index';
      entries: BookmarkSemanticSearchCandidate[];
    }
  | {
      ok: false;
      error: string;
    };
