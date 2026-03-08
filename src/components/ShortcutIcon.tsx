import { useEffect, useMemo, useState } from 'react';
import { buildFaviconCandidates, extractDomainFromUrl } from '../utils';

const FAVICON_CACHE_PREFIX = 'favicon_cache_v2:';
const FAVICON_CACHE_INDEX_KEY = 'favicon_cache_v2_index';
const MAX_CACHE_ITEMS = 400;

const normalizeDomain = (domain: string) => {
  let d = domain.trim().toLowerCase();
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
};

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

export default function ShortcutIcon({ icon, url, size = 36, exact }: { icon: string; url: string; size?: number; exact?: boolean }) {
  const domain = extractDomainFromUrl(url);
  const cached = domain ? getCachedFavicon(domain) : '';
  const localIcons = useMemo(() => {
    const mods = (import.meta as any).glob('../assets/Shotcuticons/*.svg', { eager: true, as: 'url' }) as Record<string, string>;
    const map: Record<string, string> = {};
    for (const [p, u] of Object.entries(mods)) {
      const name = p.split('/').pop()!;
      if (name.toLowerCase().endsWith('.svg')) {
        map[name.toLowerCase().replace(/\.svg$/, '')] = u;
      }
    }
    return map;
  }, []);

  const localCandidate = useMemo(() => {
    if (!domain) return '';
    const d = normalizeDomain(domain);
    const withoutWww = d.startsWith('www.') ? d.slice(4) : d;
    const apex = registrableDomain(d);
    const candidates = [
      d,
      withoutWww,
      apex,
      `www.${apex}`,
    ].map((x) => x.toLowerCase());
    for (const c of candidates) {
      if (localIcons[c]) return localIcons[c];
    }
    const indexKey = `index.${apex}`;
    if (localIcons[indexKey]) return localIcons[indexKey];
    return '';
  }, [domain, localIcons]);

  const candidates = useMemo(() => {
    const list: string[] = [];
    if (cached) list.push(cached);
    if (icon) list.push(icon);
    if (domain) list.push(...buildFaviconCandidates(domain));
    return Array.from(new Set(list));
  }, [cached, icon, domain]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.join('|')]);

  const src = candidates[index];
  const letter = domain ? domain[0]?.toUpperCase() : '?';

  if (localCandidate) {
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <img
          alt=""
          className="absolute inset-0 max-w-none object-contain pointer-events-none"
          draggable={false}
          src={localCandidate}
          style={{ width: size, height: size }}
        />
      </div>
    );
  }

  if (!src) {
    const innerSize = exact ? size : Math.max(12, Math.round(size * 2 / 3));
    return (
      <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
        <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 rounded-xl top-1/2 bg-secondary text-[10px] text-foreground flex items-center justify-center font-['PingFang_SC:Regular',sans-serif] select-none" style={{ width: innerSize, height: innerSize }}>
          {letter}
        </div>
      </div>
    );
  }

  const innerSize = exact ? size : Math.max(12, Math.round(size * 2 / 3));
  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 select-none" style={{ width: innerSize, height: innerSize }}>
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
      </div>
    </div>
  );
}
