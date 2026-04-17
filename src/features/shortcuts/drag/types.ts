import type { Shortcut } from '@/types';

export type DragPoint = {
  x: number;
  y: number;
};

export type DragRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type GridMeasurementRect = DragRect;

export type RootDropEdge = 'before' | 'after';

export type RootShortcutDragItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type RootDragDirectionMap = {
  upper: ReadonlySet<string>;
  lower: ReadonlySet<string>;
  left: ReadonlySet<string>;
  right: ReadonlySet<string>;
};

export type RootDragSessionMeta = {
  directionMap?: RootDragDirectionMap;
};

export type RootShortcutDropIntent =
  | {
      type: 'merge-root-shortcuts';
      activeShortcutId: string;
      targetShortcutId: string;
    }
  | {
      type: 'move-root-shortcut-into-folder';
      activeShortcutId: string;
      targetFolderId: string;
    }
  | {
      type: 'reorder-root';
      activeShortcutId: string;
      overShortcutId: string;
      targetIndex: number;
      edge: RootDropEdge;
    };

export type FolderShortcutDropIntent =
  | {
      type: 'reorder-folder-shortcuts';
      folderId: string;
      shortcutId: string;
      targetIndex: number;
      edge: RootDropEdge;
    }
  | {
      type: 'extract-folder-shortcut';
      folderId: string;
      shortcutId: string;
    };

export type ShortcutDropIntent = RootShortcutDropIntent | FolderShortcutDropIntent;

export type ShortcutExternalDragSessionSeed = {
  shortcutId: string;
  sourceRootShortcutId: string;
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';
  pointer: DragPoint;
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};

export type FolderExtractDragStartPayload = {
  folderId: string;
  shortcutId: string;
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';
  pointer: DragPoint;
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};
