import type { Shortcut } from '@/types';
import {
  extractShortcutFromFolder,
  moveShortcutIntoFolder,
  reorderRootShortcutPreservingLargeFolderPositions,
  reorderShortcutWithinContainer,
} from '@/features/shortcuts/model/operations';
import {
  ROOT_SHORTCUTS_PATH,
  createFolderShortcutsPath,
} from '@/features/shortcuts/model/paths';
import {
  SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  supportsShortcutFolderDepth,
} from '@/features/shortcuts/model/constraints';
import { findShortcutById, isShortcutFolder } from '@/features/shortcuts/model/selectors';
import type {
  FolderExtractDragStartPayload,
  ShortcutDropIntent,
  ShortcutExternalDragSessionSeed,
} from '@/features/shortcuts/drag/types';

export type ShortcutInteractionApplication =
  | { kind: 'noop' }
  | { kind: 'unsupported-tree'; maxSupportedFolderDepth: number }
  | { kind: 'request-folder-merge'; activeShortcutId: string; targetShortcutId: string }
  | { kind: 'update-shortcuts'; shortcuts: Shortcut[] }
  | { kind: 'start-root-drag-session'; shortcuts: Shortcut[]; closeFolderId: string; session: ShortcutExternalDragSessionSeed };

function buildUnsupportedTreeOutcome(): ShortcutInteractionApplication {
  return {
    kind: 'unsupported-tree',
    maxSupportedFolderDepth: SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  };
}

function buildUpdateShortcutsOutcome(shortcuts: Shortcut[] | null): ShortcutInteractionApplication {
  if (!shortcuts) {
    return { kind: 'noop' };
  }

  return {
    kind: 'update-shortcuts',
    shortcuts,
  };
}

export function applyShortcutDropIntent(
  shortcuts: readonly Shortcut[],
  intent: ShortcutDropIntent,
): ShortcutInteractionApplication {
  if (!supportsShortcutFolderDepth(shortcuts)) {
    return buildUnsupportedTreeOutcome();
  }

  switch (intent.type) {
    case 'merge-root-shortcuts':
      return {
        kind: 'request-folder-merge',
        activeShortcutId: intent.activeShortcutId,
        targetShortcutId: intent.targetShortcutId,
      };
    case 'move-root-shortcut-into-folder':
      return buildUpdateShortcutsOutcome(
        moveShortcutIntoFolder(shortcuts, ROOT_SHORTCUTS_PATH, intent.activeShortcutId, intent.targetFolderId),
      );
    case 'reorder-root':
      return buildUpdateShortcutsOutcome(
        reorderRootShortcutPreservingLargeFolderPositions(shortcuts, intent.activeShortcutId, intent.targetIndex),
      );
    case 'reorder-folder-shortcuts':
      return buildUpdateShortcutsOutcome(
        reorderShortcutWithinContainer(
          shortcuts,
          createFolderShortcutsPath(intent.folderId),
          intent.shortcutId,
          intent.targetIndex,
        ),
      );
    case 'extract-folder-shortcut': {
      const sourceIndex = shortcuts.findIndex((shortcut) => shortcut.id === intent.folderId);
      if (sourceIndex === -1) {
        return { kind: 'noop' };
      }
      return buildUpdateShortcutsOutcome(
        extractShortcutFromFolder(
          shortcuts,
          intent.folderId,
          intent.shortcutId,
          ROOT_SHORTCUTS_PATH,
          sourceIndex + 1,
        ),
      );
    }
    default:
      return { kind: 'noop' };
  }
}

export function applyFolderExtractDragStart(
  shortcuts: readonly Shortcut[],
  payload: FolderExtractDragStartPayload,
): ShortcutInteractionApplication {
  if (!supportsShortcutFolderDepth(shortcuts)) {
    return buildUnsupportedTreeOutcome();
  }

  const sourceFolder = findShortcutById(shortcuts, payload.folderId);
  if (!isShortcutFolder(sourceFolder)) {
    return { kind: 'noop' };
  }

  const sourceIndex = shortcuts.findIndex((shortcut) => shortcut.id === payload.folderId);
  if (sourceIndex === -1) {
    return { kind: 'noop' };
  }

  const nextShortcuts = extractShortcutFromFolder(
    shortcuts,
    payload.folderId,
    payload.shortcutId,
    ROOT_SHORTCUTS_PATH,
    sourceIndex + 1,
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
