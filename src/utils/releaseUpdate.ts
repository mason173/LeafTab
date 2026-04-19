export const RELEASE_TAG_FALLBACK_URL = 'https://github.com/mason173/LeafTab/releases/tag/v';

export function normalizeReleaseVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '');
}

export function extractVersionFromReleaseUrl(url: string): string {
  const match = String(url || '').match(/\/releases\/tag\/([^/?#]+)/i);
  if (!match) return '';
  try {
    return normalizeReleaseVersion(decodeURIComponent(match[1]));
  } catch {
    return normalizeReleaseVersion(match[1]);
  }
}

export function normalizeReleaseApiBase(raw: string): string {
  const trimmed = String(raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return trimmed;
  } catch {}
  return '';
}

export function resolveBackendReleaseUpdateUrl(apiBase: string): string {
  const base = normalizeReleaseApiBase(apiBase);
  if (!base) return '';
  return `${base}/update/latest`;
}

function toVersionParts(raw: string): number[] {
  const core = normalizeReleaseVersion(raw).split('-')[0];
  return core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

export function compareReleaseVersions(a: string, b: string): number {
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
}

export function parseReleaseNotes(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !/^更新内容[:：]?$/i.test(line))
    .filter((line) => !/^changelog[:：]?$/i.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);
}

export function parseReleaseNotesInput(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item || '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 20);
  }
  if (typeof raw === 'string') {
    return parseReleaseNotes(raw);
  }
  return [];
}
