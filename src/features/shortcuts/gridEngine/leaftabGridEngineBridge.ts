import type { Shortcut } from '@/types';
import { isShortcutFolder } from '@/utils/shortcutFolders';

export type LeaftabShortcutVisualPayload = {
  kind: 'leaftab-shortcut';
  shortcut: Shortcut;
};

export type LeaftabGridEngineIconItem = {
  id: string;
  type: 'icon';
  label: string;
  accent?: string;
  visualPayload: LeaftabShortcutVisualPayload;
};

export type LeaftabGridEngineFolderItem = {
  id: string;
  type: 'folder';
  label: string;
  accent?: string;
  size: 'small' | 'large';
  children: LeaftabGridEngineIconItem[];
  visualPayload: LeaftabShortcutVisualPayload;
};

export type LeaftabGridEngineItem =
  | LeaftabGridEngineIconItem
  | LeaftabGridEngineFolderItem;

const DEFAULT_FOLDER_ACCENT = '#4b6bff';
const DEFAULT_ICON_ACCENT = '#6b7a90';

function hashStringToHue(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 360;
}

function fallbackAccent(shortcut: Shortcut) {
  if (shortcut.iconColor?.trim()) {
    return shortcut.iconColor.trim();
  }

  const hue = hashStringToHue(
    `${shortcut.id}|${shortcut.title}|${shortcut.url}|${shortcut.kind ?? 'link'}`,
  );
  return `hsl(${hue} 72% 58%)`;
}

export function resolveShortcutEngineAccent(shortcut: Shortcut): string {
  if (isShortcutFolder(shortcut)) {
    return shortcut.children?.[0]
      ? resolveShortcutEngineAccent(shortcut.children[0])
      : DEFAULT_FOLDER_ACCENT;
  }

  return fallbackAccent(shortcut) || DEFAULT_ICON_ACCENT;
}

export function createLeaftabShortcutVisualPayload(
  shortcut: Shortcut,
): LeaftabShortcutVisualPayload {
  return {
    kind: 'leaftab-shortcut',
    shortcut,
  };
}

export function shortcutToGridEngineItem(
  shortcut: Shortcut,
): LeaftabGridEngineItem {
  if (isShortcutFolder(shortcut)) {
    return {
      id: shortcut.id,
      type: 'folder',
      label: shortcut.title,
      accent: resolveShortcutEngineAccent(shortcut),
      size: shortcut.folderDisplayMode === 'large' ? 'large' : 'small',
      children: (shortcut.children ?? [])
        .filter((child) => !isShortcutFolder(child))
        .map((child) => ({
          id: child.id,
          type: 'icon',
          label: child.title,
          accent: resolveShortcutEngineAccent(child),
          visualPayload: createLeaftabShortcutVisualPayload(child),
        })),
      visualPayload: createLeaftabShortcutVisualPayload(shortcut),
    };
  }

  return {
    id: shortcut.id,
    type: 'icon',
    label: shortcut.title,
    accent: resolveShortcutEngineAccent(shortcut),
    visualPayload: createLeaftabShortcutVisualPayload(shortcut),
  };
}

export function shortcutsToGridEngineItems(
  shortcuts: readonly Shortcut[],
): LeaftabGridEngineItem[] {
  return shortcuts.map(shortcutToGridEngineItem);
}

function gridEngineIconToShortcut(item: LeaftabGridEngineIconItem): Shortcut {
  const source = item.visualPayload.shortcut;

  return {
    ...source,
    id: item.id,
    title: item.label,
    kind: 'link',
    children: undefined,
    folderDisplayMode: undefined,
  };
}

export function gridEngineItemToShortcut(
  item: LeaftabGridEngineItem,
): Shortcut {
  const source = item.visualPayload.shortcut;

  if (item.type === 'folder') {
    return {
      ...source,
      id: item.id,
      title: item.label,
      url: '',
      icon: '',
      kind: 'folder',
      folderDisplayMode: item.size === 'large' ? 'large' : 'small',
      children: item.children.map(gridEngineIconToShortcut),
    };
  }

  return gridEngineIconToShortcut(item);
}

export function gridEngineItemsToShortcuts(
  items: readonly LeaftabGridEngineItem[],
): Shortcut[] {
  return items.map(gridEngineItemToShortcut);
}
