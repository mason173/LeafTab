import { describe, expect, it } from 'vitest';
import { buildLayoutShiftOffsets, combineProjectionOffsets } from '../dragMotion';

describe('dragMotion helpers', () => {
  it('builds FLIP offsets from previous and current rect maps', () => {
    const previousRects = new Map([
      ['a', { left: 100, top: 40 }],
      ['b', { left: 220, top: 40 }],
    ]);
    const currentRects = new Map([
      ['a', { left: 220, top: 40 }],
      ['b', { left: 100, top: 40 }],
    ]);

    expect(buildLayoutShiftOffsets({
      previousRects,
      currentRects,
      minDistancePx: 0.5,
    })).toEqual(new Map([
      ['a', { x: -120, y: 0 }],
      ['b', { x: 120, y: 0 }],
    ]));
  });

  it('ignores tiny layout shifts under the configured threshold', () => {
    const previousRects = new Map([
      ['a', { left: 100, top: 40 }],
    ]);
    const currentRects = new Map([
      ['a', { left: 100.2, top: 40.2 }],
    ]);

    expect(buildLayoutShiftOffsets({
      previousRects,
      currentRects,
      minDistancePx: 0.5,
    })).toEqual(new Map());
  });

  it('combines drag projection offsets with layout-shift offsets', () => {
    expect(combineProjectionOffsets(
      { x: 12, y: -8 },
      null,
      { x: -4, y: 20 },
    )).toEqual({ x: 8, y: 12 });
  });
});
