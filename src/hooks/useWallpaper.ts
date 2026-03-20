import { useEffect, useRef, useState } from 'react';
import { getBingWallpaperBlob, getWallpaper, saveBingWallpaperBlob, saveWallpaper } from '../db';
import { COLOR_WALLPAPER_PRESETS, DEFAULT_COLOR_WALLPAPER_ID } from '@/components/wallpaper/colorWallpapers';
import type { WallpaperMode } from '@/wallpaper/types';
import defaultWallpaperImage from '../assets/Default_wallpaper.webp?url';

const DEFAULT_WALLPAPER_MASK_OPACITY = 10;
const BING_CACHE_META_KEY = 'bing_wallpaper_cache_meta_v1';
const BING_REFRESH_DELAY_MINUTES = 20;
const MANUAL_BING_REFRESH_COOLDOWN_MS = 15_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 9000;

type BingCacheMeta = {
  slot: string;
  market: string;
  sourceUrl: string;
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

const toAbsoluteUrl = (baseHost: string, maybeRelative: string): string => {
  const value = (maybeRelative || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `https://${baseHost}${value}`;
  return `https://${baseHost}/${value}`;
};

const buildCandidatesFromArchiveImage = (baseHost: string, image: any): string[] => {
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
  return uniqueUrls(candidates);
};

const fetchCandidatesFromArchiveHost = async (baseHost: 'cn.bing.com' | 'www.bing.com', market: string): Promise<string[]> => {
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

const fetchCandidatesFromBiturl = async (market: string): Promise<string[]> => {
  const fetchMeta = async (resolution: 'UHD' | '1920'): Promise<string[]> => {
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
    return uniqueUrls([upgraded, direct, downgraded]);
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

const getInitialBingWallpaper = (): string => {
  if (typeof window === 'undefined') return '';
  const meta = readBingCacheMeta();
  return (meta?.sourceUrl || '').trim();
};

export function useWallpaper() {
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
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(() => (
    hasStoredWallpaperMode ? null : defaultWallpaperImage
  ));
  const [customWallpaperLoaded, setCustomWallpaperLoaded] = useState(false);
  const [wallpaperMode, setWallpaperMode] = useState<WallpaperMode>(() => {
    const saved = localStorage.getItem('wallpaperMode');
    if (saved === 'bing' || saved === 'weather' || saved === 'color' || saved === 'custom') return saved;
    // Backward compatibility: old versions may persist "dynamic".
    if (saved === 'dynamic') return 'bing';
    return 'custom';
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
  useEffect(() => {
    localStorage.setItem('wallpaperMode', wallpaperMode);
  }, [wallpaperMode]);

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
    let cancelled = false;
    getWallpaper()
      .then(async (wallpaper) => {
        if (cancelled) return;
        if (wallpaper) {
          setCustomWallpaper(wallpaper);
          setCustomWallpaperLoaded(true);
          return;
        }
        if (!hasStoredWallpaperMode) {
          try {
            await saveWallpaper(defaultWallpaperImage);
          } catch {}
          if (cancelled) return;
          setCustomWallpaper(defaultWallpaperImage);
        } else {
          setCustomWallpaper(null);
        }
        setCustomWallpaperLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (!hasStoredWallpaperMode) {
          void saveWallpaper(defaultWallpaperImage).catch(() => {});
          setCustomWallpaper(defaultWallpaperImage);
        }
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

    const applyBingBlob = async (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob);
      if (!objectUrl) throw new Error('empty-object-url');
      setBingSource(objectUrl, { ownsObjectUrl: true });
    };

    const fetchBingImageSource = async (market: string): Promise<{ blob: Blob | null; sourceUrl: string }> => {
      const sourceCandidates: string[] = [];
      try {
        sourceCandidates.push(...await fetchCandidatesFromArchiveHost('cn.bing.com', market));
      } catch {}
      try {
        sourceCandidates.push(...await fetchCandidatesFromArchiveHost('www.bing.com', market));
      } catch {}
      try {
        sourceCandidates.push(...await fetchCandidatesFromBiturl(market));
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
          return { blob: imageBlob, sourceUrl: imageUrl };
        } catch {
          continue;
        }
      }
      return { blob: null, sourceUrl: firstCandidate };
    };

    const refreshBingWallpaper = async (force = false): Promise<boolean> => {
      const market = navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
      const slot = getCurrentBingSlot(new Date());
      const meta = readBingCacheMeta();
      if (!force && meta?.slot === slot && hasBingWallpaperRef.current) return true;

      try {
        const { blob, sourceUrl } = await fetchBingImageSource(market);
        if (blob) {
          await saveBingWallpaperBlob(blob);
        }
        if (!cancelled) {
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
            fetchedAt: new Date().toISOString(),
          });
        }
        return true;
      } catch {
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

      await refreshBingWallpaper(false);

      const delay = getNextBingRefreshDelay(new Date());
      onceTimer = window.setTimeout(() => {
        void refreshBingWallpaper(true);
        dailyTimer = window.setInterval(() => {
          void refreshBingWallpaper(true);
        }, ONE_DAY_MS);
      }, delay);
    })();

    return () => {
      cancelled = true;
      refreshBingWallpaperRef.current = null;
      if (onceTimer !== null) window.clearTimeout(onceTimer);
      if (dailyTimer !== null) window.clearInterval(dailyTimer);
      revokeOwnedBingObjectUrl();
    };
  }, []);

  useEffect(() => {
    if (wallpaperMode !== 'bing') return;

    const currentSlot = getCurrentBingSlot(new Date());
    const meta = readBingCacheMeta();
    const missingCurrentSource = !hasBingWallpaperRef.current || !bingWallpaper;
    const staleSlot = meta?.slot !== currentSlot;
    if (!missingCurrentSource && !staleSlot) return;

    void refreshBingWallpaperRef.current?.(staleSlot);
  }, [bingWallpaper, wallpaperMode]);

  const refreshBingWallpaper = async (force = true): Promise<BingWallpaperRefreshResult> => {
    if (manualBingRefreshPromiseRef.current) return 'throttled';

    const currentSlot = getCurrentBingSlot(new Date());
    const meta = readBingCacheMeta();
    const hasCurrentSource = Boolean(hasBingWallpaperRef.current && bingWallpaper);
    const isAlreadyLatest = !force && meta?.slot === currentSlot && hasCurrentSource;
    if (isAlreadyLatest || (meta?.slot === currentSlot && hasCurrentSource)) {
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

  return {
    bingWallpaper, setBingWallpaper,
    isBingWallpaperRefreshing,
    refreshBingWallpaper,
    customWallpaperLoaded,
    customWallpaper, setCustomWallpaper,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    wallpaperMaskOpacity, setWallpaperMaskOpacity,
    darkModeAutoDimWallpaperEnabled, setDarkModeAutoDimWallpaperEnabled,
    colorWallpaperId, setColorWallpaperId,
  };
}
