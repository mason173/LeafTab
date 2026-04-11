import { getReorderTargetIndex } from './dropEdge';
import { getFolderPragmaticDragData, getFolderPragmaticDropData } from './pragmaticData';
import type { FolderShortcutDropIntent } from './types';

export function resolvePragmaticFolderDropIntent(params: {
  folderId: string;
  sourceData: Record<string | symbol, unknown>;
  dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
}): FolderShortcutDropIntent | null {
  const { folderId, sourceData, dropTargets } = params;
  const source = getFolderPragmaticDragData(sourceData);
  if (!source || source.folderId !== folderId) return null;

  for (const target of dropTargets) {
    const targetData = getFolderPragmaticDropData(target.data);
    if (!targetData || targetData.folderId !== folderId) continue;

    if (targetData.type === 'folder-extract' || targetData.type === 'folder-mask') {
      return {
        type: 'extract-folder-shortcut',
        folderId,
        shortcutId: source.shortcutId,
      };
    }

    if (targetData.shortcutId === source.shortcutId) continue;

    const edge = targetData.edge === 'center' ? 'after' : targetData.edge;
    const targetIndex = getReorderTargetIndex(source.shortcutIndex, targetData.shortcutIndex, edge);
    if (targetIndex === source.shortcutIndex) continue;

    return {
      type: 'reorder-folder-shortcuts',
      folderId,
      shortcutId: source.shortcutId,
      targetIndex,
      edge,
    };
  }

  return null;
}
