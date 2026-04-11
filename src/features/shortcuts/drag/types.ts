import type { Shortcut } from '@/types';

export type RootDropEdge = 'before' | 'after' | 'center';
export type DragRect = {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type RootShortcutDragItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type RootShortcutDropIntent =
  | {
      type: 'reorder-root';
      activeShortcutId: string;
      overShortcutId: string;
      targetIndex: number;
      edge: Exclude<RootDropEdge, 'center'>;
    }
  | {
      type: 'merge-root-shortcuts';
      activeShortcutId: string;
      targetShortcutId: string;
    }
  | {
      type: 'move-root-shortcut-into-folder';
      activeShortcutId: string;
      targetFolderId: string;
    };

export type FolderShortcutDropIntent =
  | {
      type: 'reorder-folder-shortcuts';
      folderId: string;
      shortcutId: string;
      targetIndex: number;
      edge: Exclude<RootDropEdge, 'center'>;
    }
  | {
      type: 'extract-folder-shortcut';
      folderId: string;
      shortcutId: string;
    };
