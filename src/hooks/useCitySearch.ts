import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WeatherCitySuggestion } from "@/data/weatherCityIndex";

type FetchCitySuggestions = (
  query: string,
  language: string,
  count: number,
) => Promise<WeatherCitySuggestion[]>;

interface UseCitySearchOptions {
  open: boolean;
  initialQuery?: string;
  language: string;
  fetchSuggestions: FetchCitySuggestions;
  minQueryLength?: number;
  maxSuggestions?: number;
  debounceMs?: number;
}

interface UseCitySearchResult {
  query: string;
  suggestions: WeatherCitySuggestion[];
  selectedCity: WeatherCitySuggestion | null;
  selectedCityId: string | null;
  isSearching: boolean;
  setQuery: (value: string) => void;
  selectSuggestion: (item: WeatherCitySuggestion) => void;
}

export function useCitySearch({
  open,
  initialQuery = "",
  language,
  fetchSuggestions,
  minQueryLength = 2,
  maxSuggestions = 10,
  debounceMs = 250,
}: UseCitySearchOptions): UseCitySearchResult {
  const [query, setQueryState] = useState("");
  const [suggestions, setSuggestions] = useState<WeatherCitySuggestion[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const selectedCityRef = useRef<WeatherCitySuggestion | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setQueryState(initialQuery);
      setSuggestions([]);
      setSelectedCityId(null);
      selectedCityRef.current = null;
      setIsSearching(false);
    }
    if (!open && wasOpenRef.current) {
      setIsSearching(false);
    }
    wasOpenRef.current = open;
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const keyword = query.trim();
    const selected = selectedCityRef.current;
    if (
      selected &&
      keyword &&
      keyword.toLowerCase() === selected.displayName.toLowerCase()
    ) {
      setSuggestions([selected]);
      setSelectedCityId(selected.id);
      setIsSearching(false);
      return;
    }

    if (keyword.length < minQueryLength) {
      setSuggestions([]);
      setSelectedCityId(null);
      selectedCityRef.current = null;
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const list = await fetchSuggestions(keyword, language, maxSuggestions);
        if (cancelled) return;
        setSuggestions(list);
        setSelectedCityId((prev) => {
          if (prev && list.some((item) => item.id === prev)) return prev;
          selectedCityRef.current = null;
          return null;
        });
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setSelectedCityId(null);
          selectedCityRef.current = null;
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, language, fetchSuggestions, maxSuggestions, minQueryLength, debounceMs]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setSelectedCityId(null);
    selectedCityRef.current = null;
  }, []);

  const selectSuggestion = useCallback((item: WeatherCitySuggestion) => {
    selectedCityRef.current = item;
    setSelectedCityId(item.id);
    setSuggestions([item]);
    setQueryState(item.displayName);
  }, []);

  const selectedCity = useMemo(
    () => suggestions.find((item) => item.id === selectedCityId) || null,
    [suggestions, selectedCityId],
  );

  return {
    query,
    suggestions,
    selectedCity,
    selectedCityId,
    isSearching,
    setQuery,
    selectSuggestion,
  };
}
