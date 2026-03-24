export type AiBookmarkModelLanguage = 'zh' | 'en' | 'multi';

export type AiBookmarkModelId =
  | 'paraphrase-multilingual-minilm-l12-v2'
  | 'bge-small-zh-v1.5'
  | 'english-small-reserved';
export type BookmarkPageMetadataState = 'pending' | 'success' | 'empty' | 'failed' | 'blocked';

export type AiBookmarkModelDefinition = {
  id: AiBookmarkModelId;
  language: AiBookmarkModelLanguage;
  modelPath: string;
  modelFileName: string;
  vectorSize: number;
  queryInstruction: string;
  remoteModelBaseUrl?: string;
};

export type BookmarkSemanticDocument = {
  bookmarkId: string;
  url: string;
  title: string;
  domain: string;
  folderPath: string;
  pageTitle: string;
  metaDescription: string;
  bodyPreview: string;
  pageMetadataState: BookmarkPageMetadataState;
  pageMetadataFetchedAt: number;
  pageMetadataRetryAt: number;
  faviconUrl: string;
  searchText: string;
  contentHash: string;
  indexedAt: number;
};

export type BookmarkSemanticIndexEntry = BookmarkSemanticDocument & {
  embedding: number[];
  embeddingModel: AiBookmarkModelId;
};

export type BookmarkSemanticIndexMeta = {
  id: 'meta';
  schemaVersion: number;
  embeddingModel: AiBookmarkModelId;
  sourceSignature: string;
  bookmarkCount: number;
  builtAt: number;
};

export type BookmarkSemanticSearchResult = {
  bookmarkId: string;
  url: string;
  label: string;
  score: number;
};

export type BookmarkSemanticSearchCandidate = Omit<BookmarkSemanticIndexEntry, 'embedding'> & {
  semanticScore: number;
};

export type BookmarkSemanticSearchStatus = {
  modelState: 'idle' | 'loading' | 'ready' | 'error';
  indexState: 'idle' | 'syncing' | 'ready' | 'error';
  available: boolean;
  indexedCount: number;
  builtAt: number | null;
  lastError: string | null;
};
