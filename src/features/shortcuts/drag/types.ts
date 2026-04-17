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

class ReadonlySetView<T> implements ReadonlySet<T> {
  readonly size: number;

  constructor(private readonly source: ReadonlySet<T>) {
    this.size = source.size;
  }

  has(value: T): boolean {
    return this.source.has(value);
  }

  forEach(
    callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void,
    thisArg?: unknown,
  ): void {
    this.source.forEach((value) => {
      callbackfn.call(thisArg, value, value, this);
    });
  }

  entries(): SetIterator<[T, T]> {
    return this.source.entries();
  }

  keys(): SetIterator<T> {
    return this.source.keys();
  }

  values(): SetIterator<T> {
    return this.source.values();
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.source[Symbol.iterator]();
  }
}

function createReadonlySet<T>(values: Iterable<T>): ReadonlySet<T> {
  return new ReadonlySetView(new Set(values));
}

export function createRootDragDirectionMap(params?: {
  upper?: Iterable<string>;
  lower?: Iterable<string>;
  left?: Iterable<string>;
  right?: Iterable<string>;
}): RootDragDirectionMap {
  return {
    upper: createReadonlySet(params?.upper ?? []),
    lower: createReadonlySet(params?.lower ?? []),
    left: createReadonlySet(params?.left ?? []),
    right: createReadonlySet(params?.right ?? []),
  };
}

export type RootDragActiveTarget = {
  targetSortId: string;
};

export type RootDragSessionMeta = {
  directionMap?: RootDragDirectionMap;
};

export type FolderDragSessionMeta = RootDragSessionMeta & {
  activeShortcutIndex: number;
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
