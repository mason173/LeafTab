import {
  type CompactRootHoverResolution,
  type CompactTargetRegion,
  type CompactTargetRegions,
  resolveCompactRootHoverResolution,
} from '@leaftab/workspace-react';
import {
  getCompactShortcutCardMetrics,
  isShortcutLargeFolder,
} from '@/components/shortcuts/compactFolderLayout';
import type { Shortcut } from '@/types';

const COMPACT_SMALL_TARGET_HIT_SLOP_PX = 0;
const COMPACT_LARGE_FOLDER_HIT_SLOP_PX = 8;

export type { CompactRootHoverResolution, CompactTargetRegions };

export type HitTestRect = CompactTargetRegion;

function buildCompactDropCenterRect(params: {
  rect: HitTestRect;
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): HitTestRect {
  const { rect, shortcut, compactIconSize, largeFolderEnabled, largeFolderPreviewSize } = params;
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
    allowLargeFolder: largeFolderEnabled,
    largeFolderPreviewSize,
  });
  const previewSize = Math.max(1, Math.min(metrics.previewSize, rect.width, rect.height));
  const left = rect.left + Math.max(0, (rect.width - previewSize) / 2);
  const top = rect.top;

  return {
    left,
    top,
    width: previewSize,
    height: previewSize,
    right: left + previewSize,
    bottom: top + previewSize,
  };
}

function inflateHitTestRect(rect: HitTestRect, amount: number): HitTestRect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

export function resolveCompactTargetRegions(params: {
  rect: HitTestRect;
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): CompactTargetRegions {
  const { rect, shortcut, compactIconSize, largeFolderEnabled, largeFolderPreviewSize } = params;
  const targetIconRegion = buildCompactDropCenterRect({
    rect,
    shortcut,
    compactIconSize,
    largeFolderEnabled,
    largeFolderPreviewSize,
  });
  const hitSlop = isShortcutLargeFolder(shortcut)
    ? COMPACT_LARGE_FOLDER_HIT_SLOP_PX
    : COMPACT_SMALL_TARGET_HIT_SLOP_PX;

  return {
    targetCellRegion: rect,
    targetIconRegion,
    targetIconHitRegion: inflateHitTestRect(targetIconRegion, hitSlop),
  };
}

export { resolveCompactRootHoverResolution };
