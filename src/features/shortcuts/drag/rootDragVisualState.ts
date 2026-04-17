import type { RootShortcutDropIntent } from './types';
import type { Shortcut } from '@/types';

export type RootDragVisualState = {
  folderDropTargetId: string | null;
  mergeTargetId: string | null;
  dropPreviewOpacity: number | undefined;
};

export type RootDragItemVisualState = {
  folderDropTargetActive: boolean;
  centerPreviewActive: boolean;
  folderCenterPreviewActive: boolean;
  emphasized: boolean;
};

const SECONDARY_DROP_PREVIEW_OPACITY = 0.01;

export function resolveRootDragVisualState(
  interactionIntent: RootShortcutDropIntent | null,
  previewOpacity?: number,
): RootDragVisualState {
  if (!interactionIntent) {
    return {
      folderDropTargetId: null,
      mergeTargetId: null,
      dropPreviewOpacity: previewOpacity,
    };
  }

  switch (interactionIntent.type) {
    case 'move-root-shortcut-into-folder':
      return {
        folderDropTargetId: interactionIntent.targetFolderId,
        mergeTargetId: null,
        dropPreviewOpacity: SECONDARY_DROP_PREVIEW_OPACITY,
      };
    case 'merge-root-shortcuts':
      return {
        folderDropTargetId: null,
        mergeTargetId: interactionIntent.targetShortcutId,
        dropPreviewOpacity: previewOpacity,
      };
    default:
      return {
        folderDropTargetId: null,
        mergeTargetId: null,
        dropPreviewOpacity: previewOpacity,
      };
  }
}

export function resolveRootDragItemVisualState(params: {
  shortcut: Shortcut;
  shortcutId: string;
  visualState: RootDragVisualState;
}): RootDragItemVisualState {
  const { shortcut, shortcutId, visualState } = params;
  const folderDropTargetActive = visualState.folderDropTargetId === shortcutId;
  const centerPreviewActive = visualState.mergeTargetId === shortcutId && shortcut.kind !== 'folder';
  const folderCenterPreviewActive = Boolean(
    folderDropTargetActive
      && shortcut.kind === 'folder'
      && shortcut.folderDisplayMode !== 'large',
  );

  return {
    folderDropTargetActive,
    centerPreviewActive,
    folderCenterPreviewActive,
    emphasized: centerPreviewActive || folderCenterPreviewActive,
  };
}
