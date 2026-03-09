import { useEffect, useMemo, useState } from 'react';
import { buildFaviconCandidates, extractDomainFromUrl } from '../utils';
import { resolveCustomIcon, resolveCustomIconFromCache } from '@/utils/iconLibrary';

const FAVICON_CACHE_PREFIX = 'favicon_cache_v2:';
const FAVICON_CACHE_INDEX_KEY = 'favicon_cache_v2_index';
const MAX_CACHE_ITEMS = 400;

const normalizeDomain = (domain: string) => {
  let d = domain.trim().toLowerCase();
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
};

const isIowenFaviconUrl = (value: string) => /^https:\/\/api\.iowen\.cn\/favicon\/.+\.png$/i.test((value || '').trim());

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
    return localStorage.getItem(k1) || localStorage.getItem(k2) || '';
  } catch {
    return '';
  }
}

function setCachedFavicon(domain: string, data: string) {
  try {
    const d = normalizeDomain(domain);
    const key = `${FAVICON_CACHE_PREFIX}${d}`;
    localStorage.setItem(key, data);
    const raw = localStorage.getItem(FAVICON_CACHE_INDEX_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const idx = list.indexOf(d);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(d);
    while (list.length > MAX_CACHE_ITEMS) {
      const removed = list.pop();
      if (removed) {
        localStorage.removeItem(`${FAVICON_CACHE_PREFIX}${removed}`);
      }
    }
    localStorage.setItem(FAVICON_CACHE_INDEX_KEY, JSON.stringify(list));
  } catch {}
}

function clearCachedFavicon(domain: string) {
  try {
    const d1 = normalizeDomain(domain);
    const d2 = registrableDomain(domain);
    if (d1) localStorage.removeItem(`${FAVICON_CACHE_PREFIX}${d1}`);
    if (d2) localStorage.removeItem(`${FAVICON_CACHE_PREFIX}${d2}`);
    const raw = localStorage.getItem(FAVICON_CACHE_INDEX_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((v) => v !== d1 && v !== d2);
    localStorage.setItem(FAVICON_CACHE_INDEX_KEY, JSON.stringify(filtered));
  } catch {}
}

const ICON_META_PREFIX = 'favicon_cache_v2_meta:';

function getCachedIconSignature(domain: string) {
  try {
    const d = normalizeDomain(domain);
    if (!d) return '';
    return localStorage.getItem(`${ICON_META_PREFIX}${d}`) || '';
  } catch {
    return '';
  }
}

function setCachedIconSignature(domain: string, signature: string) {
  try {
    const d = normalizeDomain(domain);
    if (!d) return;
    if (!signature) {
      localStorage.removeItem(`${ICON_META_PREFIX}${d}`);
      return;
    }
    localStorage.setItem(`${ICON_META_PREFIX}${d}`, signature);
  } catch {}
}

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

async function cacheFaviconData(domain: string, src: string) {
  if (!src) return;
  
  if (src.startsWith('data:')) {
      setCachedFavicon(domain, src);
      return;
  }

  try {
    const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    
    setCachedFavicon(domain, base64);
  } catch (error) {
    try {
      const proxyUrl = `https://icon.horse/icon/${domain}`;
      const resp = await fetch(proxyUrl, { mode: 'cors', credentials: 'omit' });
      if (!resp.ok) throw new Error('Icon proxy failed');
      const blob = await resp.blob();
      const base64 = await blobToBase64(blob);
      setCachedFavicon(domain, base64);
    } catch (proxyError) {
    }
  }
}

export default function ShortcutIcon({
  icon,
  url,
  size = 36,
  exact,
  frame = 'never',
}: {
  icon: string;
  url: string;
  size?: number;
  exact?: boolean;
  frame?: 'auto' | 'always' | 'never';
}) {
  const domain = extractDomainFromUrl(url);
  const cached = domain ? getCachedFavicon(domain) : '';
  const [customIconUrl, setCustomIconUrl] = useState<string>(() => {
    if (!domain) return '';
    return resolveCustomIconFromCache(domain)?.url || '';
  });
  const [libraryTick, setLibraryTick] = useState(0);

  const candidates = useMemo(() => {
    const list: string[] = [];
    if (customIconUrl) list.push(customIconUrl);
    if (cached) list.push(cached);
    // Stored iowen proxy URLs are legacy/unreliable; use dynamic candidates instead.
    if (icon && !isIowenFaviconUrl(icon)) list.push(icon);
    if (domain) list.push(...buildFaviconCandidates(domain));
    return Array.from(new Set(list));
  }, [cached, customIconUrl, icon, domain]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.join('|')]);

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
      const resolved = await resolveCustomIcon(domain);
      if (cancelled) return;
      if (!resolved?.url) {
        setCustomIconUrl('');
        return;
      }
      const prevSig = getCachedIconSignature(domain);
      if (resolved.signature && prevSig && prevSig !== resolved.signature) {
        clearCachedFavicon(domain);
      }
      if (resolved.signature && prevSig !== resolved.signature) {
        setCachedIconSignature(domain, resolved.signature);
      }
      setCustomIconUrl((prev) => (prev === resolved.url ? prev : resolved.url));
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, libraryTick]);

  const src = candidates[index];
  const letter = domain ? domain[0]?.toUpperCase() : '?';
  const isCustomActive = !!customIconUrl && src === customIconUrl;
  const useFrame = frame === 'always' || (frame === 'auto' && !isCustomActive);

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

  const innerSize = isCustomActive ? size : (exact ? size : Math.max(12, Math.round(size * 2 / 3)));
  const image = (
    <img
      alt=""
      className="absolute inset-0 max-w-none object-contain pointer-events-none"
      draggable={false}
      src={src}
      style={{ width: innerSize, height: innerSize }}
      onLoad={() => {
        if (domain && src && src !== cached) {
          cacheFaviconData(domain, src);
        }
      }}
      onError={() => {
        setIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : prev));
      }}
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
}
