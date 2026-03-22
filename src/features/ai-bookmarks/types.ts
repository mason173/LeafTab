export type AiBookmarkModelLanguage = 'zh' | 'en';

export type AiBookmarkModelId = 'bge-small-zh-v1.5' | 'english-small-reserved';

export type AiBookmarkModelDefinition = {
  id: AiBookmarkModelId;
  language: AiBookmarkModelLanguage;
  modelPath: string;
  modelFileName: string;
  vectorSize: number;
  queryInstruction: string;
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

export type BookmarkSemanticSearchStatus = {
  modelState: 'idle' | 'loading' | 'ready' | 'error';
  indexState: 'idle' | 'syncing' | 'ready' | 'error';
  available: boolean;
  indexedCount: number;
  builtAt: number | null;
  lastError: string | null;
};
