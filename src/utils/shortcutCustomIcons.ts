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

export function readShortcutCustomIcon(shortcutId?: string | null) {
  const normalizedId = String(shortcutId || '').trim();
  if (!normalizedId) return '';
  return readCachedLocalStorageItem(getCustomIconStorageKey(normalizedId)) || '';
}

export function persistShortcutCustomIcon(shortcutId: string, dataUrl: string) {
  const normalizedId = String(shortcutId || '').trim();
  const normalizedDataUrl = String(dataUrl || '').trim();
  if (!normalizedId || !normalizedDataUrl.startsWith('data:image/')) return;
  if (normalizedDataUrl.length > MAX_CUSTOM_ICON_DATA_LENGTH) return;

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
}

export function removeShortcutCustomIcon(shortcutId?: string | null) {
  const normalizedId = String(shortcutId || '').trim();
  if (!normalizedId) return;
  queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(normalizedId));
  writeCustomIconIndex(readCustomIconIndex().filter((id) => id !== normalizedId));
}

export function removeShortcutCustomIcons(shortcutIds: Iterable<string>) {
  const normalizedIds = new Set(
    Array.from(shortcutIds)
      .map((shortcutId) => String(shortcutId || '').trim())
      .filter(Boolean),
  );
  if (normalizedIds.size === 0) return;

  normalizedIds.forEach((shortcutId) => {
    queueCachedLocalStorageRemoveItem(getCustomIconStorageKey(shortcutId));
  });
  writeCustomIconIndex(readCustomIconIndex().filter((id) => !normalizedIds.has(id)));
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
