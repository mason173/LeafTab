import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchSuggestionItem, Shortcut } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import type { SearchAction } from '@/utils/searchActions';
import type { SearchPersonalizationProfile } from '@/utils/searchPersonalization';
import { rerankPersonalizedSearchActions } from '@/utils/searchPersonalization';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import {
  useSearchSuggestionSources,
  type SearchSuggestionSourceStatus,
} from '@/hooks/useSearchSuggestionSources';
import type { SearchSessionModel } from '@/utils/searchSessionModel';
import type { SearchSuggestionPermission } from '@/utils/searchCommands';
import { createMixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';
import {
  computeSearchSuggestionActions,
  type SearchSuggestionsComputationInput,
} from '@/utils/searchSuggestionsComputation';
import {
  buildShortcutSearchIndex,
  prepareShortcutSearchIndex,
  type IndexedShortcutSuggestion,
} from '@/utils/searchSuggestionSources';
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';
import { readRecentShortcutAdditionsMap } from '@/utils/recentShortcutAdditions';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  queryModel: SearchSessionModel;
  filteredHistoryItems: SearchHistoryEntry[];
  shortcuts: Shortcut[];
  commandSuggestionItems: SearchSuggestionItem[];
  settingSuggestionItems: SearchSuggestionItem[];
  shortcutSuggestionsActive: boolean;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  searchPersonalizationProfile: SearchPersonalizationProfile;
  historyPermissionGranted: boolean;
  bookmarksPermissionGranted: boolean;
  tabsPermissionGranted: boolean;
  permissionWarmup: SearchSuggestionPermission | null;
  refreshVersion?: number;
};

type SearchSuggestionsWorkerResponse =
  | {
      id: number;
      actions: SearchAction[];
    }
  | {
      id: number;
      error: string;
    };

export type SearchSuggestionsResult = {
  actions: SearchAction[];
  sourceStatus: SearchSuggestionSourceStatus;
};

function createSearchSuggestionsWorker() {
  return new Worker(
    new URL('../workers/searchSuggestions.worker.ts', import.meta.url),
    { type: 'module' },
  );
}

export function useSearchSuggestions({
  searchValue,
  queryModel,
  filteredHistoryItems,
  shortcuts,
  commandSuggestionItems,
  settingSuggestionItems,
  shortcutSuggestionsActive,
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  searchPersonalizationProfile,
  historyPermissionGranted,
  bookmarksPermissionGranted,
  tabsPermissionGranted,
  permissionWarmup,
  refreshVersion = 0,
}: UseSearchSuggestionsOptions): SearchSuggestionsResult {
  const {
    suggestionDisplayMode,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    recentClosedSuggestionItems,
    browserHistorySuggestionItems,
    remoteSuggestionItems,
    sourceStatus,
  } = useSearchSuggestionSources({
    searchValue,
    queryModel,
    historyPermissionGranted,
    bookmarksPermissionGranted,
    tabsPermissionGranted,
    permissionWarmup,
    refreshVersion,
  });
  const [shortcutSearchIndex, setShortcutSearchIndex] = useState<IndexedShortcutSuggestion[]>([]);
  const indexedShortcutsSourceRef = useRef<{
    shortcuts: Shortcut[] | null;
    recentShortcutAdditionsSignature: string;
  }>({
    shortcuts: null,
    recentShortcutAdditionsSignature: '',
  });
  const recentShortcutAdditionsMap = readRecentShortcutAdditionsMap();
  const recentShortcutAdditionsSignature = useMemo(
    () => JSON.stringify(recentShortcutAdditionsMap),
    [recentShortcutAdditionsMap],
  );

  useEffect(() => {
    if (!shortcutSuggestionsActive) return;
    if (
      indexedShortcutsSourceRef.current.shortcuts === shortcuts
      && indexedShortcutsSourceRef.current.recentShortcutAdditionsSignature === recentShortcutAdditionsSignature
    ) {
      return;
    }

    let canceled = false;
    indexedShortcutsSourceRef.current = {
      shortcuts,
      recentShortcutAdditionsSignature,
    };
    setShortcutSearchIndex(buildShortcutSearchIndex(shortcuts, recentShortcutAdditionsMap));

    const cancelDeferredPreparation = scheduleAfterInteractivePaint(() => {
      void prepareShortcutSearchIndex(shortcuts, recentShortcutAdditionsMap).then((nextShortcutSearchIndex) => {
        if (!canceled) {
          setShortcutSearchIndex(nextShortcutSearchIndex);
        }
      });
    }, {
      delayMs: 96,
      idleTimeoutMs: 240,
    });

    return () => {
      canceled = true;
      cancelDeferredPreparation();
    };
  }, [recentShortcutAdditionsMap, recentShortcutAdditionsSignature, shortcutSuggestionsActive, shortcuts]);

  const computationInput = useMemo<SearchSuggestionsComputationInput>(() => ({
    suggestionDisplayMode,
    searchValue,
    filteredHistoryItems,
    shortcutSearchIndex,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    commandSuggestionItems,
    settingSuggestionItems,
    recentClosedSuggestionItems,
    browserHistorySuggestionItems,
    remoteSuggestionItems,
  }), [
    bookmarkSuggestionItems,
    browserHistorySuggestionItems,
    filteredHistoryItems,
    remoteSuggestionItems,
    recentClosedSuggestionItems,
    searchSiteShortcutEnabled,
    searchValue,
    shortcutSearchIndex,
    suggestionDisplayMode,
    suggestionUsageMap,
    tabSuggestionItems,
    commandSuggestionItems,
    settingSuggestionItems,
  ]);

  const personalizationQueryModel = useMemo(() => createMixedSearchQueryModel({
    searchValue,
    displayMode: suggestionDisplayMode,
  }), [searchValue, suggestionDisplayMode]);

  const [baseActions, setBaseActions] = useState<SearchAction[]>(
    () => computeSearchSuggestionActions(computationInput),
  );
  const workerRef = useRef<Worker | null>(null);
  const workerDisabledRef = useRef(typeof Worker === 'undefined');
  const latestRequestIdRef = useRef(0);
  const latestInputRef = useRef<SearchSuggestionsComputationInput | null>(null);

  useEffect(() => {
    latestInputRef.current = computationInput;
  }, [computationInput]);

  const applyActions = (nextActions: SearchAction[]) => {
    startTransition(() => {
      setBaseActions(nextActions);
    });
  };

  const actions = useMemo(() => rerankPersonalizedSearchActions({
    actions: baseActions,
    queryModel: personalizationQueryModel,
    profile: searchPersonalizationProfile,
  }), [baseActions, personalizationQueryModel, searchPersonalizationProfile]);

  useEffect(() => {
    if (workerDisabledRef.current) {
      applyActions(computeSearchSuggestionActions(computationInput));
      return;
    }

    if (!workerRef.current) {
      try {
        const worker = createSearchSuggestionsWorker();
        worker.onmessage = (event: MessageEvent<SearchSuggestionsWorkerResponse>) => {
          const data = event.data;
          if (!data || typeof data !== 'object') return;
          if (data.id !== latestRequestIdRef.current) return;

          if ('error' in data) {
            workerDisabledRef.current = true;
            workerRef.current?.terminate();
            workerRef.current = null;
            if (latestInputRef.current) {
              applyActions(computeSearchSuggestionActions(latestInputRef.current));
            }
            return;
          }

          applyActions(data.actions);
        };
        worker.onerror = () => {
          workerDisabledRef.current = true;
          workerRef.current?.terminate();
          workerRef.current = null;
          if (latestInputRef.current) {
            applyActions(computeSearchSuggestionActions(latestInputRef.current));
          }
        };
        workerRef.current = worker;
      } catch {
        workerDisabledRef.current = true;
        applyActions(computeSearchSuggestionActions(computationInput));
        return;
      }
    }

    latestRequestIdRef.current += 1;
    try {
      workerRef.current?.postMessage({
        id: latestRequestIdRef.current,
        input: computationInput,
      });
    } catch {
      workerDisabledRef.current = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      applyActions(computeSearchSuggestionActions(computationInput));
    }
  }, [computationInput]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return useMemo(() => ({
    actions,
    sourceStatus,
  }), [actions, sourceStatus]);
}
