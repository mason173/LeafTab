import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui/sonner";
import type { WeatherCitySuggestion } from "@/data/weatherCityIndex";
import { useDocumentVisibility } from "@/hooks/useDocumentVisibility";
import { SYNCABLE_PREFERENCES_APPLIED_EVENT } from "@/utils/syncablePreferences";

export type { WeatherCitySuggestion } from "@/data/weatherCityIndex";

type WeatherCityIndexModule = typeof import("@/data/weatherCityIndex");

let weatherCityIndexPromise: Promise<WeatherCityIndexModule> | null = null;

const loadWeatherCityIndex = (): Promise<WeatherCityIndexModule> => {
  if (!weatherCityIndexPromise) {
    weatherCityIndexPromise = import("@/data/weatherCityIndex");
  }
  return weatherCityIndexPromise;
};

type WeatherData = {
  city: string;
  weatherCode: number;
  temperature: number;
};

type UseWeatherLocationOptions = {
  onWeatherUpdate?: (code: number) => void;
};

type WeatherCache = WeatherData & {
  updatedAt: number;
  locationKey: string;
};

type ManualLocation = {
  city: string;
  latitude?: number;
  longitude?: number;
  updatedAt: number;
};

type WttrResponse = {
  current_condition?: Array<{
    weatherCode?: string;
    temp_C?: string;
    temp_F?: string;
  }>;
  nearest_area?: Array<{
    areaName?: Array<{ value?: string }>;
    region?: Array<{ value?: string }>;
  }>;
};

const CACHE_KEY = "weather_cache_v5";
const MANUAL_LOCATION_KEY = "weather_manual_location_v3";

const CACHE_TTL_MS = 30 * 60 * 1000;

const DEFAULT_WEATHER: WeatherData = {
  city: "",
  weatherCode: 2,
  temperature: 20,
};

const WTTR_BASE_URL = "https://wttr.in";

const normalizeCityKey = (city: string) => city.trim().toLowerCase();
const hasValidCoords = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) && Number.isFinite(longitude);

const buildWeatherQueryFallbacks = (city: string): string[] => {
  const raw = city.trim();
  if (!raw) return [];

  const fallbacks = new Set<string>([raw]);
  const cityLevelMatch = raw.match(/^(.+?市)/);
  if (cityLevelMatch?.[1]) {
    fallbacks.add(cityLevelMatch[1]);
  }
  const regionLevelMatch = raw.match(/^(.+?(?:地区|自治州|盟))/);
  if (regionLevelMatch?.[1]) {
    fallbacks.add(regionLevelMatch[1]);
  }

  return Array.from(fallbacks).filter(Boolean);
};

const fetchJsonWithTimeout = async <T = any>(url: string, timeoutMs = 9000): Promise<T> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    if (!resp.ok) throw new Error(`http-${resp.status}`);
    return (await resp.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
};

const normalizeWttrLanguage = (language: string): string => {
  const lang = String(language || "").trim().toLowerCase();
  if (!lang) return "en";
  if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk")) return "zh-tw";
  if (lang.startsWith("zh")) return "zh-cn";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("vi")) return "vi";
  if (lang.startsWith("en")) return "en";
  return "en";
};

const extractNearestCityName = (payload: WttrResponse): string => {
  const nearest = payload.nearest_area?.[0];
  const area = nearest?.areaName?.[0]?.value?.trim() || "";
  const region = nearest?.region?.[0]?.value?.trim() || "";
  if (area) return area;
  if (region) return region;
  return "";
};

const mapWttrWeatherCodeToOpenMeteo = (code: number): number => {
  switch (code) {
    case 113:
      return 0;
    case 116:
    case 119:
      return 2;
    case 122:
      return 3;
    case 143:
    case 248:
      return 45;
    case 260:
      return 48;
    case 176:
    case 263:
    case 266:
      return 51;
    case 281:
    case 284:
      return 56;
    case 293:
    case 296:
    case 353:
      return 61;
    case 299:
    case 302:
    case 356:
      return 63;
    case 305:
    case 308:
    case 359:
      return 65;
    case 311:
      return 66;
    case 314:
    case 317:
    case 320:
    case 362:
    case 365:
      return 67;
    case 179:
    case 227:
    case 323:
    case 326:
    case 368:
      return 71;
    case 329:
    case 332:
    case 371:
      return 73;
    case 230:
    case 335:
    case 338:
      return 75;
    case 350:
    case 374:
    case 377:
      return 77;
    case 182:
    case 185:
      return 66;
    case 200:
    case 386:
    case 389:
      return 95;
    case 392:
      return 96;
    case 395:
      return 99;
    default:
      return 2;
  }
};

const buildWttrUrl = ({
  city,
  latitude,
  longitude,
  language,
}: {
  city: string;
  latitude?: number;
  longitude?: number;
  language: string;
}) => {
  const path = hasValidCoords(Number(latitude), Number(longitude))
    ? `/${Number(latitude)},${Number(longitude)}`
    : `/${encodeURIComponent(city.trim())}`;

  const params = new URLSearchParams({
    format: "j1",
    lang: normalizeWttrLanguage(language),
  });

  return `${WTTR_BASE_URL}${path}?${params.toString()}`;
};

const fetchWeatherFromWttr = async ({
  city,
  latitude,
  longitude,
  language,
}: {
  city: string;
  latitude?: number;
  longitude?: number;
  language: string;
}): Promise<WeatherData> => {
  const cityFallbacks = hasValidCoords(Number(latitude), Number(longitude))
    ? [city]
    : buildWeatherQueryFallbacks(city);

  let lastError: unknown = null;

  for (const candidateCity of cityFallbacks) {
    try {
      const url = buildWttrUrl({ city: candidateCity, latitude, longitude, language });
      const data = await fetchJsonWithTimeout<WttrResponse>(url, 10000);
      if (!data || typeof data !== "object") {
        throw new Error("weather-response-invalid");
      }

      const current = data.current_condition?.[0];
      const wttrWeatherCode = Number(current?.weatherCode);
      const temperature = Number(current?.temp_C ?? current?.temp_F);

      if (!Number.isFinite(temperature)) {
        throw new Error("weather-temp-missing");
      }

      const weatherCode = Number.isFinite(wttrWeatherCode)
        ? mapWttrWeatherCodeToOpenMeteo(wttrWeatherCode)
        : DEFAULT_WEATHER.weatherCode;

      return {
        city: city.trim() || extractNearestCityName(data),
        weatherCode,
        temperature,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("weather-fetch-failed");
};

const readManualLocation = (): ManualLocation | null => {
  try {
    const raw = localStorage.getItem(MANUAL_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManualLocation;
    if (!parsed || typeof parsed.city !== "string" || !parsed.city.trim() || !Number.isFinite(parsed.updatedAt)) {
      return null;
    }

    const latitude = Number(parsed.latitude);
    const longitude = Number(parsed.longitude);

    return {
      city: parsed.city.trim(),
      updatedAt: Number(parsed.updatedAt),
      ...(hasValidCoords(latitude, longitude) ? { latitude, longitude } : {}),
    };
  } catch {
    return null;
  }
};

const writeManualLocation = (payload: ManualLocation) => {
  try {
    localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(payload));
  } catch {}
};

const readCache = (locationKey: string): WeatherCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCache;
    if (
      !parsed ||
      !Number.isFinite(parsed.updatedAt) ||
      !Number.isFinite(parsed.weatherCode) ||
      !Number.isFinite(parsed.temperature) ||
      typeof parsed.city !== "string" ||
      parsed.locationKey !== locationKey
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const readAnyCache = (): WeatherCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCache;
    if (
      !parsed ||
      !Number.isFinite(parsed.updatedAt) ||
      !Number.isFinite(parsed.weatherCode) ||
      !Number.isFinite(parsed.temperature) ||
      typeof parsed.city !== "string" ||
      typeof parsed.locationKey !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (payload: WeatherData, locationKey: string) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, locationKey, updatedAt: Date.now() }));
  } catch {}
};

export const fetchWeatherCitySuggestions = async (
  query: string,
  _language: string,
  count = 8,
): Promise<WeatherCitySuggestion[]> => {
  const { searchWeatherCitiesLocal } = await loadWeatherCityIndex();
  return searchWeatherCitiesLocal(query, Math.max(1, count));
};

export const preloadWeatherCitySuggestions = async (): Promise<void> => {
  const { preloadWeatherCityIndex } = await loadWeatherCityIndex();
  await preloadWeatherCityIndex();
};

export function useWeatherLocation({ onWeatherUpdate }: UseWeatherLocationOptions = {}) {
  const { t, i18n } = useTranslation();
  const isDocumentVisible = useDocumentVisibility();
  const [weatherData, setWeatherData] = useState<WeatherData>({
    ...DEFAULT_WEATHER,
    city: t("weather.unknownLocation"),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualCityName, setManualCityName] = useState<string | null>(() => readManualLocation()?.city || null);

  const inflightRefreshRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);
  const initialRefreshDoneRef = useRef(false);

  const applyWeather = useCallback(
    (payload: WeatherData) => {
      setWeatherData(payload);
      onWeatherUpdate?.(payload.weatherCode);
    },
    [onWeatherUpdate],
  );

  const runRefresh = useCallback(
    async ({ force }: { force: boolean }): Promise<void> => {
      const manualLocation = readManualLocation();
      setManualCityName(manualLocation?.city || null);

      if (!manualLocation) {
        applyWeather({ ...DEFAULT_WEATHER, city: t("weather.unknownLocation") });
        return;
      }

      const locationKey = `manual:${normalizeCityKey(manualLocation.city)}`;
      const cached = readCache(locationKey);
      const staleCache = readAnyCache();

      if (!force && cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
        applyWeather({
          city: cached.city || manualLocation.city || t("weather.unknownLocation"),
          weatherCode: cached.weatherCode,
          temperature: cached.temperature,
        });
        return;
      }

      try {
        const weather = await fetchWeatherFromWttr({
          city: manualLocation.city,
          latitude: manualLocation.latitude,
          longitude: manualLocation.longitude,
          language: i18n.language,
        });

        const next = {
          city: weather.city || manualLocation.city || t("weather.local"),
          weatherCode: Number.isFinite(weather.weatherCode) ? weather.weatherCode : DEFAULT_WEATHER.weatherCode,
          temperature: Number.isFinite(weather.temperature) ? weather.temperature : DEFAULT_WEATHER.temperature,
        };

        applyWeather(next);
        writeCache(next, locationKey);
      } catch (error) {
        console.warn("[weather] refresh failed", error);

        if (cached) {
          applyWeather({
            city: cached.city || manualLocation.city || t("weather.unknownLocation"),
            weatherCode: cached.weatherCode,
            temperature: cached.temperature,
          });
          return;
        }

        if (staleCache) {
          applyWeather({
            city: staleCache.city || t("weather.unknownLocation"),
            weatherCode: staleCache.weatherCode,
            temperature: staleCache.temperature,
          });
          return;
        }

        if (force) {
          toast.error(`${t("weather.refreshing")} (Network Error)`);
        }

        applyWeather({ ...DEFAULT_WEATHER, city: manualLocation.city || t("weather.unknownLocation") });
      }
    },
    [applyWeather, i18n.language, t],
  );

  const refresh = useCallback(
    async (force = false) => {
      if (inflightRefreshRef.current) {
        return inflightRefreshRef.current;
      }

      const task = (async () => {
        setIsRefreshing(true);
        try {
          await runRefresh({ force });
          lastRefreshAtRef.current = Date.now();
        } finally {
          setIsRefreshing(false);
        }
      })();

      inflightRefreshRef.current = task;
      try {
        await task;
      } finally {
        if (inflightRefreshRef.current === task) {
          inflightRefreshRef.current = null;
        }
      }
    },
    [runRefresh],
  );

  const setManualLocation = useCallback((payload: { city: string; latitude?: number; longitude?: number }) => {
    const city = payload.city.trim();
    if (!city) return false;

    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);

    const next: ManualLocation = {
      city,
      updatedAt: Date.now(),
      ...(hasValidCoords(latitude, longitude) ? { latitude, longitude } : {}),
    };

    writeManualLocation(next);
    setManualCityName(city);
    return true;
  }, []);

  useEffect(() => {
    if (!isDocumentVisible || initialRefreshDoneRef.current) return;
    initialRefreshDoneRef.current = true;
    void refresh(false);
  }, [isDocumentVisible, refresh]);

  useEffect(() => {
    const handlePreferencesApplied = () => {
      const manualLocation = readManualLocation();
      setManualCityName(manualLocation?.city || null);
      void refresh(true);
    };
    window.addEventListener(SYNCABLE_PREFERENCES_APPLIED_EVENT, handlePreferencesApplied);
    return () => window.removeEventListener(SYNCABLE_PREFERENCES_APPLIED_EVENT, handlePreferencesApplied);
  }, [refresh]);

  return {
    weatherData,
    isRefreshing,
    manualCityName,
    refresh,
    setManualLocation,
  };
}
