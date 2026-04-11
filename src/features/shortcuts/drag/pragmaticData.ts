import type { ShortcutKind } from '@/types';
import type { RootDropEdge } from './types';

const ROOT_PRAGMATIC_DRAG_DATA = Symbol('root-pragmatic-drag-data');
const ROOT_PRAGMATIC_DROP_DATA = Symbol('root-pragmatic-drop-data');
const FOLDER_PRAGMATIC_DRAG_DATA = Symbol('folder-pragmatic-drag-data');
const FOLDER_PRAGMATIC_DROP_DATA = Symbol('folder-pragmatic-drop-data');

export type RootPragmaticDragData = {
  type: 'root-shortcut';
  sortId: string;
  shortcutId: string;
  shortcutIndex: number;
  shortcutKind: ShortcutKind;
};

export type RootPragmaticDropData = {
  type: 'root-item';
  sortId: string;
  shortcutId: string;
  shortcutIndex: number;
  shortcutKind: ShortcutKind;
  edge: RootDropEdge;
};

export type FolderPragmaticDragData = {
  type: 'folder-shortcut';
  folderId: string;
  shortcutId: string;
  shortcutIndex: number;
};

export type FolderPragmaticDropData =
  | {
      type: 'folder-item';
      folderId: string;
      shortcutId: string;
      shortcutIndex: number;
      edge: RootDropEdge;
    }
  | {
      type: 'folder-extract';
      folderId: string;
    }
  | {
      type: 'folder-mask';
      folderId: string;
      zone: 'top' | 'right' | 'bottom' | 'left';
    };

export function buildRootPragmaticDragData(data: RootPragmaticDragData): Record<string | symbol, unknown> {
  return {
    [ROOT_PRAGMATIC_DRAG_DATA]: data,
  };
}

export function getRootPragmaticDragData(data: Record<string | symbol, unknown> | null | undefined): RootPragmaticDragData | null {
  const value = data?.[ROOT_PRAGMATIC_DRAG_DATA];
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<RootPragmaticDragData>;
  if (
    candidate.type !== 'root-shortcut'
    || !candidate.sortId
    || !candidate.shortcutId
    || typeof candidate.shortcutIndex !== 'number'
    || (candidate.shortcutKind !== 'link' && candidate.shortcutKind !== 'folder')
  ) {
    return null;
  }
  return candidate as RootPragmaticDragData;
}

export function buildRootPragmaticDropData(data: RootPragmaticDropData): Record<string | symbol, unknown> {
  return {
    [ROOT_PRAGMATIC_DROP_DATA]: data,
  };
}

export function getRootPragmaticDropData(data: Record<string | symbol, unknown> | null | undefined): RootPragmaticDropData | null {
  const value = data?.[ROOT_PRAGMATIC_DROP_DATA];
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<RootPragmaticDropData>;
  if (
    candidate.type !== 'root-item'
    || !candidate.sortId
    || !candidate.shortcutId
    || typeof candidate.shortcutIndex !== 'number'
    || (candidate.shortcutKind !== 'link' && candidate.shortcutKind !== 'folder')
    || !candidate.edge
  ) {
    return null;
  }
  return candidate as RootPragmaticDropData;
}

export function buildFolderPragmaticDragData(data: FolderPragmaticDragData): Record<string | symbol, unknown> {
  return {
    [FOLDER_PRAGMATIC_DRAG_DATA]: data,
  };
}

export function getFolderPragmaticDragData(data: Record<string | symbol, unknown> | null | undefined): FolderPragmaticDragData | null {
  const value = data?.[FOLDER_PRAGMATIC_DRAG_DATA];
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FolderPragmaticDragData>;
  if (candidate.type !== 'folder-shortcut' || !candidate.folderId || !candidate.shortcutId || typeof candidate.shortcutIndex !== 'number') {
    return null;
  }
  return candidate as FolderPragmaticDragData;
}

export function buildFolderPragmaticDropData(data: FolderPragmaticDropData): Record<string | symbol, unknown> {
  return {
    [FOLDER_PRAGMATIC_DROP_DATA]: data,
  };
}

export function getFolderPragmaticDropData(data: Record<string | symbol, unknown> | null | undefined): FolderPragmaticDropData | null {
  const value = data?.[FOLDER_PRAGMATIC_DROP_DATA];
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FolderPragmaticDropData>;
  if (candidate.type === 'folder-item' && candidate.folderId && candidate.shortcutId && typeof candidate.shortcutIndex === 'number' && candidate.edge) {
    return candidate as FolderPragmaticDropData;
  }
  if (candidate.type === 'folder-extract' && candidate.folderId) {
    return candidate as FolderPragmaticDropData;
  }
  if (
    candidate.type === 'folder-mask'
    && candidate.folderId
    && (candidate.zone === 'top' || candidate.zone === 'right' || candidate.zone === 'bottom' || candidate.zone === 'left')
  ) {
    return candidate as FolderPragmaticDropData;
  }
  return null;
}
