import type { Shortcut } from '@/types';
import {
  getSearchMatchPriorityFromCandidates,
  buildSearchMatchCandidates,
} from '@/utils/searchHelpers';
import { buildPinyinSearchTokens } from '@/utils/searchPinyin';
import { isShortcutFolder } from '@/utils/shortcutFolders';

export type ShortcutSearchMatchIndex = {
  titleCandidates: string[];
  urlCandidates: string[];
  keywordCandidates: string[];
};

type ShortcutSearchMatchIndexCacheEntry = {
  index: ShortcutSearchMatchIndex;
  pinyinPrepared: boolean;
  pinyinPreparationPromise: Promise<ShortcutSearchMatchIndex> | null;
};

const shortcutSearchMatchIndexCache = new WeakMap<Shortcut, ShortcutSearchMatchIndexCacheEntry>();

function buildKeywordCandidates(shortcut: Shortcut): string[] {
  const keywords = new Set<string>();
  const kind = (shortcut.kind || '').trim();
  if (kind) {
    buildSearchMatchCandidates(kind).forEach((candidate) => {
      keywords.add(candidate);
    });
  }

  if (isShortcutFolder(shortcut)) {
    ['folder', 'folders', '文件夹', '快捷方式文件夹'].forEach((keyword) => {
      buildSearchMatchCandidates(keyword).forEach((candidate) => {
        keywords.add(candidate);
      });
    });
  }

  return Array.from(keywords);
}

export function buildShortcutSearchMatchIndex(shortcut: Shortcut): ShortcutSearchMatchIndex {
  const cached = shortcutSearchMatchIndexCache.get(shortcut);
  if (cached) return cached.index;

  const nextIndex = {
    titleCandidates: buildSearchMatchCandidates(shortcut.title || ''),
    urlCandidates: buildSearchMatchCandidates(shortcut.url || ''),
    keywordCandidates: buildKeywordCandidates(shortcut),
  };
  shortcutSearchMatchIndexCache.set(shortcut, {
    index: nextIndex,
    pinyinPrepared: false,
    pinyinPreparationPromise: null,
  });
  return nextIndex;
}

export function mergeShortcutSearchMatchIndexes(
  baseIndex: ShortcutSearchMatchIndex,
  nextIndex: ShortcutSearchMatchIndex,
): ShortcutSearchMatchIndex {
  return {
    titleCandidates: Array.from(new Set([
      ...baseIndex.titleCandidates,
      ...nextIndex.titleCandidates,
    ])),
    urlCandidates: Array.from(new Set([
      ...baseIndex.urlCandidates,
      ...nextIndex.urlCandidates,
    ])),
    keywordCandidates: Array.from(new Set([
      ...baseIndex.keywordCandidates,
      ...nextIndex.keywordCandidates,
    ])),
  };
}

function getOrCreateShortcutSearchMatchIndexCacheEntry(shortcut: Shortcut): ShortcutSearchMatchIndexCacheEntry {
  const cached = shortcutSearchMatchIndexCache.get(shortcut);
  if (cached) return cached;

  const created: ShortcutSearchMatchIndexCacheEntry = {
    index: buildShortcutSearchMatchIndex(shortcut),
    pinyinPrepared: false,
    pinyinPreparationPromise: null,
  };
  shortcutSearchMatchIndexCache.set(shortcut, created);
  return created;
}

function mergeCandidates(
  candidates: readonly string[],
  nextCandidates: readonly string[],
): string[] {
  return Array.from(new Set([...candidates, ...nextCandidates]));
}

export async function prepareShortcutSearchMatchIndex(shortcut: Shortcut): Promise<ShortcutSearchMatchIndex> {
  const cacheEntry = getOrCreateShortcutSearchMatchIndexCacheEntry(shortcut);
  if (cacheEntry.pinyinPrepared) return cacheEntry.index;
  if (cacheEntry.pinyinPreparationPromise) return cacheEntry.pinyinPreparationPromise;

  cacheEntry.pinyinPreparationPromise = (async () => {
    const titlePinyinCandidates = await buildPinyinSearchTokens(shortcut.title || '');
    const kindPinyinCandidates = await buildPinyinSearchTokens(shortcut.kind || '');
    const folderPinyinCandidates = isShortcutFolder(shortcut)
      ? await buildPinyinSearchTokens('文件夹')
      : [];

    cacheEntry.index = {
      titleCandidates: mergeCandidates(cacheEntry.index.titleCandidates, titlePinyinCandidates),
      urlCandidates: cacheEntry.index.urlCandidates,
      keywordCandidates: mergeCandidates(
        cacheEntry.index.keywordCandidates,
        [...kindPinyinCandidates, ...folderPinyinCandidates],
      ),
    };
    cacheEntry.pinyinPrepared = true;
    cacheEntry.pinyinPreparationPromise = null;
    return cacheEntry.index;
  })();

  return cacheEntry.pinyinPreparationPromise;
}

export async function prepareShortcutSearchMatchIndexes(shortcuts: readonly Shortcut[]): Promise<void> {
  await Promise.all(shortcuts.flatMap((shortcut) => (
    isShortcutFolder(shortcut)
      ? [
          prepareShortcutSearchMatchIndex(shortcut),
          prepareShortcutSearchMatchIndexes(shortcut.children || []),
        ]
      : [prepareShortcutSearchMatchIndex(shortcut)]
  )));
}

export function getShortcutSearchScoreFromMatchIndex(
  matchIndex: ShortcutSearchMatchIndex,
  normalizedQuery: string,
  options?: { fuzzy?: boolean },
): 0 | 1 | 2 | 3 | 4 {
  if (!normalizedQuery) return 0;

  const titlePriority = getSearchMatchPriorityFromCandidates(
    matchIndex.titleCandidates,
    normalizedQuery,
    options,
  );
  const urlPriority = getSearchMatchPriorityFromCandidates(
    matchIndex.urlCandidates,
    normalizedQuery,
    options,
  );
  const keywordPriority = getSearchMatchPriorityFromCandidates(
    matchIndex.keywordCandidates,
    normalizedQuery,
    options,
  );

  if (titlePriority === 2) return 4;
  if (urlPriority === 2) return 3;
  if (titlePriority === 1 || keywordPriority === 2) return 2;
  if (urlPriority === 1 || keywordPriority === 1) return 1;
  return 0;
}

export function matchesShortcutSearchQuery(
  matchIndex: ShortcutSearchMatchIndex,
  normalizedQuery: string,
  options?: { fuzzy?: boolean },
): boolean {
  return getShortcutSearchScoreFromMatchIndex(matchIndex, normalizedQuery, options) > 0;
}
