import {
  combineProjectionOffsets,
  isShortcutFolder,
  type DragRect,
  type PointerPoint,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/workspace-core';
import type React from 'react';
import { createPortal } from 'react-dom';
import { GridDragItemFrame } from '../GridDragItemFrame';
import type { ProjectedDropPreview } from '../rootResolution/projection';
import type {
  NormalizedRootShortcutGridItemLayout,
  RootShortcutGridItem,
} from '../rootShortcutGridHelpers';
import type { SerpentinePackedGridItem } from '../serpentineWorldGrid';
import type { DragSettlePreview } from '../useDragMotionState';

export type RootHoverState =
  | { type: 'item'; sortId: string; edge: 'before' | 'after' | 'center' }
  | null;

export type RootShortcutGridRenderItemParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  isDragging: boolean;
  selected: boolean;
  selectionMode: boolean;
  selectionDisabled: boolean;
  centerPreviewActive: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type RootShortcutGridRenderDragPreviewParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type RootShortcutGridRenderCenterPreviewParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type RootShortcutGridRenderDropPreviewParams = ProjectedDropPreview;

export type RootShortcutGridResolveDropTargetRectsParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  sortId: string;
  rect: DOMRect;
  layout: NormalizedRootShortcutGridItemLayout;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
};

export type RootShortcutGridDropTargetRects = {
  overRect: DragRect;
  overCenterRect?: DragRect;
};

export type RootShortcutGridResolveCompactTargetRegionsParams =
  RootShortcutGridResolveDropTargetRectsParams;

export function isPointInsidePreviewRect(params: {
  point: PointerPoint;
  rect: DOMRect;
  layout: Pick<
    NormalizedRootShortcutGridItemLayout,
    'previewOffsetX' | 'previewOffsetY' | 'previewWidth' | 'previewHeight'
  >;
}): boolean {
  const { point, rect, layout } = params;
  const localX = point.x - rect.left;
  const localY = point.y - rect.top;

  return (
    localX >= layout.previewOffsetX
    && localX <= layout.previewOffsetX + layout.previewWidth
    && localY >= layout.previewOffsetY
    && localY <= layout.previewOffsetY + layout.previewHeight
  );
}

export function detectFirefox() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

export function deriveHoverStateFromIntent(intent: RootShortcutDropIntent | null): RootHoverState {
  if (!intent) return null;

  switch (intent.type) {
    case 'reorder-root':
      return { type: 'item', sortId: intent.overShortcutId, edge: intent.edge };
    case 'merge-root-shortcuts':
      return { type: 'item', sortId: intent.targetShortcutId, edge: 'center' };
    case 'move-root-shortcut-into-folder':
      return { type: 'item', sortId: intent.targetFolderId, edge: 'center' };
    default:
      return null;
  }
}

function buildDefaultPlaceholder(layout: NormalizedRootShortcutGridItemLayout) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none border-2 border-dashed border-current/25 bg-current/5"
      style={{
        width: layout.width,
        height: layout.height,
        margin: '0 auto',
        borderRadius: layout.previewBorderRadius ?? '18px',
      }}
    />
  );
}

export function renderDefaultRootDropPreview(params: RootShortcutGridRenderDropPreviewParams) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-0 bg-black/10"
      style={{
        left: params.left,
        top: params.top,
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius ?? '18px',
        opacity: params.opacity,
      }}
    />
  );
}

type RootShortcutGridSurfaceProps = {
  rootRef: React.RefObject<HTMLDivElement | null>;
  containerHeight: number;
  bottomInset: number;
  gridMinHeight: number;
  onGridContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  dragging: boolean;
  effectiveProjectedDropPreview: ProjectedDropPreview | null;
  renderDropPreview: (params: RootShortcutGridRenderDropPreviewParams) => React.ReactNode;
  gridColumns: number;
  rowHeight: number;
  columnGap: number;
  rowGap: number;
  placedItems: SerpentinePackedGridItem<RootShortcutGridItem>[];
  projectionOffsets: Map<string, ProjectionOffset>;
  layoutShiftOffsets: Map<string, ProjectionOffset>;
  selectedShortcutIndexes?: ReadonlySet<number>;
  selectionMode: boolean;
  isItemDragDisabled?: (shortcut: Shortcut) => boolean;
  hoverState: RootHoverState;
  hiddenSortId: string | null;
  renderCenterPreview?: (params: RootShortcutGridRenderCenterPreviewParams) => React.ReactNode;
  disableReorderAnimation: boolean;
  suppressProjectionSettleAnimation: boolean;
  disableLayoutShiftTransition: boolean;
  isFirefox: boolean;
  itemElementsRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onItemPointerDown: (
    item: SerpentinePackedGridItem<RootShortcutGridItem>,
    event: React.PointerEvent<HTMLDivElement>,
  ) => void;
  renderItem: (params: RootShortcutGridRenderItemParams) => React.ReactNode;
  onItemOpen: (
    item: SerpentinePackedGridItem<RootShortcutGridItem>,
    selectionDisabled: boolean,
  ) => void;
  onItemContextMenu: (
    item: SerpentinePackedGridItem<RootShortcutGridItem>,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  activeDragItem: RootShortcutGridItem | null;
  dragPointer: PointerPoint | null;
  dragPreviewOffset: PointerPoint | null;
  overlayZIndex: number;
  renderDragPreview: (params: RootShortcutGridRenderDragPreviewParams) => React.ReactNode;
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  shortcuts: Shortcut[];
};

export function RootShortcutGridSurface({
  rootRef,
  containerHeight,
  bottomInset,
  gridMinHeight,
  onGridContextMenu,
  dragging,
  effectiveProjectedDropPreview,
  renderDropPreview,
  gridColumns,
  rowHeight,
  columnGap,
  rowGap,
  placedItems,
  projectionOffsets,
  layoutShiftOffsets,
  selectedShortcutIndexes,
  selectionMode,
  isItemDragDisabled,
  hoverState,
  hiddenSortId,
  renderCenterPreview,
  disableReorderAnimation,
  suppressProjectionSettleAnimation,
  disableLayoutShiftTransition,
  isFirefox,
  itemElementsRef,
  onItemPointerDown,
  renderItem,
  onItemOpen,
  onItemContextMenu,
  activeDragItem,
  dragPointer,
  dragPreviewOffset,
  overlayZIndex,
  renderDragPreview,
  dragSettlePreview,
  shortcuts,
}: RootShortcutGridSurfaceProps) {
  return (
    <div
      ref={rootRef}
      className="relative w-full"
      style={{
        minHeight: Math.max(containerHeight, gridMinHeight),
        paddingBottom: Math.max(0, bottomInset),
      }}
      onContextMenu={onGridContextMenu}
    >
      {dragging && effectiveProjectedDropPreview ? renderDropPreview(effectiveProjectedDropPreview) : null}
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
        {placedItems.map((item) => {
          const dragProjectionOffset = projectionOffsets.get(item.sortId) ?? null;
          const layoutShiftOffset = layoutShiftOffsets.get(item.sortId) ?? null;
          const combinedProjectionOffset = combineProjectionOffsets(
            dragProjectionOffset,
            layoutShiftOffset,
          );
          const isDragging = hiddenSortId === item.sortId;
          const isSelected = Boolean(selectedShortcutIndexes?.has(item.shortcutIndex));
          const selectionDisabled = selectionMode && isShortcutFolder(item.shortcut);
          const dragDisabled = selectionMode || Boolean(isItemDragDisabled?.(item.shortcut));
          const isHovered = hoverState?.type === 'item' && hoverState.sortId === item.sortId;
          const centerPreviewActive = isHovered && hoverState.edge === 'center';

          return (
            <div
              key={item.sortId}
              className="relative flex h-full items-start justify-center"
              style={{
                gridColumn: `${item.columnStart} / span ${item.columnSpan}`,
                gridRow: `${item.rowStart} / span ${item.rowSpan}`,
              }}
            >
              <GridDragItemFrame
                isDragging={isDragging}
                hideDragPlaceholder
                centerPreviewActive={centerPreviewActive}
                centerPreview={centerPreviewActive
                  ? renderCenterPreview?.({
                      shortcut: item.shortcut,
                      shortcutIndex: item.shortcutIndex,
                    }) ?? null
                  : null}
                projectionOffset={combinedProjectionOffset}
                disableReorderAnimation={
                  disableReorderAnimation
                  || suppressProjectionSettleAnimation
                  || disableLayoutShiftTransition
                }
                firefox={isFirefox}
                dimmed={selectionMode && !isSelected}
                dragDisabled={dragDisabled}
                registerElement={(element) => {
                  if (element) {
                    itemElementsRef.current.set(item.sortId, element);
                    return;
                  }
                  itemElementsRef.current.delete(item.sortId);
                }}
                onPointerDown={(event) => {
                  onItemPointerDown(item, event);
                }}
                placeholder={buildDefaultPlaceholder(item.layout)}
                frameProps={{
                  'data-shortcut-grid-columns': gridColumns,
                  'data-shortcut-drag-item': 'true',
                  'data-shortcut-id': item.shortcut.id,
                  'data-shortcut-title': item.shortcut.title,
                  style: {
                    width: item.layout.width,
                    height: item.layout.height,
                    overflow: 'visible',
                  },
                }}
              >
                {renderItem({
                  shortcut: item.shortcut,
                  shortcutIndex: item.shortcutIndex,
                  isDragging,
                  selected: isSelected,
                  selectionMode,
                  selectionDisabled,
                  centerPreviewActive,
                  onOpen: () => {
                    onItemOpen(item, selectionDisabled);
                  },
                  onContextMenu: (event) => {
                    onItemContextMenu(item, event);
                  },
                })}
              </GridDragItemFrame>
            </div>
          );
        })}
      </div>
      {typeof document !== 'undefined' && activeDragItem && dragPointer && dragPreviewOffset ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0"
          style={{
            zIndex: overlayZIndex,
            transform: `translate(${dragPointer.x - dragPreviewOffset.x}px, ${dragPointer.y - dragPreviewOffset.y}px)`,
          }}
        >
          {renderDragPreview({
            shortcut: activeDragItem.shortcut,
            shortcutIndex: activeDragItem.shortcutIndex,
          })}
        </div>,
        document.body,
      ) : null}
      {typeof document !== 'undefined' && dragSettlePreview ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0"
          style={{
            zIndex: overlayZIndex,
            transform: `translate(${dragSettlePreview.settling ? dragSettlePreview.toLeft : dragSettlePreview.fromLeft}px, ${dragSettlePreview.settling ? dragSettlePreview.toTop : dragSettlePreview.fromTop}px)`,
            transition: 'transform 220ms ease-in-out',
          }}
        >
          {renderDragPreview({
            shortcut: dragSettlePreview.item,
            shortcutIndex: shortcuts.findIndex((shortcut) => shortcut.id === dragSettlePreview.item.id),
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
