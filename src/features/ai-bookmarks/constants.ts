import type { AiBookmarkModelDefinition, AiBookmarkModelId } from '@/features/ai-bookmarks/types';

export const AI_BOOKMARK_INDEX_DB_NAME = 'LeafTabAiBookmarkIndex';
export const AI_BOOKMARK_INDEX_DB_VERSION = 1;
export const AI_BOOKMARK_INDEX_ENTRIES_STORE = 'entries';
export const AI_BOOKMARK_INDEX_META_STORE = 'meta';
export const AI_BOOKMARK_INDEX_SCHEMA_VERSION = 1;
export const AI_BOOKMARK_INDEX_BATCH_SIZE = 16;
export const AI_BOOKMARK_MIN_QUERY_LENGTH = 2;
export const AI_BOOKMARK_QUERY_CACHE_TTL_MS = 30_000;
export const AI_BOOKMARK_QUERY_CACHE_LIMIT = 50;
export const AI_BOOKMARK_PAGE_FETCH_TIMEOUT_MS = 3_500;
export const AI_BOOKMARK_PAGE_FETCH_CONCURRENCY = 4;
export const AI_BOOKMARK_PAGE_FETCH_LIMIT_PER_SYNC = 24;

export const AI_BOOKMARK_DEFAULT_MODEL_ID: AiBookmarkModelId = 'bge-small-zh-v1.5';

export const AI_BOOKMARK_MODEL_REGISTRY: Record<AiBookmarkModelId, AiBookmarkModelDefinition> = {
  'bge-small-zh-v1.5': {
    id: 'bge-small-zh-v1.5',
    language: 'zh',
    modelPath: 'models/bge-small-zh-v1.5',
    modelFileName: 'model_quantized.onnx',
    vectorSize: 512,
    queryInstruction: '为这个句子生成表示以用于检索相关书签：',
  },
  'english-small-reserved': {
    id: 'english-small-reserved',
    language: 'en',
    modelPath: 'models/english-small-reserved',
    modelFileName: 'model_quantized.onnx',
    vectorSize: 384,
    queryInstruction: 'Represent this sentence for retrieving related bookmarks:',
  },
};
