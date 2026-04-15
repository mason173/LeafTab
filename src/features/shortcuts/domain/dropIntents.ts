import type {
  FolderExtractDragStartPayload,
  ShortcutDropIntent,
  ShortcutExternalDragSessionSeed,
} from '@/features/shortcuts/drag/types';
import { ROOT_SHORTCUTS_PATH } from '@/features/shortcuts/model/paths';
import { SUPPORTED_SHORTCUT_FOLDER_DEPTH, supportsShortcutFolderDepth } from '@/features/shortcuts/model/constraints';
import {
  extractShortcutFromFolder,
  moveShortcutsIntoFolder,
  reorderRootShortcutPreservingLargeFolderPositions,
  reorderShortcutWithinContainer,
} from '@/features/shortcuts/model/operations';
import { isShortcutFolder } from '@/features/shortcuts/model/selectors';
import type { Shortcut } from '@/types';

export type ShortcutInteractionApplication =
  | {
      kind: 'update-shortcuts';
      shortcuts: Shortcut[];
    }
  | {
      kind: 'request-folder-merge';
      activeShortcutId: string;
      targetShortcutId: string;
    }
  | {
      kind: 'start-root-drag-session';
      shortcuts: Shortcut[];
      session: ShortcutExternalDragSessionSeed;
      closeFolderId: string | null;
    }
  | {
      kind: 'unsupported-tree';
      maxSupportedFolderDepth: number;
    }
  | {
      kind: 'noop';
    };

function createUnsupportedTreeOutcome(): ShortcutInteractionApplication {
  return {
    kind: 'unsupported-tree',
    maxSupportedFolderDepth: SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  };
}

function supportsOpenSourceShortcutTree(shortcuts: readonly Shortcut[]): boolean {
  return supportsShortcutFolderDepth(shortcuts, SUPPORTED_SHORTCUT_FOLDER_DEPTH);
}

function shouldPreserveLargeFolderPositions(shortcuts: readonly Shortcut[], activeShortcutId: string): boolean {
  const activeShortcut = shortcuts.find((shortcut) => shortcut.id === activeShortcutId) ?? null;
  return Boolean(
    activeShortcut
    && (!isShortcutFolder(activeShortcut) || activeShortcut.folderDisplayMode !== 'large')
    && shortcuts.some((shortcut) => isShortcutFolder(shortcut) && shortcut.folderDisplayMode === 'large'),
  );
}

export function applyShortcutDropIntent(
  shortcuts: readonly Shortcut[],
  intent: ShortcutDropIntent,
): ShortcutInteractionApplication {
  if (!supportsOpenSourceShortcutTree(shortcuts)) {
    return createUnsupportedTreeOutcome();
  }

  if (intent.type === 'merge-root-shortcuts') {
    return {
      kind: 'request-folder-merge',
      activeShortcutId: intent.activeShortcutId,
      targetShortcutId: intent.targetShortcutId,
    };
  }

  let nextShortcuts: Shortcut[] | null = null;

  switch (intent.type) {
    case 'reorder-root':
      nextShortcuts = shouldPreserveLargeFolderPositions(shortcuts, intent.activeShortcutId)
        ? reorderRootShortcutPreservingLargeFolderPositions(
            shortcuts,
            intent.activeShortcutId,
            intent.targetIndex,
          )
        : reorderShortcutWithinContainer(
            shortcuts,
            ROOT_SHORTCUTS_PATH,
            intent.activeShortcutId,
            intent.targetIndex,
          );
      break;
    case 'move-root-shortcut-into-folder':
      nextShortcuts = moveShortcutsIntoFolder(
        shortcuts,
        ROOT_SHORTCUTS_PATH,
        [intent.activeShortcutId],
        intent.targetFolderId,
      );
      break;
    case 'reorder-folder-shortcuts':
      nextShortcuts = reorderShortcutWithinContainer(
        shortcuts,
        { type: 'folder', folderId: intent.folderId },
        intent.shortcutId,
        intent.targetIndex,
      );
      break;
    case 'extract-folder-shortcut': {
      const folderIndex = shortcuts.findIndex((shortcut) => shortcut.id === intent.folderId);
      const targetIndex = folderIndex >= 0 ? folderIndex + 1 : shortcuts.length;
      nextShortcuts = extractShortcutFromFolder(
        shortcuts,
        intent.folderId,
        intent.shortcutId,
        ROOT_SHORTCUTS_PATH,
        targetIndex,
      );
      break;
    }
  }

  if (!nextShortcuts) {
    return { kind: 'noop' };
  }

  return {
    kind: 'update-shortcuts',
    shortcuts: nextShortcuts,
  };
}

export function applyFolderExtractDragStart(
  shortcuts: readonly Shortcut[],
  payload: FolderExtractDragStartPayload,
): ShortcutInteractionApplication {
  if (!supportsOpenSourceShortcutTree(shortcuts)) {
    return createUnsupportedTreeOutcome();
  }

  const folderIndex = shortcuts.findIndex((shortcut) => shortcut.id === payload.folderId);
  const targetIndex = folderIndex >= 0 ? folderIndex + 1 : shortcuts.length;
  const nextShortcuts = extractShortcutFromFolder(
    shortcuts,
    payload.folderId,
    payload.shortcutId,
    ROOT_SHORTCUTS_PATH,
    targetIndex,
  );

  if (!nextShortcuts) {
    return { kind: 'noop' };
  }

  return {
    kind: 'start-root-drag-session',
    shortcuts: nextShortcuts,
    closeFolderId: payload.folderId,
    session: {
      shortcutId: payload.shortcutId,
      sourceRootShortcutId: payload.folderId,
      pointerId: payload.pointerId,
      pointerType: payload.pointerType,
      pointer: payload.pointer,
      anchor: payload.anchor,
    },
  };
}
