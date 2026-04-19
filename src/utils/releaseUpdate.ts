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
  const core = normalizeReleaseVersion(raw).split('+')[0].split('-')[0];
  return core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

function toPrereleaseParts(raw: string): Array<number | string> | null {
  const normalized = normalizeReleaseVersion(raw).split('+')[0];
  const prereleaseIndex = normalized.indexOf('-');
  if (prereleaseIndex === -1) return null;

  const prerelease = normalized.slice(prereleaseIndex + 1).trim();
  if (!prerelease) return null;

  return prerelease.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return /^\d+$/.test(part) && Number.isFinite(parsed)
      ? parsed
      : part.toLowerCase();
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

  const preA = toPrereleaseParts(a);
  const preB = toPrereleaseParts(b);
  if (!preA && !preB) return 0;
  if (!preA) return 1;
  if (!preB) return -1;

  const prereleaseMaxLen = Math.max(preA.length, preB.length);
  for (let i = 0; i < prereleaseMaxLen; i += 1) {
    const av = preA[i];
    const bv = preB[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (typeof av === 'number' && typeof bv === 'number') {
      if (av > bv) return 1;
      if (av < bv) return -1;
      continue;
    }
    if (typeof av === 'number') return -1;
    if (typeof bv === 'number') return 1;
    const compared = av.localeCompare(bv);
    if (compared !== 0) return compared > 0 ? 1 : -1;
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
