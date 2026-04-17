import { useMemo } from 'react';
import type React from 'react';
import type { DragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { MeasuredDragItem, ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { PackedGridItem } from '@/features/shortcuts/drag/gridLayout';
import { resolveRootGridLayoutState } from '@/features/shortcuts/drag/rootGridLayoutState';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import {
  useFolderShortcutSurfaceInteractionControllerState,
  useRootShortcutGridInteractionControllerState,
} from '@/features/shortcuts/drag/useShortcutGridInteractionControllerState';
import type { Shortcut } from '@/types';
import { renderRootGridCenterPreview } from './leaftabGridVisuals';
import {
  resolveFolderShortcutSurfaceInteractionState,
  resolveRootShortcutGridInteractionState,
} from './shortcutGridSceneControllerStateAdapters';
import {
  buildFolderShortcutSurfaceSceneAssemblyParams,
  buildRootShortcutGridSceneAssemblyParams,
} from './shortcutGridSceneAssemblyParamAdapters';
import {
  resolveFolderShortcutSurfaceSceneAssembly,
  resolveRootShortcutGridSceneAssembly,
} from './shortcutGridSceneAssemblyAdapters';
import type {
  FolderShortcutPendingDragSession,
  RootShortcutPendingDragSession,
} from './shortcutGridSceneSharedTypes';
import { useFolderShortcutSurfaceState, useRootShortcutSurfaceState } from './shortcutGridSurfaceAdapters';
import type { FolderShortcutSurfaceSceneControllerParams } from './folderShortcutSurfaceSceneController';
import type { RootShortcutGridSceneControllerParams } from './rootShortcutGridSceneController';

type SceneControllerRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

function useResolvedRootGridLayoutControllerState<TItem extends {
  layout: { columnSpan: number; rowSpan: number };
}>(params: {
  items: readonly TItem[];
  controllerParams: RootShortcutGridSceneControllerParams;
  gridWidthPx: number | null;
}) {
  return useMemo(() => resolveRootGridLayoutState({
    items: params.items,
    gridColumns: params.controllerParams.gridColumns,
    minRows: params.controllerParams.minRows,
    gridWidthPx: params.gridWidthPx,
    compactIconSize: params.controllerParams.compactIconSize,
    layoutDensity: params.controllerParams.layoutDensity,
  }), [
    params.controllerParams.compactIconSize,
    params.controllerParams.gridColumns,
    params.controllerParams.layoutDensity,
    params.controllerParams.minRows,
    params.gridWidthPx,
    params.items,
  ]);
}

export function useRootShortcutGridResolvedSceneProps(params: {
  refs: SceneControllerRefs;
  controllerParams: RootShortcutGridSceneControllerParams;
  firefox: boolean;
  gridWidthPx: number | null;
}) {
  const {
    items,
    largeFolderEnabled,
    largeFolderPreviewSize,
    rootVisualOptions,
  } = useRootShortcutSurfaceState({
    shortcuts: params.controllerParams.shortcuts,
    gridColumns: params.controllerParams.gridColumns,
    gridWidthPx: params.gridWidthPx,
    layoutDensity: params.controllerParams.layoutDensity,
    compactShowTitle: params.controllerParams.compactShowTitle,
    compactIconSize: params.controllerParams.compactIconSize,
    iconCornerRadius: params.controllerParams.iconCornerRadius,
    iconAppearance: params.controllerParams.iconAppearance,
    compactTitleFontSize: params.controllerParams.compactTitleFontSize,
    forceTextWhite: params.controllerParams.forceTextWhite,
  });

  const {
    columnGap,
    rowGap,
    rowHeight,
    packedLayout,
    gridMinHeight,
    gridColumnWidth,
    usesSpanAwareReorder,
  } = useResolvedRootGridLayoutControllerState({
    items,
    controllerParams: params.controllerParams,
    gridWidthPx: params.gridWidthPx,
  });

  const {
    pendingDragRef,
    ignoreClickRef,
    itemElementsRef,
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragLayoutSnapshot,
  } = useRootShortcutGridInteractionControllerState({
    rootRef: params.refs.rootRef,
    items,
    shortcuts: params.controllerParams.shortcuts,
    gridColumns: params.controllerParams.gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    compactIconSize: params.controllerParams.compactIconSize,
    largeFolderEnabled,
    largeFolderPreviewSize,
    onShortcutReorder: params.controllerParams.onShortcutReorder,
    onShortcutDropIntent: params.controllerParams.onShortcutDropIntent,
    onDragStart: params.controllerParams.onDragStart,
    onDragEnd: params.controllerParams.onDragEnd,
    externalDragSession: params.controllerParams.externalDragSession,
    onExternalDragSessionConsumed: params.controllerParams.onExternalDragSessionConsumed,
  });

  return resolveRootShortcutGridSceneAssembly(
    buildRootShortcutGridSceneAssemblyParams({
      refs: params.refs,
      controllerParams: params.controllerParams,
      firefox: params.firefox,
      visualOptions: rootVisualOptions,
      layoutState: {
        items,
        packedItems: packedLayout.placedItems,
        gridMinHeight,
        gridColumnWidth,
        columnGap,
        rowHeight,
        rowGap,
        usesSpanAwareReorder,
      },
      interactionState: resolveRootShortcutGridInteractionState({
        layoutSnapshot: dragLayoutSnapshot,
        activeDragId,
        hoverResolution,
        dragPointer,
        dragPreviewOffset,
        layoutShiftOffsets,
        disableLayoutShiftTransition,
        pendingDragRef,
        itemElements: itemElementsRef.current,
        ignoreClickRef,
      }),
      renderCenterPreview: renderRootGridCenterPreview,
    }),
  );
}

export function useFolderShortcutSurfaceResolvedSceneProps(params: {
  refs: SceneControllerRefs;
  controllerParams: FolderShortcutSurfaceSceneControllerParams;
  firefox: boolean;
  columns: number;
}) {
  const {
    items: measuredItems,
    folderVisualOptions,
  } = useFolderShortcutSurfaceState({
    shortcuts: params.controllerParams.shortcuts,
    compactIconSize: params.controllerParams.compactIconSize,
    iconCornerRadius: params.controllerParams.iconCornerRadius,
    iconAppearance: params.controllerParams.iconAppearance,
    forceTextWhite: params.controllerParams.forceTextWhite,
    showShortcutTitles: params.controllerParams.showShortcutTitles,
  });

  const {
    pendingDragRef,
    ignoreClickRef,
    itemElementsRef,
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
    hoveredMask,
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    suppressProjectionSettleAnimation,
    dragSettlePreview,
    dragLayoutSnapshot,
  } = useFolderShortcutSurfaceInteractionControllerState({
    rootRef: params.refs.rootRef,
    maskBoundaryRef: params.controllerParams.maskBoundaryRef,
    folderId: params.controllerParams.folderId,
    shortcuts: params.controllerParams.shortcuts,
    measuredItems,
    columns: params.columns,
    onShortcutDropIntent: params.controllerParams.onShortcutDropIntent,
    onExtractDragStart: params.controllerParams.onExtractDragStart,
    onDragActiveChange: params.controllerParams.onDragActiveChange,
  });

  return resolveFolderShortcutSurfaceSceneAssembly(
    buildFolderShortcutSurfaceSceneAssemblyParams({
      refs: params.refs,
      controllerParams: params.controllerParams,
      firefox: params.firefox,
      visualOptions: folderVisualOptions,
      layoutState: {
        items: measuredItems,
        columns: params.columns,
      },
      interactionState: resolveFolderShortcutSurfaceInteractionState({
        layoutSnapshot: dragLayoutSnapshot,
        activeDragId,
        hoverResolution,
        dragSettlePreview,
        dragPointer,
        dragPreviewOffset,
        hoveredMask,
        layoutShiftOffsets,
        disableLayoutShiftTransition,
        suppressProjectionSettleAnimation,
        pendingDragRef,
        itemElements: itemElementsRef.current,
        ignoreClickRef,
      }),
    }),
  );
}
