import type { SearchEngine } from '@/types';
import { getCalculatorPreview, type CalculatorPreview } from '@/utils/calculator';
import { type ParsedSearchCommand, parseSearchCommand } from '@/utils/searchCommands';
import { parseSearchEnginePrefix } from '@/utils/searchHelpers';
import { buildSiteSearchQuery, parseSiteSearchShortcut } from '@/utils/siteSearch';

type SearchEngineOverride = Exclude<SearchEngine, 'system'>;

type SearchQueryModelOptions = {
  prefixEnabled?: boolean;
  siteDirectEnabled?: boolean;
  calculatorEnabled?: boolean;
  defaultEngine?: SearchEngine;
};

export type SearchQuerySubmission = {
  query: string;
  queryForSearch: string;
  historyEntryValue: string;
  siteDomain: string | null;
  siteSearchUrl: string | null;
  effectiveEngine: SearchEngine | SearchEngineOverride | null;
  overrideEngine: SearchEngineOverride | null;
};

export type SearchQueryModel = {
  rawValue: string;
  trimmedValue: string;
  command: ParsedSearchCommand;
  commandQuery: string;
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
  submission: SearchQuerySubmission;
};

export function createSearchQueryModel(
  rawValue: string,
  options?: SearchQueryModelOptions,
): SearchQueryModel {
  const trimmedValue = rawValue.trim();
  const command = parseSearchCommand(rawValue);
  const commandQuery = command.active ? command.query : trimmedValue;

  const prefixEnabled = options?.prefixEnabled ?? true;
  const siteDirectEnabled = options?.siteDirectEnabled ?? true;
  const calculatorEnabled = options?.calculatorEnabled ?? true;
  const defaultEngine = options?.defaultEngine ?? null;

  const prefixedResult = prefixEnabled
    ? parseSearchEnginePrefix(commandQuery)
    : { query: commandQuery, overrideEngine: null as SearchEngineOverride | null };
  const enginePrefix = {
    active: Boolean(prefixEnabled && prefixedResult.overrideEngine && prefixedResult.query),
    overrideEngine: prefixedResult.overrideEngine,
    query: prefixedResult.query,
  };

  const siteResult = siteDirectEnabled
    ? parseSiteSearchShortcut(prefixedResult.query)
    : {
      query: prefixedResult.query.trim(),
      siteDomain: null,
      siteSearchUrl: null,
      siteLabel: null,
      historyQuery: prefixedResult.query.trim(),
    };
  const siteSearch = {
    active: Boolean(siteResult.query && (siteResult.siteSearchUrl || siteResult.siteDomain)),
    query: siteResult.query,
    siteDomain: siteResult.siteDomain,
    siteSearchUrl: siteResult.siteSearchUrl,
    siteLabel: siteResult.siteLabel,
    historyQuery: siteResult.historyQuery,
  };

  const queryForSearch = siteSearch.query
    ? (siteSearch.siteSearchUrl || (siteSearch.siteDomain
      ? buildSiteSearchQuery(siteSearch.siteDomain, siteSearch.query)
      : siteSearch.query))
    : '';
  const historyEntryValue = siteSearch.siteDomain ? siteSearch.historyQuery : siteSearch.query;
  const effectiveEngine = defaultEngine
    ? (prefixEnabled ? (enginePrefix.overrideEngine ?? defaultEngine) : defaultEngine)
    : (prefixEnabled ? enginePrefix.overrideEngine : null);

  return {
    rawValue,
    trimmedValue,
    command,
    commandQuery,
    enginePrefix,
    siteSearch,
    calculatorPreview: !command.active && calculatorEnabled
      ? getCalculatorPreview(trimmedValue)
      : null,
    submission: {
      query: siteSearch.query,
      queryForSearch,
      historyEntryValue,
      siteDomain: siteSearch.siteDomain,
      siteSearchUrl: siteSearch.siteSearchUrl,
      effectiveEngine,
      overrideEngine: enginePrefix.overrideEngine,
    },
  };
}
