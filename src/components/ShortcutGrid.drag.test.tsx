import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutGrid } from '@/components/ShortcutGrid';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { Shortcut } from '@/types';

let rafCallbacks: Array<{ id: number; callback: FrameRequestCallback }> = [];
let nextRafId = 1;

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createFolder = (id: string, title: string, folderDisplayMode: 'small' | 'large' = 'small'): Shortcut => ({
  id,
  title,
  url: '',
  icon: '',
  kind: 'folder',
  folderDisplayMode,
  children: [createLink(`${id}-child`, `${title} Child`)],
});

const createFolderWithChildren = (
  id: string,
  title: string,
  childCount: number,
  folderDisplayMode: 'small' | 'large' = 'small',
): Shortcut => ({
  id,
  title,
  url: '',
  icon: '',
  kind: 'folder',
  folderDisplayMode,
  children: Array.from({ length: childCount }, (_, index) => createLink(`${id}-child-${index + 1}`, `${title} Child ${index + 1}`)),
});

const shortcuts = [
  createLink('a', 'Alpha'),
  createLink('b', 'Beta'),
  createLink('c', 'Gamma'),
  createLink('d', 'Delta'),
  createLink('e', 'Epsilon'),
  createLink('f', 'Zeta'),
];

const rectById = {
  root: new DOMRect(0, 0, 568, 212),
  a: new DOMRect(16, 0, 72, 96),
  b: new DOMRect(132, 0, 72, 96),
  c: new DOMRect(248, 0, 72, 96),
  d: new DOMRect(364, 0, 72, 96),
  e: new DOMRect(480, 0, 72, 96),
  f: new DOMRect(16, 116, 72, 96),
} as const;

function assignRect(element: Element, rect: DOMRect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

function assignDynamicRect(element: Element, getRect: () => DOMRect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => getRect(),
  });
}

function getGridRoot(view: ReturnType<typeof render>): HTMLElement {
  const root = view.container.querySelector<HTMLElement>('div.relative.w-full');
  if (!root) {
    throw new Error('Unable to find shortcut grid root');
  }
  return root;
}

function getGridWrapper(view: ReturnType<typeof render>): HTMLElement {
  const root = getGridRoot(view);
  const wrapper = root.parentElement;
  if (!wrapper) {
    throw new Error('Unable to find shortcut grid wrapper');
  }
  return wrapper;
}

function getShortcutDragItem(view: ReturnType<typeof render>, id: string): HTMLDivElement {
  const item = view.container.querySelector<HTMLDivElement>(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
  if (!item) {
    throw new Error(`Unable to find shortcut drag item: ${id}`);
  }
  return item;
}

function getFolderPreview(view: ReturnType<typeof render>, id: string): HTMLDivElement {
  const preview = view.container.querySelector<HTMLDivElement>(`[data-folder-preview-id="${id}"]`);
  if (!preview) {
    throw new Error(`Unable to find folder preview: ${id}`);
  }
  return preview;
}

function getFolderOpenTile(view: ReturnType<typeof render>, id: string): HTMLButtonElement {
  const preview = getFolderPreview(view, id);
  const openTile = preview.querySelector<HTMLButtonElement>('[data-folder-preview-open-tile="true"]');
  if (!openTile) {
    throw new Error(`Unable to find folder open tile: ${id}`);
  }
  return openTile;
}

function assignGridRects(view: ReturnType<typeof render>, ids: string[], rootRect: DOMRect, itemRects: Record<string, DOMRect>) {
  const wrapper = getGridWrapper(view);
  const root = getGridRoot(view);
  Object.defineProperty(wrapper, 'clientWidth', {
    configurable: true,
    value: rootRect.width,
  });
  assignRect(root, rootRect);
  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    value: rootRect.width,
  });

  ids.forEach((id) => {
    assignRect(getShortcutDragItem(view, id), itemRects[id]);
  });
}

describe('ShortcutGrid compact drag projection', () => {
  beforeEach(() => {
    rafCallbacks = [];
    nextRafId = 1;
    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextRafId;
      nextRafId += 1;
      rafCallbacks.push({ id, callback });
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id);
    });
  });

  it('shows a projected drop preview after dragging a lower-row shortcut upward across the first row', async () => {
    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={shortcuts}
        gridColumns={5}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    const wrapper = getGridWrapper(view);
    const root = getGridRoot(view);
    const a = getShortcutDragItem(view, 'a');
    const b = getShortcutDragItem(view, 'b');
    const c = getShortcutDragItem(view, 'c');
    const d = getShortcutDragItem(view, 'd');
    const e = getShortcutDragItem(view, 'e');
    const f = getShortcutDragItem(view, 'f');

    Object.defineProperty(wrapper, 'clientWidth', {
      configurable: true,
      value: rectById.root.width,
    });
    assignRect(root, rectById.root);
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: rectById.root.width,
    });
    assignRect(a, rectById.a);
    assignRect(b, rectById.b);
    assignRect(c, rectById.c);
    assignRect(d, rectById.d);
    assignRect(e, rectById.e);
    assignRect(f, rectById.f);

    fireEvent.pointerDown(f, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 164,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 152,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.getByTestId('shortcut-drop-preview')).toBeTruthy();
    });
  });

  it('shows the center merge highlight when dragging onto a regular icon', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={compactShortcuts}
        gridColumns={2}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'b'],
      new DOMRect(0, 0, 220, 124),
      {
        a: new DOMRect(16, 0, 72, 96),
        b: new DOMRect(132, 0, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 168,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).not.toBeNull();
    });
  });

  it('reflows remaining shortcuts immediately after moving a shortcut into a folder when drag animations are disabled', async () => {
    const initialShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-small', 'Folder'),
      createLink('c', 'Gamma'),
    ];

    const currentRects: Record<string, DOMRect> = {
      root: new DOMRect(0, 0, 336, 124),
      a: new DOMRect(16, 0, 72, 96),
      'folder-small': new DOMRect(132, 0, 72, 96),
      c: new DOMRect(248, 0, 72, 96),
    };

    function TestGrid() {
      const [shortcuts, setShortcuts] = React.useState(initialShortcuts);

      const handleShortcutDropIntent = React.useCallback((intent: RootShortcutDropIntent) => {
        if (intent.type !== 'move-root-shortcut-into-folder') return;

        currentRects.root = new DOMRect(0, 0, 220, 124);
        currentRects['folder-small'] = new DOMRect(16, 0, 72, 96);
        currentRects.c = new DOMRect(132, 0, 72, 96);
        setShortcuts([
          createFolder('folder-small', 'Folder'),
          createLink('c', 'Gamma'),
        ]);
      }, []);

      return (
        <ShortcutGrid
          containerHeight={124}
          shortcuts={shortcuts}
          gridColumns={3}
          minRows={1}
          onShortcutOpen={vi.fn()}
          onShortcutContextMenu={vi.fn()}
          onShortcutReorder={vi.fn()}
          onShortcutDropIntent={handleShortcutDropIntent}
          onGridContextMenu={vi.fn()}
        />
      );
    }

    const view = render(<TestGrid />);

    const wrapper = getGridWrapper(view);
    const root = getGridRoot(view);
    Object.defineProperty(wrapper, 'clientWidth', {
      configurable: true,
      value: currentRects.root.width,
    });
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: currentRects.root.width,
    });
    assignDynamicRect(root, () => currentRects.root);
    assignDynamicRect(getShortcutDragItem(view, 'a'), () => currentRects.a);
    assignDynamicRect(getShortcutDragItem(view, 'folder-small'), () => currentRects['folder-small']);
    assignDynamicRect(getShortcutDragItem(view, 'c'), () => currentRects.c);

    const a = getShortcutDragItem(view, 'a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 168,
      clientY: 48,
    });

    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 168,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.queryByText('Alpha')).not.toBeInTheDocument();
    });

    const movedShortcut = getShortcutDragItem(view, 'c');
    expect(movedShortcut.style.transform).toBe('');
  });

  it('does not show the center merge highlight when dragging onto a folder target', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-small', 'Folder'),
      createFolder('folder-large', 'Large Folder', 'large'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={compactShortcuts}
        gridColumns={3}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-small', 'folder-large'],
      new DOMRect(0, 0, 336, 212),
      {
        a: new DOMRect(16, 0, 72, 96),
        'folder-small': new DOMRect(132, 0, 72, 96),
        'folder-large': new DOMRect(248, 0, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const smallFolderPreview = getFolderPreview(view, 'folder-small');
    const largeFolderPreview = getFolderPreview(view, 'folder-large');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 168,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).toBeNull();
    });
    await waitFor(() => {
      expect(view.getByTestId('shortcut-drop-preview').style.opacity).toBe('0.01');
      expect(smallFolderPreview).toHaveAttribute('data-folder-drop-target-active', 'true');
      expect(smallFolderPreview).toHaveStyle({
        borderColor: 'rgba(255,255,255,0.3)',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      });
      expect(largeFolderPreview).toHaveAttribute('data-folder-drop-target-active', 'false');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 284,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).toBeNull();
    });
    await waitFor(() => {
      expect(view.getByTestId('shortcut-drop-preview').style.opacity).toBe('0.01');
    });
  });

  it('brightens the large folder border when dragging onto a valid folder-enter target', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={compactShortcuts}
        gridColumns={4}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-large', 'b', 'c'],
      new DOMRect(0, 0, 452, 212),
      {
        a: new DOMRect(16, 0, 72, 96),
        'folder-large': new DOMRect(132, 0, 188, 180),
        b: new DOMRect(364, 0, 72, 96),
        c: new DOMRect(16, 116, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const largeFolderPreview = getFolderPreview(view, 'folder-large');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 226,
      clientY: 90,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).toBeNull();
    });
    await waitFor(() => {
      expect(view.getByTestId('shortcut-drop-preview').style.opacity).toBe('0.01');
      expect(largeFolderPreview).toHaveAttribute('data-folder-drop-target-active', 'true');
      expect(largeFolderPreview).toHaveStyle({
        borderColor: 'rgba(255,255,255,0.3)',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      });
    });
  });

  it('suppresses large-folder preview hover growth and fades the overflow open tile while dragging over the folder target', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolderWithChildren('folder-large', 'Large Folder', 9, 'large'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={compactShortcuts}
        gridColumns={4}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-large', 'b', 'c'],
      new DOMRect(0, 0, 452, 212),
      {
        a: new DOMRect(16, 0, 72, 96),
        'folder-large': new DOMRect(132, 0, 188, 180),
        b: new DOMRect(364, 0, 72, 96),
        c: new DOMRect(16, 116, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const largeFolderPreview = getFolderPreview(view, 'folder-large');
    const openTile = getFolderOpenTile(view, 'folder-large');
    const openTileIcon = largeFolderPreview.querySelector<HTMLElement>('[data-folder-preview-open-tile-icon="true"]');
    const ghostStack = largeFolderPreview.querySelector<HTMLElement>('[data-folder-preview-open-tile-ghost-stack="true"]');
    const previewTiles = Array.from(
      largeFolderPreview.querySelectorAll<HTMLElement>('[data-folder-preview-large-tile="true"]'),
    );

    expect(openTileIcon).not.toBeNull();
    expect(ghostStack).not.toBeNull();
    expect(previewTiles.length).toBeGreaterThan(0);

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 226,
      clientY: 90,
    });

    await waitFor(() => {
      expect(largeFolderPreview).toHaveAttribute('data-folder-drop-target-active', 'true');
      expect(openTile).toHaveAttribute('data-folder-preview-hover-scale-enabled', 'false');
      previewTiles.forEach((tile) => {
        expect(tile).toHaveAttribute('data-folder-preview-hover-scale-enabled', 'false');
      });
      expect(openTileIcon).toHaveStyle({
        opacity: '0.01',
        transition: 'opacity 150ms ease',
      });
      expect(ghostStack).toHaveStyle({
        opacity: '0.01',
        transition: 'opacity 150ms ease',
      });
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 340,
      clientY: 90,
    });

    await waitFor(() => {
      expect(largeFolderPreview).toHaveAttribute('data-folder-drop-target-active', 'false');
      expect(openTile).toHaveAttribute('data-folder-preview-hover-scale-enabled', 'true');
      previewTiles.forEach((tile) => {
        expect(tile).toHaveAttribute('data-folder-preview-hover-scale-enabled', 'true');
      });
      expect(openTileIcon).toHaveStyle({
        opacity: '1',
        transition: 'opacity 150ms ease',
      });
      expect(ghostStack).toHaveStyle({
        opacity: '1',
        transition: 'opacity 150ms ease',
      });
    });
  });

  it('keeps a large folder visually pinned during a small-item drag session', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={compactShortcuts}
        gridColumns={4}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-large', 'b', 'c'],
      new DOMRect(0, 0, 452, 212),
      {
        a: new DOMRect(16, 0, 72, 96),
        'folder-large': new DOMRect(132, 0, 188, 180),
        b: new DOMRect(364, 0, 72, 96),
        c: new DOMRect(16, 116, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const folderLarge = getShortcutDragItem(view, 'folder-large');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 480,
      clientY: 164,
    });

    await waitFor(() => {
      expect(view.getByTestId('shortcut-drop-preview')).toBeTruthy();
    });

    expect(folderLarge.style.transform).toBe('');
  });

  it('does not displace the upper-right icon after crossing a large-folder merge zone into the adjacent gap', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
      createLink('d', 'Delta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={compactShortcuts}
        gridColumns={4}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-large', 'b', 'd', 'c'],
      new DOMRect(0, 0, 452, 212),
      {
        a: new DOMRect(16, 0, 72, 96),
        'folder-large': new DOMRect(132, 0, 188, 180),
        b: new DOMRect(364, 0, 72, 96),
        d: new DOMRect(16, 116, 72, 96),
        c: new DOMRect(364, 116, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const b = getShortcutDragItem(view, 'b');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 300,
      clientY: 48,
    });

    await waitFor(() => {
      expect(b.style.transform).toBe('');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 340,
      clientY: 48,
    });

    await waitFor(() => {
      expect(b.style.transform).toBe('');
    });
  });

  it('does not displace unrelated icons after crossing a large-folder merge zone into the lower-right gap', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
      createLink('d', 'Delta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={compactShortcuts}
        gridColumns={4}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-large', 'b', 'd', 'c'],
      new DOMRect(0, 0, 452, 212),
      {
        a: new DOMRect(16, 0, 72, 96),
        'folder-large': new DOMRect(132, 0, 188, 180),
        b: new DOMRect(364, 0, 72, 96),
        d: new DOMRect(16, 116, 72, 96),
        c: new DOMRect(364, 116, 72, 96),
      },
    );

    const d = getShortcutDragItem(view, 'd');
    const b = getShortcutDragItem(view, 'b');
    const c = getShortcutDragItem(view, 'c');

    fireEvent.pointerDown(d, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 164,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 164,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 300,
      clientY: 164,
    });

    await waitFor(() => {
      expect(b.style.transform).toBe('');
      expect(c.style.transform).toBe('');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 340,
      clientY: 164,
    });

    await waitFor(() => {
      expect(b.style.transform).toBe('');
      expect(c.style.transform).toBe('');
    });
  });

  it('keeps the upper-right neighbor steady in the browser-calibrated large-folder side gap after folder contact', async () => {
    const shortcuts9 = [
      createLink('f1', 'F1'),
      createLink('f2', 'F2'),
      createLink('f3', 'F3'),
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
      createLink('f4', 'F4'),
      createLink('f5', 'F5'),
      createLink('g1', 'G1'),
      createLink('g2', 'G2'),
      createLink('g3', 'G3'),
      createLink('d', 'Delta'),
      createLink('c', 'Gamma'),
      createLink('g4', 'G4'),
      createLink('g5', 'G5'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={900}
        shortcuts={shortcuts9}
        gridColumns={9}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['f1', 'f2', 'f3', 'a', 'folder-large', 'b', 'f4', 'f5', 'g1', 'g2', 'g3', 'd', 'c', 'g4', 'g5'],
      new DOMRect(0, 0, 1440, 900),
      {
        f1: new DOMRect(240, 476.6972961425781, 72, 96.00003051757812),
        f2: new DOMRect(350, 476.6972961425781, 72, 96.00003051757812),
        f3: new DOMRect(460, 476.6972961425781, 72, 96.00003051757812),
        a: new DOMRect(570, 476.6972961425781, 72, 96.00003051757812),
        'folder-large': new DOMRect(680, 470.7651672363281, 188, 211.99996948242188),
        b: new DOMRect(906, 470.7651672363281, 72, 95.99996948242188),
        f4: new DOMRect(1016, 470.7651672363281, 72, 95.99996948242188),
        f5: new DOMRect(1126, 470.7651672363281, 72, 95.99996948242188),
        g1: new DOMRect(240, 586.76513671875, 72, 96),
        g2: new DOMRect(350, 586.76513671875, 72, 96),
        g3: new DOMRect(460, 586.76513671875, 72, 96),
        d: new DOMRect(570, 581.2985229492188, 72, 96),
        c: new DOMRect(906, 586.76513671875, 72, 96),
        g4: new DOMRect(1016, 586.76513671875, 72, 96),
        g5: new DOMRect(1126, 586.76513671875, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const b = getShortcutDragItem(view, 'b');
    const c = getShortcutDragItem(view, 'c');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 606,
      clientY: 506.6972961425781,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 616,
      clientY: 506.6972961425781,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 834.16,
      clientY: 506.6972961425781,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 887,
      clientY: 506.6972961425781,
    });

    await waitFor(() => {
      expect(b.style.transform).toBe('');
      expect(c.style.transform).toBe('');
    });
  });

  it('keeps the claimed upper slot latched while returning from E into a large folder in the full ring layout', async () => {
    const ringShortcuts = [
      createLink('u1', 'U1'),
      createLink('u2', 'U2'),
      createLink('u3', 'U3'),
      createLink('u4', 'U4'),
      createLink('tl', 'TL'),
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('tr', 'TR'),
      createLink('h', 'H'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('c', 'C'),
      createLink('g', 'G'),
      createLink('d', 'D'),
      createLink('bl', 'BL'),
      createLink('f', 'F'),
      createLink('e', 'E'),
      createLink('br', 'BR'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={560}
        shortcuts={ringShortcuts}
        gridColumns={4}
        minRows={5}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['u1', 'u2', 'u3', 'u4', 'tl', 'a', 'b', 'tr', 'h', 'folder-large', 'c', 'g', 'd', 'bl', 'f', 'e', 'br'],
      new DOMRect(0, 0, 452, 560),
      {
        u1: new DOMRect(16, 0, 72, 96),
        u2: new DOMRect(132, 0, 72, 96),
        u3: new DOMRect(248, 0, 72, 96),
        u4: new DOMRect(364, 0, 72, 96),
        tl: new DOMRect(16, 116, 72, 96),
        a: new DOMRect(132, 116, 72, 96),
        b: new DOMRect(248, 116, 72, 96),
        tr: new DOMRect(364, 116, 72, 96),
        h: new DOMRect(16, 232, 72, 96),
        'folder-large': new DOMRect(132, 232, 188, 180),
        c: new DOMRect(364, 232, 72, 96),
        g: new DOMRect(16, 348, 72, 96),
        d: new DOMRect(364, 348, 72, 96),
        bl: new DOMRect(16, 464, 72, 96),
        f: new DOMRect(132, 464, 72, 96),
        e: new DOMRect(248, 464, 72, 96),
        br: new DOMRect(364, 464, 72, 96),
      },
    );

    fireEvent(window, new Event('resize'));

    const e = getShortcutDragItem(view, 'e');

    fireEvent.pointerDown(e, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 284,
      clientY: 512,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 292,
      clientY: 512,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 284,
      clientY: 176,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).not.toBeNull();
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 284,
      clientY: 118,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('248px');
      expect(dropPreview.style.top).toBe('116px');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 284,
      clientY: 300,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('248px');
      expect(dropPreview.style.top).toBe('116px');
    });
  });

  it('shows the current compact drop preview footprint while reordering past the last occupied slot', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={compactShortcuts}
        gridColumns={2}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'b'],
      new DOMRect(0, 0, 220, 124),
      {
        a: new DOMRect(16, 0, 72, 96),
        b: new DOMRect(132, 0, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 216,
      clientY: 48,
    });

    const dropPreview = await waitFor(() => view.getByTestId('shortcut-drop-preview'));
    expect(dropPreview).toHaveStyle({
      left: '16px',
      top: '0px',
      width: '72px',
      height: '72px',
    });
  });

  it('keeps the previously claimed vertical slot latched until the next upper target actually yields', async () => {
    const compactShortcuts = [
      createLink('1', 'One'),
      createLink('2', 'Two'),
      createLink('3', 'Three'),
      createLink('4', 'Four'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={444}
        shortcuts={compactShortcuts}
        gridColumns={1}
        minRows={4}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['1', '2', '3', '4'],
      new DOMRect(0, 0, 104, 444),
      {
        '1': new DOMRect(16, 0, 72, 96),
        '2': new DOMRect(16, 116, 72, 96),
        '3': new DOMRect(16, 232, 72, 96),
        '4': new DOMRect(16, 348, 72, 96),
      },
    );

    const four = getShortcutDragItem(view, '4');

    fireEvent.pointerDown(four, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 396,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 388,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 280,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).not.toBeNull();
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 10,
      clientY: 280,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '232px',
        width: '72px',
        height: '72px',
      });
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 250,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '232px',
        width: '72px',
        height: '72px',
      });
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 300,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '232px',
        width: '72px',
        height: '72px',
      });
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 164,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '232px',
        width: '72px',
        height: '72px',
      });
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 10,
      clientY: 164,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '116px',
        width: '72px',
        height: '72px',
      });
    });
  });

  it('keeps the previously claimed vertical slot latched while entering a small folder above an intervening icon', async () => {
    const compactShortcuts = [
      createFolder('folder', 'Folder'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={328}
        shortcuts={compactShortcuts}
        gridColumns={1}
        minRows={3}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['folder', 'b', 'c'],
      new DOMRect(0, 0, 104, 328),
      {
        folder: new DOMRect(16, 0, 72, 96),
        b: new DOMRect(16, 116, 72, 96),
        c: new DOMRect(16, 232, 72, 96),
      },
    );

    const c = getShortcutDragItem(view, 'c');

    fireEvent.pointerDown(c, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 280,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 272,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 164,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).not.toBeNull();
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 118,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '116px',
        width: '72px',
        height: '72px',
      });
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 36,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '116px',
        width: '72px',
        height: '72px',
      });
    });
  });

  it('displaces a small folder downward after dragging upward through its icon body and exiting via the reorder side', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder', 'Folder'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={328}
        shortcuts={compactShortcuts}
        gridColumns={1}
        minRows={3}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder', 'c'],
      new DOMRect(0, 0, 104, 328),
      {
        a: new DOMRect(16, 0, 72, 96),
        folder: new DOMRect(16, 116, 72, 96),
        c: new DOMRect(16, 232, 72, 96),
      },
    );

    const c = getShortcutDragItem(view, 'c');
    const folder = getShortcutDragItem(view, 'folder');

    fireEvent.pointerDown(c, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 268,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 260,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 152,
    });

    await waitFor(() => {
      expect(folder.style.transform).toContain('scale(1.02)');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 52,
      clientY: 108,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview).toHaveStyle({
        left: '16px',
        top: '116px',
        width: '72px',
        height: '72px',
      });
      expect(folder.style.transform).toContain('translate(0px, 116px)');
    });
  });

  it('reflows neighboring shortcuts immediately when switching a folder to large mode with drag animations disabled', () => {
    const smallShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder', 'Folder', 'small'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
      createLink('e', 'Epsilon'),
    ];
    const largeShortcuts = [
      createLink('a', 'Alpha'),
      createFolder('folder', 'Folder', 'large'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
      createLink('e', 'Epsilon'),
    ];

    const currentRects: Record<string, DOMRect> = {
      root: new DOMRect(0, 0, 336, 212),
      a: new DOMRect(16, 0, 72, 96),
      folder: new DOMRect(132, 0, 72, 96),
      c: new DOMRect(248, 0, 72, 96),
      d: new DOMRect(16, 116, 72, 96),
      e: new DOMRect(132, 116, 72, 96),
    };

    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={smallShortcuts}
        gridColumns={3}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    const wrapper = getGridWrapper(view);
    const root = getGridRoot(view);
    Object.defineProperty(wrapper, 'clientWidth', {
      configurable: true,
      value: currentRects.root.width,
    });
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: currentRects.root.width,
    });
    assignDynamicRect(root, () => currentRects.root);

    for (const id of ['a', 'folder', 'c', 'd', 'e']) {
      assignDynamicRect(getShortcutDragItem(view, id), () => currentRects[id]);
    }

    currentRects.root = new DOMRect(0, 0, 336, 328);
    currentRects.folder = new DOMRect(132, 0, 188, 180);
    currentRects.c = new DOMRect(248, 116, 72, 96);
    currentRects.d = new DOMRect(16, 232, 72, 96);
    currentRects.e = new DOMRect(132, 232, 72, 96);

    view.rerender(
      <ShortcutGrid
        containerHeight={328}
        shortcuts={largeShortcuts}
        gridColumns={3}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    const movedShortcut = getShortcutDragItem(view, 'c');
    expect(movedShortcut.style.transform).toBe('');
  });

  it('keeps the previously claimed slot latched while crossing the next icon gap and backing out of its merge zone', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={compactShortcuts}
        gridColumns={3}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'b', 'c'],
      new DOMRect(0, 0, 336, 124),
      {
        a: new DOMRect(16, 0, 72, 96),
        b: new DOMRect(132, 0, 72, 96),
        c: new DOMRect(248, 0, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const b = getShortcutDragItem(view, 'b');
    const c = getShortcutDragItem(view, 'c');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 220,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('16px');
      expect(dropPreview.style.top).toBe('0px');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 238,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('16px');
      expect(dropPreview.style.top).toBe('0px');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 254,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('16px');
      expect(dropPreview.style.top).toBe('0px');
      expect(c.style.transform).toContain('scale(1.02)');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 238,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('16px');
      expect(dropPreview.style.top).toBe('0px');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 254,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('16px');
      expect(dropPreview.style.top).toBe('0px');
    });
  });

  it('keeps a return-path target in reorder mode while continuing through its icon body after right-edge re-entry', async () => {
    const compactShortcuts = [
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ];

    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={compactShortcuts}
        gridColumns={3}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
      />,
    );

    assignGridRects(
      view,
      ['a', 'b', 'c'],
      new DOMRect(0, 0, 336, 124),
      {
        a: new DOMRect(16, 0, 72, 96),
        b: new DOMRect(132, 0, 72, 96),
        c: new DOMRect(248, 0, 72, 96),
      },
    );

    const a = getShortcutDragItem(view, 'a');
    const b = getShortcutDragItem(view, 'b');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 52,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 64,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 220,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('16px');
      expect(dropPreview.style.top).toBe('0px');
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 254,
      clientY: 48,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).not.toBeNull();
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 200,
      clientY: 48,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 180,
      clientY: 48,
    });

    await waitFor(() => {
      const dropPreview = view.getByTestId('shortcut-drop-preview');
      expect(dropPreview.style.left).toBe('132px');
      expect(dropPreview.style.top).toBe('0px');
      expect(b.style.transform).not.toContain('scale(1.02)');
      expect(view.container.querySelector('mask')).toBeNull();
    });
  });

  it('shows an unselected selection indicator for non-folder shortcuts in selection mode', () => {
    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={[createLink('a', 'Alpha')]}
        gridColumns={1}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
        selectionMode
        selectedShortcutIndexes={new Set()}
      />,
    );

    const indicator = view.getByTestId('shortcut-selection-indicator-a');
    expect(indicator).toHaveAttribute('data-selected', 'false');
    expect(indicator).toHaveClass('bg-black/35', 'border-white/35');
    expect(indicator).toHaveStyle({
      right: '-4px',
      top: '-4px',
      width: '16px',
      height: '16px',
    });
    expect(indicator.querySelector('svg')).toBeNull();
  });

  it('shows a primary check indicator for selected non-folder shortcuts in selection mode', () => {
    const view = render(
      <ShortcutGrid
        containerHeight={124}
        shortcuts={[createLink('a', 'Alpha')]}
        gridColumns={1}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
        selectionMode
        selectedShortcutIndexes={new Set([0])}
      />,
    );

    const indicator = view.getByTestId('shortcut-selection-indicator-a');
    expect(indicator).toHaveAttribute('data-selected', 'true');
    expect(indicator).toHaveClass('bg-primary', 'border-white/85', 'text-primary-foreground');
    expect(indicator).toHaveStyle({
      right: '-4px',
      top: '-4px',
      width: '16px',
      height: '16px',
    });
    expect(indicator.querySelector('svg')).not.toBeNull();
  });

  it('does not show selection indicators for folders in selection mode', () => {
    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={[
          createFolder('folder-small', 'Folder', 'small'),
          createFolder('folder-large', 'Large Folder', 'large'),
        ]}
        gridColumns={2}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
        selectionMode
        selectedShortcutIndexes={new Set([0, 1])}
      />,
    );

    expect(view.queryByTestId('shortcut-selection-indicator-folder-small')).not.toBeInTheDocument();
    expect(view.queryByTestId('shortcut-selection-indicator-folder-large')).not.toBeInTheDocument();
  });

  it('does not toggle folder selection in selection mode', () => {
    const onToggleShortcutSelection = vi.fn();
    const view = render(
      <ShortcutGrid
        containerHeight={268}
        shortcuts={[
          createLink('a', 'Alpha'),
          createFolder('folder-small', 'Folder', 'small'),
        ]}
        gridColumns={2}
        minRows={1}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
        selectionMode
        selectedShortcutIndexes={new Set()}
        onToggleShortcutSelection={onToggleShortcutSelection}
      />,
    );

    fireEvent.click(view.getByText('Alpha'));
    fireEvent.click(view.getByText('Folder'));

    expect(onToggleShortcutSelection).toHaveBeenCalledTimes(1);
    expect(onToggleShortcutSelection).toHaveBeenCalledWith(0);
  });
});
