import type { SetStateAction } from 'react';
import type { RootShortcutExternalDragSession } from '@/features/shortcuts/components/RootShortcutGrid';
import type { Shortcut } from '@/types';

export type PendingRootFolderMerge = {
  scenarioId: string;
  activeShortcutId: string;
  targetShortcutId: string;
};

export type PendingFolderExtractDrag = {
  scenarioId: string;
  extractedShortcutId: string;
  pointerId: number;
  previewShortcuts: Shortcut[];
  committed: boolean;
};

export type ShortcutWorkspaceState = {
  editingFolderId: string | null;
  pendingRootFolderMerge: PendingRootFolderMerge | null;
  folderNameDialogOpen: boolean;
  externalShortcutDragSession: RootShortcutExternalDragSession | null;
  pendingExtractHiddenShortcutId: string | null;
  pendingFolderExtractDrag: PendingFolderExtractDrag | null;
};

export type ShortcutWorkspaceAction =
  | { type: 'set-editing-folder-id'; value: SetStateAction<string | null> }
  | { type: 'set-pending-root-folder-merge'; value: SetStateAction<PendingRootFolderMerge | null> }
  | { type: 'set-folder-name-dialog-open'; value: SetStateAction<boolean> }
  | { type: 'set-external-shortcut-drag-session'; value: SetStateAction<RootShortcutExternalDragSession | null> }
  | { type: 'set-pending-extract-hidden-shortcut-id'; value: SetStateAction<string | null> }
  | { type: 'set-pending-folder-extract-drag'; value: SetStateAction<PendingFolderExtractDrag | null> };

export function createInitialShortcutWorkspaceState(): ShortcutWorkspaceState {
  return {
    editingFolderId: null,
    pendingRootFolderMerge: null,
    folderNameDialogOpen: false,
    externalShortcutDragSession: null,
    pendingExtractHiddenShortcutId: null,
    pendingFolderExtractDrag: null,
  };
}
