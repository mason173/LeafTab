import type { Shortcut } from '../shortcutTypes';

export type RootDropEdge = 'before' | 'after' | 'center';

export type GridCellCoord = {
  row: number;
  column: number;
};

export type SerpentineGridCell = GridCellCoord & {
  sequence: number;
};

export type GridWorldSpec = {
  columns: number;
  cellSize: number;
  origin?: {
    x: number;
    y: number;
  };
  rowCount?: number;
};

export type BigFolderAnchorPolicy = 'center';

export type BigFolderFootprint = {
  anchorPolicy: BigFolderAnchorPolicy;
  columnStart: number;
  rowStart: number;
  columnSpan: 2;
  rowSpan: 2;
  cells: SerpentineGridCell[];
};

export type RootReorderPlacement =
  | {
      kind: 'stable-insert';
    }
  | {
      kind: 'big-folder-block-insert';
      gridColumns: number;
      rowCount?: number;
      targetFootprint: BigFolderFootprint;
    };

export type RootDragInteractionMode = 'normal' | 'reorder-only' | 'external-insert';

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
      placement?: RootReorderPlacement;
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

export type RootShortcutIntentCandidate =
  | {
      type: 'reorder-candidate';
      intent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }>;
    }
  | {
      type: 'group-candidate';
      intent: Extract<RootShortcutDropIntent, { type: 'merge-root-shortcuts' }>;
    }
  | {
      type: 'move-into-folder-candidate';
      intent: Extract<RootShortcutDropIntent, { type: 'move-root-shortcut-into-folder' }>;
    }
  | {
      type: 'merge-into-big-folder-candidate';
      intent: Extract<RootShortcutDropIntent, { type: 'move-root-shortcut-into-folder' }>;
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

export type ShortcutDropIntent = RootShortcutDropIntent | FolderShortcutDropIntent;

export type FolderExtractDragStartPayload = {
  folderId: string;
  shortcutId: string;
  pointerId: number;
  pointerType: string;
  pointer: { x: number; y: number };
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};

export type ShortcutExternalDragSessionSeed = {
  shortcutId: string;
  sourceRootShortcutId?: string;
  pointerId: number;
  pointerType: string;
  pointer: { x: number; y: number };
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};
