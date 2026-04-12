import React, { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { RiCheckFill } from '@/icons/ri-compat';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type { Shortcut } from '../types';
import {
  COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX,
  COMPACT_SHORTCUT_TITLE_BLOCK_HEIGHT_PX,
  getCompactShortcutCardMetrics,
  isShortcutLargeFolder,
} from '@/components/shortcuts/compactFolderLayout';
import { getLargeFolderBorderRadius, getSmallFolderBorderRadius } from '@/components/shortcuts/ShortcutFolderPreview';
import { ShortcutCardRenderer } from './shortcuts/ShortcutCardRenderer';
import {
  DEFAULT_SHORTCUT_CARD_VARIANT,
  type ShortcutCardVariant,
  type ShortcutLayoutDensity,
} from './shortcuts/shortcutCardVariant';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';
import { getReorderTargetIndex } from '@/features/shortcuts/drag/dropEdge';
import { resolveRootDropIntent } from '@/features/shortcuts/drag/resolveRootDropIntent';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import {
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  getDragVisualCenter,
  measureDragItems,
  type ActivePointerDragState,
  type MeasuredDragItem,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
} from '@/features/shortcuts/drag/gridDragEngine';
import { DraggableShortcutItemFrame } from '@/features/shortcuts/components/DraggableShortcutItemFrame';

const DRAG_ACTIVATION_DISTANCE_PX = 8;
const DRAG_OVERLAY_Z_INDEX = 14030;
const DRAG_AUTO_SCROLL_EDGE_PX = 88;
const DRAG_AUTO_SCROLL_MAX_SPEED_PX = 26;
const DRAG_MATCH_DISTANCE_PX = 64;
const SMALL_TARGET_CENTER_INTENT_DELAY_MS = 320;
const LARGE_FOLDER_CENTER_INTENT_DELAY_MS = 180;
const COMPACT_SMALL_TARGET_HIT_SLOP_PX = 20;
const COMPACT_LARGE_FOLDER_HIT_SLOP_PX = 8;

type RootHoverState =
  | { type: 'item'; sortId: string; edge: 'before' | 'after' | 'center' }
  | null;

type GridItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

type PlacedGridItem = GridItem & {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
};
type PendingDragState = PendingPointerDragState<string> & {
  activeSortId: string;
  current: PointerPoint;
};
type DragSessionState = ActivePointerDragState<string> & {
  activeSortId: string;
};

type CenterHoverCandidate = {
  targetSortId: string;
  intentType: Extract<RootShortcutDropIntent['type'], 'merge-root-shortcuts' | 'move-root-shortcut-into-folder'>;
  startedAt: number;
  activationDelayMs: number;
};

type MeasuredGridItem = MeasuredDragItem<GridItem>;

type ReorderSlotCandidate = {
  targetIndex: number;
  overShortcutId: string;
  edge: 'before' | 'after';
  left: number;
  top: number;
  width: number;
  height: number;
};

type HitTestRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type OverItemCandidate = {
  overItem: MeasuredGridItem;
  overRect: HitTestRect;
  overCenterRect: HitTestRect;
};

function canPlaceGridItem(params: {
  occupied: boolean[][];
  row: number;
  column: number;
  columnSpan: number;
  rowSpan: number;
  gridColumns: number;
}): boolean {
  const {
    occupied,
    row,
    column,
    columnSpan,
    rowSpan,
    gridColumns,
  } = params;

  if (column + columnSpan > gridColumns) return false;

  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    const occupiedRow = occupied[row + rowOffset] ?? [];
    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      if (occupiedRow[column + columnOffset]) return false;
    }
  }

  return true;
}

function occupyGridSlots(params: {
  occupied: boolean[][];
  row: number;
  column: number;
  columnSpan: number;
  rowSpan: number;
}) {
  const {
    occupied,
    row,
    column,
    columnSpan,
    rowSpan,
  } = params;

  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    const targetRow = row + rowOffset;
    if (!occupied[targetRow]) {
      occupied[targetRow] = [];
    }
    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      occupied[targetRow][column + columnOffset] = true;
    }
  }
}

function packGridItems(params: {
  items: GridItem[];
  gridColumns: number;
  getSpan: (shortcut: Shortcut) => { columnSpan: number; rowSpan: number };
}): {
  placedItems: PlacedGridItem[];
  rowCount: number;
} {
  const { items, gridColumns, getSpan } = params;
  const safeGridColumns = Math.max(gridColumns, 1);
  const occupied: boolean[][] = [];
  const placedItems: PlacedGridItem[] = [];
  let rowCount = 0;

  items.forEach((item) => {
    const span = getSpan(item.shortcut);
    const columnSpan = Math.max(1, Math.min(span.columnSpan, safeGridColumns));
    const rowSpan = Math.max(1, span.rowSpan);
    let placed = false;
    let row = 0;

    while (!placed) {
      for (let column = 0; column < safeGridColumns; column += 1) {
        if (!canPlaceGridItem({
          occupied,
          row,
          column,
          columnSpan,
          rowSpan,
          gridColumns: safeGridColumns,
        })) {
          continue;
        }

        occupyGridSlots({
          occupied,
          row,
          column,
          columnSpan,
          rowSpan,
        });

        placedItems.push({
          ...item,
          columnStart: column + 1,
          rowStart: row + 1,
          columnSpan,
          rowSpan,
        });
        rowCount = Math.max(rowCount, row + rowSpan);
        placed = true;
        break;
      }

      row += 1;
    }
  });

  return {
    placedItems,
    rowCount,
  };
}

function isFixedLargeFolderShortcut(shortcut: Shortcut): boolean {
  return Boolean(shortcut.kind === 'folder' && shortcut.folderDisplayMode === 'large');
}

function buildProjectedGridItemsPreservingLargeFoldersBySmallOrdinal(params: {
  items: GridItem[];
  activeSortId: string;
  targetSmallOrdinal: number;
}): { projectedItems: GridItem[]; activeFullIndex: number } | null {
  const { items, activeSortId, targetSmallOrdinal } = params;
  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem || isFixedLargeFolderShortcut(activeItem.shortcut)) return null;

  const remainingSmallItems = items.filter(
    (item) => !isFixedLargeFolderShortcut(item.shortcut) && item.sortId !== activeSortId,
  );
  const clampedOrdinal = Math.max(0, Math.min(targetSmallOrdinal, remainingSmallItems.length));
  const projectedSmallItems = [...remainingSmallItems];
  projectedSmallItems.splice(clampedOrdinal, 0, activeItem);

  let smallCursor = 0;
  let activeFullIndex = -1;
  const projectedItems = items.map((item, index) => {
    if (isFixedLargeFolderShortcut(item.shortcut)) return item;
    const nextItem = projectedSmallItems[smallCursor];
    if (nextItem?.sortId === activeSortId) {
      activeFullIndex = index;
    }
    smallCursor += 1;
    return nextItem;
  });

  if (projectedItems.some((item) => !item) || activeFullIndex < 0) return null;
  return {
    projectedItems: projectedItems as GridItem[],
    activeFullIndex,
  };
}

function buildProjectedGridItemsForRootReorder(params: {
  items: GridItem[];
  activeSortId: string;
  targetIndex: number;
  preserveLargeFolders: boolean;
}): GridItem[] | null {
  const { items, activeSortId, targetIndex, preserveLargeFolders } = params;
  if (!preserveLargeFolders) {
    const activeIndex = items.findIndex((item) => item.sortId === activeSortId);
    if (activeIndex < 0) return null;
    const remainingItems = items.filter((item) => item.sortId !== activeSortId);
    const clampedTargetIndex = Math.max(0, Math.min(targetIndex, remainingItems.length));
    const projectedItems = [...remainingItems];
    projectedItems.splice(clampedTargetIndex, 0, items[activeIndex]);
    return projectedItems;
  }

  const smallPositions = items.flatMap((item, index) => (isFixedLargeFolderShortcut(item.shortcut) ? [] : [index]));
  if (smallPositions.length === 0) return null;
  const exactSmallOrdinal = smallPositions.indexOf(targetIndex);
  const fallbackSmallOrdinal = smallPositions.filter((position) => position < targetIndex).length;
  return buildProjectedGridItemsPreservingLargeFoldersBySmallOrdinal({
    items,
    activeSortId,
    targetSmallOrdinal: exactSmallOrdinal >= 0 ? exactSmallOrdinal : fallbackSmallOrdinal,
  })?.projectedItems ?? null;
}

function pointInSlot(point: PointerPoint, slot: ReorderSlotCandidate): boolean {
  return (
    point.x >= slot.left
    && point.x <= slot.left + slot.width
    && point.y >= slot.top
    && point.y <= slot.top + slot.height
  );
}

function distanceToSlot(point: PointerPoint, slot: ReorderSlotCandidate): number {
  const right = slot.left + slot.width;
  const bottom = slot.top + slot.height;
  const dx = point.x < slot.left ? slot.left - point.x : point.x > right ? point.x - right : 0;
  const dy = point.y < slot.top ? slot.top - point.y : point.y > bottom ? point.y - bottom : 0;
  return Math.hypot(dx, dy);
}

function distanceToSlotCenter(point: PointerPoint, slot: ReorderSlotCandidate): number {
  return Math.hypot(
    point.x - (slot.left + slot.width / 2),
    point.y - (slot.top + slot.height / 2),
  );
}

function pickClosestReorderSlot(params: {
  point: PointerPoint;
  candidates: ReorderSlotCandidate[];
}): ReorderSlotCandidate | null {
  const { point, candidates } = params;
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    const aContains = pointInSlot(point, a);
    const bContains = pointInSlot(point, b);
    if (aContains !== bContains) return aContains ? -1 : 1;

    const aDistance = distanceToSlot(point, a);
    const bDistance = distanceToSlot(point, b);
    if (aDistance !== bDistance) return aDistance - bDistance;

    return distanceToSlotCenter(point, a) - distanceToSlotCenter(point, b);
  });

  return ranked[0] ?? null;
}

function buildReorderIntentFromSlotCandidate(params: {
  activeShortcutId: string;
  candidate: ReorderSlotCandidate;
}): RootShortcutDropIntent {
  const { activeShortcutId, candidate } = params;
  return {
    type: 'reorder-root',
    activeShortcutId,
    overShortcutId: candidate.overShortcutId,
    targetIndex: candidate.targetIndex,
    edge: candidate.edge,
  };
}

export type ExternalShortcutDragSession = {
  token: number;
  shortcutId: string;
  pointerId: number;
  pointerType: string;
  pointer: PointerPoint;
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};

function DragPreviewIcon({
  shortcut,
  size,
  cornerRadius,
}: {
  shortcut: Shortcut;
  size: number;
  cornerRadius: number;
}) {
  const iconSrc = (shortcut.icon || '').trim();
  const label = (shortcut.title || shortcut.url || '?').trim();
  const fallbackText = (label.charAt(0) || '?').toUpperCase();
  const borderRadius = getShortcutIconBorderRadius(cornerRadius);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        draggable={false}
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center bg-primary/12 text-primary"
      style={{ width: size, height: size, fontSize: Math.max(14, Math.round(size * 0.38)), fontWeight: 600, borderRadius }}
    >
      {fallbackText}
    </span>
  );
}

function LightweightDragPreview({
  shortcut,
  cardVariant,
  firefox,
  compactShowTitle,
  compactIconSize,
  iconCornerRadius,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite,
}: {
  shortcut: Shortcut;
  cardVariant: ShortcutCardVariant;
  firefox: boolean;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
}) {
  if (cardVariant === 'compact') {
    return (
      <div
        className="pointer-events-none select-none"
        style={{
          width: compactIconSize,
          contain: 'layout paint style',
          willChange: firefox ? undefined : 'transform',
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <DragPreviewIcon shortcut={shortcut} size={compactIconSize} cornerRadius={iconCornerRadius} />
          {compactShowTitle ? (
            <p
              className={`truncate text-center leading-4 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
              style={{ width: compactIconSize, fontSize: compactTitleFontSize }}
            >
              {shortcut.title}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none select-none rounded-xl border border-border/40 bg-background/95 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
      style={{
        width: 'min(280px, 72vw)',
        padding: `${defaultVerticalPadding}px 8px`,
        contain: 'layout paint style',
        willChange: firefox ? undefined : 'transform',
      }}
    >
      <div className="flex items-center gap-2">
        <DragPreviewIcon shortcut={shortcut} size={defaultIconSize} cornerRadius={iconCornerRadius} />
        <div className="min-w-0 flex-1 leading-none">
          <p
            className={`truncate font-['PingFang_SC:Medium',sans-serif] ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{ fontSize: defaultTitleFontSize }}
          >
            {shortcut.title}
          </p>
          <p
            className={`truncate font-['PingFang_SC:Regular',sans-serif] ${forceTextWhite ? 'text-white/80' : 'text-muted-foreground'}`}
            style={{ fontSize: defaultUrlFontSize, marginTop: 3 }}
          >
            {shortcut.url}
          </p>
        </div>
      </div>
    </div>
  );
}

function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight + 1;
    if (canScroll) return current;
    current = current.parentElement;
  }
  return null;
}

function deriveHoverStateFromIntent(intent: RootShortcutDropIntent | null): RootHoverState {
  if (!intent) return null;

  switch (intent.type) {
    case 'reorder-root':
      return {
        type: 'item',
        sortId: intent.overShortcutId,
        edge: intent.edge,
      };
    case 'merge-root-shortcuts':
      return {
        type: 'item',
        sortId: intent.targetShortcutId,
        edge: 'center',
      };
    case 'move-root-shortcut-into-folder':
      return {
        type: 'item',
        sortId: intent.targetFolderId,
        edge: 'center',
      };
    default:
      return null;
  }
}

function measureGridItems(items: GridItem[], itemElements: Map<string, HTMLDivElement>): MeasuredGridItem[] {
  return measureDragItems({
    items,
    itemElements,
    getId: (item) => item.sortId,
  });
}

function getReorderEdgeFromPointer(point: PointerPoint, rect: DOMRect): 'before' | 'after' {
  const normalizedX = Math.min(1, Math.max(0, (point.x - rect.left) / rect.width));
  const normalizedY = Math.min(1, Math.max(0, (point.y - rect.top) / rect.height));
  const distanceX = Math.abs(normalizedX - 0.5);
  const distanceY = Math.abs(normalizedY - 0.5);

  if (distanceX >= distanceY) {
    return normalizedX < 0.5 ? 'before' : 'after';
  }

  return normalizedY < 0.5 ? 'before' : 'after';
}

function buildFallbackReorderIntent(params: {
  activeSortId: string;
  overItem: MeasuredGridItem;
  pointer: PointerPoint;
  measuredItems: MeasuredGridItem[];
}): RootShortcutDropIntent | null {
  const { activeSortId, overItem, pointer, measuredItems } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId);
  if (!activeItem) return null;

  const edge = getReorderEdgeFromPointer(pointer, overItem.rect);
  const targetIndex = getReorderTargetIndex(activeItem.shortcutIndex, overItem.shortcutIndex, edge);
  if (targetIndex === activeItem.shortcutIndex) return null;

  return {
    type: 'reorder-root',
    activeShortcutId: activeItem.shortcut.id,
    overShortcutId: overItem.shortcut.id,
    targetIndex,
    edge,
  };
}

function buildCompactDropCenterRect(params: {
  rect: DOMRect;
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
} {
  const { rect, shortcut, compactIconSize, largeFolderEnabled, largeFolderPreviewSize } = params;
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
    allowLargeFolder: largeFolderEnabled,
    largeFolderPreviewSize,
  });
  const previewSize = Math.max(1, Math.min(metrics.previewSize, rect.width, rect.height));
  const left = rect.left + Math.max(0, (rect.width - previewSize) / 2);
  const top = rect.top;

  return {
    left,
    top,
    width: previewSize,
    height: previewSize,
    right: left + previewSize,
    bottom: top + previewSize,
  };
}

function inflateHitTestRect(rect: HitTestRect, amount: number): HitTestRect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function pointInHitTestRect(point: PointerPoint, rect: HitTestRect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function distanceToHitTestRect(point: PointerPoint, rect: HitTestRect): number {
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function distanceToHitTestRectCenter(point: PointerPoint, rect: HitTestRect): number {
  return Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
}

function resolveCompactHitRects(params: {
  rect: DOMRect;
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): { overRect: HitTestRect; overCenterRect: HitTestRect } {
  const { rect, shortcut, compactIconSize, largeFolderEnabled, largeFolderPreviewSize } = params;
  const overCenterRect = buildCompactDropCenterRect({
    rect,
    shortcut,
    compactIconSize,
    largeFolderEnabled,
    largeFolderPreviewSize,
  });
  const hitSlop = isShortcutLargeFolder(shortcut)
    ? COMPACT_LARGE_FOLDER_HIT_SLOP_PX
    : COMPACT_SMALL_TARGET_HIT_SLOP_PX;

  return {
    overCenterRect,
    overRect: inflateHitTestRect(overCenterRect, hitSlop),
  };
}

function pickOverItemCandidate(params: {
  activeSortId: string;
  measuredItems: MeasuredGridItem[];
  pointer: PointerPoint;
  compactLayout: boolean;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): OverItemCandidate | null {
  const {
    activeSortId,
    measuredItems,
    pointer,
    compactLayout,
    compactIconSize,
    largeFolderEnabled,
    largeFolderPreviewSize,
  } = params;
  const resolveRects = (item: MeasuredGridItem): { overRect: HitTestRect; overCenterRect: HitTestRect } => {
    if (!compactLayout) {
      return {
        overRect: item.rect,
        overCenterRect: item.rect,
      };
    }
    return resolveCompactHitRects({
      rect: item.rect,
      shortcut: item.shortcut,
      compactIconSize,
      largeFolderEnabled,
      largeFolderPreviewSize,
    });
  };

  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInHitTestRect(pointer, resolveRects(activeItem).overRect)) {
    return null;
  }

  const ranked = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => {
      const { overRect, overCenterRect } = resolveRects(item);
      return {
        item,
        overRect,
        overCenterRect,
        distance: distanceToHitTestRect(pointer, overRect),
        centerDistance: distanceToHitTestRectCenter(pointer, overCenterRect),
      };
    })
    .sort((left, right) => {
      if (left.distance !== right.distance) return left.distance - right.distance;
      return left.centerDistance - right.centerDistance;
    });

  const best = ranked[0];
  if (!best || best.distance > DRAG_MATCH_DISTANCE_PX) return null;

  return {
    overItem: best.item,
    overRect: best.overRect,
    overCenterRect: best.overCenterRect,
  };
}

function getCenterIntentActivationDelayMs(params: {
  intent: Extract<RootShortcutDropIntent, { type: 'merge-root-shortcuts' | 'move-root-shortcut-into-folder' }>;
  targetShortcut: Shortcut;
}): number {
  const { intent, targetShortcut } = params;
  if (intent.type === 'move-root-shortcut-into-folder' && isShortcutLargeFolder(targetShortcut)) {
    return LARGE_FOLDER_CENTER_INTENT_DELAY_MS;
  }
  return SMALL_TARGET_CENTER_INTENT_DELAY_MS;
}

function buildReorderProjectionOffsets(params: {
  items: GridItem[];
  layoutSnapshot: MeasuredGridItem[] | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
}): Map<string, ProjectionOffset> {
  const { items, layoutSnapshot, activeSortId, hoverIntent } = params;
  return buildSharedReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeSortId,
    hoveredId: hoverIntent?.type === 'reorder-root' ? hoverIntent.overShortcutId : null,
    targetIndex: hoverIntent?.type === 'reorder-root' ? hoverIntent.targetIndex : null,
    getId: (item) => item.sortId,
  });
}

function ShortcutGridItem({
  sortId,
  shortcut,
  activeDragId,
  hoverState,
  cardVariant,
  gridColumns,
  compactShowTitle,
  compactIconSize,
  iconCornerRadius,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite,
  enableLargeFolder,
  largeFolderPreviewSize,
  onPreviewShortcutOpen,
  columnStart,
  rowStart,
  columnSpan,
  rowSpan,
  onPointerDown,
  onOpen,
  onContextMenu,
  selected,
  selectionMode,
  dragDisabled,
  disableReorderAnimation,
  firefox,
  projectionOffset,
  registerItemElement,
}: {
  sortId: string;
  shortcut: Shortcut;
  activeDragId: string | null;
  hoverState: RootHoverState;
  cardVariant: ShortcutCardVariant;
  gridColumns: number;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected: boolean;
  selectionMode: boolean;
  dragDisabled: boolean;
  disableReorderAnimation: boolean;
  firefox: boolean;
  projectionOffset?: ProjectionOffset | null;
  registerItemElement: (element: HTMLDivElement | null) => void;
}) {
  const isDragging = activeDragId === sortId;
  const defaultPlaceholderHeight = defaultIconSize + defaultVerticalPadding * 2;
  const compactCardMetrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
    allowLargeFolder: enableLargeFolder,
    largeFolderPreviewSize,
  });
  const isHovered = hoverState?.type === 'item' && hoverState.sortId === sortId;
  const hoverEdge = isHovered ? hoverState.edge : null;
  const centerPreviewActive = hoverEdge === 'center';

  return (
    <div
      className="relative flex h-full items-start justify-center"
      style={{
        gridColumn: `${columnStart} / span ${columnSpan}`,
        gridRow: `${rowStart} / span ${rowSpan}`,
      }}
    >
      <DraggableShortcutItemFrame
        cardVariant={cardVariant}
        compactIconSize={compactIconSize}
        compactPreviewWidth={compactCardMetrics.previewSize}
        compactPreviewHeight={compactCardMetrics.previewSize}
        compactPlaceholderHeight={compactCardMetrics.height}
        compactPreviewBorderRadius={compactCardMetrics.largeFolder
          ? getLargeFolderBorderRadius(compactCardMetrics.previewSize, iconCornerRadius)
          : shortcut.kind === 'folder'
            ? getSmallFolderBorderRadius(compactCardMetrics.previewSize, iconCornerRadius)
          : getShortcutIconBorderRadius(iconCornerRadius)}
        iconCornerRadius={iconCornerRadius}
        defaultPlaceholderHeight={defaultPlaceholderHeight}
        isDragging={isDragging}
        hideDragPlaceholder
        centerPreviewActive={centerPreviewActive}
        projectionOffset={projectionOffset}
        disableReorderAnimation={disableReorderAnimation}
        firefox={firefox}
        dimmed={selectionMode && !selected}
        dragDisabled={dragDisabled}
        registerElement={registerItemElement}
        onPointerDown={onPointerDown}
        frameProps={{
          'data-shortcut-grid-columns': gridColumns,
          'data-shortcut-drag-item': 'true',
          'data-testid': `shortcut-card-${sortId}`,
          'data-shortcut-id': shortcut.id,
          'data-shortcut-title': shortcut.title,
        }}
        selectionOverlay={selectionMode ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl"
            aria-hidden="true"
          >
            {selected ? (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <RiCheckFill className="size-3.5" />
              </span>
            ) : null}
          </div>
        ) : null}
      >
        <ShortcutCardRenderer
          variant={cardVariant}
          compactShowTitle={compactShowTitle}
          compactIconSize={compactIconSize}
          iconCornerRadius={iconCornerRadius}
          compactTitleFontSize={compactTitleFontSize}
          defaultIconSize={defaultIconSize}
          defaultTitleFontSize={defaultTitleFontSize}
          defaultUrlFontSize={defaultUrlFontSize}
          defaultVerticalPadding={defaultVerticalPadding}
          forceTextWhite={forceTextWhite}
          enableLargeFolder={enableLargeFolder}
          largeFolderPreviewSize={largeFolderPreviewSize}
          onPreviewShortcutOpen={onPreviewShortcutOpen}
          shortcut={shortcut}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
        />
      </DraggableShortcutItemFrame>
    </div>
  );
}

interface ShortcutGridProps {
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onGridContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  cardVariant?: ShortcutCardVariant;
  compactShowTitle?: boolean;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  iconCornerRadius?: number;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
  forceTextWhite?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: ExternalShortcutDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
}

export const ShortcutGrid = React.memo(function ShortcutGrid({
  containerHeight,
  bottomInset = 0,
  shortcuts,
  gridColumns,
  minRows,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutReorder,
  onShortcutDropIntent,
  onGridContextMenu,
  cardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  compactShowTitle = true,
  layoutDensity = 'regular',
  compactIconSize = 72,
  iconCornerRadius = 22,
  compactTitleFontSize = 12,
  defaultIconSize = 36,
  defaultTitleFontSize = 14,
  defaultUrlFontSize = 10,
  defaultVerticalPadding = 8,
  forceTextWhite = false,
  onDragStart,
  onDragEnd,
  disableReorderAnimation = false,
  selectionMode = false,
  selectedShortcutIndexes,
  onToggleShortcutSelection,
  externalDragSession,
  onExternalDragSessionConsumed,
}: ShortcutGridProps) {
  const firefox = isFirefoxBuildTarget();
  const compactLayout = cardVariant === 'compact';
  const columnGap = compactLayout ? COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX : 8;
  const rowGap = cardVariant === 'compact'
    ? (layoutDensity === 'compact' ? 16 : layoutDensity === 'large' ? 24 : 20)
    : 8;
  const items = useMemo(() => {
    const used = new Map<string, number>();
    return shortcuts.map((shortcut, index) => {
      const shortcutIndex = index;
      const baseId = (shortcut.id || `${shortcut.url}::${shortcut.title}` || `shortcut-${shortcutIndex}`).trim();
      const duplicateCount = used.get(baseId) ?? 0;
      used.set(baseId, duplicateCount + 1);
      const sortId = duplicateCount === 0 ? baseId : `${baseId}::dup-${duplicateCount}`;
      return { sortId, shortcut, shortcutIndex };
    });
  }, [shortcuts]);

  const [dragging, setDragging] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<PointerPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<PointerPoint | null>(null);
  const [hoverIntent, setHoverIntent] = useState<RootShortcutDropIntent | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<MeasuredGridItem[] | null>(null);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);
  const [suppressProjectionSettleAnimation, setSuppressProjectionSettleAnimation] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const latestPointerRef = useRef<PointerPoint | null>(null);
  const hoverIntentRef = useRef<RootShortcutDropIntent | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const centerHoverCandidateRef = useRef<CenterHoverCandidate | null>(null);
  const dropCleanupRafRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);
  const autoScrollBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const autoScrollVelocityRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const projectionSettleResumeRafRef = useRef<number | null>(null);
  const consumedExternalDragTokenRef = useRef<number | null>(null);

  const largeFolderEnabled = compactLayout && gridColumns >= 2;
  const largeFolderPreviewSize = useMemo(() => {
    if (!largeFolderEnabled) return undefined;

    const minimumPreviewSize = compactIconSize * 2 + columnGap;
    const maxPreviewHeight = compactIconSize * 2 + rowGap + COMPACT_SHORTCUT_TITLE_BLOCK_HEIGHT_PX;

    if (!gridWidthPx || gridColumns <= 0) {
      return maxPreviewHeight;
    }

    const gridColumnWidth = (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
    const maxPreviewWidth = gridColumnWidth * 2 + columnGap;

    return Math.max(
      minimumPreviewSize,
      Math.floor(Math.min(maxPreviewWidth, maxPreviewHeight)),
    );
  }, [columnGap, compactIconSize, gridColumns, gridWidthPx, largeFolderEnabled, rowGap]);
  const resolveCompactShortcutMetrics = useCallback((shortcut: Shortcut) => getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
    allowLargeFolder: largeFolderEnabled,
    largeFolderPreviewSize,
  }), [compactIconSize, largeFolderEnabled, largeFolderPreviewSize]);
  const packedLayout = useMemo(() => packGridItems({
    items,
    gridColumns,
    getSpan: (shortcut) => {
      const metrics = resolveCompactShortcutMetrics(shortcut);
      return {
        columnSpan: metrics.columnSpan,
        rowSpan: metrics.rowSpan,
      };
    },
  }), [gridColumns, items, resolveCompactShortcutMetrics]);
  const displayRows = Math.max(packedLayout.rowCount, minRows);
  const rowHeight = cardVariant === 'compact'
    ? (compactIconSize + 24)
    : (defaultIconSize + defaultVerticalPadding * 2);
  const gridMinHeight = displayRows * rowHeight + Math.max(0, displayRows - 1) * rowGap;
  const usesSpanAwareReorder = compactLayout
    && largeFolderEnabled
    && packedLayout.placedItems.some((item) => item.columnSpan > 1 || item.rowSpan > 1);
  const gridColumnWidth = useMemo(() => {
    if (!gridWidthPx || gridColumns <= 0) return null;
    return (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
  }, [columnGap, gridColumns, gridWidthPx]);
  const reorderSlotCandidates = useMemo(() => {
    if (!usesSpanAwareReorder || !activeDragId || !gridColumnWidth) return [];

    const activeItem = items.find((item) => item.sortId === activeDragId);
    if (!activeItem) return [];

    const activeMetrics = resolveCompactShortcutMetrics(activeItem.shortcut);
    const preserveLargeFolders = !isFixedLargeFolderShortcut(activeItem.shortcut);

    if (preserveLargeFolders) {
      const remainingSmallItems = items.filter(
        (item) => !isFixedLargeFolderShortcut(item.shortcut) && item.sortId !== activeDragId,
      );
      if (remainingSmallItems.length === 0) return [];

      return Array.from({ length: remainingSmallItems.length + 1 }, (_, targetSmallOrdinal) => {
        const projection = buildProjectedGridItemsPreservingLargeFoldersBySmallOrdinal({
          items,
          activeSortId: activeDragId,
          targetSmallOrdinal,
        });
        if (!projection) return null;

        const projectedLayout = packGridItems({
          items: projection.projectedItems,
          gridColumns,
          getSpan: (shortcut) => {
            const metrics = resolveCompactShortcutMetrics(shortcut);
            return {
              columnSpan: metrics.columnSpan,
              rowSpan: metrics.rowSpan,
            };
          },
        });

        const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeDragId);
        const overItem = targetSmallOrdinal < remainingSmallItems.length
          ? remainingSmallItems[targetSmallOrdinal]
          : remainingSmallItems[remainingSmallItems.length - 1];
        if (!placedActiveItem || !overItem) return null;

        return {
          targetIndex: projection.activeFullIndex,
          overShortcutId: overItem.shortcut.id,
          edge: targetSmallOrdinal < remainingSmallItems.length ? 'before' as const : 'after' as const,
          left: (placedActiveItem.columnStart - 1) * (gridColumnWidth + columnGap),
          top: (placedActiveItem.rowStart - 1) * (rowHeight + rowGap),
          width: activeMetrics.width,
          height: activeMetrics.height,
        };
      }).filter((candidate): candidate is ReorderSlotCandidate => Boolean(candidate));
    }

    const remainingItems = items.filter((item) => item.sortId !== activeDragId);
    if (remainingItems.length === 0) return [];

    return Array.from({ length: remainingItems.length + 1 }, (_, targetIndex) => {
      const projectedItems = [...remainingItems];
      projectedItems.splice(targetIndex, 0, activeItem);

      const projectedLayout = packGridItems({
        items: projectedItems,
        gridColumns,
        getSpan: (shortcut) => {
          const metrics = resolveCompactShortcutMetrics(shortcut);
          return {
            columnSpan: metrics.columnSpan,
            rowSpan: metrics.rowSpan,
          };
        },
      });

      const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeDragId);
      const overItem = targetIndex < remainingItems.length
        ? remainingItems[targetIndex]
        : remainingItems[remainingItems.length - 1];
      if (!placedActiveItem || !overItem) return null;

      return {
        targetIndex,
        overShortcutId: overItem.shortcut.id,
        edge: targetIndex < remainingItems.length ? 'before' as const : 'after' as const,
        left: (placedActiveItem.columnStart - 1) * (gridColumnWidth + columnGap),
        top: (placedActiveItem.rowStart - 1) * (rowHeight + rowGap),
        width: activeMetrics.width,
        height: activeMetrics.height,
      };
    }).filter((candidate): candidate is ReorderSlotCandidate => Boolean(candidate));
  }, [
    activeDragId,
    columnGap,
    gridColumnWidth,
    gridColumns,
    items,
    resolveCompactShortcutMetrics,
    rowGap,
    rowHeight,
    usesSpanAwareReorder,
  ]);

  useLayoutEffect(() => {
    const rootNode = rootRef.current;
    if (!rootNode || typeof window === 'undefined') return;

    const updateGridWidth = () => {
      const nextWidth = Math.round(rootNode.clientWidth);
      setGridWidthPx((current) => (current === nextWidth ? current : nextWidth));
    };

    updateGridWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateGridWidth();
    });
    resizeObserver.observe(rootNode);

    window.addEventListener('resize', updateGridWidth, { passive: true });
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGridWidth);
    };
  }, []);

  const activeDragItem = useMemo(
    () => items.find((item) => item.sortId === activeDragId) ?? null,
    [activeDragId, items],
  );
  const preserveLargeFoldersDuringSmallReorder = usesSpanAwareReorder
    && Boolean(activeDragItem && !isFixedLargeFolderShortcut(activeDragItem.shortcut));

  const hoverState = useMemo(
    () => deriveHoverStateFromIntent(hoverIntent),
    [hoverIntent],
  );

  const projectionOffsets = useMemo(() => {
    if (
      usesSpanAwareReorder
      && dragLayoutSnapshot
      && activeDragId
      && hoverIntent?.type === 'reorder-root'
      && gridColumnWidth
      && rootRef.current
    ) {
      const projectedItems = buildProjectedGridItemsForRootReorder({
        items,
        activeSortId: activeDragId,
        targetIndex: hoverIntent.targetIndex,
        preserveLargeFolders: preserveLargeFoldersDuringSmallReorder,
      });
      if (projectedItems) {
        const projectedLayout = packGridItems({
          items: projectedItems,
          gridColumns,
          getSpan: (shortcut) => {
            const metrics = resolveCompactShortcutMetrics(shortcut);
            return {
              columnSpan: metrics.columnSpan,
              rowSpan: metrics.rowSpan,
            };
          },
        });
        const rootRect = rootRef.current.getBoundingClientRect();
        const currentRects = new Map(dragLayoutSnapshot.map((item) => [item.sortId, item.rect]));
        const offsets = new Map<string, ProjectionOffset>();

        projectedLayout.placedItems.forEach((item) => {
          if (item.sortId === activeDragId) return;
          const currentRect = currentRects.get(item.sortId);
          if (!currentRect) return;

          const metrics = resolveCompactShortcutMetrics(item.shortcut);
          const spanWidth = gridColumnWidth * item.columnSpan + columnGap * Math.max(0, item.columnSpan - 1);
          const projectedLeft = rootRect.left
            + (item.columnStart - 1) * (gridColumnWidth + columnGap)
            + Math.max(0, (spanWidth - metrics.width) / 2);
          const projectedTop = rootRect.top + (item.rowStart - 1) * (rowHeight + rowGap);
          const dx = projectedLeft - currentRect.left;
          const dy = projectedTop - currentRect.top;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
          offsets.set(item.sortId, { x: dx, y: dy });
        });

        return offsets;
      }
    }

    return buildReorderProjectionOffsets({
      items,
      layoutSnapshot: dragLayoutSnapshot,
      activeSortId: activeDragId,
      hoverIntent,
    });
  }, [
    activeDragId,
    columnGap,
    dragLayoutSnapshot,
    gridColumnWidth,
    gridColumns,
    hoverIntent,
    items,
    preserveLargeFoldersDuringSmallReorder,
    resolveCompactShortcutMetrics,
    rowGap,
    rowHeight,
    usesSpanAwareReorder,
  ]);

  useEffect(() => {
    activeDragIdRef.current = activeDragId;
  }, [activeDragId]);

  useEffect(() => {
    hoverIntentRef.current = hoverIntent;
  }, [hoverIntent]);

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const armProjectionSettleSuppression = useCallback(() => {
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }

    setSuppressProjectionSettleAnimation(true);
    const firstFrame = window.requestAnimationFrame(() => {
      projectionSettleResumeRafRef.current = window.requestAnimationFrame(() => {
        projectionSettleResumeRafRef.current = null;
        setSuppressProjectionSettleAnimation(false);
      });
    });
    projectionSettleResumeRafRef.current = firstFrame;
  }, []);

  const refreshAutoScrollBounds = useCallback(() => {
    const container = autoScrollContainerRef.current;
    if (!container) {
      autoScrollBoundsRef.current = null;
      return;
    }
    const rect = container.getBoundingClientRect();
    autoScrollBoundsRef.current = { top: rect.top, bottom: rect.bottom };
  }, []);

  const resolveIntentFromPointer = useCallback((pointer: PointerPoint): RootShortcutDropIntent | null => {
    const activeSortId = activeDragIdRef.current;
    const rootElement = rootRef.current;
    const session = dragSessionRef.current;
    if (!activeSortId || !rootElement || !session) return null;

    const measuredItems = dragLayoutSnapshot ?? measureGridItems(items, itemElementsRef.current);
    const activeItem = measuredItems.find((item) => item.sortId === activeSortId);
    if (!activeItem) return null;

    const visualCenter = getDragVisualCenter({
      pointer,
      previewOffset: session.previewOffset,
      activeRect: activeItem.rect,
    });
    const rootRect = rootElement.getBoundingClientRect();
    if (
      visualCenter.x < rootRect.left
      || visualCenter.x > rootRect.right
      || visualCenter.y < rootRect.top
      || visualCenter.y > rootRect.bottom
    ) {
      centerHoverCandidateRef.current = null;
      return null;
    }

    const pointerOverCandidate = pickOverItemCandidate({
      activeSortId,
      measuredItems,
      pointer,
      compactLayout,
      compactIconSize,
      largeFolderEnabled,
      largeFolderPreviewSize,
    });
    const pointerRawIntent = pointerOverCandidate
      ? resolveRootDropIntent({
          activeSortId,
          overSortId: pointerOverCandidate.overItem.sortId,
          pointer,
          overRect: pointerOverCandidate.overRect,
          overCenterRect: pointerOverCandidate.overCenterRect,
          items,
        })
      : null;

    if (pointerRawIntent && pointerRawIntent.type !== 'reorder-root') {
      const currentCandidate = centerHoverCandidateRef.current;
      const nextCandidateType = pointerRawIntent.type;
      const now = window.performance.now();
      const activationDelayMs = getCenterIntentActivationDelayMs({
        intent: pointerRawIntent,
        targetShortcut: pointerOverCandidate.overItem.shortcut,
      });
      if (activationDelayMs <= 0) {
        centerHoverCandidateRef.current = null;
        return pointerRawIntent;
      }

      if (
        currentCandidate
        && currentCandidate.targetSortId === pointerOverCandidate.overItem.sortId
        && currentCandidate.intentType === nextCandidateType
        && currentCandidate.activationDelayMs === activationDelayMs
      ) {
        if (now - currentCandidate.startedAt >= currentCandidate.activationDelayMs) {
          return pointerRawIntent;
        }
      } else {
        centerHoverCandidateRef.current = {
          targetSortId: pointerOverCandidate.overItem.sortId,
          intentType: nextCandidateType,
          startedAt: now,
          activationDelayMs,
        };
      }
    } else {
      centerHoverCandidateRef.current = null;
    }

    const slotIntent = usesSpanAwareReorder
      ? (() => {
          const candidate = pickClosestReorderSlot({
            point: {
              x: visualCenter.x - rootRect.left,
              y: visualCenter.y - rootRect.top,
            },
            candidates: reorderSlotCandidates,
          });
          if (!candidate) return null;
          return buildReorderIntentFromSlotCandidate({
            activeShortcutId: activeItem.shortcut.id,
            candidate,
          });
        })()
      : null;

    if (
      pointerRawIntent
      && pointerRawIntent.type !== 'reorder-root'
      && !isFixedLargeFolderShortcut(activeItem.shortcut)
      && pointerOverCandidate
      && !isShortcutLargeFolder(pointerOverCandidate.overItem.shortcut)
    ) {
      // For compact small targets, only let the live pointer short-circuit
      // positive center intents. Reorder should still be resolved from the
      // dragged icon's visual center so grouping remains easy to trigger.
      centerHoverCandidateRef.current = null;
      return pointerRawIntent;
    }

    const overCandidate = pickOverItemCandidate({
      activeSortId,
      measuredItems,
      pointer: visualCenter,
      compactLayout,
      compactIconSize,
      largeFolderEnabled,
      largeFolderPreviewSize,
    });
    if (!overCandidate) {
      centerHoverCandidateRef.current = null;
      return slotIntent;
    }

    const rawIntent = resolveRootDropIntent({
      activeSortId,
      overSortId: overCandidate.overItem.sortId,
      pointer: visualCenter,
      overRect: overCandidate.overRect,
      overCenterRect: overCandidate.overCenterRect,
      items,
    });
    if (!rawIntent) {
      centerHoverCandidateRef.current = null;
      return slotIntent;
    }

    if (rawIntent.type === 'reorder-root') {
      centerHoverCandidateRef.current = null;
      return slotIntent ?? rawIntent;
    }

    const currentCandidate = centerHoverCandidateRef.current;
    const nextCandidateType = rawIntent.type;
    const now = window.performance.now();
    const activationDelayMs = getCenterIntentActivationDelayMs({
      intent: rawIntent,
      targetShortcut: overCandidate.overItem.shortcut,
    });
    if (activationDelayMs <= 0) {
      centerHoverCandidateRef.current = null;
      return rawIntent;
    }

    if (
      currentCandidate
      && currentCandidate.targetSortId === overCandidate.overItem.sortId
      && currentCandidate.intentType === nextCandidateType
      && currentCandidate.activationDelayMs === activationDelayMs
    ) {
      if (now - currentCandidate.startedAt >= currentCandidate.activationDelayMs) {
        return rawIntent;
      }
    } else {
      centerHoverCandidateRef.current = {
        targetSortId: overCandidate.overItem.sortId,
        intentType: nextCandidateType,
        startedAt: now,
        activationDelayMs,
      };
    }

    return slotIntent ?? buildFallbackReorderIntent({
      activeSortId,
      overItem: overCandidate.overItem,
      pointer: visualCenter,
      measuredItems,
    });
  }, [
    compactIconSize,
    compactLayout,
    dragLayoutSnapshot,
    items,
    largeFolderEnabled,
    largeFolderPreviewSize,
    reorderSlotCandidates,
    usesSpanAwareReorder,
  ]);

  const syncHoverIntent = useCallback((pointer: PointerPoint) => {
    latestPointerRef.current = pointer;
    setHoverIntent(resolveIntentFromPointer(pointer));
  }, [resolveIntentFromPointer]);

  useEffect(() => {
    if (!externalDragSession) return;
    if (dragSessionRef.current || pendingDragRef.current) return;
    if (consumedExternalDragTokenRef.current === externalDragSession.token) return;

    const activeItem = items.find((item) => item.shortcut.id === externalDragSession.shortcutId);
    if (!activeItem) return;

    const measuredItems = measureGridItems(items, itemElementsRef.current);
    const measuredActiveItem = measuredItems.find((item) => item.sortId === activeItem.sortId);
    if (!measuredActiveItem) return;

    const previewOffset = {
      x: Math.max(0, Math.min(measuredActiveItem.rect.width, measuredActiveItem.rect.width * externalDragSession.anchor.xRatio)),
      y: Math.max(0, Math.min(measuredActiveItem.rect.height, measuredActiveItem.rect.height * externalDragSession.anchor.yRatio)),
    };

    const nextSession: DragSessionState = {
      pointerId: externalDragSession.pointerId,
      pointerType: externalDragSession.pointerType,
      activeId: activeItem.sortId,
      activeSortId: activeItem.sortId,
      pointer: externalDragSession.pointer,
      previewOffset,
    };
    dragSessionRef.current = nextSession;
    latestPointerRef.current = externalDragSession.pointer;
    autoScrollContainerRef.current = findScrollableParent(rootRef.current);
    refreshAutoScrollBounds();
    autoScrollVelocityRef.current = 0;
    document.body.style.userSelect = 'none';
    consumedExternalDragTokenRef.current = externalDragSession.token;

    setDragLayoutSnapshot(measuredItems);
    setDragging(true);
    setActiveDragId(activeItem.sortId);
    setDragPreviewOffset(previewOffset);
    setDragPointer(externalDragSession.pointer);
    syncHoverIntent(externalDragSession.pointer);
    onExternalDragSessionConsumed?.(externalDragSession.token);
  }, [
    externalDragSession,
    items,
    onExternalDragSessionConsumed,
    refreshAutoScrollBounds,
    syncHoverIntent,
  ]);

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current !== null) return;

    const tick = () => {
      const container = autoScrollContainerRef.current;
      const velocity = autoScrollVelocityRef.current;
      if (!container || Math.abs(velocity) < 0.01) {
        autoScrollRafRef.current = null;
        return;
      }

      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, container.scrollTop + velocity));
      container.scrollTop = nextScrollTop;

      const pointer = latestPointerRef.current;
      if (pointer) {
        syncHoverIntent(pointer);
      }

      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  }, [syncHoverIntent]);

  const updateAutoScrollVelocity = useCallback((clientY: number) => {
    const container = autoScrollContainerRef.current;
    const bounds = autoScrollBoundsRef.current;
    if (!container || !bounds) return;

    let velocity = 0;
    if (clientY < bounds.top + DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (bounds.top + DRAG_AUTO_SCROLL_EDGE_PX - clientY) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = -(DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio);
    } else if (clientY > bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (clientY - (bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX)) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio;
    }

    autoScrollVelocityRef.current = velocity;
    if (Math.abs(velocity) > 0.01) {
      startAutoScrollLoop();
    } else {
      stopAutoScroll();
    }
  }, [startAutoScrollLoop, stopAutoScroll]);

  const clearDragRuntimeState = useCallback(() => {
    pendingDragRef.current = null;
    dragSessionRef.current = null;
    latestPointerRef.current = null;
    centerHoverCandidateRef.current = null;
    setDragging(false);
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    setHoverIntent(null);
    setDragLayoutSnapshot(null);
    stopAutoScroll();
    autoScrollContainerRef.current = null;
    autoScrollBoundsRef.current = null;
    document.body.style.userSelect = '';
  }, [stopAutoScroll]);

  const scheduleDragCleanup = useCallback(() => {
    if (dropCleanupRafRef.current !== null) {
      window.cancelAnimationFrame(dropCleanupRafRef.current);
    }

    dropCleanupRafRef.current = window.requestAnimationFrame(() => {
      dropCleanupRafRef.current = null;
      clearDragRuntimeState();
    });
  }, [clearDragRuntimeState]);

  useEffect(() => {
    if (dragging) {
      ignoreClickRef.current = true;
      onDragStart?.();
    } else {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragEnd?.();
    }
  }, [dragging, onDragEnd, onDragStart]);

  useEffect(() => () => {
    if (dropCleanupRafRef.current !== null) {
      window.cancelAnimationFrame(dropCleanupRafRef.current);
      dropCleanupRafRef.current = null;
    }
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }
    clearDragRuntimeState();
  }, [clearDragRuntimeState]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const nextPointer = { x: event.clientX, y: event.clientY };
        pending.current = nextPointer;

        if (Math.hypot(nextPointer.x - pending.origin.x, nextPointer.y - pending.origin.y) < DRAG_ACTIVATION_DISTANCE_PX) {
          return;
        }

        const nextSession: DragSessionState = {
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          activeId: pending.activeSortId,
          activeSortId: pending.activeSortId,
          pointer: nextPointer,
          previewOffset: pending.previewOffset,
        };
        dragSessionRef.current = nextSession;
        pendingDragRef.current = null;

        if (dropCleanupRafRef.current !== null) {
          window.cancelAnimationFrame(dropCleanupRafRef.current);
          dropCleanupRafRef.current = null;
        }

        autoScrollContainerRef.current = findScrollableParent(rootRef.current);
        refreshAutoScrollBounds();
        autoScrollVelocityRef.current = 0;
        document.body.style.userSelect = 'none';
        setDragLayoutSnapshot(measureGridItems(items, itemElementsRef.current));

        setDragging(true);
        setActiveDragId(nextSession.activeSortId);
        setDragPreviewOffset(nextSession.previewOffset);
        setDragPointer(nextPointer);
        syncHoverIntent(nextPointer);
        event.preventDefault();
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const nextPointer = { x: event.clientX, y: event.clientY };
      session.pointer = nextPointer;
      setDragPointer(nextPointer);
      updateAutoScrollVelocity(nextPointer.y);
      syncHoverIntent(nextPointer);
      event.preventDefault();
    };

    const finishPointerInteraction = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        pendingDragRef.current = null;
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const finalIntent = hoverIntentRef.current;
      if (!finalIntent) {
        clearDragRuntimeState();
        return;
      }

      if (onShortcutDropIntent) {
        if (finalIntent.type === 'reorder-root') {
          armProjectionSettleSuppression();
          flushSync(() => {
            onShortcutDropIntent(finalIntent);
            clearDragRuntimeState();
          });
          return;
        }

        onShortcutDropIntent(finalIntent);
        scheduleDragCleanup();
        return;
      }

      if (finalIntent.type !== 'reorder-root') {
        scheduleDragCleanup();
        return;
      }
      const activeIndex = items.findIndex((item) => item.shortcut.id === finalIntent.activeShortcutId);
      if (activeIndex < 0) {
        clearDragRuntimeState();
        return;
      }
      const next = [...items];
      const [moved] = next.splice(activeIndex, 1);
      next.splice(finalIntent.targetIndex, 0, moved);
      armProjectionSettleSuppression();
      flushSync(() => {
        onShortcutReorder(next.map((item) => item.shortcut));
        clearDragRuntimeState();
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointerInteraction, { passive: true });
    window.addEventListener('pointercancel', finishPointerInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointerInteraction);
      window.removeEventListener('pointercancel', finishPointerInteraction);
    };
  }, [
    clearDragRuntimeState,
    armProjectionSettleSuppression,
    items,
    onShortcutDropIntent,
    onShortcutReorder,
    refreshAutoScrollBounds,
    scheduleDragCleanup,
    syncHoverIntent,
    updateAutoScrollVelocity,
  ]);

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      data-testid="shortcut-grid"
      style={{
        minHeight: Math.max(containerHeight, gridMinHeight),
        paddingBottom: Math.max(0, bottomInset),
      }}
      onContextMenu={onGridContextMenu}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(gridColumns, 1)}, minmax(0, 1fr))`,
          gridAutoRows: `${rowHeight}px`,
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
          touchAction: 'pan-y',
        }}
      >
        {packedLayout.placedItems.map((item) => (
          <ShortcutGridItem
            key={item.sortId}
            sortId={item.sortId}
            shortcut={item.shortcut}
            activeDragId={activeDragId}
            hoverState={hoverState}
            cardVariant={cardVariant}
            gridColumns={gridColumns}
            compactShowTitle={compactShowTitle}
            compactIconSize={compactIconSize}
            iconCornerRadius={iconCornerRadius}
            compactTitleFontSize={compactTitleFontSize}
            defaultIconSize={defaultIconSize}
            defaultTitleFontSize={defaultTitleFontSize}
            defaultUrlFontSize={defaultUrlFontSize}
            defaultVerticalPadding={defaultVerticalPadding}
            forceTextWhite={forceTextWhite}
            enableLargeFolder={largeFolderEnabled}
            largeFolderPreviewSize={largeFolderPreviewSize}
            onPreviewShortcutOpen={selectionMode ? undefined : onShortcutOpen}
            columnStart={item.columnStart}
            rowStart={item.rowStart}
            columnSpan={item.columnSpan}
            rowSpan={item.rowSpan}
            onPointerDown={(event) => {
              if (selectionMode) return;
              if (event.button !== 0) return;
              if (!event.isPrimary) return;

              const rect = event.currentTarget.getBoundingClientRect();
              pendingDragRef.current = {
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                activeId: item.sortId,
                activeSortId: item.sortId,
                origin: { x: event.clientX, y: event.clientY },
                current: { x: event.clientX, y: event.clientY },
                previewOffset: {
                  x: Math.max(0, event.clientX - rect.left),
                  y: Math.max(0, event.clientY - rect.top),
                },
              };
            }}
            onOpen={() => {
              if (ignoreClickRef.current) return;
              if (selectionMode) {
                onToggleShortcutSelection?.(item.shortcutIndex);
                return;
              }
              onShortcutOpen(item.shortcut);
            }}
            onContextMenu={(event) => {
              if (!ignoreClickRef.current) {
                onShortcutContextMenu(event, item.shortcutIndex, item.shortcut);
              }
            }}
            selected={Boolean(selectedShortcutIndexes?.has(item.shortcutIndex))}
            selectionMode={selectionMode}
            dragDisabled={selectionMode}
            disableReorderAnimation={disableReorderAnimation || suppressProjectionSettleAnimation}
            firefox={firefox}
            projectionOffset={projectionOffsets.get(item.sortId) ?? null}
            registerItemElement={(element) => {
              if (element) {
                itemElementsRef.current.set(item.sortId, element);
                return;
              }
              itemElementsRef.current.delete(item.sortId);
            }}
          />
        ))}
      </div>
      {typeof document !== 'undefined' && activeDragItem && dragPointer && dragPreviewOffset ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0"
          style={{
            zIndex: DRAG_OVERLAY_Z_INDEX,
            transform: `translate(${dragPointer.x - dragPreviewOffset.x}px, ${dragPointer.y - dragPreviewOffset.y}px)`,
          }}
        >
          {firefox ? (
            <LightweightDragPreview
              shortcut={activeDragItem.shortcut}
              cardVariant={cardVariant}
              firefox={firefox}
              compactShowTitle={compactShowTitle}
              compactIconSize={compactIconSize}
              iconCornerRadius={iconCornerRadius}
              compactTitleFontSize={compactTitleFontSize}
              defaultIconSize={defaultIconSize}
              defaultTitleFontSize={defaultTitleFontSize}
              defaultUrlFontSize={defaultUrlFontSize}
              defaultVerticalPadding={defaultVerticalPadding}
              forceTextWhite={forceTextWhite}
            />
          ) : (
            <ShortcutCardRenderer
              variant={cardVariant}
              compactShowTitle={compactShowTitle}
              compactIconSize={compactIconSize}
              iconCornerRadius={iconCornerRadius}
              compactTitleFontSize={compactTitleFontSize}
              defaultIconSize={defaultIconSize}
              defaultTitleFontSize={defaultTitleFontSize}
              defaultUrlFontSize={defaultUrlFontSize}
              defaultVerticalPadding={defaultVerticalPadding}
              forceTextWhite={forceTextWhite}
              enableLargeFolder={largeFolderEnabled}
              largeFolderPreviewSize={largeFolderPreviewSize}
              shortcut={activeDragItem.shortcut}
              onOpen={() => {}}
              onContextMenu={() => {}}
            />
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
});
