import type {
  ActivePointerDragState,
  GridInteractionProfileLike,
  PendingPointerDragState,
  PointerPoint,
  RootShortcutDropIntent,
  Shortcut,
  ShortcutExternalDragSessionSeed,
} from '@leaftab/workspace-core';
import type React from 'react';
import type { CompactRootHoverResolution, CompactTargetRegions } from './compactRootHover';
import type { RootShortcutGridItemLayout } from './rootShortcutGridHelpers';
import type { RootShortcutGridHeatZoneInspector } from './rootResolution/compactHover';
import type {
  RootShortcutGridDropTargetRects,
  RootShortcutGridRenderCenterPreviewParams,
  RootShortcutGridRenderDragPreviewParams,
  RootShortcutGridRenderDropPreviewParams,
  RootShortcutGridRenderItemParams,
  RootShortcutGridResolveCompactTargetRegionsParams,
  RootShortcutGridResolveDropTargetRectsParams,
} from './rootView/renderSurface';

export const ROOT_SHORTCUT_GRID_DRAG_OVERLAY_Z_INDEX = 14030;
export const ROOT_SHORTCUT_GRID_DRAG_AUTO_SCROLL_EDGE_PX = 88;
export const ROOT_SHORTCUT_GRID_DRAG_AUTO_SCROLL_MAX_SPEED_PX = 26;
export const ROOT_SHORTCUT_GRID_DRAG_MATCH_DISTANCE_PX = 64;
export const ROOT_SHORTCUT_GRID_LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
export const ROOT_SHORTCUT_GRID_DRAG_RELEASE_SETTLE_DURATION_MS = 220;
export const ROOT_SHORTCUT_GRID_MERGE_DWELL_MS = 100;
export const ROOT_SHORTCUT_GRID_REORDER_DWELL_MS = 200;
export const ROOT_SHORTCUT_GRID_EXTRACT_HANDOFF_DELAY_MS = 520;
export const ROOT_SHORTCUT_GRID_HEAT_ZONE_CORE_INSET = 0.24;
export const ROOT_SHORTCUT_GRID_HEAT_ZONE_LARGE_FOLDER_CORE_INSET = 0.12;

export type PendingDragState = PendingPointerDragState<string> & {
  activeSortId: string;
  current: PointerPoint;
};

export type DragSessionState = ActivePointerDragState<string> & {
  activeSortId: string;
  sourceRootShortcutId?: string;
};

export type HoverResolution = CompactRootHoverResolution;

export type RootShortcutExternalDragSession = ShortcutExternalDragSessionSeed & {
  token: number;
};

export interface RootShortcutGridProps {
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  rowHeight: number;
  rowGap?: number;
  columnGap?: number;
  overlayZIndex?: number;
  resolveItemLayout: (shortcut: Shortcut) => RootShortcutGridItemLayout;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    shortcutIndex: number,
    shortcut: Shortcut,
  ) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onGridContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onHeatZoneInspectorChange?: (inspector: RootShortcutGridHeatZoneInspector | null) => void;
  interactionProfile?: GridInteractionProfileLike;
  forceReorderOnly?: boolean;
  extractBoundaryRef?: React.RefObject<HTMLElement | null>;
  onExtractDragStart?: (payload: ShortcutExternalDragSessionSeed) => void;
  onBoundaryHoverChange?: (hovered: boolean) => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
  isItemDragDisabled?: (shortcut: Shortcut) => boolean;
  isFirefox?: boolean;
  resolveDropTargetRects?: (
    params: RootShortcutGridResolveDropTargetRectsParams,
  ) => RootShortcutGridDropTargetRects;
  resolveCompactTargetRegions?: (
    params: RootShortcutGridResolveCompactTargetRegionsParams,
  ) => CompactTargetRegions;
  renderItem: (params: RootShortcutGridRenderItemParams) => React.ReactNode;
  renderDragPreview: (params: RootShortcutGridRenderDragPreviewParams) => React.ReactNode;
  renderCenterPreview?: (params: RootShortcutGridRenderCenterPreviewParams) => React.ReactNode;
  renderDropPreview?: (params: RootShortcutGridRenderDropPreviewParams) => React.ReactNode;
}

export function areHeatZoneInspectorsEqual(
  left: RootShortcutGridHeatZoneInspector | null,
  right: RootShortcutGridHeatZoneInspector | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.slotIndex === right.slotIndex
    && left.row === right.row
    && left.column === right.column
    && left.zone === right.zone
    && left.targetId === right.targetId
    && left.targetTitle === right.targetTitle
    && left.targetKind === right.targetKind
    && Math.abs(left.aimX - right.aimX) < 0.01
    && Math.abs(left.aimY - right.aimY) < 0.01
    && left.reorderOnlyMode === right.reorderOnlyMode
    && left.largeTarget === right.largeTarget
    && left.footprintSlotIndexes.length === right.footprintSlotIndexes.length
    && left.footprintSlotIndexes.every((slotIndex, index) => slotIndex === right.footprintSlotIndexes[index])
  );
}
