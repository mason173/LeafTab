import type { SetStateAction } from 'react';
import type { ShortcutWorkspaceAction, ShortcutWorkspaceState } from './types';

function resolveStateAction<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === 'function'
    ? (value as (prevState: T) => T)(current)
    : value;
}

export function shortcutWorkspaceReducer(
  state: ShortcutWorkspaceState,
  action: ShortcutWorkspaceAction,
): ShortcutWorkspaceState {
  switch (action.type) {
    case 'set-editing-folder-id':
      return {
        ...state,
        editingFolderId: resolveStateAction(action.value, state.editingFolderId),
      };
    case 'set-pending-root-folder-merge':
      return {
        ...state,
        pendingRootFolderMerge: resolveStateAction(action.value, state.pendingRootFolderMerge),
      };
    case 'set-folder-name-dialog-open':
      return {
        ...state,
        folderNameDialogOpen: resolveStateAction(action.value, state.folderNameDialogOpen),
      };
    case 'set-external-shortcut-drag-session':
      return {
        ...state,
        externalShortcutDragSession: resolveStateAction(action.value, state.externalShortcutDragSession),
      };
    case 'set-pending-extract-hidden-shortcut-id':
      return {
        ...state,
        pendingExtractHiddenShortcutId: resolveStateAction(action.value, state.pendingExtractHiddenShortcutId),
      };
    case 'set-pending-folder-extract-drag':
      return {
        ...state,
        pendingFolderExtractDrag: resolveStateAction(action.value, state.pendingFolderExtractDrag),
      };
    default:
      return state;
  }
}
