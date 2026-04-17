import { describe, expect, it, vi } from 'vitest';
import {
  applyFolderDragRelease,
  applyRootDragRelease,
  resolveRootDragRelease,
  resolveFolderDragRelease,
} from '@/features/shortcuts/drag/dragReleaseAdapters';
import { createEmptyDragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { Shortcut } from '@/types';

const createLink = (id: string): Shortcut => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

describe('dragReleaseAdapters', () => {
  it('resolves root reorder releases into next shortcuts instead of a drop intent', () => {
    const shortcuts = [createLink('a'), createLink('b'), createLink('c')];
    const hoverResolution = createEmptyDragHoverResolution<any>();
    hoverResolution.interactionIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    expect(resolveRootDragRelease({
      shortcuts,
      hoverResolution,
    })).toEqual({
      nextShortcuts: [createLink('b'), createLink('a'), createLink('c')],
      dropIntent: null,
    });
  });

  it('applies root drag releases through reorder and drop callbacks', () => {
    const onShortcutReorder = vi.fn();
    const onShortcutDropIntent = vi.fn();

    applyRootDragRelease({
      release: {
        nextShortcuts: [createLink('b'), createLink('a')],
        dropIntent: null,
      },
      onShortcutReorder,
      onShortcutDropIntent,
    });
    applyRootDragRelease({
      release: {
        nextShortcuts: null,
        dropIntent: {
          type: 'merge-root-shortcuts',
          activeShortcutId: 'a',
          targetShortcutId: 'b',
        },
      },
      onShortcutReorder,
      onShortcutDropIntent,
    });

    expect(onShortcutReorder).toHaveBeenCalledWith([createLink('b'), createLink('a')]);
    expect(onShortcutDropIntent).toHaveBeenCalledWith({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
  });

  it('resolves folder reorder releases into settle preview plus folder drop intent', () => {
    const shortcuts = [createLink('a'), createLink('b'), createLink('c')];
    const measuredItems = shortcuts.map((shortcut, index) => ({
      shortcut,
      rect: new DOMRect(index * 88, 0, 72, 96),
    }));
    const hoverResolution = createEmptyDragHoverResolution<any>();
    hoverResolution.interactionIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    expect(resolveFolderDragRelease({
      folderId: 'folder',
      shortcuts,
      measuredItems,
      layoutSnapshot: measuredItems,
      dragSession: {
        activeId: 'a',
        activeShortcutIndex: 0,
        pointerId: 1,
        pointerType: 'mouse',
        origin: { x: 36, y: 48 },
        pointer: { x: 124, y: 48 },
        previewOffset: { x: 36, y: 48 },
      },
      hoverResolution,
      hoveredMask: false,
    })).toEqual({
      settlePreview: {
        itemId: 'a',
        item: createLink('a'),
        fromLeft: 88,
        fromTop: 0,
        toLeft: 88,
        toTop: 0,
      },
      dropIntent: {
        type: 'reorder-folder-shortcuts',
        folderId: 'folder',
        shortcutId: 'a',
        targetIndex: 1,
        edge: 'after',
      },
      shouldSuppressProjectionSettle: true,
    });
  });

  it('applies folder drag releases through settle and drop callbacks', () => {
    const armProjectionSettleSuppression = vi.fn();
    const startDragSettlePreview = vi.fn();
    const onShortcutDropIntent = vi.fn();

    applyFolderDragRelease({
      release: {
        settlePreview: {
          itemId: 'a',
          item: createLink('a'),
          fromLeft: 0,
          fromTop: 0,
          toLeft: 88,
          toTop: 0,
        },
        dropIntent: {
          type: 'reorder-folder-shortcuts',
          folderId: 'folder',
          shortcutId: 'a',
          targetIndex: 1,
          edge: 'after',
        },
        shouldSuppressProjectionSettle: true,
      },
      armProjectionSettleSuppression,
      startDragSettlePreview,
      onShortcutDropIntent,
    });

    expect(armProjectionSettleSuppression).toHaveBeenCalledTimes(1);
    expect(startDragSettlePreview).toHaveBeenCalledWith({
      itemId: 'a',
      item: createLink('a'),
      fromLeft: 0,
      fromTop: 0,
      toLeft: 88,
      toTop: 0,
    });
    expect(onShortcutDropIntent).toHaveBeenCalledWith({
      type: 'reorder-folder-shortcuts',
      folderId: 'folder',
      shortcutId: 'a',
      targetIndex: 1,
      edge: 'after',
    });
  });
});
