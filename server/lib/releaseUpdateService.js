const GITHUB_RELEASE_LATEST_WEB = 'https://github.com/mason173/LeafTab/releases/latest';
const GITHUB_RELEASE_LATEST_API = 'https://api.github.com/repos/mason173/LeafTab/releases/latest';
const GITHUB_RELEASE_TAG_PREFIX = 'https://github.com/mason173/LeafTab/releases/tag/v';

const normalizeVersion = (raw) => String(raw || '').trim().replace(/^v/i, '');

const extractVersionFromReleaseUrl = (url) => {
  const match = String(url || '').match(/\/releases\/tag\/([^/?#]+)/i);
  if (!match) return '';
  try {
    return normalizeVersion(decodeURIComponent(match[1]));
  } catch (_) {
    return normalizeVersion(match[1]);
  }
};

const parseReleaseNotes = (body) => {
  if (typeof body !== 'string') return [];
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);
};

function createReleaseUpdateService(options = {}) {
  const githubToken = String(options.githubToken || '').trim();
  const cacheTtlMs = Number.isFinite(options.cacheTtlMs) ? options.cacheTtlMs : 10 * 60 * 1000;
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : globalThis.fetch;

  let releaseCache = {
    checkedAt: 0,
    data: null,
  };
  let releaseRefreshPromise = null;

  const fetchLatestReleaseInfo = async () => {
    if (typeof fetchImpl !== 'function') return null;

    // Prefer web latest redirect to avoid API 403/rate-limit.
    try {
      const resp = await fetchImpl(GITHUB_RELEASE_LATEST_WEB, {
        cache: 'no-store',
        redirect: 'follow',
      });
      if (resp.ok) {
        const finalUrl = typeof resp.url === 'string' ? resp.url : '';
        const version = extractVersionFromReleaseUrl(finalUrl);
        if (version) {
          return {
            version,
            url: finalUrl || `${GITHUB_RELEASE_TAG_PREFIX}${version}`,
            publishedAt: '',
            notes: [],
          };
        }
      }
    } catch (_) {}

    try {
      const headers = { Accept: 'application/vnd.github+json' };
      if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
      }
      const resp = await fetchImpl(GITHUB_RELEASE_LATEST_API, {
        headers,
        cache: 'no-store',
      });
      if (!resp.ok) return null;
      const payload = await resp.json();
      if (payload?.draft === true || payload?.prerelease === true) return null;
      const version = normalizeVersion(payload?.tag_name || '');
      if (!version) return null;
      return {
        version,
        url: typeof payload?.html_url === 'string' && payload.html_url.trim()
          ? payload.html_url
          : `${GITHUB_RELEASE_TAG_PREFIX}${version}`,
        publishedAt: typeof payload?.published_at === 'string' ? payload.published_at : '',
        notes: parseReleaseNotes(payload?.body),
      };
    } catch (_) {
      return null;
    }
  };

  const getLatestReleaseCached = async () => {
    const cacheFresh = releaseCache.data && (Date.now() - releaseCache.checkedAt) <= cacheTtlMs;
    if (cacheFresh) return releaseCache.data;
    if (releaseRefreshPromise) return releaseRefreshPromise;

    releaseRefreshPromise = (async () => {
      const latest = await fetchLatestReleaseInfo();
      if (latest) {
        releaseCache = { checkedAt: Date.now(), data: latest };
        return latest;
      }
      return releaseCache.data;
    })().finally(() => {
      releaseRefreshPromise = null;
    });

    return releaseRefreshPromise;
  };

  return {
    getLatestReleaseCached,
  };
}

module.exports = {
  createReleaseUpdateService,
};
