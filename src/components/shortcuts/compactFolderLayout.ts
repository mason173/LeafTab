import type { Shortcut } from '@/types';
import { isShortcutFolder } from '@/utils/shortcutFolders';

export const COMPACT_SHORTCUT_TITLE_BLOCK_HEIGHT_PX = 24;
export const COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX = 12;
export const LARGE_FOLDER_GRID_SPAN = 2;
export const LARGE_FOLDER_PREVIEW_VISIBLE_COUNT = 9;

export function isShortcutLargeFolder(shortcut: Shortcut | null | undefined): boolean {
  return Boolean(isShortcutFolder(shortcut) && shortcut.folderDisplayMode === 'large');
}

export function getCompactShortcutPreviewSize(params: {
  shortcut: Shortcut;
  iconSize: number;
  allowLargeFolder?: boolean;
  columnGap?: number;
  largeFolderPreviewSize?: number;
}): number {
  const {
    shortcut,
    iconSize,
    allowLargeFolder = false,
    columnGap = COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX,
    largeFolderPreviewSize,
  } = params;

  if (!allowLargeFolder || !isShortcutLargeFolder(shortcut)) {
    return iconSize;
  }

  return Math.max(
    iconSize * LARGE_FOLDER_GRID_SPAN + columnGap * (LARGE_FOLDER_GRID_SPAN - 1),
    largeFolderPreviewSize ?? 0,
  );
}

export function getCompactShortcutCardMetrics(params: {
  shortcut: Shortcut;
  iconSize: number;
  allowLargeFolder?: boolean;
  columnGap?: number;
  largeFolderPreviewSize?: number;
  ignoreTitleHeight?: boolean;
}) {
  const previewSize = getCompactShortcutPreviewSize(params);
  const largeFolder = params.allowLargeFolder && isShortcutLargeFolder(params.shortcut);
  const ignoreTitleHeight = Boolean(params.ignoreTitleHeight);

  return {
    previewSize,
    width: previewSize,
    height: ignoreTitleHeight ? previewSize : previewSize + COMPACT_SHORTCUT_TITLE_BLOCK_HEIGHT_PX,
    columnSpan: largeFolder ? LARGE_FOLDER_GRID_SPAN : 1,
    rowSpan: largeFolder ? LARGE_FOLDER_GRID_SPAN : 1,
    largeFolder,
  };
}
