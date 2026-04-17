import { useMemo } from 'react';
import type React from 'react';
import { resolveRootGridLayoutState } from '@/features/shortcuts/drag/rootGridLayoutState';
import {
  useFolderShortcutSurfaceInteractionControllerState,
  useRootShortcutGridInteractionControllerState,
} from '@/features/shortcuts/drag/useShortcutGridInteractionControllerState';
import { renderRootGridCenterPreview } from './leaftabGridVisuals';
import {
  buildFolderShortcutSurfaceInteractionParams,
  buildFolderShortcutSurfaceStateParams,
  buildRootGridLayoutStateParams,
  buildRootShortcutGridInteractionParams,
  buildRootShortcutSurfaceStateParams,
} from './shortcutGridSceneControllerParamAdapters';
import {
  buildSceneControllerState,
  buildSceneInteractionState,
  buildSceneLayoutState,
} from './shortcutGridSceneControllerStateAdapters';
import {
  buildFolderShortcutSurfaceSceneAssemblyParams,
  buildRootShortcutGridSceneAssemblyParams,
} from './shortcutGridSceneAssemblyParamAdapters';
import {
  resolveFolderShortcutSurfaceSceneState,
  resolveRootShortcutGridSceneState,
} from './shortcutGridSceneStateAdapters';
import { useFolderShortcutSurfaceState, useRootShortcutSurfaceState } from './shortcutGridSurfaceAdapters';
import type { FolderShortcutSurfaceSceneControllerParams } from './folderShortcutSurfaceSceneController';
import type { RootShortcutGridSceneControllerParams } from './rootShortcutGridSceneController';

type SceneControllerRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

function resolveShortcutSceneState<TControllerParams, TLayoutState extends object, TInteractionState extends object, TVisualOptions, TAssemblyParams, TResult>(params: {
  refs: SceneControllerRefs;
  controllerParams: TControllerParams;
  firefox: boolean;
  visualOptions: TVisualOptions;
  sceneState: {
    layoutState: TLayoutState;
    interactionState: TInteractionState;
  };
  buildAssemblyParams: (params: {
    refs: SceneControllerRefs;
    controllerParams: TControllerParams;
    firefox: boolean;
    visualOptions: TVisualOptions;
    layoutState: TLayoutState;
    interactionState: TInteractionState;
  }) => TAssemblyParams;
  resolveSceneState: (params: TAssemblyParams) => TResult;
}): TResult {
  return params.resolveSceneState(params.buildAssemblyParams({
    refs: params.refs,
    controllerParams: params.controllerParams,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    layoutState: params.sceneState.layoutState,
    interactionState: params.sceneState.interactionState,
  }));
}

function useResolvedRootGridLayoutControllerState<TItem extends {
  layout: { columnSpan: number; rowSpan: number };
}>(params: {
  items: readonly TItem[];
  controllerParams: RootShortcutGridSceneControllerParams;
  gridWidthPx: number | null;
}) {
  return useMemo(() => resolveRootGridLayoutState(buildRootGridLayoutStateParams({
    items: params.items,
    gridColumns: params.controllerParams.gridColumns,
    minRows: params.controllerParams.minRows,
    gridWidthPx: params.gridWidthPx,
    compactIconSize: params.controllerParams.compactIconSize,
    layoutDensity: params.controllerParams.layoutDensity,
  })), [
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
  } = useRootShortcutSurfaceState(buildRootShortcutSurfaceStateParams({
    controllerParams: params.controllerParams,
    gridWidthPx: params.gridWidthPx,
  }));

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
  } = useRootShortcutGridInteractionControllerState(buildRootShortcutGridInteractionParams({
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
    controllerParams: params.controllerParams,
  }));

  return resolveShortcutSceneState({
    refs: params.refs,
    controllerParams: params.controllerParams,
    firefox: params.firefox,
    visualOptions: rootVisualOptions,
    sceneState: buildSceneControllerState({
      layoutState: buildSceneLayoutState({
        items,
        packedItems: packedLayout.placedItems,
        gridMinHeight,
        gridColumnWidth,
        columnGap,
        rowHeight,
        rowGap,
        usesSpanAwareReorder,
      }),
      interactionState: buildSceneInteractionState({
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
    }),
    buildAssemblyParams: (sceneParams) => buildRootShortcutGridSceneAssemblyParams({
      ...sceneParams,
      renderCenterPreview: renderRootGridCenterPreview,
    }),
    resolveSceneState: resolveRootShortcutGridSceneState,
  });
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
  } = useFolderShortcutSurfaceState(buildFolderShortcutSurfaceStateParams(params.controllerParams));

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
  } = useFolderShortcutSurfaceInteractionControllerState(buildFolderShortcutSurfaceInteractionParams({
    rootRef: params.refs.rootRef,
    measuredItems,
    columns: params.columns,
    controllerParams: params.controllerParams,
  }));

  return resolveShortcutSceneState({
    refs: params.refs,
    controllerParams: params.controllerParams,
    firefox: params.firefox,
    visualOptions: folderVisualOptions,
    sceneState: buildSceneControllerState({
      layoutState: buildSceneLayoutState({
        items: measuredItems,
        columns: params.columns,
      }),
      interactionState: buildSceneInteractionState({
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
    buildAssemblyParams: buildFolderShortcutSurfaceSceneAssemblyParams,
    resolveSceneState: resolveFolderShortcutSurfaceSceneState,
  });
}
