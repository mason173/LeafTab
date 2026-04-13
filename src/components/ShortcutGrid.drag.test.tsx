import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutGrid } from '@/components/ShortcutGrid';
import type { Shortcut } from '@/types';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
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

describe('ShortcutGrid compact drag projection', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
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
});
