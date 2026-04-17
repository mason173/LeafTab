import { getDropEdge, getReorderTargetIndex, isPointInDropCenter } from './dropEdge';
import type { DragPoint, DragRect, RootShortcutDragItem, RootShortcutDropIntent } from './types';
import { isShortcutFolder, isShortcutLink } from '@/features/shortcuts/model/selectors';

function resolveFallbackCenterEdge(pointer: DragPoint, rect: DragRect): 'before' | 'after' {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return pointer.x >= centerX || pointer.y >= centerY ? 'after' : 'before';
}

export function resolveRootDropIntent(params: {
  activeSortId: string;
  overSortId: string;
  pointer: DragPoint;
  overRect: DragRect;
  overCenterRect?: DragRect;
  centerHitMode?: 'default' | 'full-center-rect';
  allowCenterIntent?: boolean;
  items: readonly RootShortcutDragItem[];
}): RootShortcutDropIntent | null {
  const {
    activeSortId,
    overSortId,
    pointer,
    overRect,
    overCenterRect,
    centerHitMode = 'default',
    allowCenterIntent = true,
    items,
  } = params;
  if (activeSortId === overSortId) return null;

  const activeItem = items.find((item) => item.sortId === activeSortId);
  const overItem = items.find((item) => item.sortId === overSortId);
  if (!activeItem || !overItem) return null;

  const activeShortcut = activeItem.shortcut;
  const overShortcut = overItem.shortcut;
  const centerRect = centerHitMode === 'full-center-rect' ? overCenterRect ?? overRect : overCenterRect;
  const pointInsideCenterRect = isPointInDropCenter(pointer, overRect, centerRect);
  const centerHit = allowCenterIntent && pointInsideCenterRect;

  if (centerHit && isShortcutLink(activeShortcut)) {
    if (isShortcutFolder(overShortcut)) {
      return {
        type: 'move-root-shortcut-into-folder',
        activeShortcutId: activeSortId,
        targetFolderId: overSortId,
      };
    }
    if (isShortcutLink(overShortcut)) {
      return {
        type: 'merge-root-shortcuts',
        activeShortcutId: activeSortId,
        targetShortcutId: overSortId,
      };
    }
  }

  const edge = !allowCenterIntent && pointInsideCenterRect && centerRect
    ? resolveFallbackCenterEdge(pointer, centerRect)
    : getDropEdge(pointer, overRect);
  const targetIndex = getReorderTargetIndex({
    items,
    activeSortId,
    overSortId,
    edge,
  });
  if (targetIndex === null) return null;

  return {
    type: 'reorder-root',
    activeShortcutId: activeSortId,
    overShortcutId: overSortId,
    targetIndex,
    edge,
  };
}
