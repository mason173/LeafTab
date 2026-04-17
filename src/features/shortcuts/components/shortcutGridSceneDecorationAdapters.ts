import type React from 'react';
import type { DragPoint } from '@/features/shortcuts/drag/types';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import { buildFolderGridSettleTransition } from './shortcutGridSceneAdapters';
import {
  renderFolderMaskOverlayNode,
  renderPointerDragPreviewOverlayNode,
  renderProjectedDropPreviewNode,
  renderSettlingDragPreviewOverlayNode,
} from './shortcutGridSceneNodeAdapters';

const FOLDER_DRAG_RELEASE_SETTLE_DURATION_MS = 220;

type ShortcutLike = {
  id: string;
};

type ProjectedDropPreviewLike =
  import('@/features/shortcuts/drag/linearReorderProjection').ProjectedDropPreview | null;

type DragPreviewDecorationParams<T> = {
  activeDragItem: T | null;
  dragPointer: DragPoint | null;
  dragPreviewOffset: DragPoint | null;
  dragOverlayZIndex: number;
  renderDragPreview: (item: T) => React.ReactNode;
};

type SharedSceneDecorationState = {
  projectedDropPreviewNode: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
};

function buildSharedSceneDecorationState(
  params: SharedSceneDecorationState,
): SharedSceneDecorationState {
  return params;
}

export type RootGridSceneDecorationState = SharedSceneDecorationState;

export type FolderGridSceneDecorationState = SharedSceneDecorationState & {
  maskOverlayNode?: React.ReactNode;
  settlingDragPreviewOverlayNode: React.ReactNode;
};

function buildPointerDragSceneDecorationState<T>(params: {
  projectedDropPreview: ProjectedDropPreviewLike;
  projectedDropPreviewVisible?: boolean;
  projectedDropPreviewTestId: string;
  activeDragItem: T | null;
  dragPointer: DragPoint | null;
  dragPreviewOffset: DragPoint | null;
  dragOverlayZIndex: number;
  renderDragPreview: (item: T) => React.ReactNode;
  threeDimensional?: boolean;
}): SharedSceneDecorationState {
  return buildSharedSceneDecorationState({
    projectedDropPreviewNode: renderProjectedDropPreviewNode({
      preview: params.projectedDropPreview,
      visible: params.projectedDropPreviewVisible,
      testId: params.projectedDropPreviewTestId,
    }),
    dragPreviewOverlayNode: renderPointerDragPreviewOverlayNode({
      item: params.activeDragItem,
      pointer: params.dragPointer,
      previewOffset: params.dragPreviewOffset,
      zIndex: params.dragOverlayZIndex,
      threeDimensional: params.threeDimensional,
      renderPreview: params.renderDragPreview,
    }),
  });
}

function buildFolderMaskOverlayNode(params: {
  maskOverlay?: React.ReactNode;
  maskActive?: boolean;
  maskHovered?: boolean;
  maskBoundaryRef?: React.RefObject<HTMLElement | null>;
}) {
  return params.maskBoundaryRef
    ? renderFolderMaskOverlayNode({
        active: params.maskActive ?? false,
        hovered: params.maskHovered ?? false,
        boundaryRef: params.maskBoundaryRef,
      })
    : params.maskOverlay;
}

function buildSettlingDragPreviewOverlayNode<T>(params: {
  preview: DragSettlePreview<T> | null;
  dragOverlayZIndex: number;
  settleAnimationsEnabled: boolean;
  renderDragPreview: (item: T) => React.ReactNode;
}) {
  return renderSettlingDragPreviewOverlayNode({
    preview: params.preview,
    zIndex: params.dragOverlayZIndex,
    transition: buildFolderGridSettleTransition({
      enabled: params.settleAnimationsEnabled,
      settleDurationMs: FOLDER_DRAG_RELEASE_SETTLE_DURATION_MS,
    }),
    renderPreview: params.renderDragPreview,
  });
}

export function resolveRootGridSceneDecorationState<T>(params: {
  projectedDropPreview: ProjectedDropPreviewLike;
} & DragPreviewDecorationParams<T>): RootGridSceneDecorationState {
  return buildPointerDragSceneDecorationState({
    projectedDropPreview: params.projectedDropPreview,
    projectedDropPreviewTestId: 'shortcut-drop-preview',
    activeDragItem: params.activeDragItem,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    renderDragPreview: params.renderDragPreview,
  });
}

export function resolveFolderGridSceneDecorationState<T>(params: {
  projectedDropPreview: ProjectedDropPreviewLike;
  showProjectedDropPreview: boolean;
  dragSettlePreview: DragSettlePreview<ShortcutLike> | null;
  maskOverlay?: React.ReactNode;
  maskActive?: boolean;
  maskHovered?: boolean;
  maskBoundaryRef?: React.RefObject<HTMLElement | null>;
  settleAnimationsEnabled: boolean;
} & DragPreviewDecorationParams<T>): FolderGridSceneDecorationState {
  return {
    ...buildPointerDragSceneDecorationState({
      projectedDropPreview: params.projectedDropPreview,
      projectedDropPreviewVisible: params.showProjectedDropPreview,
      projectedDropPreviewTestId: 'folder-shortcut-drop-preview',
      activeDragItem: params.activeDragItem,
      dragPointer: params.dragPointer,
      dragPreviewOffset: params.dragPreviewOffset,
      dragOverlayZIndex: params.dragOverlayZIndex,
      threeDimensional: true,
      renderDragPreview: params.renderDragPreview,
    }),
    maskOverlayNode: buildFolderMaskOverlayNode({
      maskOverlay: params.maskOverlay,
      maskActive: params.maskActive,
      maskHovered: params.maskHovered,
      maskBoundaryRef: params.maskBoundaryRef,
    }),
    settlingDragPreviewOverlayNode: buildSettlingDragPreviewOverlayNode({
      preview: params.dragSettlePreview,
      dragOverlayZIndex: params.dragOverlayZIndex,
      settleAnimationsEnabled: params.settleAnimationsEnabled,
      renderDragPreview: params.renderDragPreview,
    }),
  };
}
