import { normalizeSearchQuery } from '@/utils/searchHelpers';

type PinyinModule = typeof import('pinyin-pro');

const HAN_CHARACTER_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const WHITESPACE_RE = /\s+/g;
const PINYIN_TOKEN_CACHE_LIMIT = 500;
const pinyinTokenCache = new Map<string, string[]>();
let pinyinModulePromise: Promise<PinyinModule> | null = null;

function normalizeSpacedSearchTokenString(rawValue: string): string {
  return normalizeSearchQuery(rawValue).replace(WHITESPACE_RE, ' ');
}

function buildTokenInitialsToken(rawValue: string): string {
  const normalized = normalizeSpacedSearchTokenString(rawValue);
  if (!normalized) return '';

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((token) => token[0])
    .join('');
}

function readCachedPinyinTokens(key: string): string[] | null {
  const cached = pinyinTokenCache.get(key);
  if (!cached) return null;
  pinyinTokenCache.delete(key);
  pinyinTokenCache.set(key, cached);
  return cached;
}

function writeCachedPinyinTokens(key: string, tokens: string[]) {
  if (pinyinTokenCache.has(key)) {
    pinyinTokenCache.delete(key);
  }
  pinyinTokenCache.set(key, tokens);
  while (pinyinTokenCache.size > PINYIN_TOKEN_CACHE_LIMIT) {
    const oldestKey = pinyinTokenCache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    pinyinTokenCache.delete(oldestKey);
  }
}

export function hasHanCharacters(rawValue: string): boolean {
  return HAN_CHARACTER_RE.test(rawValue);
}

async function loadPinyinModule(): Promise<PinyinModule> {
  if (!pinyinModulePromise) {
    pinyinModulePromise = import('pinyin-pro');
  }
  return pinyinModulePromise;
}

export async function buildPinyinSearchTokens(rawValue: string): Promise<string[]> {
  const normalized = normalizeSearchQuery(rawValue);
  if (!normalized || !hasHanCharacters(normalized)) return [];

  const cached = readCachedPinyinTokens(normalized);
  if (cached) return cached;

  const { pinyin } = await loadPinyinModule();
  const fullSpaced = normalizeSpacedSearchTokenString(
    pinyin(normalized, {
      toneType: 'none',
      nonZh: 'consecutive',
    }),
  );
  const firstSpaced = normalizeSpacedSearchTokenString(
    pinyin(normalized, {
      pattern: 'first',
      toneType: 'none',
      nonZh: 'consecutive',
    }),
  );

  const tokens = Array.from(new Set([
    fullSpaced,
    fullSpaced.replace(WHITESPACE_RE, ''),
    buildTokenInitialsToken(fullSpaced),
    firstSpaced.replace(WHITESPACE_RE, ''),
    buildTokenInitialsToken(firstSpaced),
  ].filter(Boolean)));

  writeCachedPinyinTokens(normalized, tokens);
  return tokens;
}
