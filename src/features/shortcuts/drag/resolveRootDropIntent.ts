import { isShortcutFolder, isShortcutLink } from '@/features/shortcuts/model/selectors';
import type { DragRect, RootShortcutDragItem, RootShortcutDropIntent } from './types';
import { getDropEdge, getReorderTargetIndex, isPointInDropCenter } from './dropEdge';

type Point = { x: number; y: number };
const SMALL_TARGET_DROP_CENTER_THRESHOLD = {
  thresholdXRatio: 0.34,
  thresholdYRatio: 0.34,
  thresholdXMaxPx: 30,
  thresholdYMaxPx: 30,
};

function isLargeFolderShortcut(shortcut: RootShortcutDragItem['shortcut']): boolean {
  return Boolean(isShortcutFolder(shortcut) && shortcut.folderDisplayMode === 'large');
}

export function resolveRootDropIntent(params: {
  activeSortId: string;
  overSortId: string;
  pointer: Point;
  overRect: DragRect;
  overCenterRect?: DragRect;
  items: RootShortcutDragItem[];
}): RootShortcutDropIntent | null {
  const { activeSortId, overSortId, pointer, overRect, overCenterRect, items } = params;

  if (activeSortId === overSortId) return null;

  const activeItem = items.find((item) => item.sortId === activeSortId);
  const overItem = items.find((item) => item.sortId === overSortId);
  if (!activeItem || !overItem) return null;

  const centerIntent = (() => {
    if (isShortcutLink(activeItem.shortcut) && isShortcutFolder(overItem.shortcut)) {
      return {
        type: 'move-root-shortcut-into-folder',
        activeShortcutId: activeItem.shortcut.id,
        targetFolderId: overItem.shortcut.id,
      } satisfies RootShortcutDropIntent;
    }

    if (isShortcutLink(activeItem.shortcut) && isShortcutLink(overItem.shortcut)) {
      return {
        type: 'merge-root-shortcuts',
        activeShortcutId: activeItem.shortcut.id,
        targetShortcutId: overItem.shortcut.id,
      } satisfies RootShortcutDropIntent;
    }

    return null;
  })();

  if (
    centerIntent
    && isPointInDropCenter(
      pointer,
      overCenterRect ?? overRect,
      isLargeFolderShortcut(overItem.shortcut) ? undefined : SMALL_TARGET_DROP_CENTER_THRESHOLD,
    )
  ) {
    return centerIntent;
  }

  const edge = getDropEdge(pointer, overRect);
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
