import type { SearchEngine } from '@/types';
import { isUrl } from '@/utils';
import { getCalculatorPreview, type CalculatorPreview } from '@/utils/calculator';
import { type ParsedSearchCommand, parseSearchCommand } from '@/utils/searchCommands';
import { normalizeSearchQuery, parseSearchEnginePrefix } from '@/utils/searchHelpers';
import { buildSiteSearchQuery, parseSiteSearchShortcut } from '@/utils/siteSearch';

type SearchEngineOverride = Exclude<SearchEngine, 'system'>;

export type SearchSessionMode = 'default' | 'bookmarks' | 'history' | 'tabs';

type SearchSessionModelOptions = {
  prefixEnabled?: boolean;
  siteDirectEnabled?: boolean;
  calculatorEnabled?: boolean;
  defaultEngine?: SearchEngine;
};

export type SearchSessionSubmission = {
  query: string;
  queryForSearch: string;
  historyEntryValue: string;
  siteDomain: string | null;
  siteSearchUrl: string | null;
  effectiveEngine: SearchEngine | SearchEngineOverride | null;
  overrideEngine: SearchEngineOverride | null;
};

export type SearchSessionModel = {
  rawValue: string;
  trimmedValue: string;
  mode: SearchSessionMode;
  normalizedQuery: string;
  command: ParsedSearchCommand & {
    isExactToken: boolean;
  };
  commandQuery: string;
  activeQuery: string;
  enginePrefix: {
    active: boolean;
    overrideEngine: SearchEngineOverride | null;
    query: string;
  };
  siteSearch: {
    active: boolean;
    query: string;
    siteDomain: string | null;
    siteSearchUrl: string | null;
    siteLabel: string | null;
    historyQuery: string;
  };
  calculatorPreview: CalculatorPreview | null;
  submission: SearchSessionSubmission;
};

function resolveSearchSessionMode(commandId: ParsedSearchCommand['id']): SearchSessionMode {
  if (commandId === 'bookmarks') return 'bookmarks';
  if (commandId === 'history') return 'history';
  if (commandId === 'tabs') return 'tabs';
  return 'default';
}

export function shouldAutoOpenSearchSuggestions(
  session: Pick<SearchSessionModel, 'mode' | 'enginePrefix' | 'submission'>,
): boolean {
  if (session.mode !== 'default') return true;
  if (session.enginePrefix.active) return false;
  if (isUrl(session.submission.queryForSearch)) return false;
  return true;
}

export function createSearchSessionModel(
  rawValue: string,
  options?: SearchSessionModelOptions,
): SearchSessionModel {
  const trimmedValue = rawValue.trim();
  const trimmedStartValue = rawValue.trimStart();
  const parsedCommand = parseSearchCommand(rawValue);
  const mode = resolveSearchSessionMode(parsedCommand.id);
  const commandQuery = parsedCommand.active ? parsedCommand.query : trimmedValue;

  const command = {
    ...parsedCommand,
    isExactToken: Boolean(parsedCommand.active && trimmedValue.toLowerCase() === parsedCommand.token?.toLowerCase()),
  };

  const prefixEnabled = options?.prefixEnabled ?? true;
  const siteDirectEnabled = options?.siteDirectEnabled ?? true;
  const calculatorEnabled = options?.calculatorEnabled ?? true;
  const defaultEngine = options?.defaultEngine ?? null;

  const prefixedResult = mode === 'default' && prefixEnabled
    ? parseSearchEnginePrefix(parsedCommand.active ? parsedCommand.query : trimmedStartValue)
    : { query: commandQuery, overrideEngine: null as SearchEngineOverride | null };
  const enginePrefix = {
    active: Boolean(mode === 'default' && prefixEnabled && prefixedResult.overrideEngine),
    overrideEngine: prefixedResult.overrideEngine,
    query: prefixedResult.query,
  };

  const siteResult = mode === 'default' && siteDirectEnabled
    ? parseSiteSearchShortcut(prefixedResult.query)
    : {
      query: commandQuery.trim(),
      siteDomain: null,
      siteSearchUrl: null,
      siteLabel: null,
      historyQuery: commandQuery.trim(),
    };
  const siteSearch = {
    active: Boolean(mode === 'default' && siteResult.query && (siteResult.siteSearchUrl || siteResult.siteDomain)),
    query: siteResult.query,
    siteDomain: siteResult.siteDomain,
    siteSearchUrl: siteResult.siteSearchUrl,
    siteLabel: siteResult.siteLabel,
    historyQuery: siteResult.historyQuery,
  };

  const activeQuery = mode === 'default'
    ? siteSearch.query
    : commandQuery.trim();
  const normalizedQuery = normalizeSearchQuery(activeQuery);

  const queryForSearch = mode === 'default' && siteSearch.query
    ? (siteSearch.siteSearchUrl || (siteSearch.siteDomain
      ? buildSiteSearchQuery(siteSearch.siteDomain, siteSearch.query)
      : siteSearch.query))
    : activeQuery;
  const historyEntryValue = mode === 'default' && siteSearch.siteDomain
    ? siteSearch.historyQuery
    : activeQuery;
  const effectiveEngine = mode === 'default'
    ? (defaultEngine
      ? (prefixEnabled ? (enginePrefix.overrideEngine ?? defaultEngine) : defaultEngine)
      : (prefixEnabled ? enginePrefix.overrideEngine : null))
    : null;

  return {
    rawValue,
    trimmedValue,
    mode,
    normalizedQuery,
    command,
    commandQuery,
    activeQuery,
    enginePrefix,
    siteSearch,
    calculatorPreview: mode === 'default' && calculatorEnabled
      ? getCalculatorPreview(trimmedValue)
      : null,
    submission: {
      query: activeQuery,
      queryForSearch,
      historyEntryValue,
      siteDomain: siteSearch.siteDomain,
      siteSearchUrl: siteSearch.siteSearchUrl,
      effectiveEngine,
      overrideEngine: enginePrefix.overrideEngine,
    },
  };
}
