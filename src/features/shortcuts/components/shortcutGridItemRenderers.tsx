import React from 'react';
import { GridDragItemFrame } from '@/features/shortcuts/components/GridDragItemFrame';
import {
  buildFolderGridDragFrameBindings,
  buildFolderShortcutCardActionRenderParams,
  buildRootGridDragFrameBindings,
  buildRootShortcutCardActionRenderParams,
} from '@/features/shortcuts/components/shortcutGridInteractionAdapters';
import {
  renderRootGridCenterPreviewNode,
  renderRootSelectionOverlayNode,
} from '@/features/shortcuts/components/shortcutGridRenderAdapters';
import { buildAbsoluteGridItemStyle, renderGridItemPlaceholder } from '@/features/shortcuts/components/shortcutGridNodeAdapters';
import type {
  FolderShortcutContextMenuHandler,
  FolderShortcutRenderBindings,
  FolderShortcutPendingDragSession,
  RootShortcutContextMenuHandler,
  RootShortcutPendingDragSession,
  RootShortcutRenderBindings,
  ShortcutActionRenderParams,
  ShortcutGridFrameBindings,
  ShortcutInteractionBindings,
} from '@/features/shortcuts/components/shortcutGridSceneSharedTypes';
import {
  buildFolderShortcutItemRenderParams,
  buildRootShortcutCardRenderParams,
} from '@/features/shortcuts/components/shortcutGridVisualAdapters';
import type { Shortcut } from '@/types';
import type {
  FolderGridItemState,
  RootGridItemState,
} from '@/features/shortcuts/components/shortcutGridItemStateAdapters';

type SharedItemRendererInteractionParams<TPendingDragRef, TOnShortcutContextMenu> =
  ShortcutInteractionBindings<TPendingDragRef, TOnShortcutContextMenu>;

function renderGridItemNodes<TItemState>(
  itemStates: readonly TItemState[],
  renderItemNode: (itemState: TItemState) => React.ReactNode,
) {
  return itemStates.map(renderItemNode);
}

function hasProjectionMotion(params: { x: number; y: number }): boolean {
  return params.x !== 0 || params.y !== 0;
}

export type RootGridRenderableItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
  layout: {
    previewWidth: number;
  };
};

function buildRootGridItemInteractionRenderParams(params: {
  item: RootGridRenderableItem;
  itemRenderState: RootGridItemState<RootGridRenderableItem>['itemRenderState'];
  disableReorderAnimation: boolean;
  selectionMode: boolean;
  interactionParams: SharedItemRendererInteractionParams<
    RootShortcutPendingDragSession,
    RootShortcutContextMenuHandler
  >;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
}): {
  cardActionRenderParams: ShortcutActionRenderParams;
  frameBindings: ShortcutGridFrameBindings;
} {
  return {
    cardActionRenderParams: buildRootShortcutCardActionRenderParams({
      ignoreClickRef: params.interactionParams.ignoreClickRef,
      selectionMode: params.selectionMode,
      shortcut: params.item.shortcut,
      shortcutIndex: params.item.shortcutIndex,
      onShortcutOpen: params.interactionParams.onShortcutOpen,
      onToggleShortcutSelection: params.onToggleShortcutSelection,
      onShortcutContextMenu: params.interactionParams.onShortcutContextMenu,
    }),
    frameBindings: buildRootGridDragFrameBindings({
      disableReorderAnimation:
        params.disableReorderAnimation
        || params.interactionParams.disableLayoutShiftTransition
        || params.itemRenderState.frameState.isDragging
        || hasProjectionMotion(params.itemRenderState.frameState.projectionOffset),
      firefox: params.interactionParams.firefox,
      itemElements: params.interactionParams.itemElements,
      pendingDragRef: params.interactionParams.pendingDragRef,
      registerId: params.item.sortId,
      activeId: params.item.sortId,
      shortcutId: params.item.shortcut.id,
    }),
  };
}

export function renderRootGridItemNode(params: {
  item: RootGridRenderableItem;
  itemRenderState: RootGridItemState<RootGridRenderableItem>['itemRenderState'];
  disableReorderAnimation: boolean;
  selectionMode: boolean;
  selected: boolean;
  interactionParams: SharedItemRendererInteractionParams<
    RootShortcutPendingDragSession,
    RootShortcutContextMenuHandler
  >;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
} & RootShortcutRenderBindings) {
  const { cardActionRenderParams, frameBindings } = buildRootGridItemInteractionRenderParams({
    item: params.item,
    itemRenderState: params.itemRenderState,
    disableReorderAnimation: params.disableReorderAnimation,
    selectionMode: params.selectionMode,
    interactionParams: params.interactionParams,
    onToggleShortcutSelection: params.onToggleShortcutSelection,
  });

  return (
    <div
      key={params.item.sortId}
      className="absolute"
      style={buildAbsoluteGridItemStyle(params.itemRenderState.itemRect)}
      onContextMenu={cardActionRenderParams.onContextMenu}
    >
      <GridDragItemFrame
        isDragging={params.itemRenderState.frameState.isDragging}
        hideDragPlaceholder
        centerPreviewActive={params.itemRenderState.visualState.emphasized}
        projectionOffset={params.itemRenderState.frameState.projectionOffset}
        dragDisabled={params.selectionMode}
        centerPreview={renderRootGridCenterPreviewNode({
          active: params.itemRenderState.visualState.centerPreviewActive,
          shortcut: params.item.shortcut,
          visualOptions: params.rootVisualOptions,
          renderCenterPreview: params.renderCenterPreview,
        })}
        selectionOverlay={renderRootSelectionOverlayNode({
          visible: params.itemRenderState.selectionIndicatorVisible,
          sortId: params.item.shortcut.id,
          selected: params.selected,
          compactPreviewSize: params.item.layout.previewWidth,
          renderSelectionIndicator: params.renderSelectionIndicator,
        })}
        {...frameBindings}
      >
        {params.renderShortcutCard(buildRootShortcutCardRenderParams({
          shortcut: params.item.shortcut,
          visualOptions: params.rootVisualOptions,
          folderDropTargetActive: params.itemRenderState.visualState.folderDropTargetActive,
          onPreviewShortcutOpen: params.selectionMode ? undefined : params.interactionParams.onShortcutOpen,
          selectionDisabled: params.itemRenderState.selectionDisabled,
          ...cardActionRenderParams,
        }))}
      </GridDragItemFrame>
    </div>
  );
}

export function renderRootGridItemNodes<T extends RootGridRenderableItem>(params: {
  itemStates: RootGridItemState<T>[];
  selectionMode: boolean;
  disableReorderAnimation: boolean;
  interactionParams: SharedItemRendererInteractionParams<
    RootShortcutPendingDragSession,
    RootShortcutContextMenuHandler
  >;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
} & RootShortcutRenderBindings) {
  return renderGridItemNodes(params.itemStates, ({ item, itemRenderState, selected }) => {
    return renderRootGridItemNode({
      item,
      itemRenderState,
      selected,
      selectionMode: params.selectionMode,
      disableReorderAnimation: params.disableReorderAnimation,
      interactionParams: params.interactionParams,
      onToggleShortcutSelection: params.onToggleShortcutSelection,
      rootVisualOptions: params.rootVisualOptions,
      renderCenterPreview: params.renderCenterPreview,
      renderSelectionIndicator: params.renderSelectionIndicator,
      renderShortcutCard: params.renderShortcutCard,
    });
  });
}

export type FolderGridRenderableItem = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

function buildFolderGridItemInteractionRenderParams(params: {
  item: FolderGridRenderableItem;
  suppressProjectionSettleAnimation: boolean;
  interactionParams: SharedItemRendererInteractionParams<
    FolderShortcutPendingDragSession,
    FolderShortcutContextMenuHandler
  >;
}): {
  cardActionRenderParams: ShortcutActionRenderParams;
  frameBindings: ShortcutGridFrameBindings;
} {
  return {
    cardActionRenderParams: buildFolderShortcutCardActionRenderParams({
      shortcut: params.item.shortcut,
      ignoreClickRef: params.interactionParams.ignoreClickRef,
      onShortcutOpen: params.interactionParams.onShortcutOpen,
      onShortcutContextMenu: params.interactionParams.onShortcutContextMenu,
    }),
    frameBindings: buildFolderGridDragFrameBindings({
      disableReorderAnimation:
        params.interactionParams.disableLayoutShiftTransition
        || params.suppressProjectionSettleAnimation,
      firefox: params.interactionParams.firefox,
      itemElements: params.interactionParams.itemElements,
      pendingDragRef: params.interactionParams.pendingDragRef,
      registerId: params.item.shortcut.id,
      activeId: params.item.shortcut.id,
      activeShortcutIndex: params.item.shortcutIndex,
      shortcutId: params.item.shortcut.id,
    }),
  };
}

export function renderFolderGridItemNode(params: {
  item: FolderGridRenderableItem;
  itemRenderState: FolderGridItemState<FolderGridRenderableItem>['itemRenderState'];
  suppressProjectionSettleAnimation: boolean;
  interactionParams: SharedItemRendererInteractionParams<
    FolderShortcutPendingDragSession,
    FolderShortcutContextMenuHandler
  >;
} & FolderShortcutRenderBindings) {
  const { cardActionRenderParams, frameBindings } = buildFolderGridItemInteractionRenderParams({
    item: params.item,
    suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
    interactionParams: params.interactionParams,
  });

  return (
    <div key={params.item.shortcut.id} className="relative flex justify-center" data-folder-shortcut-grid-item="true">
      <GridDragItemFrame
        isDragging={params.itemRenderState.frameState.isDragging}
        hideDragPlaceholder
        projectionOffset={params.itemRenderState.frameState.projectionOffset}
        placeholder={renderGridItemPlaceholder(params.itemRenderState.placeholderStyle)}
        {...frameBindings}
      >
        {params.renderShortcutCard(buildFolderShortcutItemRenderParams({
          shortcut: params.item.shortcut,
          visualOptions: params.folderVisualOptions,
          ...cardActionRenderParams,
        }))}
      </GridDragItemFrame>
    </div>
  );
}

export function renderFolderGridItemNodes<T extends FolderGridRenderableItem>(params: {
  itemStates: FolderGridItemState<T>[];
  suppressProjectionSettleAnimation: boolean;
  interactionParams: SharedItemRendererInteractionParams<
    FolderShortcutPendingDragSession,
    FolderShortcutContextMenuHandler
  >;
} & FolderShortcutRenderBindings) {
  return renderGridItemNodes(params.itemStates, ({ item, itemRenderState }) => {
    return renderFolderGridItemNode({
      item,
      itemRenderState,
      suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
      interactionParams: params.interactionParams,
      folderVisualOptions: params.folderVisualOptions,
      renderShortcutCard: params.renderShortcutCard,
    });
  });
}
