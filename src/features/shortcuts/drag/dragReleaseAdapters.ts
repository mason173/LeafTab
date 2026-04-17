import type { Shortcut } from '@/types';
import { reorderRootShortcutPreservingLargeFolderPositions } from '@/features/shortcuts/model/operations';
import { resolveLinearReorderTargetIndex, buildLinearProjectedDragSettleTarget } from './linearReorderProjection';
import { resolveFinalHoverIntent, type ActiveDragSession, type DragHoverResolution } from './dragSessionRuntime';
import type { MeasuredDragItem } from './gridDragEngine';
import type { FolderShortcutDropIntent, RootShortcutDropIntent } from './types';
import type { DragSettlePreview } from './useDragMotionState';

export type RootDragReleaseOutcome = {
  nextShortcuts: Shortcut[] | null;
  dropIntent: Exclude<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
};

export function resolveRootDragRelease(params: {
  shortcuts: Shortcut[];
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
}): RootDragReleaseOutcome {
  const intent = params.hoverResolution.interactionIntent;
  if (!intent) {
    return {
      nextShortcuts: null,
      dropIntent: null,
    };
  }

  if (intent.type === 'reorder-root') {
    return {
      nextShortcuts: reorderRootShortcutPreservingLargeFolderPositions(
        params.shortcuts,
        intent.activeShortcutId,
        intent.targetIndex,
      ),
      dropIntent: null,
    };
  }

  return {
    nextShortcuts: null,
    dropIntent: intent,
  };
}

export function applyRootDragRelease(params: {
  release: RootDragReleaseOutcome;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: Exclude<RootShortcutDropIntent, { type: 'reorder-root' }>) => void;
}) {
  const { release, onShortcutReorder, onShortcutDropIntent } = params;
  if (release.nextShortcuts) {
    onShortcutReorder(release.nextShortcuts);
    return;
  }

  if (release.dropIntent) {
    onShortcutDropIntent?.(release.dropIntent);
  }
}

export type FolderDragReleaseOutcome = {
  settlePreview: Omit<DragSettlePreview<Shortcut>, 'settling'> | null;
  dropIntent: FolderShortcutDropIntent | null;
  shouldSuppressProjectionSettle: boolean;
};

export function resolveFolderDragRelease(params: {
  folderId: string;
  shortcuts: Shortcut[];
  measuredItems: readonly MeasuredDragItem<{ shortcut: Shortcut }>[];
  layoutSnapshot: Array<MeasuredDragItem<{ shortcut: Shortcut }>> | null;
  dragSession: ActiveDragSession<string, { activeShortcutIndex: number }>;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  hoveredMask: boolean;
}): FolderDragReleaseOutcome {
  const {
    folderId,
    shortcuts,
    measuredItems,
    layoutSnapshot,
    dragSession,
    hoverResolution,
    hoveredMask,
  } = params;
  const activeShortcutId = dragSession.activeId;
  const activeShortcutIndex = dragSession.activeShortcutIndex;
  const finalHoverIntent = resolveFinalHoverIntent(hoverResolution);

  const activeItem = measuredItems.find((item) => item.shortcut.id === activeShortcutId) ?? null;
  const target = buildLinearProjectedDragSettleTarget({
    items: measuredItems,
    layoutSnapshot,
    activeId: activeShortcutId,
    hoverIntent: finalHoverIntent,
    getId: (item) => item.shortcut.id,
  });
  const settlePreview = !activeItem || !target
    ? null
    : {
        itemId: activeShortcutId,
        item: activeItem.shortcut,
        fromLeft: dragSession.pointer.x - dragSession.previewOffset.x,
        fromTop: dragSession.pointer.y - dragSession.previewOffset.y,
        toLeft: target.left,
        toTop: target.top,
      };

  if (!finalHoverIntent || finalHoverIntent.type !== 'reorder-root' || hoveredMask) {
    return {
      settlePreview,
      dropIntent: null,
      shouldSuppressProjectionSettle: false,
    };
  }

  const targetShortcutIndex = shortcuts.findIndex((shortcut) => shortcut.id === finalHoverIntent.overShortcutId);
  if (targetShortcutIndex < 0) {
    return {
      settlePreview,
      dropIntent: null,
      shouldSuppressProjectionSettle: false,
    };
  }

  const targetIndex = resolveLinearReorderTargetIndex({
    items: shortcuts,
    activeId: activeShortcutId,
    overId: finalHoverIntent.overShortcutId,
    edge: finalHoverIntent.edge,
    getId: (shortcut) => shortcut.id,
  });
  if (targetIndex === null || targetIndex === activeShortcutIndex) {
    return {
      settlePreview,
      dropIntent: null,
      shouldSuppressProjectionSettle: false,
    };
  }

  return {
    settlePreview,
    dropIntent: {
      type: 'reorder-folder-shortcuts',
      folderId,
      shortcutId: activeShortcutId,
      targetIndex,
      edge: finalHoverIntent.edge,
    },
    shouldSuppressProjectionSettle: true,
  };
}

export function applyFolderDragRelease(params: {
  release: FolderDragReleaseOutcome;
  armProjectionSettleSuppression: () => void;
  startDragSettlePreview: (preview: Omit<DragSettlePreview<Shortcut>, 'settling'>) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
}) {
  const {
    release,
    armProjectionSettleSuppression,
    startDragSettlePreview,
    onShortcutDropIntent,
  } = params;

  if (release.shouldSuppressProjectionSettle) {
    armProjectionSettleSuppression();
  }
  if (release.settlePreview) {
    startDragSettlePreview(release.settlePreview);
  }
  if (release.dropIntent) {
    onShortcutDropIntent(release.dropIntent);
  }
}
