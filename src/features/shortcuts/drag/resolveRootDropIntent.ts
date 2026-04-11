import { isShortcutFolder, isShortcutLink } from '@/features/shortcuts/model/selectors';
import type { DragRect, RootShortcutDragItem, RootShortcutDropIntent } from './types';
import { getDropEdge, getReorderTargetIndex } from './dropEdge';

type Point = { x: number; y: number };

export function resolveRootDropIntent(params: {
  activeSortId: string;
  overSortId: string;
  pointer: Point;
  overRect: DragRect;
  items: RootShortcutDragItem[];
}): RootShortcutDropIntent | null {
  const { activeSortId, overSortId, pointer, overRect, items } = params;

  if (activeSortId === overSortId) return null;

  const activeItem = items.find((item) => item.sortId === activeSortId);
  const overItem = items.find((item) => item.sortId === overSortId);
  if (!activeItem || !overItem) return null;

  const edge = getDropEdge(pointer, overRect);

  if (edge === 'center') {
    if (isShortcutLink(activeItem.shortcut) && isShortcutFolder(overItem.shortcut)) {
      return {
        type: 'move-root-shortcut-into-folder',
        activeShortcutId: activeItem.shortcut.id,
        targetFolderId: overItem.shortcut.id,
      };
    }

    if (isShortcutLink(activeItem.shortcut) && isShortcutLink(overItem.shortcut)) {
      return {
        type: 'merge-root-shortcuts',
        activeShortcutId: activeItem.shortcut.id,
        targetShortcutId: overItem.shortcut.id,
      };
    }
  }

  const reorderEdge = edge === 'center' ? 'after' : edge;
  const targetIndex = getReorderTargetIndex(activeItem.shortcutIndex, overItem.shortcutIndex, reorderEdge);
  if (targetIndex === activeItem.shortcutIndex) return null;

  return {
    type: 'reorder-root',
    activeShortcutId: activeItem.shortcut.id,
    overShortcutId: overItem.shortcut.id,
    targetIndex,
    edge: reorderEdge,
  };
}
