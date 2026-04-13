import { describe, expect, it } from 'vitest';
import { resolveCompactRootHoverResolution, type CompactTargetRegions } from '@/features/shortcuts/drag/compactRootDrag';
import type { RootShortcutDragItem, RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import { buildReorderProjectionOffsets, type ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { Shortcut } from '@/types';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createItems = (shortcuts: Shortcut[]): RootShortcutDragItem[] =>
  shortcuts.map((shortcut, shortcutIndex) => ({
    sortId: shortcut.id,
    shortcut,
    shortcutIndex,
  }));

const createRegions = (cellLeft: number): CompactTargetRegions => ({
  targetCellRegion: {
    left: cellLeft,
    top: 0,
    right: cellLeft + 100,
    bottom: 124,
    width: 100,
    height: 124,
  },
  targetIconRegion: {
    left: cellLeft + 14,
    top: 0,
    right: cellLeft + 86,
    bottom: 72,
    width: 72,
    height: 72,
  },
  targetIconHitRegion: {
    left: cellLeft + 14,
    top: 0,
    right: cellLeft + 86,
    bottom: 72,
    width: 72,
    height: 72,
  },
});

const createRegionsAt = (cellLeft: number, cellTop: number): CompactTargetRegions => ({
  targetCellRegion: {
    left: cellLeft,
    top: cellTop,
    right: cellLeft + 100,
    bottom: cellTop + 124,
    width: 100,
    height: 124,
  },
  targetIconRegion: {
    left: cellLeft + 14,
    top: cellTop,
    right: cellLeft + 86,
    bottom: cellTop + 72,
    width: 72,
    height: 72,
  },
  targetIconHitRegion: {
    left: cellLeft + 14,
    top: cellTop,
    right: cellLeft + 86,
    bottom: cellTop + 72,
    width: 72,
    height: 72,
  },
});

const createProjectionMap = (entries: Array<[string, ProjectionOffset]>) => new Map(entries);

function buildProjectionOffsetsFromIntent(params: {
  items: RootShortcutDragItem[];
  measuredItems: Array<RootShortcutDragItem & { rect: DOMRect }>;
  activeSortId: string;
  intent: RootShortcutDropIntent | null;
}) {
  const { items, measuredItems, activeSortId, intent } = params;
  return buildReorderProjectionOffsets({
    items,
    layoutSnapshot: measuredItems,
    activeId: activeSortId,
    hoveredId: intent?.type === 'reorder-root' ? intent.overShortcutId : null,
    targetIndex: intent?.type === 'reorder-root' ? intent.targetIndex : null,
    getId: (item) => item.sortId,
  });
}

describe('resolveCompactRootHoverResolution', () => {
  it('keeps earlier yielded icons displaced when merging onto a later target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(regionsById[item.sortId].targetCellRegion.left, 0, 100, 124),
    }));
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 260, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['b', { x: -120, y: 0 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['b', { x: -120, y: 0 }],
      ]),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });
    expect(result.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('keeps earlier yielded icons displaced when entering a later target icon region after that target becomes the active reorder anchor', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
    ]);
    const regionsById = {
      a: {
        targetCellRegion: {
          left: 0,
          top: 0,
          right: 106.4,
          bottom: 96,
          width: 106.4,
          height: 96,
        },
        targetIconRegion: {
          left: 17.2,
          top: 0,
          right: 89.2,
          bottom: 72,
          width: 72,
          height: 72,
        },
        targetIconHitRegion: {
          left: 17.2,
          top: 0,
          right: 89.2,
          bottom: 72,
          width: 72,
          height: 72,
        },
      },
      b: {
        targetCellRegion: {
          left: 118.4,
          top: 0,
          right: 224.8,
          bottom: 96,
          width: 106.4,
          height: 96,
        },
        targetIconRegion: {
          left: 135.6,
          top: 0,
          right: 207.6,
          bottom: 72,
          width: 72,
          height: 72,
        },
        targetIconHitRegion: {
          left: 135.6,
          top: 0,
          right: 207.6,
          bottom: 72,
          width: 72,
          height: 72,
        },
      },
      c: {
        targetCellRegion: {
          left: 236.8,
          top: 0,
          right: 343.2,
          bottom: 96,
          width: 106.4,
          height: 96,
        },
        targetIconRegion: {
          left: 254,
          top: 0,
          right: 326,
          bottom: 72,
          width: 72,
          height: 72,
        },
        targetIconHitRegion: {
          left: 254,
          top: 0,
          right: 326,
          bottom: 72,
          width: 72,
          height: 72,
        },
      },
      d: {
        targetCellRegion: {
          left: 355.2,
          top: 0,
          right: 461.6,
          bottom: 96,
          width: 106.4,
          height: 96,
        },
        targetIconRegion: {
          left: 372.4,
          top: 0,
          right: 444.4,
          bottom: 72,
          width: 72,
          height: 72,
        },
        targetIconHitRegion: {
          left: 372.4,
          top: 0,
          right: 444.4,
          bottom: 72,
          width: 72,
          height: 72,
        },
      },
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(item.shortcutIndex * 120, 0, 100, 124),
    }));
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 1,
      edge: 'before',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 260, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'a',
        intent: previousIntent,
      }),
      visualProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'a',
        intent: previousIntent,
      }),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 12,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });
    expect(result.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('holds the current yielded target while the dragged center stays in that cell', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(regionsById[item.sortId].targetCellRegion.left, 0, 100, 124),
    }));
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 205, y: 100 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['b', { x: -120, y: 0 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['b', { x: -120, y: 0 }],
      ]),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('does not reuse a stale yielded target after that target has already returned', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(regionsById[item.sortId].targetCellRegion.left, 0, 100, 124),
    }));
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 260, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: new Map(),
      visualProjectionOffsets: new Map(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('does not trigger a fresh visual yield when entering a target icon region vertically', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
    ]);
    const regionsById = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
      d: {
        ...createRegions(0),
        targetCellRegion: {
          left: 0,
          top: 144,
          right: 100,
          bottom: 268,
          width: 100,
          height: 124,
        },
        targetIconRegion: {
          left: 14,
          top: 144,
          right: 86,
          bottom: 216,
          width: 72,
          height: 72,
        },
        targetIconHitRegion: {
          left: 14,
          top: 144,
          right: 86,
          bottom: 216,
          width: 72,
          height: 72,
        },
      },
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(
        regionsById[item.sortId].targetCellRegion.left,
        regionsById[item.sortId].targetCellRegion.top,
        100,
        124,
      ),
    }));

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'd',
      recognitionPoint: { x: 50, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: new Map(),
      visualProjectionOffsets: new Map(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'd',
      targetShortcutId: 'a',
    });
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('does not reorder while moving vertically through the icon column before entering the target icon region', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
    ]);
    const regionsById = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
      d: {
        ...createRegions(0),
        targetCellRegion: {
          left: 0,
          top: 144,
          right: 100,
          bottom: 268,
          width: 100,
          height: 124,
        },
        targetIconRegion: {
          left: 14,
          top: 144,
          right: 86,
          bottom: 216,
          width: 72,
          height: 72,
        },
        targetIconHitRegion: {
          left: 14,
          top: 144,
          right: 86,
          bottom: 216,
          width: 72,
          height: 72,
        },
      },
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(
        regionsById[item.sortId].targetCellRegion.left,
        regionsById[item.sortId].targetCellRegion.top,
        100,
        124,
      ),
    }));

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'd',
      recognitionPoint: { x: 50, y: 92 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: new Map(),
      visualProjectionOffsets: new Map(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toBeNull();
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('keeps the second icon yielded continuously while moving right from the first icon center after a vertical approach', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
      createLink('e', 'Epsilon'),
      createLink('f', 'Zeta'),
    ]);
    const regionsById = {
      a: createRegionsAt(0, 0),
      b: createRegionsAt(120, 0),
      c: createRegionsAt(240, 0),
      d: createRegionsAt(360, 0),
      e: createRegionsAt(480, 0),
      f: createRegionsAt(0, 144),
    } satisfies Record<string, CompactTargetRegions>;
    const measuredItems = items.map((item) => ({
      ...item,
      rect: new DOMRect(
        regionsById[item.sortId].targetCellRegion.left,
        regionsById[item.sortId].targetCellRegion.top,
        100,
        124,
      ),
    }));

    let previousInteractionIntent: RootShortcutDropIntent | null = {
      type: 'merge-root-shortcuts',
      activeShortcutId: 'f',
      targetShortcutId: 'a',
    };
    let previousVisualProjectionIntent: RootShortcutDropIntent | null = null;

    const xPositions = [122, 126, 132, 138, 148, 168, 188, 208, 218, 226, 234, 239];

    xPositions.forEach((x, index) => {
      const interactionProjectionOffsets = buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'f',
        intent: previousInteractionIntent,
      });
      const visualProjectionOffsets = buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'f',
        intent: previousVisualProjectionIntent,
      });

      const result = resolveCompactRootHoverResolution({
        activeSortId: 'f',
        recognitionPoint: { x, y: 36 },
        measuredItems,
        items,
        previousInteractionIntent,
        previousVisualProjectionIntent,
        interactionProjectionOffsets,
        visualProjectionOffsets,
        resolveRegions: (item) => regionsById[item.sortId],
        slotIntent: null,
        columnGap: 20,
        rowGap: 20,
      });

      expect(result.interactionIntent, `step ${index} x=${x}`).toEqual({
        type: 'reorder-root',
        activeShortcutId: 'f',
        overShortcutId: 'b',
        targetIndex: 1,
        edge: 'before',
      });
      expect(result.visualProjectionIntent, `step ${index} x=${x}`).toEqual({
        type: 'reorder-root',
        activeShortcutId: 'f',
        overShortcutId: 'b',
        targetIndex: 1,
        edge: 'before',
      });

      previousInteractionIntent = result.interactionIntent;
      previousVisualProjectionIntent = result.visualProjectionIntent;
    });
  });
});
