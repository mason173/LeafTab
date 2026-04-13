import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutGrid } from '@/components/ShortcutGrid';
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

const shortcuts = [
  createLink('a', 'Alpha'),
  createLink('b', 'Beta'),
  createLink('c', 'Gamma'),
  createLink('d', 'Delta'),
  createLink('e', 'Epsilon'),
  createLink('f', 'Zeta'),
];

const rectById = {
  root: new DOMRect(0, 0, 580, 268),
  a: new DOMRect(0, 0, 100, 124),
  b: new DOMRect(120, 0, 100, 124),
  c: new DOMRect(240, 0, 100, 124),
  d: new DOMRect(360, 0, 100, 124),
  e: new DOMRect(480, 0, 100, 124),
  f: new DOMRect(0, 144, 100, 124),
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

function assignGridRects(view: ReturnType<typeof render>, ids: string[], rootRect: DOMRect, itemRects: Record<string, DOMRect>) {
  const root = view.getByTestId('shortcut-grid');
  assignRect(root, rootRect);
  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    value: rootRect.width,
  });

  ids.forEach((id) => {
    assignRect(view.getByTestId(`shortcut-card-${id}`), itemRects[id]);
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

  it('keeps the second icon displaced while moving right after dragging upward into the first icon', async () => {
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
        cardVariant="compact"
      />,
    );

    const root = view.getByTestId('shortcut-grid');
    const a = view.getByTestId('shortcut-card-a');
    const b = view.getByTestId('shortcut-card-b');
    const c = view.getByTestId('shortcut-card-c');
    const d = view.getByTestId('shortcut-card-d');
    const e = view.getByTestId('shortcut-card-e');
    const f = view.getByTestId('shortcut-card-f');

    assignRect(root, rectById.root);
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: 580,
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
      clientX: 50,
      clientY: 206,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 50,
      clientY: 36,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 122,
      clientY: 36,
    });

    await waitFor(() => {
      expect((b as HTMLDivElement).style.transform).toContain('translate(');
    });

    for (const x of [126, 132, 138, 148, 168, 188, 208, 218, 226, 234, 239]) {
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: x,
        clientY: 36,
      });

      await waitFor(() => {
        expect((b as HTMLDivElement).style.transform).toContain('translate(');
      });
    }
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
        cardVariant="compact"
      />,
    );

    assignGridRects(
      view,
      ['a', 'b'],
      new DOMRect(0, 0, 220, 124),
      {
        a: new DOMRect(0, 0, 100, 124),
        b: new DOMRect(120, 0, 100, 124),
      },
    );

    const a = view.getByTestId('shortcut-card-a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 50,
      clientY: 62,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 62,
      clientY: 62,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 170,
      clientY: 62,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).not.toBeNull();
    });
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
        cardVariant="compact"
      />,
    );

    assignGridRects(
      view,
      ['a', 'folder-small', 'folder-large'],
      new DOMRect(0, 0, 340, 124),
      {
        a: new DOMRect(0, 0, 100, 124),
        'folder-small': new DOMRect(120, 0, 100, 124),
        'folder-large': new DOMRect(240, 0, 100, 124),
      },
    );

    const a = view.getByTestId('shortcut-card-a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 50,
      clientY: 62,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 62,
      clientY: 62,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 170,
      clientY: 62,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).toBeNull();
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 290,
      clientY: 62,
    });

    await waitFor(() => {
      expect(view.container.querySelector('mask')).toBeNull();
    });
  });

  it('shows a compact drop preview matching the destination icon footprint while reordering', async () => {
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
        cardVariant="compact"
      />,
    );

    assignGridRects(
      view,
      ['a', 'b'],
      new DOMRect(0, 0, 220, 124),
      {
        a: new DOMRect(0, 0, 100, 124),
        b: new DOMRect(120, 0, 100, 124),
      },
    );

    const a = view.getByTestId('shortcut-card-a');

    fireEvent.pointerDown(a, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      isPrimary: true,
      clientX: 50,
      clientY: 62,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 62,
      clientY: 62,
    });

    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: 214,
      clientY: 100,
    });

    const dropPreview = await waitFor(() => view.getByTestId('shortcut-drop-preview'));
    expect(dropPreview).toHaveStyle({
      left: '134px',
      top: '0px',
      width: '72px',
      height: '72px',
    });
  });

  it('animates neighboring shortcuts away when switching a folder to large mode', () => {
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
      root: new DOMRect(0, 0, 340, 268),
      a: new DOMRect(0, 0, 100, 124),
      folder: new DOMRect(120, 0, 100, 124),
      c: new DOMRect(240, 0, 100, 124),
      d: new DOMRect(0, 144, 100, 124),
      e: new DOMRect(120, 144, 100, 124),
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
        cardVariant="compact"
      />,
    );

    const root = view.getByTestId('shortcut-grid');
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: currentRects.root.width,
    });
    assignDynamicRect(root, () => currentRects.root);

    for (const id of ['a', 'folder', 'c', 'd', 'e']) {
      assignDynamicRect(view.getByTestId(`shortcut-card-${id}`), () => currentRects[id]);
    }

    currentRects.folder = new DOMRect(120, 0, 212, 236);
    currentRects.c = new DOMRect(0, 144, 100, 124);
    currentRects.d = new DOMRect(0, 288, 100, 124);
    currentRects.e = new DOMRect(120, 288, 100, 124);

    view.rerender(
      <ShortcutGrid
        containerHeight={412}
        shortcuts={largeShortcuts}
        gridColumns={3}
        minRows={2}
        onShortcutOpen={vi.fn()}
        onShortcutContextMenu={vi.fn()}
        onShortcutReorder={vi.fn()}
        onGridContextMenu={vi.fn()}
        cardVariant="compact"
      />,
    );

    const movedShortcut = view.getByTestId('shortcut-card-c') as HTMLDivElement;
    expect(movedShortcut.style.transform).toContain('translate(240px, -144px)');
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
        cardVariant="compact"
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
        cardVariant="compact"
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
        cardVariant="compact"
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
        cardVariant="compact"
        selectionMode
        selectedShortcutIndexes={new Set()}
        onToggleShortcutSelection={onToggleShortcutSelection}
      />,
    );

    fireEvent.click(view.getByTestId('shortcut-card-a'));
    fireEvent.click(view.getByTestId('shortcut-card-folder-small'));

    expect(onToggleShortcutSelection).toHaveBeenCalledTimes(1);
    expect(onToggleShortcutSelection).toHaveBeenCalledWith(0);
  });
});
