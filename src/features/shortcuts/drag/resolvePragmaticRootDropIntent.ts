import { getReorderTargetIndex } from './dropEdge';
import { getRootPragmaticDragData, getRootPragmaticDropData } from './pragmaticData';
import type { RootShortcutDropIntent } from './types';

export function resolvePragmaticRootDropIntent(params: {
  sourceData: Record<string | symbol, unknown>;
  dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
}): RootShortcutDropIntent | null {
  const source = getRootPragmaticDragData(params.sourceData);
  if (!source) return null;

  for (const target of params.dropTargets) {
    const targetData = getRootPragmaticDropData(target.data);
    if (!targetData) continue;
    if (targetData.sortId === source.sortId) continue;

    if (targetData.edge === 'center') {
      if (source.shortcutKind === 'link' && targetData.shortcutKind === 'folder') {
        return {
          type: 'move-root-shortcut-into-folder',
          activeShortcutId: source.shortcutId,
          targetFolderId: targetData.shortcutId,
        };
      }

      if (source.shortcutKind === 'link' && targetData.shortcutKind === 'link') {
        return {
          type: 'merge-root-shortcuts',
          activeShortcutId: source.shortcutId,
          targetShortcutId: targetData.shortcutId,
        };
      }
    }

    const edge = targetData.edge === 'center' ? 'after' : targetData.edge;
    const targetIndex = getReorderTargetIndex(source.shortcutIndex, targetData.shortcutIndex, edge);
    if (targetIndex === source.shortcutIndex) continue;

    return {
      type: 'reorder-root',
      activeShortcutId: source.shortcutId,
      overShortcutId: targetData.shortcutId,
      targetIndex,
      edge,
    };
  }

  return null;
}
