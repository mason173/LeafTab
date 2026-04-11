import type { ClientRect } from '@dnd-kit/core';
import { getDropEdge, getReorderTargetIndex } from './dropEdge';
import type { FolderShortcutDropIntent, RootShortcutDragItem } from './types';

type Point = { x: number; y: number };

export const FOLDER_EXTRACT_DROP_ZONE_ID = 'folder-extract-drop-zone';
export const FOLDER_MASK_DROP_ZONE_IDS = [
  'folder-mask-top',
  'folder-mask-right',
  'folder-mask-bottom',
  'folder-mask-left',
] as const;

function isFolderMaskDropZoneId(overId: string): boolean {
  return FOLDER_MASK_DROP_ZONE_IDS.some((id) => id === overId);
}

export function resolveFolderDropIntent(params: {
  folderId: string;
  activeSortId: string;
  overId: string;
  pointer: Point;
  overRect: ClientRect | null;
  items: RootShortcutDragItem[];
}): FolderShortcutDropIntent | null {
  const { folderId, activeSortId, overId, pointer, overRect, items } = params;
  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem) return null;

  if (overId === FOLDER_EXTRACT_DROP_ZONE_ID || isFolderMaskDropZoneId(overId)) {
    return {
      type: 'extract-folder-shortcut',
      folderId,
      shortcutId: activeItem.shortcut.id,
    };
  }

  if (!overRect || activeSortId === overId) return null;

  const overItem = items.find((item) => item.sortId === overId);
  if (!overItem) return null;

  const edge = getDropEdge(pointer, overRect);
  if (edge === 'center') {
    return {
      type: 'reorder-folder-shortcuts',
      folderId,
      shortcutId: activeItem.shortcut.id,
      targetIndex: overItem.shortcutIndex,
      edge: 'after',
    };
  }

  const targetIndex = getReorderTargetIndex(activeItem.shortcutIndex, overItem.shortcutIndex, edge);
  if (targetIndex === activeItem.shortcutIndex) return null;

  return {
    type: 'reorder-folder-shortcuts',
    folderId,
    shortcutId: activeItem.shortcut.id,
    targetIndex,
    edge,
  };
}
