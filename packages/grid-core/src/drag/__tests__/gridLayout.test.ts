import { describe, expect, it } from 'vitest';
import { getProjectedGridItemRect, packGridItems } from '../gridLayout';

describe('gridLayout', () => {
  it('packs items row-by-row while respecting spans', () => {
    const layout = packGridItems({
      items: [
        { id: 'a', span: { columnSpan: 1, rowSpan: 1 } },
        { id: 'b', span: { columnSpan: 2, rowSpan: 1 } },
        { id: 'c', span: { columnSpan: 1, rowSpan: 2 } },
      ],
      gridColumns: 3,
      getSpan: (item) => item.span,
    });

    expect(layout.rowCount).toBe(3);
    expect(layout.placedItems.map(({ id, columnStart, rowStart, columnSpan, rowSpan }) => ({
      id,
      columnStart,
      rowStart,
      columnSpan,
      rowSpan,
    }))).toEqual([
      { id: 'a', columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
      { id: 'b', columnStart: 2, rowStart: 1, columnSpan: 2, rowSpan: 1 },
      { id: 'c', columnStart: 1, rowStart: 2, columnSpan: 1, rowSpan: 2 },
    ]);
  });

  it('projects packed items into pixel rects centered within their spanned width', () => {
    expect(getProjectedGridItemRect({
      placedItem: {
        columnStart: 2,
        rowStart: 3,
        columnSpan: 2,
      },
      gridColumnWidth: 100,
      columnGap: 12,
      rowHeight: 80,
      rowGap: 10,
      width: 180,
      height: 72,
    })).toEqual({
      left: 128,
      top: 180,
      width: 180,
      height: 72,
    });
  });
});
