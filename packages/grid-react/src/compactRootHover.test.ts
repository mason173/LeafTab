import {
  buildReorderProjectionOffsets,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/workspace-core';
import { describe, expect, it } from 'vitest';
import {
  resolveCompactReorderOnlyHoverResolution,
  resolveCompactRootHoverResolution,
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

const createFolder = (id: string, title: string, folderDisplayMode: 'small' | 'large' = 'small'): Shortcut => ({
  id,
  title,
  url: '',
  icon: '',
  kind: 'folder',
  folderDisplayMode,
  children: [createLink(`${id}-child`, `${title} Child`)],
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
      right: regionsById[item.sortId].targetCellRegion.left + 100,
      bottom: regionsById[item.sortId].targetCellRegion.top + 124,
      width: 100,
      height: 124,
      toJSON: () => ({}),
    } as DOMRect,
  }));
}

function buildProjectionOffsetsFromIntent(params: {
  items: HoverItem[];
  measuredItems: Array<HoverItem & { rect: DOMRect }>;
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

function resolveIntent(params: {
  items: HoverItem[];
  regionsById: Record<string, CompactTargetRegions>;
  activeSortId: string;
  recognitionPoint: { x: number; y: number };
}) {
  const { items, regionsById, activeSortId, recognitionPoint } = params;
  const measuredItems = buildMeasuredItems(items, regionsById);

  return resolveCompactRootHoverResolution({
    activeSortId,
    recognitionPoint,
    measuredItems,
    items,
    previousInteractionIntent: null,
    previousVisualProjectionIntent: null,
    interactionProjectionOffsets: createProjectionMap(),
    visualProjectionOffsets: createProjectionMap(),
    resolveRegions: (item) => regionsById[item.sortId],
    slotIntent: null,
    columnGap: 20,
    rowGap: 20,
  });
}

describe('resolveCompactRootHoverResolution', () => {
  it('keeps the previously claimed slot latched when merging onto a later target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
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
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('supports extracted reorder-only drags while using the source folder icon region as the baseline', () => {
    const items = createItems([
      createLink('extracted', 'Extracted'),
      createLink('target', 'Target'),
      createFolder('folder-source', 'Folder'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      extracted: createRegions(240),
      target: createRegions(120),
      'folder-source': createRegions(0),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousRecognitionPoint = { x: 210, y: 36 };
    const recognitionPoint = { x: 182, y: 36 };

    const withSourceFolderOverride = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'extracted',
      recognitionPoint,
      previousRecognitionPoint,
      activeSourceRegionOverride: regionsById['folder-source'].targetIconRegion,
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

    expect(withSourceFolderOverride.interactionIntent).toEqual({
      overShortcutId: 'target',
      targetIndex: 1,
      edge: 'after',
    });
    expect(withSourceFolderOverride.visualProjectionIntent).toEqual({
      overShortcutId: 'target',
      targetIndex: 1,
      edge: 'after',
    });
  });

  it('lets extracted reorder-only drags yield a target when entering its icon from any direction', () => {
    const items = createItems([
      createLink('upper', 'Upper'),
      createLink('extracted', 'Extracted'),
      createFolder('folder-source', 'Folder'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      upper: createRegions(132, 0),
      extracted: createRegions(132, 144),
      'folder-source': createRegions(0, 144),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'extracted',
      recognitionPoint: { x: 182, y: 56 },
      previousRecognitionPoint: { x: 182, y: 84 },
      activeSourceRegionOverride: regionsById['folder-source'].targetIconRegion,
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
      overShortcutId: 'upper',
      targetIndex: 0,
      edge: 'before',
    });
    expect(result.visualProjectionIntent).toEqual({
      overShortcutId: 'upper',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('lets an extracted reorder-only drag displace its own source folder when entering that folder icon', () => {
    const items = createItems([
      createFolder('folder-source', 'Folder'),
      createLink('extracted', 'Extracted'),
      createLink('other', 'Other'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      'folder-source': createRegions(132, 144),
      extracted: createRegions(264, 144),
      other: createRegions(396, 144),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'extracted',
      recognitionPoint: { x: 182, y: 172 },
      previousRecognitionPoint: { x: 182, y: 204 },
      activeSourceRegionOverride: regionsById['folder-source'].targetIconRegion,
      sourceTargetShortcutId: 'folder-source',
      activeVisualRect: {
        left: 146,
        top: 152,
        right: 218,
        bottom: 224,
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
      overShortcutId: 'folder-source',
      targetIndex: 0,
      edge: 'before',
    });
    expect(result.visualProjectionIntent).toEqual({
      overShortcutId: 'folder-source',
      targetIndex: 0,
      edge: 'before',
    });
  });


  it('keeps the previous reorder-only claimed slot latched across the empty gap before the next right-side target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(132),
      c: createRegions(264),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent = {
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after' as const,
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: 'a',
      intent: {
        type: 'reorder-root',
        activeShortcutId: 'a',
        overShortcutId: 'b',
        targetIndex: 1,
        edge: 'after',
      },
    });

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 238, y: 60 },
      previousRecognitionPoint: { x: 226, y: 60 },
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

  it('keeps the previous reorder-only claimed slot latched while entering the yielded target through its non-yield side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(132),
      c: createRegions(264),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent = {
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after' as const,
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: 'a',
      intent: {
        type: 'reorder-root',
        activeShortcutId: 'a',
        overShortcutId: 'c',
        targetIndex: 2,
        edge: 'after',
      },
    });

    const result = resolveCompactReorderOnlyHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 280, y: 60 },
      previousRecognitionPoint: { x: 250, y: 60 },
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

  it('keeps the previous reorder target sticky while that target is still displaced', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 212, y: 100 },
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
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('keeps adjacent horizontal reorder sticky across the source-side gap until re-entering the source cell', () => {
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
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
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

    const stickyInGap = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 240, y: 60 },
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
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(stickyInGap.interactionIntent).toEqual(previousIntent);
    expect(stickyInGap.visualProjectionIntent).toEqual(previousIntent);

    const stickyInTargetNeutralZone = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 224, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(stickyInTargetNeutralZone.interactionIntent).toEqual(previousIntent);
    expect(stickyInTargetNeutralZone.visualProjectionIntent).toEqual(previousIntent);

    const releasedAtSourceIcon = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 263, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(releasedAtSourceIcon.interactionIntent).toBeNull();
    expect(releasedAtSourceIcon.visualProjectionIntent).toBeNull();
  });

  it('keeps merge-derived visual reorder active while crossing the gap toward the yielded neighbor', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousInteractionIntent: RootShortcutDropIntent = {
      type: 'merge-root-shortcuts',
      activeShortcutId: 'c',
      targetShortcutId: 'a',
    };
    const previousVisualProjectionIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 110, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent,
      previousVisualProjectionIntent,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap([
        ['b', { x: 120, y: 0 }],
      ]),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousVisualProjectionIntent);
    expect(result.visualProjectionIntent).toEqual(previousVisualProjectionIntent);
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
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
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

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 254, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('keeps the previous claimed slot latched across the empty gap before the next right-side target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(132),
      c: createRegions(264),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
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

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 238, y: 60 },
      previousRecognitionPoint: { x: 226, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('keeps the previous vertical claimed slot latched while merging onto the next upper target', () => {
    const items = createItems([
      createLink('1', 'One'),
      createLink('2', 'Two'),
      createLink('3', 'Three'),
      createLink('4', 'Four'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      '1': createRegions(0, 0),
      '2': createRegions(0, 160),
      '3': createRegions(0, 320),
      '4': createRegions(0, 480),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: '4',
      overShortcutId: '3',
      targetIndex: 2,
      edge: 'before',
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: '4',
      intent: previousIntent,
    });

    const result = resolveCompactRootHoverResolution({
      activeSortId: '4',
      recognitionPoint: { x: 50, y: 184 },
      previousRecognitionPoint: { x: 50, y: 260 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: '4',
      targetShortcutId: '2',
    });
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('keeps the previous vertical claimed slot latched while backing down through the next upper target neutral zone', () => {
    const items = createItems([
      createLink('1', 'One'),
      createLink('2', 'Two'),
      createLink('3', 'Three'),
      createLink('4', 'Four'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      '1': createRegions(0, 0),
      '2': createRegions(0, 160),
      '3': createRegions(0, 320),
      '4': createRegions(0, 480),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousVisualIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: '4',
      overShortcutId: '3',
      targetIndex: 2,
      edge: 'before',
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: '4',
      intent: previousVisualIntent,
    });

    const result = resolveCompactRootHoverResolution({
      activeSortId: '4',
      recognitionPoint: { x: 50, y: 250 },
      previousRecognitionPoint: { x: 50, y: 184 },
      measuredItems,
      items,
      previousInteractionIntent: {
        type: 'merge-root-shortcuts',
        activeShortcutId: '4',
        targetShortcutId: '2',
      },
      previousVisualProjectionIntent: previousVisualIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousVisualIntent);
    expect(result.visualProjectionIntent).toEqual(previousVisualIntent);
  });

  it('keeps the previous vertical claimed slot latched while backing down through the gap below the next upper target', () => {
    const items = createItems([
      createLink('1', 'One'),
      createLink('2', 'Two'),
      createLink('3', 'Three'),
      createLink('4', 'Four'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      '1': createRegions(0, 0),
      '2': createRegions(0, 160),
      '3': createRegions(0, 320),
      '4': createRegions(0, 480),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousVisualIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: '4',
      overShortcutId: '3',
      targetIndex: 2,
      edge: 'before',
    };
    const projectionOffsets = buildProjectionOffsetsFromIntent({
      items,
      measuredItems,
      activeSortId: '4',
      intent: previousVisualIntent,
    });

    const result = resolveCompactRootHoverResolution({
      activeSortId: '4',
      recognitionPoint: { x: 50, y: 300 },
      previousRecognitionPoint: { x: 50, y: 250 },
      measuredItems,
      items,
      previousInteractionIntent: {
        type: 'merge-root-shortcuts',
        activeShortcutId: '4',
        targetShortcutId: '2',
      },
      previousVisualProjectionIntent: previousVisualIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousVisualIntent);
    expect(result.visualProjectionIntent).toEqual(previousVisualIntent);
  });

  it('keeps the large-folder side margin neutral after entering the folder icon from the left', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      'folder-large': {
        targetCellRegion: {
          left: 120,
          top: 0,
          right: 332,
          bottom: 212,
          width: 212,
          height: 212,
        },
        targetIconRegion: {
          left: 132,
          top: 0,
          right: 320,
          bottom: 188,
          width: 188,
          height: 188,
        },
        targetIconHitRegion: {
          left: 132,
          top: 0,
          right: 320,
          bottom: 188,
          width: 188,
          height: 188,
        },
      },
      b: createRegions(344, 0),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'a',
      targetFolderId: 'folder-large',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 326, y: 60 },
      previousRecognitionPoint: { x: 250, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 12,
      rowGap: 20,
    });

    expect(result.interactionIntent).toBeNull();
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('keeps a claimed upper slot visually latched while returning into a large folder from below', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createFolder('folder-large', 'Large Folder', 'large'),
      createLink('b', 'Beta'),
      createLink('d', 'Delta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      'folder-large': {
        targetCellRegion: {
          left: 120,
          top: 0,
          right: 332,
          bottom: 212,
          width: 212,
          height: 212,
        },
        targetIconRegion: {
          left: 132,
          top: 0,
          right: 320,
          bottom: 188,
          width: 188,
          height: 188,
        },
        targetIconHitRegion: {
          left: 132,
          top: 0,
          right: 320,
          bottom: 188,
          width: 188,
          height: 188,
        },
      },
      b: createRegions(344, 0),
      d: createRegions(0, 160),
      c: createRegions(344, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 2,
      edge: 'before',
    };
    const projectionOffsets = createProjectionMap([
      ['b', { x: 0, y: 160 }],
    ]);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 226, y: 96 },
      previousRecognitionPoint: { x: 390, y: 84 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 12,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'c',
      targetFolderId: 'folder-large',
    });
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('keeps the previously claimed upper slot visually latched while entering a small folder above an intervening icon', () => {
    const items = createItems([
      createFolder('folder', 'Folder'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      folder: createRegions(0, 0),
      b: createRegions(0, 160),
      c: createRegions(0, 320),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    };
    const projectionOffsets = createProjectionMap([
      ['b', { x: 0, y: 160 }],
    ]);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: 24 },
      previousRecognitionPoint: { x: 50, y: 106 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: projectionOffsets,
      visualProjectionOffsets: projectionOffsets,
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'c',
      targetFolderId: 'folder',
    });
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('claims the upper-right slot itself after exiting B upward in the full ring layout above a large folder', () => {
    const items = createItems([
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
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      u1: createRegions(0, 0),
      u2: createRegions(120, 0),
      u3: createRegions(240, 0),
      u4: createRegions(360, 0),
      tl: createRegions(0, 160),
      a: createRegions(120, 160),
      b: createRegions(240, 160),
      tr: createRegions(360, 160),
      h: createRegions(0, 320),
      'folder-large': {
        targetCellRegion: {
          left: 120,
          top: 320,
          right: 332,
          bottom: 532,
          width: 212,
          height: 212,
        },
        targetIconRegion: {
          left: 132,
          top: 320,
          right: 320,
          bottom: 508,
          width: 188,
          height: 188,
        },
        targetIconHitRegion: {
          left: 132,
          top: 320,
          right: 320,
          bottom: 508,
          width: 188,
          height: 188,
        },
      },
      c: createRegions(360, 320),
      g: createRegions(0, 480),
      d: createRegions(360, 480),
      bl: createRegions(0, 640),
      f: createRegions(120, 640),
      e: createRegions(240, 640),
      br: createRegions(360, 640),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const mergeOnB = resolveCompactRootHoverResolution({
      activeSortId: 'e',
      recognitionPoint: { x: 290, y: 196 },
      previousRecognitionPoint: { x: 290, y: 676 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 36,
    });

    expect(mergeOnB.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'e',
      targetShortcutId: 'b',
    });

    const gapAboveB = resolveCompactRootHoverResolution({
      activeSortId: 'e',
      recognitionPoint: { x: 290, y: 150 },
      previousRecognitionPoint: { x: 290, y: 196 },
      measuredItems,
      items,
      previousInteractionIntent: mergeOnB.interactionIntent,
      previousVisualProjectionIntent: mergeOnB.visualProjectionIntent,
      interactionProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'e',
        intent: mergeOnB.interactionIntent,
      }),
      visualProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'e',
        intent: mergeOnB.visualProjectionIntent,
      }),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 36,
    });

    expect(gapAboveB.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'e',
      overShortcutId: 'b',
      targetIndex: 6,
      edge: 'before',
    });

    const returnIntoLargeFolder = resolveCompactRootHoverResolution({
      activeSortId: 'e',
      recognitionPoint: { x: 284, y: 288 },
      previousRecognitionPoint: { x: 284, y: 106 },
      measuredItems,
      items,
      previousInteractionIntent: gapAboveB.interactionIntent,
      previousVisualProjectionIntent: gapAboveB.visualProjectionIntent,
      interactionProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'e',
        intent: gapAboveB.interactionIntent,
      }),
      visualProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'e',
        intent: gapAboveB.visualProjectionIntent,
      }),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 12,
      rowGap: 20,
    });

    expect(returnIntoLargeFolder.interactionIntent).not.toEqual({
      type: 'reorder-root',
      activeShortcutId: 'e',
      overShortcutId: 'folder-large',
      targetIndex: 9,
      edge: 'before',
    });
    expect(returnIntoLargeFolder.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'e',
      overShortcutId: 'b',
      targetIndex: 6,
      edge: 'before',
    });
  });

  it('claims B itself in the host-calibrated ring geometry after exiting B upward', () => {
    const items = createItems([
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
    ]);
    const createHostRegions = (cellLeft: number, cellTop: number): CompactTargetRegions => ({
      targetCellRegion: {
        left: cellLeft,
        top: cellTop,
        right: cellLeft + 104,
        bottom: cellTop + 96,
        width: 104,
        height: 96,
      },
      targetIconRegion: {
        left: cellLeft + 16,
        top: cellTop,
        right: cellLeft + 88,
        bottom: cellTop + 72,
        width: 72,
        height: 72,
      },
      targetIconHitRegion: {
        left: cellLeft + 16,
        top: cellTop,
        right: cellLeft + 88,
        bottom: cellTop + 72,
        width: 72,
        height: 72,
      },
    });
    const regionsById: Record<string, CompactTargetRegions> = {
      u1: createHostRegions(0, 0),
      u2: createHostRegions(116, 0),
      u3: createHostRegions(232, 0),
      u4: createHostRegions(348, 0),
      tl: createHostRegions(0, 116),
      a: createHostRegions(116, 116),
      b: createHostRegions(232, 116),
      tr: createHostRegions(348, 116),
      h: createHostRegions(0, 232),
      'folder-large': {
        targetCellRegion: {
          left: 116,
          top: 232,
          right: 336,
          bottom: 444,
          width: 220,
          height: 212,
        },
        targetIconRegion: {
          left: 132,
          top: 232,
          right: 320,
          bottom: 420,
          width: 188,
          height: 188,
        },
        targetIconHitRegion: {
          left: 132,
          top: 232,
          right: 320,
          bottom: 420,
          width: 188,
          height: 188,
        },
      },
      c: createHostRegions(348, 232),
      g: createHostRegions(0, 348),
      d: createHostRegions(348, 348),
      bl: createHostRegions(0, 464),
      f: createHostRegions(116, 464),
      e: createHostRegions(232, 464),
      br: createHostRegions(348, 464),
    };
    const measuredItems = items.map((item) => ({
      ...item,
      rect: {
        x: regionsById[item.sortId].targetIconRegion.left,
        y: regionsById[item.sortId].targetIconRegion.top,
        left: regionsById[item.sortId].targetIconRegion.left,
        top: regionsById[item.sortId].targetIconRegion.top,
        right: regionsById[item.sortId].targetIconRegion.left + (
          item.sortId === 'folder-large' ? 188 : 72
        ),
        bottom: regionsById[item.sortId].targetIconRegion.top + (
          item.sortId === 'folder-large' ? 180 : 96
        ),
        width: item.sortId === 'folder-large' ? 188 : 72,
        height: item.sortId === 'folder-large' ? 180 : 96,
        toJSON: () => ({}),
      } as DOMRect,
    }));

    const mergeOnB = resolveCompactRootHoverResolution({
      activeSortId: 'e',
      recognitionPoint: { x: 284, y: 164 },
      previousRecognitionPoint: { x: 284, y: 500 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 12,
      rowGap: 20,
    });

    expect(mergeOnB.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'e',
      targetShortcutId: 'b',
    });

    const gapAboveB = resolveCompactRootHoverResolution({
      activeSortId: 'e',
      recognitionPoint: { x: 284, y: 106 },
      previousRecognitionPoint: { x: 284, y: 164 },
      measuredItems,
      items,
      previousInteractionIntent: mergeOnB.interactionIntent,
      previousVisualProjectionIntent: mergeOnB.visualProjectionIntent,
      interactionProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'e',
        intent: mergeOnB.interactionIntent,
      }),
      visualProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'e',
        intent: mergeOnB.visualProjectionIntent,
      }),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 12,
      rowGap: 20,
    });

    expect(gapAboveB.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'e',
      overShortcutId: 'b',
      targetIndex: 6,
      edge: 'before',
    });
  });

  it('prefers merge from the lower-right side for targets above the active origin', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 70, y: 60 },
    }).interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'c',
      targetShortcutId: 'a',
    });

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 8, y: 36 },
    }).interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('keeps an above target neutral before icon contact, merges inside the icon, and reorders on the left side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: 96 },
    }).interactionIntent).toBeNull();

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 84, y: 24 },
    }).interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'c',
      targetShortcutId: 'a',
    });

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 8, y: 36 },
    }).interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('switches an above target from merge to reorder when exiting upward through the reorder side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'merge-root-shortcuts',
      activeShortcutId: 'c',
      targetShortcutId: 'a',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: -8 },
      previousRecognitionPoint: { x: 50, y: 24 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    });
    expect(result.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('switches an above small-folder target from move-into-folder to reorder when exiting upward through the reorder side', () => {
    const items = createItems([
      createFolder('folder', 'Folder'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      folder: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: 'c',
      targetFolderId: 'folder',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: -8 },
      previousRecognitionPoint: { x: 50, y: 24 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'folder',
      targetIndex: 0,
      edge: 'before',
    });
    expect(result.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'folder',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('does not re-merge an above target when re-entering through its top edge during downward return', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: 8 },
      previousRecognitionPoint: { x: 50, y: -8 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('keeps an above target in reorder mode while continuing through its icon after top-edge return entry', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: 36 },
      previousRecognitionPoint: { x: 50, y: 8 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('does not merge an above-right target when re-entering it from the top edge during return', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 156, y: 8 },
      previousRecognitionPoint: { x: 156, y: -8 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('keeps an above-right target in reorder mode while continuing through its icon after top-edge return entry', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 156, y: 36 },
      previousRecognitionPoint: { x: 156, y: 8 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });

  it('does not merge an above-right target when the previous point lands exactly on its top edge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 156, y: 20 },
      previousRecognitionPoint: { x: 156, y: 0 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('does not let slot reorder override the neutral lower approach for an above target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 50, y: 96 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: {
        type: 'reorder-root',
        activeShortcutId: 'c',
        overShortcutId: 'a',
        targetIndex: 0,
        edge: 'before',
      },
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toBeNull();
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('prefers merge from the upper-left side for targets below the active origin', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 20, y: 170 },
    }).interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 92, y: 196 },
    }).interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    });
  });

  it('keeps a below target neutral before icon contact, merges inside the icon, and reorders on the right side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 50, y: 270 },
    }).interactionIntent).toBeNull();

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 16, y: 190 },
    }).interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 92, y: 196 },
    }).interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    });
  });

  it('does not let slot reorder override the neutral upper approach for a below target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 50, y: 270 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: {
        type: 'reorder-root',
        activeShortcutId: 'a',
        overShortcutId: 'c',
        targetIndex: 2,
        edge: 'after',
      },
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toBeNull();
    expect(result.visualProjectionIntent).toBeNull();
  });

  it('prefers merge from the lower-right side for targets left of the active origin on the same row', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(240, 0),
    };

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 70, y: 60 },
    }).interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'c',
      targetShortcutId: 'a',
    });

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'c',
      recognitionPoint: { x: 8, y: 36 },
    }).interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    });
  });

  it('prefers merge from the upper-left side for targets right of the active origin on the same row', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(240, 0),
    };

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 260, y: 10 },
    }).interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });

    expect(resolveIntent({
      items,
      regionsById,
      activeSortId: 'a',
      recognitionPoint: { x: 332, y: 36 },
    }).interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    });
  });

  it('lets an above target switch from sticky reorder to merge when entering from the right side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'c',
      overShortcutId: 'a',
      targetIndex: 0,
      edge: 'before',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'c',
      recognitionPoint: { x: 70, y: 60 },
      previousRecognitionPoint: { x: 90, y: 60 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['a', { x: 0, y: 120 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['a', { x: 0, y: 120 }],
      ]),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'c',
      targetShortcutId: 'a',
    });
  });

  it('lets a below target switch from sticky reorder to merge when entering from the left side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(0, 160),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 20, y: 170 },
      previousRecognitionPoint: { x: 10, y: 170 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['c', { x: 0, y: -120 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['c', { x: 0, y: -120 }],
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
  });

  it('keeps reorder active when re-entering a right-side target icon from the reorder side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(240, 0),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 320, y: 36 },
      previousRecognitionPoint: { x: 332, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['c', { x: -120, y: 0 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['c', { x: -120, y: 0 }],
      ]),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
  });

  it('switches reorder back to merge only when re-entering a right-side target icon from the merge side', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(240, 0),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 260, y: 36 },
      previousRecognitionPoint: { x: 250, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['c', { x: -120, y: 0 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['c', { x: -120, y: 0 }],
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
  });

  it('does not merge a right-side target when returning diagonally from the outside-right edge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(240, 0),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 320, y: 20 },
      previousRecognitionPoint: { x: 332, y: 10 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    });
  });

  it('does not merge a right-side target when the previous point lands exactly on its right edge', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0, 0),
      b: createRegions(120, 0),
      c: createRegions(240, 0),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 320, y: 20 },
      previousRecognitionPoint: { x: 326, y: 20 },
      measuredItems,
      items,
      previousInteractionIntent: null,
      previousVisualProjectionIntent: null,
      interactionProjectionOffsets: createProjectionMap(),
      visualProjectionOffsets: createProjectionMap(),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 2,
      edge: 'after',
    });
  });
});
