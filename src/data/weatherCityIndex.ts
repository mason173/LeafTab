import cities from "china-division/dist/cities.json";
import provinces from "china-division/dist/provinces.json";
import { GLOBAL_MAJOR_CITIES } from "@/data/weatherGlobalMajorCities";

export type WeatherCitySuggestion = {
  id: string;
  city: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
  displayName: string;
};

type DivisionProvince = {
  code: string;
  name: string;
};

type DivisionCity = {
  code: string;
  name: string;
  provinceCode: string;
};

type DivisionArea = {
  code: string;
  name: string;
  cityCode: string;
  provinceCode: string;
};

type EntryLevel = "province" | "city" | "area" | "global";

type IndexedEntry = WeatherCitySuggestion & {
  level: EntryLevel;
  aliasKeys: string[];
};

const COUNTRY_NAME = "China";

const punctuationRE = /[\s'`~!@#$%^&*()_+\-=[\]{};:\\|,.<>/?，。！？、；：“”‘’（）【】《》·]+/g;
const suffixRE = /(特别行政区|自治区|自治州|自治县|地区|盟|省|市|区|县)$/g;

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(punctuationRE, "")
    .replace(suffixRE, "");

const normalizeCityName = (cityName: string, provinceName: string) => {
  if (!cityName.trim()) return provinceName;

  const genericNames = new Set(["市辖区", "县", "自治区直辖县级行政区划", "省直辖县级行政区划"]);
  if (genericNames.has(cityName)) return provinceName;

  return cityName;
};

const buildAliasKeys = (parts: string[]) => {
  const variants = new Set<string>();

  parts.forEach((part) => {
    const raw = part.trim();
    if (!raw) return;

    variants.add(raw);
    variants.add(raw.replace(/[\s\-_/]+/g, ""));

    const normalized = normalize(raw);
    if (normalized) variants.add(normalized);
  });

  return Array.from(variants)
    .map((item) => normalize(item))
    .filter(Boolean);
};

const PROVINCE_LIST = provinces as DivisionProvince[];
const CITY_LIST = cities as DivisionCity[];
const provinceMap = new Map(PROVINCE_LIST.map((item) => [item.code, item.name]));
const cityMap = new Map(CITY_LIST.map((item) => [item.code, item]));

const indexedEntries: IndexedEntry[] = [];

for (const province of PROVINCE_LIST) {
  const city = province.name;
  indexedEntries.push({
    id: `cn-province-${province.code}`,
    city,
    region: province.name,
    country: COUNTRY_NAME,
    displayName: province.name,
    level: "province",
    aliasKeys: buildAliasKeys([province.name]),
  });
}

for (const city of CITY_LIST) {
  const provinceName = provinceMap.get(city.provinceCode);
  if (!provinceName) continue;

  const normalizedCity = normalizeCityName(city.name, provinceName);

  indexedEntries.push({
    id: `cn-city-${city.code}`,
    city: normalizedCity,
    region: provinceName,
    country: COUNTRY_NAME,
    displayName: provinceName === normalizedCity ? provinceName : `${provinceName} · ${normalizedCity}`,
    level: "city",
    aliasKeys: buildAliasKeys([
      normalizedCity,
      city.name,
      `${provinceName}${normalizedCity}`,
      `${provinceName} ${normalizedCity}`,
      provinceName,
    ]),
  });
}

for (const city of GLOBAL_MAJOR_CITIES) {
  const region = city.region || city.country;
  const displayName = [city.city, region, city.country].filter(Boolean).join(" · ");
  indexedEntries.push({
    id: city.id,
    city: city.city,
    region,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    displayName,
    level: "global",
    aliasKeys: buildAliasKeys([
      city.city,
      region,
      city.country,
      `${city.city} ${city.country}`,
      `${city.city} ${region}`,
      ...(city.aliases || []),
    ]),
  });
}

const uniqueById = new Map<string, IndexedEntry>();
for (const entry of indexedEntries) {
  if (!uniqueById.has(entry.id)) {
    uniqueById.set(entry.id, entry);
  }
}

const INDEXED = Array.from(uniqueById.values());
let areaIndexedEntriesPromise: Promise<IndexedEntry[]> | null = null;

const scoreLevel = (level: EntryLevel) => {
  if (level === "area") return 3;
  if (level === "city") return 2;
  if (level === "global") return 2;
  return 1;
};

const scoreEntry = (entry: IndexedEntry, queryKeys: string[]) => {
  let best = 0;

  for (const alias of entry.aliasKeys) {
    for (const queryKey of queryKeys) {
      if (!queryKey) continue;

      if (alias === queryKey) {
        best = Math.max(best, 360);
      } else if (alias.startsWith(queryKey)) {
        best = Math.max(best, 240);
      } else if (alias.includes(queryKey)) {
        best = Math.max(best, 140);
      }
    }
  }

  return best;
};

const toSuggestion = (entry: IndexedEntry): WeatherCitySuggestion => ({
  id: entry.id,
  city: entry.city,
  region: entry.region,
  country: entry.country,
  latitude: entry.latitude,
  longitude: entry.longitude,
  displayName: entry.displayName,
});

function getRankedSuggestions(
  entries: readonly IndexedEntry[],
  queryKeys: string[],
  limit: number,
): WeatherCitySuggestion[] {
  const maxResults = Math.max(1, limit);
  const scored = entries.map((entry) => ({
    entry,
    score: scoreEntry(entry, queryKeys),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const levelDiff = scoreLevel(b.entry.level) - scoreLevel(a.entry.level);
      if (levelDiff !== 0) return levelDiff;
      return a.entry.displayName.length - b.entry.displayName.length;
    })
    .slice(0, maxResults);

  return scored.map((item) => toSuggestion(item.entry));
}

async function loadAreaIndexedEntries(): Promise<IndexedEntry[]> {
  if (!areaIndexedEntriesPromise) {
    areaIndexedEntriesPromise = import("china-division/dist/areas.json").then((module) => {
      const areaList = module.default as DivisionArea[];
      const areaEntries: IndexedEntry[] = [];

      for (const area of areaList) {
        const provinceName = provinceMap.get(area.provinceCode);
        const parentCity = cityMap.get(area.cityCode);
        if (!provinceName || !parentCity) continue;

        const normalizedCity = normalizeCityName(parentCity.name, provinceName);
        const queryCity = normalizedCity === provinceName ? `${provinceName}${area.name}` : `${normalizedCity}${area.name}`;
        const displayName =
          normalizedCity === provinceName
            ? `${provinceName} · ${area.name}`
            : `${provinceName} · ${normalizedCity} · ${area.name}`;

        areaEntries.push({
          id: `cn-area-${area.code}`,
          city: queryCity,
          region: provinceName,
          country: COUNTRY_NAME,
          displayName,
          level: "area",
          aliasKeys: buildAliasKeys([
            area.name,
            queryCity,
            `${normalizedCity}${area.name}`,
            `${provinceName}${normalizedCity}${area.name}`,
            `${provinceName}${area.name}`,
            `${normalizedCity} ${area.name}`,
            `${provinceName} ${normalizedCity} ${area.name}`,
            area.code,
          ]),
        });
      }

      return areaEntries;
    });
  }

  return areaIndexedEntriesPromise;
}

export const searchWeatherCitiesLocal = async (query: string, limit = 8): Promise<WeatherCitySuggestion[]> => {
  const raw = query.trim();
  if (!raw) return [];

  const queryKeys = Array.from(
    new Set([
      normalize(raw),
      normalize(raw.replace(/[\s\-_/]+/g, "")),
      normalize(raw.replace(suffixRE, "")),
    ]),
  ).filter(Boolean);

  if (!queryKeys.length) return [];

  const baseMatches = getRankedSuggestions(INDEXED, queryKeys, limit);
  if (baseMatches.length >= Math.max(1, limit)) {
    return baseMatches;
  }

  const areaEntries = await loadAreaIndexedEntries();
  return getRankedSuggestions([...INDEXED, ...areaEntries], queryKeys, limit);
};
