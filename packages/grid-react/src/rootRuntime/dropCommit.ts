import { flushSync } from 'react-dom';
import { resolveFinalHoverIntent, type RootShortcutGridItem } from '../rootShortcutGridHelpers';
import { buildRootDragReleasePreview } from './dragSettle';
import { type RootHoverResolution } from './hoverTiming';
import { type PointerPoint, type Shortcut } from '@leaftab/workspace-core';
import { type MeasuredRootGridItem } from '../rootGeometry/measurement';

type RootReleaseSession = {
  activeSortId: string;
  pointer: PointerPoint;
  previewOffset: PointerPoint;
};

export function commitRootPointerRelease(params: {
  session: RootReleaseSession;
  confirmedHoverResolutionRef: { current: RootHoverResolution };
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredRootGridItem[] | null;
  dragScrollOffset: { x: number; y: number };
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  frozenSortIds?: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  onShortcutDropIntent?: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  armProjectionSettleSuppression: () => void;
  startDragSettlePreview: (preview: {
    itemId: string;
    item: Shortcut;
    fromLeft: number;
    fromTop: number;
    toLeft: number;
    toTop: number;
  }) => void;
  captureLayoutShiftSourceRects: (rects: Map<string, DOMRect>) => void;
  measureCurrentRects: () => Map<string, DOMRect>;
  clearDragRuntimeState: () => void;
  scheduleDragCleanup: () => void;
}) {
  const {
    session,
    confirmedHoverResolutionRef,
    items,
    layoutSnapshot,
    dragScrollOffset,
    rootElement,
    usesSpanAwareReorder,
    frozenSortIds = null,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    onShortcutDropIntent,
    onShortcutReorder,
    armProjectionSettleSuppression,
    startDragSettlePreview,
    captureLayoutShiftSourceRects,
    measureCurrentRects,
    clearDragRuntimeState,
    scheduleDragCleanup,
  } = params;

  const finalIntent = resolveFinalHoverIntent(confirmedHoverResolutionRef.current);
  const dragReleasePreview = buildRootDragReleasePreview({
    items,
    session,
    hoverIntent: finalIntent,
    layoutSnapshot,
    dragScrollOffset,
    rootElement,
    usesSpanAwareReorder,
    frozenSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  });

  if (!finalIntent) {
    if (dragReleasePreview) {
      startDragSettlePreview(dragReleasePreview);
    }
    clearDragRuntimeState();
    return;
  }

  if (onShortcutDropIntent) {
    if (finalIntent.type === 'reorder-root') {
      armProjectionSettleSuppression();
      flushSync(() => {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        onShortcutDropIntent(finalIntent);
        clearDragRuntimeState();
      });
      return;
    }

    captureLayoutShiftSourceRects(measureCurrentRects());
    flushSync(() => {
      onShortcutDropIntent(finalIntent);
      clearDragRuntimeState();
    });
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
    if (dragReleasePreview) {
      startDragSettlePreview(dragReleasePreview);
    }
    onShortcutReorder(next.map((item) => item.shortcut));
    clearDragRuntimeState();
  });
}

export function createRootPointerReleaseController(params: {
  confirmedHoverResolutionRef: { current: RootHoverResolution };
  items: RootShortcutGridItem[];
  layoutSnapshotRef: { current: MeasuredRootGridItem[] | null };
  dragScrollOffset: { x: number; y: number };
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  frozenSortIds?: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  onShortcutDropIntent?: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  armProjectionSettleSuppression: () => void;
  startDragSettlePreview: (preview: {
    itemId: string;
    item: Shortcut;
    fromLeft: number;
    fromTop: number;
    toLeft: number;
    toTop: number;
  }) => void;
  captureLayoutShiftSourceRects: (rects: Map<string, DOMRect>) => void;
  measureCurrentRects: () => Map<string, DOMRect>;
  clearDragRuntimeState: () => void;
  scheduleDragCleanup: () => void;
}) {
  const onRelease = (session: RootReleaseSession) => {
    commitRootPointerRelease({
      session,
      confirmedHoverResolutionRef: params.confirmedHoverResolutionRef,
      items: params.items,
      layoutSnapshot: params.layoutSnapshotRef.current,
      dragScrollOffset: params.dragScrollOffset,
      rootElement: params.rootElement,
      usesSpanAwareReorder: params.usesSpanAwareReorder,
      frozenSortIds: params.frozenSortIds,
      gridColumns: params.gridColumns,
      gridColumnWidth: params.gridColumnWidth,
      columnGap: params.columnGap,
      rowHeight: params.rowHeight,
      rowGap: params.rowGap,
      onShortcutDropIntent: params.onShortcutDropIntent,
      onShortcutReorder: params.onShortcutReorder,
      armProjectionSettleSuppression: params.armProjectionSettleSuppression,
      startDragSettlePreview: params.startDragSettlePreview,
      captureLayoutShiftSourceRects: params.captureLayoutShiftSourceRects,
      measureCurrentRects: params.measureCurrentRects,
      clearDragRuntimeState: params.clearDragRuntimeState,
      scheduleDragCleanup: params.scheduleDragCleanup,
    });
  };

  return {
    onRelease,
  };
}
