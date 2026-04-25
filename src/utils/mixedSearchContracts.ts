import type { SearchSuggestionItem } from '@/types';

export type MixedSearchSourceId =
  | 'tabs'
  | 'recently-closed'
  | 'bookmarks'
  | 'browser-history'
  | 'local-history'
  | 'shortcuts'
  | 'builtin-sites'
  | 'remote'
  | 'commands'
  | 'settings';

export type MixedSearchCandidate = {
  sourceId: MixedSearchSourceId;
  item: SearchSuggestionItem;
  sourceRank: number;
  reasons: string[];
};

export type MixedSearchSourceBundle = {
  sourceId: MixedSearchSourceId;
  items: readonly SearchSuggestionItem[];
};

export type MixedSearchResult = {
  candidate: MixedSearchCandidate;
  globalRank: number;
  reasons: readonly string[];
};
