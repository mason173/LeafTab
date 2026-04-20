import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { buildFaviconCandidates, extractDomainFromUrl, getRemoteFaviconOverride, shouldProbeRemoteFaviconForUrl } from '../utils';
import { resolveCustomIcon, resolveCustomIconFromCache, type ResolvedCustomIcon } from '@/utils/iconLibrary';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import {
  getShortcutIconColor,
  hasOfficialIconColorOverride,
  normalizeShortcutVisualMode,
  shouldUseOfficialShortcutIcon,
} from '@/utils/shortcutIconPreferences';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  queueCachedLocalStorageRemoveItem,
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';
import {
  readShortcutCustomIcon,
  SHORTCUT_CUSTOM_ICON_CHANGED_EVENT,
} from '@/utils/shortcutCustomIcons';
import {
  clampShortcutIconCornerRadius,
  DEFAULT_SHORTCUT_ICON_APPEARANCE,
  DEFAULT_SHORTCUT_ICON_CORNER_RADIUS,
  getShortcutIconSmoothClipPathStyles,
} from '@/utils/shortcutIconSettings';
import { getAdaptiveShortcutForegroundColor } from '@/utils/shortcutColorHsl';
import { useShortcutIconRenderContext } from './ShortcutIconRenderContext';

const FAVICON_CACHE_PREFIX = 'favicon_cache_v2:';
const FAVICON_CACHE_INDEX_KEY = 'favicon_cache_v2_index';
const MAX_CACHE_ITEMS = 400;
const OFFICIAL_ICON_CACHE_PREFIX = 'official_icon_cache_v1:';
const OFFICIAL_ICON_CACHE_INDEX_KEY = 'official_icon_cache_v1_index';
const MAX_OFFICIAL_ICON_CACHE_ITEMS = 160;
const MAX_OFFICIAL_ICON_DATA_LENGTH = 260_000;
const FAVICON_FAIL_PREFIX = 'favicon_cache_v2_fail:';
const FAVICON_FAIL_TTL_MS = 12 * 60 * 60 * 1000;
const normalizeDomain = (domain: string) => {
  let d = domain.trim().toLowerCase();
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
};

const isIowenFaviconUrl = (value: string) => /^https:\/\/api\.iowen\.cn\/favicon\/.+\.png$/i.test((value || '').trim());
const isDuckDuckGoIp3Url = (value: string) => /^https:\/\/icons\.duckduckgo\.com\/ip3\/.+\.ico$/i.test((value || '').trim());
const isGoogleS2FaviconUrl = (value: string) => /^https:\/\/www\.google\.com\/s2\/favicons\?.+$/i.test((value || '').trim());
const isGoogleGstaticFaviconV2Url = (value: string) => /^https:\/\/t\d*\.gstatic\.com\/faviconV2\?.+$/i.test((value || '').trim());
const isSvgImageSource = (value: string) => {
  const normalized = (value || '').trim().toLowerCase();
  return normalized.endsWith('.svg') || normalized.startsWith('data:image/svg+xml');
};

function buildFirefoxFaviconCandidates(domain: string, preferSingleCandidate: boolean) {
  const safeDomain = domain.trim();
  if (preferSingleCandidate) {
    return [`https://${safeDomain}/favicon.ico`];
  }
  return [
    `https://${safeDomain}/favicon.ico`,
    `https://${safeDomain}/apple-touch-icon.png`,
  ];
}

const registrableDomain = (domain: string) => {
  const parts = normalizeDomain(domain).split('.');
  if (parts.length <= 2) return parts.join('.');
  const last2 = parts.slice(-2).join('.');
  const multiSuffixes = new Set([
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
    'co.uk', 'org.uk', 'ac.uk',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'gr.jp', 'ed.jp', 'ad.jp',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au'
  ]);
  if (multiSuffixes.has(last2)) {
    if (parts.length >= 3) return parts.slice(-3).join('.');
  }
  return last2;
};

function getCachedFavicon(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    const k1 = `${FAVICON_CACHE_PREFIX}${d1}`;
    const k2 = `${FAVICON_CACHE_PREFIX}${d2}`;
    return readCachedLocalStorageItem(k1) || readCachedLocalStorageItem(k2) || '';
  } catch {
    return '';
  }
}

function setCachedFavicon(domain: string, data: string) {
  try {
    const d = normalizeDomain(domain);
    const key = `${FAVICON_CACHE_PREFIX}${d}`;
    queueCachedLocalStorageSetItem(key, data);
    const raw = readCachedLocalStorageItem(FAVICON_CACHE_INDEX_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const idx = list.indexOf(d);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(d);
    while (list.length > MAX_CACHE_ITEMS) {
      const removed = list.pop();
      if (removed) {
        queueCachedLocalStorageRemoveItem(`${FAVICON_CACHE_PREFIX}${removed}`);
      }
    }
    queueCachedLocalStorageSetItem(FAVICON_CACHE_INDEX_KEY, JSON.stringify(list));
  } catch {}
}

function readCacheIndex(key: string) {
  try {
    const raw = readCachedLocalStorageItem(key);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item) => typeof item === 'string' && item);
  } catch {
    return [] as string[];
  }
}

function getCachedOfficialIcon(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    const k1 = `${OFFICIAL_ICON_CACHE_PREFIX}${d1}`;
    const k2 = `${OFFICIAL_ICON_CACHE_PREFIX}${d2}`;
    return readCachedLocalStorageItem(k1) || readCachedLocalStorageItem(k2) || '';
  } catch {
    return '';
  }
}

function setCachedOfficialIcon(domain: string, dataUrl: string) {
  try {
    if (!dataUrl.startsWith('data:image/')) return;
    if (dataUrl.length > MAX_OFFICIAL_ICON_DATA_LENGTH) return;
    const d = normalizeDomain(domain);
    if (!d) return;
    const key = `${OFFICIAL_ICON_CACHE_PREFIX}${d}`;
    queueCachedLocalStorageSetItem(key, dataUrl);
    const list = readCacheIndex(OFFICIAL_ICON_CACHE_INDEX_KEY);
    const idx = list.indexOf(d);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(d);
    while (list.length > MAX_OFFICIAL_ICON_CACHE_ITEMS) {
      const removed = list.pop();
      if (removed) queueCachedLocalStorageRemoveItem(`${OFFICIAL_ICON_CACHE_PREFIX}${removed}`);
    }
    queueCachedLocalStorageSetItem(OFFICIAL_ICON_CACHE_INDEX_KEY, JSON.stringify(list));
  } catch {}
}

function clearCachedOfficialIcon(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    if (d1) queueCachedLocalStorageRemoveItem(`${OFFICIAL_ICON_CACHE_PREFIX}${d1}`);
    if (d2) queueCachedLocalStorageRemoveItem(`${OFFICIAL_ICON_CACHE_PREFIX}${d2}`);
    const list = readCacheIndex(OFFICIAL_ICON_CACHE_INDEX_KEY);
    const filtered = list.filter((v) => v !== d1 && v !== d2);
    queueCachedLocalStorageSetItem(OFFICIAL_ICON_CACHE_INDEX_KEY, JSON.stringify(filtered));
  } catch {}
}

function clearCachedFavicon(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    if (d1) queueCachedLocalStorageRemoveItem(`${FAVICON_CACHE_PREFIX}${d1}`);
    if (d2) queueCachedLocalStorageRemoveItem(`${FAVICON_CACHE_PREFIX}${d2}`);
    const raw = readCachedLocalStorageItem(FAVICON_CACHE_INDEX_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((v) => v !== d1 && v !== d2);
    queueCachedLocalStorageSetItem(FAVICON_CACHE_INDEX_KEY, JSON.stringify(filtered));
  } catch {}
}

function getFaviconFailAt(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    const v1 = Number(readCachedLocalStorageItem(`${FAVICON_FAIL_PREFIX}${d1}`) || 0);
    const v2 = Number(readCachedLocalStorageItem(`${FAVICON_FAIL_PREFIX}${d2}`) || 0);
    return Math.max(v1, v2);
  } catch {
    return 0;
  }
}

function markFaviconFetchFailed(domain: string) {
  try {
    const d = normalizeDomain(domain);
    if (!d) return;
    queueCachedLocalStorageSetItem(`${FAVICON_FAIL_PREFIX}${d}`, String(Date.now()));
  } catch {}
}

function clearFaviconFetchFailed(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    if (d1) queueCachedLocalStorageRemoveItem(`${FAVICON_FAIL_PREFIX}${d1}`);
    if (d2) queueCachedLocalStorageRemoveItem(`${FAVICON_FAIL_PREFIX}${d2}`);
  } catch {}
}

function shouldSkipDomainCandidates(domain: string) {
  const failAt = getFaviconFailAt(domain);
  if (!failAt) return false;
  return Date.now() - failAt < FAVICON_FAIL_TTL_MS;
}

function isHttpFaviconEligible(url: string, domain: string) {
  const safeDomain = domain.trim().toLowerCase();
  if (!safeDomain) return false;
  return shouldProbeRemoteFaviconForUrl(url);
}

const ICON_META_PREFIX = 'favicon_cache_v2_meta:';
type IconCandidateKind = 'official' | 'favicon' | 'provided' | 'local-custom';
type IconCandidate = {
  src: string;
  kind: IconCandidateKind;
  officialMode?: ResolvedCustomIcon['mode'];
  officialDefaultColor?: string;
};

type OfficialSvgTintMode = 'unknown' | 'mask' | 'filter';

const SHORTCUT_ICON_FILTER_HOST_ID = 'leaftab-shortcut-icon-filter-defs';
const SHORTCUT_ICON_MONO_FILTER_ID = 'leaftab-shortcut-icon-filter-monochrome';
const SHORTCUT_ICON_MONO_FIXED_WHITE_FILTER_ID = 'leaftab-shortcut-icon-filter-monochrome-fixed-white';
const SHORTCUT_ICON_ACCENT_FILTER_ID = 'leaftab-shortcut-icon-filter-accent';
const SHORTCUT_ICON_MONO_PHOTO_FILTER_ID = 'leaftab-shortcut-icon-filter-monochrome-photo';
const SHORTCUT_ICON_ACCENT_PHOTO_FILTER_ID = 'leaftab-shortcut-icon-filter-accent-photo';
const FIXED_WHITE_MONOCHROME_COLOR = '#FFFFFF';
const UNIFIED_ICON_GLYPH_CONTENT_RATIO = 0.56;
const COLORFUL_TILE_TEXTURE_GRADIENT = 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 40%, rgba(0,0,0,0.025) 72%, rgba(0,0,0,0.06) 100%)';
const ICON_SURFACE_BORDER_COLOR = 'color-mix(in srgb, var(--foreground) 12%, transparent)';
const OFFICIAL_SVG_TINT_MODE_CACHE = new Map<string, Exclude<OfficialSvgTintMode, 'unknown'>>();
const OFFICIAL_SVG_TINT_MODE_IN_FLIGHT = new Map<string, Promise<Exclude<OfficialSvgTintMode, 'unknown'>>>();
const SVG_RASTER_CONTENT_PATTERN = /<(?:image|feImage|foreignObject)\b|(?:xlink:href|href)\s*=\s*["']data:image\/(?:png|jpeg|jpg|webp|gif|bmp|ico|avif)/i;
let shortcutIconFilterSyncRaf = 0;
let shortcutIconFilterSyncTimeout = 0;
let shortcutIconFilterAutoSyncInstalled = false;

function decodeSvgTextFromDataUrl(value: string) {
  const normalized = (value || '').trim();
  if (!normalized.toLowerCase().startsWith('data:image/svg+xml')) return '';
  const separatorIndex = normalized.indexOf(',');
  if (separatorIndex < 0) return '';
  const metadata = normalized.slice(0, separatorIndex).toLowerCase();
  const payload = normalized.slice(separatorIndex + 1);
  try {
    return metadata.includes(';base64')
      ? atob(payload)
      : decodeURIComponent(payload);
  } catch {
    return '';
  }
}

function classifyOfficialSvgTintMode(svgText: string): Exclude<OfficialSvgTintMode, 'unknown'> {
  return SVG_RASTER_CONTENT_PATTERN.test(svgText) ? 'filter' : 'mask';
}

async function resolveOfficialSvgTintMode(src: string): Promise<Exclude<OfficialSvgTintMode, 'unknown'>> {
  const normalizedSrc = (src || '').trim();
  if (!normalizedSrc) return 'mask';

  const cached = OFFICIAL_SVG_TINT_MODE_CACHE.get(normalizedSrc);
  if (cached) return cached;

  const inFlight = OFFICIAL_SVG_TINT_MODE_IN_FLIGHT.get(normalizedSrc);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const inlineSvgText = decodeSvgTextFromDataUrl(normalizedSrc);
      if (inlineSvgText) {
        const mode = classifyOfficialSvgTintMode(inlineSvgText);
        OFFICIAL_SVG_TINT_MODE_CACHE.set(normalizedSrc, mode);
        return mode;
      }

      const response = await fetch(normalizedSrc, {
        method: 'GET',
        credentials: 'omit',
        cache: 'force-cache',
      });
      if (!response.ok) return 'mask';
      const svgText = await response.text();
      const mode = classifyOfficialSvgTintMode(svgText);
      OFFICIAL_SVG_TINT_MODE_CACHE.set(normalizedSrc, mode);
      return mode;
    } catch {
      return 'mask';
    } finally {
      OFFICIAL_SVG_TINT_MODE_IN_FLIGHT.delete(normalizedSrc);
    }
  })();

  OFFICIAL_SVG_TINT_MODE_IN_FLIGHT.set(normalizedSrc, promise);
  return promise;
}

function resolveCssColor(cssColor: string): string | null {
  if (typeof document === 'undefined') return null;
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.opacity = '0';
  probe.style.pointerEvents = 'none';
  probe.style.color = cssColor;
  document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return resolved || null;
}

function ensureShortcutIconFilterDefs() {
  if (typeof document === 'undefined') return null;

  let host = document.getElementById(SHORTCUT_ICON_FILTER_HOST_ID) as SVGSVGElement | null;
  if (!host) {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('id', SHORTCUT_ICON_FILTER_HOST_ID);
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'absolute';
    host.style.width = '0';
    host.style.height = '0';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'hidden';
    host.innerHTML = `
      <defs>
        <filter id="${SHORTCUT_ICON_MONO_FILTER_ID}" color-interpolation-filters="sRGB">
          <feComponentTransfer in="SourceGraphic" result="whiteIconBase">
            <feFuncR type="table" tableValues="1 1"></feFuncR>
            <feFuncG type="table" tableValues="1 1"></feFuncG>
            <feFuncB type="table" tableValues="1 1"></feFuncB>
          </feComponentTransfer>
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lumAlpha"></feColorMatrix>
          <feComponentTransfer in="lumAlpha" result="lumExtract">
            <feFuncA type="table" tableValues="0 0 0 0.2 1"></feFuncA>
          </feComponentTransfer>
          <feComponentTransfer in="lumExtract" result="iconMask">
            <feFuncA type="table" tableValues="1 0"></feFuncA>
          </feComponentTransfer>
          <feComposite in="whiteIconBase" in2="iconMask" operator="in" result="whiteIcon"></feComposite>
          <feFlood data-role="flood" flood-color="rgb(0, 0, 0)" result="solidColor"></feFlood>
          <feComposite in="solidColor" in2="whiteIcon" operator="in" result="coloredIcon"></feComposite>
          <feComposite in="coloredIcon" in2="SourceAlpha" operator="in"></feComposite>
        </filter>
        <filter id="${SHORTCUT_ICON_MONO_FIXED_WHITE_FILTER_ID}" color-interpolation-filters="sRGB">
          <feComponentTransfer in="SourceGraphic" result="whiteIconBase">
            <feFuncR type="table" tableValues="1 1"></feFuncR>
            <feFuncG type="table" tableValues="1 1"></feFuncG>
            <feFuncB type="table" tableValues="1 1"></feFuncB>
          </feComponentTransfer>
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lumAlpha"></feColorMatrix>
          <feComponentTransfer in="lumAlpha" result="lumExtract">
            <feFuncA type="table" tableValues="0 0 0 0.2 1"></feFuncA>
          </feComponentTransfer>
          <feComponentTransfer in="lumExtract" result="iconMask">
            <feFuncA type="table" tableValues="1 0"></feFuncA>
          </feComponentTransfer>
          <feComposite in="whiteIconBase" in2="iconMask" operator="in" result="whiteIcon"></feComposite>
          <feFlood flood-color="rgb(255, 255, 255)" result="solidColor"></feFlood>
          <feComposite in="solidColor" in2="whiteIcon" operator="in" result="coloredIcon"></feComposite>
          <feComposite in="coloredIcon" in2="SourceAlpha" operator="in"></feComposite>
        </filter>
        <filter id="${SHORTCUT_ICON_ACCENT_FILTER_ID}" color-interpolation-filters="sRGB">
          <feComponentTransfer in="SourceGraphic" result="whiteIconBase">
            <feFuncR type="table" tableValues="1 1"></feFuncR>
            <feFuncG type="table" tableValues="1 1"></feFuncG>
            <feFuncB type="table" tableValues="1 1"></feFuncB>
          </feComponentTransfer>
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lumAlpha"></feColorMatrix>
          <feComponentTransfer in="lumAlpha" result="lumExtract">
            <feFuncA type="table" tableValues="0 0 0 0.2 1"></feFuncA>
          </feComponentTransfer>
          <feComponentTransfer in="lumExtract" result="iconMask">
            <feFuncA type="table" tableValues="1 0"></feFuncA>
          </feComponentTransfer>
          <feComposite in="whiteIconBase" in2="iconMask" operator="in" result="whiteIcon"></feComposite>
          <feFlood data-role="flood" flood-color="rgb(0, 0, 0)" result="solidColor"></feFlood>
          <feComposite in="solidColor" in2="whiteIcon" operator="in" result="coloredIcon"></feComposite>
          <feComposite in="coloredIcon" in2="SourceAlpha" operator="in"></feComposite>
        </filter>
        <filter id="${SHORTCUT_ICON_MONO_PHOTO_FILTER_ID}" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="grayIcon"></feColorMatrix>
          <feFlood data-role="flood" flood-color="rgb(0, 0, 0)" result="solidColor"></feFlood>
          <feBlend in="solidColor" in2="grayIcon" mode="screen" result="tintedIcon"></feBlend>
          <feComposite in="tintedIcon" in2="SourceAlpha" operator="in"></feComposite>
        </filter>
        <filter id="${SHORTCUT_ICON_ACCENT_PHOTO_FILTER_ID}" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="grayIcon"></feColorMatrix>
          <feFlood data-role="flood" flood-color="rgb(0, 0, 0)" result="solidColor"></feFlood>
          <feBlend in="solidColor" in2="grayIcon" mode="screen" result="tintedIcon"></feBlend>
          <feComposite in="tintedIcon" in2="SourceAlpha" operator="in"></feComposite>
        </filter>
      </defs>
    `;
    document.body.prepend(host);
  }

  return host;
}

function syncShortcutIconFilterDefs() {
  const host = ensureShortcutIconFilterDefs();
  if (!host) return;

  const monochromeColor = resolveCssColor('var(--foreground)');
  const accentColor = resolveCssColor('var(--primary)');
  if (!monochromeColor || !accentColor) return;

  const monoFlood = host.querySelector(`#${SHORTCUT_ICON_MONO_FILTER_ID} feFlood[data-role="flood"]`);
  const accentFlood = host.querySelector(`#${SHORTCUT_ICON_ACCENT_FILTER_ID} feFlood[data-role="flood"]`);
  const monoPhotoFlood = host.querySelector(`#${SHORTCUT_ICON_MONO_PHOTO_FILTER_ID} feFlood[data-role="flood"]`);
  const accentPhotoFlood = host.querySelector(`#${SHORTCUT_ICON_ACCENT_PHOTO_FILTER_ID} feFlood[data-role="flood"]`);
  monoFlood?.setAttribute('flood-color', monochromeColor);
  accentFlood?.setAttribute('flood-color', accentColor);
  monoPhotoFlood?.setAttribute('flood-color', monochromeColor);
  accentPhotoFlood?.setAttribute('flood-color', accentColor);
}

function queueShortcutIconFilterDefsSync() {
  if (typeof window === 'undefined') return;

  syncShortcutIconFilterDefs();

  if (shortcutIconFilterSyncRaf) {
    window.cancelAnimationFrame(shortcutIconFilterSyncRaf);
  }
  shortcutIconFilterSyncRaf = window.requestAnimationFrame(() => {
    shortcutIconFilterSyncRaf = 0;
    syncShortcutIconFilterDefs();
    window.requestAnimationFrame(() => {
      syncShortcutIconFilterDefs();
    });
  });

  if (shortcutIconFilterSyncTimeout) {
    window.clearTimeout(shortcutIconFilterSyncTimeout);
  }
  shortcutIconFilterSyncTimeout = window.setTimeout(() => {
    shortcutIconFilterSyncTimeout = 0;
    syncShortcutIconFilterDefs();
  }, 120);
}

function installShortcutIconFilterDefsAutoSync() {
  if (typeof window === 'undefined' || shortcutIconFilterAutoSyncInstalled) return;
  shortcutIconFilterAutoSyncInstalled = true;

  const handleSync = () => {
    queueShortcutIconFilterDefsSync();
  };

  window.addEventListener('pageshow', handleSync);
  window.addEventListener('load', handleSync);
  window.addEventListener('leaftab-accent-color-changed', handleSync);

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      queueShortcutIconFilterDefsSync();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-accent-color'],
    });
  }

  queueShortcutIconFilterDefsSync();
}

function AppearanceAwareImage({
  src,
  appearance,
  tintTarget = 'glyph',
  className,
  style,
  onLoad,
  onError,
}: {
  src: string;
  appearance: ShortcutIconAppearance;
  tintTarget?: 'glyph' | 'photo';
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const { monochromeTone } = useShortcutIconRenderContext();
  const resolvedFilter = (() => {
    if (appearance === 'colorful') return undefined;
    if (tintTarget === 'photo') {
      return appearance === 'monochrome'
        ? `url(#${SHORTCUT_ICON_MONO_PHOTO_FILTER_ID})`
        : `url(#${SHORTCUT_ICON_ACCENT_PHOTO_FILTER_ID})`;
    }
    return appearance === 'monochrome'
      ? `url(#${monochromeTone === 'fixed-white' ? SHORTCUT_ICON_MONO_FIXED_WHITE_FILTER_ID : SHORTCUT_ICON_MONO_FILTER_ID})`
      : `url(#${SHORTCUT_ICON_ACCENT_FILTER_ID})`;
  })();

  return (
    <img
      alt=""
      data-shortcut-icon-appearance={appearance}
      className={className}
      draggable={false}
      src={src}
      style={{
        ...style,
        filter: resolvedFilter,
      }}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

function AppearanceAwareSvgMask({
  src,
  appearance,
  color,
  className,
  style,
  onLoad,
  onError,
}: {
  src: string;
  appearance: ShortcutIconAppearance;
  color: string;
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const maskImage = `url(${JSON.stringify(src)})`;

  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        data-shortcut-icon-preload="true"
        draggable={false}
        src={src}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
        onLoad={onLoad}
        onError={onError}
      />
      <div
        aria-hidden="true"
        data-shortcut-icon-appearance={appearance}
        className={className}
        style={{
          ...style,
          backgroundColor: color,
          WebkitMaskImage: maskImage,
          maskImage,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    </>
  );
}

function getCachedIconSignature(domain: string) {
  try {
    const d = normalizeDomain(domain);
    if (!d) return '';
    return readCachedLocalStorageItem(`${ICON_META_PREFIX}${d}`) || '';
  } catch {
    return '';
  }
}

function setCachedIconSignature(domain: string, signature: string) {
  try {
    const d = normalizeDomain(domain);
    if (!d) return;
    if (!signature) {
      queueCachedLocalStorageRemoveItem(`${ICON_META_PREFIX}${d}`);
      return;
    }
    queueCachedLocalStorageSetItem(`${ICON_META_PREFIX}${d}`, signature);
  } catch {}
}

async function cacheFaviconData(domain: string, src: string) {
  if (!src) return;

  if (src.startsWith('data:')) {
    setCachedFavicon(domain, src);
    return;
  }

  // Persist the resolved URL directly. Re-fetching cross-origin icons from the extension
  // creates extra CORS noise in DevTools and isn't necessary for display.
  setCachedFavicon(domain, src);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('read blob failed'));
    reader.readAsDataURL(blob);
  });
}

async function cacheOfficialIconData(domain: string, src: string) {
  if (!domain || !src || src.startsWith('data:')) return;
  try {
    const resp = await fetch(src, {
      method: 'GET',
      credentials: 'omit',
      cache: 'force-cache',
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    if (!(blob instanceof Blob) || blob.size <= 0) return;
    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl) return;
    setCachedOfficialIcon(domain, dataUrl);
  } catch {}
}

const ShortcutIcon = memo(function ShortcutIcon({
  icon,
  url,
  size = 36,
  exact,
  frame = 'never',
  fallbackStyle = 'default',
  fallbackLabel,
  fallbackLetterSize = 24,
  shortcutId,
  localCustomIconDataUrl,
  allowStoredCustomIcon = true,
  useOfficialIcon,
  autoUseOfficialIcon,
  officialIconAvailableAtSave,
  officialIconColorOverride,
  iconRendering,
  iconColor,
  iconCornerRadius = DEFAULT_SHORTCUT_ICON_CORNER_RADIUS,
  iconAppearance = DEFAULT_SHORTCUT_ICON_APPEARANCE,
  remoteIconScale = 1,
}: {
  icon: string;
  url: string;
  size?: number;
  exact?: boolean;
  frame?: 'auto' | 'always' | 'never';
  fallbackStyle?: 'default' | 'emptyicon';
  fallbackLabel?: string;
  fallbackLetterSize?: number;
  shortcutId?: string;
  localCustomIconDataUrl?: string;
  allowStoredCustomIcon?: boolean;
  useOfficialIcon?: Shortcut['useOfficialIcon'];
  autoUseOfficialIcon?: Shortcut['autoUseOfficialIcon'];
  officialIconAvailableAtSave?: Shortcut['officialIconAvailableAtSave'];
  officialIconColorOverride?: Shortcut['officialIconColorOverride'];
  iconRendering?: Shortcut['iconRendering'];
  iconColor?: Shortcut['iconColor'];
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  remoteIconScale?: number;
}) {
  const firefox = isFirefoxBuildTarget();
  const { monochromeTone } = useShortcutIconRenderContext();
  const domain = useMemo(() => extractDomainFromUrl(url), [url]);
  const canProbeRemoteFavicon = useMemo(() => isHttpFaviconEligible(url, domain), [domain, url]);
  const skipDomainCandidates = useMemo(() => (domain ? shouldSkipDomainCandidates(domain) : false), [domain]);
  const [cachedFavicon, setCachedFavicon] = useState<string>(() => (domain ? getCachedFavicon(domain) : ''));
  const [cachedOfficialIcon, setCachedOfficialIcon] = useState<string>(() => (domain ? getCachedOfficialIcon(domain) : ''));
  const [resolvedOfficialIcon, setResolvedOfficialIcon] = useState<ResolvedCustomIcon | null>(() => (
    domain ? resolveCustomIconFromCache(domain) : null
  ));
  const [libraryTick, setLibraryTick] = useState(0);
  const [firefoxDomainCandidatesReady, setFirefoxDomainCandidatesReady] = useState(() => !firefox);
  const resolvedIconRendering = normalizeShortcutVisualMode(iconRendering);
  const [storedLocalCustomIconDataUrl, setStoredLocalCustomIconDataUrl] = useState<string>(() => (
    allowStoredCustomIcon ? readShortcutCustomIcon(shortcutId) : ''
  ));
  const effectiveLocalCustomIconDataUrl = (localCustomIconDataUrl || storedLocalCustomIconDataUrl || '').trim();

  useEffect(() => {
    setCachedFavicon(domain ? getCachedFavicon(domain) : '');
    setCachedOfficialIcon(domain ? getCachedOfficialIcon(domain) : '');
  }, [domain]);

  useEffect(() => {
    setStoredLocalCustomIconDataUrl(allowStoredCustomIcon ? readShortcutCustomIcon(shortcutId) : '');
  }, [allowStoredCustomIcon, shortcutId]);

  useEffect(() => {
    if (!allowStoredCustomIcon || !shortcutId) return;

    const normalizedShortcutId = String(shortcutId).trim();
    const handleCustomIconChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ shortcutId?: string }>).detail;
      if (!detail?.shortcutId || detail.shortcutId !== normalizedShortcutId) return;
      setStoredLocalCustomIconDataUrl(readShortcutCustomIcon(normalizedShortcutId));
    };

    window.addEventListener(SHORTCUT_CUSTOM_ICON_CHANGED_EVENT, handleCustomIconChanged);
    return () => {
      window.removeEventListener(SHORTCUT_CUSTOM_ICON_CHANGED_EVENT, handleCustomIconChanged);
    };
  }, [allowStoredCustomIcon, shortcutId]);

  useEffect(() => {
    if (!firefox) {
      setFirefoxDomainCandidatesReady(true);
      return;
    }
    if (!domain || skipDomainCandidates) {
      setFirefoxDomainCandidatesReady(false);
      return;
    }
    const hasImmediateCandidate =
      !!resolvedOfficialIcon?.url ||
      !!cachedFavicon ||
      (!!icon && !isIowenFaviconUrl(icon));
    if (hasImmediateCandidate) {
      setFirefoxDomainCandidatesReady(true);
      return;
    }

    setFirefoxDomainCandidatesReady(false);
    const timer = window.setTimeout(() => {
      setFirefoxDomainCandidatesReady(true);
    }, 180);
    return () => {
      window.clearTimeout(timer);
    };
  }, [cachedFavicon, resolvedOfficialIcon?.url, domain, firefox, icon, skipDomainCandidates]);

  const candidates = useMemo<IconCandidate[]>(() => {
    const list: IconCandidate[] = [];
    const officialIconUrl = resolvedOfficialIcon?.url || '';
    if (effectiveLocalCustomIconDataUrl) {
      list.push({ src: effectiveLocalCustomIconDataUrl, kind: 'local-custom' });
    }
    const shouldUseOfficial = shouldUseOfficialShortcutIcon({
      officialAvailable: Boolean(officialIconUrl),
      shortcut: {
        useOfficialIcon,
        autoUseOfficialIcon,
        officialIconAvailableAtSave,
      },
    });
    if (shouldUseOfficial && officialIconUrl) {
      if (cachedOfficialIcon) {
        list.push({
          src: cachedOfficialIcon,
          kind: 'official',
          officialMode: resolvedOfficialIcon?.mode,
          officialDefaultColor: resolvedOfficialIcon?.defaultColor,
        });
      }
      list.push({
        src: officialIconUrl,
        kind: 'official',
        officialMode: resolvedOfficialIcon?.mode,
        officialDefaultColor: resolvedOfficialIcon?.defaultColor,
      });
    }
    if (resolvedIconRendering !== 'letter') {
      if (cachedFavicon && (fallbackStyle !== 'emptyicon' || cachedFavicon.startsWith('data:'))) {
        list.push({ src: cachedFavicon, kind: 'favicon' });
      }
      // Stored iowen proxy URLs are legacy/unreliable; use dynamic candidates instead.
      if (icon && !isIowenFaviconUrl(icon)) {
        list.push({ src: icon, kind: 'provided' });
      }
      if (domain) {
        const overrideIcon = getRemoteFaviconOverride(domain);
        if (overrideIcon) {
          list.push({ src: overrideIcon, kind: 'favicon' });
        }
      }
      if (domain && canProbeRemoteFavicon && !skipDomainCandidates && (!firefox || firefoxDomainCandidatesReady)) {
        list.push(
          ...(firefox
            ? buildFirefoxFaviconCandidates(domain, exact || size <= 36)
            : buildFaviconCandidates(domain)).map((src) => ({ src, kind: 'favicon' as const })),
        );
      }
    }
    const uniqueBySrc = new Map<string, IconCandidate>();
    for (const candidate of list) {
      if (!candidate.src || uniqueBySrc.has(candidate.src)) continue;
      uniqueBySrc.set(candidate.src, candidate);
    }
    const unique = Array.from(uniqueBySrc.values());
    if (fallbackStyle === 'emptyicon') {
      return unique.filter(({ src }) => (
        !isDuckDuckGoIp3Url(src)
        && !isGoogleS2FaviconUrl(src)
        && !isGoogleGstaticFaviconV2Url(src)
      ));
    }
    return unique;
  }, [
    autoUseOfficialIcon,
    cachedFavicon,
    cachedOfficialIcon,
    canProbeRemoteFavicon,
    domain,
    exact,
    fallbackStyle,
    firefox,
    firefoxDomainCandidatesReady,
    icon,
    effectiveLocalCustomIconDataUrl,
    officialIconAvailableAtSave,
    resolvedIconRendering,
    resolvedOfficialIcon,
    size,
    skipDomainCandidates,
    useOfficialIcon,
  ]);

  const [index, setIndex] = useState(0);
  const [officialSvgTintMode, setOfficialSvgTintMode] = useState<OfficialSvgTintMode>('unknown');

  useEffect(() => {
    setIndex(0);
  }, [candidates.map(({ kind, src }) => `${kind}:${src}`).join('|')]);

  useEffect(() => {
    const onChanged = () => setLibraryTick((v) => v + 1);
    window.addEventListener('leaftab-icon-library-changed', onChanged);
    return () => window.removeEventListener('leaftab-icon-library-changed', onChanged);
  }, []);

  useEffect(() => {
    if (!domain) {
      setResolvedOfficialIcon(null);
      return;
    }
    setResolvedOfficialIcon(resolveCustomIconFromCache(domain));
  }, [domain, libraryTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!domain) {
        if (!cancelled) setResolvedOfficialIcon(null);
        return;
      }
      if (firefox) {
        if (!cancelled) {
          setResolvedOfficialIcon(resolveCustomIconFromCache(domain));
        }
      }
      const resolved = await resolveCustomIcon(domain);
      if (cancelled) return;
      if (!resolved?.url) {
        setResolvedOfficialIcon(null);
        return;
      }
      const prevSig = getCachedIconSignature(domain);
      if (resolved.signature && prevSig && prevSig !== resolved.signature) {
        clearCachedFavicon(domain);
        clearCachedOfficialIcon(domain);
        setCachedFavicon('');
        setCachedOfficialIcon('');
      }
      if (resolved.signature && prevSig !== resolved.signature) {
        setCachedIconSignature(domain, resolved.signature);
      }
      setResolvedOfficialIcon((prev) => (
        prev
        && prev.url === resolved.url
        && prev.signature === resolved.signature
        && prev.mode === resolved.mode
        && prev.defaultColor === resolved.defaultColor
          ? prev
          : resolved
      ));
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, firefox, libraryTick]);

  const activeCandidate = candidates[index] || null;
  const src = activeCandidate?.src || '';
  const labelSeed = (fallbackLabel || domain || '').trim();
  const letter = (Array.from(labelSeed)[0] || '?').toUpperCase();
  const emptyIconColorSeed = (domain || url || fallbackLabel || '').trim().toLowerCase();
  const [emptyIconColor, setEmptyIconColor] = useState<string>(() => getShortcutIconColor(emptyIconColorSeed, iconColor));
  const emptyIconForegroundColor = useMemo(
    () => getAdaptiveShortcutForegroundColor(emptyIconColor),
    [emptyIconColor],
  );
  const resolvedOfficialOverrideColor = (
    activeCandidate?.kind === 'official'
    && hasOfficialIconColorOverride({ officialIconColorOverride })
    && typeof iconColor === 'string'
    && iconColor.trim()
  )
    ? iconColor.trim()
    : '';
  const officialBackgroundColor = (
    resolvedOfficialOverrideColor
    || activeCandidate?.officialDefaultColor
    || emptyIconColor
  );
  const isCustomActive = activeCandidate?.kind === 'official' || activeCandidate?.kind === 'local-custom';
  const useFrame = frame === 'always' || (frame === 'auto' && !isCustomActive);
  const useEmptyFallback = fallbackStyle === 'emptyicon' && !isCustomActive;
  const overlaySize = Math.max(12, Math.round(size * UNIFIED_ICON_GLYPH_CONTENT_RATIO));
  const resolvedCornerRadius = clampShortcutIconCornerRadius(iconCornerRadius);
  const normalizedRemoteIconScale = Math.min(1, Math.max(0.55, remoteIconScale));
  const centeredOverlayImageSize = Math.max(12, Math.round(Math.min(size, overlaySize) * normalizedRemoteIconScale));
  const requestedIconAppearance: ShortcutIconAppearance = iconAppearance;
  const roundedShapeStyle = getShortcutIconSmoothClipPathStyles(resolvedCornerRadius);
  const isOfficialSvg = activeCandidate?.kind === 'official' && isSvgImageSource(src);
  const shouldResolveOfficialSvgTintMode = (
    activeCandidate?.kind === 'official'
    && activeCandidate.officialMode === 'shape-color'
    && isSvgImageSource(src)
    && requestedIconAppearance !== 'colorful'
  );
  const useOfficialSvgFilterTint = shouldResolveOfficialSvgTintMode && officialSvgTintMode === 'filter';
  const useOfficialSvgMask = (
    shouldResolveOfficialSvgTintMode
    && officialSvgTintMode === 'mask'
  );
  const bypassImageTintForOfficialSvg = isOfficialSvg && !useOfficialSvgFilterTint;
  const resolvedImageAppearance: ShortcutIconAppearance = bypassImageTintForOfficialSvg
    ? 'colorful'
    : requestedIconAppearance;
  const useFixedWhiteMonochrome = requestedIconAppearance === 'monochrome' && monochromeTone === 'fixed-white';
  const accentSurfaceColor = 'color-mix(in srgb, var(--primary) 14%, var(--background) 86%)';
  const monochromeSurfaceColor = useFixedWhiteMonochrome
    ? 'color-mix(in srgb, color-mix(in srgb, black 32%, var(--background) 68%) 60%, transparent)'
    : 'var(--shortcut-monochrome-surface-theme-adaptive)';
  const appearanceTileBackgroundColor = requestedIconAppearance === 'accent'
    ? accentSurfaceColor
    : requestedIconAppearance === 'monochrome'
      ? monochromeSurfaceColor
      : '';
  const appearanceTileForegroundColor = requestedIconAppearance === 'accent'
    ? 'var(--primary)'
    : useFixedWhiteMonochrome
      ? FIXED_WHITE_MONOCHROME_COLOR
      : 'var(--foreground)';
  const emptyFallbackBackgroundColor = requestedIconAppearance === 'colorful'
    ? emptyIconColor
    : appearanceTileBackgroundColor;
  const emptyFallbackForegroundColor = requestedIconAppearance === 'colorful'
    ? emptyIconForegroundColor
    : appearanceTileForegroundColor;
  const officialTileBackgroundColor = requestedIconAppearance === 'colorful'
    ? officialBackgroundColor
    : appearanceTileBackgroundColor;
  const colorfulTileSurfaceStyle: CSSProperties | undefined = requestedIconAppearance === 'colorful'
    ? {
        // Keep pure-color tiles, but add a subtle fixed texture gradient for depth.
        backgroundImage: COLORFUL_TILE_TEXTURE_GRADIENT,
      }
    : undefined;
  const monochromeTileSurfaceStyle: CSSProperties | undefined = requestedIconAppearance === 'monochrome'
    ? {
        boxShadow: useFixedWhiteMonochrome
          ? 'inset 0 0 0 0.5px color-mix(in srgb, black 8%, transparent), 0 1px 1.5px rgba(0,0,0,0.14)'
          : 'inset 0 0 0 0.75px color-mix(in srgb, var(--foreground) 10%, transparent), 0 1px 1.5px rgba(0,0,0,0.12)',
      }
    : undefined;
  const iconLightBorderStyle: CSSProperties = {
    ...roundedShapeStyle,
    border: `1px solid ${ICON_SURFACE_BORDER_COLOR}`,
  };

  useEffect(() => {
    setEmptyIconColor(getShortcutIconColor(emptyIconColorSeed, iconColor));
  }, [emptyIconColorSeed, iconColor]);

  useEffect(() => {
    if (!shouldResolveOfficialSvgTintMode || !src) {
      setOfficialSvgTintMode('unknown');
      return;
    }

    const cached = OFFICIAL_SVG_TINT_MODE_CACHE.get(src);
    if (cached) {
      setOfficialSvgTintMode(cached);
      return;
    }

    let cancelled = false;
    setOfficialSvgTintMode('unknown');
    void resolveOfficialSvgTintMode(src).then((mode) => {
      if (cancelled) return;
      setOfficialSvgTintMode(mode);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldResolveOfficialSvgTintMode, src]);

  useEffect(() => {
    if (resolvedImageAppearance === 'colorful') return;
    installShortcutIconFilterDefsAutoSync();
    queueShortcutIconFilterDefsSync();
  }, [resolvedImageAppearance]);

  const handleImageLoad = () => {
    if (domain) clearFaviconFetchFailed(domain);
    const shouldPersistAsFavicon = activeCandidate?.kind === 'favicon' || activeCandidate?.kind === 'provided';
    const shouldPersistAsOfficial = activeCandidate?.kind === 'official';
    if (domain && src && shouldPersistAsOfficial && !src.startsWith('data:') && !cachedOfficialIcon) {
      void cacheOfficialIconData(domain, src).then(() => {
        setCachedOfficialIcon(getCachedOfficialIcon(domain));
      });
    }
    if (!firefox && domain && src && shouldPersistAsFavicon && src !== cachedFavicon) {
      void cacheFaviconData(domain, src).then(() => {
        setCachedFavicon(getCachedFavicon(domain));
      });
    }
  };

  const handleImageError = () => {
    setIndex((prev) => {
      const next = prev + 1;
      if (next < candidates.length) return next;
      if (domain) markFaviconFetchFailed(domain);
      return candidates.length;
    });
  };

  if (useEmptyFallback) {
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 overflow-hidden"
          data-shortcut-icon-surface={monochromeTileSurfaceStyle ? 'enhanced' : undefined}
          style={{
            ...roundedShapeStyle,
            backgroundColor: emptyFallbackBackgroundColor,
            ...colorfulTileSurfaceStyle,
            ...monochromeTileSurfaceStyle,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={iconLightBorderStyle}
        />
        {src ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative select-none" style={{ width: overlaySize, height: overlaySize }}>
              <AppearanceAwareImage
                className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
                appearance={resolvedImageAppearance}
                src={src}
                style={{ width: centeredOverlayImageSize, height: centeredOverlayImageSize }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="select-none leading-none font-['PingFang_SC:Medium',sans-serif] text-foreground"
              style={{ fontSize: fallbackLetterSize, color: emptyFallbackForegroundColor }}
            >
              {letter}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (!src) {
    const innerSize = exact ? size : Math.max(12, Math.round(size * 2 / 3));
    if (useFrame) {
      return (
        <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
          <div
            className="bg-secondary content-stretch flex items-center justify-center p-[6px] relative shrink-0 size-full"
            style={{
              ...roundedShapeStyle,
              backgroundColor: appearanceTileBackgroundColor || undefined,
              ...monochromeTileSurfaceStyle,
            }}
            data-shortcut-icon-surface={monochromeTileSurfaceStyle ? 'enhanced' : undefined}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={iconLightBorderStyle}
            />
            <div
              className="text-[10px] flex items-center justify-center font-['PingFang_SC:Regular',sans-serif] select-none"
              style={{
                width: innerSize,
                height: innerSize,
                color: appearanceTileForegroundColor,
              }}
            >
              {letter}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div
          className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 text-[10px] flex items-center justify-center font-['PingFang_SC:Regular',sans-serif] select-none"
          style={{
            width: innerSize,
            height: innerSize,
            ...roundedShapeStyle,
            backgroundColor: appearanceTileBackgroundColor || 'var(--secondary)',
            color: appearanceTileForegroundColor,
            ...monochromeTileSurfaceStyle,
          }}
          data-shortcut-icon-surface={monochromeTileSurfaceStyle ? 'enhanced' : undefined}
        >
          {letter}
        </div>
      </div>
    );
  }

  if (activeCandidate?.kind === 'local-custom') {
    const scaledSize = size;
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{ width: scaledSize, height: scaledSize, ...roundedShapeStyle }}
        >
          <AppearanceAwareImage
            src={src}
            appearance={requestedIconAppearance}
            tintTarget="photo"
            className="absolute inset-0 max-w-none object-cover pointer-events-none"
            style={{ width: scaledSize, height: scaledSize }}
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={iconLightBorderStyle}
        />
      </div>
    );
  }

  if (activeCandidate?.kind === 'official' && activeCandidate.officialMode === 'shape-color') {
    const officialInnerSize = Math.max(12, Math.round(size * UNIFIED_ICON_GLYPH_CONTENT_RATIO));
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 overflow-hidden"
          data-shortcut-icon-surface={monochromeTileSurfaceStyle ? 'enhanced' : undefined}
          style={{
            ...roundedShapeStyle,
            backgroundColor: officialTileBackgroundColor,
            ...colorfulTileSurfaceStyle,
            ...monochromeTileSurfaceStyle,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={iconLightBorderStyle}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {useOfficialSvgMask ? (
            <AppearanceAwareSvgMask
              className="pointer-events-none"
              appearance={requestedIconAppearance}
              color={appearanceTileForegroundColor}
              src={src}
              style={{ width: officialInnerSize, height: officialInnerSize }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <AppearanceAwareImage
              className="max-w-none object-contain pointer-events-none"
              appearance={resolvedImageAppearance}
              src={src}
              style={{ width: officialInnerSize, height: officialInnerSize }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>
      </div>
    );
  }

  const baseInnerSize = isCustomActive ? size : (exact ? size : Math.max(12, Math.round(size * 2 / 3)));
  const innerSize = activeCandidate?.kind === 'favicon' || activeCandidate?.kind === 'provided'
    ? Math.max(12, Math.round(baseInnerSize * normalizedRemoteIconScale))
    : baseInnerSize;
  const image = useOfficialSvgMask ? (
    <AppearanceAwareSvgMask
      className="absolute inset-0 pointer-events-none"
      appearance={requestedIconAppearance}
      color={appearanceTileForegroundColor}
      src={src}
      style={{ width: innerSize, height: innerSize }}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  ) : (
    <AppearanceAwareImage
      className="absolute inset-0 max-w-none object-contain pointer-events-none"
      appearance={resolvedImageAppearance}
      src={src}
      style={{ width: innerSize, height: innerSize }}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
  if (useFrame) {
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div
          className="bg-secondary content-stretch flex items-center justify-center p-[6px] relative shrink-0 size-full"
          style={{
            ...roundedShapeStyle,
            backgroundColor: requestedIconAppearance === 'colorful' ? undefined : appearanceTileBackgroundColor || undefined,
            ...monochromeTileSurfaceStyle,
          }}
          data-shortcut-icon-surface={monochromeTileSurfaceStyle ? 'enhanced' : undefined}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={iconLightBorderStyle}
          />
          <div className="relative select-none overflow-hidden" style={{ width: innerSize, height: innerSize, ...roundedShapeStyle }}>
            {image}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      <div
        className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 select-none overflow-hidden"
        style={{ width: innerSize, height: innerSize, ...roundedShapeStyle }}
      >
        {image}
      </div>
    </div>
  );
});

export default ShortcutIcon;
