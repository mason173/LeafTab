import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FolderShortcutSurface } from '@/features/shortcuts/components/FolderShortcutSurface';
import type { Shortcut } from '@/types';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

function assignRect(element: Element, rect: DOMRect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

function getFolderGridRoot(view: ReturnType<typeof render>): HTMLDivElement {
  const root = view.container.querySelector<HTMLDivElement>('[data-folder-shortcut-grid="true"]');
  if (!root) {
    throw new Error('Unable to find folder shortcut grid root');
  }
  return root;
}

function getFolderGridWrapper(view: ReturnType<typeof render>): HTMLDivElement {
  const root = getFolderGridRoot(view);
  const wrapper = root.parentElement as HTMLDivElement | null;
  if (!wrapper) {
    throw new Error('Unable to find folder shortcut grid wrapper');
  }
  return wrapper;
}

function getFolderShortcutItem(view: ReturnType<typeof render>, id: string): HTMLDivElement {
  const item = view.container.querySelector<HTMLDivElement>(`[data-folder-shortcut-id="${id}"]`);
  if (!item) {
    throw new Error(`Unable to find folder shortcut item: ${id}`);
  }
  return item;
}

function assignFolderGridRects(view: ReturnType<typeof render>, ids: string[], rootRect: DOMRect, itemRects: Record<string, DOMRect>) {
  const wrapper = getFolderGridWrapper(view);
  const root = getFolderGridRoot(view);

  Object.defineProperty(wrapper, 'clientWidth', {
    configurable: true,
    value: rootRect.width,
  });
  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    value: rootRect.width,
  });
  assignRect(root, rootRect);

  ids.forEach((id) => {
    assignRect(getFolderShortcutItem(view, id), itemRects[id]);
  });
}

describe('FolderShortcutSurface', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
  });

  it('renders the empty state when the folder has no shortcuts', () => {
    const view = render(
      <FolderShortcutSurface
        folderId="folder"
        shortcuts={[]}
        emptyText="Nothing here"
        maskBoundaryRef={{ current: null }}
        onShortcutOpen={vi.fn()}
        onShortcutDropIntent={vi.fn()}
      />,
    );

    expect(view.getByText('Nothing here')).toBeInTheDocument();
  });

  it('opens a shortcut when clicking a rendered item', () => {
    const onShortcutOpen = vi.fn();
    const shortcut = createLink('a', 'Alpha');

    const view = render(
      <FolderShortcutSurface
        folderId="folder"
        shortcuts={[shortcut]}
        emptyText="Nothing here"
        maskBoundaryRef={{ current: null }}
        onShortcutOpen={onShortcutOpen}
        onShortcutDropIntent={vi.fn()}
      />,
    );

    fireEvent.click(view.getByText('Alpha'));

    expect(onShortcutOpen).toHaveBeenCalledWith(shortcut);
  });

  it('dispatches a reorder intent when dragging a folder shortcut onto the next slot', async () => {
    const onShortcutDropIntent = vi.fn();
    const maskBoundaryRef = { current: null as HTMLElement | null };
    const shortcuts = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <FolderShortcutSurface
        folderId="folder"
        shortcuts={shortcuts}
        emptyText="Nothing here"
        maskBoundaryRef={maskBoundaryRef}
        onShortcutOpen={vi.fn()}
        onShortcutDropIntent={onShortcutDropIntent}
      />,
    );

    assignFolderGridRects(
      view,
      ['a', 'b', 'c'],
      new DOMRect(0, 0, 248, 96),
      {
        a: new DOMRect(0, 0, 72, 96),
        b: new DOMRect(88, 0, 72, 96),
        c: new DOMRect(176, 0, 72, 96),
      },
    );
    maskBoundaryRef.current = getFolderGridRoot(view);
    fireEvent(window, new Event('resize'));

    const a = getFolderShortcutItem(view, 'a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 36,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 44,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 124,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.getByTestId('folder-shortcut-drop-preview')).toBeInTheDocument();
    });

    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 124,
      clientY: 48,
    });

    expect(onShortcutDropIntent).toHaveBeenCalledWith({
      type: 'reorder-folder-shortcuts',
      folderId: 'folder',
      shortcutId: 'a',
      targetIndex: 1,
      edge: 'after',
    });
  });

  it('hands off an extract drag when the dragged shortcut leaves the folder mask boundary', async () => {
    vi.useFakeTimers();
    const onExtractDragStart = vi.fn();
    const onDragActiveChange = vi.fn();
    const maskBoundaryRef = { current: null as HTMLElement | null };
    const shortcuts = [createLink('a', 'Alpha')];

    try {
      const view = render(
        <FolderShortcutSurface
          folderId="folder"
          shortcuts={shortcuts}
          emptyText="Nothing here"
          maskBoundaryRef={maskBoundaryRef}
          onShortcutOpen={vi.fn()}
          onShortcutDropIntent={vi.fn()}
          onExtractDragStart={onExtractDragStart}
          onDragActiveChange={onDragActiveChange}
        />,
      );

      assignFolderGridRects(
        view,
        ['a'],
        new DOMRect(0, 0, 72, 96),
        {
          a: new DOMRect(0, 0, 72, 96),
        },
      );
      maskBoundaryRef.current = getFolderGridRoot(view);
      fireEvent(window, new Event('resize'));

      const a = getFolderShortcutItem(view, 'a');

      fireEvent.pointerDown(a, {
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        isPrimary: true,
        clientX: 36,
        clientY: 48,
      });

      fireEvent.pointerMove(window, {
        pointerId: 2,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: 44,
        clientY: 48,
      });

      fireEvent.pointerMove(window, {
        pointerId: 2,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: 160,
        clientY: 48,
      });

      act(() => {
        vi.advanceTimersByTime(520);
        vi.runOnlyPendingTimers();
      });

      expect(onExtractDragStart).toHaveBeenCalledWith({
        folderId: 'folder',
        shortcutId: 'a',
        pointerId: 2,
        pointerType: 'mouse',
        pointer: { x: 160, y: 48 },
        anchor: { xRatio: 0.5, yRatio: 0.5 },
      });

      expect(onDragActiveChange).toHaveBeenCalledWith(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
