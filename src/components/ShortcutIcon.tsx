import { memo, useEffect, useId, useMemo, useState } from 'react';
import { buildFaviconCandidates, extractDomainFromUrl, shouldProbeRemoteFaviconForUrl } from '../utils';
import { resolveCustomIcon, resolveCustomIconFromCache } from '@/utils/iconLibrary';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import {
  getShortcutIconColor,
  normalizeShortcutVisualMode,
  shouldUseOfficialShortcutIcon,
} from '@/utils/shortcutIconPreferences';
import type { Shortcut } from '@/types';
import {
  queueCachedLocalStorageRemoveItem,
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';
import {
  readShortcutCustomIcon,
  SHORTCUT_CUSTOM_ICON_CHANGED_EVENT,
} from '@/utils/shortcutCustomIcons';

const FAVICON_CACHE_PREFIX = 'favicon_cache_v2:';
const FAVICON_CACHE_INDEX_KEY = 'favicon_cache_v2_index';
const MAX_CACHE_ITEMS = 400;
const OFFICIAL_ICON_CACHE_PREFIX = 'official_icon_cache_v1:';
const OFFICIAL_ICON_CACHE_INDEX_KEY = 'official_icon_cache_v1_index';
const MAX_OFFICIAL_ICON_CACHE_ITEMS = 160;
const MAX_OFFICIAL_ICON_DATA_LENGTH = 260_000;
const FAVICON_FAIL_PREFIX = 'favicon_cache_v2_fail:';
const FAVICON_FAIL_TTL_MS = 12 * 60 * 60 * 1000;
const EMPTY_ICON_CONTAINER_PATH_D = "M0 36C0.000156948 13.5 6.42873 0.0000175685 36 0C65.5713 -0.0000175684 72 11.8929 72 36C72 61.7143 61.0716 72 36 72C13.8214 72 -0.000192817 63.6429 0 36Z";

const normalizeDomain = (domain: string) => {
  let d = domain.trim().toLowerCase();
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
};

const isIowenFaviconUrl = (value: string) => /^https:\/\/api\.iowen\.cn\/favicon\/.+\.png$/i.test((value || '').trim());
const isDuckDuckGoIp3Url = (value: string) => /^https:\/\/icons\.duckduckgo\.com\/ip3\/.+\.ico$/i.test((value || '').trim());
const isGoogleS2FaviconUrl = (value: string) => /^https:\/\/www\.google\.com\/s2\/favicons\?.+$/i.test((value || '').trim());
const isGoogleGstaticFaviconV2Url = (value: string) => /^https:\/\/t\d*\.gstatic\.com\/faviconV2\?.+$/i.test((value || '').trim());

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
};

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
  iconRendering,
  iconColor,
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
  iconRendering?: Shortcut['iconRendering'];
  iconColor?: Shortcut['iconColor'];
}) {
  const firefox = isFirefoxBuildTarget();
  const domain = useMemo(() => extractDomainFromUrl(url), [url]);
  const canProbeRemoteFavicon = useMemo(() => isHttpFaviconEligible(url, domain), [domain, url]);
  const skipDomainCandidates = useMemo(() => (domain ? shouldSkipDomainCandidates(domain) : false), [domain]);
  const [cachedFavicon, setCachedFavicon] = useState<string>(() => (domain ? getCachedFavicon(domain) : ''));
  const [cachedOfficialIcon, setCachedOfficialIcon] = useState<string>(() => (domain ? getCachedOfficialIcon(domain) : ''));
  const [customIconUrl, setCustomIconUrl] = useState<string>(() => {
    if (!domain) return '';
    return resolveCustomIconFromCache(domain)?.url || '';
  });
  const customIconClipPathId = useId().replace(/:/g, '');
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
      !!customIconUrl ||
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
  }, [cachedFavicon, customIconUrl, domain, firefox, icon, skipDomainCandidates]);

  const candidates = useMemo<IconCandidate[]>(() => {
    const list: IconCandidate[] = [];
    if (effectiveLocalCustomIconDataUrl) {
      list.push({ src: effectiveLocalCustomIconDataUrl, kind: 'local-custom' });
    }
    const shouldUseOfficial = shouldUseOfficialShortcutIcon({
      officialAvailable: Boolean(customIconUrl),
      shortcut: {
        useOfficialIcon,
        autoUseOfficialIcon,
        officialIconAvailableAtSave,
      },
    });
    if (shouldUseOfficial && customIconUrl) {
      if (cachedOfficialIcon) {
        list.push({ src: cachedOfficialIcon, kind: 'official' });
      }
      list.push({ src: customIconUrl, kind: 'official' });
    }
    if (resolvedIconRendering !== 'letter') {
      if (cachedFavicon && (fallbackStyle !== 'emptyicon' || cachedFavicon.startsWith('data:'))) {
        list.push({ src: cachedFavicon, kind: 'favicon' });
      }
      // Stored iowen proxy URLs are legacy/unreliable; use dynamic candidates instead.
      if (icon && !isIowenFaviconUrl(icon)) {
        list.push({ src: icon, kind: 'provided' });
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
    customIconUrl,
    domain,
    exact,
    fallbackStyle,
    firefox,
    firefoxDomainCandidatesReady,
    icon,
    effectiveLocalCustomIconDataUrl,
    officialIconAvailableAtSave,
    resolvedIconRendering,
    size,
    skipDomainCandidates,
    useOfficialIcon,
  ]);

  const [index, setIndex] = useState(0);

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
      setCustomIconUrl('');
      return;
    }
    const cachedResolved = resolveCustomIconFromCache(domain);
    setCustomIconUrl(cachedResolved?.url || '');
  }, [domain, libraryTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!domain) {
        if (!cancelled) setCustomIconUrl('');
        return;
      }
      if (firefox) {
        if (!cancelled) {
          const cachedResolved = resolveCustomIconFromCache(domain);
          setCustomIconUrl(cachedResolved?.url || '');
        }
        return;
      }
      const resolved = await resolveCustomIcon(domain);
      if (cancelled) return;
      if (!resolved?.url) {
        setCustomIconUrl('');
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
      setCustomIconUrl((prev) => (prev === resolved.url ? prev : resolved.url));
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
  const isCustomActive = activeCandidate?.kind === 'official' || activeCandidate?.kind === 'local-custom';
  const useFrame = frame === 'always' || (frame === 'auto' && !isCustomActive);
  const useEmptyFallback = fallbackStyle === 'emptyicon' && !isCustomActive;
  const overlaySize = 24;

  useEffect(() => {
    setEmptyIconColor(getShortcutIconColor(emptyIconColorSeed, iconColor));
  }, [emptyIconColorSeed, iconColor]);

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
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full max-w-none pointer-events-none select-none"
          viewBox="0 0 72 72"
        >
          <path d={EMPTY_ICON_CONTAINER_PATH_D} fill={emptyIconColor} />
          <path d={EMPTY_ICON_CONTAINER_PATH_D} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
        </svg>
        {src ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative select-none" style={{ width: overlaySize, height: overlaySize }}>
              <img
                alt=""
                className="absolute inset-0 max-w-none object-contain pointer-events-none"
                draggable={false}
                src={src}
                style={{ width: overlaySize, height: overlaySize }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="select-none leading-none font-['PingFang_SC:Medium',sans-serif] text-foreground"
              style={{ fontSize: fallbackLetterSize }}
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
          <div className="bg-secondary content-stretch flex items-center justify-center p-[6px] relative rounded-lg shrink-0 size-full">
            <div aria-hidden="true" className="absolute border-border border-[0.5px] border-solid inset-0 pointer-events-none rounded-lg" />
            <div className="text-[10px] text-foreground flex items-center justify-center font-['PingFang_SC:Regular',sans-serif] select-none" style={{ width: innerSize, height: innerSize }}>
              {letter}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 rounded-xl top-1/2 bg-secondary text-[10px] text-foreground flex items-center justify-center font-['PingFang_SC:Regular',sans-serif] select-none" style={{ width: innerSize, height: innerSize }}>
          {letter}
        </div>
      </div>
    );
  }

  if (activeCandidate?.kind === 'local-custom') {
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full max-w-none pointer-events-none select-none"
          viewBox="0 0 72 72"
        >
          <defs>
            <clipPath id={customIconClipPathId}>
              <path d={EMPTY_ICON_CONTAINER_PATH_D} />
            </clipPath>
          </defs>
          <image
            href={src}
            width="72"
            height="72"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${customIconClipPathId})`}
          />
          <path d={EMPTY_ICON_CONTAINER_PATH_D} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  const innerSize = isCustomActive ? size : (exact ? size : Math.max(12, Math.round(size * 2 / 3)));
  const image = (
    <img
      alt=""
      className="absolute inset-0 max-w-none object-contain pointer-events-none"
      draggable={false}
      src={src}
      style={{ width: innerSize, height: innerSize }}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
  if (useFrame) {
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div className="bg-secondary content-stretch flex items-center justify-center p-[6px] relative rounded-lg shrink-0 size-full">
          <div aria-hidden="true" className="absolute border-border border-[0.5px] border-solid inset-0 pointer-events-none rounded-lg" />
          <div className="relative select-none" style={{ width: innerSize, height: innerSize }}>
            {image}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 select-none" style={{ width: innerSize, height: innerSize }}>
        {image}
      </div>
    </div>
  );
});

export default ShortcutIcon;
