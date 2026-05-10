import {
  queueCachedLocalStorageRemoveItem,
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';

const SHORTCUT_CUSTOM_ICON_PREFIX = 'shortcut_custom_icon_v1:';
const SHORTCUT_CUSTOM_ICON_INDEX_KEY = 'shortcut_custom_icon_v1:index';
const MAX_CUSTOM_SHORTCUT_ICONS = 160;
const MAX_CUSTOM_ICON_DATA_LENGTH = 220_000;
const CUSTOM_ICON_SIZE = 64;
const CUSTOM_ICON_CPU_MITIGATION_KEY = 'shortcut_custom_icon_cpu_mitigation_v1';
export const SHORTCUT_CUSTOM_ICON_CHANGED_EVENT = 'leaftab-shortcut-custom-icon-changed';
export type ShortcutCustomIconMap = Record<string, string>;

type ShortcutCustomIconChangedDetail = {
  shortcutId: string;
  action: 'set' | 'remove';
};

function dispatchShortcutCustomIconChanged(detail: ShortcutCustomIconChangedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ShortcutCustomIconChangedDetail>(SHORTCUT_CUSTOM_ICON_CHANGED_EVENT, {
    detail,
  }));
}

function readCustomIconIndex() {
  try {
    const raw = readCachedLocalStorageItem(SHORTCUT_CUSTOM_ICON_INDEX_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item) => typeof item === 'string' && item.trim());
  } catch {
    return [] as string[];
  }
}

function writeCustomIconIndex(ids: string[]) {
  try {
    queueCachedLocalStorageSetItem(SHORTCUT_CUSTOM_ICON_INDEX_KEY, JSON.stringify(ids));
  } catch {}
}

function getCustomIconStorageKey(shortcutId: string) {
  return `${SHORTCUT_CUSTOM_ICON_PREFIX}${shortcutId}`;
}

function shouldDisableCustomIconsForCpuMitigation() {
  return true;
}

function disableStoredCustomIconsForCpuMitigation() {
  try {
    if (localStorage.getItem(CUSTOM_ICON_CPU_MITIGATION_KEY) === 'applied') return;
    const ids = readCustomIconIndex();
    ids.forEach((shortcutId) => {
      queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(shortcutId));
      dispatchShortcutCustomIconChanged({ shortcutId, action: 'remove' });
    });
    writeCustomIconIndex([]);
    localStorage.setItem(CUSTOM_ICON_CPU_MITIGATION_KEY, 'applied');
  } catch {}
}

export function isValidShortcutCustomIconDataUrl(dataUrl: unknown): dataUrl is string {
  const normalizedDataUrl = typeof dataUrl === 'string' ? dataUrl.trim() : '';
  return (
    normalizedDataUrl.startsWith('data:image/')
    && normalizedDataUrl.length <= MAX_CUSTOM_ICON_DATA_LENGTH
  );
}

function normalizeShortcutId(shortcutId: unknown) {
  return String(shortcutId || '').trim();
}

function normalizeShortcutCustomIconMap(
  icons: unknown,
  shortcutIds?: Iterable<string> | null,
): ShortcutCustomIconMap {
  const allowedIds = shortcutIds
    ? new Set(Array.from(shortcutIds).map(normalizeShortcutId).filter(Boolean))
    : null;
  if (!icons || typeof icons !== 'object' || Array.isArray(icons)) return {};

  const normalized: ShortcutCustomIconMap = {};
  Object.entries(icons as Record<string, unknown>).forEach(([shortcutId, dataUrl]) => {
    const normalizedId = normalizeShortcutId(shortcutId);
    const normalizedDataUrl = typeof dataUrl === 'string' ? dataUrl.trim() : '';
    if (!normalizedId || (allowedIds && !allowedIds.has(normalizedId))) return;
    if (!isValidShortcutCustomIconDataUrl(normalizedDataUrl)) return;
    normalized[normalizedId] = normalizedDataUrl;
  });
  return normalized;
}

export function readShortcutCustomIcon(shortcutId?: string | null) {
  const normalizedId = normalizeShortcutId(shortcutId);
  if (!normalizedId) return '';
  if (shouldDisableCustomIconsForCpuMitigation()) {
    disableStoredCustomIconsForCpuMitigation();
    return '';
  }
  const dataUrl = readCachedLocalStorageItem(getCustomIconStorageKey(normalizedId)) || '';
  return isValidShortcutCustomIconDataUrl(dataUrl) ? dataUrl : '';
}

export function persistShortcutCustomIcon(shortcutId: string, dataUrl: string) {
  if (shouldDisableCustomIconsForCpuMitigation()) {
    disableStoredCustomIconsForCpuMitigation();
    return;
  }
  const normalizedId = normalizeShortcutId(shortcutId);
  const normalizedDataUrl = String(dataUrl || '').trim();
  if (!normalizedId || !isValidShortcutCustomIconDataUrl(normalizedDataUrl)) return;

  queueCachedLocalStorageSetItem(getCustomIconStorageKey(normalizedId), normalizedDataUrl);
  const nextIndex = readCustomIconIndex().filter((id) => id !== normalizedId);
  nextIndex.unshift(normalizedId);

  while (nextIndex.length > MAX_CUSTOM_SHORTCUT_ICONS) {
    const removedId = nextIndex.pop();
    if (removedId) {
      queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(removedId));
    }
  }

  writeCustomIconIndex(nextIndex);
  dispatchShortcutCustomIconChanged({ shortcutId: normalizedId, action: 'set' });
}

export function removeShortcutCustomIcon(shortcutId?: string | null) {
  const normalizedId = normalizeShortcutId(shortcutId);
  if (!normalizedId) return;
  queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(normalizedId));
  writeCustomIconIndex(readCustomIconIndex().filter((id) => id !== normalizedId));
  dispatchShortcutCustomIconChanged({ shortcutId: normalizedId, action: 'remove' });
}

export function removeShortcutCustomIcons(shortcutIds: Iterable<string>) {
  const normalizedIds = new Set(
    Array.from(shortcutIds)
      .map(normalizeShortcutId)
      .filter(Boolean),
  );
  if (normalizedIds.size === 0) return;

  normalizedIds.forEach((shortcutId) => {
    queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(shortcutId));
    dispatchShortcutCustomIconChanged({ shortcutId, action: 'remove' });
  });
  writeCustomIconIndex(readCustomIconIndex().filter((id) => !normalizedIds.has(id)));
}

export function exportShortcutCustomIcons(shortcutIds?: Iterable<string> | null): ShortcutCustomIconMap {
  if (shouldDisableCustomIconsForCpuMitigation()) {
    disableStoredCustomIconsForCpuMitigation();
    return {};
  }
  const allowedIds = shortcutIds
    ? new Set(Array.from(shortcutIds).map(normalizeShortcutId).filter(Boolean))
    : null;
  const exported: ShortcutCustomIconMap = {};
  readCustomIconIndex().forEach((shortcutId) => {
    const normalizedId = normalizeShortcutId(shortcutId);
    if (!normalizedId || (allowedIds && !allowedIds.has(normalizedId))) return;
    const dataUrl = readShortcutCustomIcon(normalizedId);
    if (isValidShortcutCustomIconDataUrl(dataUrl)) {
      exported[normalizedId] = dataUrl;
    }
  });
  return exported;
}

export function applyShortcutCustomIcons(
  icons: ShortcutCustomIconMap | null | undefined,
  options?: {
    replace?: boolean;
    shortcutIds?: Iterable<string> | null;
  },
) {
  if (shouldDisableCustomIconsForCpuMitigation()) {
    disableStoredCustomIconsForCpuMitigation();
    return;
  }
  const normalizedIcons = normalizeShortcutCustomIconMap(icons || {}, options?.shortcutIds || null);
  const scopeIds = options?.shortcutIds
    ? new Set(Array.from(options.shortcutIds).map(normalizeShortcutId).filter(Boolean))
    : null;
  const existingIndex = readCustomIconIndex();
  const nextIndex = existingIndex.filter((shortcutId) => {
    const normalizedId = normalizeShortcutId(shortcutId);
    if (!normalizedId) return false;
    if (normalizedIcons[normalizedId]) return false;
    return !(options?.replace && (!scopeIds || scopeIds.has(normalizedId)));
  });
  const removedIds: string[] = [];

  if (options?.replace) {
    existingIndex.forEach((shortcutId) => {
      const normalizedId = normalizeShortcutId(shortcutId);
      if (!normalizedId || normalizedIcons[normalizedId]) return;
      if (scopeIds && !scopeIds.has(normalizedId)) return;
      queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(normalizedId));
      removedIds.push(normalizedId);
    });
  }

  Object.entries(normalizedIcons)
    .reverse()
    .forEach(([shortcutId, dataUrl]) => {
      queueCachedLocalStorageSetItem(getCustomIconStorageKey(shortcutId), dataUrl);
      nextIndex.unshift(shortcutId);
    });

  while (nextIndex.length > MAX_CUSTOM_SHORTCUT_ICONS) {
    const removedId = nextIndex.pop();
    if (removedId) {
      queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(removedId));
      removedIds.push(removedId);
    }
  }

  writeCustomIconIndex(Array.from(new Set(nextIndex)));
  Object.keys(normalizedIcons).forEach((shortcutId) => {
    dispatchShortcutCustomIconChanged({ shortcutId, action: 'set' });
  });
  removedIds.forEach((shortcutId) => {
    dispatchShortcutCustomIconChanged({ shortcutId, action: 'remove' });
  });
}

function loadImageFromDataUrl(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = dataUrl;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function prepareShortcutCustomIcon(file: File) {
  const fileDataUrl = await readFileAsDataUrl(file);
  if (!fileDataUrl.startsWith('data:image/')) {
    throw new Error('Unsupported file type');
  }

  const image = await loadImageFromDataUrl(fileDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = CUSTOM_ICON_SIZE;
  canvas.height = CUSTOM_ICON_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas unavailable');
  }

  context.clearRect(0, 0, CUSTOM_ICON_SIZE, CUSTOM_ICON_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const sourceWidth = Math.max(1, image.naturalWidth || image.width || CUSTOM_ICON_SIZE);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || CUSTOM_ICON_SIZE);
  const scale = Math.max(CUSTOM_ICON_SIZE / sourceWidth, CUSTOM_ICON_SIZE / sourceHeight);
  const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
  const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
  const offsetX = Math.round((CUSTOM_ICON_SIZE - drawWidth) / 2);
  const offsetY = Math.round((CUSTOM_ICON_SIZE - drawHeight) / 2);

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
}
