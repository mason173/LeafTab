import { isShortcutFolder, isShortcutLink } from '../model/selectors';
import type { Shortcut } from '../shortcutTypes';
import type {
  DragRect,
  RootDragInteractionMode,
  RootShortcutDragItem,
  RootShortcutDropIntent,
  RootShortcutIntentCandidate,
} from './types';
import { getDropEdge, getReorderTargetIndex, isPointInDropCenter } from './dropEdge';

type Point = { x: number; y: number };
const SMALL_TARGET_DROP_CENTER_THRESHOLD = {
  thresholdXRatio: 0.34,
  thresholdYRatio: 0.34,
  thresholdXMaxPx: 30,
  thresholdYMaxPx: 30,
};

function isAnyFolderShortcut(shortcut: RootShortcutDragItem['shortcut']): boolean {
  return Boolean(isShortcutFolder(shortcut));
}

function isLargeFolderShortcut(shortcut: RootShortcutDragItem['shortcut']): boolean {
  return Boolean(isAnyFolderShortcut(shortcut) && shortcut.folderDisplayMode === 'large');
}

function pointInRect(point: Point, rect: DragRect): boolean {
  return (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  );
}

function rectEquals(left: DragRect, right: DragRect): boolean {
  return (
    left.left === right.left
    && left.top === right.top
    && left.right === right.right
    && left.bottom === right.bottom
    && left.width === right.width
    && left.height === right.height
  );
}

export function rootDragModeAllowsCenterIntent(mode: RootDragInteractionMode = 'normal'): boolean {
  return mode === 'normal';
}

export function isRootDragModeReorderOnly(mode: RootDragInteractionMode = 'normal'): boolean {
  return mode === 'reorder-only' || mode === 'external-insert';
}

export function resolveRootDragInteractionMode(params: {
  sourceRootShortcutId: string | null;
  activeShortcut: Shortcut;
}): RootDragInteractionMode {
  const { sourceRootShortcutId, activeShortcut } = params;
  if (sourceRootShortcutId) {
    return 'external-insert';
  }
  if (isAnyFolderShortcut(activeShortcut)) {
    return 'reorder-only';
  }
  return 'normal';
}

export function buildRootCenterIntentCandidate(params: {
  activeItem: RootShortcutDragItem;
  overItem: RootShortcutDragItem;
  mode?: RootDragInteractionMode;
}): Exclude<RootShortcutIntentCandidate, { type: 'reorder-candidate' }> | null {
  const { activeItem, overItem, mode = 'normal' } = params;
  if (!rootDragModeAllowsCenterIntent(mode)) {
    return null;
  }

  if (isShortcutLink(activeItem.shortcut) && isShortcutFolder(overItem.shortcut)) {
    return {
      type: overItem.shortcut.folderDisplayMode === 'large'
        ? 'merge-into-big-folder-candidate'
        : 'move-into-folder-candidate',
      intent: {
        type: 'move-root-shortcut-into-folder',
        activeShortcutId: activeItem.shortcut.id,
        targetFolderId: overItem.shortcut.id,
      },
    };
  }

  if (isShortcutLink(activeItem.shortcut) && isShortcutLink(overItem.shortcut)) {
    return {
      type: 'group-candidate',
      intent: {
        type: 'merge-root-shortcuts',
        activeShortcutId: activeItem.shortcut.id,
        targetShortcutId: overItem.shortcut.id,
      },
    };
  }

  return null;
}

export function resolveRootDropIntentCandidate(params: {
  activeSortId: string;
  overSortId: string;
  pointer: Point;
  overRect: DragRect;
  overCenterRect?: DragRect;
  items: RootShortcutDragItem[];
  mode?: RootDragInteractionMode;
  centerHitMode?: 'threshold' | 'full-center-rect';
  allowCenterIntent?: boolean;
}): RootShortcutIntentCandidate | null {
  const {
    activeSortId,
    overSortId,
    pointer,
    overRect,
    overCenterRect,
    items,
    mode = 'normal',
    centerHitMode = 'threshold',
    allowCenterIntent = true,
  } = params;

  if (activeSortId === overSortId) return null;

  const activeItem = items.find((item) => item.sortId === activeSortId);
  const overItem = items.find((item) => item.sortId === overSortId);
  if (!activeItem || !overItem) return null;

  const centerCandidate = buildRootCenterIntentCandidate({
    activeItem,
    overItem,
    mode,
  });

  if (centerCandidate && allowCenterIntent) {
    const largeFolderShortcut = isLargeFolderShortcut(overItem.shortcut);
    const compactSmallTargetDirectHit = Boolean(
      overCenterRect
      && !largeFolderShortcut
      && !rectEquals(overCenterRect, overRect)
      && pointInRect(pointer, overCenterRect),
    );
    const fullCenterRectHit = centerHitMode === 'full-center-rect'
      && pointInRect(pointer, overCenterRect ?? overRect);

    if (
      fullCenterRectHit
      || compactSmallTargetDirectHit
      || (
        centerHitMode === 'threshold'
        && isPointInDropCenter(
          pointer,
          overCenterRect ?? overRect,
          largeFolderShortcut ? undefined : SMALL_TARGET_DROP_CENTER_THRESHOLD,
        )
      )
    ) {
      return centerCandidate;
    }
  }

  const edge = getDropEdge(pointer, overRect);
  const reorderEdge = edge === 'center' ? 'after' : edge;
  const targetIndex = getReorderTargetIndex(activeItem.shortcutIndex, overItem.shortcutIndex, reorderEdge);
  if (targetIndex === activeItem.shortcutIndex) return null;

  return {
    type: 'reorder-candidate',
    intent: {
      type: 'reorder-root',
      activeShortcutId: activeItem.shortcut.id,
      overShortcutId: overItem.shortcut.id,
      targetIndex,
      edge: reorderEdge,
    },
  };
}

export function resolveRootDropIntent(params: {
  activeSortId: string;
  overSortId: string;
  pointer: Point;
  overRect: DragRect;
  overCenterRect?: DragRect;
  items: RootShortcutDragItem[];
  mode?: RootDragInteractionMode;
  centerHitMode?: 'threshold' | 'full-center-rect';
  allowCenterIntent?: boolean;
}): RootShortcutDropIntent | null {
  return resolveRootDropIntentCandidate(params)?.intent ?? null;
}
