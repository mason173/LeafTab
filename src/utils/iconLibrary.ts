export type IconLibraryEntry =
  | string
  | {
      path: string;
      sha256?: string;
      updatedAt?: string;
    };

export type IconLibraryManifest = {
  version?: string;
  generatedAt?: string;
  icons?: Record<string, IconLibraryEntry>;
};

export type ResolvedCustomIcon = {
  url: string;
  signature: string;
};

const ICON_LIBRARY_URL_KEY = 'leaftab_icon_library_url';
const ICON_LIBRARY_MANIFEST_KEY = 'leaftab_icon_library_manifest_json';
const ICON_LIBRARY_MANIFEST_ETAG_KEY = 'leaftab_icon_library_manifest_etag';
const ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY = 'leaftab_icon_library_manifest_fetched_at';
const LOCAL_ICON_LIBRARY_BASE_URL = '/leaftab-icons';
const ICON_LIBRARY_MANIFEST_FILE_CANDIDATES = ['icon-library.json', 'manifest.json'] as const;

export const DEFAULT_ICON_LIBRARY_URL = 'https://mason173.github.io/leaftab-icons';
const MANIFEST_TTL_MS = 12 * 60 * 60 * 1000;

const normalizeDomain = (domain: string) => {
  if (!domain || typeof domain !== 'string') return '';
  let d = domain.trim().toLowerCase();
  if (d.startsWith('www.')) d = d.slice(4);
  if (!/^[a-z0-9.-]+$/.test(d)) return '';
  if (!d.includes('.')) return '';
  return d;
};

const registrableDomain = (domain: string) => {
  const d = normalizeDomain(domain);
  if (!d) return '';
  const parts = d.split('.');
  if (parts.length <= 2) return parts.join('.');
  const last2 = parts.slice(-2).join('.');
  const multiSuffixes = new Set([
    'com.cn',
    'net.cn',
    'org.cn',
    'gov.cn',
    'edu.cn',
    'co.uk',
    'org.uk',
    'ac.uk',
    'co.jp',
    'or.jp',
    'ne.jp',
    'ac.jp',
    'go.jp',
    'gr.jp',
    'ed.jp',
    'ad.jp',
    'com.au',
    'net.au',
    'org.au',
    'edu.au',
    'gov.au',
    'com.hk',
    'com.tw',
  ]);
  if (multiSuffixes.has(last2)) {
    if (parts.length >= 3) return parts.slice(-3).join('.');
  }
  return last2;
};

export const normalizeIconLibraryUrl = (input: string) => {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  try {
    new URL(withProtocol);
  } catch {
    return '';
  }
  return withProtocol.replace(/\/+$/, '');
};

export const getIconLibraryUrl = () => {
  try {
    const raw = (localStorage.getItem(ICON_LIBRARY_URL_KEY) || '').trim();
    return raw || DEFAULT_ICON_LIBRARY_URL;
  } catch {
    return DEFAULT_ICON_LIBRARY_URL;
  }
};

export const setIconLibraryUrl = (url: string) => {
  try {
    const normalized = normalizeIconLibraryUrl(url);
    if (!normalized) {
      localStorage.removeItem(ICON_LIBRARY_URL_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_ETAG_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY);
      inMemoryManifest = null;
      inFlight = null;
      window.dispatchEvent(new Event('leaftab-icon-library-changed'));
      return '';
    }
    const prev = (localStorage.getItem(ICON_LIBRARY_URL_KEY) || '').trim();
    localStorage.setItem(ICON_LIBRARY_URL_KEY, normalized);
    if (prev !== normalized) {
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_ETAG_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY);
      inMemoryManifest = null;
      inFlight = null;
    }
    window.dispatchEvent(new Event('leaftab-icon-library-changed'));
    return normalized;
  } catch {
    return '';
  }
};

let inMemoryManifest: IconLibraryManifest | null = null;
let inFlight: Promise<IconLibraryManifest | null> | null = null;
let inMemoryLocalManifest: IconLibraryManifest | null = null;
let inFlightLocal: Promise<IconLibraryManifest | null> | null = null;

const getLocalIconLibraryUrl = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return LOCAL_ICON_LIBRARY_BASE_URL;
  }
  return `${window.location.origin}${LOCAL_ICON_LIBRARY_BASE_URL}`;
};

const readStoredManifest = (): IconLibraryManifest | null => {
  try {
    const raw = localStorage.getItem(ICON_LIBRARY_MANIFEST_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as IconLibraryManifest;
  } catch {
    return null;
  }
};

const readStoredFetchedAt = (): number => {
  try {
    const raw = localStorage.getItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY) || '';
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const writeStoredManifest = (manifest: IconLibraryManifest | null, etag: string | null) => {
  try {
    if (!manifest) {
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_ETAG_KEY);
      localStorage.removeItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY);
      return;
    }
    localStorage.setItem(ICON_LIBRARY_MANIFEST_KEY, JSON.stringify(manifest));
    if (etag) localStorage.setItem(ICON_LIBRARY_MANIFEST_ETAG_KEY, etag);
    localStorage.setItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY, String(Date.now()));
  } catch {}
};

const normalizeManifest = (raw: any): IconLibraryManifest | null => {
  if (!raw || typeof raw !== 'object') return null;
  const iconsRaw = (raw as any).icons;
  const icons: Record<string, IconLibraryEntry> = {};
  if (iconsRaw && typeof iconsRaw === 'object') {
    for (const [k, v] of Object.entries(iconsRaw as Record<string, any>)) {
      const key = normalizeDomain(k);
      if (!key) continue;
      if (typeof v === 'string') {
        if (!v.trim()) continue;
        icons[key] = v.trim();
        continue;
      }
      if (v && typeof v === 'object' && typeof (v as any).path === 'string' && (v as any).path.trim()) {
        icons[key] = {
          path: (v as any).path.trim(),
          sha256: typeof (v as any).sha256 === 'string' ? (v as any).sha256.trim() : undefined,
          updatedAt: typeof (v as any).updatedAt === 'string' ? (v as any).updatedAt.trim() : undefined,
        };
      }
    }
  }
  return {
    version: typeof (raw as any).version === 'string' ? (raw as any).version : undefined,
    generatedAt: typeof (raw as any).generatedAt === 'string' ? (raw as any).generatedAt : undefined,
    icons,
  };
};

const fetchManifestJson = async ({
  baseUrl,
  headers,
  cache,
}: {
  baseUrl: string;
  headers?: Record<string, string>;
  cache?: RequestCache;
}) => {
  for (const fileName of ICON_LIBRARY_MANIFEST_FILE_CANDIDATES) {
    const resp = await fetch(`${baseUrl}/${fileName}`, {
      method: 'GET',
      credentials: 'omit',
      headers,
      cache,
    });
    if (resp.ok || resp.status === 304) {
      return resp;
    }
  }
  return null;
};

export const fetchIconLibraryManifest = async (options?: { force?: boolean }) => {
  const baseUrl = getIconLibraryUrl();
  if (!baseUrl) return null;

  if (!options?.force && inMemoryManifest) return inMemoryManifest;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const storedFetchedAt = readStoredFetchedAt();
    const storedManifest = readStoredManifest();
    if (!options?.force && storedManifest && storedFetchedAt && Date.now() - storedFetchedAt < MANIFEST_TTL_MS) {
      inMemoryManifest = storedManifest;
      return storedManifest;
    }

    let etag: string | null = null;
    try {
      etag = (localStorage.getItem(ICON_LIBRARY_MANIFEST_ETAG_KEY) || '').trim() || null;
    } catch {}

    try {
      const headers: Record<string, string> = {};
      if (etag) headers['If-None-Match'] = etag;
      const resp = await fetchManifestJson({ baseUrl, headers });
      if (!resp) {
        inMemoryManifest = storedManifest || null;
        return inMemoryManifest;
      }
      if (resp.status === 304 && storedManifest) {
        inMemoryManifest = storedManifest;
        try {
          localStorage.setItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY, String(Date.now()));
        } catch {}
        return storedManifest;
      }
      if (!resp.ok) {
        inMemoryManifest = storedManifest || null;
        return inMemoryManifest;
      }
      const nextEtag = resp.headers.get('etag');
      const json = await resp.json();
      const normalized = normalizeManifest(json);
      if (!normalized) {
        inMemoryManifest = storedManifest || null;
        return inMemoryManifest;
      }
      writeStoredManifest(normalized, nextEtag || etag);
      inMemoryManifest = normalized;
      return normalized;
    } catch {
      inMemoryManifest = storedManifest || null;
      return inMemoryManifest;
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

const fetchLocalIconLibraryManifest = async (options?: { force?: boolean }) => {
  if (!options?.force && inMemoryLocalManifest) return inMemoryLocalManifest;
  if (inFlightLocal) return inFlightLocal;

  const baseUrl = getLocalIconLibraryUrl();
  inFlightLocal = (async () => {
    try {
      const resp = await fetchManifestJson({ baseUrl, cache: 'force-cache' });
      if (!resp || !resp.ok) {
        inMemoryLocalManifest = null;
        return null;
      }
      const json = await resp.json();
      const normalized = normalizeManifest(json);
      inMemoryLocalManifest = normalized;
      return normalized;
    } catch {
      inMemoryLocalManifest = null;
      return null;
    }
  })();

  try {
    return await inFlightLocal;
  } finally {
    inFlightLocal = null;
  }
};

export const warmIconLibraryManifestCache = async (options?: { force?: boolean }) => {
  await fetchLocalIconLibraryManifest(options);
  return fetchIconLibraryManifest(options);
};

const resolveEntry = (manifest: IconLibraryManifest, domain: string): { entry: IconLibraryEntry; key: string } | null => {
  const d = normalizeDomain(domain);
  if (!d) return null;
  const apex = registrableDomain(d);
  const candidates = [d, apex, `www.${apex}`].filter(Boolean);
  for (const key of candidates) {
    const v = manifest.icons?.[key];
    if (!v) continue;
    return { entry: v, key };
  }
  // Fallback: treat subdomain icon keys under the same registrable domain as supported.
  // Example: index.baidu.com entry can satisfy baidu.com matching.
  if (manifest.icons && apex) {
    let fallbackKey = '';
    for (const key of Object.keys(manifest.icons)) {
      if (registrableDomain(key) !== apex) continue;
      if (!fallbackKey || key.length < fallbackKey.length || (key.length === fallbackKey.length && key < fallbackKey)) {
        fallbackKey = key;
      }
    }
    if (fallbackKey) {
      const entry = manifest.icons[fallbackKey];
      if (entry) return { entry, key: fallbackKey };
    }
  }
  return null;
};

const buildResolvedCustomIcon = (
  baseUrl: string,
  resolved: { entry: IconLibraryEntry; key: string }
): ResolvedCustomIcon => {
  const { entry, key } = resolved;
  const path = typeof entry === 'string' ? entry : entry.path;
  const url = `${baseUrl}/${path.replace(/^\/+/, '')}`;
  const signature =
    typeof entry === 'string'
      ? `path:${key}:${path}`
      : `path:${key}:${entry.path}|sha:${entry.sha256 || ''}|u:${entry.updatedAt || ''}`;
  return { url, signature };
};

export const resolveCustomIconFromCache = (domain: string): ResolvedCustomIcon | null => {
  const localBaseUrl = getLocalIconLibraryUrl();
  const localManifest = inMemoryLocalManifest;
  if (localManifest?.icons) {
    const localResolved = resolveEntry(localManifest, domain);
    if (localResolved) return buildResolvedCustomIcon(localBaseUrl, localResolved);
  }

  const baseUrl = getIconLibraryUrl();
  if (!baseUrl) return null;
  const manifest = inMemoryManifest || readStoredManifest();
  if (!manifest || !manifest.icons) return null;
  inMemoryManifest = manifest;
  const resolved = resolveEntry(manifest, domain);
  if (!resolved) return null;
  return buildResolvedCustomIcon(baseUrl, resolved);
};

export const resolveCustomIcon = async (domain: string) => {
  const localBaseUrl = getLocalIconLibraryUrl();
  const localCached = resolveCustomIconFromCache(domain);
  const localManifest = await fetchLocalIconLibraryManifest();
  if (localManifest?.icons) {
    const localResolved = resolveEntry(localManifest, domain);
    if (localResolved) return buildResolvedCustomIcon(localBaseUrl, localResolved);
  }

  const baseUrl = getIconLibraryUrl();
  if (!baseUrl) return localCached;
  const cached = localCached;
  const manifest = await fetchIconLibraryManifest();
  if (!manifest || !manifest.icons) return cached;
  const resolved = resolveEntry(manifest, domain);
  if (!resolved) return cached;
  return buildResolvedCustomIcon(baseUrl, resolved);
};
