export type IconLibraryEntry =
  | string
  | {
      mode?: 'shape-color';
      shapePath?: string;
      defaultColor?: string;
      path?: string;
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
  mode: 'shape-color' | 'legacy-image';
  defaultColor?: string;
};

const LOCAL_ICON_LIBRARY_BASE_URL = '/leaftab-icons';
const ICON_LIBRARY_MANIFEST_FILE = 'icon-library.json';
const LEGACY_REMOTE_ICON_LIBRARY_STORAGE_KEYS = [
  'leaftab_icon_library_url',
  'leaftab_icon_library_manifest_json',
  'leaftab_icon_library_manifest_etag',
  'leaftab_icon_library_manifest_fetched_at',
] as const;

const normalizeHexColor = (value: string | null | undefined) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  const matched = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (!matched) return '';
  return `#${matched[1].toUpperCase()}`;
};

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

let inMemoryLocalManifest: IconLibraryManifest | null = null;
let inFlightLocal: Promise<IconLibraryManifest | null> | null = null;
let legacyRemoteStorageCleared = false;

const clearLegacyRemoteIconLibraryState = () => {
  if (legacyRemoteStorageCleared || typeof localStorage === 'undefined') return;
  legacyRemoteStorageCleared = true;
  try {
    for (const key of LEGACY_REMOTE_ICON_LIBRARY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {}
};

const getLocalIconLibraryUrl = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return LOCAL_ICON_LIBRARY_BASE_URL;
  }
  return `${window.location.origin}${LOCAL_ICON_LIBRARY_BASE_URL}`;
};

const normalizeManifest = (raw: unknown): IconLibraryManifest | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const iconsRaw = (raw as { icons?: unknown }).icons;
  const icons: Record<string, IconLibraryEntry> = {};

  if (iconsRaw && typeof iconsRaw === 'object' && !Array.isArray(iconsRaw)) {
    for (const [k, v] of Object.entries(iconsRaw as Record<string, unknown>)) {
      const key = normalizeDomain(k);
      if (!key) continue;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) continue;
        icons[key] = trimmed;
        continue;
      }
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;

      const pathValue = typeof (v as { path?: unknown }).path === 'string' ? (v as { path: string }).path.trim() : '';
      const shapePathValue = typeof (v as { shapePath?: unknown }).shapePath === 'string'
        ? (v as { shapePath: string }).shapePath.trim()
        : '';
      const defaultColorValue = normalizeHexColor(
        typeof (v as { defaultColor?: unknown }).defaultColor === 'string'
          ? (v as { defaultColor: string }).defaultColor
          : '',
      );
      if (!pathValue && !shapePathValue) continue;

      icons[key] = {
        mode: (v as { mode?: unknown }).mode === 'shape-color' || (shapePathValue && defaultColorValue)
          ? 'shape-color'
          : undefined,
        path: pathValue || undefined,
        shapePath: shapePathValue || undefined,
        defaultColor: defaultColorValue || undefined,
        sha256: typeof (v as { sha256?: unknown }).sha256 === 'string' ? (v as { sha256: string }).sha256.trim() : undefined,
        updatedAt: typeof (v as { updatedAt?: unknown }).updatedAt === 'string'
          ? (v as { updatedAt: string }).updatedAt.trim()
          : undefined,
      };
    }
  }

  return {
    version: typeof (raw as { version?: unknown }).version === 'string' ? (raw as { version: string }).version : undefined,
    generatedAt: typeof (raw as { generatedAt?: unknown }).generatedAt === 'string'
      ? (raw as { generatedAt: string }).generatedAt
      : undefined,
    icons,
  };
};

const fetchManifestJson = async ({
  baseUrl,
  cache,
}: {
  baseUrl: string;
  cache?: RequestCache;
}) => {
  const resp = await fetch(`${baseUrl}/${ICON_LIBRARY_MANIFEST_FILE}`, {
    method: 'GET',
    credentials: 'omit',
    cache,
  });
  return resp.ok ? resp : null;
};

const fetchLocalIconLibraryManifest = async (options?: { force?: boolean }) => {
  clearLegacyRemoteIconLibraryState();

  if (!options?.force && inMemoryLocalManifest) return inMemoryLocalManifest;
  if (inFlightLocal) return inFlightLocal;

  const baseUrl = getLocalIconLibraryUrl();
  inFlightLocal = (async () => {
    try {
      const resp = await fetchManifestJson({ baseUrl, cache: 'force-cache' });
      if (!resp) {
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
  return fetchLocalIconLibraryManifest(options);
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

  // Allow subdomain-specific local icon entries to satisfy the same registrable domain.
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
  resolved: { entry: IconLibraryEntry; key: string },
): ResolvedCustomIcon => {
  const { entry, key } = resolved;
  if (typeof entry === 'string') {
    const url = `${baseUrl}/${entry.replace(/^\/+/, '')}`;
    return {
      url,
      signature: `path:${key}:${entry}`,
      mode: 'legacy-image',
    };
  }

  const shapePath = typeof entry.shapePath === 'string' ? entry.shapePath.trim() : '';
  const defaultColor = normalizeHexColor(entry.defaultColor);
  if (shapePath && defaultColor) {
    const url = `${baseUrl}/${shapePath.replace(/^\/+/, '')}`;
    return {
      url,
      signature: `shape:${key}:${shapePath}|color:${defaultColor}|sha:${entry.sha256 || ''}|u:${entry.updatedAt || ''}`,
      mode: 'shape-color',
      defaultColor,
    };
  }

  const path = typeof entry.path === 'string' ? entry.path.trim() : '';
  const url = `${baseUrl}/${path.replace(/^\/+/, '')}`;
  return {
    url,
    signature: `path:${key}:${path}|sha:${entry.sha256 || ''}|u:${entry.updatedAt || ''}`,
    mode: 'legacy-image',
  };
};

export const resolveCustomIconFromCache = (domain: string): ResolvedCustomIcon | null => {
  clearLegacyRemoteIconLibraryState();

  const localManifest = inMemoryLocalManifest;
  if (!localManifest?.icons) return null;

  const localResolved = resolveEntry(localManifest, domain);
  if (!localResolved) return null;
  return buildResolvedCustomIcon(getLocalIconLibraryUrl(), localResolved);
};

export const resolveCustomIcon = async (domain: string) => {
  clearLegacyRemoteIconLibraryState();

  const cached = resolveCustomIconFromCache(domain);
  const localManifest = await fetchLocalIconLibraryManifest();
  if (!localManifest?.icons) return cached;

  const localResolved = resolveEntry(localManifest, domain);
  if (!localResolved) return cached;
  return buildResolvedCustomIcon(getLocalIconLibraryUrl(), localResolved);
};
