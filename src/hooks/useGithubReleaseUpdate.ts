import { useEffect, useMemo, useState } from 'react';

const LATEST_RELEASE_API = 'https://api.github.com/repos/mason173/LeafTab/releases/latest';
const LATEST_RELEASE_WEB = 'https://github.com/mason173/LeafTab/releases/latest';
const RELEASE_TAG_FALLBACK_URL = 'https://github.com/mason173/LeafTab/releases/tag/v';
const UPDATE_IGNORE_VERSION_KEY = 'leaftab_update_ignore_version';
const UPDATE_CACHE_KEY = 'leaftab_update_release_cache_v1';
const UPDATE_SNOOZE_UNTIL_KEY = 'leaftab_update_snooze_until';
const UPDATE_SNOOZE_VERSION_KEY = 'leaftab_update_snooze_version';
const UPDATE_CACHE_TTL_MS = 30 * 60 * 1000;
const UPDATE_SNOOZE_TTL_MS = 24 * 60 * 60 * 1000;

type ReleaseInfo = {
  version: string;
  url: string;
  publishedAt: string;
  notes: string[];
};

type CachedReleaseInfo = ReleaseInfo & {
  checkedAt: number;
};

type GithubReleasePayload = {
  tag_name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  body?: unknown;
  draft?: unknown;
  prerelease?: unknown;
};

type BackendReleasePayload = {
  version?: unknown;
  url?: unknown;
  publishedAt?: unknown;
  notes?: unknown;
};

const normalizeVersion = (raw: string): string => raw.trim().replace(/^v/i, '');

const extractVersionFromReleaseUrl = (url: string): string => {
  const match = String(url || '').match(/\/releases\/tag\/([^/?#]+)/i);
  if (!match) return '';
  try {
    return normalizeVersion(decodeURIComponent(match[1]));
  } catch {
    return normalizeVersion(match[1]);
  }
};

const normalizeApiBase = (raw: string): string => {
  const trimmed = String(raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return trimmed;
  } catch {}
  return '';
};

const resolveBackendUpdateUrl = (apiBase: string): string => {
  const base = normalizeApiBase(apiBase);
  if (!base) return '';
  return `${base}/update/latest`;
};

const toVersionParts = (raw: string): number[] => {
  const core = normalizeVersion(raw).split('-')[0];
  return core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
};

const compareVersions = (a: string, b: string): number => {
  const pa = toVersionParts(a);
  const pb = toVersionParts(b);
  const maxLen = Math.max(pa.length, pb.length);
  for (let i = 0; i < maxLen; i += 1) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
};

const parseNotes = (body: string): string[] =>
  body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !/^更新内容[:：]?$/i.test(line))
    .filter((line) => !/^changelog[:：]?$/i.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);

const parseNotesInput = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item || '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 20);
  }
  if (typeof raw === 'string') {
    return parseNotes(raw);
  }
  return [];
};

const getCurrentVersion = async (): Promise<string> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
      const version = chrome.runtime.getManifest().version;
      if (typeof version === 'string' && version.trim()) return normalizeVersion(version);
    }
  } catch {}
  try {
    const resp = await fetch('/manifest.json', { cache: 'no-store' });
    if (resp.ok) {
      const manifest = await resp.json();
      const version = typeof manifest?.version === 'string' ? manifest.version : '';
      if (version.trim()) return normalizeVersion(version);
    }
  } catch {}
  return '0.0.0';
};

const readCachedRelease = (): CachedReleaseInfo | null => {
  try {
    const raw = localStorage.getItem(UPDATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedReleaseInfo;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.version !== 'string' || typeof parsed.url !== 'string' || typeof parsed.publishedAt !== 'string' || !Array.isArray(parsed.notes)) {
      return null;
    }
    if (!Number.isFinite(parsed.checkedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedRelease = (release: ReleaseInfo) => {
  try {
    const payload: CachedReleaseInfo = {
      ...release,
      checkedAt: Date.now(),
    };
    localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(payload));
  } catch {}
};

const fetchLatestReleaseFromBackend = async (apiBase: string): Promise<ReleaseInfo | null> => {
  const endpoint = resolveBackendUpdateUrl(apiBase);
  if (!endpoint) return null;
  try {
    const resp = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as BackendReleasePayload;
    const versionRaw = typeof data.version === 'string' ? data.version : '';
    const version = normalizeVersion(versionRaw);
    if (!version) return null;
    const url = typeof data.url === 'string' && data.url.trim()
      ? data.url
      : `${RELEASE_TAG_FALLBACK_URL}${version}`;
    const publishedAt = typeof data.publishedAt === 'string' ? data.publishedAt : '';
    const notes = parseNotesInput(data.notes);
    return { version, url, publishedAt, notes };
  } catch {
    return null;
  }
};

const fetchLatestReleaseFromGithub = async (): Promise<ReleaseInfo | null> => {
  // Prefer API first to get release notes. Fall back to web redirect if unavailable.
  try {
    const resp = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    });
    if (resp.ok) {
      const data = (await resp.json()) as GithubReleasePayload;
      if (data.draft === true || data.prerelease === true) return null;
      const tag = typeof data.tag_name === 'string' ? data.tag_name : '';
      const url = typeof data.html_url === 'string' ? data.html_url : '';
      if (!tag || !url) return null;
      const version = normalizeVersion(tag);
      const publishedAt = typeof data.published_at === 'string' ? data.published_at : '';
      const notes = typeof data.body === 'string' ? parseNotes(data.body) : [];
      return { version, url, publishedAt, notes };
    }
  } catch {}

  // Fallback to "latest" redirect (version only, no notes).
  try {
    const resp = await fetch(LATEST_RELEASE_WEB, {
      cache: 'no-store',
      redirect: 'follow',
    });
    if (resp.ok) {
      const redirected = typeof resp.url === 'string' ? resp.url : '';
      const version = extractVersionFromReleaseUrl(redirected);
      if (version) {
        return {
          version,
          url: redirected || `${RELEASE_TAG_FALLBACK_URL}${version}`,
          publishedAt: '',
          notes: [],
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

export function useGithubReleaseUpdate(apiBase: string) {
  const [open, setOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('0.0.0');
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((import.meta as any).env?.DEV) {
      setLoading(false);
      return;
    }

    let canceled = false;

    const run = async () => {
      setLoading(true);
      const localVersion = await getCurrentVersion();
      if (canceled) return;
      setCurrentVersion(localVersion);

      const ignoredVersion = (() => {
        try {
          return normalizeVersion(localStorage.getItem(UPDATE_IGNORE_VERSION_KEY) || '');
        } catch {
          return '';
        }
      })();
      const snoozeInfo = (() => {
        try {
          const version = normalizeVersion(localStorage.getItem(UPDATE_SNOOZE_VERSION_KEY) || '');
          const untilRaw = Number(localStorage.getItem(UPDATE_SNOOZE_UNTIL_KEY) || 0);
          const until = Number.isFinite(untilRaw) ? untilRaw : 0;
          return { version, until };
        } catch {
          return { version: '', until: 0 };
        }
      })();

      const cached = readCachedRelease();
      const cacheFresh = !!cached && Date.now() - cached.checkedAt <= UPDATE_CACHE_TTL_MS;
      const latest = cacheFresh
        ? cached
        : (await fetchLatestReleaseFromBackend(apiBase))
          || (await fetchLatestReleaseFromGithub())
          || cached;
      if (!cacheFresh && latest) writeCachedRelease(latest);

      if (canceled) return;
      if (!latest) {
        setLoading(false);
        return;
      }

      const hasUpdate = compareVersions(latest.version, localVersion) > 0;
      const inSnoozeWindow = snoozeInfo.version === latest.version && Date.now() < snoozeInfo.until;
      const shouldOpen = hasUpdate && ignoredVersion !== latest.version && !inSnoozeWindow;
      setRelease(latest);
      setOpen(shouldOpen);
      setLoading(false);
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [apiBase]);

  const ignoreCurrentRelease = () => {
    if (!release) return;
    try {
      localStorage.setItem(UPDATE_IGNORE_VERSION_KEY, release.version);
      localStorage.removeItem(UPDATE_SNOOZE_VERSION_KEY);
      localStorage.removeItem(UPDATE_SNOOZE_UNTIL_KEY);
    } catch {}
    setOpen(false);
  };

  const snoozeCurrentRelease = () => {
    if (!release) return;
    try {
      localStorage.setItem(UPDATE_SNOOZE_VERSION_KEY, release.version);
      localStorage.setItem(UPDATE_SNOOZE_UNTIL_KEY, String(Date.now() + UPDATE_SNOOZE_TTL_MS));
    } catch {}
    setOpen(false);
  };

  return useMemo(() => ({
    open,
    setOpen,
    loading,
    currentVersion,
    latestVersion: release?.version || '',
    releaseUrl: release?.url || '',
    publishedAt: release?.publishedAt || '',
    notes: release?.notes || [],
    ignoreCurrentRelease,
    snoozeCurrentRelease,
  }), [currentVersion, loading, notesKey(release?.notes), open, release?.publishedAt, release?.url, release?.version]);
}

function notesKey(notes: string[] | undefined): string {
  if (!notes || notes.length === 0) return '';
  return notes.join('\n');
}
