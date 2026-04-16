import type { ShortcutContainerPath } from './types';

export const ROOT_SHORTCUTS_PATH: ShortcutContainerPath = { type: 'root' };

export function createFolderShortcutsPath(folderId: string): ShortcutContainerPath {
  return { type: 'folder', folderId };
}

export function isRootShortcutsPath(path: ShortcutContainerPath): path is { type: 'root' } {
  return path.type === 'root';
}
