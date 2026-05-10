import { useEffect, useRef, useState } from 'react';
import {
  getBingWallpaperBlob,
  getWallpaper,
  getWallpaperGallery,
  saveBingWallpaperBlob,
  saveWallpaper,
  saveWallpaperGallery,
} from '../db';
import { COLOR_WALLPAPER_PRESETS, DEFAULT_COLOR_WALLPAPER_ID } from '@/components/wallpaper/colorWallpapers';
import {
  DEFAULT_DYNAMIC_WALLPAPER_ID,
  DYNAMIC_WALLPAPER_OPTIONS,
  isDynamicWallpaperId,
  type DynamicWallpaperId,
} from '@/components/wallpaper/dynamicWallpapers';
import type { WallpaperMode } from '@/wallpaper/types';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import {
  DEFAULT_WALLPAPER_ROTATION_OFFSETS,
  DEFAULT_WALLPAPER_ROTATION_SETTINGS,
  getWallpaperRotationNextDelay,
  getWallpaperRotationSlot,
  normalizeWallpaperRotationIndex,
  normalizeWallpaperRotationOffsets,
  normalizeWallpaperRotationSettings,
  type RotatableWallpaperMode,
  type WallpaperRotationInterval,
  type WallpaperRotationSettings,
} from '@/wallpaper/rotation';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

const DEFAULT_WALLPAPER_MASK_OPACITY = 10;
const BING_CACHE_META_KEY = 'bing_wallpaper_cache_meta_v1';
const BING_REFRESH_DELAY_MINUTES = 20;
const BING_REFRESH_RETRY_MS = 30 * 60 * 1000;
const MANUAL_BING_REFRESH_COOLDOWN_MS = 15_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 9000;
const DYNAMIC_WALLPAPER_ID_KEY = 'dynamicWallpaperId';
const WALLPAPER_ROTATION_SETTINGS_KEY = 'wallpaperRotationSettings';
const WALLPAPER_ROTATION_OFFSETS_KEY = 'wallpaperRotationOffsets';
const WALLPAPER_ROTATION_CPU_MITIGATION_KEY = 'wallpaperRotationCpuMitigationV1';

type BingCacheMeta = {
  slot: string;
  market: string;
  sourceUrl: string;
  imageKey?: string;
  fetchedAt: string;
};

export type BingWallpaperRefreshResult = 'updated' | 'already-latest' | 'throttled' | 'failed';

const toLocalDateSlot = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getCurrentBingSlot = (date = new Date()): string => {
  const shifted = new Date(date.getTime() - BING_REFRESH_DELAY_MINUTES * 60 * 1000);
  return toLocalDateSlot(shifted);
};

const getNextBingRefreshDelay = (date = new Date()): number => {
  const next = new Date(date);
  next.setHours(0, BING_REFRESH_DELAY_MINUTES, 0, 0);
  if (date.getTime() >= next.getTime()) next.setDate(next.getDate() + 1);
  return Math.max(1000, next.getTime() - date.getTime());
};

const readBingCacheMeta = (): BingCacheMeta | null => {
  try {
    const raw = localStorage.getItem(BING_CACHE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BingCacheMeta;
    if (!parsed?.slot || !parsed?.sourceUrl) return null;
    return parsed;
  } catch {
    return null;
  }
};

const isDocumentCurrentlyVisible = () => (
  typeof document === 'undefined' || !document.hidden
);

const writeBingCacheMeta = (meta: BingCacheMeta) => {
  try {
    localStorage.setItem(BING_CACHE_META_KEY, JSON.stringify(meta));
  } catch {}
};

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: 'no-store',
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const uniqueUrls = (urls: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const next = (raw || '').trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
};

const normalizeBingMarket = (value: string | null | undefined): string => {
  const locale = (value || '').trim().toLowerCase().replace('_', '-');
  if (!locale) return '';
  if (locale.startsWith('zh-tw') || locale.startsWith('zh-hk')) return 'zh-TW';
  if (locale.startsWith('zh')) return 'zh-CN';
  if (locale.startsWith('ja')) return 'ja-JP';
  if (locale.startsWith('ko')) return 'ko-KR';
  if (locale.startsWith('en-gb')) return 'en-GB';
  if (locale.startsWith('en-au')) return 'en-AU';
  if (locale.startsWith('en')) return 'en-US';
  return '';
};

const resolveBingMarket = (): string => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZone === 'Asia/Shanghai' || timeZone === 'Asia/Chongqing' || timeZone === 'Asia/Harbin' || timeZone === 'Asia/Urumqi') {
      return 'zh-CN';
    }
    if (timeZone === 'Asia/Hong_Kong' || timeZone === 'Asia/Taipei') {
      return 'zh-TW';
    }
    if (timeZone === 'Asia/Tokyo') {
      return 'ja-JP';
    }
    if (timeZone === 'Asia/Seoul') {
      return 'ko-KR';
    }
  } catch {}

  const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const language of languages) {
    const normalized = normalizeBingMarket(language);
    if (normalized) return normalized;
  }

  return 'en-US';
};

const toAbsoluteUrl = (baseHost: string, maybeRelative: string): string => {
  const value = (maybeRelative || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `https://${baseHost}${value}`;
  return `https://${baseHost}/${value}`;
};

const buildCandidatesFromArchiveImage = (baseHost: string, image: any): {
  candidates: string[];
  imageKey: string;
} => {
  const urlbase = typeof image?.urlbase === 'string' ? image.urlbase.trim() : '';
  const url = typeof image?.url === 'string' ? image.url.trim() : '';
  const candidates: string[] = [];
  if (urlbase) {
    candidates.push(`https://${baseHost}${urlbase}_UHD.jpg`);
    candidates.push(`https://${baseHost}${urlbase}_1920x1080.jpg`);
    candidates.push(`https://${baseHost}${urlbase}_1366x768.jpg`);
  }
  if (url) {
    const absolute = toAbsoluteUrl(baseHost, url);
    if (absolute) candidates.push(absolute);
    if (absolute) {
      candidates.push(absolute.replace('_1920x1080.jpg', '_UHD.jpg'));
      candidates.push(absolute.replace('_UHD.jpg', '_1920x1080.jpg'));
    }
  }
  return {
    candidates: uniqueUrls(candidates),
    imageKey: urlbase || url || '',
  };
};

const fetchCandidatesFromArchiveHost = async (
  baseHost: 'cn.bing.com' | 'www.bing.com',
  market: string,
): Promise<{ candidates: string[]; imageKey: string }> => {
  const resp = await fetchWithTimeout(
    `https://${baseHost}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=${encodeURIComponent(market)}`,
    undefined,
    REQUEST_TIMEOUT_MS,
  );
  if (!resp.ok) throw new Error(`archive-${baseHost}-http-${resp.status}`);
  const data = await resp.json();
  const image = Array.isArray(data?.images) ? data.images[0] : null;
  if (!image) throw new Error(`archive-${baseHost}-missing-image`);
  return buildCandidatesFromArchiveImage(baseHost, image);
};

const fetchCandidatesFromBiturl = async (
  market: string,
): Promise<{ candidates: string[]; imageKey: string }> => {
  const fetchMeta = async (resolution: 'UHD' | '1920'): Promise<{ candidates: string[]; imageKey: string }> => {
    const resp = await fetchWithTimeout(
      `https://bing.biturl.top/?resolution=${resolution}&format=json&index=0&mkt=${encodeURIComponent(market)}`,
      undefined,
      REQUEST_TIMEOUT_MS,
    );
    if (!resp.ok) throw new Error(`biturl-${resolution}-http-${resp.status}`);
    const data = await resp.json();
    const direct = typeof data?.url === 'string' ? data.url : '';
    if (!direct) throw new Error(`biturl-${resolution}-missing-url`);
    const upgraded = direct.replace('_1920x1080.jpg', '_UHD.jpg');
    const downgraded = direct.replace('_UHD.jpg', '_1920x1080.jpg');
    return {
      candidates: uniqueUrls([upgraded, direct, downgraded]),
      imageKey: direct,
    };
  };
  try {
    return await fetchMeta('UHD');
  } catch {
    return fetchMeta('1920');
  }
};

const parseMaskOpacity = (value: string | null): number => {
  if (!value) return DEFAULT_WALLPAPER_MASK_OPACITY;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_WALLPAPER_MASK_OPACITY;
  return Math.max(0, Math.min(100, parsed));
};

const parseBooleanSwitch = (value: string | null, defaultValue: boolean): boolean => {
  if (value == null) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
};

const readStoredJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const getInitialBingWallpaper = (): string => {
  if (typeof window === 'undefined') return '';
  const meta = readBingCacheMeta();
  return (meta?.sourceUrl || '').trim();
};

const getRotatableWallpaperValues = (
  mode: RotatableWallpaperMode,
  customWallpaperGallery: string[],
): string[] => {
  if (mode === 'dynamic') {
    return DYNAMIC_WALLPAPER_OPTIONS.map((option) => option.id);
  }
  if (mode === 'color') {
    return COLOR_WALLPAPER_PRESETS.map((preset) => preset.id);
  }
  return customWallpaperGallery;
};

const disableStoredWallpaperRotationForCpuMitigation = () => {
  try {
    if (localStorage.getItem(WALLPAPER_ROTATION_CPU_MITIGATION_KEY) === 'applied') return;
    localStorage.setItem(WALLPAPER_ROTATION_SETTINGS_KEY, JSON.stringify(DEFAULT_WALLPAPER_ROTATION_SETTINGS));
    localStorage.setItem(WALLPAPER_ROTATION_OFFSETS_KEY, JSON.stringify(DEFAULT_WALLPAPER_ROTATION_OFFSETS));
    localStorage.setItem(WALLPAPER_ROTATION_CPU_MITIGATION_KEY, 'applied');
  } catch {}
};

export function useWallpaper() {
  const firefox = isFirefoxBuildTarget();
  const isDocumentVisible = useDocumentVisibility();
  disableStoredWallpaperRotationForCpuMitigation();
  const initialBingWallpaper = getInitialBingWallpaper();
  const [hasStoredWallpaperMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wallpaperMode');
    return saved === 'bing' || saved === 'weather' || saved === 'color' || saved === 'custom' || saved === 'dynamic';
  });
  const [bingWallpaper, setBingWallpaper] = useState<string>(() => initialBingWallpaper);
  const hasBingWallpaperRef = useRef(Boolean(initialBingWallpaper));
  const ownedBingObjectUrlRef = useRef<string | null>(null);
  const refreshBingWallpaperRef = useRef<((force?: boolean) => Promise<boolean>) | null>(null);
  const manualBingRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const manualBingRefreshAtRef = useRef(0);
  const [isBingWallpaperRefreshing, setIsBingWallpaperRefreshing] = useState(false);
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [customWallpaperGallery, setCustomWallpaperGallery] = useState<string[]>([]);
  const [customWallpaperLoaded, setCustomWallpaperLoaded] = useState(false);
  const [wallpaperMode, setWallpaperMode] = useState<WallpaperMode>(() => {
    const saved = localStorage.getItem('wallpaperMode');
    if (saved === 'bing' || saved === 'dynamic' || saved === 'weather' || saved === 'color' || saved === 'custom') {
      return firefox && saved === 'weather' ? 'bing' : saved;
    }
    return 'dynamic';
  });
  const [weatherCode, setWeatherCode] = useState<number>(2);
  const [wallpaperMaskOpacity, setWallpaperMaskOpacity] = useState<number>(() =>
    parseMaskOpacity(localStorage.getItem('wallpaperMaskOpacity')),
  );
  const [darkModeAutoDimWallpaperEnabled, setDarkModeAutoDimWallpaperEnabled] = useState<boolean>(() =>
    parseBooleanSwitch(localStorage.getItem('darkModeAutoDimWallpaperEnabled'), true),
  );
  const [colorWallpaperId, setColorWallpaperId] = useState<string>(() => {
    const saved = localStorage.getItem('colorWallpaperId');
    if (!saved) return DEFAULT_COLOR_WALLPAPER_ID;
    const exists = COLOR_WALLPAPER_PRESETS.some((preset) => preset.id === saved);
    return exists ? saved : DEFAULT_COLOR_WALLPAPER_ID;
  });
  const [dynamicWallpaperId, setDynamicWallpaperId] = useState<DynamicWallpaperId>(() => {
    const saved = localStorage.getItem(DYNAMIC_WALLPAPER_ID_KEY);
    return isDynamicWallpaperId(saved) ? saved : DEFAULT_DYNAMIC_WALLPAPER_ID;
  });
  const [wallpaperRotationSettings, setWallpaperRotationSettings] = useState<WallpaperRotationSettings>(() =>
    normalizeWallpaperRotationSettings(readStoredJson(WALLPAPER_ROTATION_SETTINGS_KEY)),
  );
  const [wallpaperRotationOffsets, setWallpaperRotationOffsets] = useState(() =>
    normalizeWallpaperRotationOffsets(readStoredJson(WALLPAPER_ROTATION_OFFSETS_KEY)),
  );

  const syncRotationOffsetForMode = (
    mode: RotatableWallpaperMode,
    targetIndex: number,
    totalCount: number,
    intervalOverride?: WallpaperRotationInterval,
  ) => {
    if (totalCount <= 0) return;
    const interval = intervalOverride ?? wallpaperRotationSettings[mode];
    if (interval === 'off') return;
    const slotIndex = normalizeWallpaperRotationIndex(getWallpaperRotationSlot(interval), totalCount);
    const nextOffset = targetIndex - slotIndex;
    setWallpaperRotationOffsets((prev) => {
      if (prev[mode] === nextOffset) return prev;
      return {
        ...prev,
        [mode]: nextOffset,
      };
    });
  };

  const setWallpaperRotationInterval = (mode: RotatableWallpaperMode, interval: WallpaperRotationInterval) => {
    setWallpaperRotationSettings((prev) => {
      if (prev[mode] === interval) return prev;
      return {
        ...prev,
        [mode]: interval,
      };
    });

    if (interval === 'off') return;

    const optionValues = getRotatableWallpaperValues(mode, customWallpaperGallery);
    if (optionValues.length === 0) return;

    const currentValue = mode === 'dynamic'
      ? dynamicWallpaperId
      : mode === 'color'
        ? colorWallpaperId
        : customWallpaper;
    const currentIndex = Math.max(0, optionValues.indexOf(currentValue || optionValues[0]));
    syncRotationOffsetForMode(mode, currentIndex, optionValues.length, interval);
  };
  useEffect(() => {
    const persistedMode = firefox && wallpaperMode === 'weather' ? 'bing' : wallpaperMode;
    if (persistedMode !== wallpaperMode) {
      setWallpaperMode(persistedMode);
      return;
    }
    localStorage.setItem('wallpaperMode', persistedMode);
  }, [firefox, wallpaperMode]);

  useEffect(() => {
    localStorage.setItem('wallpaperMaskOpacity', String(wallpaperMaskOpacity));
  }, [wallpaperMaskOpacity]);

  useEffect(() => {
    localStorage.setItem('darkModeAutoDimWallpaperEnabled', String(darkModeAutoDimWallpaperEnabled));
  }, [darkModeAutoDimWallpaperEnabled]);

  useEffect(() => {
    localStorage.setItem('colorWallpaperId', colorWallpaperId);
  }, [colorWallpaperId]);

  useEffect(() => {
    localStorage.setItem(DYNAMIC_WALLPAPER_ID_KEY, dynamicWallpaperId);
  }, [dynamicWallpaperId]);

  useEffect(() => {
    localStorage.setItem(WALLPAPER_ROTATION_SETTINGS_KEY, JSON.stringify(wallpaperRotationSettings));
  }, [wallpaperRotationSettings]);

  useEffect(() => {
    localStorage.setItem(WALLPAPER_ROTATION_OFFSETS_KEY, JSON.stringify(wallpaperRotationOffsets));
  }, [wallpaperRotationOffsets]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getWallpaper(), getWallpaperGallery()])
      .then(async ([wallpaper, gallery]) => {
        if (cancelled) return;
        const normalizedGallery = Array.isArray(gallery) ? gallery.filter((item) => item.trim().length > 0) : [];
        const effectiveWallpaper = wallpaper || normalizedGallery[0] || null;
        const effectiveGallery = effectiveWallpaper
          ? normalizedGallery.includes(effectiveWallpaper)
            ? normalizedGallery
            : [...normalizedGallery, effectiveWallpaper]
          : normalizedGallery;
        setCustomWallpaper(effectiveWallpaper);
        setCustomWallpaperGallery(effectiveGallery);
        setCustomWallpaperLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCustomWallpaper(null);
        setCustomWallpaperGallery([]);
        setCustomWallpaperLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasStoredWallpaperMode]);

  useEffect(() => {
    let cancelled = false;
    let onceTimer: number | null = null;
    let dailyTimer: number | null = null;
    let retryTimer: number | null = null;
    const revokeOwnedBingObjectUrl = () => {
      if (!ownedBingObjectUrlRef.current) return;
      URL.revokeObjectURL(ownedBingObjectUrlRef.current);
      ownedBingObjectUrlRef.current = null;
    };

    const setBingSource = (source: string, options?: { ownsObjectUrl?: boolean }) => {
      const url = (source || '').trim();
      if (url) {
        if (ownedBingObjectUrlRef.current && ownedBingObjectUrlRef.current !== url) {
          revokeOwnedBingObjectUrl();
        }
        if (options?.ownsObjectUrl) {
          ownedBingObjectUrlRef.current = url;
        }
        hasBingWallpaperRef.current = true;
        setBingWallpaper(url);
        return;
      }
      revokeOwnedBingObjectUrl();
      hasBingWallpaperRef.current = false;
      setBingWallpaper('');
    };
    const clearBingSourceIfMissing = () => {
      if (!hasBingWallpaperRef.current) {
        setBingSource('');
      }
    };
    const clearRetryTimer = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };
    const scheduleRetryRefresh = (delayMs = BING_REFRESH_RETRY_MS) => {
      if (cancelled) return;
      clearRetryTimer();
      retryTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (!isDocumentCurrentlyVisible()) return;
        void refreshBingWallpaper(false);
      }, Math.max(5_000, delayMs));
    };

    const applyBingBlob = async (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob);
      if (!objectUrl) throw new Error('empty-object-url');
      setBingSource(objectUrl, { ownsObjectUrl: true });
    };

    const fetchBingImageSource = async (
      market: string,
    ): Promise<{ blob: Blob | null; sourceUrl: string; imageKey: string }> => {
      const sourceCandidates: string[] = [];
      let imageKey = '';
      try {
        const result = await fetchCandidatesFromArchiveHost('cn.bing.com', market);
        sourceCandidates.push(...result.candidates);
        if (!imageKey && result.imageKey) imageKey = result.imageKey;
      } catch {}
      try {
        const result = await fetchCandidatesFromArchiveHost('www.bing.com', market);
        sourceCandidates.push(...result.candidates);
        if (!imageKey && result.imageKey) imageKey = result.imageKey;
      } catch {}
      try {
        const result = await fetchCandidatesFromBiturl(market);
        sourceCandidates.push(...result.candidates);
        if (!imageKey && result.imageKey) imageKey = result.imageKey;
      } catch {}

      const candidates = uniqueUrls(sourceCandidates);
      if (candidates.length === 0) throw new Error('no-bing-candidates');

      const firstCandidate = candidates[0];
      for (const imageUrl of candidates) {
        try {
          const imageResp = await fetchWithTimeout(imageUrl, undefined, REQUEST_TIMEOUT_MS);
          if (!imageResp.ok) continue;
          const imageBlob = await imageResp.blob();
          if (!(imageBlob instanceof Blob) || imageBlob.size <= 0) continue;
          return { blob: imageBlob, sourceUrl: imageUrl, imageKey: imageKey || imageUrl };
        } catch {
          continue;
        }
      }
      return { blob: null, sourceUrl: firstCandidate, imageKey: imageKey || firstCandidate };
    };

    const refreshBingWallpaper = async (force = false): Promise<boolean> => {
      const market = resolveBingMarket();
      const slot = getCurrentBingSlot(new Date());
      const meta = readBingCacheMeta();
      if (!force && meta?.slot === slot && hasBingWallpaperRef.current) return true;

      try {
        const { blob, sourceUrl, imageKey } = await fetchBingImageSource(market);
        const previousImageKey = (meta?.imageKey || meta?.sourceUrl || '').trim();
        const slotAdvanced = Boolean(meta?.slot && meta.slot !== slot);
        const fetchedStillOldImage = Boolean(slotAdvanced && previousImageKey && imageKey === previousImageKey);

        if (fetchedStillOldImage) {
          scheduleRetryRefresh();
          return false;
        }

        if (blob) {
          await saveBingWallpaperBlob(blob);
        }
        if (!cancelled) {
          clearRetryTimer();
          if (blob) {
            await applyBingBlob(blob);
          } else if (!hasBingWallpaperRef.current) {
            // If binary fetch is blocked by CORS but we have a candidate URL, show it directly.
            setBingSource(sourceUrl);
          }
          writeBingCacheMeta({
            slot,
            market,
            sourceUrl,
            imageKey: imageKey || sourceUrl,
            fetchedAt: new Date().toISOString(),
          });
        }
        return true;
      } catch {
        scheduleRetryRefresh();
        if (!cancelled) clearBingSourceIfMissing();
        return false;
      }
    };

    refreshBingWallpaperRef.current = refreshBingWallpaper;

    (async () => {
      try {
        const cachedBlob = await getBingWallpaperBlob();
        if (cancelled) return;
        if (cachedBlob) {
          try {
            await applyBingBlob(cachedBlob);
          } catch {
            const meta = readBingCacheMeta();
            if (meta?.sourceUrl) setBingSource(meta.sourceUrl);
            else clearBingSourceIfMissing();
          }
        } else {
          const meta = readBingCacheMeta();
          if (meta?.sourceUrl) setBingSource(meta.sourceUrl);
          else clearBingSourceIfMissing();
        }
      } catch {
        if (!cancelled) clearBingSourceIfMissing();
      }

      if (!isDocumentCurrentlyVisible()) return;

      await refreshBingWallpaper(false);

      const delay = getNextBingRefreshDelay(new Date());
      onceTimer = window.setTimeout(() => {
        if (!isDocumentCurrentlyVisible()) return;
        void refreshBingWallpaper(true);
        dailyTimer = window.setInterval(() => {
          if (!isDocumentCurrentlyVisible()) return;
          void refreshBingWallpaper(true);
        }, ONE_DAY_MS);
      }, delay);
    })();

    return () => {
      cancelled = true;
      refreshBingWallpaperRef.current = null;
      if (onceTimer !== null) window.clearTimeout(onceTimer);
      if (dailyTimer !== null) window.clearInterval(dailyTimer);
      clearRetryTimer();
      revokeOwnedBingObjectUrl();
    };
  }, []);

  useEffect(() => {
    if (!isDocumentVisible) return;
    if (wallpaperMode !== 'bing') return;

    const currentSlot = getCurrentBingSlot(new Date());
    const meta = readBingCacheMeta();
    const missingCurrentSource = !hasBingWallpaperRef.current || !bingWallpaper;
    const staleSlot = meta?.slot !== currentSlot;
    if (!missingCurrentSource && !staleSlot) return;

    void refreshBingWallpaperRef.current?.(staleSlot);
  }, [bingWallpaper, isDocumentVisible, wallpaperMode]);

  useEffect(() => {
    if (!isDocumentVisible) return;
    if (wallpaperMode !== 'dynamic' && wallpaperMode !== 'color' && wallpaperMode !== 'custom') {
      return;
    }

    const activeMode = wallpaperMode;
    const interval = wallpaperRotationSettings[activeMode];
    if (interval === 'off') return;

    const optionValues = getRotatableWallpaperValues(activeMode, customWallpaperGallery);
    if (optionValues.length <= 1) return;

    let cancelled = false;
    let timeoutId: number | null = null;

    const applyRotation = () => {
      if (cancelled) return;
      const slot = getWallpaperRotationSlot(interval);
      const targetIndex = normalizeWallpaperRotationIndex(slot + wallpaperRotationOffsets[activeMode], optionValues.length);
      const targetValue = optionValues[targetIndex];
      if (!targetValue) return;

      if (activeMode === 'dynamic') {
        if (dynamicWallpaperId !== targetValue && isDynamicWallpaperId(targetValue)) {
          setDynamicWallpaperId(targetValue);
        }
        return;
      }

      if (activeMode === 'color') {
        if (colorWallpaperId !== targetValue) {
          setColorWallpaperId(targetValue);
        }
        return;
      }

      if (customWallpaper !== targetValue) {
        setCustomWallpaper(targetValue);
        void saveWallpaper(targetValue);
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        applyRotation();
        scheduleNext();
      }, getWallpaperRotationNextDelay(interval));
    };

    applyRotation();
    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    colorWallpaperId,
    customWallpaper,
    customWallpaperGallery,
    dynamicWallpaperId,
    isDocumentVisible,
    wallpaperMode,
    wallpaperRotationOffsets,
    wallpaperRotationSettings,
  ]);

  const refreshBingWallpaper = async (force = true): Promise<BingWallpaperRefreshResult> => {
    if (manualBingRefreshPromiseRef.current) return 'throttled';

    const currentSlot = getCurrentBingSlot(new Date());
    const meta = readBingCacheMeta();
    const hasCurrentSource = Boolean(hasBingWallpaperRef.current && bingWallpaper);
    const isAlreadyLatest = !force && meta?.slot === currentSlot && hasCurrentSource;
    if (isAlreadyLatest) {
      return 'already-latest';
    }

    const now = Date.now();
    if (manualBingRefreshAtRef.current > 0 && now - manualBingRefreshAtRef.current < MANUAL_BING_REFRESH_COOLDOWN_MS) {
      return 'throttled';
    }

    const task = (async () => {
      setIsBingWallpaperRefreshing(true);
      try {
        const success = await refreshBingWallpaperRef.current?.(true);
        manualBingRefreshAtRef.current = Date.now();
        return success ? 'updated' : 'failed';
      } finally {
        setIsBingWallpaperRefreshing(false);
        manualBingRefreshPromiseRef.current = null;
      }
    })();

    manualBingRefreshPromiseRef.current = task.then(() => {});
    return task;
  };

  const setSelectedCustomWallpaper = async (wallpaper: string | null) => {
    if (!wallpaper) {
      setCustomWallpaper(null);
      return;
    }
    const targetIndex = Math.max(0, customWallpaperGallery.indexOf(wallpaper));
    setCustomWallpaper(wallpaper);
    setCustomWallpaperGallery((prev) => {
      if (prev.includes(wallpaper)) {
        return prev;
      }
      const next = [...prev, wallpaper];
      void saveWallpaperGallery(next);
      return next;
    });
    syncRotationOffsetForMode('custom', targetIndex, Math.max(customWallpaperGallery.length, 1));
    await saveWallpaper(wallpaper);
  };

  const appendCustomWallpapers = async (wallpapers: string[]) => {
    if (wallpapers.length === 0) return;
    const normalized = wallpapers.map((item) => item.trim()).filter(Boolean);
    if (normalized.length === 0) return;
    const nextGallery = Array.from(new Set([...normalized, ...customWallpaperGallery]));
    const nextCurrent = normalized[0] || nextGallery[0] || null;
    setCustomWallpaperGallery(nextGallery);
    setCustomWallpaper(nextCurrent);
    if (nextCurrent) {
      syncRotationOffsetForMode('custom', nextGallery.indexOf(nextCurrent), nextGallery.length);
    }
    await Promise.all([
      saveWallpaperGallery(nextGallery),
      nextCurrent ? saveWallpaper(nextCurrent) : Promise.resolve(),
    ]);
  };

  const setSelectedColorWallpaperId = (id: string) => {
    setColorWallpaperId(id);
    const optionValues = getRotatableWallpaperValues('color', customWallpaperGallery);
    const targetIndex = optionValues.indexOf(id);
    if (targetIndex >= 0) {
      syncRotationOffsetForMode('color', targetIndex, optionValues.length);
    }
  };

  const setSelectedDynamicWallpaperId = (id: DynamicWallpaperId) => {
    setDynamicWallpaperId(id);
    const optionValues = getRotatableWallpaperValues('dynamic', customWallpaperGallery);
    const targetIndex = optionValues.indexOf(id);
    if (targetIndex >= 0) {
      syncRotationOffsetForMode('dynamic', targetIndex, optionValues.length);
    }
  };

  return {
    bingWallpaper, setBingWallpaper,
    isBingWallpaperRefreshing,
    refreshBingWallpaper,
    customWallpaperLoaded,
    customWallpaper,
    setCustomWallpaper: setSelectedCustomWallpaper,
    customWallpaperGallery,
    appendCustomWallpapers,
    wallpaperRotationSettings,
    setWallpaperRotationInterval,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    wallpaperMaskOpacity, setWallpaperMaskOpacity,
    darkModeAutoDimWallpaperEnabled, setDarkModeAutoDimWallpaperEnabled,
    colorWallpaperId, setColorWallpaperId: setSelectedColorWallpaperId,
    dynamicWallpaperId, setDynamicWallpaperId: setSelectedDynamicWallpaperId,
  };
}
