import { describe, expect, it } from 'vitest';
import {
  buildLinearProjectedDragSettleTarget,
  buildLinearProjectedDropPreview,
  resolveLinearReorderTargetIndex,
} from '@/features/shortcuts/drag/linearReorderProjection';

type TestItem = {
  id: string;
  layout: {
    previewOffsetX: number;
    previewOffsetY: number;
    previewWidth: number;
    previewHeight: number;
    previewBorderRadius?: string;
  };
};

const items: TestItem[] = [
  {
    id: 'a',
    layout: {
      previewOffsetX: 4,
      previewOffsetY: 6,
      previewWidth: 56,
      previewHeight: 56,
      previewBorderRadius: '12px',
    },
  },
  {
    id: 'b',
    layout: {
      previewOffsetX: 4,
      previewOffsetY: 6,
      previewWidth: 56,
      previewHeight: 56,
      previewBorderRadius: '12px',
    },
  },
  {
    id: 'c',
    layout: {
      previewOffsetX: 4,
      previewOffsetY: 6,
      previewWidth: 56,
      previewHeight: 56,
      previewBorderRadius: '12px',
    },
  },
];

const layoutSnapshot = [
  {
    ...items[0],
    rect: new DOMRect(0, 0, 72, 96),
  },
  {
    ...items[1],
    rect: new DOMRect(88, 0, 72, 96),
  },
  {
    ...items[2],
    rect: new DOMRect(176, 0, 72, 96),
  },
];

describe('linearReorderProjection', () => {
  it('resolves the linear reorder target index from active/over ids and edge', () => {
    expect(resolveLinearReorderTargetIndex({
      items,
      activeId: 'a',
      overId: 'b',
      edge: 'after',
      getId: (item) => item.id,
    })).toBe(1);
  });

  it('resolves the settle target from the projected reorder slot', () => {
    expect(buildLinearProjectedDragSettleTarget({
      items,
      layoutSnapshot,
      activeId: 'a',
      hoverIntent: {
        type: 'reorder-root',
        activeShortcutId: 'a',
        overShortcutId: 'b',
        targetIndex: 1,
        edge: 'after',
      },
      getId: (item) => item.id,
    })).toEqual({
      left: 88,
      top: 0,
    });
  });

  it('builds a drop preview relative to the root element', () => {
    const rootElement = document.createElement('div');
    Object.defineProperty(rootElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(20, 30, 248, 96),
    });

    expect(buildLinearProjectedDropPreview({
      items,
      layoutSnapshot,
      activeId: 'a',
      hoverIntent: {
        type: 'reorder-root',
        activeShortcutId: 'a',
        overShortcutId: 'b',
        targetIndex: 1,
        edge: 'after',
      },
      rootElement,
      getId: (item) => item.id,
      getLayout: (item) => item.layout,
    })).toEqual({
      left: 72,
      top: -24,
      width: 56,
      height: 56,
      borderRadius: '12px',
    });
  });
});
