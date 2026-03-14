import { useEffect, useRef, useState } from 'react';
import { getBingWallpaperBlob, getWallpaper, saveBingWallpaperBlob } from '../db';
import imgImage from "../assets/Default_wallpaper.png";
import { COLOR_WALLPAPER_PRESETS, DEFAULT_COLOR_WALLPAPER_ID } from '@/components/wallpaper/colorWallpapers';
import type { DynamicWallpaperEffect, WallpaperMode } from '@/wallpaper/types';
import { isDynamicWallpaperEffect } from '@/wallpaper/types';

const DEFAULT_WALLPAPER_MASK_OPACITY = 10;
const BING_CACHE_META_KEY = 'bing_wallpaper_cache_meta_v1';
const BING_REFRESH_DELAY_MINUTES = 20;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 9000;

type BingCacheMeta = {
  slot: string;
  market: string;
  sourceUrl: string;
  fetchedAt: string;
};

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

const getInitialBingWallpaper = (): string => {
  if (typeof window === 'undefined') return '';
  const meta = readBingCacheMeta();
  return (meta?.sourceUrl || '').trim();
};

export function useWallpaper() {
  const initialBingWallpaper = getInitialBingWallpaper();
  const [bingWallpaper, setBingWallpaper] = useState<string>(() => initialBingWallpaper);
  const hasBingWallpaperRef = useRef(Boolean(initialBingWallpaper));
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [wallpaperMode, setWallpaperMode] = useState<WallpaperMode>(() => {
    const saved = localStorage.getItem('wallpaperMode');
    return (saved === 'bing' || saved === 'weather' || saved === 'color' || saved === 'dynamic' || saved === 'custom')
      ? saved
      : 'dynamic';
  });
  const [weatherCode, setWeatherCode] = useState<number>(2);
  const [wallpaperMaskOpacity, setWallpaperMaskOpacity] = useState<number>(() =>
    parseMaskOpacity(localStorage.getItem('wallpaperMaskOpacity')),
  );
  const [colorWallpaperId, setColorWallpaperId] = useState<string>(() => {
    const saved = localStorage.getItem('colorWallpaperId');
    if (!saved) return DEFAULT_COLOR_WALLPAPER_ID;
    const exists = COLOR_WALLPAPER_PRESETS.some((preset) => preset.id === saved);
    return exists ? saved : DEFAULT_COLOR_WALLPAPER_ID;
  });
  const [dynamicWallpaperEffect, setDynamicWallpaperEffect] = useState<DynamicWallpaperEffect>(() => {
    const saved = localStorage.getItem('dynamicWallpaperEffect');
    if (isDynamicWallpaperEffect(saved)) return saved;
    return 'silk';
  });

  useEffect(() => {
    localStorage.setItem('wallpaperMode', wallpaperMode);
  }, [wallpaperMode]);

  useEffect(() => {
    localStorage.setItem('wallpaperMaskOpacity', String(wallpaperMaskOpacity));
  }, [wallpaperMaskOpacity]);

  useEffect(() => {
    localStorage.setItem('colorWallpaperId', colorWallpaperId);
  }, [colorWallpaperId]);

  useEffect(() => {
    localStorage.setItem('dynamicWallpaperEffect', dynamicWallpaperEffect);
  }, [dynamicWallpaperEffect]);

  useEffect(() => {
    getWallpaper().then((wallpaper) => {
      if (wallpaper) setCustomWallpaper(wallpaper);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let onceTimer: number | null = null;
    let dailyTimer: number | null = null;

    const setBingSource = (source: string) => {
      const url = (source || '').trim();
      if (url) {
        hasBingWallpaperRef.current = true;
        setBingWallpaper(url);
        return;
      }
      hasBingWallpaperRef.current = false;
      setBingWallpaper(imgImage);
    };

    const blobToDataUrl = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('read blob failed'));
        reader.readAsDataURL(blob);
      });
    };

    const applyBingBlob = async (blob: Blob) => {
      const dataUrl = await blobToDataUrl(blob);
      if (!dataUrl) throw new Error('empty-data-url');
      setBingSource(dataUrl);
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

    const refreshBingWallpaper = async (force = false) => {
      const market = navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
      const slot = getCurrentBingSlot(new Date());
      const meta = readBingCacheMeta();
      if (!force && meta?.slot === slot && hasBingWallpaperRef.current) return;

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
      } catch {
        if (!cancelled && !hasBingWallpaperRef.current) setBingSource('');
      }
    };

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
            else setBingSource('');
          }
        } else {
          const meta = readBingCacheMeta();
          if (meta?.sourceUrl) setBingSource(meta.sourceUrl);
          else setBingSource('');
        }
      } catch {
        if (!cancelled) setBingSource('');
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
      if (onceTimer !== null) window.clearTimeout(onceTimer);
      if (dailyTimer !== null) window.clearInterval(dailyTimer);
    };
  }, []);

  return {
    bingWallpaper, setBingWallpaper,
    customWallpaper, setCustomWallpaper,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    wallpaperMaskOpacity, setWallpaperMaskOpacity,
    colorWallpaperId, setColorWallpaperId,
    dynamicWallpaperEffect, setDynamicWallpaperEffect,
  };
}
