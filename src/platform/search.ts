import type { SearchEngine } from '@/types';
import { getSearchApi } from '@/platform/runtime';

const NON_SYSTEM_SEARCH_ENGINE_ORDER: SearchEngine[] = ['bing', 'google', 'duckduckgo', 'baidu'];

export function canUseSystemSearchEngine(): boolean {
  return typeof getSearchApi()?.query === 'function';
}

export function getAvailableSearchEngineOrder(): SearchEngine[] {
  if (canUseSystemSearchEngine()) {
    return ['system', ...NON_SYSTEM_SEARCH_ENGINE_ORDER];
  }
  return [...NON_SYSTEM_SEARCH_ENGINE_ORDER];
}

export function normalizeSearchEngineForPlatform(engine: SearchEngine): SearchEngine {
  if (engine === 'system' && !canUseSystemSearchEngine()) {
    return NON_SYSTEM_SEARCH_ENGINE_ORDER[0];
  }
  return engine;
}

export function getDefaultSearchEngineForPlatform(): SearchEngine {
  return normalizeSearchEngineForPlatform('system');
}
