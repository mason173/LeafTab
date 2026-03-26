import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { Shortcut } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import type { SearchAction } from '@/utils/searchActions';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import {
  useSearchSuggestionSources,
  type SearchSuggestionSourceStatus,
} from '@/hooks/useSearchSuggestionSources';
import type { SearchSessionModel } from '@/utils/searchSessionModel';
import type { SearchCommandPermission } from '@/utils/searchCommands';
import {
  computeSearchSuggestionActions,
  type SearchSuggestionsComputationInput,
} from '@/utils/searchSuggestionsComputation';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  queryModel: SearchSessionModel;
  filteredHistoryItems: SearchHistoryEntry[];
  shortcuts: Shortcut[];
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
  bookmarksPermissionGranted: boolean;
  tabsPermissionGranted: boolean;
  permissionWarmup: SearchCommandPermission | null;
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
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  historyPermissionGranted,
  bookmarksPermissionGranted,
  tabsPermissionGranted,
  permissionWarmup,
}: UseSearchSuggestionsOptions): SearchSuggestionsResult {
  const {
    suggestionDisplayMode,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
    sourceStatus,
  } = useSearchSuggestionSources({
    searchValue,
    queryModel,
    historyPermissionGranted,
    bookmarksPermissionGranted,
    tabsPermissionGranted,
    permissionWarmup,
  });

  const computationInput = useMemo<SearchSuggestionsComputationInput>(() => ({
    suggestionDisplayMode,
    searchValue,
    filteredHistoryItems,
    shortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
  }), [
    bookmarkSuggestionItems,
    browserHistorySuggestionItems,
    filteredHistoryItems,
    searchSiteShortcutEnabled,
    searchValue,
    shortcuts,
    suggestionDisplayMode,
    suggestionUsageMap,
    tabSuggestionItems,
  ]);

  const [actions, setActions] = useState<SearchAction[]>(
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
      setActions(nextActions);
    });
  };

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
