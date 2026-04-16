import {
  buildReorderProjectionOffsets,
  type ProjectionOffset,
  type Shortcut,
} from '@leaftab/workspace-core';
import { describe, expect, it } from 'vitest';
import {
  resolveCompactReorderOnlyHoverResolution,
  type CompactReorderHoverIntent,
  type CompactTargetRegions,
} from './compactRootHover';

type HoverItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createItems = (shortcuts: Shortcut[]): HoverItem[] =>
  shortcuts.map((shortcut, shortcutIndex) => ({
    sortId: shortcut.id,
    shortcut,
    shortcutIndex,
  }));

const createRegions = (cellLeft: number, cellTop = 0): CompactTargetRegions => ({
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

const createProjectionMap = (entries: Array<[string, ProjectionOffset]> = []) => new Map(entries);

function buildMeasuredItems(items: HoverItem[], regionsById: Record<string, CompactTargetRegions>) {
  return items.map((item) => ({
    ...item,
    rect: {
      x: regionsById[item.sortId].targetCellRegion.left,
      y: regionsById[item.sortId].targetCellRegion.top,
      left: regionsById[item.sortId].targetCellRegion.left,
      top: regionsById[item.sortId].targetCellRegion.top,
      right: regionsById[item.sortId].targetCellRegion.right,
      bottom: regionsById[item.sortId].targetCellRegion.bottom,
      width: regionsById[item.sortId].targetCellRegion.width,
      height: regionsById[item.sortId].targetCellRegion.height,
      toJSON: () => ({}),
    } as DOMRect,
  }));
}

function buildProjectionOffsetsFromIntent(params: {
  items: HoverItem[];
  measuredItems: Array<HoverItem & { rect: DOMRect }>;
  activeSortId: string;
  intent: CompactReorderHoverIntent | null;
}) {
  const { items, measuredItems, activeSortId, intent } = params;
  return buildReorderProjectionOffsets({
    items,
    layoutSnapshot: measuredItems,
    activeId: activeSortId,
    hoveredId: intent?.overShortcutId ?? null,
    targetIndex: intent?.targetIndex ?? null,
    getId: (item) => item.sortId,
  });
}

describe('resolveCompactReorderOnlyHoverResolution', () => {
  it('keeps folder reorder sticky while moving slightly back across the source-side gap', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(132),
      c: createRegions(248),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: CompactReorderHoverIntent = {
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: 'c',
      intent: previousIntent,
    });

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 240, y: 60 },
      previousRecognitionPoint: { x: 232, y: 60 },
      activeVisualRect: {
        left: 204,
        top: 0,
        right: 276,
        bottom: 72,
        width: 72,
        height: 72,
      },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('does not target another folder item while the icon center is only in the inter-cell gap', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
      createLink('d', 'Delta'),
      createLink('e', 'Epsilon'),
      createLink('f', 'Zeta'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(132, 0),
      c: createRegions(264, 0),
      d: createRegions(0, 144),
      e: createRegions(132, 144),
      f: createRegions(264, 144),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'd',
      recognitionPoint: { x: 112, y: 180 },
      previousRecognitionPoint: { x: 88, y: 180 },
      activeVisualRect: {
        left: 76,
        top: 144,
        right: 148,
        bottom: 216,
        width: 72,
        height: 72,
      },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toBeNull();
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('keeps the previous yielded slot latched while entering the next right-side cell through its neutral zone', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(132),
      c: createRegions(248),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: CompactReorderHoverIntent = {
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: 'a',
      intent: previousIntent,
    });

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 254, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('reorders while the icon center enters an upper target icon from the former merge-side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('d', 'Delta'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(132, 0),
      d: createRegions(132, 144),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'd',
      recognitionPoint: { x: 182, y: 56 },
      previousRecognitionPoint: { x: 182, y: 84 },
      activeVisualRect: {
        left: 146,
        top: 20,
        right: 218,
        bottom: 92,
        width: 72,
        height: 72,
      },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    });
    expect(result.visualProjectionIntent).toEqual({
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    });
  });
});
