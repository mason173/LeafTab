import {
  computeSearchSuggestionActions,
  type SearchSuggestionsComputationInput,
} from '@/utils/searchSuggestionsComputation';
import type { SearchAction } from '@/utils/searchActions';

type SearchSuggestionsWorkerRequest = {
  id: number;
  input: SearchSuggestionsComputationInput;
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

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<SearchSuggestionsWorkerRequest>) => {
  const { id, input } = event.data;

  try {
    const actions = computeSearchSuggestionActions(input);
    const response: SearchSuggestionsWorkerResponse = { id, actions };
    workerScope.postMessage(response);
  } catch (error) {
    const response: SearchSuggestionsWorkerResponse = {
      id,
      error: String((error as Error)?.message || error || 'search-suggestions-worker-failed'),
    };
    workerScope.postMessage(response);
  }
};
