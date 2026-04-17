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

export type RootGridSceneDecorationState = {
  projectedDropPreviewNode: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
};

export type FolderGridSceneDecorationState = {
  projectedDropPreviewNode: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
  maskOverlayNode?: React.ReactNode;
  settlingDragPreviewOverlayNode: React.ReactNode;
};

export function resolveRootGridSceneDecorationState<T>(params: {
  projectedDropPreview: ProjectedDropPreviewLike;
} & DragPreviewDecorationParams<T>): RootGridSceneDecorationState {
  return {
    projectedDropPreviewNode: renderProjectedDropPreviewNode({
      preview: params.projectedDropPreview,
      testId: 'shortcut-drop-preview',
    }),
    dragPreviewOverlayNode: renderPointerDragPreviewOverlayNode({
      item: params.activeDragItem,
      pointer: params.dragPointer,
      previewOffset: params.dragPreviewOffset,
      zIndex: params.dragOverlayZIndex,
      renderPreview: params.renderDragPreview,
    }),
  };
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
    projectedDropPreviewNode: renderProjectedDropPreviewNode({
      preview: params.projectedDropPreview,
      visible: params.showProjectedDropPreview,
      testId: 'folder-shortcut-drop-preview',
    }),
    dragPreviewOverlayNode: renderPointerDragPreviewOverlayNode({
      item: params.activeDragItem,
      pointer: params.dragPointer,
      previewOffset: params.dragPreviewOffset,
      zIndex: params.dragOverlayZIndex,
      threeDimensional: true,
      renderPreview: params.renderDragPreview,
    }),
    maskOverlayNode: params.maskBoundaryRef
      ? renderFolderMaskOverlayNode({
          active: params.maskActive ?? false,
          hovered: params.maskHovered ?? false,
          boundaryRef: params.maskBoundaryRef,
        })
      : params.maskOverlay,
    settlingDragPreviewOverlayNode: renderSettlingDragPreviewOverlayNode({
      preview: params.dragSettlePreview,
      zIndex: params.dragOverlayZIndex,
      transition: buildFolderGridSettleTransition({
        enabled: params.settleAnimationsEnabled,
        settleDurationMs: FOLDER_DRAG_RELEASE_SETTLE_DURATION_MS,
      }),
      renderPreview: params.renderDragPreview,
    }),
  };
}
