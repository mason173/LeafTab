export const LEAFTAB_SYNC_CUSTOM_ICON_MAX_DATA_URL_LENGTH = 220_000;

export type LeafTabSyncCustomIconSkipReason = 'invalid' | 'oversized' | 'orphaned';

export interface LeafTabSyncCustomIconNormalizationResult {
  icons: Record<string, string>;
  hashes: Record<string, string>;
  skipped: Record<LeafTabSyncCustomIconSkipReason, number>;
}

const createEmptySkipped = (): Record<LeafTabSyncCustomIconSkipReason, number> => ({
  invalid: 0,
  oversized: 0,
  orphaned: 0,
});

const normalizeShortcutId = (shortcutId: unknown) => String(shortcutId || '').trim();

export const hashLeafTabSyncCustomIconDataUrl = (dataUrl: string) => {
  let hash = 2166136261;
  for (let index = 0; index < dataUrl.length; index += 1) {
    hash ^= dataUrl.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const isLeafTabSyncCustomIconDataUrl = (dataUrl: unknown): dataUrl is string => {
  const normalized = typeof dataUrl === 'string' ? dataUrl.trim() : '';
  return (
    normalized.startsWith('data:image/')
    && normalized.length <= LEAFTAB_SYNC_CUSTOM_ICON_MAX_DATA_URL_LENGTH
  );
};

export const normalizeLeafTabSyncCustomShortcutIcons = (
  icons: unknown,
  shortcutIds?: Iterable<string> | null,
): LeafTabSyncCustomIconNormalizationResult => {
  const allowedIds = shortcutIds
    ? new Set(Array.from(shortcutIds).map(normalizeShortcutId).filter(Boolean))
    : null;
  const skipped = createEmptySkipped();
  const normalizedIcons: Record<string, string> = {};
  const hashes: Record<string, string> = {};

  if (!icons || typeof icons !== 'object' || Array.isArray(icons)) {
    return { icons: normalizedIcons, hashes, skipped };
  }

  Object.entries(icons as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([shortcutId, value]) => {
      const normalizedId = normalizeShortcutId(shortcutId);
      const dataUrl = typeof value === 'string' ? value.trim() : '';
      if (!normalizedId || !dataUrl.startsWith('data:image/')) {
        skipped.invalid += 1;
        return;
      }
      if (allowedIds && !allowedIds.has(normalizedId)) {
        skipped.orphaned += 1;
        return;
      }
      if (dataUrl.length > LEAFTAB_SYNC_CUSTOM_ICON_MAX_DATA_URL_LENGTH) {
        skipped.oversized += 1;
        return;
      }
      normalizedIcons[normalizedId] = dataUrl;
      hashes[normalizedId] = hashLeafTabSyncCustomIconDataUrl(dataUrl);
    });

  return { icons: normalizedIcons, hashes, skipped };
};

export const fingerprintLeafTabSyncCustomShortcutIcons = (
  icons: unknown,
  shortcutIds?: Iterable<string> | null,
) => {
  const normalized = normalizeLeafTabSyncCustomShortcutIcons(icons, shortcutIds);
  return Object.entries(normalized.hashes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shortcutId, hash]) => `${shortcutId}:${normalized.icons[shortcutId]?.length || 0}:${hash}`)
    .join('|');
};
